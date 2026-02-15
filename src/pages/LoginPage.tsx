import { useState } from 'react'
import { useNavigate } from 'react-router'
import { User, GraduationCap, ArrowRight, Loader2 } from 'lucide-react'
import { useAuthStore, UserRole } from '../store/authStore'

export function LoginPage() {
  const [name, setName] = useState('')
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)
  const { login, isLoading, error, clearError } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !selectedRole) return

    const success = await login(name.trim(), selectedRole)
    if (success) {
      navigate(selectedRole === 'teacher' ? '/teacher' : '/student')
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            로그인
          </h1>
          <p className="text-slate-600">
            보컬 클래스에 오신 것을 환영합니다
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Input */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
              이름
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                clearError()
              }}
              placeholder="이름을 입력하세요"
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
              required
            />
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              역할 선택
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('teacher')
                  clearError()
                }}
                className={`relative flex flex-col items-center gap-3 p-6 border-2 rounded-xl transition-all ${
                  selectedRole === 'teacher'
                    ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`p-3 rounded-full ${
                    selectedRole === 'teacher'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <GraduationCap className="w-6 h-6" />
                </div>
                <span
                  className={`text-sm font-semibold ${
                    selectedRole === 'teacher' ? 'text-indigo-700' : 'text-slate-700'
                  }`}
                >
                  강사
                </span>
                {selectedRole === 'teacher' && (
                  <div className="absolute top-2 right-2 w-2 h-2 bg-indigo-600 rounded-full" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole('student')
                  clearError()
                }}
                className={`relative flex flex-col items-center gap-3 p-6 border-2 rounded-xl transition-all ${
                  selectedRole === 'student'
                    ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div
                  className={`p-3 rounded-full ${
                    selectedRole === 'student'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <User className="w-6 h-6" />
                </div>
                <span
                  className={`text-sm font-semibold ${
                    selectedRole === 'student' ? 'text-indigo-700' : 'text-slate-700'
                  }`}
                >
                  수강생
                </span>
                {selectedRole === 'student' && (
                  <div className="absolute top-2 right-2 w-2 h-2 bg-indigo-600 rounded-full" />
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!name.trim() || !selectedRole || isLoading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 text-white font-semibold bg-indigo-600 rounded-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                로그인 중...
              </>
            ) : (
              <>
                시작하기
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          처음이신가요? 이름을 입력하면 자동으로 계정이 생성됩니다.
        </p>
      </div>
    </div>
  )
}
