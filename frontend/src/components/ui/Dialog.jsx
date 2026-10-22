import React from 'react'
import { Dialog as BaseDialog } from '@base-ui/react'
import { X } from 'lucide-react'

/**
 * Modern Clientmark Dialog (replaces Modal and CModal)
 * Built with @base-ui/react for accessibility, keyboard trapping & focus management.
 */
export const Dialog = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  trigger,
  size = 'md', // 'sm' | 'md' | 'lg' | 'xl'
  className = '',
}) => {
  const sizeClasses = {
    sm: '',
    md: '',
    lg: 'cm-dialog-popup-lg',
    xl: 'cm-dialog-popup-xl',
  }

  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <BaseDialog.Trigger render={trigger} />}
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className="cm-dialog-backdrop" />
        <BaseDialog.Popup className={`cm-dialog-popup ${sizeClasses[size] || ''} ${className}`}>
          {(title || onOpenChange) && (
            <div className="cm-dialog-header">
              {title ? (
                <BaseDialog.Title className="cm-dialog-title">{title}</BaseDialog.Title>
              ) : (
                <div />
              )}
              <BaseDialog.Close className="cm-dialog-close" aria-label="Close dialog">
                <X size={18} />
              </BaseDialog.Close>
            </div>
          )}
          {description && (
            <BaseDialog.Description
              style={{
                fontSize: 'var(--cm-text-sm)',
                color: 'var(--cm-text-secondary)',
                marginBottom: 'var(--cm-space-4)',
              }}
            >
              {description}
            </BaseDialog.Description>
          )}
          <div>{children}</div>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  )
}

export default Dialog
