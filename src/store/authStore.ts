import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type UserRole = 'teacher' | 'student'

export interface User {
  id: number
  name: string
  role: UserRole
}

interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null
  login: (name: string, role: UserRole) => Promise<boolean>
  logout: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      error: null,

      login: async (name: string, role: UserRole) => {
        set({ isLoading: true, error: null })
        try {
          const res = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, role }),
          })

          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error || '로그인 실패')
          }

          const data = await res.json()
          set({ user: { id: data.id, name: data.name, role: data.role }, isLoading: false })
          return true
        } catch (err) {
          set({ error: err instanceof Error ? err.message : '로그인 실패', isLoading: false })
          return false
        }
      },

      logout: () => {
        set({ user: null, error: null })
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'vocal-class-auth',
    }
  )
)
