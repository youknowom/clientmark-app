import React, { forwardRef } from 'react'

/**
 * Modern Clientmark Form Controls
 * Drop-in replacement for react-bootstrap Form (<Form.Group>, <Form.Label>, <Form.Control>, <Form.Select>).
 * Zero Bootstrap dependencies.
 */
export const Form = ({ children, className = '', ...props }) => (
  <form className={`cm-form ${className}`} {...props}>
    {children}
  </form>
)

export const FormGroup = ({ children, className = '', controlId, style, ...props }) => (
  <div
    id={controlId}
    className={`cm-form-group ${className}`}
    style={{
      marginBottom: 'var(--cm-space-3)',
      ...style,
    }}
    {...props}
  >
    {children}
  </div>
)

export const FormLabel = ({ children, className = '', style, htmlFor, ...props }) => (
  <label
    htmlFor={htmlFor}
    className={`cm-form-label ${className}`}
    style={{
      display: 'inline-block',
      fontSize: 'var(--cm-text-xs)',
      fontWeight: 'var(--cm-weight-semibold)',
      color: 'var(--cm-text-secondary)',
      textTransform: 'uppercase',
      letterSpacing: '0.04em',
      marginBottom: '6px',
      ...style,
    }}
    {...props}
  >
    {children}
  </label>
)

export const FormControl = forwardRef(
  ({ as = 'input', className = '', style, ...props }, ref) => {
    const Component = as
    return (
      <Component
        ref={ref}
        className={`cm-form-control ${className}`}
        style={{
          width: '100%',
          fontFamily: 'var(--cm-font-sans)',
          fontSize: 'var(--cm-text-sm)',
          padding: '8px 12px',
          backgroundColor: 'var(--cm-bg-card)',
          color: 'var(--cm-text-primary)',
          border: '1px solid var(--cm-border-default)',
          borderRadius: 'var(--cm-radius-md)',
          boxShadow: 'var(--cm-shadow-xs)',
          outline: 'none',
          boxSizing: 'border-box',
          transition: 'border-color var(--cm-duration-fast) var(--cm-ease-out), box-shadow var(--cm-duration-fast) var(--cm-ease-out)',
          ...style,
        }}
        {...props}
      />
    )
  }
)
FormControl.displayName = 'FormControl'

export const FormSelect = forwardRef(
  ({ children, className = '', style, ...props }, ref) => (
    <select
      ref={ref}
      className={`cm-form-select ${className}`}
      style={{
        width: '100%',
        fontFamily: 'var(--cm-font-sans)',
        fontSize: 'var(--cm-text-sm)',
        padding: '8px 12px',
        backgroundColor: 'var(--cm-bg-card)',
        color: 'var(--cm-text-primary)',
        border: '1px solid var(--cm-border-default)',
        borderRadius: 'var(--cm-radius-md)',
        boxShadow: 'var(--cm-shadow-xs)',
        outline: 'none',
        boxSizing: 'border-box',
        cursor: 'pointer',
        ...style,
      }}
      {...props}
    >
      {children}
    </select>
  )
)
FormSelect.displayName = 'FormSelect'

export const FormCheck = ({
  label,
  type = 'checkbox',
  id,
  className = '',
  style,
  ...props
}) => (
  <label
    htmlFor={id}
    className={`cm-flex cm-items-center cm-gap-2 ${className}`}
    style={{
      fontSize: 'var(--cm-text-sm)',
      cursor: 'pointer',
      userSelect: 'none',
      ...style,
    }}
  >
    <input
      type={type}
      id={id}
      style={{
        accentColor: 'var(--cm-brand-500)',
        cursor: 'pointer',
      }}
      {...props}
    />
    {label && <span>{label}</span>}
  </label>
)

Form.Group = FormGroup
Form.Label = FormLabel
Form.Control = FormControl
Form.Select = FormSelect
Form.Check = FormCheck

export default Form
