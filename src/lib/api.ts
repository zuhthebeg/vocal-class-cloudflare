const API_BASE = ''

export async function apiFetch(path: string, options: RequestInit = {}) {
  const credential = localStorage.getItem('class_credential')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (credential) {
    headers['X-Auth-Credential'] = credential
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

// Hobby types
export interface Hobby {
  id: number
  user_id: number
  name: string
  category: string
  icon: string
  color: string
  sort_order: number
  archived: number
}

export interface Entry {
  id: number
  user_id: number
  hobby_id: number
  entry_type: string
  title: string | null
  content: string | null
  duration_min: number
  mood: string | null
  entry_date: string
  photos: string | null
  created_at: string
  hobby_name?: string
  hobby_icon?: string
  hobby_color?: string
}

export interface Goal {
  id: number
  user_id: number
  hobby_id: number | null
  title: string
  target_count: number
  current_count: number
  period: string
  deadline: string | null
  completed: number
}

// Default hobby categories
export const HOBBY_CATEGORIES = [
  { id: 'vocal', name: '보컬', icon: '🎤', color: '#ef4444' },
  { id: 'fitness', name: '헬스/PT', icon: '💪', color: '#f59e0b' },
  { id: 'drawing', name: '드로잉', icon: '🎨', color: '#22c55e' },
  { id: 'piano', name: '피아노', icon: '🎹', color: '#6366f1' },
  { id: 'guitar', name: '기타', icon: '🎸', color: '#ec4899' },
  { id: 'yoga', name: '요가', icon: '🧘', color: '#14b8a6' },
  { id: 'swimming', name: '수영', icon: '🏊', color: '#3b82f6' },
  { id: 'cooking', name: '요리', icon: '🍳', color: '#f97316' },
  { id: 'language', name: '외국어', icon: '📚', color: '#8b5cf6' },
  { id: 'dance', name: '댄스', icon: '💃', color: '#e11d48' },
  { id: 'coding', name: '코딩', icon: '💻', color: '#06b6d4' },
  { id: 'other', name: '기타', icon: '🎯', color: '#64748b' },
]

export const MOODS = ['😊', '😤', '😴', '🔥', '😰', '🎉', '😐', '💪']
