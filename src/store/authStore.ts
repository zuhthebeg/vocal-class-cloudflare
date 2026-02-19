import { create } from 'zustand'

interface User {
  id: number
  username: string
  email?: string
  picture?: string
  auth_provider: string
}

interface AuthState {
  user: User | null
  credential: string | null
  isLoading: boolean
  setUser: (user: User, credential: string) => void
  logout: () => void
  loadFromStorage: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  credential: null,
  isLoading: true,

  setUser: (user, credential) => {
    localStorage.setItem('class_user', JSON.stringify(user))
    localStorage.setItem('class_credential', credential)
    set({ user, credential, isLoading: false })
  },

  logout: () => {
    localStorage.removeItem('class_user')
    localStorage.removeItem('class_credential')
    set({ user: null, credential: null, isLoading: false })
  },

  loadFromStorage: () => {
    try {
      const userStr = localStorage.getItem('class_user')
      const credential = localStorage.getItem('class_credential')
      if (userStr && credential) {
        set({ user: JSON.parse(userStr), credential, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch {
      set({ isLoading: false })
    }
  },
}))
