import { NextResponse } from 'next/server';
import { getRealAvailabilityAdmin } from '@/lib/firestore-admin';
import { logger } from '@/lib/logger';

export async function POST(req) {
    try {
        const body = await req.json();
        const { serviceId, serviceType, startDate, roomId } = body;

        if (!serviceId || !serviceType || !startDate) {
            return NextResponse.json({ success: false, message: 'Missing required fields: serviceId, serviceType, startDate' }, { status: 400 });
        }

        const availability = await getRealAvailabilityAdmin(serviceId, serviceType, startDate, roomId);

        return NextResponse.json({ success: true, availability });
    } catch (error) {
        logger.error('[API availability/check] Error:', error.message);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
