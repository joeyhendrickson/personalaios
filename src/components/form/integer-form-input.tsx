'use client'

import type { InputHTMLAttributes } from 'react'
import { sanitizeIntegerInput } from '@/lib/form/numeric-input'

type IntegerFormInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange' | 'inputMode'
> & {
  value: string
  onValueChange: (value: string) => void
}

/** Mobile-friendly integer field (avoids iOS quirks with type="number"). */
export function IntegerFormInput({
  value,
  onValueChange,
  className,
  ...rest
}: IntegerFormInputProps) {
  const apply = (raw: string) => onValueChange(sanitizeIntegerInput(raw))

  return (
    <input
      {...rest}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      enterKeyHint="done"
      value={value}
      onChange={(e) => apply(e.target.value)}
      onInput={(e) => apply(e.currentTarget.value)}
      className={className}
    />
  )
}
