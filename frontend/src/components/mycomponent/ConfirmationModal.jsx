import React from 'react'
import { Modal } from 'react-bootstrap'

const ConfirmationModal = ({
  show,
  message,
  onConfirm,
  onCancel,
  variant = 'danger',
  confirmText,
  cancelText = 'Cancel',
}) => {
  const isDestructive = variant === 'danger'
  const isPrimary = variant === 'primary'

  const resolvedConfirmText =
    confirmText || (isDestructive ? 'Delete' : isPrimary ? 'Save' : 'Confirm')

  const getIcon = () => {
    if (isDestructive) {
      return (
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: '#FEF2F2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#DC2626"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
          </svg>
        </div>
      )
    }

    return (
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: '#EFF6FF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#1A1F36"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>
    )
  }

  const getConfirmButtonBackground = () => {
    if (isDestructive) return '#DC2626'
    return 'var(--primary-color, #1A1F36)'
  }

  return (
    <Modal show={show} onHide={onCancel} centered size="sm">
      <Modal.Body className="p-4 text-center">
        {getIcon()}

        <p
          style={{
            fontSize: '14.5px',
            fontWeight: '600',
            color: '#0F0F0F',
            lineHeight: 1.55,
            margin: 0,
          }}
        >
          {message}
        </p>
      </Modal.Body>

      <Modal.Footer
        className="d-flex justify-content-center gap-2 border-0 pt-0 pb-4 px-4"
        style={{ borderTop: 'none' }}
      >
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '8px 16px',
            fontSize: '13.5px',
            fontWeight: '600',
            color: '#374151',
            background: '#FFFFFF',
            border: '1px solid #E8E8E5',
            borderRadius: '7px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'border-color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#1A1F36')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#E8E8E5')}
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          style={{
            flex: 1,
            padding: '8px 16px',
            fontSize: '13.5px',
            fontWeight: '600',
            color: '#FFFFFF',
            background: getConfirmButtonBackground(),
            border: 'none',
            borderRadius: '7px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = isDestructive ? '#B91C1C' : '#2D3561'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = getConfirmButtonBackground()
          }}
        >
          {resolvedConfirmText}
        </button>
      </Modal.Footer>
    </Modal>
  )
}

export default ConfirmationModal
