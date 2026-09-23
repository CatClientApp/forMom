export interface User {
  id: number
  name: string
  role: 'teacher' | 'student'
  color: string
  created_at: string
}

export interface Topic {
  id: number
  name: string
  parent_id: number | null
  order_index: number
  created_at: string
  children?: Topic[]
}

export interface Article {
  id: number
  topic_id: number | null
  title: string
  content_md: string
  created_at: string
  updated_at: string | null
}

export interface TaskOption {
  id: number
  task_id: number
  text: string
  is_correct: boolean
  order_index: number
}

export interface TaskImage {
  id: number
  url: string
  order_index: number
}

export interface Task {
  id: number
  topic_id: number
  title: string
  text: string | null
  answer_type: 'choice' | 'numeric' | 'text'
  correct_text: string | null
  correct_number: number | null
  tolerance: number | null
  unit: string | null
  points: number
  difficulty: 'easy' | 'medium' | 'hard'
  explanation: string | null
  created_by: number
  created_at: string
  images: TaskImage[]
  options: TaskOption[]
}

export interface Hint {
  id: number
  task_id: number | null
  topic_id: number | null
  tier: number
  cost: number
  content: string
}

export interface Test {
  id: number
  title: string
  description: string | null
  topic_id: number | null
  time_limit_sec: number | null
  created_by: number
  created_at: string
}

export interface Attempt {
  id: number
  user_id: number
  mode: 'practice' | 'test'
  test_id: number | null
  started_at: string
  finished_at: string | null
  score: number
  max_score: number
}

export interface AttemptAnswerResult {
  is_correct: boolean
  points_earned: number
  correct_option_id: number | null
  explanation: string | null
  max_score: number
}

export interface StatsSummary {
  total_attempts: number
  solved_count: number
  accuracy: number
  total_points: number
}
