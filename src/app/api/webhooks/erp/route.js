/**
 * ERP Webhook Forwarder — API Route
 * Nhận sự kiện từ Next.js app và forward dữ liệu Firestore sang ERP System.
 * 
 * Endpoints (theo path segment sau /api/webhooks/erp):
 * - POST .../new-customer — khi khách đăng ký tài khoản mới
 * - POST .../cancel-booking — khi khách hủy booking
 * - POST .../update-booking — khi booking được cập nhật
 * - POST .../new-booking — khi có booking mới
 * - POST .../update-account — khi khách cập nhật thông tin tài khoản
 */

import { NextResponse } from "next/server";

/** ERP base URL — tất cả webhook đều gửi về domain này */
const ERP_WEBHOOK_BASE = "https://9tripphuquoc.com/api/webhook";

/** Số lần retry tối đa khi ERP không phản hồi */
const MAX_RETRIES = 3;

/**
 * Forward dữ liệu sang ERP với retry logic.
 * Fire-and-forget: không chặn response trả về cho client.
 * @param {string} endpoint - ERP endpoint (e.g. "new-customer")
 * @param {Object} payload - Firestore document data (đã serialize, dùng id làm key)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function forwardToERP(endpoint, payload) {
	const url = `${ERP_WEBHOOK_BASE}/${endpoint}`;
	let lastError = null;

	for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
		try {
			const response = await fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
				signal: AbortSignal.timeout(10000), // 10s timeout
			});

			if (response.ok) {
				console.log(`[ERP Forward] ${endpoint} — OK (attempt ${attempt})`);
				return { success: true };
			}

			lastError = `ERP responded with ${response.status}: ${await response.text().catch(() => '')}`;
		} catch (err) {
			lastError = err.message;
		}

		// Exponential backoff: 500ms, 1500ms, 3500ms
		if (attempt < MAX_RETRIES) {
			await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
		}
	}

	console.error(`[ERP Forward] ${endpoint} — FAILED after ${MAX_RETRIES} retries:`, lastError);
	return { success: false, error: lastError };
}

/**
 * POST handler — xác định event type từ URL path segment cuối cùng.
 */
export async function POST(request) {
	const { pathname } = new URL(request.url);
	// Extract event type: /api/webhooks/erp/new-customer → "new-customer"
	const segments = pathname.replace(/\/$/, "").split("/");
	const eventType = segments[segments.length - 1];

	const validEvents = [
		"new-customer",
		"cancel-booking",
		"update-booking",
		"new-booking",
		"update-account",
	];

	if (!validEvents.includes(eventType)) {
		return NextResponse.json(
			{ error: `Invalid event type: ${eventType}`, validEvents },
			{ status: 400 }
		);
	}

	try {
		const payload = await request.json();

		if (!payload || !payload.id) {
			return NextResponse.json(
				{ error: "Payload must include 'id' (document key)" },
				{ status: 400 }
			);
		}

		// Forward to ERP (fire-and-forget — không chặn response)
		const result = await forwardToERP(eventType, payload);

		return NextResponse.json({
			received: true,
			forwarded: result.success,
			event: eventType,
			id: payload.id,
		});
	} catch (err) {
		console.error(`[ERP Webhook] Parse error for ${eventType}:`, err);
		return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
	}
}
