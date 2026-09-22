import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiMessageSquare, FiX, FiSend, FiTrash2, FiMinimize2 } from 'react-icons/fi'
import apiClient from '../api/axiosClient'
import '../views/sidebarCSS/chatbot.css'

const SUGGESTED_CHIPS = [
  'How do I add a new lead?',
  'How does WhatsApp integration work?',
  'How do I track project milestones?',
  'Explain user roles & permissions',
  'What features are in the plans?',
]

// Simple helper to format basic bold and bullet markdown in replies
const formatBotMessage = (text) => {
  if (!text) return ''
  const lines = text.split('\n')
  return lines.map((line, i) => {
    // Check if bullet line
    const isBullet = line.trim().startsWith('•') || line.trim().startsWith('- ') || line.trim().startsWith('* ')
    const cleanLine = isBullet ? line.replace(/^[\s•\-\*]+/, '') : line

    // Parse **bold**
    const parts = cleanLine.split(/(\*\*.*?\*\*)/g)
    const formatted = parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={pIdx}>{part.slice(2, -2)}</strong>
      }
      return part
    })

    if (isBullet) {
      return (
        <li key={i} style={{ marginLeft: '16px', listStyleType: 'disc' }}>
          {formatted}
        </li>
      )
    }

    if (!line.trim()) {
      return <div key={i} style={{ height: '6px' }} />
    }

    return (
      <p key={i} style={{ margin: '0 0 6px 0' }}>
        {formatted}
      </p>
    )
  })
}

const ChatbotWidget = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        'Hello! I am your Clientmark CRM Assistant. How can I help you manage your leads, pipelines, projects, or settings today?',
    },
  ])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState(() => {
    return localStorage.getItem('cm_chatbot_session') || `sess_${Date.now()}`
  })
  const messagesEndRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('cm_chatbot_session', sessionId)
  }, [sessionId])

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen, loading])

  const handleSend = async (messageText) => {
    const text = (messageText || inputValue).trim()
    if (!text || loading) return

    const userMessage = { role: 'user', content: text }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInputValue('')
    setLoading(true)

    try {
      const response = await apiClient.post('/chatbot/message', {
        message: text,
        sessionId,
        history: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
      })

      if (response.data?.success && response.data?.reply) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: response.data.reply },
        ])
        if (response.data.sessionId) {
          setSessionId(response.data.sessionId)
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content:
              'I am here to assist with leads, projects, WhatsApp integration, and permissions. Could you please rephrase your question?',
          },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            "I'm momentarily having trouble connecting. Feel free to check the sidebar navigation or ask again in a moment!",
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleClear = async () => {
    try {
      await apiClient.post('/chatbot/clear', { sessionId })
    } catch {
      // ignore
    }
    const newSession = `sess_${Date.now()}`
    setSessionId(newSession)
    setMessages([
      {
        role: 'assistant',
        content:
          'Chat history reset. How can I help you with Clientmark CRM today?',
      },
    ])
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* ── Floating Launcher ────────────────────────────────────────── */}
      <motion.button
        className="chatbot-launcher"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Open AI Assistant"
        whileTap={{ scale: 0.92 }}
      >
        <span className="chatbot-launcher-ping" />
        {isOpen ? <FiX size={22} /> : <FiMessageSquare size={22} />}
      </motion.button>

      {/* ── Chat Window ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="chatbot-window"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {/* Header */}
            <div className="chatbot-header">
              <div className="chatbot-header-left">
                <div className="chatbot-avatar">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2L2 7l10 5 10-5-10-5zm0 7L2 14l10 5 10-5-10-5z" />
                  </svg>
                </div>
                <div>
                  <h4 className="chatbot-title">Clientmark Assistant</h4>
                  <div className="chatbot-status">
                    <span className="chatbot-status-dot" /> AI CRM Assistant
                  </div>
                </div>
              </div>

              <div className="chatbot-header-actions">
                <button
                  className="chatbot-header-btn"
                  onClick={handleClear}
                  title="Clear conversation"
                >
                  <FiTrash2 size={15} />
                </button>
                <button
                  className="chatbot-header-btn"
                  onClick={() => setIsOpen(false)}
                  title="Minimize"
                >
                  <FiMinimize2 size={15} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="chatbot-messages">
              {messages.map((msg, index) => (
                <div key={index} className={`chatbot-msg-wrapper ${msg.role}`}>
                  <div className={`chatbot-bubble ${msg.role}`}>
                    {msg.role === 'assistant'
                      ? formatBotMessage(msg.content)
                      : msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="chatbot-msg-wrapper assistant">
                  <div className="chatbot-typing">
                    <div className="chatbot-typing-dot" />
                    <div className="chatbot-typing-dot" />
                    <div className="chatbot-typing-dot" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Chips */}
            <div className="chatbot-chips">
              {SUGGESTED_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  className="chatbot-chip"
                  onClick={() => handleSend(chip)}
                  disabled={loading}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="chatbot-input-area">
              <input
                type="text"
                className="chatbot-input"
                placeholder="Ask about leads, projects, WhatsApp..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <button
                className="chatbot-send-btn"
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || loading}
                aria-label="Send message"
              >
                <FiSend size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default ChatbotWidget
