import { z } from 'zod';

const preprocessNumber = (fallback: number | undefined) =>
  z.preprocess((val) => {
    if (val === '' || val === null || val === undefined || (typeof val === 'number' && Number.isNaN(val))) {
      return fallback;
    }
    const parsed = Number(val);
    return Number.isNaN(parsed) ? fallback : parsed;
  }, fallback !== undefined ? z.number().min(0).max(100).default(fallback) : z.number().min(0).optional());

import { PRODUCT_GROUPS, PDP_CATEGORIES } from '@/types/project.types';

export const projectFormSchema = z.object({
  project_name: z
    .string({ required_error: 'Project Name is required' })
    .min(1, 'Project Name is mandatory')
    .refine((val) => val.trim().length > 0, {
      message: 'Project Name cannot be empty or contain only whitespace',
    })
    .refine((val) => val.trim().length >= 3, {
      message: 'Project Name must be at least 3 characters long',
    })
    .refine((val) => val.trim().length <= 140, {
      message: 'Project Name cannot exceed 140 characters',
    }),
  custom_product_group: z
    .string({ required_error: 'Product Group is mandatory. Please select a Product Group.' })
    .min(1, 'Product Group is mandatory. Please select a Product Group.')
    .refine((val) => PRODUCT_GROUPS.includes(val as any), {
      message: 'Please select a valid Product Group from the controlled master list.',
    }),
  custom_pdp_category: z
    .enum(['A', 'D'], {
      errorMap: () => ({
        message: 'PDP Category is mandatory. Please select Category A or Category D.',
      }),
    }),
  status: z.enum(['Open', 'In Progress', 'Completed', 'Cancelled', 'On Hold'], {
    required_error: 'Please select a project status',
  }),
  priority: z.enum(['Low', 'Medium', 'High'], {
    required_error: 'Please select a priority level',
  }),
  project_type: z.string().optional(),
  custom_project_category: z.string().optional(),
  custom_product_line: z.string().optional(),
  percent_complete: preprocessNumber(undefined),
  expected_start_date: z.string().optional(),
  expected_end_date: z.string().optional(),
  estimated_cost: preprocessNumber(undefined),
  company: z.string().optional(),
  department: z.string().optional(),
  owner: z.string().optional(),
  custom_upload_document: z.string().optional(),
  notes: z.string().max(2000, 'Notes cannot exceed 2000 characters').optional(),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;
