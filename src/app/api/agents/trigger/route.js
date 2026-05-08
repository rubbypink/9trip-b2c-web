import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getSkill, getFlow, validateParams, EXEC_MODES } from '@/lib/agents/registry';

/**
 * POST /api/agents/trigger — Create a new agent task.
 *
 * Request body:
 *   { skill?: string, flow?: string, params: Object }
 *
 * Exactly one of `skill` or `flow` must be provided.
 * The task is created in Firestore `agentTasks` collection with status 'pending'.
 * Agent exec modes:
 *   - 'agent-only': task queued for connected AI agent
 *   - 'firestore-task': task processed by Cloud Function trigger
 */
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { skill: skillName, flow: flowName, params = {} } = body;

    if (!skillName && !flowName) {
      return NextResponse.json({
        success: false,
        error: 'Cần cung cấp `skill` hoặc `flow` để kích hoạt agent.',
      }, { status: 400 });
    }

    if (skillName && flowName) {
      return NextResponse.json({
        success: false,
        error: 'Chỉ được chọn MỘT trong hai: `skill` hoặc `flow`.',
      }, { status: 400 });
    }

    let target, targetType;

    if (skillName) {
      target = getSkill(skillName);
      targetType = 'skill';
      if (!target) {
        return NextResponse.json({
          success: false,
          error: `Không tìm thấy skill "${skillName}". Dùng GET /api/agents/skills để xem danh sách.`,
        }, { status: 404 });
      }
    } else {
      target = getFlow(flowName);
      targetType = 'flow';
      if (!target) {
        return NextResponse.json({
          success: false,
          error: `Không tìm thấy flow "${flowName}". Dùng GET /api/agents/flows để xem danh sách.`,
        }, { status: 404 });
      }
    }

    // Validate required params
    const paramValidation = validateParams(params, target.params);
    if (!paramValidation.valid) {
      return NextResponse.json({
        success: false,
        error: 'Thiếu hoặc sai tham số bắt buộc.',
        details: paramValidation.errors,
      }, { status: 400 });
    }

    // Determine initial status based on exec mode
    let initialStatus = 'pending';
    if (targetType === 'skill' && target.execMode === EXEC_MODES.AGENT_ONLY) {
      initialStatus = 'queued_for_agent';
    }

    // Create task document in Firestore
    const taskRef = adminDb.collection('agentTasks').doc();
    const taskData = {
      id: taskRef.id,
      type: targetType,
      skill: targetType === 'skill' ? target.name : null,
      flow: targetType === 'flow' ? target.name : null,
      params,
      status: initialStatus,
      result: null,
      error: null,
      progress: {
        currentStep: null,
        stepsCompleted: 0,
        stepsTotal: targetType === 'flow' ? target.steps.length : 1,
        message: initialStatus === 'queued_for_agent'
          ? 'Đang chờ AI agent kết nối để thực thi...'
          : 'Đang chờ xử lý...',
      },
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
    };

    await taskRef.set(taskData);

    return NextResponse.json({
      success: true,
      taskId: taskRef.id,
      type: targetType,
      name: target.name,
      displayName: target.displayName,
      status: initialStatus,
      execMode: targetType === 'skill' ? target.execMode : null,
      message: initialStatus === 'queued_for_agent'
        ? 'Skill yêu cầu AI agent (Playwright). Task đã được tạo, đang chờ agent xử lý.'
        : 'Task đã được tạo và đang chờ Cloud Function xử lý.',
    }, { status: 201 });
  } catch (err) {
    console.error('[Agents/Trigger] Error:', err.message);
    return NextResponse.json({
      success: false,
      error: 'Lỗi hệ thống khi tạo agent task.',
    }, { status: 500 });
  }
}
