import { useEffect, useState } from 'react'
import { Clock, Trash2 } from 'lucide-react'
import { getEntries, deleteEntry } from '../lib/storage'
import type { Entry } from '../lib/api'

export function TimelinePage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [view, setView] = useState<'all' | 'month' | 'week'>('all')

  useEffect(() => {
    setEntries(getEntries())
  }, [])

  const now = new Date()
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const filtered = entries.filter(e => {
    if (view === 'week') return e.entry_date >= weekAgo
    if (view === 'month') return e.entry_date >= monthStart
    return true
  })

  // Group by date
  const grouped = filtered.reduce<Record<string, Entry[]>>((acc, entry) => {
    const date = entry.entry_date
    if (!acc[date]) acc[date] = []
    acc[date].push(entry)
    return acc
  }, {})

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00')
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    if (dateStr === today) return '오늘'
    if (dateStr === yesterday) return '어제'
    return `${d.getMonth() + 1}월 ${d.getDate()}일 (${['일','월','화','수','목','금','토'][d.getDay()]})`
  }

  function handleDelete(id: number) {
    deleteEntry(id)
    setEntries(getEntries())
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
      <h1 className="text-xl font-bold mb-4">타임라인</h1>

      {/* View Toggle */}
      <div className="flex gap-1 bg-[#13131a] border border-[#1e1e2e] rounded-xl p-1 mb-6">
        {[
          { id: 'all' as const, label: '전체' },
          { id: 'month' as const, label: '이번 달' },
          { id: 'week' as const, label: '이번 주' },
        ].map(v => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
              view === v.id ? 'bg-[#6366f1] text-white' : 'text-[#64748b]'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {sortedDates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-3xl mb-2">📝</p>
          <p className="text-sm text-[#64748b]">아직 기록이 없어요</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map(date => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-[#64748b]">{formatDate(date)}</span>
                <div className="flex-1 h-px bg-[#1e1e2e]" />
                <span className="text-[10px] text-[#3e3e4e]">{grouped[date].length}개</span>
              </div>
              <div className="space-y-2">
                {grouped[date].map(entry => (
                  <div key={entry.id} className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-3 group">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: (entry.hobby_color || '#6366f1') + '20' }}>
                        {entry.hobby_icon || '🎯'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{entry.title || '무제'}</p>
                          {entry.mood && <span>{entry.mood}</span>}
                        </div>
                        {entry.content && (
                          <p className="text-xs text-[#64748b] mt-1 line-clamp-2">{entry.content}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px] text-[#64748b] flex items-center gap-0.5">
                            <Clock size={10} /> {entry.duration_min}분
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1e1e2e]" style={{ color: entry.hobby_color || '#6366f1' }}>
                            {entry.hobby_name}
                          </span>
                          <span className="text-[10px] text-[#3e3e4e]">
                            {entry.entry_type === 'lesson' ? '레슨' : entry.entry_type === 'practice' ? '연습' : '혼자연습'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-[#1e1e2e] transition-all"
                      >
                        <Trash2 size={14} className="text-[#64748b]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
