import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../ui/Card'

function PageMenus({ menus }) {
  const navigate = useNavigate()

  if (!menus || !menus.length) return null

  return (
    <div className="cm-grid cm-grid-cols-4 cm-gap-4">
      {menus.map((item, index) => (
        <Card
          key={index}
          interactive
          onClick={() => navigate(item.link)}
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            padding: '12px 16px',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--cm-radius-md)',
              backgroundColor: item.bg || 'var(--cm-brand-50)',
              color: 'var(--cm-brand-500)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {item.icon}
          </div>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--cm-text-primary)',
            }}
          >
            {item.label}
          </div>
        </Card>
      ))}
    </div>
  )
}

export default PageMenus
