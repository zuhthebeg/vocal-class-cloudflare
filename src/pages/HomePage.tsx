import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Settings, Plus, ChevronRight, Clock, Flame } from 'lucide-react'
import { initSampleData, getHobbies, getEntries } from '../lib/storage'
import type { Hobby, Entry } from '../lib/api'

export function HomePage() {
  const [hobbies, setHobbies] = useState<Hobby[]>([])
  const [entries, setEntries] = useState<Entry[]>([])

  useEffect(() => {
    initSampleData()
    setHobbies(getHobbies())
    setEntries(getEntries())
  }, [])

  const today = new Date().toISOString().split('T')[0]
  const todayEntries = entries.filter(e => e.entry_date === today)
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const weekEntries = entries.filter(e => e.entry_date >= weekAgo)
  const weekMinutes = weekEntries.reduce((sum, e) => sum + e.duration_min, 0)

  // Streak calculation
  let streak = 0
  const dateSet = new Set(entries.map(e => e.entry_date))
  for (let i = 0; i < 365; i++) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0]
    if (dateSet.has(d)) streak++
    else if (i > 0) break
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">취미의 기록 📝</h1>
          <p className="text-sm text-[#64748b] mt-0.5">오늘도 한 걸음 성장 중</p>
        </div>
        <Link to="/profile" className="w-9 h-9 rounded-full bg-[#13131a] border border-[#1e1e2e] flex items-center justify-center">
          <Settings size={16} className="text-[#64748b]" />
        </Link>
      </div>

      {/* Week Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-[#818cf8]">{weekEntries.length}</p>
          <p className="text-[10px] text-[#64748b]">이번 주 기록</p>
        </div>
        <div className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-3 text-center">
          <p className="text-lg font-bold text-[#22c55e]">{Math.floor(weekMinutes / 60)}h {weekMinutes % 60}m</p>
          <p className="text-[10px] text-[#64748b]">이번 주 시간</p>
        </div>
        <div className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <Flame size={16} className="text-[#f59e0b]" />
            <p className="text-lg font-bold text-[#f59e0b]">{streak}</p>
          </div>
          <p className="text-[10px] text-[#64748b]">연속 기록</p>
        </div>
      </div>

      {/* Today's Entries */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#64748b]">오늘의 기록</h2>
          <Link to="/timeline" className="text-xs text-[#818cf8] flex items-center gap-0.5">
            전체보기 <ChevronRight size={12} />
          </Link>
        </div>
        {todayEntries.length > 0 ? (
          <div className="space-y-2">
            {todayEntries.map(entry => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        ) : (
          <div className="bg-[#13131a] border border-[#1e1e2e] border-dashed rounded-xl p-6 text-center">
            <p className="text-2xl mb-2">✨</p>
            <p className="text-sm text-[#64748b]">아직 오늘의 기록이 없어요</p>
            <Link to="/new" className="inline-block mt-3 px-4 py-2 bg-[#6366f1] rounded-lg text-sm font-medium hover:bg-[#818cf8] transition-colors">
              기록하기
            </Link>
          </div>
        )}
      </div>

      {/* My Hobbies */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#64748b]">내 취미</h2>
          <Link to="/hobbies" className="text-xs text-[#818cf8] flex items-center gap-0.5">
            관리 <ChevronRight size={12} />
          </Link>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {hobbies.filter(h => !h.archived).map(hobby => {
            const count = entries.filter(e => e.hobby_id === hobby.id).length
            return (
              <div key={hobby.id} className="flex-shrink-0 bg-[#13131a] border border-[#1e1e2e] rounded-xl p-3 min-w-[100px] text-center">
                <div className="text-2xl mb-1">{hobby.icon}</div>
                <p className="text-xs font-medium">{hobby.name}</p>
                <p className="text-[10px] text-[#64748b] mt-0.5">{count}회 기록</p>
              </div>
            )
          })}
          <Link to="/hobbies" className="flex-shrink-0 bg-[#13131a] border border-[#1e1e2e] border-dashed rounded-xl p-3 min-w-[100px] flex flex-col items-center justify-center text-[#64748b] hover:text-[#818cf8] transition-colors">
            <Plus size={20} />
            <p className="text-[10px] mt-1">추가</p>
          </Link>
        </div>
      </div>

      {/* Recent Entries */}
      {entries.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-[#64748b] mb-3">최근 기록</h2>
          <div className="space-y-2">
            {entries.slice(0, 5).map(entry => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function EntryCard({ entry }: { entry: Entry }) {
  return (
    <div className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-3 flex items-center gap-3 hover:border-[#2e2e3e] transition-colors">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: (entry.hobby_color || '#6366f1') + '20' }}>
        {entry.hobby_icon || '🎯'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{entry.title || '무제'}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-[#64748b] flex items-center gap-0.5">
            <Clock size={10} /> {entry.duration_min}분
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#1e1e2e]" style={{ color: entry.hobby_color || '#6366f1' }}>
            {entry.hobby_name || '취미'}
          </span>
        </div>
      </div>
      {entry.mood && <span className="text-lg">{entry.mood}</span>}
    </div>
  )
}
