import { GoogleGenAI, Type, Content } from "@google/genai";

// Initialize AI Client outside the handler to be reused across invocations.
let ai: GoogleGenAI | null = null;
if (process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
}

// This function acts as a secure, state-aware proxy to the Google AI API.
export default async function handler(req: any, res: any) {
    res.setHeader('Connection', 'keep-alive');
    
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!ai) {
        console.error('[Chatbot Proxy] CRITICAL: Google AI API key is not configured on the server.');
        return res.status(503).json({ error: 'Service Unavailable: The AI service is not configured.' });
    }

    try {
        const { message, history } = req.body;
        
        if (!message || !Array.isArray(history)) {
             return res.status(400).json({ error: 'Invalid request body, "message" and "history" (array) are required.' });
        }

        // Convert frontend chat history to Gemini's format
        const contents: Content[] = history.map((msg: { sender: 'user' | 'bot', text: string }) => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }],
        }));
        // Add the new user message
        contents.push({ role: 'user', parts: [{ text: message }] });

        const systemInstruction = `You are an AI assistant for a job board called WorkHub. Your goal is to help users find jobs and answer questions. Analyze the user's latest message in the context of the conversation. 
        - If the user is asking to find jobs, identify relevant keywords (like job title, location, skills) and set intent to "JOB_SEARCH".
        - For any other conversation (greetings, questions about the company, etc.), set intent to "GENERAL_CONVERSATION" and clear the keywords.
        - Your reply must always be helpful, friendly, and in Vietnamese.
        - You MUST respond with a JSON object.`;
        
        const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: { 
                systemInstruction: systemInstruction,
                responseMimeType: "application/json", 
                responseSchema: { 
                    type: Type.OBJECT, 
                    properties: { 
                        intent: { 
                            type: Type.STRING,
                            description: "Either 'JOB_SEARCH' or 'GENERAL_CONVERSATION'"
                        }, 
                        keywords: { 
                            type: Type.STRING,
                            description: "Keywords for job search, or an empty string."
                        },
                        reply: {
                            type: Type.STRING,
                            description: "Your friendly, Vietnamese reply to the user."
                        }
                    },
                    required: ["intent", "keywords", "reply"]
                }
            }
        });

        const geminiResponseText = result.text;
        
        console.log('[Chatbot Proxy] Successfully received AI response.');
        res.status(200).json({ data: geminiResponseText });

    } catch (error: any) {
        console.error('[Chatbot Proxy] Error processing request:', error);
        res.status(500).json({ error: 'An internal server error occurred while contacting the AI service.', details: error.message });
    }
}
