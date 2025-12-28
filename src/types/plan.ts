export type PlanItemType = 'task' | 'event' | 'habit';
export type Priority = 'low' | 'med' | 'high';
export type PlanStatus = 'planned' | 'done' | 'skipped';
export type Source = 'voice' | 'text' | 'manual' | 'github';
export type ActualSource = 'voice' | 'text' | 'review';

export interface LinkedGitHub {
  provider: 'github';
  type: 'issue' | 'pr';
  owner: string;
  repo: string;
  number: number;
  url: string;
  title: string;
}

export interface PlanItem {
  id: string;
  user_id: string;
  title: string;
  start_at: string;
  end_at: string;
  type: PlanItemType;
  priority: Priority;
  tags: string[];
  notes: string | null;
  location: string | null;
  status: PlanStatus;
  source: Source;
  linked_github: LinkedGitHub | null;
  created_at: string;
  updated_at: string;
}

export interface ActualEntry {
  id: string;
  user_id: string;
  title: string;
  start_at: string;
  end_at: string;
  tags: string[];
  notes: string | null;
  source: ActualSource;
  linked_plan_item_id: string | null;
  linked_github: LinkedGitHub | null;
  confidence: number | null;
  created_at: string;
  updated_at: string;
}

export interface DayData {
  date: string;
  planItems: PlanItem[];
  actualEntries: ActualEntry[];
}

// AI Response Types
export interface PlanOperation {
  op: 'add' | 'update' | 'move' | 'remove';
  id?: string;
  title?: string;
  startAt?: string;
  endAt?: string;
  type?: PlanItemType;
  priority?: Priority;
  tags?: string[];
  notes?: string;
}

export interface PlanPatch {
  timezone: string;
  weekStartDate: string;
  operations: PlanOperation[];
  warnings: string[];
  clarifyingQuestions: string[];
}

export interface ActualOperation {
  op: 'addActual' | 'updateActual' | 'removeActual' | 'linkToPlan' | 'linkToGithub';
  id?: string;
  title?: string;
  startAt?: string;
  endAt?: string;
  tags?: string[];
  notes?: string;
  linkedPlanItemId?: string;
}

export interface ActualPatch {
  timezone: string;
  date: string;
  now: string;
  operations: ActualOperation[];
  warnings: string[];
  clarifyingQuestions: string[];
}

export interface Gap {
  startAt: string;
  endAt: string;
  questionId: string;
}

export interface Suggestion {
  type: 'carry_over' | 'reschedule' | 'drop' | 'break_down';
  planItemId: string;
  title: string;
  suggestedDate?: string;
  suggestedTime?: string;
}

export interface DayReviewOutput {
  date: string;
  timezone: string;
  summaryBullets: string[];
  gaps: Gap[];
  plannedNotDone: PlanItem[];
  unplannedButDone: ActualEntry[];
  metrics: {
    plannedCount: number;
    completedCount: number;
    actualCount: number;
    focusTimeMinutes: number;
  };
  suggestions: Suggestion[];
  tomorrowPatch?: PlanPatch;
}
