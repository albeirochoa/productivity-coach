/**
 * LLM Agent Orchestrator (Fase 9.1)
 *
 * Specialized productivity coach powered by OpenAI GPT-4o with tool-calling.
 * Maintains Phase 8 guardrails as final authority for all mutations.
 *
 * Architecture:
 * 1. LLM proposes actions via tool-calling
 * 2. Guardrails validate (capacity, conflicts, risk)
 * 3. Preview + explanation returned to user
 * 4. User confirms → execute via Phase 8/9 tools
 *
 * Memory:
 * - Short-term: session context (current week, today, goals)
 * - Long-term: coach_memory table (preferences, patterns, style)
 *
 * Proactivity:
 * - Morning brief (7-9 AM, once/day)
 * - Midweek check (Wed 12-2 PM, once/week)
 * - Weekly review (Fri 4-6 PM, once/week)
 */

import OpenAI from 'openai';
import logger from './logger.js';
import {
    generateRecommendations,
    fetchRiskSignals,
    buildCapacityConfig,
    RULE_IDS,
} from './coach-rules-engine.js';
import { detectLearningIntent } from './content-templates.js';
import {
    calculateWeeklyCapacity,
    calculateWeeklyLoad,
    formatMinutes,
} from './capacity-calculator.js';
import { buildMutationPreview } from './llm-agent-mutation-tools.js';

// ─── Configuration ───────────────────────────────────────────
// NOTE: Read env vars lazily (via functions) because ESM imports resolve
// before dotenv.config() runs in server.js. Reading at module-load time
// would capture empty strings.

const MODEL = 'gpt-4o';
const MAX_TOKENS = 2048;

function getApiKey() {
    return process.env.OPENAI_API_KEY || '';
}

// Feature flag — also lazy to respect dotenv timing
// Requires both: flag enabled AND API key present
export function isLLMAgentEnabled() {
    const flagEnabled = process.env.FF_COACH_LLM_AGENT_ENABLED !== 'false';
    const apiKeyPresent = !!getApiKey();

    if (flagEnabled && !apiKeyPresent) {
        logger.warn('LLM Agent flag is enabled but OPENAI_API_KEY is missing. LLM will be disabled.');
    }

    return flagEnabled && apiKeyPresent;
}

// Keep backward-compat export (evaluated lazily via getter)
export const FF_COACH_LLM_AGENT_ENABLED = true; // placeholder, use isLLMAgentEnabled() at runtime

// Proactivity windows (hour ranges)
const PROACTIVE_WINDOWS = {
    morning_brief: { start: 7, end: 9, frequency: 'daily' },
    midweek_check: { start: 12, end: 14, frequency: 'weekly', dayOfWeek: 3 }, // Wed
    weekly_review: { start: 16, end: 18, frequency: 'weekly', dayOfWeek: 5 }, // Fri
};

// ─── LLM Client ──────────────────────────────────────────────

let openaiClient = null;

function getOpenAIClient() {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('OPENAI_API_KEY not configured. Set env variable to enable LLM agent.');
    }
    if (!openaiClient) {
        openaiClient = new OpenAI({ apiKey });
    }
    return openaiClient;
}

// ─── Tool Definitions for OpenAI ─────────────────────────────

/**
 * Tool schemas for OpenAI function calling.
 * These are read-only tools — mutations go through confirmation flow.
 */
