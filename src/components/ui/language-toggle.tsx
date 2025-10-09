'use client'

import { useLanguage } from '@/contexts/language-context'
import { Globe } from 'lucide-react'

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'es' : 'en')
  }

  return (
    <div className="flex items-center space-x-2">
      <Globe className="h-4 w-4 text-gray-600" />
      <button
        onClick={toggleLanguage}
        className="flex items-center space-x-2 px-3 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 transition-colors text-sm font-medium"
        title={`Switch to ${language === 'en' ? 'Spanish' : 'English'}`}
      >
        <span
          className={`px-2 py-0.5 rounded text-xs ${language === 'en' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}
        >
          EN
        </span>
        <span
          className={`px-2 py-0.5 rounded text-xs ${language === 'es' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}
        >
          ES
        </span>
      </button>
    </div>
  )
}
