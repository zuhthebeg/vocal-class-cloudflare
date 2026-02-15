import { Calendar, Home, MessageCircle, Settings, Users, BookOpen, X } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { NavLink } from 'react-router'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const teacherLinks = [
  { to: '/teacher', icon: Home, label: '대시보드' },
  { to: '/teacher/schedule', icon: Calendar, label: '스케줄' },
  { to: '/teacher/students', icon: Users, label: '수강생 관리' },
  { to: '/teacher/chat', icon: MessageCircle, label: 'AI 어시스턴트' },
  { to: '/teacher/settings', icon: Settings, label: '설정' },
]

const studentLinks = [
  { to: '/student', icon: Home, label: '대시보드' },
  { to: '/student/teachers', icon: BookOpen, label: '강사 찾기' },
  { to: '/student/bookings', icon: Calendar, label: '예약 내역' },
  { to: '/student/chat', icon: MessageCircle, label: 'AI 어시스턴트' },
  { to: '/student/settings', icon: Settings, label: '설정' },
]

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuthStore()
  const links = user?.role === 'teacher' ? teacherLinks : studentLinks

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 lg:translate-x-0 lg:static lg:z-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 lg:hidden">
          <span className="text-xl font-bold text-indigo-600">보컬클래스</span>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100"
            aria-label="닫기"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <link.icon className="w-5 h-5" />
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}
