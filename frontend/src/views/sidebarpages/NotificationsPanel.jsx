import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { RiNotification3Line } from 'react-icons/ri'
import { MdOutlineNotificationsNone, MdVerified } from 'react-icons/md'
import { BsBellFill } from 'react-icons/bs'
import apiClient from '../../api/axiosClient'
import { useSocket } from '../../SocketContext'

// ─── Helpers ────────────────────────────────────────────────────────────────
const timeAgo = (dateStr) => {
  if (!dateStr) return ''
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ─── Component ───────────────────────────────────────────────────────────────
const NotificationPanel = () => {
  const navigate = useNavigate()
  const socket = useSocket()
  const panelRef = useRef()
  const audioRef = useRef(null)
  const audioUnlocked = useRef(false)

  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [bellPulse, setBellPulse] = useState(false)

  // Unlock audio on first user interaction
  useEffect(() => {
    const unlock = () => {
      if (!audioUnlocked.current) {
        const audio = new Audio('./msgring.mp3')
        audio.volume = 0.5
        audio.preload = 'auto'
        audioRef.current = audio
        audioUnlocked.current = true
      }
    }
    document.addEventListener('click', unlock, { once: true })
    return () => document.removeEventListener('click', unlock)
  }, [])

  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => { })
    }
  }

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiClient.get('/notification/get-notification', {
        params: { page: 1, limit: 15 },
      })
      const data = res.data.data
      setNotifications(data.notifications)
      setCount(data.unreadCount || data.notifications.filter((n) => !n.isRead).length)
    } catch {
      setNotifications([])
      setCount(0)
    } finally {
      setLoading(false)
    }
  }, [])

  const markSingleRead = async (notificationId) => {
    try {
      await apiClient.put('/notification/mark-single-read', { notificationId })
      setNotifications((prev) =>
        prev.map((n) => (n._id === notificationId ? { ...n, isRead: true } : n)),
      )
      setCount((prev) => Math.max(0, prev - 1))
    } catch { }
  }

  const handleNotificationClick = (item) => {
    if (!item.isRead) markSingleRead(item._id)

    if (item.redirectUrl?.includes('projectId=')) {
      const urlParams = new URLSearchParams(item.redirectUrl.split('?')[1])
      const projId = urlParams.get('projectId')
      navigate(item.redirectUrl.split('?')[0], { state: { projectId: projId } })
    } else {
      navigate(item.redirectUrl)
    }
    setOpen(false)
  }

  // Socket: listen to all relevant events including get-project
  useEffect(() => {
    if (!socket) return
    const events = [
      'get-project',
      'create-project',
      'many-telecaller-to-bde',
      'many-admin-to-telecaller',
      'single-telecaller-to-bde',
      'many-bde-to-admin',
    ]
    const handleNewNotification = () => {
      playSound()
      fetchNotifications().then(() => {
        setBellPulse(true)
        setTimeout(() => setBellPulse(false), 2000)
      })
    }
    events.forEach((e) => socket.on(e, handleNewNotification))
    return () => events.forEach((e) => socket.off(e, handleNewNotification))
  }, [socket, fetchNotifications])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const isBighost = (item) =>
    item.notificationType === 'motivational' || item.notificationType === 'reminder'

  return (
    <>
      <style>{`
        .np-bell-wrap {
          position: relative; cursor: pointer;
          width: 36px; height: 36px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.2s;
        }
        .np-bell-wrap:hover { background: #f1f5f9; }
        .np-bell-pulse { animation: np-bell-shake 0.5s ease-in-out 3; }
        @keyframes np-bell-shake {
          0%,100% { transform: rotate(0deg); }
          25% { transform: rotate(-14deg); }
          75% { transform: rotate(14deg); }
        }
        .np-badge {
          position: absolute; top: 1px; right: 1px;
          background: #ef4444; color: #fff;
          font-size: 9px; font-weight: 700;
          min-width: 15px; height: 15px; border-radius: 999px;
          display: flex; align-items: center; justify-content: center;
          padding: 0 3px; border: 2px solid #fff; line-height: 1;
        }

        /* ── Panel ── */
        .np-panel {
          position: absolute; top: calc(100% + 12px); right: 0;
          width: 360px; background: #fff;
          border-radius: 16px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06);
          z-index: 1050; overflow: hidden;
          animation: np-fade-in 0.18s ease;
          border: 1px solid #e8edf3;
        }
        @keyframes np-fade-in {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Header ── */
        .np-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 16px 12px;
          background: #fff;
          border-bottom: 1.5px solid #f0f4f8;
        }
        .np-header-title { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0; }
        .np-header-count {
          font-size: 11px; background: #eff6ff; color: #2563eb;
          font-weight: 600; padding: 2px 9px; border-radius: 999px; margin-left: 8px;
        }

        /* ── List ── */
        .np-list { max-height: 430px; overflow-y: auto; }
        .np-list::-webkit-scrollbar { width: 3px; }
        .np-list::-webkit-scrollbar-track { background: transparent; }
        .np-list::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 99px; }

        /* ── Item ── */
        .np-item {
          display: flex; flex-direction: column;
          padding: 12px 16px 10px;
          cursor: pointer;
          transition: background 0.15s;
          border-bottom: 1px solid #eff3f4;
          position: relative;
        }
        .np-item:last-child { border-bottom: none; }
        .np-item:hover { background: #f8fafc; }
        .np-item.unread { background: #f0f7ff; }
        .np-item.unread:hover { background: #e8f1fd; }

        /* ── Top row ── */
        .np-row-top {
          display: flex; align-items: flex-start;
          justify-content: space-between; gap: 10px;
        }
        .np-title {
          font-size: 13px; font-weight: 600; color: #1e293b;
          margin: 0; line-height: 1.45; flex: 1; word-break: break-word;
        }
        .np-item:not(.unread) .np-title { font-weight: 500; color: #475569; }

        /* Message text */
        .np-message {
          font-size: 12px; color: #64748b;
          margin: 4px 0 0; line-height: 1.5;
          word-break: break-word;
        }
        .np-item.unread .np-message { color: #334155; }

        /* ── Bottom row ── */
        .np-row-bottom {
          display: flex; align-items: center;
          justify-content: flex-end; margin-top: 6px;
        }
        .np-time { font-size: 11px; color: #94a3b8; font-weight: 500; margin: 0; }
        .np-item.unread .np-time { color: #60a5fa; }

        /* ── Green unread dot ── */
        .np-green-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #22c55e;
          flex-shrink: 0; margin-top: 3px;
          box-shadow: 0 0 0 2px rgba(34,197,94,0.25);
        }

        /* ── Bighost sender row ── */
        .np-bighost-row {
          display: flex; align-items: center;
          justify-content: space-between; margin-bottom: 5px;
        }
        .np-bighost-inner {
          display: flex; align-items: center; gap: 5px;
        }
        .np-bighost-avatar {
          width: 22px; height: 22px; border-radius: 50%;
          background: #FF8C42;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; overflow: hidden;
        }
        .np-bighost-avatar span {
          color: #fff; font-weight: 700; font-size: 11px;
          line-height: 1; display: block;
          text-align: center; width: 100%; user-select: none;
        }
        .np-bighost-name {
          font-weight: 700; font-size: 12.5px; color: #0f172a;
          line-height: 1; display: flex; align-items: center;
        }
        .np-bighost-msg {
          font-size: 12.5px; color: #334155;
          margin: 0; line-height: 1.5; word-break: break-word;
          padding-left: 28px;
        }
        .np-item.unread .np-bighost-msg { color: #1e293b; }

        /* ── Empty ── */
        .np-empty {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 48px 20px; color: #94a3b8;
        }
        .np-empty-icon { font-size: 40px; margin-bottom: 10px; opacity: 0.3; }
        .np-empty-text { font-size: 13px; font-weight: 500; margin: 0; }

        /* ── Loader ── */
        .np-loading { display: flex; align-items: center; justify-content: center; padding: 36px; }
        .np-spinner {
          width: 22px; height: 22px;
          border: 2px solid #e2e8f0; border-top-color: #3b82f6;
          border-radius: 50%; animation: np-spin 0.7s linear infinite;
        }
        @keyframes np-spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ position: 'relative' }} ref={panelRef}>
        {/* Bell Icon */}
        <div
          className={`np-bell-wrap ${bellPulse ? 'np-bell-pulse' : ''}`}
          onClick={() => setOpen((prev) => !prev)}
          title="Notifications"
        >
          <RiNotification3Line size={20} color="#334155" />
          {count > 0 && <span className="np-badge">{count > 9 ? '9+' : count}</span>}
        </div>

        {/* Panel */}
        {open && (
          <div className="np-panel">
            {/* Header */}
            <div className="np-header">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <p className="np-header-title">Notifications</p>
                {count > 0 && <span className="np-header-count">{count} new</span>}
              </div>

            </div>

            {/* List */}
            <div className="np-list">
              {loading ? (
                <div className="np-loading">
                  <div className="np-spinner" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="np-empty">
                  <MdOutlineNotificationsNone className="np-empty-icon" />
                  <p className="np-empty-text">You're all caught up!</p>
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item._id}
                    className={`np-item ${!item.isRead ? 'unread' : ''}`}
                    onClick={() => handleNotificationClick(item)}
                  >
                    {isBighost(item) ? (
                      <>
                        {/* Bighost verified sender */}
                        <div className="np-bighost-row">
                          <div className="np-bighost-inner">
                            <div className="np-bighost-avatar">
                              <span>B</span>
                            </div>
                            <span className="np-bighost-name">Bighost</span>
                            <MdVerified
                              size={15}
                              color="#1d4ed8"
                              title="Verified"
                              style={{ display: 'block', flexShrink: 0 }}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <p className="np-time">{timeAgo(item.createdAt)}</p>
                            {!item.isRead && <span className="np-green-dot" />}
                          </div>
                        </div>
                        {/* Message */}
                        <p className="np-bighost-msg">{item.message}</p>
                      </>
                    ) : (
                      <>
                        {/* Regular notification */}
                        <div className="np-row-top">
                          <p className="np-title">{item.title}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                            <p className="np-time">{timeAgo(item.createdAt)}</p>
                            {!item.isRead && <span className="np-green-dot" />}
                          </div>
                        </div>
                        {item.message && (
                          <p className="np-message">{item.message}</p>
                        )}
                      </>
                    )}

                    {/* Timestamp is now at the top */}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default NotificationPanel
