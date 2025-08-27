import { NextResponse } from 'next/server';
import { SYSTEM_PROMPT } from '../../../lib/systemPrompt';

// Simple wrapper around Google Generative Language API (Gemini)
export async function POST(request) {
  const body = await request.json();

  const {
    prompt,
    history = [], // [{ role: 'user'|'assistant', content: string }]
    model = 'gemini-1.5-flash',
    temperature = 0.7,
    top_p = 1,
    max_tokens = 4096,
    system = SYSTEM_PROMPT
  } = body || {};

  if (!prompt) {
    return NextResponse.json(
      { reply: '⚠️ No message received.' },
      { status: 400 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not set.');
    return NextResponse.json(
      { reply: '⚠️ Server configuration error: API key missing.' },
      { status: 500 }
    );
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;

    // Map history to Gemini's expected structure
    const mappedHistory = Array.isArray(history)
      ? history.map((m) => ({
          role: m?.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: String(m?.content ?? '') }]
        }))
      : [];

    // Clamp sizes for stability (raised limits)
    const clampStr = (s, max = 10000) => String(s).slice(0, max);
    const safePrompt = clampStr(prompt, 30000);
    const safeMappedHistory = mappedHistory.slice(-50).map((m) => ({
      role: m.role,
      parts: [{ text: clampStr(m.parts?.[0]?.text ?? '') }]
    }));

    const payload = {
      contents: [
        ...safeMappedHistory,
        {
          role: 'user',
          parts: [{ text: safePrompt }]
        }
      ],
      systemInstruction: {
        role: 'system',
        parts: [{ text: system }]
      },
      generationConfig: {
        temperature: Math.min(Math.max(temperature, 0), 2),
        topP: Math.min(Math.max(top_p, 0), 1),
        maxOutputTokens: Math.min(Math.max(max_tokens, 1), 8192)
      }
    };

    // Add a timeout to the upstream call
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeout);

    const result = await res.json();

    if (!res.ok) {
      console.error('Gemini error:', res.status, result);
      const message = result?.error?.message || res.statusText || 'Unknown error';
      return NextResponse.json(
        { reply: `⚠️ Gemini error: ${message}` },
        { status: res.status }
      );
    }

    // Extract text from candidates -> content -> parts
    const candidates = result?.candidates || [];
    const parts = candidates[0]?.content?.parts || [];
    const text = parts
      .map((p) => p?.text)
      .filter(Boolean)
      .join('\n');

    const reply = text || '⚠️ No response from Gemini.';
    return NextResponse.json({ reply });
  } catch (err) {
    console.error('Fetch error:', err);
    return NextResponse.json(
      { reply: '⚠️ Error reaching Gemini API.' },
      { status: 500 }
    );
  }
}
