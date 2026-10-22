import React from 'react'

function PageHeader({ pageHeaderData }) {
  const { title, disc } = pageHeaderData || {}
  return (
    <div
      className="cm-card"
      style={{
        padding: '16px 20px',
        margin: '16px 0 20px',
        border: '1px solid var(--cm-border-subtle)',
        boxShadow: 'var(--cm-shadow-xs)',
      }}
    >
      <div className="cm-flex cm-items-center cm-justify-between">
        <div>
          <h2
            style={{
              fontSize: '17px',
              fontWeight: 700,
              margin: 0,
              color: 'var(--cm-text-primary)',
            }}
          >
            {title}
          </h2>
          {disc && (
            <p
              style={{
                fontSize: '12.5px',
                color: 'var(--cm-text-secondary)',
                margin: '4px 0 0',
              }}
            >
              {disc}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default PageHeader
