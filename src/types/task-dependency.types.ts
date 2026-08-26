export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

export interface TaskRelationship {
  id: string;
  project: string;
  predecessor_id: string;
  predecessor_subject?: string;
  successor_id: string;
  successor_subject?: string;
  dependency_type: DependencyType;
  lag_days?: number;
  created_by?: string;
  creation?: string;
  modified?: string;
}

export interface CreateDependencyPayload {
  project: string;
  predecessor_id: string;
  successor_id: string;
  dependency_type?: DependencyType;
  lag_days?: number;
}

export interface TaskDependencyInfo {
  taskId: string;
  predecessors: {
    dependency_id: string;
    task_id: string;
    subject: string;
    status: string;
    progress: number;
    dependency_type: DependencyType;
    is_blocking: boolean;
    reason?: string;
  }[];
  successors: {
    dependency_id: string;
    task_id: string;
    subject: string;
    status: string;
    progress: number;
    dependency_type: DependencyType;
  }[];
  is_blocked: boolean;
  blocked_by: {
    task_id: string;
    subject: string;
    reason: string;
  }[];
}
