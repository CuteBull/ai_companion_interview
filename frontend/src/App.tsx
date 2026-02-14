import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from './components/layout/Layout'
import ChatPage from './pages/ChatPage'
import TimelinePage from './pages/TimelinePage'
import SessionDetailPage from './pages/SessionDetailPage'
import { ThemeProvider } from './contexts/ThemeContext'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Router>
          <Layout>
            <Routes>
              <Route path="/" element={<ChatPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/timeline" element={<TimelinePage />} />
              <Route path="/timeline/:sessionId" element={<SessionDetailPage />} />
            </Routes>
          </Layout>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export default App
