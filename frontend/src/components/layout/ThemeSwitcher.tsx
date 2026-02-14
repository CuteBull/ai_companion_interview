import React from 'react'
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline'
import { ThemeMode, useTheme } from '../../contexts/ThemeContext'

interface ThemeSwitcherProps {
  compact?: boolean
  className?: string
}

const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ compact = false, className = '' }) => {
  const { theme, setTheme } = useTheme()
  const isDarkMode = theme === 'dark'

  const baseClass = compact
    ? `theme-switcher inline-flex items-center rounded-xl border p-1 backdrop-blur-sm ${
      isDarkMode ? 'border-zinc-700/80 bg-zinc-900/85' : 'border-stone-300/80 bg-white/85'
    }`
    : `theme-switcher inline-flex items-center rounded-2xl border p-1 backdrop-blur-sm ${
      isDarkMode ? 'border-zinc-700/80 bg-zinc-900/85' : 'border-stone-300/80 bg-white/85'
    }`

  const getButtonClass = (mode: ThemeMode) => {
    const active = theme === mode
    return `inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium transition ${
      active
        ? 'bg-teal-700 text-white shadow-sm'
        : isDarkMode
          ? 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
          : 'text-stone-600 hover:bg-stone-100 hover:text-stone-800'
    }`
  }

  return (
    <div className={`${baseClass} ${className}`.trim()}>
      <button
        type="button"
        onClick={() => setTheme('light')}
        className={getButtonClass('light')}
        aria-label="切换普通背景"
      >
        <SunIcon className="mr-1 h-4 w-4" />
        普通
      </button>
      <button
        type="button"
        onClick={() => setTheme('dark')}
        className={getButtonClass('dark')}
        aria-label="切换深色背景"
      >
        <MoonIcon className="mr-1 h-4 w-4" />
        深色
      </button>
    </div>
  )
}

export default ThemeSwitcher
