import { Menu, LogOut, User } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuthStore()

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="flex items-center justify-between h-16 px-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          {user && (
            <button
              onClick={onMenuClick}
              className="p-2 -ml-2 rounded-lg hover:bg-slate-100 lg:hidden"
              aria-label="메뉴"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
          )}
          <a href="/" className="text-xl font-bold text-indigo-600">
            보컬클래스
          </a>
        </div>

        {user ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">{user.name}</span>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700">
                {user.role === 'teacher' ? '강사' : '수강생'}
              </span>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
              aria-label="로그아웃"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <a
            href="/login"
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors"
          >
            로그인
          </a>
        )}
      </div>
    </header>
  )
}
