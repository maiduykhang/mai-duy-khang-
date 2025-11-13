// Use Vercel Edge runtime as requested
export const config = {
  runtime: 'edge',
};

// Vercel Edge function signature for a request
export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Allow': 'POST', 'Content-Type': 'application/json' },
    });
  }

  try {
    const { message, conversationHistory = [] } = await req.json();
    
    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ success: false, error: 'Invalid message' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not set');
      return new Response(JSON.stringify({ success: false, error: 'API not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    // Client sends `{role, content}`, so we just add the new message for the API call.
    const messagesForApi = [
      ...conversationHistory.slice(-10),
      { role: 'user', content: message }
    ];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229', // Using a valid and reliable Anthropic model.
        max_tokens: 1024,
        system: 'Bạn là trợ lý tuyển dụng của WorkHub. Tư vấn tìm việc, CV, phỏng vấn.',
        messages: messagesForApi,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic error:', response.status, errorText);
      return new Response(JSON.stringify({ success: false, error: 'AI service unavailable' }), { status: response.status, headers: { 'Content-Type': 'application/json' } });
    }

    const data = await response.json();
    const replyText = data.content[0].text;
    
    // Construct the full conversation history to return to the client.
    const updatedHistory = [
        ...conversationHistory.slice(-10),
        { role: 'user', content: message },
        { role: 'assistant', content: replyText }
    ];

    return new Response(JSON.stringify({
      success: true,
      reply: replyText,
      conversationHistory: updatedHistory,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error: any) {
    console.error('Chatbot proxy error:', error);
    return new Response(JSON.stringify({ success: false, error: 'Server error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
