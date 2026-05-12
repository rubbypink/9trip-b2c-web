import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { serializeSnap } from '@/lib/firestore-admin';
import { logger } from '@9trip/shared/logger';

/**
 * GET /api/agents/tasks/[id] — Get a single task by ID with full status and result.
 *
 * @param {Request} request
 * @param {{ params: Promise<{ id: string }> }} context
 */
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Thiếu task ID' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const doc = await adminDb.collection('agentTasks').doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ success: false, error: 'Task không tồn tại' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      task: serializeSnap(doc),
    });
  } catch (err) {
    logger.error('[Agents/Task] Error:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/agents/tasks/[id] — Cancel a pending task.
 * Only tasks with status 'pending' or 'queued_for_agent' can be cancelled.
 *
 * @param {Request} request
 * @param {{ params: Promise<{ id: string }> }} context
 */
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Thiếu task ID' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const taskRef = adminDb.collection('agentTasks').doc(id);
    const doc = await taskRef.get();

    if (!doc.exists) {
      return NextResponse.json({ success: false, error: 'Task không tồn tại' }, { status: 404 });
    }

    const task = doc.data();
    const cancellableStatuses = ['pending', 'queued_for_agent'];

    if (!cancellableStatuses.includes(task.status)) {
      return NextResponse.json({
        success: false,
        error: `Không thể hủy task đang ở trạng thái "${task.status}". Chỉ hủy được task pending hoặc queued.`,
      }, { status: 400 });
    }

    await taskRef.update({
      status: 'cancelled',
      completedAt: new Date().toISOString(),
      error: 'Task bị hủy bởi ngườ dùng.',
    });

    return NextResponse.json({
      success: true,
      message: 'Task đã được hủy.',
    });
  } catch (err) {
    logger.error('[Agents/Task] Error:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
