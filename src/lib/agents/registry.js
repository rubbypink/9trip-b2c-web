/**
 * Agent Skill & Flow Registry — Central catalog of all available skills and flows.
 * Defines metadata, input parameters, execution modes, and category mapping
 * for every agent skill in the system. Used by API routes to validate requests
 * and by the task executor to route execution.
 *
 * @module agents/registry
 */

// ─── Execution Modes ───────────────────────────────────────────────────────

/**
 * How a skill is executed.
 * - 'firestore-task': Creates a Firestore document, processed by Cloud Function
 * - 'agent-only': Requires a connected AI agent (Playwright/browser), cannot
 *    run server-side. Task created in Firestore with `queued_for_agent` status.
 * - 'api-proxy': Proxied call to external service (Firecrawl, OpenRouter).
 */
const EXEC_MODES = /** @type {const} */ ({
  FIRESTORE_TASK: 'firestore-task',
  AGENT_ONLY: 'agent-only',
  API_PROXY: 'api-proxy',
});

// ─── Category Tags ─────────────────────────────────────────────────────────

const CATEGORIES = {
  DATA_IMPORT: 'data-import',
  MEDIA: 'media',
  CODE_GENERATION: 'code-generation',
  PROMPT_ENGINEERING: 'prompt-engineering',
  ORCHESTRATION: 'orchestration',
  WORKFLOW: 'workflow',
  INFRASTRUCTURE: 'infrastructure',
};

// ─── Skill Registry ────────────────────────────────────────────────────────

/**
 * Full skill catalog. Each entry defines:
 * @typedef {Object} SkillDefinition
 * @property {Object} params - Parameter schema (key → { type, required, description, example })
 * @property {string[]} triggers - Natural language trigger phrases
 * @property {string} [firestoreCollection] - Target Firestore collection (scrapers only)
 * @property {Object} [resultSchema] - Shape of the result object
 */

