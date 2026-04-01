import { z } from 'zod';

export const createRecordSchema = z.object({
  amount: z.number({ invalid_type_error: 'Amount must be a number' }).positive('Amount must be a positive number'),
  type: z.enum(['INCOME', 'EXPENSE'], { errorMap: () => ({ message: 'Type must be INCOME or EXPENSE' }) }),
  category: z.string().min(1, 'Category is required'),
  date: z.string().datetime({ message: 'Date must be a valid ISO 8601 datetime string' }),
  notes: z.string().optional(),
});

export const updateRecordSchema = z.object({
  amount: z.number({ invalid_type_error: 'Amount must be a number' }).positive('Amount must be a positive number').optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  category: z.string().min(1).optional(),
  date: z.string().datetime({ message: 'Date must be a valid ISO 8601 datetime string' }).optional(),
  notes: z.string().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export const recordFilterSchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  category: z.string().optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type CreateRecordInput = z.infer<typeof createRecordSchema>;
export type UpdateRecordInput = z.infer<typeof updateRecordSchema>;
export type RecordFilterInput = z.infer<typeof recordFilterSchema>;
