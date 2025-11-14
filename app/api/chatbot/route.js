// app/api/chatbot/route.js
// CRITICAL: This MUST be server-side to work on Vercel
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request) {
  try {
    const { message, conversationHistory = [] } = await request.json();
    
    if (!message || message.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Tin nhắn không hợp lệ'
      }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      console.error('❌ ANTHROPIC_API_KEY not set in environment');
      return NextResponse.json({
        success: false,
        error: 'Chatbot chưa được cấu hình. Vui lòng liên hệ admin.'
      }, { status: 500 });
    }

    console.log('✓ Calling Anthropic API...');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: 'Bạn là trợ lý tuyển dụng của WorkHub. Tư vấn tìm việc, CV, phỏng vấn. Trả lời ngắn gọn 2-4 câu.',
        messages: [
          ...conversationHistory.slice(-10),
          { role: 'user', content: message }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Anthropic API error:', response.status, errorText);
      
      return NextResponse.json({
        success: false,
        error: response.status === 429 
          ? 'Hệ thống đang quá tải. Vui lòng thử lại sau.' 
          : 'Chatbot tạm thời không khả dụng.'
      }, { status: 500 });
    }

    const data = await response.json();
    const reply = data.content[0].text;

    console.log('✓ Chatbot response successful');

    return NextResponse.json({
      success: true,
      reply: reply,
      conversationHistory: [
        ...conversationHistory.slice(-10),
        { role: 'user', content: message },
        { role: 'assistant', content: reply }
      ]
    });

  } catch (error) {
    console.error('❌ Chatbot error:', error);
    return NextResponse.json({
      success: false,
      error: 'Đã xảy ra lỗi. Vui lòng thử lại.'
    }, { status: 500 });
  }
}

// Test endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Chatbot API is running',
    hasApiKey: !!process.env.ANTHROPIC_API_KEY,
    timestamp: new Date().toISOString()
  });
}
