'use client'

import type { ElementType, ReactNode } from 'react'
import { useTranslatedText } from '@/hooks/use-translated-text'

type TranslatedTextProps = {
  text: string | null | undefined
  as?: ElementType
  className?: string
  children?: never
}

export function TranslatedText({ text, as: Component = 'span', className }: TranslatedTextProps) {
  const translated = useTranslatedText(text)
  if (!translated) return null
  return <Component className={className}>{translated as ReactNode}</Component>
}
