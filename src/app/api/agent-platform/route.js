import { NextResponse } from 'next/server';
import { emilyConfig } from '@/emily/config';

const API_KEY = process.env.AGENT_PLATFORM_API_KEY;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${emilyConfig.model}:generateContent`;

/**
 * POST handler — Proxy chat requests to Gemini API.
 * @param {Request} request
 */
export async function POST(request) {
	try {
		const { message, history = [] } = await request.json();

		if (!message || typeof message !== 'string') {
			return NextResponse.json({ error: 'Message is required' }, { status: 400 });
		}

		if (!API_KEY) {
			return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
		}

		const contents = history.map((h) => ({
			role: h.role === 'emily' ? 'model' : 'user',
			parts: [{ text: h.text }],
		}));

		contents.push({ role: 'user', parts: [{ text: message }] });

		const res = await fetch(`${API_URL}?key=${API_KEY}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				contents,
				systemInstruction: { parts: [{ text: emilyConfig.systemInstruction }] },
				tools: emilyConfig.tools,
			}),
		});

		if (!res.ok) {
			const errText = await res.text();
			console.error('Gemini API error:', errText);
			return NextResponse.json({ error: 'Gemini API error' }, { status: 502 });
		}

		const data = await res.json();
		const candidate = data.candidates?.[0];
		const text = candidate?.content?.parts?.[0]?.text || '';

		const chunks = candidate?.groundingMetadata?.groundingChunks || [];
		const urls = [];
		chunks.forEach((chunk) => {
			if (chunk.web?.uri && !urls.includes(chunk.web.uri)) {
				urls.push(chunk.web.uri);
			}
		});

		return NextResponse.json({ text, urls });
	} catch (error) {
		console.error('Error in agent-platform route:', error);
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
	}
}
