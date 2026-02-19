import { BrowserRouter, Routes, Route } from 'react-router'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { TimelinePage } from './pages/TimelinePage'
import { NewEntryPage } from './pages/NewEntryPage'
import { StatsPage } from './pages/StatsPage'
import { AiCoachPage } from './pages/AiCoachPage'
import { HobbiesPage } from './pages/HobbiesPage'
import { ProfilePage } from './pages/ProfilePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/new" element={<NewEntryPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/ai" element={<AiCoachPage />} />
          <Route path="/hobbies" element={<HobbiesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
