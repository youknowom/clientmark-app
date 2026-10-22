import React from 'react'

export const AppFooter = () => {
  return (
    <footer
      style={{
        padding: '16px 24px',
        borderTop: '1px solid var(--cm-border-subtle)',
        backgroundColor: 'var(--cm-bg-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: 'var(--cm-text-muted)',
      }}
    >
      <div>
        <span>Clientmark CRM</span>
        <span style={{ margin: '0 8px' }}>•</span>
        <span>Version 2.0</span>
      </div>
      <div>
        <span>All systems operational</span>
      </div>
    </footer>
  )
}

export default React.memo(AppFooter)
