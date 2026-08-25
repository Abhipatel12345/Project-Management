export interface ConnectionFormField {
  name: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'number' | 'textarea' | 'item_select';
  required?: boolean;
  options?: string[];
  defaultValue?: any;
}

export interface ConnectionItemConfig {
  label: string;
  doctype: string;
  projectField: string;
  alternativeProjectField?: string;
  iconName?: string;
  fields?: ConnectionFormField[];
}

export interface ConnectionGroupConfig {
  group: 'Project' | 'Material' | 'Sales' | 'Purchase' | 'Manufacture' | string;
  description?: string;
  items: ConnectionItemConfig[];
}

export interface ConnectionCountResult {
  doctype: string;
  label: string;
  group: string;
  count: number | null;
  status: 'success' | 'loading' | 'error' | 'permission_denied' | 'not_found';
  errorMessage?: string;
}

export interface ConnectionRecordItem {
  name: string;
  subject?: string;
  title?: string;
  status?: string;
  priority?: string;
  posting_date?: string;
  transaction_date?: string;
  creation?: string;
  modified?: string;
  owner?: string;
  grand_total?: number;
  total_amount?: number;
  qty?: number;
  [key: string]: any;
}

export interface ConnectionRecordsResponse {
  doctype: string;
  records: ConnectionRecordItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export const PROJECT_CONNECTIONS: ConnectionGroupConfig[] = [
  {
    group: 'Project',
    description: 'Work breakdown, timesheets, issues & status updates',
    items: [
      {
        label: 'Task',
        doctype: 'Task',
        projectField: 'project',
        fields: [
          { name: 'subject', label: 'Task Subject', type: 'text', required: true },
          { name: 'status', label: 'Status', type: 'select', options: ['Open', 'Working', 'Pending Review', 'Completed', 'Cancelled'], defaultValue: 'Open' },
          { name: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High', 'Urgent'], defaultValue: 'Medium' },
          { name: 'exp_start_date', label: 'Start Date', type: 'date' },
          { name: 'exp_end_date', label: 'Due Date', type: 'date' },
          { name: 'expected_time', label: 'Expected Hours', type: 'number', defaultValue: 0 },
          { name: 'description', label: 'Description', type: 'textarea' },
        ],
      },
      {
        label: 'Timesheet',
        doctype: 'Timesheet',
        projectField: 'parent_project',
        alternativeProjectField: 'project',
        fields: [
          { name: 'title', label: 'Timesheet Title / Note', type: 'text', required: true },
          { name: 'status', label: 'Status', type: 'select', options: ['Draft', 'Submitted', 'Billed', 'Cancelled'], defaultValue: 'Draft' },
          { name: 'total_hours', label: 'Total Hours', type: 'number', defaultValue: 8 },
          { name: 'employee_name', label: 'Employee Name', type: 'text' },
          { name: 'note', label: 'Notes', type: 'textarea' },
        ],
      },
      {
        label: 'Issue',
        doctype: 'Issue',
        projectField: 'project',
        fields: [
          { name: 'subject', label: 'Issue Title / Subject', type: 'text', required: true },
          { name: 'status', label: 'Status', type: 'select', options: ['Open', 'Replied', 'On Hold', 'Resolved', 'Closed'], defaultValue: 'Open' },
          { name: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Medium', 'High', 'Urgent'], defaultValue: 'Medium' },
          { name: 'issue_type', label: 'Issue Type', type: 'select', options: ['Technical', 'Quality', 'Design', 'Supplier', 'Safety', 'Other'], defaultValue: 'Technical' },
          { name: 'description', label: 'Issue Description', type: 'textarea' },
        ],
      },
      {
        label: 'Project Update',
        doctype: 'Project Update',
        projectField: 'project',
        fields: [
          { name: 'naming_series', label: 'Naming Series', type: 'text', defaultValue: 'PU-' },
          { name: 'progress', label: 'Overall Progress %', type: 'number', defaultValue: 0 },
          { name: 'notes', label: 'Executive Summary & Update Notes', type: 'textarea', required: true },
        ],
      },
    ],
  },
  {
    group: 'Material',
    description: 'BOM structures, material requisitions & inventory movements',
    items: [
      {
        label: 'Material Request',
        doctype: 'Material Request',
        projectField: 'project',
        fields: [
          { name: 'material_request_type', label: 'Request Type', type: 'select', options: ['Purchase', 'Material Transfer', 'Material Issue', 'Manufacture'], defaultValue: 'Purchase' },
          { name: 'item_code', label: 'Item Code / Raw Material', type: 'item_select', required: true },
          { name: 'qty', label: 'Quantity Required', type: 'number', defaultValue: 1, required: true },
          { name: 'schedule_date', label: 'Required By Date', type: 'date' },
          { name: 'purpose', label: 'Purpose / Remarks', type: 'textarea' },
        ],
      },
      {
        label: 'BOM',
        doctype: 'BOM',
        projectField: 'project',
        fields: [
          { name: 'item', label: 'Finished Good / Assembly Item Code', type: 'item_select', required: true },
          { name: 'is_active', label: 'Is Active', type: 'select', options: ['1', '0'], defaultValue: '1' },
          { name: 'quantity', label: 'Quantity', type: 'number', defaultValue: 1 },
          { name: 'description', label: 'BOM Description', type: 'textarea' },
        ],
      },
      {
        label: 'Stock Entry',
        doctype: 'Stock Entry',
        projectField: 'project',
        fields: [
          { name: 'stock_entry_type', label: 'Entry Type', type: 'select', options: ['Material Issue', 'Material Receipt', 'Material Transfer', 'Manufacture'], defaultValue: 'Material Issue' },
          { name: 'posting_date', label: 'Posting Date', type: 'date' },
          { name: 'remarks', label: 'Remarks', type: 'textarea' },
        ],
      },
    ],
  },
  {
    group: 'Sales',
    description: 'Customer sales orders, fulfillment delivery notes & invoices',
    items: [
      {
        label: 'Sales Order',
        doctype: 'Sales Order',
        projectField: 'project',
        fields: [
          { name: 'customer', label: 'Customer Name / Code', type: 'text', required: true },
          { name: 'delivery_date', label: 'Expected Delivery Date', type: 'date' },
          { name: 'status', label: 'Status', type: 'select', options: ['Draft', 'To Deliver and Bill', 'Completed', 'Cancelled'], defaultValue: 'Draft' },
          { name: 'order_type', label: 'Order Type', type: 'select', options: ['Sales', 'Maintenance', 'Shopping Cart'], defaultValue: 'Sales' },
        ],
      },
      {
        label: 'Delivery Note',
        doctype: 'Delivery Note',
        projectField: 'project',
        fields: [
          { name: 'customer', label: 'Customer Name / Code', type: 'text', required: true },
          { name: 'posting_date', label: 'Posting Date', type: 'date' },
          { name: 'status', label: 'Status', type: 'select', options: ['Draft', 'To Bill', 'Completed', 'Cancelled'], defaultValue: 'Draft' },
          { name: 'lr_no', label: 'Shipping / Lading No', type: 'text' },
        ],
      },
      {
        label: 'Sales Invoice',
        doctype: 'Sales Invoice',
        projectField: 'project',
        fields: [
          { name: 'customer', label: 'Customer Name / Code', type: 'text', required: true },
          { name: 'posting_date', label: 'Posting Date', type: 'date' },
          { name: 'status', label: 'Status', type: 'select', options: ['Draft', 'Unpaid', 'Paid', 'Overdue', 'Cancelled'], defaultValue: 'Draft' },
          { name: 'due_date', label: 'Payment Due Date', type: 'date' },
        ],
      },
    ],
  },
  {
    group: 'Purchase',
    description: 'Vendor purchase orders, goods receipts & supplier invoices',
    items: [
      {
        label: 'Purchase Order',
        doctype: 'Purchase Order',
        projectField: 'project',
        fields: [
          { name: 'supplier', label: 'Supplier Name / Code', type: 'text', required: true },
          { name: 'schedule_date', label: 'Expected Delivery Date', type: 'date' },
          { name: 'status', label: 'Status', type: 'select', options: ['Draft', 'To Receive and Bill', 'Completed', 'Cancelled'], defaultValue: 'Draft' },
        ],
      },
      {
        label: 'Purchase Receipt',
        doctype: 'Purchase Receipt',
        projectField: 'project',
        fields: [
          { name: 'supplier', label: 'Supplier Name / Code', type: 'text', required: true },
          { name: 'posting_date', label: 'Receipt Date', type: 'date' },
          { name: 'status', label: 'Status', type: 'select', options: ['Draft', 'To Bill', 'Completed', 'Cancelled'], defaultValue: 'Draft' },
        ],
      },
      {
        label: 'Purchase Invoice',
        doctype: 'Purchase Invoice',
        projectField: 'project',
        fields: [
          { name: 'supplier', label: 'Supplier Name / Code', type: 'text', required: true },
          { name: 'posting_date', label: 'Invoice Date', type: 'date' },
          { name: 'bill_no', label: 'Supplier Invoice / Bill No', type: 'text' },
          { name: 'status', label: 'Status', type: 'select', options: ['Draft', 'Unpaid', 'Paid', 'Overdue', 'Cancelled'], defaultValue: 'Draft' },
        ],
      },
    ],
  },
  {
    group: 'Manufacture',
    description: 'Production & shop floor work orders',
    items: [
      {
        label: 'Work Order',
        doctype: 'Work Order',
        projectField: 'project',
        fields: [
          { name: 'production_item', label: 'Assembly / Production Item Code', type: 'item_select', required: true },
          { name: 'qty', label: 'Manufacture Quantity', type: 'number', defaultValue: 1 },
          { name: 'status', label: 'Status', type: 'select', options: ['Draft', 'Not Started', 'In Process', 'Completed', 'Stopped'], defaultValue: 'Draft' },
          { name: 'planned_start_date', label: 'Planned Start Date', type: 'date' },
        ],
      },
    ],
  },
];
