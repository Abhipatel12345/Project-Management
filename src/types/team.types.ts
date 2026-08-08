export type TeamMemberStatus = 'Active' | 'On Leave' | 'Inactive';

export interface ProjectTeamMember {
  id: string;
  project_id: string;
  user_email: string;
  employee_name: string;
  department: string;
  function_name: string;
  role: string;
  is_board_member: boolean;
  status: TeamMemberStatus | string;
  avatar_url?: string;
  creation?: string;
  modified?: string;
}

export interface EmployeeOption {
  name: string;
  email: string;
  full_name: string;
  department?: string;
  designation?: string;
  user_image?: string;
}

export interface TeamMemberFormData {
  user_email: string;
  employee_name: string;
  department: string;
  function_name: string;
  role: string;
  is_board_member: boolean;
  status: TeamMemberStatus | string;
  avatar_url?: string;
}
