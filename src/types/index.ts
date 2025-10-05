export interface Task {
  id: string
  title: string
  description?: string
  category: string
  points_value: number
  money_value: number
  weekly_goal_id: string
  user_id: string
  status: 'pending' | 'in_progress' | 'completed'
  created_at: string
  updated_at: string
  completed_at?: string
  weekly_goal?: Goal
  sort_order?: number
}

export interface Goal {
  id: string
  title: string
  description?: string
  category: string
  target_points: number
  target_money: number
  current_points?: number
  week_id: string
  user_id: string
  created_at: string
  updated_at: string
  tasks?: Task[]
}

export interface Habit {
  id: string
  title: string
  description?: string
  points_per_completion: number
  is_active: boolean
  weekly_completion_count: number
  last_completed?: string
  order_index: number
  created_at: string
  user_id?: string
  updated_at?: string
}

export interface Priority {
  id: string
  title: string
  description?: string
  priority_level: number
  category: string
  source_type: string
  project_id?: string
  task_id?: string
  user_id: string
  created_at: string
  updated_at: string
  is_deleted?: boolean
  deleted_at?: string
}
