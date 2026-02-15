import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChatBubbleLeftRightIcon, ClockIcon } from '@heroicons/react/24/outline'
import ThemeSwitcher from './ThemeSwitcher'
import { useTheme } from '../../contexts/ThemeContext'

const Navbar: React.FC = () => {
  const location = useLocation()
  const { theme } = useTheme()
  const isDarkMode = theme === 'dark'

  const navItems = [
    { path: '/chat', label: '对话', icon: ChatBubbleLeftRightIcon },
    { path: '/timeline', label: '朋友圈', icon: ClockIcon },
  ]
  const isChatPage = location.pathname === '/' || location.pathname === '/chat'
  const isTimelinePage = location.pathname.startsWith('/timeline')
  const brandTitle = isTimelinePage ? '朋友圈' : 'AI陪伴对话'
  const brandSubtitle = isTimelinePage ? '生活记录 · 点赞评论' : '倾诉心事，温柔回应'
  const brandDescription = isTimelinePage
    ? '在这里记录当下、发布图片、和朋友互动。'
    : '支持文字、图片、语音输入，我会记住上下文，认真接住你的每一次表达。'

  return (
    <nav className="sticky top-0 z-30 px-4 pt-4 md:px-6">
      <div className="glass-top mx-auto w-full max-w-6xl px-4 py-4 md:px-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Link to="/chat" className="flex items-start space-x-3">
            <div className={`mt-0.5 flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl shadow-lg shadow-teal-700/20 ring-1 ${
              isDarkMode ? 'bg-zinc-900 ring-zinc-700/70' : 'bg-white ring-teal-100'
            }`}>
              <img
                src="/assistant-avatar.svg"
                alt="AI陪伴助手头像"
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <h1 className={`text-2xl font-semibold ${isDarkMode ? 'text-zinc-100' : 'text-stone-900'}`}>
                {brandTitle}
              </h1>
              <p className={`text-xs sm:block ${isDarkMode ? 'text-zinc-400' : 'text-stone-500'}`}>{brandSubtitle}</p>
              {(isChatPage || isTimelinePage) && (
                <p className={`mt-1 hidden text-sm lg:block ${isDarkMode ? 'text-zinc-300' : 'text-stone-600'}`}>
                  {brandDescription}
                </p>
              )}
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            <ThemeSwitcher compact />
            {isChatPage && (
              <div className={`panel-muted px-3 py-1.5 text-xs ${isDarkMode ? 'text-teal-200' : 'text-teal-800'}`}>
                快捷键：Enter 发送，Shift + Enter 换行
              </div>
            )}
            <div className={`flex items-center rounded-2xl p-1.5 ${
              isDarkMode ? 'bg-zinc-900/80' : 'bg-stone-100/80'
            }`}>
              <div className="flex space-x-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = item.path === '/chat'
                    ? location.pathname === '/' || location.pathname === '/chat'
                    : location.pathname.startsWith('/timeline')

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center rounded-xl px-3 py-2 text-sm font-medium transition ${
                        isActive
                          ? isDarkMode
                            ? 'bg-zinc-800 text-teal-300 shadow-sm shadow-zinc-950/70'
                            : 'bg-white text-teal-700 shadow-sm shadow-stone-300/70'
                          : isDarkMode
                            ? 'text-zinc-300 hover:bg-zinc-800/70 hover:text-zinc-100'
                            : 'text-stone-600 hover:bg-white/70 hover:text-stone-800'
                      }`}
                    >
                      <Icon className="w-5 h-5 mr-2" />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
