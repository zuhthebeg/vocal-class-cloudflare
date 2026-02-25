import type { Hobby, Entry } from './api'

const HOBBIES_KEY = 'class_hobbies'
const ENTRIES_KEY = 'class_entries'
const INITIALIZED_KEY = 'class_initialized'

// Initialize with sample data on first visit
export function initSampleData() {
  if (localStorage.getItem(INITIALIZED_KEY)) return
  
  const sampleHobbies: Hobby[] = [
    { id: 1, user_id: 1, name: '보컬', category: 'vocal', icon: '🎤', color: '#ef4444', sort_order: 0, archived: 0 },
    { id: 2, user_id: 1, name: '헬스', category: 'fitness', icon: '💪', color: '#f59e0b', sort_order: 1, archived: 0 },
    { id: 3, user_id: 1, name: '드로잉', category: 'drawing', icon: '🎨', color: '#22c55e', sort_order: 2, archived: 0 },
  ]

  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const twoDaysAgo = new Date(Date.now() - 172800000).toISOString().split('T')[0]

  const sampleEntries: Entry[] = [
    { id: 1, user_id: 1, hobby_id: 1, entry_type: 'lesson', title: '고음 발성 연습', content: '선생님이랑 고음 트레이닝. 가성에서 진성 전환이 좀 나아짐', duration_min: 60, mood: '🔥', entry_date: today, photos: null, created_at: today + 'T10:00:00', hobby_name: '보컬', hobby_icon: '🎤', hobby_color: '#ef4444' },
    { id: 2, user_id: 1, hobby_id: 2, entry_type: 'practice', title: '하체 운동', content: '스쿼트 5x5, 레그프레스 4x12, 런지 3x10', duration_min: 90, mood: '💪', entry_date: yesterday, photos: null, created_at: yesterday + 'T18:00:00', hobby_name: '헬스', hobby_icon: '💪', hobby_color: '#f59e0b' },
    { id: 3, user_id: 1, hobby_id: 3, entry_type: 'practice', title: '인물 크로키', content: '30초 크로키 20장. 손 그리기가 아직 어렵다', duration_min: 45, mood: '😊', entry_date: twoDaysAgo, photos: null, created_at: twoDaysAgo + 'T20:00:00', hobby_name: '드로잉', hobby_icon: '🎨', hobby_color: '#22c55e' },
  ]

  localStorage.setItem(HOBBIES_KEY, JSON.stringify(sampleHobbies))
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(sampleEntries))
  localStorage.setItem(INITIALIZED_KEY, '1')
}

export function getHobbies(): Hobby[] {
  try {
    return JSON.parse(localStorage.getItem(HOBBIES_KEY) || '[]')
  } catch { return [] }
}

export function saveHobbies(hobbies: Hobby[]) {
  localStorage.setItem(HOBBIES_KEY, JSON.stringify(hobbies))
}

export function addHobby(hobby: Omit<Hobby, 'id' | 'user_id' | 'sort_order' | 'archived'>): Hobby {
  const hobbies = getHobbies()
  const newHobby: Hobby = {
    ...hobby,
    id: Date.now(),
    user_id: 1,
    sort_order: hobbies.length,
    archived: 0,
  }
  hobbies.push(newHobby)
  saveHobbies(hobbies)
  return newHobby
}

export function getEntries(): Entry[] {
  try {
    return JSON.parse(localStorage.getItem(ENTRIES_KEY) || '[]')
  } catch { return [] }
}

export function saveEntries(entries: Entry[]) {
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries))
}

export function addEntry(entry: Omit<Entry, 'id' | 'user_id' | 'created_at'>): Entry {
  const entries = getEntries()
  const newEntry: Entry = {
    ...entry,
    id: Date.now(),
    user_id: 1,
    created_at: new Date().toISOString(),
  }
  entries.unshift(newEntry)
  saveEntries(entries)
  return newEntry
}

export function deleteEntry(id: number) {
  const entries = getEntries().filter(e => e.id !== id)
  saveEntries(entries)
}
