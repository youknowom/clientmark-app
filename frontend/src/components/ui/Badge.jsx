import React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border border-transparent bg-primary text-primary-foreground shadow-sm',
        brand: 'border border-primary/25 bg-primary/10 text-primary hover:bg-primary/20',
        primary: 'border border-primary/25 bg-primary/10 text-primary hover:bg-primary/20',
        secondary: 'border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80',
        neutral: 'border border-border bg-secondary text-secondary-foreground',
        destructive: 'border border-destructive/25 bg-destructive/10 text-destructive',
        danger: 'border border-rose-500/25 bg-rose-500/10 text-rose-600 dark:text-rose-400',
        success: 'border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        warning: 'border border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400',
        info: 'border border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-400',
        outline: 'border border-border text-foreground',
      },
    },
    defaultVariants: {
      variant: 'brand',
    },
  }
)

export const Badge = ({
  children,
  variant = 'brand',
  dot = false,
  className,
  ...props
}) => {
  const dotColor = {
    brand: 'bg-primary',
    primary: 'bg-primary',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-rose-500',
    destructive: 'bg-rose-500',
    info: 'bg-sky-500',
    neutral: 'bg-muted-foreground',
    secondary: 'bg-muted-foreground',
  }[variant] || 'bg-current'

  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span className={cn('h-1.5 w-1.5 rounded-full', dotColor)} />
      )}
      {children}
    </span>
  )
}

export default Badge
