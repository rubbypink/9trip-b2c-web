import { NextResponse } from 'next/server';
import { createInventoryHoldAdmin } from '@/lib/firestore-admin';
import { logger } from '@/lib/logger';

export async function POST(req) {
    try {
        const body = await req.json();
        const { serviceId, serviceType, startDate, endDate, quantity, userId, roomId } = body;

        if (!serviceId || !serviceType || !startDate || !quantity || !userId) {
            return NextResponse.json({ success: false, message: 'Missing required fields: serviceId, serviceType, startDate, quantity, userId' }, { status: 400 });
        }

        const holdId = await createInventoryHoldAdmin(
            serviceId,
            serviceType,
            startDate,
            endDate || null,
            quantity,
            userId,
            roomId
        );

        if (!holdId) {
            return NextResponse.json({ success: false, message: 'Không thể giữ chỗ. Vui lòng thử lại.' }, { status: 409 });
        }

        return NextResponse.json({ success: true, holdId });
    } catch (error) {
        logger.error('[API availability/hold] Error:', error.message);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
