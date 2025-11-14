// app/api/geocode/route.js
// Handles all address formats: full address, Plus Code, coordinates, Google Maps URL
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request) {
  try {
    const { address, strictValidation = true } = await request.json();
    
    if (!address || address.trim().length < 10) {
      return NextResponse.json({
        success: false,
        error: 'Địa chỉ phải có ít nhất 10 ký tự'
      }, { status: 400 });
    }

    const result = await geocodeFlexible(address, strictValidation);
    
    if (!result) {
      return NextResponse.json({
        success: false,
        error: 'Không tìm thấy địa chỉ. Vui lòng nhập chính xác hơn.'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result,
      warning: result.warning || null
    });

  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json({
      success: false,
      error: 'Không thể xác minh địa chỉ'
    }, { status: 500 });
  }
}

async function geocodeFlexible(input, strict) {
  const trimmed = input.trim();
  
  // 1. Extract from Google Maps URL
  const urlPatterns = [
    /@(-?\d+\.\d*),(-?\d+\.\d*)/,
    /!3d(-?\d+\.\d*)!4d(-?\d+\.\d*)/,
  ];
  for (const pattern of urlPatterns) {
    const match = trimmed.match(pattern);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (isValidVietnamCoords(lat, lng)) {
        const address = await reverseGeocode(lat, lng);
        return { lat, lng, formatted_address: address || trimmed, source: 'google_maps_url', accuracy: 'ROOFTOP', verified: true };
      }
    }
  }

  // 2. Direct coordinates
  const coordPattern = /^(-?\d+\.\d*)[,\s]+(-?\d+\.\d*)$/;
  const coordMatch = trimmed.match(coordPattern);
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1]);
    const lng = parseFloat(coordMatch[2]);
    if (isValidVietnamCoords(lat, lng)) {
      const address = await reverseGeocode(lat, lng);
      return { lat, lng, formatted_address: address || `${lat}, ${lng}`, source: 'coordinates', accuracy: 'ROOFTOP', verified: true };
    }
  }

  // 3. Full address geocoding
  let normalized = trimmed;
  if (!normalized.toLowerCase().includes('việt nam') && !normalized.toLowerCase().includes('vietnam')) {
    normalized += ', Việt Nam';
  }
  
  const result = await geocodeWithGoogle(normalized);
  if (!result) return null;
  
  // Strict validation for interview addresses
  if (strict) {
    if (result.accuracy === 'APPROXIMATE') {
      return { ...result, verified: false, warning: 'Địa chỉ chưa đủ chi tiết. Vui lòng thêm số nhà, tên đường cụ thể.' };
    }
    if (!/\d/.test(result.formatted_address.split(',')[0])) {
       return { ...result, verified: false, warning: 'Vui lòng thêm số nhà để địa chỉ chính xác hơn.' };
    }
  }
  
  return { ...result, verified: true };
}

async function geocodeWithGoogle(address) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error('GOOGLE_MAPS_API_KEY not configured');
    return null;
  }
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&region=vn&language=vi`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0];
      const location = result.geometry.location;
      if (isValidVietnamCoords(location.lat, location.lng)) {
        return {
          lat: location.lat,
          lng: location.lng,
          formatted_address: result.formatted_address,
          place_id: result.place_id,
          accuracy: result.geometry.location_type
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Google API error:', error);
    return null;
  }
}

async function reverseGeocode(lat, lng) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=vi`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.status === 'OK' && data.results.length > 0) {
      return data.results[0].formatted_address;
    }
    return null;
  } catch (error) {
    return null;
  }
}

function isValidVietnamCoords(lat, lng) {
  return lat >= 8 && lat <= 24 && lng >= 102 && lng <= 110;
}
