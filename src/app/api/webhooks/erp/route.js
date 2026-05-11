/**
 * ERP Webhook Forwarder — Legacy API Route (redirect to new endpoint).
 * 
 * Moved to /webhooks/erp with enhanced inbound + outbound support.
 * This endpoint is kept for backward compatibility — redirects to new route.
 */
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const NEW_BASE = '/webhooks/erp';

/**
 * Legacy POST handler — redirect to new /webhooks/erp endpoint.
 * Extracts event type from URL path segment and passes as action=forward&event=...
 */
export async function POST(request) {
	const { pathname, searchParams } = new URL(request.url);
	const segments = pathname.replace(/\/$/, '').split('/');
	const eventType = segments[segments.length - 1];

	const validEvents = ['new-customer', 'cancel-booking', 'update-booking', 'new-booking', 'update-account'];
	if (!validEvents.includes(eventType)) {
		return NextResponse.json({ error: `Invalid event type: ${eventType}`, validEvents }, { status: 400 });
	}

	try {
		const payload = await request.json();
		if (!payload || !payload.id) {
			return NextResponse.json({ error: "Payload must include 'id' (document key)" }, { status: 400 });
		}

		const forwardUrl = new URL(NEW_BASE, request.url);
		forwardUrl.searchParams.set('action', 'forward');
		forwardUrl.searchParams.set('event', eventType);

		if (!searchParams.get('secret')) {
			forwardUrl.searchParams.set('secret', process.env.ERP_WEBHOOK_SECRET || '');
		}

		const response = await fetch(forwardUrl.toString(), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'x-erp-secret': process.env.ERP_WEBHOOK_SECRET || '' },
			body: JSON.stringify(payload),
		});

		const data = await response.json();
		return NextResponse.json(data, { status: response.status });
	} catch (err) {
		logger.error('[Legacy ERP Webhook] Error:', err);
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
	}
}
