import { Calendar, Home, MessageCircle, User } from 'lucide-react'
import { NavLink } from 'react-router'
import { useAuthStore } from '../../store/authStore'

export function MobileNav() {
  const { user } = useAuthStore()
  if (!user) return null

  const prefix = user.role === 'teacher' ? '/teacher' : '/student'

  const links = [
    { to: prefix, icon: Home, label: '홈' },
    { to: `${prefix}/schedule`, icon: Calendar, label: '일정' },
    { to: `${prefix}/chat`, icon: MessageCircle, label: 'AI' },
    { to: `${prefix}/settings`, icon: User, label: '내정보' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 lg:hidden">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === prefix}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors ${
                isActive ? 'text-indigo-600' : 'text-slate-500'
              }`
            }
          >
            <link.icon className="w-5 h-5" />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
