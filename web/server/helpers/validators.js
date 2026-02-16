import { z } from 'zod';

/**
 * Schema Validators
 * Define validaciones con Zod para endpoints críticos
 */

// Task Schema
export const TaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  category: z.string().min(1, 'Category is required').default('trabajo'),
  areaId: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  dueDate: z.string().optional(),
  reminders: z.array(z.string()).optional(),
  objectiveId: z.string().nullable().optional(),
  keyResultId: z.string().nullable().optional(),
  notes: z.string().optional(),
  completed: z.boolean().optional(),
  type: z.enum(['simple', 'project']).optional(),
  thisWeek: z.boolean().optional(),
  description: z.string().optional(),
  strategy: z.string().optional(),
  parentId: z.string().optional(),
  sections: z.array(z.any()).optional(),
  milestones: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    timeEstimate: z.number().optional(),
    time_estimate: z.number().optional(), // Legacy support
    completed: z.boolean().optional(),
    sectionId: z.string().optional(),
  })).optional(),
  saveAsTemplate: z.boolean().optional(),
  templateName: z.string().optional(),
});

// Milestone Schema
export const MilestoneSchema = z.object({
  title: z.string().min(1, 'Milestone title is required').max(200),
  description: z.string().optional(),
  timeEstimate: z.number().int().min(1).max(480).optional(), // 1-480 minutes (8h)
  sectionId: z.string().nullable().optional(),
  category: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  dueDate: z.string().nullable().optional(),
});

// Project Schema
export const ProjectSchema = z.object({
  title: z.string().min(1, 'Project title is required').max(200),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required').default('trabajo'),
  areaId: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  status: z.enum(['backlog', 'active', 'completed', 'archived']).optional(),
  objectiveId: z.string().nullable().optional(),
  milestones: z.array(z.object({
    title: z.string(),
    description: z.string().optional(),
    timeEstimate: z.number().optional(),
    completed: z.boolean().optional(),
  })).optional(),
});

// Inbox Item Schema
export const InboxItemSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300),
  type: z.enum(['idea', 'note', 'task', 'link']).optional(),
  content: z.string().optional(),
  url: z.string().url().optional(),
});

// Chat Message Schema
export const ChatMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000),
});

// Life Area Schema
export const AreaSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres').max(50),
  description: z.string().max(200).transform(val => val || '').optional(),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  current_focus: z.string().max(100).transform(val => val || '').optional(),
  status: z.enum(['active', 'paused', 'archived']).default('active'),
  color: z.enum(['blue', 'purple', 'green', 'yellow', 'red', 'gray', 'cyan', 'orange']).optional(),
  icon: z.string().optional(),
});

// Objective Schema
export const ObjectiveSchema = z.object({
  title: z.string().min(3, 'Objective title is required').max(200),
  description: z.string().max(1000).optional(),
  period: z.string().min(4, 'Period is required').max(20),
  status: z.enum(['active', 'paused', 'done']).optional(),
  areaId: z.string().min(1).optional(),
});

// Key Result Schema
export const KeyResultSchema = z.object({
  objectiveId: z.string().min(1, 'objectiveId is required'),
  title: z.string().min(3, 'Key result title is required').max(200),
  metricType: z.enum(['number', 'percentage', 'currency', 'boolean']).optional(),
  startValue: z.number().finite().optional(),
  targetValue: z.number().finite(),
  currentValue: z.number().finite().optional(),
  unit: z.string().max(20).optional(),
  status: z.enum(['on_track', 'at_risk', 'off_track', 'done']).optional(),
});

// Coach Chat Schemas (Fase 9)
export const CoachChatMessageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000),
  sessionId: z.string().nullable().optional(),
  mode: z.enum(['suggest', 'act']).nullable().optional(),
});

export const CoachChatConfirmSchema = z.object({
  actionId: z.string().min(1, 'actionId is required'),
  confirm: z.boolean(),
  sessionId: z.string().min(1, 'sessionId is required'),
});

/**
 * Middleware para validar request body con schema
 * @param {z.ZodSchema} schema - Schema de Zod
 */
export function validate(schema) {
  return (req, res, next) => {
    try {
      req.validatedBody = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues || error.errors || [];
        return res.status(400).json({
          error: 'Validation Error',
          details: issues.map(err => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      next(error);
    }
  };
}

/**
 * Validación manual para uso fuera de middleware
 * @param {z.ZodSchema} schema
 * @param {any} data
 * @returns {Object} { success: boolean, data?: any, errors?: array }
 */
export function validateData(schema, data) {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues || error.errors || [];
      return {
        success: false,
        errors: issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      };
    }
    throw error;
  }
}
