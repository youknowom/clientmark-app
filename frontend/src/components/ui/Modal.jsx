import React, { createContext, useContext } from 'react'
import { Dialog as BaseDialog } from '@base-ui/react'
import { X } from 'lucide-react'

const ModalContext = createContext({ onHide: () => {} })

/**
 * Modern Base UI Modal
 * Compatible with react-bootstrap Modal API (<Modal.Header>, <Modal.Body>, <Modal.Footer>),
 * but powered completely by @base-ui/react primitives and modern design tokens.
 * Zero Bootstrap dependencies.
 */
export const Modal = ({
  show,
  onHide,
  children,
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  centered = true,
  className = '',
  style,
  ...props
}) => {
  const sizeClasses = {
    sm: '',
    md: '',
    lg: 'cm-dialog-popup-lg',
    xl: 'cm-dialog-popup-xl',
  }

  return (
    <ModalContext.Provider value={{ onHide }}>
      <BaseDialog.Root
        open={show}
        onOpenChange={(open) => {
          if (!open) onHide?.()
        }}
      >
        <BaseDialog.Portal>
          <BaseDialog.Backdrop className="cm-dialog-backdrop" />
          <BaseDialog.Popup
            className={`cm-dialog-popup ${sizeClasses[size] || ''} ${className}`}
            style={style}
            {...props}
          >
            {children}
          </BaseDialog.Popup>
        </BaseDialog.Portal>
      </BaseDialog.Root>
    </ModalContext.Provider>
  )
}

export const ModalHeader = ({
  children,
  closeButton = true,
  className = '',
  style,
  ...props
}) => {
  const { onHide } = useContext(ModalContext)

  return (
    <div
      className={`cm-dialog-header ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--cm-space-4)',
        paddingBottom: 'var(--cm-space-3)',
        borderBottom: '1px solid var(--cm-border-subtle)',
        ...style,
      }}
      {...props}
    >
      <div style={{ flex: 1 }}>{children}</div>
      {closeButton && (
        <button
          type="button"
          onClick={onHide}
          className="cm-dialog-close"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>
      )}
    </div>
  )
}

export const ModalTitle = ({ children, className = '', style, ...props }) => (
  <BaseDialog.Title
    className={`cm-dialog-title ${className}`}
    style={{
      fontSize: 'var(--cm-text-lg)',
      fontWeight: 'var(--cm-weight-bold)',
      margin: 0,
      color: 'var(--cm-text-primary)',
      ...style,
    }}
    {...props}
  >
    {children}
  </BaseDialog.Title>
)

export const ModalBody = ({ children, className = '', style, ...props }) => (
  <div
    className={`cm-dialog-body ${className}`}
    style={{
      padding: '4px 0 var(--cm-space-3)',
      ...style,
    }}
    {...props}
  >
    {children}
  </div>
)

export const ModalFooter = ({ children, className = '', style, ...props }) => (
  <div
    className={`cm-dialog-footer ${className}`}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 'var(--cm-space-2)',
      marginTop: 'var(--cm-space-4)',
      paddingTop: 'var(--cm-space-3)',
      borderTop: '1px solid var(--cm-border-subtle)',
      ...style,
    }}
    {...props}
  >
    {children}
  </div>
)

Modal.Header = ModalHeader
Modal.Title = ModalTitle
Modal.Body = ModalBody
Modal.Footer = ModalFooter

export default Modal
