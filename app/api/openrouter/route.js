import { NextResponse } from 'next/server';

export async function POST(request) {
    const body = await request.json();

    const {
        prompt,
        model = "openai/gpt-4o",
        temperature = 0.7,
        top_p = 1,
        max_tokens = 3000,
        system = "You are a helpful assistant."
    } = body;

    if (!prompt) {
        return NextResponse.json(
            { reply: "⚠️ No message received." },
            { status: 400 }
        );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        console.error("OPENROUTER_API_KEY is not set.");
        return NextResponse.json(
            { reply: "⚠️ Server configuration error: API key missing." },
            { status: 500 }
        );
    }

    try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': process.env.VERCEL_URL || 'http://localhost:3000',
                'X-Title': 'Electronic Campus'
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: "system", content: system },
                    { role: "user", content: prompt }
                ],
                temperature: Math.min(Math.max(temperature, 0), 2),
                top_p: Math.min(Math.max(top_p, 0), 1),
                max_tokens: Math.min(max_tokens, 8192)
            })
        });

        if (!res.ok) {
            const errorData = await res.json();
            console.error("OpenRouter error:", res.status, errorData);
            return NextResponse.json(
                { reply: `⚠️ OpenRouter error: ${errorData.error?.message || res.statusText}` },
                { status: res.status }
            );
        }

        const result = await res.json();
        const reply = result.choices?.[0]?.message?.content || "⚠️ No response from OpenRouter.";

        return NextResponse.json({ reply });
    } catch (err) {
        console.error("Fetch error:", err);
        return NextResponse.json(
            { reply: "⚠️ Error reaching OpenRouter API." },
            { status: 500 }
        );
    }
}
