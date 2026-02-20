import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { ArrowLeft, Check } from 'lucide-react'
import { MOODS } from '../lib/api'
import type { Hobby } from '../lib/api'
import { getHobbies, addEntry } from '../lib/storage'

const ENTRY_TYPES = [
  { id: 'lesson', label: '레슨', icon: '👨‍🏫' },
  { id: 'practice', label: '연습', icon: '🏋️' },
  { id: 'self', label: '혼자연습', icon: '🧘' },
]

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120]

export function NewEntryPage() {
  const navigate = useNavigate()
  const [hobbies, setHobbies] = useState<Hobby[]>([])
  const [selectedHobby, setSelectedHobby] = useState<number | null>(null)
  const [entryType, setEntryType] = useState('practice')
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState(60)
  const [mood, setMood] = useState('')
  const [content, setContent] = useState('')

  useEffect(() => {
    const h = getHobbies().filter(h => !h.archived)
    setHobbies(h)
    if (h.length > 0) setSelectedHobby(h[0].id)
  }, [])

  const selectedHobbyData = hobbies.find(h => h.id === selectedHobby)

  function handleSave() {
    if (!selectedHobby || !selectedHobbyData) return

    addEntry({
      hobby_id: selectedHobby,
      entry_type: entryType,
      title: title || selectedHobbyData.name + ' ' + ENTRY_TYPES.find(t => t.id === entryType)?.label,
      content,
      duration_min: duration,
      mood: mood || null,
      entry_date: new Date().toISOString().split('T')[0],
      photos: null,
      hobby_name: selectedHobbyData.name,
      hobby_icon: selectedHobbyData.icon,
      hobby_color: selectedHobbyData.color,
    })
    navigate('/')
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-[#13131a] border border-[#1e1e2e] flex items-center justify-center">
          <ArrowLeft size={16} className="text-[#64748b]" />
        </button>
        <h1 className="text-lg font-bold">기록하기</h1>
      </div>

      {/* Hobby Selection */}
      <div className="mb-5">
        <label className="text-xs font-medium text-[#64748b] mb-2 block">취미 선택</label>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {hobbies.map(hobby => (
            <button
              key={hobby.id}
              onClick={() => setSelectedHobby(hobby.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                selectedHobby === hobby.id
                  ? 'border-transparent text-white'
                  : 'border-[#1e1e2e] bg-[#13131a] text-[#64748b]'
              }`}
              style={selectedHobby === hobby.id ? { backgroundColor: hobby.color } : {}}
            >
              {hobby.icon} {hobby.name}
            </button>
          ))}
        </div>
      </div>

      {/* Entry Type */}
      <div className="mb-5">
        <label className="text-xs font-medium text-[#64748b] mb-2 block">유형</label>
        <div className="grid grid-cols-3 gap-2">
          {ENTRY_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => setEntryType(type.id)}
              className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                entryType === type.id
                  ? 'border-[#6366f1] bg-[#6366f1]/10 text-[#818cf8]'
                  : 'border-[#1e1e2e] bg-[#13131a] text-[#64748b]'
              }`}
            >
              {type.icon} {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div className="mb-5">
        <label className="text-xs font-medium text-[#64748b] mb-2 block">제목</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="오늘 뭘 했나요?"
          className="w-full px-4 py-3 bg-[#13131a] border border-[#1e1e2e] rounded-xl text-sm focus:outline-none focus:border-[#6366f1] transition-colors placeholder:text-[#3e3e4e]"
        />
      </div>

      {/* Duration */}
      <div className="mb-5">
        <label className="text-xs font-medium text-[#64748b] mb-2 block">시간 (분)</label>
        <div className="flex gap-2 flex-wrap">
          {DURATION_PRESETS.map(d => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                duration === d
                  ? 'border-[#6366f1] bg-[#6366f1]/10 text-[#818cf8]'
                  : 'border-[#1e1e2e] bg-[#13131a] text-[#64748b]'
              }`}
            >
              {d >= 60 ? `${d / 60}시간` : `${d}분`}
              {d === 90 && '30분'}
            </button>
          ))}
        </div>
        <input
          type="range"
          min="5"
          max="180"
          step="5"
          value={duration}
          onChange={e => setDuration(Number(e.target.value))}
          className="w-full mt-2 accent-[#6366f1]"
        />
        <p className="text-center text-sm text-[#818cf8] mt-1">{Math.floor(duration / 60)}시간 {duration % 60}분</p>
      </div>

      {/* Mood */}
      <div className="mb-5">
        <label className="text-xs font-medium text-[#64748b] mb-2 block">오늘 기분</label>
        <div className="flex gap-2 flex-wrap">
          {MOODS.map(m => (
            <button
              key={m}
              onClick={() => setMood(mood === m ? '' : m)}
              className={`w-10 h-10 rounded-xl border text-lg flex items-center justify-center transition-all ${
                mood === m
                  ? 'border-[#6366f1] bg-[#6366f1]/10 scale-110'
                  : 'border-[#1e1e2e] bg-[#13131a]'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="mb-6">
        <label className="text-xs font-medium text-[#64748b] mb-2 block">메모</label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="오늘의 기록을 자유롭게 남겨보세요..."
          rows={4}
          className="w-full px-4 py-3 bg-[#13131a] border border-[#1e1e2e] rounded-xl text-sm focus:outline-none focus:border-[#6366f1] transition-colors placeholder:text-[#3e3e4e] resize-none"
        />
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={!selectedHobby}
        className="w-full py-3.5 bg-gradient-to-r from-[#6366f1] to-[#a855f7] rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        <Check size={18} /> 기록 저장
      </button>
    </div>
  )
}
