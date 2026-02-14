import React from 'react'
import Navbar from './Navbar'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="relative mx-auto w-full max-w-6xl px-4 pb-10 pt-7 md:px-6 md:pt-10">
        <div className="fade-rise">
          {children}
        </div>
      </main>
    </div>
  )
}

export default Layout
