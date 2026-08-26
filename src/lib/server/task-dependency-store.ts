import { TaskRelationship, CreateDependencyPayload, TaskDependencyInfo, DependencyType } from '@/types/task-dependency.types';
import { Task } from '@/types/task.types';

class TaskDependencyStore {
  private dependencies: Map<string, TaskRelationship[]> = new Map();

  constructor() {
    // Initialize in-memory store with persistence across calls
  }

  /**
   * Get all dependencies for a project
   */
  getProjectDependencies(projectId: string): TaskRelationship[] {
    return this.dependencies.get(projectId) || [];
  }

  /**
   * Check if a path exists from startTaskId to targetTaskId (Cycle detection)
   */
  hasPath(projectId: string, startTaskId: string, targetTaskId: string, visited = new Set<string>()): boolean {
    if (startTaskId === targetTaskId) return true;
    if (visited.has(startTaskId)) return false;
    visited.add(startTaskId);

    const projectDeps = this.getProjectDependencies(projectId);
    // Find all immediate successors of startTaskId
    const outgoing = projectDeps.filter((d) => d.predecessor_id === startTaskId);

    for (const dep of outgoing) {
      if (this.hasPath(projectId, dep.successor_id, targetTaskId, visited)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Add a new dependency with full validation
   */
  addDependency(payload: CreateDependencyPayload, createdBy = 'User'): TaskRelationship {
    const { project, predecessor_id, successor_id, dependency_type = 'FS', lag_days = 0 } = payload;

    if (!project || !predecessor_id || !successor_id) {
      throw new Error('Project ID, Predecessor Task ID, and Successor Task ID are required.');
    }

    // 1. Prevent self-dependency
    if (predecessor_id === successor_id) {
      throw new Error('Cannot create dependency: a task cannot depend on itself.');
    }

    const projectDeps = this.getProjectDependencies(project);

    // 2. Prevent duplicate dependencies
    const duplicate = projectDeps.find(
      (d) => d.predecessor_id === predecessor_id && d.successor_id === successor_id
    );
    if (duplicate) {
      throw new Error('Cannot create dependency: this relationship already exists between these tasks.');
    }

    // 3. Prevent circular dependencies
    // If adding predecessor -> successor creates a cycle, then successor can already reach predecessor!
    if (this.hasPath(project, successor_id, predecessor_id)) {
      throw new Error('Cannot create dependency: circular dependency detected.');
    }

    const newDep: TaskRelationship = {
      id: `DEP-${project}-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      project,
      predecessor_id,
      successor_id,
      dependency_type,
      lag_days,
      created_by: createdBy,
      creation: new Date().toISOString(),
      modified: new Date().toISOString(),
    };

    projectDeps.push(newDep);
    this.dependencies.set(project, projectDeps);

    return newDep;
  }

  /**
   * Delete a dependency by ID
   */
  deleteDependency(projectId: string, dependencyId: string): boolean {
    const projectDeps = this.getProjectDependencies(projectId);
    const initialLen = projectDeps.length;
    const filtered = projectDeps.filter((d) => d.id !== dependencyId);
    this.dependencies.set(projectId, filtered);
    return filtered.length < initialLen;
  }

  /**
   * Delete all dependencies involving a specific task (when task is deleted)
   */
  deleteTaskDependencies(projectId: string, taskId: string): void {
    const projectDeps = this.getProjectDependencies(projectId);
    const filtered = projectDeps.filter(
      (d) => d.predecessor_id !== taskId && d.successor_id !== taskId
    );
    this.dependencies.set(projectId, filtered);
  }

  /**
   * Compute detailed predecessor/successor and blocked impact info for a task
   */
  computeTaskDependencyInfo(
    taskId: string,
    projectId: string,
    allTasks: Task[]
  ): TaskDependencyInfo {
    const projectDeps = this.getProjectDependencies(projectId);
    const taskMap = new Map<string, Task>(allTasks.map((t) => [t.name, t]));

    const predRels = projectDeps.filter((d) => d.successor_id === taskId);
    const succRels = projectDeps.filter((d) => d.predecessor_id === taskId);

    const blockedBy: { task_id: string; subject: string; reason: string }[] = [];

    const predecessors = predRels.map((rel) => {
      const predTask = taskMap.get(rel.predecessor_id);
      const subject = predTask?.subject || rel.predecessor_subject || rel.predecessor_id;
      const status = predTask?.status || 'Open';
      const progress = predTask?.progress || 0;

      let is_blocking = false;
      let reason: string | undefined = undefined;

      // FS dependency: successor is blocked if predecessor is not completed
      if (rel.dependency_type === 'FS') {
        if (status !== 'Completed' && status !== 'Skipped') {
          is_blocking = true;
          reason = `Waiting for predecessor "${subject}" to complete`;
          blockedBy.push({ task_id: rel.predecessor_id, subject, reason });
        }
      } else if (rel.dependency_type === 'SS') {
        if (status === 'Open') {
          is_blocking = true;
          reason = `Waiting for predecessor "${subject}" to start`;
          blockedBy.push({ task_id: rel.predecessor_id, subject, reason });
        }
      }

      return {
        dependency_id: rel.id,
        task_id: rel.predecessor_id,
        subject,
        status,
        progress,
        dependency_type: rel.dependency_type,
        is_blocking,
        reason,
      };
    });

    const successors = succRels.map((rel) => {
      const succTask = taskMap.get(rel.successor_id);
      const subject = succTask?.subject || rel.successor_subject || rel.successor_id;
      const status = succTask?.status || 'Open';
      const progress = succTask?.progress || 0;

      return {
        dependency_id: rel.id,
        task_id: rel.successor_id,
        subject,
        status,
        progress,
        dependency_type: rel.dependency_type,
      };
    });

    return {
      taskId,
      predecessors,
      successors,
      is_blocked: blockedBy.length > 0,
      blocked_by: blockedBy,
    };
  }
}

// Global singleton instance across Next.js API calls
const globalForDependencies = global as unknown as { taskDependencyStore: TaskDependencyStore };
export const taskDependencyStore =
  globalForDependencies.taskDependencyStore || new TaskDependencyStore();
if (process.env.NODE_ENV !== 'production') {
  globalForDependencies.taskDependencyStore = taskDependencyStore;
}