export const LLM_TOOLS = [
    {
        type: 'function',
        function: {
            name: 'get_context_snapshot',
            description: 'Get complete current state: inbox, today tasks, week tasks, someday tasks, projects, calendar, objectives, KRs, capacity, areas, stats. Use this first to understand user situation.',
            parameters: {
                type: 'object',
                properties: {
                    include: {
                        type: 'array',
                        items: { type: 'string', enum: ['inbox', 'today', 'week', 'someday', 'projects', 'calendar', 'objectives', 'capacity', 'areas', 'stats'] },
                        description: 'Which sections to include. Omit to get all.',
                    },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'list_areas',
            description: 'List life areas with optional status filter.',
            parameters: {
                type: 'object',
                properties: {
                    status: { type: 'string', enum: ['active', 'archived', 'all'], default: 'active' },
                    limit: { type: 'number', default: 50 },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'list_inbox',
            description: 'List inbox items with filters.',
            parameters: {
                type: 'object',
                properties: {
                    type: { type: 'string', enum: ['work', 'personal', 'all'], default: 'all' },
                    areaId: { type: 'string', description: 'Filter by area/category' },
                    limit: { type: 'number', default: 20 },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'list_today',
            description: 'List tasks for today (dueDate=today or no date assigned).',
            parameters: {
                type: 'object',
                properties: {
                    areaId: { type: 'string', description: 'Filter by area' },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'list_week',
            description: 'List tasks committed for this week.',
            parameters: {
                type: 'object',
                properties: {
                    areaId: { type: 'string' },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'list_someday',
            description: 'List active tasks not committed to this week.',
            parameters: {
                type: 'object',
                properties: {
                    areaId: { type: 'string' },
                    limit: { type: 'number', default: 20 },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'list_projects',
            description: 'List projects with filters.',
            parameters: {
                type: 'object',
                properties: {
                    status: { type: 'string', enum: ['active', 'done', 'archived'] },
                    areaId: { type: 'string' },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_project',
            description: 'Get full project details including milestones.',
            parameters: {
                type: 'object',
                properties: {
                    projectId: { type: 'string', description: 'Project ID' },
                },
                required: ['projectId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'list_calendar_blocks',
            description: 'List calendar blocks for a specific date.',
            parameters: {
                type: 'object',
                properties: {
                    date: { type: 'string', description: 'YYYY-MM-DD' },
                },
                required: ['date'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_calendar_day',
            description: 'Get full day view with blocks and available tasks.',
            parameters: {
                type: 'object',
                properties: {
                    date: { type: 'string', description: 'YYYY-MM-DD' },
                },
                required: ['date'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'list_objectives',
            description: 'List objectives with filters.',
            parameters: {
                type: 'object',
                properties: {
                    status: { type: 'string', enum: ['active', 'paused', 'done'] },
                    period: { type: 'string', description: 'e.g. 2026-Q1' },
                    areaId: { type: 'string' },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_kr_risk_signals',
            description: 'Get key result risk assessment (stalled, no progress, behind schedule).',
            parameters: {
                type: 'object',
                properties: {},
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_capacity_status',
            description: 'Get current capacity status (week load vs available).',
            parameters: {
                type: 'object',
                properties: {},
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_profile',
            description: 'Get user profile and coach preferences.',
            parameters: {
                type: 'object',
                properties: {},
            },
        },
    },
];

/**
 * Mutation tools (require confirmation).
 * These are the same as Phase 9, but now called by LLM.
 */
export const LLM_MUTATION_TOOLS = [
    {
        type: 'function',
        function: {
            name: 'plan_week',
            description: 'Commit tasks to this week based on priority, deadlines, and capacity. Shows preview before execution.',
            parameters: {
                type: 'object',
                properties: {
                    maxTasks: { type: 'number', description: 'Max tasks to commit (optional)' },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'schedule_block',
            description: 'Schedule a calendar block for a task. Shows preview with time slot.',
            parameters: {
                type: 'object',
                properties: {
                    taskId: { type: 'string', description: 'Task ID to schedule' },
                    date: { type: 'string', description: 'YYYY-MM-DD' },
                    startTime: { type: 'string', description: 'HH:MM (optional, will find free slot)' },
                    durationMinutes: { type: 'number', description: 'Duration in minutes' },
                },
                required: ['taskId', 'date'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'reprioritize',
            description: 'Detect overload and suggest redistribution. Shows preview with changes.',
            parameters: {
                type: 'object',
                properties: {},
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'goal_review',
            description: 'Review objectives and key results progress.',
            parameters: {
                type: 'object',
                properties: {},
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'create_content_project',
            description: 'Create a content creation project (video, podcast, blog, newsletter) with pre-defined workflow milestones.',
            parameters: {
                type: 'object',
                properties: {
                    templateId: {
                        type: 'string',
                        enum: ['contenido:video', 'contenido:podcast', 'contenido:blog', 'contenido:newsletter'],
                        description: 'Content template type',
                    },
                    title: {
                        type: 'string',
                        description: 'Project title (e.g., "Video: Introducción a React")',
                    },
                },
                required: ['templateId', 'title'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'create_learning_structure',
            description: 'Create a complete learning structure: objective + key results + project with milestones. Use when user wants to learn a new skill or start a course.',
            parameters: {
                type: 'object',
                properties: {
                    skill: { type: 'string', description: 'What the user wants to learn (e.g. "Facebook Ads")' },
                    period: { type: 'string', description: 'OKR period (e.g. "2026-Q3")' },
                    templateId: {
                        type: 'string',
                        enum: ['aprender:curso', 'aprender:skill'],
                        description: 'Learning template type. Use aprender:curso when user mentions a course with modules, aprender:skill for self-directed learning.',
                    },
                    moduleCount: { type: 'number', description: 'Number of modules (for curso template)' },
                    moduleNames: { type: 'array', items: { type: 'string' }, description: 'Module names (optional)' },
                    currentProgress: { type: 'number', description: 'Current progress % if already started (default 0)' },
                    strategy: { type: 'string', enum: ['goteo', 'batching', 'sprint'], description: 'Learning strategy (default: goteo)' },
                    areaId: { type: 'string', description: 'Life area for this learning goal' },
                },
                required: ['skill', 'period', 'templateId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'smart_process_inbox',
            description: 'Process inbox item into a task linked to objective and optionally scheduled. Reduces 4 steps (capture → create → link → schedule) to 1 confirmation.',
            parameters: {
                type: 'object',
                properties: {
                    inboxId: { type: 'string', description: 'Inbox item ID to process' },
                    text: { type: 'string', description: 'Inbox item text (if no inboxId)' },
                    type: { type: 'string', enum: ['work', 'personal'], description: 'Inbox type' },
                    areaId: { type: 'string', description: 'Area/category for the task' },
                    objectiveId: { type: 'string', description: 'Link to objective' },
                    keyResultId: { type: 'string', description: 'Link to key result' },
                    date: { type: 'string', description: 'Date to schedule (YYYY-MM-DD)' },
                    startTime: { type: 'string', description: 'Start time for calendar block (HH:MM)' },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'plan_and_schedule_week',
            description: 'Generate weekly plan with auto-linked objectives and calendar blocks using Decision Engine v2. Ranks tasks by deadline + KR risk + capacity. Reduces ~15min manual planning to 1 confirmation.',
            parameters: {
                type: 'object',
                properties: {
                    commitCount: { type: 'number', description: 'Number of tasks to commit (default: auto based on capacity)' },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'batch_reprioritize',
            description: 'One-click auto-redistribute when overload detected. Defers low-priority tasks without KR risk or deadlines. Converts capacity warning into action.',
            parameters: {
                type: 'object',
                properties: {},
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'breakdown_milestone',
            description: 'Split a milestone into sub-tasks and distribute into calendar. Helps with large milestones that feel overwhelming.',
            parameters: {
                type: 'object',
                properties: {
                    projectId: { type: 'string', description: 'Project ID' },
                    projectTitle: { type: 'string', description: 'Project title (if no projectId)' },
                    milestoneId: { type: 'string', description: 'Milestone ID' },
                    milestoneTitle: { type: 'string', description: 'Milestone title (if no milestoneId)' },
                    subtaskCount: { type: 'number', description: 'Number of subtasks (default: 3)' },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'create_task',
            description: 'Create a task (simple or project).',
            parameters: {
                type: 'object',
                properties: {
                    title: { type: 'string' },
                    type: { type: 'string', enum: ['simple', 'project'] },
                    areaId: { type: 'string' },
                    category: { type: 'string' },
                    thisWeek: { type: 'boolean' },
                    description: { type: 'string' },
                    dueDate: { type: 'string' },
                    priority: { type: 'string', enum: ['low', 'normal', 'high'] },
                    objectiveId: { type: 'string' },
                    keyResultId: { type: 'string' },
                    milestones: { type: 'array', items: { type: 'object' } },
                    taskTitle: { type: 'string', description: 'Alias of title' },
                },
                required: ['title'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'update_task',
            description: 'Update fields for an existing task.',
            parameters: {
                type: 'object',
                properties: {
                    taskId: { type: 'string' },
                    taskTitle: { type: 'string' },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    dueDate: { type: 'string' },
                    priority: { type: 'string', enum: ['low', 'normal', 'high'] },
                    status: { type: 'string', enum: ['active', 'done', 'archived'] },
                    thisWeek: { type: 'boolean' },
                    targetList: { type: 'string', enum: ['today', 'week', 'someday'] },
                    areaId: { type: 'string' },
                    category: { type: 'string' },
                    objectiveId: { type: 'string' },
                    keyResultId: { type: 'string' },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'delete_task',
            description: 'Delete a task by id.',
            parameters: {
                type: 'object',
                properties: { taskId: { type: 'string' }, taskTitle: { type: 'string' }, title: { type: 'string' } },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'create_project',
            description: 'Create a project with milestones.',
            parameters: {
                type: 'object',
                properties: {
                    title: { type: 'string' },
                    areaId: { type: 'string' },
                    category: { type: 'string' },
                    description: { type: 'string' },
                    strategy: { type: 'string' },
                    milestones: { type: 'array', items: { type: 'object' } },
                },
                required: ['title'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'update_project',
            description: 'Update fields for a project.',
            parameters: {
                type: 'object',
                properties: {
                    projectId: { type: 'string' },
                    projectTitle: { type: 'string' },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    status: { type: 'string', enum: ['active', 'done', 'archived'] },
                    areaId: { type: 'string' },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'delete_project',
            description: 'Delete a project by id.',
            parameters: {
                type: 'object',
                properties: { projectId: { type: 'string' }, projectTitle: { type: 'string' }, title: { type: 'string' } },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'create_inbox_item',
            description: 'Create an inbox item.',
            parameters: {
                type: 'object',
                properties: {
                    text: { type: 'string' },
                    type: { type: 'string', enum: ['work', 'personal'] },
                    dueDate: { type: 'string' },
                    priority: { type: 'string', enum: ['low', 'normal', 'high'] },
                    category: { type: 'string' },
                    areaId: { type: 'string' },
                    objectiveId: { type: 'string' },
                    keyResultId: { type: 'string' },
                },
                required: ['text'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'update_inbox_item',
            description: 'Update an inbox item.',
            parameters: {
                type: 'object',
                properties: {
                    inboxId: { type: 'string' },
                    type: { type: 'string', enum: ['work', 'personal'] },
                    text: { type: 'string' },
                    dueDate: { type: 'string' },
                    priority: { type: 'string', enum: ['low', 'normal', 'high'] },
                    category: { type: 'string' },
                    areaId: { type: 'string' },
                    objectiveId: { type: 'string' },
                    keyResultId: { type: 'string' },
                },
                required: ['inboxId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'delete_inbox_item',
            description: 'Delete an inbox item.',
            parameters: {
                type: 'object',
                properties: {
                    inboxId: { type: 'string' },
                    type: { type: 'string', enum: ['work', 'personal'] },
                },
                required: ['inboxId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'process_inbox_item',
            description: 'Process inbox item into a task.',
            parameters: {
                type: 'object',
                properties: {
                    inboxId: { type: 'string' },
                    type: { type: 'string', enum: ['work', 'personal'] },
                    taskType: { type: 'string', enum: ['simple', 'project'] },
                    thisWeek: { type: 'boolean' },
                    category: { type: 'string' },
                    objectiveId: { type: 'string' },
                    keyResultId: { type: 'string' },
                },
                required: ['inboxId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'create_area',
            description: 'Create a life area.',
            parameters: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    priority: { type: 'string', enum: ['low', 'medium', 'high'] },
                    status: { type: 'string', enum: ['active', 'archived'] },
                    color: { type: 'string' },
                    icon: { type: 'string' },
                },
                required: ['name'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'update_area',
            description: 'Update a life area.',
            parameters: {
                type: 'object',
                properties: {
                    areaId: { type: 'string' },
                    name: { type: 'string' },
                    description: { type: 'string' },
                    priority: { type: 'string', enum: ['low', 'medium', 'high'] },
                    status: { type: 'string', enum: ['active', 'archived'] },
                    color: { type: 'string' },
                    icon: { type: 'string' },
                },
                required: ['areaId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'archive_area',
            description: 'Archive a life area.',
            parameters: {
                type: 'object',
                properties: { areaId: { type: 'string' } },
                required: ['areaId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'create_objective',
            description: 'Create an objective.',
            parameters: {
                type: 'object',
                properties: {
                    title: { type: 'string' },
                    description: { type: 'string' },
                    period: { type: 'string' },
                    status: { type: 'string', enum: ['active', 'paused', 'done'] },
                    areaId: { type: 'string' },
                },
                required: ['title', 'period'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'update_objective',
            description: 'Update an objective.',
            parameters: {
                type: 'object',
                properties: {
                    objectiveId: { type: 'string' },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    period: { type: 'string' },
                    status: { type: 'string', enum: ['active', 'paused', 'done'] },
                    areaId: { type: 'string' },
                },
                required: ['objectiveId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'delete_objective',
            description: 'Delete an objective.',
            parameters: {
                type: 'object',
                properties: { objectiveId: { type: 'string' } },
                required: ['objectiveId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'create_key_result',
            description: 'Create a key result.',
            parameters: {
                type: 'object',
                properties: {
                    objectiveId: { type: 'string' },
                    title: { type: 'string' },
                    metricType: { type: 'string' },
                    startValue: { type: 'number' },
                    currentValue: { type: 'number' },
                    targetValue: { type: 'number' },
                    unit: { type: 'string' },
                    status: { type: 'string' },
                },
                required: ['objectiveId', 'title', 'targetValue'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'update_key_result',
            description: 'Update a key result.',
            parameters: {
                type: 'object',
                properties: {
                    keyResultId: { type: 'string' },
                    objectiveId: { type: 'string' },
                    title: { type: 'string' },
                    metricType: { type: 'string' },
                    startValue: { type: 'number' },
                    currentValue: { type: 'number' },
                    targetValue: { type: 'number' },
                    unit: { type: 'string' },
                    status: { type: 'string' },
                },
                required: ['keyResultId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'update_key_result_progress',
            description: 'Update key result progress (recalculates status).',
            parameters: {
                type: 'object',
                properties: {
                    keyResultId: { type: 'string' },
                    currentValue: { type: 'number' },
                },
                required: ['keyResultId', 'currentValue'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'delete_key_result',
            description: 'Delete a key result.',
            parameters: {
                type: 'object',
                properties: { keyResultId: { type: 'string' } },
                required: ['keyResultId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'create_calendar_block',
            description: 'Create a calendar block.',
            parameters: {
                type: 'object',
                properties: {
                    taskId: { type: 'string' },
                    date: { type: 'string' },
                    startTime: { type: 'string' },
                    endTime: { type: 'string' },
                    status: { type: 'string' },
                    notes: { type: 'string' },
                },
                required: ['taskId', 'date', 'startTime', 'endTime'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'update_calendar_block',
            description: 'Update a calendar block.',
            parameters: {
                type: 'object',
                properties: {
                    blockId: { type: 'string' },
                    date: { type: 'string' },
                    startTime: { type: 'string' },
                    endTime: { type: 'string' },
                    status: { type: 'string' },
                    notes: { type: 'string' },
                },
                required: ['blockId'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'delete_calendar_block',
            description: 'Delete a calendar block.',
            parameters: {
                type: 'object',
                properties: { blockId: { type: 'string' } },
                required: ['blockId'],
            },
        },
    },
];

// ─── System Prompt ────────────────────────────────────────────

function buildSystemPrompt(coachStyle) {
    const { tone = 'directo', insistence = 'media', brevity = 'breve' } = coachStyle || {};

    const toneInstructions = {
        directo: 'Be direct and action-oriented. No fluff. Focus on outcomes.',
        suave: 'Be encouraging and supportive. Acknowledge effort. Frame suggestions positively.',
    };

    const insistenceInstructions = {
        baja: 'Make suggestions once. Respect user autonomy.',
        media: 'Follow up on critical items (overload, deadlines). 2-3 reminders max.',
        alta: 'Be persistent about strategic alignment and capacity. Weekly check-ins.',
    };

    const brevityInstructions = {
        breve: 'Keep responses under 2 sentences. Bullet points for lists.',
        detallado: 'Explain reasoning. Provide context and trade-offs.',
    };

    return `You are "Jarvis-Elite", a high-performance productivity coach for the Productivity Coach app.

Mission:
Protect the user's time, energy, and focus — not just manage tasks. You're a strategic partner who questions low-value work during high-energy hours, protects Deep Work blocks, and intervenes when load exceeds real capacity.

Principles (Fase 10.2 - Coach de Intervención):
- Fricción selectiva: Question low-value tasks during high-energy windows (9-12 AM, 2-5 PM)
- Protección de Deep Work: Prioritize 90-minute uninterrupted blocks for cognitive work
- Realismo radical: If load exceeds weekly capacity, intervene and propose cuts — don't just warn
- Análisis de patrones: Detect postponement causes and propose concrete corrective action
- Socio estratégico: Direct, analytical, motivational tone — never servile

Communication style:
- Tone: ${toneInstructions[tone]}
- Insistence: ${insistenceInstructions[insistence]}
- Brevity: ${brevityInstructions[brevity]}

Core Rules (Fase 10.2):
1. Always call get_context_snapshot first to understand current state and load
2. If overload detected: recommend CUTS before adding more tasks
3. When dividing projects: use actionable sub-tasks with clear verbs
4. Every response ends with "Tip de Oro" (brief, contextual coaching insight)
5. Never invent data — always justify with user signals
6. Protect high-energy windows: if low-value task invades them, suggest alternative time
7. If user asks to create something in "inbox/bandeja de entrada", use create_inbox_item (not create_task)
8. If user references a task/project by name, resolve by title and ask for clarification if ambiguous
9. For updates: use taskId/projectId to identify the target, use taskTitle/projectTitle only for lookup, and use title for the new name
10. If user mentions an area (e.g., salud, familia), set areaId/category accordingly; do not block on work/personal
11. When user wants to learn something new or start a course, use create_learning_structure tool. Ask for: skill name, period, number of modules (if course), and module names if known. Available templates: aprender:curso (structured course with modules), aprender:skill (self-directed learning)
12. Use compound tools (Fase 10.4) to reduce friction:
   - smart_process_inbox: when user wants to process inbox AND link to objective AND schedule in one step
   - plan_and_schedule_week: when user asks to plan their week (use Decision Engine v2 ranking)
   - batch_reprioritize: when overload detected and user wants one-click redistribution
   - breakdown_milestone: when user finds a milestone too large and wants to split it into subtasks

When suggesting mutations:
- Explain impact (hours used, capacity remaining, deadlines affected)
- Mention risks (overload warnings, conflicts, energy mismatch)
- Provide reasoning (why these tasks, why this order, why NOT others)
- Include "Tip de Oro" at the end

Response structure (when coaching):
1. Estado actual (1 sentence snapshot)
2. Recomendación (specific action)
3. Por qué (data-based reason)
4. Siguiente paso (single clear action)
5. Tip de Oro (brief insight)

Response language: Spanish (always)
Identity: When asked your name, respond: "Soy Jarvis-Elite, tu coach de productividad de alto rendimiento."`;
}

// ─── Tool Execution (Read-only) ───────────────────────────────

/**
 * Execute a read-only tool called by Claude.
 * Returns data for LLM to reason about.
 */
export async function executeReadTool(toolName, toolInput, deps) {
    const { readJson, getDbManager, readCalendarBlocks } = deps;

    try {
        const loadAreas = async (status = 'active') => {
            const profileData = await readJson('profile.json').catch(() => ({}));
            const profileAreas = Object.entries(profileData.life_areas || {}).map(([id, area]) => ({
                id,
                ...area,
                status: area.status || 'active',
                source: 'profile',
            }));

            let dbAreas = [];
            try {
                const db = getDbManager();
                if (db && typeof db.query === 'function') {
                    const hasAreasTable = db.queryOne(
                        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'areas'"
                    );
                    if (hasAreasTable) {
                        dbAreas = db.query('SELECT * FROM areas', []).map((row) => ({
                            id: row.id || row.area_id || row.slug,
                            name: row.name,
                            description: row.description || '',
                            priority: row.priority || 'medium',
                            status: row.status || 'active',
                            color: row.color,
                            icon: row.icon,
                            source: 'db',
                        }));
                    }
                }
            } catch (_error) {
                dbAreas = [];
            }

            const merged = new Map();
            for (const area of dbAreas) {
                if (area?.id) merged.set(area.id, area);
            }
            for (const area of profileAreas) {
                if (area?.id) merged.set(area.id, { ...(merged.get(area.id) || {}), ...area });
            }

            let areas = Array.from(merged.values());
            if (status !== 'all') {
                areas = areas.filter((area) => (area.status || 'active') === status);
            }
            return areas;
        };

        switch (toolName) {
            case 'get_context_snapshot': {
                const include = toolInput.include || ['inbox', 'today', 'week', 'someday', 'projects', 'calendar', 'objectives', 'capacity', 'areas', 'stats'];
                const data = await readJson('tasks-data.json');
                const db = getDbManager();
                const snapshot = {};

                if (include.includes('inbox')) {
                    snapshot.inbox = {
                        work: data.inbox?.work || [],
                        personal: data.inbox?.personal || [],
                        total: (data.inbox?.work?.length || 0) + (data.inbox?.personal?.length || 0),
                    };
                }

                if (include.includes('today')) {
                    const today = new Date().toISOString().split('T')[0];
                    snapshot.today = (data.tasks || []).filter(t =>
                        t.status === 'active' && (t.dueDate === today || (!t.dueDate && !t.thisWeek))
                    );
                }

                if (include.includes('week')) {
                    snapshot.week = (data.tasks || []).filter(t => t.thisWeek && t.status === 'active');
                }

                if (include.includes('someday')) {
                    snapshot.someday = (data.tasks || []).filter(t => t.status === 'active' && !t.thisWeek).slice(0, 20);
                }

                if (include.includes('projects')) {
                    snapshot.projects = (data.tasks || []).filter(t => t.type === 'project' && t.status === 'active');
                }

                if (include.includes('calendar')) {
                    const today = new Date().toISOString().split('T')[0];
                    snapshot.calendar = await readCalendarBlocks({ date: today });
                }

                if (include.includes('objectives')) {
                    const objectives = db.query('SELECT * FROM objectives WHERE status != ?', ['done']);
                    snapshot.objectives = objectives;
                }

                if (include.includes('capacity')) {
                    const capacityConfig = buildCapacityConfig(data.config || {});
                    const capacity = calculateWeeklyCapacity(capacityConfig);
                    const load = calculateWeeklyLoad(data.tasks || []);
                    snapshot.capacity = {
                        total: capacity.total,
                        usable: capacity.usable,
                        buffer: capacity.buffer,
                        currentLoad: load,
                        remaining: capacity.usable - load,
                        utilizationPct: capacity.usable > 0 ? Math.round((load / capacity.usable) * 100) : 0,
                    };
                }

                if (include.includes('areas')) {
                    snapshot.areas = await loadAreas('active');
                }

                if (include.includes('stats')) {
                    snapshot.stats = data.stats || {};
                }

                return snapshot;
            }

            case 'list_areas': {
                const { status = 'active', limit = 50 } = toolInput;
                const areas = await loadAreas(status);
                return areas.slice(0, limit);
            }

            case 'list_inbox': {
                const data = await readJson('tasks-data.json');
                const { type = 'all', limit = 20, areaId } = toolInput;
                let items = [];
                if (type === 'work' || type === 'all') items = items.concat(data.inbox?.work || []);
                if (type === 'personal' || type === 'all') items = items.concat(data.inbox?.personal || []);
                if (areaId) {
                    items = items.filter(item => item.category === areaId || item.areaId === areaId);
                }
                return items.slice(0, limit);
            }

            case 'list_today': {
                const data = await readJson('tasks-data.json');
                const today = new Date().toISOString().split('T')[0];
                let tasks = (data.tasks || []).filter(t =>
                    t.status === 'active' && (t.dueDate === today || (!t.dueDate && !t.thisWeek))
                );
                if (toolInput.areaId) {
                    tasks = tasks.filter(t => t.category === toolInput.areaId || t.areaId === toolInput.areaId);
                }
                return tasks;
            }

            case 'list_week': {
                const data = await readJson('tasks-data.json');
                let tasks = (data.tasks || []).filter(t => t.thisWeek && t.status === 'active');
                if (toolInput.areaId) {
                    tasks = tasks.filter(t => t.category === toolInput.areaId || t.areaId === toolInput.areaId);
                }
                return tasks;
            }

            case 'list_someday': {
                const data = await readJson('tasks-data.json');
                const { limit = 20 } = toolInput;
                let tasks = (data.tasks || []).filter(t => t.status === 'active' && !t.thisWeek);
                if (toolInput.areaId) {
                    tasks = tasks.filter(t => t.category === toolInput.areaId || t.areaId === toolInput.areaId);
                }
                return tasks.slice(0, limit);
            }

            case 'list_projects': {
                const data = await readJson('tasks-data.json');
                let projects = (data.tasks || []).filter(t => t.type === 'project');
                if (toolInput.status) {
                    projects = projects.filter(p => p.status === toolInput.status);
                }
                if (toolInput.areaId) {
                    projects = projects.filter(p => p.category === toolInput.areaId || p.areaId === toolInput.areaId);
                }
                return projects;
            }

            case 'get_project': {
                const data = await readJson('tasks-data.json');
                const project = (data.tasks || []).find(t => t.id === toolInput.projectId);
                return project || { error: 'Project not found' };
            }

            case 'list_calendar_blocks': {
                return await readCalendarBlocks({ date: toolInput.date });
            }

            case 'get_calendar_day': {
                const blocks = await readCalendarBlocks({ date: toolInput.date });
                const data = await readJson('tasks-data.json');
                const available = (data.tasks || []).filter(t => t.thisWeek && t.status === 'active');
                return { date: toolInput.date, blocks, availableTasks: available };
            }

            case 'list_objectives': {
                const db = getDbManager();
                let query = 'SELECT * FROM objectives WHERE 1=1';
                const params = [];
                if (toolInput.status) {
                    query += ' AND status = ?';
                    params.push(toolInput.status);
                }
                if (toolInput.period) {
                    query += ' AND period = ?';
                    params.push(toolInput.period);
                }
                if (toolInput.areaId) {
                    query += ' AND area_id = ?';
                    params.push(toolInput.areaId);
                }
                return db.query(query, params);
            }

            case 'get_kr_risk_signals': {
                const db = getDbManager();
                const riskSignals = fetchRiskSignals(db);
                return riskSignals;
            }

            case 'get_capacity_status': {
                const data = await readJson('tasks-data.json');
                const capacityConfig = buildCapacityConfig(data.config || {});
                const capacity = calculateWeeklyCapacity(capacityConfig);
                const load = calculateWeeklyLoad(data.tasks || []);
                return {
                    total: capacity.total,
                    usable: capacity.usable,
                    buffer: capacity.buffer,
                    currentLoad: load,
                    remaining: capacity.usable - load,
                    utilizationPct: capacity.usable > 0 ? Math.round((load / capacity.usable) * 100) : 0,
                    formatted: {
                        total: formatMinutes(capacity.total),
                        usable: formatMinutes(capacity.usable),
                        currentLoad: formatMinutes(load),
                        remaining: formatMinutes(capacity.usable - load),
                    },
                };
            }

            case 'get_profile': {
                const data = await readJson('tasks-data.json');
                const db = getDbManager();
                const memory = db.query('SELECT * FROM coach_memory ORDER BY updated_at DESC LIMIT 20');
                const profileData = await readJson('profile.json').catch(() => ({}));
                const lifeAreas = Object.entries(profileData.life_areas || {}).map(([id, area]) => ({
                    id,
                    ...area,
                    status: area.status || 'active',
                }));
                return {
                    config: data.config || {},
                    coachStyle: data.coachStyle || {},
                    lifeAreas,
                    memory: memory.map(m => ({ key: m.key, value: m.value, confidence: m.confidence })),
                };
            }

            default:
                return { error: `Unknown tool: ${toolName}` };
        }
    } catch (error) {
        logger.error(`LLM tool execution failed: ${toolName}`, { error: error.message });
        return { error: error.message };
    }
}

// ─── LLM Orchestration ────────────────────────────────────────

/**
 * Process a user message with LLM agent.
 * Returns either:
 * - Text response (no action needed)
 * - Mutation preview (requires confirmation)
 */
export async function processWithLLM(userMessage, context, deps) {
    if (!isLLMAgentEnabled()) {
        throw new Error('LLM agent is disabled. Set OPENAI_API_KEY and FF_COACH_LLM_AGENT_ENABLED=true');
    }

    const { sessionId, mode = 'suggest', memory = [] } = context;
    const { readJson } = deps;

    try {
        // Fast-path: coach identity query
        const identityIntent = parseIdentityIntent(userMessage);
        if (identityIntent) {
            const data = await readJson('tasks-data.json');
            const coachName = data?.coachProfile?.name || data?.coachName || 'Coach Momentum';
            return {
                type: 'text',
                response: `Soy ${coachName}, tu coach de productividad. Puedo ayudarte a planear tu semana, ajustar sobrecarga y mantener foco en tus objetivos.`,
                tool: null,
                preview: null,
                requiresConfirmation: false,
            };
        }

        // Fast-path: deterministic life areas query (avoid LLM hallucinations)
        const areasIntent = parseAreasIntent(userMessage);
        if (areasIntent) {
            const allAreas = await executeReadTool('list_areas', { status: 'all', limit: 100 }, deps);
            const areas = Array.isArray(allAreas) ? allAreas : [];
            const activeAreas = areas.filter((a) => (a?.status || 'active') === 'active');
            const archivedAreas = areas.filter((a) => (a?.status || 'active') === 'archived');

            if (activeAreas.length === 0) {
                return {
                    type: 'text',
                    response: 'No tienes areas activas configuradas en este momento. Tip de Oro: Define primero 3-5 areas clave para planificar mejor.',
                    tool: null,
                    preview: null,
                    requiresConfirmation: false,
                };
            }

            const names = activeAreas
                .map((a) => a.name || a.id)
                .filter(Boolean)
                .join(', ');

            const archivedLine = archivedAreas.length > 0
                ? ` Tambien tienes ${archivedAreas.length} area(s) archivada(s).`
                : '';

            return {
                type: 'text',
                response: `Tienes ${activeAreas.length} area(s) activa(s): ${names}.${archivedLine} Tip de Oro: Revisa cada semana si tus tareas estan alineadas con estas areas.`,
                tool: null,
                preview: null,
                requiresConfirmation: false,
            };
        }

        // Fast-path: strategic framing for YouTube planning (coach guidance, not CRUD)
        const youtubeStrategicIntent = parseYouTubeStrategicIntent(userMessage);
        if (youtubeStrategicIntent) {
            // Ground advice with current app state (read-only).
            const snapshot = await executeReadTool('get_context_snapshot', {
                include: ['areas', 'objectives', 'projects', 'week', 'today', 'someday'],
            }, deps);

            const areas = Array.isArray(snapshot?.areas) ? snapshot.areas : [];
            const projects = Array.isArray(snapshot?.projects) ? snapshot.projects : [];
            const objectives = Array.isArray(snapshot?.objectives) ? snapshot.objectives : [];
            const week = Array.isArray(snapshot?.week) ? snapshot.week : [];
            const today = Array.isArray(snapshot?.today) ? snapshot.today : [];
            const someday = Array.isArray(snapshot?.someday) ? snapshot.someday : [];

            // Prefer "contenido" area id if present.
            const contenidoArea = areas.find((a) =>
                String(a?.id || '').toLowerCase() === 'contenido' ||
                String(a?.name || '').toLowerCase().includes('contenido') ||
                String(a?.name || '').toLowerCase().includes('youtube')
            );
            const areaId = contenidoArea?.id || null;
            const areaLabel = contenidoArea?.name || areaId;

            const filterByArea = (items) => areaId
                ? items.filter((t) => (t.areaId || t.category) === areaId)
                : items;

            const projectsInArea = filterByArea(projects).slice(0, 5);
            const weekInArea = filterByArea(week).slice(0, 5);
            const todayInArea = filterByArea(today).slice(0, 5);
            const somedayInArea = filterByArea(someday).slice(0, 5);
            const objectivesInArea = areaId
                ? objectives.filter((o) => (o.area_id || o.areaId) === areaId).slice(0, 5)
                : objectives.slice(0, 5);

            const lines = [];
            lines.push('Si quieres posicionar tu canal, asi se modela en esta app:');
            lines.push('- Objetivo: resultado estrategico (que quieres lograr en el periodo).');
            lines.push('- Key Results (KR): metricas que prueban progreso (numericas, con meta).');
            lines.push('- Proyectos: iniciativas (series/formatos/sprints) para mover los KRs.');
            lines.push('- Tareas: acciones concretas (lo que haces hoy/esta semana).');

            if (areaId) {
                lines.push('');
                lines.push(`Estado actual en area "${areaLabel}":`);
                lines.push(`- Objetivos activos visibles: ${objectivesInArea.length}`);
                lines.push(`- Proyectos activos: ${projectsInArea.length}`);
                lines.push(`- Tareas hoy: ${todayInArea.length}`);
                lines.push(`- Tareas esta semana: ${weekInArea.length}`);
                lines.push(`- Backlog (algun dia): ${somedayInArea.length}`);
            }

            if (projectsInArea.length > 0) {
                lines.push('');
                lines.push('Proyectos (ejemplos):');
                for (const p of projectsInArea) lines.push(`- ${p.title}`);
            }
            if (weekInArea.length > 0) {
                lines.push('');
                lines.push('Tareas (ejemplos esta semana):');
                for (const t of weekInArea) lines.push(`- ${t.title}`);
            }

            lines.push('');
            lines.push('Propuesta rapida (si arrancas desde cero):');
            lines.push('- Objetivo (2026-H1): "Posicionar el canal en un nicho claro y publicar consistentemente".');
            lines.push('- KR1: "Publicar 24 videos en 6 meses" (0 -> 24).');
            lines.push('- KR2: "Alcanzar 5k suscriptores" (actual -> 5000).');
            lines.push('- KR3: "Promedio 35% retencion en videos" (actual -> 35%).');
            lines.push('Siguiente paso: dime tu nicho (Google Ads, productividad, etc.) y tu periodo, y te lo convierto en 1 objetivo + 3 KRs + 2 proyectos.');
            lines.push('Tip de Oro: define 1 KR de output (publicacion) y 1 de resultado (suscriptores/retencion).');

            return {
                type: 'text',
                response: lines.join('\n'),
                tool: null,
                preview: null,
                requiresConfirmation: false,
            };
        }

        // Learning intent detection (logging only — LLM handles via create_learning_structure tool)
        const learningTemplateId = detectLearningIntent(userMessage);
        if (learningTemplateId) {
            logger.info('Learning intent detected', { templateId: learningTemplateId });
        }

        // Fast-path: deterministic rename intent (avoid LLM ambiguity)
        const renameIntent = parseRenameIntent(userMessage);
        if (renameIntent) {
            const { toolName, targetTitle, newTitle } = renameIntent;
            const result = await buildMutationPreview(toolName, {
                [toolName === 'update_project' ? 'projectTitle' : 'taskTitle']: targetTitle,
                title: newTitle,
            }, deps);
            const preview = result.preview;
            if (preview?.noAction) {
                return {
                    type: 'text',
                    response: preview.summary || 'No hay accion para ejecutar.',
                    tool: toolName,
                    preview: null,
                    requiresConfirmation: false,
                };
            }
            const guardrailCheck = await validateWithGuardrails(toolName, preview, deps);
            if (!guardrailCheck.valid) {
                return {
                    type: 'blocked',
                    response: guardrailCheck.reason,
                    tool: toolName,
                    preview: null,
                    requiresConfirmation: false,
                };
            }
            return {
                type: 'mutation',
                response: `Renombrar \"${targetTitle}\" a \"${newTitle}\"`,
                tool: toolName,
                preview: {
                    ...preview,
                    llmReasoning: 'Renombrado solicitado por el usuario.',
                },
                requiresConfirmation: true,
            };
        }

        // Fast-path: deterministic move intent (today/this week/someday)
        const moveIntent = parseMoveIntent(userMessage);
        if (moveIntent) {
            const toolName = moveIntent.entity === 'project' ? 'update_project' : 'update_task';
            const result = await buildMutationPreview(toolName, {
                [toolName === 'update_project' ? 'projectTitle' : 'taskTitle']: moveIntent.title,
                targetList: moveIntent.targetList,
                status: moveIntent.status,
            }, deps);
            const preview = result.preview;
            if (preview?.noAction) {
                return {
                    type: 'text',
                    response: preview.summary || 'No hay accion para ejecutar.',
                    tool: toolName,
                    preview: null,
                    requiresConfirmation: false,
                };
            }
            const guardrailCheck = await validateWithGuardrails(toolName, preview, deps);
            if (!guardrailCheck.valid) {
                return {
                    type: 'blocked',
                    response: guardrailCheck.reason,
                    tool: toolName,
                    preview: null,
                    requiresConfirmation: false,
                };
            }
            return {
                type: 'mutation',
                response: moveIntent.status
                    ? `Actualizar "${moveIntent.title}" → status ${moveIntent.status}`
                    : `Mover "${moveIntent.title}" a ${moveIntent.targetList}`,
                tool: toolName,
                preview: {
                    ...preview,
                    llmReasoning: 'Movimiento solicitado por el usuario.',
                },
                requiresConfirmation: true,
            };
        }

        const client = getOpenAIClient();
        const data = await readJson('tasks-data.json');
        const coachStyle = data.coachStyle || {};

        // Build messages
        const messages = [];

        // Add memory context as system-like user message
        if (memory.length > 0) {
            const memoryText = memory.map(m => `${m.key}: ${m.value}`).join('\n');
            messages.push({
                role: 'system',
                content: `Context from previous sessions:\n${memoryText}`,
            });
        }

        // User message
        messages.push({
            role: 'user',
            content: userMessage,
        });

        // Call OpenAI with function calling
        const response = await client.chat.completions.create({
            model: MODEL,
            max_tokens: MAX_TOKENS,
            messages: [
                { role: 'system', content: buildSystemPrompt(coachStyle) },
                ...messages,
            ],
            tools: [...LLM_TOOLS, ...LLM_MUTATION_TOOLS],
            tool_choice: 'auto',
        });

        logger.info('LLM response received', {
            sessionId,
            finishReason: response.choices[0].finish_reason,
            usage: response.usage,
        });

        const choice = response.choices[0];
        const message = choice.message;

        // Extract text content
        const textContent = message.content || '';

        // Extract tool calls
        const toolCalls = message.tool_calls || [];

        // If no tool calls, return text response
        if (toolCalls.length === 0) {
            return {
                type: 'text',
                response: textContent,
                tool: null,
                preview: null,
                requiresConfirmation: false,
            };
        }

        // Execute tool(s)
        const toolResults = [];
        for (const toolCall of toolCalls) {
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);

            // Check if mutation tool
            const isMutation = LLM_MUTATION_TOOLS.some(t => t.function.name === functionName);

            if (isMutation) {
                // Mutation tool — delegate to Phase 9 tools for preview
                const { planWeekPreview, scheduleBlockPreview, reprioritizePreview, goalReviewPreview } = await import('./coach-chat-tools.js');
                let preview = null;

                switch (functionName) {
                    case 'plan_week':
                        preview = await planWeekPreview(deps);
                        break;
                    case 'schedule_block':
                        preview = await scheduleBlockPreview(userMessage, deps);
                        break;
                    case 'reprioritize':
                        preview = await reprioritizePreview(deps);
                        break;
                    case 'goal_review':
                        preview = await goalReviewPreview(deps);
                        break;
                    default: {
                        const result = await buildMutationPreview(functionName, functionArgs, deps);
                        preview = result.preview;
                        if (preview?.noAction) {
                            return {
                                type: 'text',
                                response: preview.summary || 'No hay accion para ejecutar.',
                                tool: functionName,
                                preview: null,
                                requiresConfirmation: false,
                            };
                        }
                        break;
                    }
                }

                if (preview) {
                    // Validate with Phase 8 guardrails
                    const guardrailCheck = await validateWithGuardrails(functionName, preview, deps);
                    if (!guardrailCheck.valid) {
                        return {
                            type: 'blocked',
                            response: guardrailCheck.reason,
                            tool: functionName,
                            preview: null,
                            requiresConfirmation: false,
                        };
                    }

                    // Return preview with LLM explanation
                    return {
                        type: 'mutation',
                        response: textContent || preview.summary,
                        tool: functionName,
                        preview: {
                            ...preview,
                            llmReasoning: textContent,
                        },
                        requiresConfirmation: !preview.noAction,
                    };
                }
            } else {
                // Read-only tool — execute and continue conversation
                const result = await executeReadTool(functionName, functionArgs, deps);
                toolResults.push({
                    tool_call_id: toolCall.id,
                    role: 'tool',
                    name: functionName,
                    content: JSON.stringify(result, null, 2),
                });
            }
        }

        // If we executed read tools, continue conversation with OpenAI
        if (toolResults.length > 0) {
            // Add assistant message with tool calls
            messages.push({
                role: 'assistant',
                content: textContent,
                tool_calls: toolCalls,
            });

            // Add tool results
            messages.push(...toolResults);

            const followUp = await client.chat.completions.create({
                model: MODEL,
                max_tokens: MAX_TOKENS,
                messages: [
                    { role: 'system', content: buildSystemPrompt(coachStyle) },
                    ...messages,
                ],
                tools: [...LLM_TOOLS, ...LLM_MUTATION_TOOLS],
                tool_choice: 'auto',
            });

            const followUpChoice = followUp.choices[0];
            const followUpMessage = followUpChoice.message;
            const followUpText = followUpMessage.content || '';
            const followUpToolCalls = followUpMessage.tool_calls || [];

            // If follow-up tries to use mutation tool, recurse
            if (followUpToolCalls.length > 0 && followUpToolCalls.some(tc => LLM_MUTATION_TOOLS.some(m => m.function.name === tc.function.name))) {
                // Recurse with accumulated context
                return processWithLLM(userMessage, { ...context, memory }, deps);
            }

            return {
                type: 'text',
                response: followUpText,
                tool: null,
                preview: null,
                requiresConfirmation: false,
            };
        }

        // Fallback text
        return {
            type: 'text',
            response: textContent || 'Entendido.',
            tool: null,
            preview: null,
            requiresConfirmation: false,
        };
    } catch (error) {
        logger.error('LLM processing failed', { error: error.message, sessionId });
        throw error;
    }
}

function parseRenameIntent(message) {
    if (!message) return null;
    const raw = String(message).trim();
    const lower = raw.toLowerCase();

    if (!lower.includes('cambia') && !lower.includes('cambiar') && !lower.includes('renombra') && !lower.includes('renombrar')) {
        return null;
    }

    const isProject = lower.includes('proyecto');
    const toolName = isProject ? 'update_project' : 'update_task';

    const quoted = raw.match(/(?:cambia|cambiar|renombra|renombrar)[^"]*"(.*?)"[^"]*(?:a|por)[^"]*"(.*?)"/i);
    if (quoted && quoted[1] && quoted[2]) {
        return { toolName, targetTitle: quoted[1].trim(), newTitle: quoted[2].trim() };
    }

    const simple = raw.match(/(?:cambia|cambiar|renombra|renombrar)[^a-zA-Z0-9]*(?:el nombre (?:del|de la) )?(?:proyecto|tarea)?\s*(.+?)\s*(?:a|por)\s*(.+)$/i);
    if (simple && simple[1] && simple[2]) {
        return { toolName, targetTitle: simple[1].trim(), newTitle: simple[2].trim() };
    }

    return null;
}

function parseIdentityIntent(message) {
    if (!message) return false;
    const lower = String(message).toLowerCase();
    if (lower.includes('tu nombre')) return true;
    if (lower.includes('tienes nombre')) return true;
    if (lower.includes('como te llamas')) return true;
    if (lower.includes('cómo te llamas')) return true;
    return false;
}

function parseAreasIntent(message) {
    if (!message) return false;
    const lower = String(message)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // strip accents

    // IMPORTANT: avoid matching "tareas" -> contains "areas"
    const mentionsAreas = /\barea\b/.test(lower) || /\bareas\b/.test(lower) || /\barea de vida\b/.test(lower) || /\bareas de vida\b/.test(lower);
    const asksCountOrList =
        lower.includes('cuantas') ||
        lower.includes('cuantos') ||
        lower.includes('cuales') ||
        lower.includes('cuales son') ||
        lower.includes('que areas') ||
        lower.includes('lista');
    const explicitLifeAreas = lower.includes('areas de vida') || lower.includes('area de vida');
    return mentionsAreas && (asksCountOrList || explicitLifeAreas);
}

function parseYouTubeStrategicIntent(message) {
    if (!message) return false;
    const lower = String(message)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    const mentionsYoutube = lower.includes('youtube') || lower.includes('canal');
    const asksModel =
        (lower.includes('cual') && lower.includes('objetivo')) ||
        (lower.includes('cuales') && (lower.includes('proyecto') || lower.includes('proyectos'))) ||
        (lower.includes('cuales') && lower.includes('key result')) ||
        (lower.includes('cuales') && lower.includes('kr')) ||
        (lower.includes('cuales') && lower.includes('tareas'));

    return mentionsYoutube && asksModel;
}

function parseMoveIntent(message) {
    if (!message) return null;
    const raw = String(message).trim();
    const lower = raw.toLowerCase();

    if (!lower.includes('mueve') && !lower.includes('mover') && !lower.includes('muévela') && !lower.includes('muevela')) {
        return null;
    }

    const entity = lower.includes('proyecto') ? 'project' : 'task';
    let targetList = null;
    // Prefer explicit move target after "a/para"
    const targetMatch = lower.match(/\b(?:a|para)\s+(hoy|esta semana|someday|algun dia|algún dia)\b/);
    if (targetMatch) {
        const token = targetMatch[1];
        if (token === 'hoy') targetList = 'today';
        else if (token === 'esta semana') targetList = 'week';
        else targetList = 'someday';
    } else {
        if (lower.includes('hoy')) targetList = 'today';
        if (lower.includes('esta semana') || lower.includes('semana')) targetList = 'week';
        if (lower.includes('someday') || lower.includes('algún dia') || lower.includes('algun dia')) targetList = 'someday';
    }
    const archiveRequested = lower.includes('archiva') || lower.includes('archivar') || lower.includes('archivado');

    if (!targetList && !archiveRequested) return null;

    const quoted = raw.match(/\"(.*?)\"/);
    if (quoted && quoted[1]) {
        return { title: quoted[1].trim(), targetList, status: archiveRequested ? 'archived' : null, entity };
    }

    const simple = raw.match(/tarea\s+(.+?)\s+(?:a|para)\s+(hoy|esta semana|someday|algun dia|algún dia)/i);
    if (simple && simple[1]) {
        return { title: simple[1].trim(), targetList, status: archiveRequested ? 'archived' : null, entity };
    }

    return null;
}

// ─── Guardrails Validation ────────────────────────────────────

/**
 * Validate a mutation preview against Phase 8 rules.
 * Returns { valid: boolean, reason: string }
 */
async function validateWithGuardrails(toolName, preview, deps) {
    const { readJson, getDbManager } = deps;

    try {
        // Run Phase 8 rules engine
        const data = await readJson('tasks-data.json');
        const db = getDbManager();
        const capacityConfig = buildCapacityConfig(data.config || {});
        const riskSignals = fetchRiskSignals(db);

        const recommendations = generateRecommendations({
            tasks: data.tasks || [],
            inbox: data.inbox || { work: [], personal: [] },
            config: capacityConfig,
            riskSignals,
        });

        // Check for blocking rules
        const blockingRules = recommendations.filter(r =>
            r.severity === 'high' && (r.ruleId === RULE_IDS.OVERLOAD_DETECTED)
        );

        if (blockingRules.length > 0 && toolName === 'plan_week') {
            return {
                valid: false,
                reason: `⚠️ No puedo planificar tu semana porque ya estas sobrecargado. ${blockingRules[0].description} Primero ejecuta "reprioriza" para liberar capacidad.`,
            };
        }

        // Check capacity impact
        if (preview.impact?.minutesUsed && preview.impact?.capacityTotal) {
            const utilization = (preview.impact.minutesUsed / preview.impact.capacityTotal) * 100;
            if (utilization > 100) {
                return {
                    valid: false,
                    reason: `⚠️ Esta acción excedería tu capacidad (${Math.round(utilization)}% de uso). Reduce compromisos primero.`,
                };
            }
        }

        // All checks passed
        return { valid: true };
    } catch (error) {
        logger.error('Guardrail validation failed', { error: error.message });
        // Fail open with warning
        return {
            valid: true,
            warning: 'No se pudieron validar guardrails — procede con precaución',
        };
    }
}

// ─── Memory Management ────────────────────────────────────────

/**
 * Store a memory item.
 */
export function storeMemory(db, key, value, confidence = 0.8) {
    const existing = db.queryOne('SELECT * FROM coach_memory WHERE key = ?', [key]);
    if (existing) {
        db.exec(
            'UPDATE coach_memory SET value = ?, confidence = ?, updated_at = ? WHERE key = ?',
            [value, confidence, new Date().toISOString(), key]
        );
    } else {
        db.exec(
            'INSERT INTO coach_memory (id, key, value, confidence, updated_at) VALUES (?, ?, ?, ?, ?)',
            [`mem-${Date.now()}`, key, value, confidence, new Date().toISOString()]
        );
    }
}

/**
 * Load recent memory for session context.
 */
export function loadMemory(db, limit = 10) {
    return db.query(
        'SELECT * FROM coach_memory WHERE confidence >= 0.5 ORDER BY updated_at DESC LIMIT ?',
        [limit]
    );
}

// ─── Proactivity Engine ───────────────────────────────────────

/**
 * Check if we should trigger a proactive message.
 * Returns { shouldTrigger: boolean, type: string, reason: string }
 */
export function shouldTriggerProactive(db) {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay(); // 0=Sun, 3=Wed, 5=Fri

    // Check each window
    for (const [type, window] of Object.entries(PROACTIVE_WINDOWS)) {
        if (hour < window.start || hour >= window.end) continue;

        // Check if already triggered today/week
        const since = window.frequency === 'daily'
            ? new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
            : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const recent = db.queryOne(
            `SELECT * FROM coach_events WHERE rule_id = ? AND created_at > ? ORDER BY created_at DESC LIMIT 1`,
            [`proactive:${type}`, since]
        );

        if (recent) continue; // Already triggered

        // Check day of week for weekly events
        if (window.dayOfWeek !== undefined && day !== window.dayOfWeek) continue;

        return {
            shouldTrigger: true,
            type,
            reason: `Proactive ${type} window active (${window.start}-${window.end}h)`,
        };
    }

    return { shouldTrigger: false };
}

/**
 * Generate a proactive message.
 */
export async function generateProactiveMessage(type, deps) {
    const { readJson, getDbManager } = deps;

    const messages = {
        morning_brief: async () => {
            const data = await readJson('tasks-data.json');
            const today = new Date().toISOString().split('T')[0];
            const todayTasks = (data.tasks || []).filter(t =>
                t.status === 'active' && (t.dueDate === today || (!t.dueDate && !t.thisWeek))
            );
            const weekTasks = (data.tasks || []).filter(t => t.thisWeek && t.status === 'active');

            return `☀️ **Buenos días!**\n\nHoy tienes **${todayTasks.length} tareas** programadas.\nEsta semana: **${weekTasks.length} tareas** activas.\n\n¿Necesitas que ajuste algo?`;
        },
        midweek_check: async () => {
            const data = await readJson('tasks-data.json');
            const weekTasks = (data.tasks || []).filter(t => t.thisWeek && t.status === 'active');
            const done = (data.tasks || []).filter(t => t.thisWeek && t.status === 'done');
            const rate = weekTasks.length > 0 ? Math.round((done.length / weekTasks.length) * 100) : 0;

            return `📊 **Chequeo de mitad de semana**\n\nProgreso: **${done.length}/${weekTasks.length}** tareas (${rate}%).\n\n${rate < 50 ? 'Vamos un poco atrasados. ¿Repriorizamos?' : 'Buen ritmo! Sigue así.'}`;
        },
        weekly_review: async () => {
            const data = await readJson('tasks-data.json');
            const db = getDbManager();
            const riskSignals = fetchRiskSignals(db);
            const weekTasks = (data.tasks || []).filter(t => t.thisWeek);
            const done = weekTasks.filter(t => t.status === 'done');

            return `📅 **Revisión semanal**\n\n✅ **${done.length}/${weekTasks.length}** tareas completadas.\n🎯 **${riskSignals.risks.length}** KR(s) en riesgo.\n\n¿Listo para planificar la próxima semana?`;
        },
    };

    return messages[type] ? await messages[type]() : null;
}


