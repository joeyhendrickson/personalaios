import * as React from 'react'
import { cn } from '@/lib/utils'

export type LifeStacksCardVariant = 'default' | 'glass' | 'muted' | 'accent'

const variantClasses: Record<LifeStacksCardVariant, string> = {
  default: 'bg-card border-border shadow-sm',
  glass: 'bg-card/80 backdrop-blur-sm border-border shadow-md',
  muted: 'bg-muted/50 border-border shadow-sm',
  accent: 'bg-accent/40 border-primary/20 shadow-sm',
}

export function lifeStacksCardClassName(
  variant: LifeStacksCardVariant = 'glass',
  className?: string
) {
  return cn('rounded-lg border text-card-foreground', variantClasses[variant], className)
}

export interface LifeStacksCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: LifeStacksCardVariant
}

export function LifeStacksCard({
  variant = 'glass',
  className,
  children,
  ...props
}: LifeStacksCardProps) {
  return (
    <div className={lifeStacksCardClassName(variant, className)} {...props}>
      {children}
    </div>
  )
}

export interface LifeStacksCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
}

export function LifeStacksCardHeader({
  interactive,
  className,
  children,
  ...props
}: LifeStacksCardHeaderProps) {
  return (
    <div
      className={cn(
        'p-6 pb-4',
        interactive && 'cursor-pointer select-none hover:bg-accent/30 transition-colors',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function LifeStacksCardBody({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 pb-6', className)} {...props}>
      {children}
    </div>
  )
}

export function LifeStacksCardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 pb-6 pt-0 flex flex-wrap gap-2', className)} {...props}>
      {children}
    </div>
  )
}
