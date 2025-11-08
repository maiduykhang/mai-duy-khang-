export default async function handler(req: any, res: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { address } = req.body;
        if (!address || typeof address !== 'string' || address.trim().length < 5) {
            return res.status(200).json({ success: false, error: 'Địa chỉ không hợp lệ hoặc quá ngắn.' });
        }
        
        if (!process.env.API_KEY) {
            console.error('[Geocode API] CRITICAL: Google AI API key is not configured on the server.');
            return res.status(503).json({ success: false, error: 'Service Unavailable: Geocoding service is not configured.' });
        }

        // Normalize the address for better results in Vietnam
        const normalizedAddress = address.includes('Việt Nam') 
            ? address 
            : `${address}, Việt Nam`;

        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(normalizedAddress)}&key=${process.env.API_KEY}&region=vn&language=vi`;

        const geoResponse = await fetch(url);
        const data = await geoResponse.json();

        if (data.status === 'OK' && data.results.length > 0) {
            const result = data.results[0];
            const locationType = result.geometry.location_type;

            // Reject addresses that are not precise enough
            if (locationType === 'APPROXIMATE') {
                 return res.status(200).json({ 
                    success: false, 
                    error: 'Địa chỉ chưa đủ chính xác. Vui lòng nhập số nhà, tên đường cụ thể.' 
                });
            }
            
            return res.status(200).json({
                success: true,
                data: {
                    lat: result.geometry.location.lat,
                    lng: result.geometry.location.lng,
                    formatted_address: result.formatted_address,
                }
            });
        } else {
            console.warn('Geocoding API failed:', data.status, data.error_message);
            return res.status(200).json({ success: false, error: 'Không tìm thấy địa chỉ. Vui lòng kiểm tra lại.' });
        }

    } catch (error: any) {
        console.error('[Geocode API] Internal Server Error:', error);
        res.status(500).json({ success: false, error: 'An unexpected server error occurred.' });
    }
}
