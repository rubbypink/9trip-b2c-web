/**
 * GET /api/agents/flows — List all available agent workflows.
 * Supports optional ?category= filter.
 */
import { NextResponse } from 'next/server';
import { FLOW_REGISTRY, CATEGORIES, summarizeFlow } from '@/lib/agents/registry';

/**
 * @param {Request} request
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let flows;
    if (category && Object.values(CATEGORIES).includes(category)) {
      flows = FLOW_REGISTRY.filter((f) => f.category === category);
    } else {
      flows = FLOW_REGISTRY;
    }

    return NextResponse.json({
      success: true,
      total: flows.length,
      categories: Object.values(CATEGORIES),
      flows: flows.map(summarizeFlow),
    });
  } catch (err) {
    console.error('[Agents/Flows] Error:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
