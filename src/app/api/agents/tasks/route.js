import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

/**
 * GET /api/agents/tasks — List agent tasks with optional filters.
 *
 * Query params:
 *   ?status=pending|running|completed|failed|queued_for_agent
 *   ?type=skill|flow
 *   ?skill=tour-scraper
 *   ?flow=clone-web-data
 *   ?limit=20 (default 20, max 100)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const skill = searchParams.get('skill');
    const flow = searchParams.get('flow');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);

    const validStatuses = ['pending', 'running', 'completed', 'failed', 'cancelled', 'queued_for_agent'];
    const validTypes = ['skill', 'flow'];

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({
        success: false,
        error: `Status không hợp lệ. Chọn một trong: ${validStatuses.join(', ')}`,
      }, { status: 400 });
    }

    if (type && !validTypes.includes(type)) {
      return NextResponse.json({
        success: false,
        error: `Type không hợp lệ. Chọn một trong: ${validTypes.join(', ')}`,
      }, { status: 400 });
    }

    let query = adminDb.collection('agentTasks').orderBy('createdAt', 'desc');

    if (status) query = query.where('status', '==', status);
    if (type) query = query.where('type', '==', type);
    if (skill) query = query.where('skill', '==', skill);
    if (flow) query = query.where('flow', '==', flow);

    query = query.limit(limit);
    const snapshot = await query.get();

    const tasks = [];
    snapshot.forEach((doc) => {
      tasks.push({ id: doc.id, ...doc.data() });
    });

    return NextResponse.json({
      success: true,
      total: tasks.length,
      tasks,
    });
  } catch (err) {
    console.error('[Agents/Tasks] Error:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
