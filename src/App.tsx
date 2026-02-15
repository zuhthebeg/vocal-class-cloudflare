import { Routes, Route, Navigate } from 'react-router'
import { Layout } from './components/layout'
import { LandingPage, LoginPage } from './pages'
import { useAuthStore } from './store/authStore'

function TeacherDashboard() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">강사 대시보드</h1>
      <p className="text-slate-600">Phase 2에서 구현 예정</p>
    </div>
  )
}

function StudentDashboard() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-4">수강생 대시보드</h1>
      <p className="text-slate-600">Phase 2에서 구현 예정</p>
    </div>
  )
}

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: 'teacher' | 'student' }) {
  const { user } = useAuthStore()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (role && user.role !== role) {
    return <Navigate to={user.role === 'teacher' ? '/teacher' : '/student'} replace />
  }

  return <>{children}</>
}

export default function App() {
  const { user } = useAuthStore()

  return (
    <Layout>
      <Routes>
        <Route
          path="/"
          element={
            user ? (
              <Navigate to={user.role === 'teacher' ? '/teacher' : '/student'} replace />
            ) : (
              <LandingPage />
            )
          }
        />
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to={user.role === 'teacher' ? '/teacher' : '/student'} replace />
            ) : (
              <LoginPage />
            )
          }
        />
        <Route
          path="/teacher/*"
          element={
            <ProtectedRoute role="teacher">
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/*"
          element={
            <ProtectedRoute role="student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Layout>
  )
}
