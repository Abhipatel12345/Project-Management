import { z } from 'zod';

const preprocessNumber = (fallback: number | undefined) =>
  z.preprocess((val) => {
    if (val === '' || val === null || val === undefined || (typeof val === 'number' && Number.isNaN(val))) {
      return fallback;
    }
    const parsed = Number(val);
    return Number.isNaN(parsed) ? fallback : parsed;
  }, fallback !== undefined ? z.number().min(0).max(100).default(fallback) : z.number().min(0).optional());

export const projectFormSchema = z.object({
  project_name: z
    .string()
    .min(3, 'Project name must be at least 3 characters long')
    .max(140, 'Project name cannot exceed 140 characters'),
  status: z.enum(['Open', 'In Progress', 'Completed', 'Cancelled', 'On Hold'], {
    required_error: 'Please select a project status',
  }),
  priority: z.enum(['Low', 'Medium', 'High'], {
    required_error: 'Please select a priority level',
  }),
  project_type: z.string().optional(),
  custom_project_category: z.string().optional(),
  custom_product_group: z.string().optional(),
  custom_product_line: z.string().optional(),
  percent_complete: preprocessNumber(0),
  expected_start_date: z.string().optional(),
  expected_end_date: z.string().optional(),
  estimated_cost: preprocessNumber(undefined),
  company: z.string().optional(),
  department: z.string().optional(),
  notes: z.string().max(2000, 'Notes cannot exceed 2000 characters').optional(),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
