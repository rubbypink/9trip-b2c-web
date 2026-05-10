import { NextResponse } from 'next/server';
import { releaseInventoryHoldAdmin } from '@/lib/firestore-admin';

export async function POST(req) {
    try {
        const body = await req.json();
        const { holdId } = body;

        if (!holdId) {
            return NextResponse.json({ success: false, message: 'Missing required field: holdId' }, { status: 400 });
        }

        const released = await releaseInventoryHoldAdmin(holdId);

        if (!released) {
            return NextResponse.json({ success: false, message: 'Không thể giải phóng giữ chỗ.' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API availability/release] Error:', error.message);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
