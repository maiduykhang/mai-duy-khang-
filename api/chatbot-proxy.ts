import { GoogleGenAI, Type } from "@google/genai";

// Initialize AI Client outside the handler to be reused across invocations.
// This helps optimize "cold starts" for the serverless function.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// This function will be deployed as a Vercel Serverless Function.
// It acts as a secure proxy between the frontend and the Google AI API.
export default async function handler(req: any, res: any) {
    // Reinforce connection stability with Keep-Alive header
    res.setHeader('Connection', 'keep-alive');
    
    // Only allow POST requests
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { type, message } = req.body;

        // --- Step 1: Debug Logging ---
        console.log(`[Chatbot Proxy] Received request: type='${type}'`);
        const apiKeyExists = !!process.env.API_KEY;
        console.log(`[Chatbot Proxy] Checking for API Key... ${apiKeyExists ? 'Found' : 'MISSING!'}`);

        if (!apiKeyExists) {
            throw new Error("Google AI API key is not configured on the server.");
        }
        if (!type || !message) {
             return res.status(400).json({ error: 'Invalid request body, "type" and "message" are required.' });
        }

        // --- Step 2: AI Client is already initialized outside the handler ---
        let geminiResponseText: string;

        // --- Step 3: Handle different request types (Intent Analysis vs. General Chat) ---
        if (type === 'intent') {
            const intentPrompt = `System: You are an intent classification AI for a job board chatbot. Analyze the user's message and determine if they are searching for a job or just having a general conversation. If they are searching for a job, identify the keywords (job title, location, skills). Respond ONLY with a JSON object in the format: For job search: { "intent": "JOB_SEARCH", "keywords": "extracted keywords" } For anything else: { "intent": "GENERAL_CONVERSATION" }\n\nUser message: "${message}"`;
            
            const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: intentPrompt,
                config: { 
                    responseMimeType: "application/json", 
                    responseSchema: { 
                        type: Type.OBJECT, 
                        properties: { 
                            intent: { type: Type.STRING }, 
                            keywords: { type: Type.STRING }
                        }
                    }
                }
            });
            geminiResponseText = result.text;

        } else if (type === 'chat') {
            const chatPrompt = `User question: "${message}"\nAnswer in Vietnamese. Be friendly and helpful.`;
            const result = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: chatPrompt,
            });
            geminiResponseText = result.text;

        } else {
            return res.status(400).json({ error: 'Invalid request type specified.' });
        }

        // --- Step 4: Debug Log and Send Response ---
        console.log('[Chatbot Proxy] Successfully connected to AI service and received a response.');
        res.status(200).json({ data: geminiResponseText });

    } catch (error: any) {
        console.error('[Chatbot Proxy] Error processing request:', error);
        res.status(500).json({ error: 'An internal server error occurred while contacting the AI service.', details: error.message });
    }
}