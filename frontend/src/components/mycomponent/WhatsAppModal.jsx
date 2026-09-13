import React, { useEffect, useState, useRef } from 'react'
import { Modal, Spinner } from 'react-bootstrap'
import {
  FaWhatsapp,
  FaPaperPlane,
  FaPlus,
  FaSave,
  FaArrowLeft,
  FaTimes,
  FaCheck,
  FaChevronDown,
  FaTrash,
} from 'react-icons/fa'
import apiClient from '../../api/axiosClient'
import toast from 'react-hot-toast'
import '../../views/sidebarCSS/Whatsappmodal.css'

const MAX_CHARS = 1024

export default function WhatsAppModal({ show, onHide, lead, onSend }) {
  const [templates, setTemplates] = useState([])
  const [selectedTpl, setSelectedTpl] = useState('')
  const [customMsg, setCustomMsg] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newText, setNewText] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [sendSuccess, setSendSuccess] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const dropdownRef = useRef(null)

  useEffect(() => {
    if (show) {
      fetchTemplates()
      reset()
    }
  }, [show])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const reset = () => {
    setSelectedTpl('')
    setCustomMsg('')
    setIsAdding(false)
    setNewName('')
    setNewText('')
    setIsSending(false)
    setSendSuccess(false)
    setDeleting(false)
    setDropdownOpen(false)
  }

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get('/lead/whatsapp-templates')
      setTemplates(res.data.data || [])
    } catch {
      toast.error('Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTemplate = async (id, e) => {
    e.stopPropagation() // Prevent dropdown from closing
    setDeleting(true)
    try {
      await apiClient.delete(`/lead/whatsapp-template/${id}`)
      toast.success('Template deleted!')
      if (selectedTpl === id) {
        setSelectedTpl('')
        setCustomMsg('')
      }
      fetchTemplates()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete')
    } finally {
      setDeleting(false)
    }
  }

  const handleTplSelect = (tpl) => {
    setSelectedTpl(tpl._id)
    setCustomMsg(tpl.templateText)
    setDropdownOpen(false)
  }

  const handleSaveTemplate = async () => {
    if (!newName.trim() || !newText.trim()) {
      toast.error('Both fields required')
      return
    }
    setSaving(true)
    try {
      await apiClient.post('/lead/whatsapp-template', {
        templateName: newName,
        templateText: newText,
      })
      toast.success('Template saved!')
      setNewName('')
      setNewText('')
      setIsAdding(false)
      fetchTemplates()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleSend = async () => {
    if (!customMsg.trim()) {
      toast.error('Enter a message')
      return
    }
    setIsSending(true)
    try {
      await onSend(customMsg)
      setSendSuccess(true)
      setTimeout(() => {
        onHide()
        reset()
      }, 1500)
    } catch {
      setIsSending(false)
      toast.error('Failed to send')
    }
  }

  const charPct = Math.min((customMsg.length / MAX_CHARS) * 100, 100)
  const charColor = charPct > 90 ? '#dc3545' : charPct > 70 ? '#fd7e14' : '#25d366'

  const selectedTemplate = templates.find((t) => t._id === selectedTpl)

  return (
    <Modal
      show={show}
      onHide={() => !isSending && (onHide(), reset())}
      size="md"
      centered
      backdrop={isSending ? 'static' : true}
      keyboard={!isSending}
      className="whatsapp-modal"
    >
      {/* ─── COMPACT HEADER ─── */}
      <Modal.Header closeButton={!isSending} style={{ padding: '10px 16px' }}>
        <div className="d-flex align-items-center gap-2">
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.22)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <FaWhatsapp size={18} />
          </div>
          <div style={{ lineHeight: 1.25 }}>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Send WhatsApp Message</div>
            {lead && (
              <div style={{ fontSize: '0.72rem', opacity: 0.85 }}>
                {lead.fullName || '—'}
                {(lead.whatsappNo || lead.mobileNo) && (
                  <span className="ms-2">· {lead.whatsappNo || lead.mobileNo}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </Modal.Header>

      {/* ─── BODY ─── */}
      <Modal.Body style={{ padding: '16px 20px', position: 'relative' }}>
        {/* SUCCESS OVERLAY */}
        {sendSuccess && (
          <div className="success-overlay">
            <div className="success-animation">
              <div className="success-checkmark">
                <FaCheck size={38} />
              </div>
              <h4 className="mt-3">Sent!</h4>
              <p className="text-muted" style={{ fontSize: 13 }}>
                Closing…
              </p>
            </div>
          </div>
        )}

        {!isAdding ? (
          <>
            {/* CUSTOM TEMPLATE DROPDOWN */}
            <div className="mb-3">
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#495057',
                  marginBottom: 4,
                  display: 'block',
                }}
              >
                Select Template
              </label>
              <div className="d-flex align-items-center gap-2">
                <div style={{ flex: 1, position: 'relative' }} ref={dropdownRef}>
                  {loading ? (
                    <div className="d-flex align-items-center gap-2" style={{ height: 34 }}>
                      <Spinner animation="border" size="sm" variant="success" />
                      <span style={{ fontSize: 12, color: '#6c757d' }}>Loading…</span>
                    </div>
                  ) : (
                    <>
                      {/* Custom Dropdown Button */}
                      <button
                        onClick={() => !isSending && setDropdownOpen(!dropdownOpen)}
                        disabled={isSending}
                        style={{
                          width: '100%',
                          height: 34,
                          borderRadius: 8,
                          border: '1px solid #dee2e6',
                          background: 'white',
                          fontSize: 13,
                          padding: '4px 32px 4px 12px',
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          color: selectedTemplate ? '#212529' : '#6c757d',
                        }}
                      >
                        <span>
                          {selectedTemplate ? selectedTemplate.templateName : 'Choose a template'}
                        </span>
                        <FaChevronDown
                          size={10}
                          style={{
                            transition: 'transform 0.2s',
                            transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          }}
                        />
                      </button>

                      {/* Dropdown Menu */}
                      {dropdownOpen && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            marginTop: 4,
                            background: 'white',
                            border: '1px solid #dee2e6',
                            borderRadius: 8,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            maxHeight: 200,
                            overflowY: 'auto',
                            zIndex: 1000,
                          }}
                        >
                          {templates.length === 0 ? (
                            <div
                              style={{
                                padding: '12px',
                                textAlign: 'center',
                                color: '#6c757d',
                                fontSize: 12,
                              }}
                            >
                              No templates yet
                            </div>
                          ) : (
                            templates.map((tpl) => (
                              <div
                                key={tpl._id}
                                onClick={() => handleTplSelect(tpl)}
                                style={{
                                  padding: '8px 12px',
                                  fontSize: 13,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  background: selectedTpl === tpl._id ? '#f8f9fa' : 'white',
                                  transition: 'background 0.15s',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#f8f9fa')}
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.background =
                                    selectedTpl === tpl._id ? '#f8f9fa' : 'white')
                                }
                              >
                                <span style={{ flex: 1 }}>{tpl.templateName}</span>
                                <button
                                  onClick={(e) => handleDeleteTemplate(tpl._id, e)}
                                  disabled={deleting}
                                  title="Delete Template"
                                  style={{
                                    height: 24,
                                    width: 24,
                                    borderRadius: '50%',
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#dc3545',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: 0,
                                    transition: 'background 0.15s',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.stopPropagation()
                                    e.currentTarget.style.background = '#fee'
                                  }}
                                  onMouseLeave={(e) => {
                                    e.stopPropagation()
                                    e.currentTarget.style.background = 'transparent'
                                  }}
                                >
                                  {deleting ? (
                                    <Spinner animation="border" size="sm" />
                                  ) : (
                                    <FaTrash size={10} />
                                  )}
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <button
                  onClick={() => setIsAdding(true)}
                  disabled={isSending}
                  title="New Template"
                  style={{
                    height: 34,
                    width: 34,
                    borderRadius: 8,
                    border: '1.5px solid #25d366',
                    background: 'white',
                    color: '#25d366',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all .2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#25d366'
                    e.currentTarget.style.color = 'white'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white'
                    e.currentTarget.style.color = '#25d366'
                  }}
                >
                  <FaPlus size={12} />
                </button>
              </div>
            </div>

            {/* MESSAGE EDITOR */}
            <div>
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#495057' }}>
                  Message
                </label>
                {selectedTpl && (
                  <button
                    onClick={() => {
                      setSelectedTpl('')
                      setCustomMsg('')
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: 11,
                      color: '#6c757d',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    <FaTimes size={10} className="me-1" />
                    Clear
                  </button>
                )}
              </div>
              <textarea
                className="message-textarea w-100"
                rows={5}
                placeholder="Type a message or pick a template above…"
                value={customMsg}
                onChange={(e) => e.target.value.length <= MAX_CHARS && setCustomMsg(e.target.value)}
                disabled={isSending}
                style={{ resize: 'vertical', fontSize: 13 }}
              />
              {/* char progress */}
              <div className="d-flex align-items-center gap-2 mt-1">
                <div style={{ flex: 1, height: 3, background: '#e9ecef', borderRadius: 4 }}>
                  <div
                    style={{
                      width: `${charPct}%`,
                      height: '100%',
                      background: charColor,
                      borderRadius: 4,
                      transition: 'width .2s, background .3s',
                    }}
                  />
                </div>
                <small style={{ color: charColor, fontWeight: 600, fontSize: 11 }}>
                  {customMsg.length}/{MAX_CHARS}
                </small>
              </div>

              {/* preview bubble */}
              {customMsg.trim() && (
                <div
                  style={{
                    marginTop: 10,
                    padding: '8px 12px',
                    background: '#dcf8c6',
                    borderRadius: '2px 10px 10px 10px',
                    fontSize: 12,
                    color: '#333',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    lineHeight: 1.5,
                    boxShadow: '0 1px 2px rgba(0,0,0,.08)',
                    maxHeight: 80,
                    overflowY: 'auto',
                  }}
                >
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: '#25d366',
                      display: 'block',
                      marginBottom: 3,
                    }}
                  >
                    Preview
                  </span>
                  {customMsg}
                </div>
              )}
            </div>
          </>
        ) : (
          /* ─── ADD TEMPLATE FORM ─── */
          <div>
            <button
              onClick={() => {
                setIsAdding(false)
                setNewName('')
                setNewText('')
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#6c757d',
                fontSize: 12,
                cursor: 'pointer',
                padding: 0,
                marginBottom: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <FaArrowLeft size={11} /> Back to Templates
            </button>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: '#212529' }}>
              Create New Template
            </div>
            <div className="mb-2">
              <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>
                Template Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control form-control-sm form-control-custom"
                placeholder="e.g. Welcome Message"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                disabled={saving}
                style={{ fontSize: 13 }}
              />
            </div>
            <div className="mb-3">
              <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: 'block' }}>
                Message Text <span className="text-danger">*</span>
              </label>
              <textarea
                className="form-control form-control-custom message-textarea"
                rows={5}
                placeholder="Write the template message…"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                disabled={saving}
                style={{ fontSize: 13, resize: 'vertical' }}
              />
              <small className="text-muted" style={{ fontSize: 11 }}>
                {newText.length} characters
              </small>
            </div>
            <div className="d-flex gap-2">
              <button
                onClick={handleSaveTemplate}
                disabled={saving || !newName.trim() || !newText.trim()}
                style={{
                  flex: 1,
                  height: 36,
                  borderRadius: 8,
                  border: 'none',
                  background: 'linear-gradient(135deg,#25d366,#128c7e)',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  opacity: saving || !newName.trim() || !newText.trim() ? 0.6 : 1,
                }}
              >
                {saving ? (
                  <>
                    <Spinner animation="border" size="sm" /> Saving…
                  </>
                ) : (
                  <>
                    <FaSave size={12} /> Save Template
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setIsAdding(false)
                  setNewName('')
                  setNewText('')
                }}
                disabled={saving}
                style={{
                  height: 36,
                  paddingInline: 16,
                  borderRadius: 8,
                  border: '1.5px solid #dee2e6',
                  background: 'white',
                  color: '#6c757d',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal.Body>

      {/* ─── FOOTER ─── */}
      {!isAdding && (
        <Modal.Footer style={{ padding: '10px 20px', background: '#f8f9fa', gap: 8 }}>
          <button
            onClick={() => !isSending && (onHide(), reset())}
            disabled={isSending}
            style={{
              height: 34,
              paddingInline: 18,
              borderRadius: 20,
              border: '1.5px solid #dee2e6',
              background: 'white',
              color: '#6c757d',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={!customMsg.trim() || isSending}
            style={{
              height: 34,
              paddingInline: 20,
              borderRadius: 20,
              border: 'none',
              background: 'linear-gradient(135deg,#25d366,#128c7e)',
              color: 'white',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              opacity: !customMsg.trim() || isSending ? 0.65 : 1,
              transition: 'opacity .2s',
            }}
          >
            {isSending ? (
              <>
                <Spinner animation="border" size="sm" /> Sending…
              </>
            ) : (
              <>
                <FaPaperPlane size={12} /> Send Message
              </>
            )}
          </button>
        </Modal.Footer>
      )}
    </Modal>
  )
}
