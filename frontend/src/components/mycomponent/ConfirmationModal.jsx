import React from 'react'
import { Trash2, CheckCircle2, AlertTriangle } from 'lucide-react'
import { Dialog } from '../ui/Dialog'
import { Button } from '../ui/Button'

export const ConfirmationModal = ({
  show,
  message,
  onConfirm,
  onCancel,
  variant = 'danger',
  confirmText,
  cancelText = 'Cancel',
}) => {
  const isDestructive = variant === 'danger'
  const resolvedConfirmText =
    confirmText || (isDestructive ? 'Delete' : 'Confirm')

  return (
    <Dialog
      open={show}
      onOpenChange={(open) => {
        if (!open) onCancel?.()
      }}
      size="sm"
    >
      <div style={{ textAlign: 'center', padding: '10px 0 6px' }}>
        {/* Icon */}
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: isDestructive ? 'var(--cm-danger-50)' : 'var(--cm-brand-50)',
            color: isDestructive ? 'var(--cm-danger-600)' : 'var(--cm-brand-500)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          {isDestructive ? <Trash2 size={22} /> : <AlertTriangle size={22} />}
        </div>

        {/* Message */}
        <p
          style={{
            fontSize: '14.5px',
            fontWeight: 600,
            color: 'var(--cm-text-primary)',
            lineHeight: 1.55,
            margin: '0 0 24px 0',
          }}
        >
          {message}
        </p>

        {/* Actions */}
        <div className="cm-flex cm-gap-3 cm-justify-center">
          <Button
            variant="secondary"
            onClick={onCancel}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            {cancelText}
          </Button>

          <Button
            variant={isDestructive ? 'danger' : 'primary'}
            onClick={onConfirm}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            {resolvedConfirmText}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}

export default ConfirmationModal