/** @type {SkillDefinition[]} */
export const SKILL_REGISTRY = [
  // ── Data Import (Scrapers) ──────────────────────────────────────────
  {
    name: 'tour-scraper',
    displayName: 'Tour Scraper',
    description: 'Scrape toàn bộ dữ liệu tour từ URL các website (ivivu.com, v.v.) → chuẩn hóa schema → lưu Firestore + Storage.',
    category: CATEGORIES.DATA_IMPORT,
    execMode: EXEC_MODES.AGENT_ONLY,
    scriptPath: '.agents/skills/tour-scraper/scripts/tourScraper.mjs',
    params: {
      url: { type: 'string', required: true, description: 'URL trang tour (detail page) hoặc list page', example: 'https://www.ivivu.com/du-lich/tour-phu-quoc-4n3d' },
      lazyRendering: { type: 'boolean', required: false, description: 'Bật lazy rendering để lấy full data (giá trẻ em, lịch trình chi tiết). Khuyến nghị bật cho ivivu.com', example: true },
    },
    triggers: ['tạo tour', 'create tour', 'scrape tour', 'use tour-scraper'],
    firestoreCollection: 'tours',
  },
  {
    name: 'booking-scraper',
    displayName: 'Booking.com Scraper',
    description: 'Tìm kiếm khách sạn trên booking.com → scrape toàn bộ dữ liệu (hotel + rooms + ảnh + reviews) → lưu Firestore + Storage + seed pricing.',
    category: CATEGORIES.DATA_IMPORT,
    execMode: EXEC_MODES.AGENT_ONLY,
    scriptPath: '.agents/skills/booking-scraper/scripts/getHotelImages.mjs',
    params: {
      hotelName: { type: 'string', required: true, description: 'Tên khách sạn cần tìm trên Booking.com', example: 'Premier Residences Phu Quoc Emerald Bay' },
      url: { type: 'string', required: false, description: 'URL trực tiếp trang khách sạn trên Booking.com (bỏ qua bước search)', example: 'https://www.booking.com/hotel/vn/premier-residences-phu-quoc-emerald-bay' },
      seedPricing: { type: 'boolean', required: false, description: 'Tự động seed pricing test sau khi tạo hotel', example: true },
    },
    triggers: ['tạo khách sạn', 'create hotel', 'use booking-scraper'],
    firestoreCollection: 'hotels',
  },
  {
    name: 'activity-scraper',
    displayName: 'Activity Scraper',
    description: 'Scrape toàn bộ dữ liệu activity/trải nghiệm từ URL (ivivu.com, v.v.) → chuẩn hóa schema → lưu Firestore + Storage.',
    category: CATEGORIES.DATA_IMPORT,
    execMode: EXEC_MODES.AGENT_ONLY,
    scriptPath: '.agents/skills/activity-scraper/scripts/activityScraper.mjs',
    params: {
      url: { type: 'string', required: true, description: 'URL trang activity/trải nghiệm', example: 'https://www.ivivu.com/du-lich/activity/...' },
      lazyRendering: { type: 'boolean', required: false, description: 'Bật lazy rendering để lấy đầy đủ dữ liệu pricing', example: false },
    },
    triggers: ['tạo activity', 'create activity', 'scrape activity', 'use activity-scraper'],
    firestoreCollection: 'activities',
  },

  // ── Media Pipeline ───────────────────────────────────────────────────
  {
    name: 'media-finder',
    displayName: 'Media Finder',
    description: 'Tìm kiếm, phát hiện và phân loại ảnh trong hệ thống. Quét Firestore collections → phân tích URL ảnh → phát hiện ảnh thiếu/broken.',
    category: CATEGORIES.MEDIA,
    execMode: EXEC_MODES.FIRESTORE_TASK,
    scriptPath: '.agents/skills/media-finder/scripts/mediaFinder.mjs',
    params: {
      collection: { type: 'string', required: false, description: 'Tên collection cần quét (tours, hotels, activities). Để trống = quét tất cả', example: 'tours' },
      checkBroken: { type: 'boolean', required: false, description: 'Kiểm tra link ảnh broken (HEAD request)', example: true },
    },
    triggers: ['tìm ảnh', 'find media', 'check images', 'use media-finder'],
    resultSchema: { totalImages: 'number', brokenCount: 'number', missingCount: 'number', results: 'array' },
  },
  {
    name: 'media-optimizer',
    displayName: 'Media Optimizer',
    description: 'Nhận danh sách ảnh → download từ nguồn → xóa/thay logo → convert WebP → tối ưu kích thước → upload Firebase Storage → cập nhật Firestore.',
    category: CATEGORIES.MEDIA,
    execMode: EXEC_MODES.FIRESTORE_TASK,
    scriptPath: '.agents/skills/media-optimizer/scripts/mediaOptimizer.mjs',
    params: {
      imageUrls: { type: 'array', required: true, description: 'Danh sách URL ảnh cần tối ưu', example: ['https://example.com/img1.jpg'] },
      replaceLogo: { type: 'boolean', required: false, description: 'Xóa/thay logo cũ từ ảnh', example: true },
      targetCollection: { type: 'string', required: false, description: 'Collection mục tiêu trong Firestore để cập nhật URL', example: 'tours' },
    },
    triggers: ['tối ưu ảnh', 'optimize media', 'use media-optimizer'],
  },

  // ── Orchestration & Infrastructure ───────────────────────────────────
  {
    name: 'orchestrator',
    displayName: 'Orchestrator',
    description: 'Phân tích yêu cầu → lập kế hoạch → chia sub-task → điều phối subagent thực thi → tổng hợp báo cáo.',
    category: CATEGORIES.ORCHESTRATION,
    execMode: EXEC_MODES.FIRESTORE_TASK,
    scriptPath: null, // Pure agent logic, no CLI script
    params: {
      task: { type: 'string', required: true, description: 'Mô tả task cần thực hiện (bằng tiếng Việt hoặc tiếng Anh)', example: 'Xây dựng trang chi tiết tour với đầy đủ pricing tiers' },
      context: { type: 'string', required: false, description: 'Ngữ cảnh bổ sung (file paths, constraints)', example: 'src/app/tours/[slug]/page.js' },
    },
    triggers: ['orchestrator', 'build plan', 'lập kế hoạch'],
  },
  {
    name: 'ai-agents-architect',
    displayName: 'AI Agents Architect',
    description: 'Thiết kế và xây dựng hệ thống autonomous AI agents. Multi-agent orchestration, memory systems, planning strategies.',
    category: CATEGORIES.ORCHESTRATION,
    execMode: EXEC_MODES.FIRESTORE_TASK,
    scriptPath: null,
    params: {
      requirements: { type: 'string', required: true, description: 'Yêu cầu thiết kế agent system', example: 'Xây dựng hệ thống multi-agent để xử lý đặt phòng khách sạn' },
      patterns: { type: 'array', required: false, description: 'Các pattern cần áp dụng (ReAct, Plan-and-Execute, Supervisor, ...)', example: ['ReAct', 'Supervisor'] },
    },
    triggers: ['build agent', 'autonomous agent', 'multi-agent', 'use plan agent'],
  },

  // ── Prompt & Skill Engineering ───────────────────────────────────────
  {
    name: 'prompt-engineer',
    displayName: 'Prompt Engineer',
    description: 'Thiết kế và tối ưu prompt cho LLM-powered applications. Prompt structure, context management, output formatting.',
    category: CATEGORIES.PROMPT_ENGINEERING,
    execMode: EXEC_MODES.FIRESTORE_TASK,
    scriptPath: null,
    params: {
      goal: { type: 'string', required: true, description: 'Mục tiêu của prompt cần thiết kế', example: 'Extract tour data from raw HTML and map to Firestore schema' },
      format: { type: 'string', required: false, description: 'Định dạng output mong muốn', example: 'JSON matching tours schema' },
      patterns: { type: 'array', required: false, description: 'Prompt patterns cần áp dụng', example: ['Few-Shot', 'Chain-of-Thought'] },
    },
    triggers: ['prompt engineering', 'system prompt', 'few-shot', 'chain of thought', 'prompt design'],
  },
  {
    name: 'skill-creator',
    displayName: 'Skill Creator',
    description: 'Tạo mới, chỉnh sửa, và cải thiện agent skills. Đo lường hiệu suất skill qua benchmark và variance analysis.',
    category: CATEGORIES.INFRASTRUCTURE,
    execMode: EXEC_MODES.FIRESTORE_TASK,
    scriptPath: null,
    params: {
      action: { type: 'string', required: true, description: 'Tạo (create) hay chỉnh sửa (modify) skill?', example: 'create' },
      skillName: { type: 'string', required: true, description: 'Tên skill mới hoặc skill cần sửa', example: 'hotel-price-analyzer' },
      description: { type: 'string', required: true, description: 'Mô tả chức năng của skill', example: 'Phân tích giá phòng từ nhiều nguồn và đề xuất pricing tối ưu' },
    },
    triggers: ['create skill', 'modify skill', 'improve skill', 'skill evaluation'],
  },

  // ── Code Generation ──────────────────────────────────────────────────
  {
    name: 'vercel-react-best-practices',
    displayName: 'React/Next.js Best Practices',
    description: 'Áp dụng 70+ quy tắc performance optimization từ Vercel Engineering cho React/Next.js code.',
    category: CATEGORIES.CODE_GENERATION,
    execMode: EXEC_MODES.FIRESTORE_TASK,
    scriptPath: null,
    params: {
      filePath: { type: 'string', required: true, description: 'Đường dẫn file cần review (từ src/)', example: 'src/app/hotels/[slug]/page.js' },
      rules: { type: 'array', required: false, description: 'Các rule cụ thể cần check. Để trống = check tất cả', example: ['server-parallel-fetching', 'rerender-dependencies'] },
    },
    triggers: ['review code', 'performance', 'best practices', 'React optimization'],
  },
  {
    name: 'tailwind-design-system',
    displayName: 'Tailwind Design System',
    description: 'Xây dựng design system với Tailwind CSS v4, design tokens, component library, và responsive patterns.',
    category: CATEGORIES.CODE_GENERATION,
    execMode: EXEC_MODES.FIRESTORE_TASK,
    scriptPath: null,
    params: {
      componentType: { type: 'string', required: true, description: 'Loại component cần xây dựng', example: 'card' },
      variants: { type: 'array', required: false, description: 'Các variant cần hỗ trợ', example: ['default', 'featured', 'compact'] },
    },
    triggers: ['design system', 'Tailwind component', 'responsive design', 'UI pattern'],
  },

  // ── MCP / Firebase ───────────────────────────────────────────────────
  {
    name: 'mcp-builder',
    displayName: 'MCP Builder',
    description: 'Xây dựng MCP (Model Context Protocol) servers để LLMs tương tác với external services qua well-designed tools.',
    category: CATEGORIES.INFRASTRUCTURE,
    execMode: EXEC_MODES.FIRESTORE_TASK,
    scriptPath: null,
    params: {
      framework: { type: 'string', required: true, description: 'Python (FastMCP) hoặc Node/TypeScript (MCP SDK)', example: 'python' },
      apiName: { type: 'string', required: true, description: 'Tên external API/service cần wrap', example: 'OpenWeatherMap' },
    },
    triggers: ['build MCP server', 'MCP integration', 'Model Context Protocol'],
  },
  {
    name: 'firebase-ai-logic',
    displayName: 'Firebase AI Logic',
    description: 'Tích hợp Firebase AI Logic (Gemini API) vào web app: setup, multimodal inference, structured output, security.',
    category: CATEGORIES.INFRASTRUCTURE,
    execMode: EXEC_MODES.FIRESTORE_TASK,
    scriptPath: null,
    params: {
      feature: { type: 'string', required: true, description: 'Tính năng cần tích hợp AI', example: 'Auto-generate tour descriptions from itinerary data' },
      model: { type: 'string', required: false, description: 'Gemini model (gemini-2.0-flash, gemini-1.5-pro, ...)', example: 'gemini-2.0-flash' },
    },
    triggers: ['firebase AI', 'Gemini', 'multimodal', 'structured output'],
  },
];

