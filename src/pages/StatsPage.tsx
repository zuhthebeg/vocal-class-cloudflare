import { useEffect, useState } from 'react'
import { Flame, Clock, BookOpen } from 'lucide-react'
import { getEntries, getHobbies } from '../lib/storage'
import type { Entry, Hobby } from '../lib/api'

export function StatsPage() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [hobbies, setHobbies] = useState<Hobby[]>([])

  useEffect(() => {
    setEntries(getEntries())
    setHobbies(getHobbies())
  }, [])

  const totalMinutes = entries.reduce((sum, e) => sum + e.duration_min, 0)
  const totalHours = Math.floor(totalMinutes / 60)
  const totalEntries = entries.length

  // Streak
  let streak = 0
  const dateSet = new Set(entries.map(e => e.entry_date))
  for (let i = 0; i < 365; i++) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0]
    if (dateSet.has(d)) streak++
    else if (i > 0) break
  }

  // This month daily counts
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const dailyCounts: number[] = []
  let maxDaily = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${monthStr}-${String(d).padStart(2, '0')}`
    const count = entries.filter(e => e.entry_date === dateStr).length
    dailyCounts.push(count)
    if (count > maxDaily) maxDaily = count
  }

  // Hobby distribution
  const hobbyMinutes: Record<number, number> = {}
  entries.forEach(e => {
    hobbyMinutes[e.hobby_id] = (hobbyMinutes[e.hobby_id] || 0) + e.duration_min
  })
  const maxHobbyMin = Math.max(...Object.values(hobbyMinutes), 1)

  // Weekly heatmap (7 cols x 8 weeks)
  const heatmapWeeks = 8
  const heatmapData: { date: string; count: number }[][] = []
  const startOfWeek = new Date()
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  
  for (let w = heatmapWeeks - 1; w >= 0; w--) {
    const week: { date: string; count: number }[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(startOfWeek)
      date.setDate(date.getDate() - w * 7 + d)
      const dateStr = date.toISOString().split('T')[0]
      const count = entries.filter(e => e.entry_date === dateStr).length
      week.push({ date: dateStr, count })
    }
    heatmapData.push(week)
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
      <h1 className="text-xl font-bold mb-6">통계</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-3 text-center">
          <BookOpen size={18} className="mx-auto text-[#818cf8] mb-1" />
          <p className="text-lg font-bold">{totalEntries}</p>
          <p className="text-[10px] text-[#64748b]">총 기록</p>
        </div>
        <div className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-3 text-center">
          <Clock size={18} className="mx-auto text-[#22c55e] mb-1" />
          <p className="text-lg font-bold">{totalHours}h</p>
          <p className="text-[10px] text-[#64748b]">총 시간</p>
        </div>
        <div className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-3 text-center">
          <Flame size={18} className="mx-auto text-[#f59e0b] mb-1" />
          <p className="text-lg font-bold">{streak}</p>
          <p className="text-[10px] text-[#64748b]">연속 기록</p>
        </div>
      </div>

      {/* Monthly Activity */}
      <div className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-4 mb-6">
        <h2 className="text-sm font-semibold mb-3">{now.getMonth() + 1}월 활동</h2>
        <div className="flex items-end gap-[2px] h-20">
          {dailyCounts.map((count, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end">
              <div
                className="w-full rounded-sm transition-all"
                style={{
                  height: count > 0 ? `${Math.max(8, (count / Math.max(maxDaily, 1)) * 100)}%` : '2px',
                  backgroundColor: count > 0 ? '#6366f1' : '#1e1e2e',
                  opacity: i + 1 <= now.getDate() ? 1 : 0.2,
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-[#3e3e4e]">1일</span>
          <span className="text-[9px] text-[#3e3e4e]">{daysInMonth}일</span>
        </div>
      </div>

      {/* Hobby Distribution */}
      <div className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-4 mb-6">
        <h2 className="text-sm font-semibold mb-3">취미별 시간</h2>
        <div className="space-y-3">
          {hobbies.filter(h => !h.archived && hobbyMinutes[h.id]).map(hobby => {
            const min = hobbyMinutes[hobby.id] || 0
            const pct = (min / maxHobbyMin) * 100
            return (
              <div key={hobby.id}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>{hobby.icon} {hobby.name}</span>
                  <span className="text-[#64748b]">{Math.floor(min / 60)}h {min % 60}m</span>
                </div>
                <div className="h-2 bg-[#1e1e2e] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: hobby.color }} />
                </div>
              </div>
            )
          })}
          {Object.keys(hobbyMinutes).length === 0 && (
            <p className="text-xs text-[#64748b] text-center py-4">아직 데이터가 없어요</p>
          )}
        </div>
      </div>

      {/* Weekly Heatmap */}
      <div className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-4">
        <h2 className="text-sm font-semibold mb-3">활동 히트맵</h2>
        <div className="flex gap-1">
          <div className="flex flex-col gap-1 mr-1">
            {['일','월','화','수','목','금','토'].map(d => (
              <div key={d} className="h-4 text-[8px] text-[#3e3e4e] flex items-center">{d}</div>
            ))}
          </div>
          {heatmapData.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1 flex-1">
              {week.map(({ date, count }) => (
                <div
                  key={date}
                  className="h-4 rounded-sm"
                  style={{
                    backgroundColor: count === 0 ? '#1e1e2e' : count === 1 ? '#6366f140' : count === 2 ? '#6366f180' : '#6366f1',
                  }}
                  title={`${date}: ${count}개`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
