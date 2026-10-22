import React, { useState } from 'react'

export const ClientmarkCopilot = () => {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hey there! I am your Clientmark AI guide. Ask me anything about our sales pipeline, WhatsApp automation, or deal-to-milestone handovers.' },
  ])
  const [input, setInput] = useState('')

  const handleSend = (e) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMsg = input.trim()
    setMessages((prev) => [...prev, { sender: 'user', text: userMsg }])
    setInput('')

    setTimeout(() => {
      let reply = 'Clientmark combines lead qualification, 1-click WhatsApp quotes, and instant milestone handovers into one seamless workspace.'
      const lower = userMsg.toLowerCase()
      if (lower.includes('price') || lower.includes('cost')) {
        reply = 'We offer a forever-free Starter plan, Studio Growth at ₹1,199/mo, and Scale Enterprise at ₹2,399/mo with full 14-day trials!'
      } else if (lower.includes('whatsapp')) {
        reply = 'With our native WhatsApp integration, you can dispatch quotes and updates directly from any lead card without manual typing.'
      } else if (lower.includes('demo') || lower.includes('try')) {
        reply = 'You can click "Live Sandbox" at the top of the page right now to test the fully functional interactive environment!'
      }
      setMessages((prev) => [...prev, { sender: 'bot', text: reply }])
    }, 600)
  }

  return (
    <>
      {/* Floating Animated Avatar Button with Blinking Eyes */}
      <div
        className="cm-floating-bot"
        onClick={() => setOpen(!open)}
        title="Ask Clientmark Copilot"
        role="button"
        aria-label="Ask Clientmark Copilot"
      >
        <div className="cm-bot-eyes">
          <span className="cm-bot-eye" />
          <span className="cm-bot-eye" />
        </div>
      </div>

      {/* Slide-Up Chat Panel */}
      {open && (
        <div
          style={{
            position: 'fixed',
            bottom: '104px',
            right: '24px',
            zIndex: 51,
            width: '380px',
            maxWidth: 'calc(100vw - 36px)',
            height: '500px',
            background: '#FFFFFF',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            borderRadius: '24px',
            boxShadow: '0 24px 60px rgba(22, 23, 34, 0.18), 0 4px 12px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: 'var(--cm-font, Poppins)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              background: '#F8F8FA',
              borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: '#161722',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div style={{ display: 'flex', gap: '4px' }}>
                  <span style={{ width: '3px', height: '10px', background: '#FFFFFF', borderRadius: '2px' }} />
                  <span style={{ width: '3px', height: '10px', background: '#FFFFFF', borderRadius: '2px' }} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#161722' }}>Clientmark Copilot</div>
                <div style={{ fontSize: '11px', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                  Online & Ready
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#8D8D96',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '4px',
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          {/* Messages Area */}
          <div
            style={{
              flex: 1,
              padding: '16px 18px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              backgroundColor: '#FFFFFF',
            }}
          >
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '84%',
                  padding: '10px 14px',
                  borderRadius: '16px',
                  fontSize: '13px',
                  lineHeight: 1.5,
                  background: m.sender === 'user' ? '#161722' : '#F0F0F4',
                  color: m.sender === 'user' ? '#FFFFFF' : '#161722',
                  borderTopRightRadius: m.sender === 'user' ? '4px' : '16px',
                  borderTopLeftRadius: m.sender === 'bot' ? '4px' : '16px',
                }}
              >
                {m.text}
              </div>
            ))}
          </div>

          {/* Input Footer */}
          <form
            onSubmit={handleSend}
            style={{
              padding: '12px 14px',
              borderTop: '1px solid rgba(0, 0, 0, 0.08)',
              background: '#F8F8FA',
              display: 'flex',
              gap: '8px',
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about Clientmark..."
              style={{
                flex: 1,
                background: '#FFFFFF',
                border: '1px solid rgba(0, 0, 0, 0.12)',
                borderRadius: '9999px',
                padding: '8px 16px',
                fontSize: '13px',
                color: '#161722',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              style={{
                background: '#161722',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '9999px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  )
}

export default ClientmarkCopilot
