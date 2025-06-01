// app/api/openrouter/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
    const { prompt, model } = await request.json(); // Get prompt and optional model from the frontend

    if (!prompt) {
        return NextResponse.json({ reply: "⚠️ No message received." }, { status: 400 });
    }

    // IMPORTANT: Use environment variables for your API key for security!
    // Create a .env.local file in the root of your project:
    // OPENROUTER_API_KEY=sk-or-v1-YOUR_ACTUAL_OPENROUTER_KEY_HERE
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        console.error("OPENROUTER_API_KEY is not set in environment variables.");
        return NextResponse.json({ reply: "⚠️ Server configuration error: API key missing." }, { status: 500 });
    }

    const openRouterUrl = "https://openrouter.ai/api/v1/chat/completions";

    // Use the model passed from the frontend, or default to the one from your PHP
    const targetModel = model || "shisa-ai/shisa-v2-llama3.3-70b:free";

    try {
        const openRouterRes = await fetch(openRouterUrl, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                // IMPORTANT: Replace with your actual deployed domain or use VERCEL_URL for deployment
                'HTTP-Referer': process.env.VERCEL_URL || 'http://localhost:3000',
                'X-Title': 'Electronic Campus Chatbot' // Your application's name for OpenRouter stats
            },
            body: JSON.stringify({
                model: targetModel,
                messages: [{
                    role: "user",
                    content: prompt // The full prompt including your system instructions
                }],
                temperature: 1.0, // As per your PHP proxy
                top_p: 0.95,      // As per your PHP proxy
                max_tokens: 400,  // As per your PHP proxy
                // Include any other OpenRouter specific options if needed
            }),
        });

        if (!openRouterRes.ok) { // Check for non-200 HTTP responses
            const errorData = await openRouterRes.json();
            console.error("OpenRouter API error:", openRouterRes.status, errorData);
            return NextResponse.json({ reply: `⚠️ OpenRouter API error: ${errorData.error?.message || openRouterRes.statusText}` }, { status: openRouterRes.status });
        }

        const result = await openRouterRes.json();
        const reply = result.choices?.[0]?.message?.content || "⚠️ OpenRouter did not send a reply.";

        return NextResponse.json({ reply });
    } catch (error) {
        console.error("Error communicating with OpenRouter:", error);
        return NextResponse.json({ reply: "⚠️ Error contacting OpenRouter API. Please try again." }, { status: 500 });
    }
}