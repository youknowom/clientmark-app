import React from 'react'
import PropTypes from 'prop-types'
import { Button } from 'react-bootstrap'
import { FiInbox } from 'react-icons/fi'

/**
 * Reusable EmptyState component designed for tables, lists, and dashboards.
 * Aligns with the Sarvam AI editorial visual discipline.
 */
const EmptyState = ({
  icon: Icon = FiInbox,
  title = 'No records found',
  description = 'There are no items matching your criteria or currently available in the system.',
  actionLabel,
  onAction,
  actionIcon: ActionIcon,
  className = '',
  style = {},
}) => {
  return (
    <div
      className={`cm-empty-state text-center py-5 px-3 ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        minHeight: '220px',
        ...style,
      }}
    >
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '12px',
          backgroundColor: '#F3F4F6',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6B7280',
          fontSize: '22px',
          marginBottom: '14px',
        }}
      >
        <Icon />
      </div>

      <h5
        style={{
          fontSize: '15px',
          fontWeight: 600,
          color: '#111827',
          marginBottom: '6px',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h5>

      <p
        style={{
          fontSize: '13px',
          color: '#6B7280',
          maxWidth: '380px',
          margin: '0 auto 16px auto',
          lineHeight: '1.5',
        }}
      >
        {description}
      </p>

      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          style={{
            backgroundColor: '#111827',
            borderColor: '#111827',
            color: '#FFFFFF',
            fontSize: '12.5px',
            fontWeight: 500,
            padding: '7px 16px',
            borderRadius: '8px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.08)',
          }}
        >
          {ActionIcon && <ActionIcon size={14} />}
          {actionLabel}
        </Button>
      )}
    </div>
  )
}

EmptyState.propTypes = {
  icon: PropTypes.elementType,
  title: PropTypes.string,
  description: PropTypes.string,
  actionLabel: PropTypes.string,
  onAction: PropTypes.func,
  actionIcon: PropTypes.elementType,
  className: PropTypes.string,
  style: PropTypes.object,
}

export default EmptyState