// ─── Flow Registry ─────────────────────────────────────────────────────────

/**
 * Pre-defined multi-step workflows combining multiple skills.
 * @typedef {Object} FlowDefinition
 * @property {string} name - Unique flow identifier
 * @property {string} displayName - Human-readable name
 * @property {string} description - What this flow does
 * @property {string} category - Category tag
 * @property {{ skill: string, params?: Object, dependsOn?: number }[]} steps - Ordered steps
 * @property {Object} params - Input parameters for the entire flow
 */

/** @type {FlowDefinition[]} */
export const FLOW_REGISTRY = [
  {
    name: 'clone-web-data',
    displayName: 'Clone Web Data',
    description: 'Sao chép toàn bộ dữ liệu từ URL web bên ngoài: FireCrawl scrape → prompt-engineer tối ưu → orchestrator chuẩn hóa → ERP endpoint.',
    category: CATEGORIES.WORKFLOW,
    params: {
      url: { type: 'string', required: true, description: 'URL trang web nguồn', example: 'https://example.com/tours' },
      serviceType: { type: 'string', required: true, description: 'Loại service (tour|hotel|room|activity|car|rental|location)', example: 'tour' },
      hotelId: { type: 'string', required: false, description: 'Bắt buộc nếu serviceType=room', example: 'abc123' },
    },
    steps: [
      { skill: 'prompt-engineer', params: { auto: true }, description: 'Tối ưu prompt cho FireCrawl dựa trên schema mục tiêu' },
      { skill: 'activity-scraper', params: { auto: true }, dependsOn: 0, description: 'Gọi FireCrawl MCP scrape dữ liệu với prompt đã tối ưu' },
      { skill: 'orchestrator', params: { auto: true }, dependsOn: 1, description: 'Validate + transform dữ liệu theo schema chuẩn' },
    ],
    triggers: ['clone', 'sao chép dữ liệu từ web', 'lấy data từ URL', 'cloneWebData', 'sync web data'],
    resultSchema: { syncedCount: 'number', errors: 'array' },
  },
  {
    name: 'full-hotel-import',
    displayName: 'Full Hotel Import Pipeline',
    description: 'Pipeline hoàn chỉnh: Booking.com scrape → media optimizer → pricing seed → report.',
    category: CATEGORIES.WORKFLOW,
    params: {
      hotelName: { type: 'string', required: true, description: 'Tên khách sạn', example: 'Vinpearl Phu Quoc' },
      optimizeImages: { type: 'boolean', required: false, description: 'Tối ưu ảnh sau khi scrape', example: true },
      seedPricing: { type: 'boolean', required: false, description: 'Seed pricing test', example: true },
    },
    steps: [
      { skill: 'booking-scraper', description: 'Tìm + scrape khách sạn từ Booking.com' },
      { skill: 'media-optimizer', dependsOn: 0, description: 'Tối ưu toàn bộ ảnh hotel + rooms' },
    ],
    triggers: ['import hotel full', 'full hotel pipeline', 'nhập khách sạn đầy đủ'],
  },
  {
    name: 'full-tour-import',
    displayName: 'Full Tour Import Pipeline',
    description: 'Pipeline hoàn chỉnh: Tour scrape → media optimizer → report.',
    category: CATEGORIES.WORKFLOW,
    params: {
      url: { type: 'string', required: true, description: 'URL tour', example: 'https://www.ivivu.com/du-lich/tour-phu-quoc-4n3d' },
      lazyRendering: { type: 'boolean', required: false, description: 'Bật lazy rendering', example: true },
      optimizeImages: { type: 'boolean', required: false, description: 'Tối ưu ảnh sau scrape', example: true },
    },
    steps: [
      { skill: 'tour-scraper', description: 'Scrape toàn bộ dữ liệu tour' },
      { skill: 'media-optimizer', dependsOn: 0, description: 'Tối ưu ảnh gallery tour' },
    ],
    triggers: ['import tour full', 'full tour pipeline', 'nhập tour đầy đủ'],
  },
  {
    name: 'media-audit-and-fix',
    displayName: 'Media Audit & Fix',
    description: 'Audit toàn bộ ảnh trong hệ thống → tìm broken/missing → tối ưu lại.',
    category: CATEGORIES.WORKFLOW,
    params: {
      collection: { type: 'string', required: false, description: 'Collection cần audit (để trống = tất cả)', example: 'tours' },
      autoFix: { type: 'boolean', required: false, description: 'Tự động fix ảnh broken (tìm ảnh thay thế + tối ưu)', example: true },
    },
    steps: [
      { skill: 'media-finder', description: 'Quét toàn bộ collections → phân loại ảnh' },
      { skill: 'media-optimizer', dependsOn: 0, description: 'Download + tối ưu + upload ảnh cần fix' },
    ],
    triggers: ['audit media', 'fix images', 'kiểm tra ảnh', 'sửa ảnh lỗi'],
  },
];

