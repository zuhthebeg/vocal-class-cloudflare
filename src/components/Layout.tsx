import { Outlet, NavLink } from 'react-router'
import { Home, Clock, PlusCircle, BarChart3, Bot } from 'lucide-react'

const navItems = [
  { to: '/', icon: Home, label: '홈' },
  { to: '/timeline', icon: Clock, label: '타임라인' },
  { to: '/new', icon: PlusCircle, label: '기록' },
  { to: '/stats', icon: BarChart3, label: '통계' },
  { to: '/ai', icon: Bot, label: 'AI코치' },
]

export function Layout() {
  return (
    <div className="min-h-dvh flex flex-col">
      <main className="flex-1 safe-bottom">
        <Outlet />
      </main>

      {/* Bottom Tab Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#13131a]/95 backdrop-blur-lg border-t border-[#1e1e2e] z-50"
           style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="max-w-lg mx-auto flex justify-around items-center h-16">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'text-[#818cf8]'
                    : 'text-[#64748b] hover:text-[#f1f5f9]'
                } ${to === '/new' ? '' : ''}`
              }
            >
              {to === '/new' ? (
                <div className="w-12 h-12 -mt-5 rounded-full bg-gradient-to-br from-[#6366f1] to-[#a855f7] flex items-center justify-center shadow-lg shadow-[#6366f1]/30">
                  <Icon size={24} className="text-white" />
                </div>
              ) : (
                <>
                  <Icon size={20} />
                  <span className="text-[10px] font-medium">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
