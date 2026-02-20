import { useState } from 'react'
import { Link } from 'react-router'
import { Palette, Download, Upload, Trash2, LogIn, LogOut, ChevronRight } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export function ProfilePage() {
  const { user, setUser, logout } = useAuthStore()
  const [nickname, setNickname] = useState('')
  const [showLogin, setShowLogin] = useState(false)

  function handleGuestLogin() {
    if (!nickname.trim() || nickname.trim().length < 2) return
    const guestUser = {
      id: Date.now(),
      username: nickname.trim(),
      auth_provider: 'guest',
    }
    const credential = btoa(JSON.stringify({ sub: `guest_${guestUser.id}`, username: guestUser.username, auth_provider: 'guest' }))
    setUser(guestUser, credential)
    setShowLogin(false)
    setNickname('')
  }

  function handleExport() {
    const data: Record<string, string | null> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('class_')) {
        data[key] = localStorage.getItem(key)
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `class-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
  }

  function handleImport() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        Object.entries(data).forEach(([key, val]) => {
          if (key.startsWith('class_') && typeof val === 'string') {
            localStorage.setItem(key, val)
          }
        })
        window.location.reload()
      } catch {
        alert('파일을 읽을 수 없습니다')
      }
    }
    input.click()
  }

  function handleReset() {
    if (!confirm('모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('class_')) keys.push(key)
    }
    keys.forEach(k => localStorage.removeItem(k))
    window.location.reload()
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-4">
      <h1 className="text-xl font-bold mb-6">설정</h1>

      {/* User Info */}
      <div className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6366f1] to-[#a855f7] flex items-center justify-center text-lg">
            {user?.picture ? (
              <img src={user.picture} alt="" className="w-12 h-12 rounded-full" />
            ) : (
              '👤'
            )}
          </div>
          <div className="flex-1">
            <p className="font-medium">{user?.username || '게스트'}</p>
            <p className="text-xs text-[#64748b]">{user?.email || '로그인하면 데이터가 동기화됩니다'}</p>
          </div>
          {user ? (
            <button onClick={logout} className="p-2 rounded-lg hover:bg-[#1e1e2e]">
              <LogOut size={16} className="text-[#64748b]" />
            </button>
          ) : (
            <button onClick={() => setShowLogin(true)} className="p-2 rounded-lg hover:bg-[#1e1e2e]">
              <LogIn size={16} className="text-[#818cf8]" />
            </button>
          )}
        </div>
      </div>

      {/* Login Modal */}
      {showLogin && (
        <div className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-4 mb-4">
          <h3 className="text-sm font-semibold mb-3">닉네임으로 시작하기</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGuestLogin()}
              placeholder="닉네임 (2자 이상)"
              maxLength={20}
              className="flex-1 px-3 py-2.5 bg-[#0a0a0f] border border-[#1e1e2e] rounded-xl text-sm focus:outline-none focus:border-[#6366f1] placeholder:text-[#3e3e4e]"
            />
            <button onClick={handleGuestLogin} className="px-4 py-2.5 bg-[#6366f1] rounded-xl text-sm font-medium">
              시작
            </button>
          </div>
          <p className="text-[10px] text-[#64748b] mt-2">* Google 로그인은 추후 지원 예정</p>
        </div>
      )}

      {/* Menu Items */}
      <div className="space-y-1 mb-6">
        <Link to="/hobbies" className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#13131a] transition-colors">
          <Palette size={18} className="text-[#64748b]" />
          <span className="flex-1 text-sm">내 취미 관리</span>
          <ChevronRight size={16} className="text-[#3e3e4e]" />
        </Link>
      </div>

      {/* Data Management */}
      <h2 className="text-xs font-semibold text-[#64748b] mb-2">데이터 관리</h2>
      <div className="space-y-1 mb-6">
        <button onClick={handleExport} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#13131a] transition-colors text-left">
          <Download size={18} className="text-[#64748b]" />
          <span className="flex-1 text-sm">데이터 내보내기 (JSON)</span>
        </button>
        <button onClick={handleImport} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#13131a] transition-colors text-left">
          <Upload size={18} className="text-[#64748b]" />
          <span className="flex-1 text-sm">데이터 가져오기</span>
        </button>
        <button onClick={handleReset} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-[#13131a] transition-colors text-left">
          <Trash2 size={18} className="text-[#ef4444]" />
          <span className="flex-1 text-sm text-[#ef4444]">모든 데이터 초기화</span>
        </button>
      </div>

      {/* App Info */}
      <div className="text-center text-[10px] text-[#3e3e4e] space-y-1">
        <p>Class v1.0.0 — 취미의 기록</p>
        <p>© 2026 cocy.io</p>
      </div>
    </div>
  )
}
