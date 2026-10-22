import React from 'react'
import { cn } from '../../lib/utils'

export const Container = ({
  children,
  fluid = false,
  className,
  ...props
}) => {
  return (
    <div
      className={cn(
        'w-full mx-auto px-4 md:px-6',
        fluid ? 'max-w-full' : 'max-w-[1440px]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export const Row = ({ children, className, ...props }) => {
  return (
    <div
      className={cn('flex flex-wrap -mx-2.5', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export const Col = ({
  children,
  xs,
  sm,
  md,
  lg,
  xl,
  className,
  style,
  ...props
}) => {
  const getBasis = () => {
    const colVal = xl || lg || md || sm || xs
    if (colVal === 'auto') return 'auto'
    if (colVal && !isNaN(colVal)) return `${(colVal / 12) * 100}%`
    return '100%'
  }

  return (
    <div
      className={cn('px-2.5 box-border', className)}
      style={{
        flex: (xl || lg || md || sm || xs) ? `0 0 ${getBasis()}` : '1 1 0%',
        maxWidth: (xl || lg || md || sm || xs) ? getBasis() : '100%',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}

export default { Container, Row, Col }
