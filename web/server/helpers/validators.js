import { z } from 'zod';

/**
 * Schema Validators
 * Define validaciones con Zod para endpoints críticos
 */

// Task Schema
export const TaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  category: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  dueDate: z.string().optional(),
  reminders: z.array(z.string()).optional(),
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
  category: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high']).optional(),
  status: z.enum(['backlog', 'active', 'completed', 'archived']).optional(),
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
        return res.status(400).json({
          error: 'Validation Error',
          details: error.errors.map(err => ({
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
      return {
        success: false,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      };
    }
    throw error;
  }
}
