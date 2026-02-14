import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChatBubbleLeftRightIcon, ClockIcon } from '@heroicons/react/24/outline'

const Navbar: React.FC = () => {
  const location = useLocation()

  const navItems = [
    { path: '/chat', label: '对话', icon: ChatBubbleLeftRightIcon },
    { path: '/timeline', label: '朋友圈', icon: ClockIcon },
  ]
  const isChatPage = location.pathname === '/' || location.pathname === '/chat'

  return (
    <nav className="sticky top-0 z-30 px-4 pt-4 md:px-6">
      <div className="glass-top mx-auto w-full max-w-6xl px-4 py-4 md:px-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <Link to="/chat" className="flex items-start space-x-3">
            <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-700 to-emerald-600 text-white shadow-lg shadow-teal-700/30">
              <ChatBubbleLeftRightIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-stone-900">
                多模态对话
              </h1>
              <p className="text-xs text-stone-500 sm:block">AI陪伴 · 图文语音</p>
              {isChatPage && (
                <p className="mt-1 hidden text-sm text-stone-600 lg:block">
                  支持文本、图片、语音输入。你可以自由倾诉，我会持续记录上下文并陪你聊下去。
                </p>
              )}
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            {isChatPage && (
              <div className="panel-muted px-3 py-1.5 text-xs text-teal-800">
                快捷键：Enter 发送，Shift + Enter 换行
              </div>
            )}
            <div className="flex items-center rounded-2xl bg-stone-100/80 p-1.5">
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
                          ? 'bg-white text-teal-700 shadow-sm shadow-stone-300/70'
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
