/**
 * GET /api/agents/skills — List all available agent skills.
 * Supports optional ?category= filter.
 */
import { NextResponse } from 'next/server';
import { SKILL_REGISTRY, CATEGORIES, getSkillsByCategory, summarizeSkill } from '@/lib/agents/registry';
import { logger } from '@/lib/logger';

/**
 * @param {Request} request
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let skills;
    if (category && Object.values(CATEGORIES).includes(category)) {
      skills = getSkillsByCategory(category);
    } else {
      skills = SKILL_REGISTRY;
    }

    return NextResponse.json({
      success: true,
      total: skills.length,
      categories: Object.values(CATEGORIES),
      skills: skills.map(summarizeSkill),
    });
  } catch (err) {
    logger.error('[Agents/Skills] Error:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
