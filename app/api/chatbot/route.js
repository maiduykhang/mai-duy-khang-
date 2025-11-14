// app/api/chatbot/route.js
// CRITICAL: This MUST be server-side to work on Vercel
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request) {
  try {
    const { message, conversationHistory = [] } = await request.json();
    
    // Validate
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Tin nhắn không hợp lệ'
      }, { status: 400 });
    }

    // Get API key from environment
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not configured');
      return NextResponse.json({
        success: false,
        error: 'Chatbot chưa được cấu hình'
      }, { status: 500 });
    }

    // Call Anthropic API directly (no SDK to avoid import issues)
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        system: `Bạn là trợ lý tuyển dụng thông minh của WorkHub - Trung tâm việc làm Việt Nam.

Nhiệm vụ:
- Tư vấn tìm việc làm phù hợp
- Hướng dẫn viết CV chuyên nghiệp
- Chuẩn bị phỏng vấn
- Giải đáp về thị trường lao động

Phong cách: Thân thiện, nhiệt tình, ngắn gọn (2-4 câu).`,
        messages: [
          ...conversationHistory.slice(-10), // Last 10 messages
          { role: 'user', content: message }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', response.status, errorText);
      
      const status = response.status;
      let error = 'Chatbot tạm thời không khả dụng';
      if (status === 401) error = 'API key không hợp lệ';
      if (status === 429) error = 'Hệ thống đang quá tải. Vui lòng thử lại sau.';

      return NextResponse.json({
        success: false,
        error
      }, { status });
    }

    const data = await response.json();
    const reply = data.content[0].text;

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
    console.error('Chatbot error:', error);
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
  });
}
