import React from 'react'
import { useLocation } from 'react-router-dom'
import Navbar from './Navbar'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation()
  const isTimelinePage = location.pathname.startsWith('/timeline')

  return (
    <div className={`min-h-screen ${isTimelinePage ? 'bg-black' : ''}`}>
      {!isTimelinePage && <Navbar />}
      <main className={`relative mx-auto w-full ${isTimelinePage ? 'max-w-none px-0 pb-0 pt-0' : 'max-w-6xl px-4 pb-10 pt-7 md:px-6 md:pt-10'}`}>
        <div className="fade-rise">
          {children}
        </div>
      </main>
    </div>
  )
}

export default Layout
