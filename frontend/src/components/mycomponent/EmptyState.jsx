import React from 'react'
import PropTypes from 'prop-types'
import { Inbox } from 'lucide-react'
import { Button } from '../ui/Button'

/**
 * Reusable EmptyState component designed for tables, lists, and dashboards.
 * Zero Bootstrap dependencies.
 */
const EmptyState = ({
  icon: Icon = Inbox,
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
      className={`cm-empty-state ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '48px 24px',
        minHeight: '220px',
        ...style,
      }}
    >
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: 'var(--cm-radius-lg)',
          backgroundColor: 'var(--cm-bg-subtle)',
          border: '1px solid var(--cm-border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--cm-text-muted)',
          marginBottom: '14px',
        }}
      >
        <Icon size={24} />
      </div>

      <h5
        style={{
          fontSize: '15px',
          fontWeight: 700,
          color: 'var(--cm-text-primary)',
          marginBottom: '6px',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h5>

      <p
        style={{
          fontSize: '13px',
          color: 'var(--cm-text-secondary)',
          maxWidth: '380px',
          margin: '0 auto 18px auto',
          lineHeight: '1.5',
        }}
      >
        {description}
      </p>

      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          size="sm"
          leftIcon={ActionIcon ? <ActionIcon size={14} /> : undefined}
        >
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