// ─── Registry Query Helpers ────────────────────────────────────────────────

/**
 * Find a skill by name.
 * @param {string} name - Skill name (slug)
 * @returns {SkillDefinition|undefined}
 */
export function getSkill(name) {
  return SKILL_REGISTRY.find((s) => s.name === name);
}

/**
 * Find a flow by name.
 * @param {string} name - Flow name (slug)
 * @returns {FlowDefinition|undefined}
 */
export function getFlow(name) {
  return FLOW_REGISTRY.find((f) => f.name === name);
}

/**
 * Get all skills in a category.
 * @param {string} category - Category tag
 * @returns {SkillDefinition[]}
 */
export function getSkillsByCategory(category) {
  return SKILL_REGISTRY.filter((s) => s.category === category);
}

/**
 * Get all skills grouped by category.
 * @returns {Object<string, SkillDefinition[]>}
 */
export function getSkillsByCategoryGrouped() {
  const grouped = {};
  for (const skill of SKILL_REGISTRY) {
    if (!grouped[skill.category]) grouped[skill.category] = [];
    grouped[skill.category].push(skill);
  }
  return grouped;
}

/**
 * Validate params against a skill/flow definition.
 * @param {Object} params - User-provided parameters
 * @param {Object} paramSchema - Parameter schema from registry
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateParams(params, paramSchema) {
  const errors = [];
  if (!paramSchema) return { valid: true, errors: [] };

  for (const [key, schema] of Object.entries(paramSchema)) {
    if (schema.required && (params[key] === undefined || params[key] === null || params[key] === '')) {
      errors.push(`Thiếu tham số bắt buộc: ${key} (${schema.description})`);
      continue;
    }
    if (params[key] !== undefined && params[key] !== null) {
      // Type validation
      if (schema.type === 'array' && !Array.isArray(params[key])) {
        errors.push(`Tham số ${key} phải là array`);
      } else if (schema.type === 'number' && typeof params[key] !== 'number') {
        errors.push(`Tham số ${key} phải là number`);
      } else if (schema.type === 'boolean' && typeof params[key] !== 'boolean') {
        errors.push(`Tham số ${key} phải là boolean`);
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Generate a human-readable summary of a skill.
 * @param {SkillDefinition} skill
 * @returns {Object} Public-safe skill info
 */
export function summarizeSkill(skill) {
  return {
    name: skill.name,
    displayName: skill.displayName,
    description: skill.description,
    category: skill.category,
    execMode: skill.execMode,
    params: skill.params,
    firestoreCollection: skill.firestoreCollection || null,
  };
}

/**
 * Generate a human-readable summary of a flow.
 * @param {FlowDefinition} flow
 * @returns {Object} Public-safe flow info
 */
export function summarizeFlow(flow) {
  return {
    name: flow.name,
    displayName: flow.displayName,
    description: flow.description,
    category: flow.category,
    params: flow.params,
    stepCount: flow.steps.length,
    steps: flow.steps.map((s) => ({ skill: s.skill, description: s.description })),
  };
}

export { CATEGORIES, EXEC_MODES };
