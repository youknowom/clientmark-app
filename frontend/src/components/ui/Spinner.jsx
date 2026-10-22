import React from 'react'

/**
 * Modern Clientmark Spinner
 * Sizes: 'sm' | 'md' | 'lg'
 */
export const Spinner = ({
  size = 'md',
  color = 'currentColor',
  variant,
  className = '',
  style,
  ...props
}) => {
  const pixelSize = size === 'sm' ? 14 : size === 'lg' ? 28 : 20
  const strokeWidth = size === 'sm' ? 2 : 2.5

  const resolvedColor =
    variant === 'primary' || variant === 'brand'
      ? 'var(--cm-brand-500)'
      : variant === 'success'
        ? 'var(--cm-success-500)'
        : variant === 'danger'
          ? 'var(--cm-danger-500)'
          : color

  return (
    <span
      className={`cm-inline-spinner ${className}`}
      role="status"
      aria-label="Loading"
      style={{
        display: 'inline-block',
        width: `${pixelSize}px`,
        height: `${pixelSize}px`,
        border: `${strokeWidth}px solid currentColor`,
        borderTopColor: 'transparent',
        borderRadius: '50%',
        color: resolvedColor,
        animation: 'cm-spin 0.65s linear infinite',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style,
      }}
      {...props}
    />
  )
}

export default Spinner
