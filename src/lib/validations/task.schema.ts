import { z } from 'zod';

const preprocessNumber = (fallback: number) =>
  z.preprocess((val) => {
    if (val === '' || val === null || val === undefined || (typeof val === 'number' && Number.isNaN(val))) {
      return fallback;
    }
    const parsed = Number(val);
    return Number.isNaN(parsed) ? fallback : parsed;
  }, z.number().min(0).max(100).default(fallback));

export const taskFormSchema = z.object({
  subject: z
    .string()
    .min(3, 'Task subject must be at least 3 characters long')
    .max(140, 'Task subject cannot exceed 140 characters'),
  project: z.string().min(1, 'Project selection is required'),
  status: z.enum(['Open', 'Working', 'Pending Review', 'Completed', 'Cancelled', 'Skipped'], {
    required_error: 'Please select a valid task status',
  }),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent'], {
    required_error: 'Please select a priority level',
  }),
  exp_start_date: z.string().optional(),
  exp_end_date: z.string().optional(),
  expected_time: z.preprocess((val) => {
    if (val === '' || val === null || val === undefined) return 0;
    const p = Number(val);
    return Number.isNaN(p) ? 0 : p;
  }, z.number().min(0).optional()),
  progress: preprocessNumber(0),
  description: z.string().optional(),
  assigned_to: z.string().optional(),
  assigned_employee_name: z.string().optional(),
  parent_task: z.string().optional(),
  depends_on: z.string().optional(),
  skip_reason: z.string().optional(),
  // RASIC abstraction fields
  rasic_responsible: z.string().optional(),
  rasic_accountable: z.string().optional(),
  rasic_support: z.string().optional(),
  rasic_consulted: z.string().optional(),
  rasic_informed: z.string().optional(),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;
