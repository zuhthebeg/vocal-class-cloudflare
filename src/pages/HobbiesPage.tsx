import { useState, useEffect } from 'react'
import { Plus, X, Archive, RotateCcw } from 'lucide-react'
import { HOBBY_CATEGORIES } from '../lib/api'
import type { Hobby } from '../lib/api'
import { getHobbies, saveHobbies, addHobby, getEntries } from '../lib/storage'

export function HobbiesPage() {
  const [hobbies, setHobbies] = useState<Hobby[]>([])
  const [showModal, setShowModal] = useState(false)
  const [customName, setCustomName] = useState('')
  const [entries, setEntries] = useState<ReturnType<typeof getEntries>>([])

  useEffect(() => {
    setHobbies(getHobbies())
    setEntries(getEntries())
  }, [])

  function handleAddCategory(cat: typeof HOBBY_CATEGORIES[0]) {
    const existing = hobbies.find(h => h.category === cat.id && !h.archived)
    if (existing) return
    addHobby({ name: cat.name, category: cat.id, icon: cat.icon, color: cat.color })
    setHobbies(getHobbies())
    setShowModal(false)
  }

  function handleAddCustom() {
    if (!customName.trim()) return
    addHobby({ name: customName.trim(), category: 'other', icon: '🎯', color: '#64748b' })
    setHobbies(getHobbies())
    setCustomName('')
    setShowModal(false)
  }

  function handleArchive(id: number) {
    const updated = hobbies.map(h => h.id === id ? { ...h, archived: 1 } : h)
    saveHobbies(updated)
    setHobbies(updated)
  }

  function handleRestore(id: number) {
    const updated = hobbies.map(h => h.id === id ? { ...h, archived: 0 } : h)
    saveHobbies(updated)
    setHobbies(updated)
  }

  const activeHobbies = hobbies.filter(h => !h.archived)
  const archivedHobbies = hobbies.filter(h => h.archived)

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold">내 취미</h1>
        <button onClick={() => setShowModal(true)} className="w-9 h-9 rounded-full bg-[#6366f1] flex items-center justify-center">
          <Plus size={18} className="text-white" />
        </button>
      </div>

      {/* Active Hobbies */}
      <div className="space-y-2 mb-6">
        {activeHobbies.map(hobby => {
          const count = entries.filter(e => e.hobby_id === hobby.id).length
          return (
            <div key={hobby.id} className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-3 flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg" style={{ backgroundColor: hobby.color + '20' }}>
                {hobby.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{hobby.name}</p>
                <p className="text-[10px] text-[#64748b]">{count}회 기록</p>
              </div>
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: hobby.color }} />
              <button
                onClick={() => handleArchive(hobby.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-[#1e1e2e] transition-all"
                title="보관"
              >
                <Archive size={14} className="text-[#64748b]" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Archived */}
      {archivedHobbies.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-[#64748b] mb-2">보관된 취미</h2>
          <div className="space-y-2">
            {archivedHobbies.map(hobby => (
              <div key={hobby.id} className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-3 flex items-center gap-3 opacity-50">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg bg-[#1e1e2e]">
                  {hobby.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{hobby.name}</p>
                </div>
                <button onClick={() => handleRestore(hobby.id)} className="p-1.5 rounded-lg hover:bg-[#1e1e2e]">
                  <RotateCcw size={14} className="text-[#64748b]" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Hobby Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center" onClick={() => setShowModal(false)}>
          <div className="bg-[#13131a] border-t border-[#1e1e2e] rounded-t-2xl w-full max-w-lg p-4 pb-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">취미 추가</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-[#1e1e2e]">
                <X size={18} className="text-[#64748b]" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {HOBBY_CATEGORIES.map(cat => {
                const exists = hobbies.find(h => h.category === cat.id && !h.archived)
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleAddCategory(cat)}
                    disabled={!!exists}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      exists
                        ? 'border-[#1e1e2e] bg-[#0a0a0f] opacity-30'
                        : 'border-[#1e1e2e] bg-[#0a0a0f] hover:border-[#6366f1]'
                    }`}
                  >
                    <div className="text-xl mb-1">{cat.icon}</div>
                    <p className="text-[10px]">{cat.name}</p>
                  </button>
                )
              })}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="직접 입력..."
                className="flex-1 px-3 py-2.5 bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl text-sm focus:outline-none focus:border-[#6366f1] placeholder:text-[#3e3e4e]"
                onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
              />
              <button onClick={handleAddCustom} className="px-4 py-2.5 bg-[#6366f1] rounded-xl text-sm font-medium">
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
