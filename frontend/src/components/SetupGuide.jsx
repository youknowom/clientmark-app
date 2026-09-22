import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiCheck,
  FiChevronDown,
  FiCompass,
  FiUserPlus,
  FiPhoneCall,
  FiFolder,
  FiMessageSquare,
  FiLayers,
  FiSliders,
  FiX,
  FiArrowRight,
  FiZap,
  FiHelpCircle,
  FiTrendingUp,
} from 'react-icons/fi'
import apiClient from '../api/axiosClient'
import '../views/sidebarCSS/setupGuide.css'

const CATEGORIES = [
  { id: 'all', label: 'All Tasks' },
  { id: 'sales', label: 'Sales & Leads' },
  { id: 'comms', label: 'WhatsApp & Messaging' },
  { id: 'projects', label: 'Projects & Delivery' },
  { id: 'workspace', label: 'Team & Branding' },
]

const SetupGuide = ({
  mode = 'inline', // 'inline' | 'drawer'
  isOpen = true,
  onClose,
  onLaunchWizard,
  onOpenChatbot,
}) => {
  const navigate = useNavigate()
  const [activeCategory, setActiveCategory] = useState('all')
  const [expandedTaskId, setExpandedTaskId] = useState('lead')
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('clientmark_setup_dismissed') === 'true'
  )
  const [manualDone, setManualDone] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('clientmark_setup_manual_done') || '{}')
    } catch {
      return {}
    }
  })

  const [metrics, setMetrics] = useState({
    leadCount: 0,
    projectCount: 0,
    userCount: 1,
    hasPreferences: false,
    portalId: '247489042',
  })

  // Fetch real counts from backend to auto-check completed tasks
  const fetchStatus = async () => {
    try {
      const [leadsRes, projectsRes, usersRes, obRes] = await Promise.allSettled([
        apiClient.get('/lead/get-leads', { params: { limit: 1 } }),
        apiClient.get('/project/get-projects', { params: { limit: 1 } }),
        apiClient.get('/user/get-user-list', { params: { limit: 5 } }),
        apiClient.get('/onboarding/status'),
      ])

      const leadCount =
        leadsRes.status === 'fulfilled' ? leadsRes.value?.data?.total || leadsRes.value?.data?.data?.length || 0 : 0
      const projectCount =
        projectsRes.status === 'fulfilled' ? projectsRes.value?.data?.total || projectsRes.value?.data?.data?.length || 0 : 0
      const userCount =
        usersRes.status === 'fulfilled' ? usersRes.value?.data?.total || usersRes.value?.data?.data?.length || 1 : 1
      const hasPreferences =
        obRes.status === 'fulfilled' ? !!obRes.value?.data?.preferences?.onboardingComplete : false

      setMetrics((prev) => ({
        ...prev,
        leadCount,
        projectCount,
        userCount,
        hasPreferences,
      }))
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [])

  const toggleManualDone = (taskId, e) => {
    if (e) e.stopPropagation()
    const next = { ...manualDone, [taskId]: !manualDone[taskId] }
    setManualDone(next)
    localStorage.setItem('clientmark_setup_manual_done', JSON.stringify(next))
  }

  const tasks = [
    {
      id: 'lead',
      category: 'sales',
      title: 'Add your first lead to the pipeline',
      time: '2 min',
      icon: <FiPhoneCall size={14} />,
      done: metrics.leadCount > 0 || !!manualDone['lead'],
      description:
        'Capture incoming sales inquiries, log contact details, assign to a Telecaller or BDE, and track conversion stages.',
      actionText: '+ Add Lead',
      link: '/add-lead',
    },
    {
      id: 'whatsapp',
      category: 'comms',
      title: 'Configure WhatsApp templates & follow-ups',
      time: '3 min',
      icon: <FiMessageSquare size={14} />,
      done: !!manualDone['whatsapp'],
      description:
        'Send automated WhatsApp welcome notifications, OTP verification, and status updates directly to clients.',
      actionText: 'Configure WhatsApp',
      link: '/settings/whatsapp-setting',
    },
    {
      id: 'project',
      category: 'projects',
      title: 'Create an active project with milestone deliverables',
      time: '3 min',
      icon: <FiFolder size={14} />,
      done: metrics.projectCount > 0 || !!manualDone['project'],
      description:
        'Coordinate project timelines, assign technical developers, and generate public live status preview links for clients.',
      actionText: 'Create Project',
      link: '/add-project',
    },
    {
      id: 'users',
      category: 'workspace',
      title: 'Invite team members (BDEs, Telecallers, Developers)',
      time: '2 min',
      icon: <FiUserPlus size={14} />,
      done: metrics.userCount > 1 || !!manualDone['users'],
      description:
        'Set up role-based access for your team. Each role receives a specialized dashboard tailored to their daily tasks.',
      actionText: 'Invite User',
      link: '/add-user',
    },
    {
      id: 'branding',
      category: 'workspace',
      title: 'Personalize workspace branding, logo & theme',
      time: '1 min',
      icon: <FiSliders size={14} />,
      done: !!manualDone['branding'],
      description:
        'Upload your custom company logo, tab favicon, and primary brand theme color for a cohesive white-labeled experience.',
      actionText: 'Customize Branding',
      link: '/settings/site-setting',
    },
    {
      id: 'questionnaire',
      category: 'workspace',
      title: 'Take the smart workspace onboarding questionnaire',
      time: '1 min',
      icon: <FiLayers size={14} />,
      done: metrics.hasPreferences || !!manualDone['questionnaire'],
      description:
        'Answer 6 quick questions regarding your team size, role, primary use cases, and industry to optimize your CRM workflow.',
      actionText: 'Launch Questionnaire',
      isWizard: true,
    },
  ]

  const filteredTasks =
    activeCategory === 'all'
      ? tasks
      : tasks.filter((t) => t.category === activeCategory)

  const completedCount = tasks.filter((t) => t.done).length
  const progressPercent = Math.round((completedCount / tasks.length) * 100)

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('clientmark_setup_dismissed', 'true')
  }

  const handleTaskAction = (task) => {
    if (task.isWizard) {
      if (onLaunchWizard) onLaunchWizard()
      if (mode === 'drawer' && onClose) onClose()
    } else if (task.link) {
      navigate(task.link)
      if (mode === 'drawer' && onClose) onClose()
    }
  }

  // Radial progress calculations
  const radius = 24
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference

  if (mode === 'inline' && dismissed) return null
  if (mode === 'drawer' && !isOpen) return null

  // Task list component
  const taskListElement = (
    <div className="hubspot-task-list">
      {filteredTasks.map((task) => {
        const isExpanded = expandedTaskId === task.id
        return (
          <div
            key={task.id}
            className={`hubspot-task-item ${isExpanded ? 'active' : ''}`}
          >
            <div
              className="hubspot-task-row"
              onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
            >
              <div className="hubspot-task-left">
                <div
                  className={`hubspot-task-check-circle ${task.done ? 'completed' : ''}`}
                  onClick={(e) => toggleManualDone(task.id, e)}
                  title={task.done ? 'Mark as incomplete' : 'Mark as complete'}
                >
                  {task.done && <FiCheck size={14} />}
                </div>

                <span className={`hubspot-task-name ${task.done ? 'completed' : ''}`}>
                  {task.title}
                </span>

                <span className="hubspot-task-badge-time">{task.time}</span>
              </div>

              <div className="hubspot-task-right">
                <FiChevronDown
                  className={`hubspot-task-expand-arrow ${isExpanded ? 'open' : ''}`}
                  size={16}
                />
              </div>
            </div>

            {/* Expanded details */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  className="hubspot-task-expanded"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <p className="hubspot-task-description">{task.description}</p>
                  <div className="hubspot-task-actions">
                    <button
                      className="hubspot-task-primary-btn"
                      onClick={() => handleTaskAction(task)}
                    >
                      {task.actionText} <FiArrowRight size={13} />
                    </button>

                    <button
                      className="hubspot-task-toggle-btn"
                      onClick={(e) => toggleManualDone(task.id, e)}
                    >
                      {task.done ? 'Mark as incomplete' : 'Mark as completed'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )

  // Drawer View
  if (mode === 'drawer') {
    return (
      <div className="hubspot-drawer-backdrop" onClick={onClose}>
        <motion.div
          className="hubspot-drawer-panel"
          initial={{ x: 500 }}
          animate={{ x: 0 }}
          exit={{ x: 500 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="hubspot-drawer-header">
            <div className="d-flex align-items-center gap-2">
              <div
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '8px',
                  backgroundColor: '#E05E3A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                }}
              >
                <FiCompass size={17} />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>
                  HubSpot Setup Guide
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>
                  {completedCount} of {tasks.length} tasks completed ({progressPercent}%)
                </div>
              </div>
            </div>
            <button className="hubspot-setup-dismiss-btn" onClick={onClose}>
              <FiX size={18} />
            </button>
          </div>

          <div className="hubspot-progress-container">
            <div className="hubspot-progress-track">
              <div className="hubspot-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <div className="hubspot-drawer-body">{taskListElement}</div>
        </motion.div>
      </div>
    )
  }

  // Full HubSpot Global Home 2-Column Layout
  return (
    <div className="hubspot-setup-card">
      {/* ── Global Home Welcome Header ─────────────────────────────── */}
      <div className="hubspot-setup-header">
        <div className="hubspot-setup-header-left">
          <div className="hubspot-setup-compass">
            <FiCompass size={24} />
          </div>
          <div>
            <span className="hubspot-setup-portal-badge">
              Workspace ID: {metrics.portalId}
            </span>
            <h3 className="hubspot-setup-title">
              Welcome to your workspace! Let's get your CRM set up.
            </h3>
            <p className="hubspot-setup-sub">
              Follow these recommended setup tasks to unlock your lead pipeline, WhatsApp automation, and project tracking.
            </p>
          </div>
        </div>

        <div className="hubspot-setup-header-right">
          <div className="hubspot-setup-progress-pill">
            <span style={{ color: '#E05E3A', fontWeight: 700 }}>
              {completedCount} of {tasks.length}
            </span>{' '}
            completed ({progressPercent}%)
          </div>

          <button
            className="hubspot-setup-dismiss-btn"
            onClick={handleDismiss}
            title="Dismiss checklist"
          >
            Dismiss ✕
          </button>
        </div>
      </div>

      {/* ── Progress Bar ───────────────────────────────────────────── */}
      <div className="hubspot-progress-container">
        <div className="hubspot-progress-track">
          <div className="hubspot-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {/* ── Filter Tabs ────────────────────────────────────────────── */}
      <div className="hubspot-tabs-row">
        {CATEGORIES.map((cat) => {
          const count =
            cat.id === 'all'
              ? tasks.length
              : tasks.filter((t) => t.category === cat.id).length
          return (
            <button
              key={cat.id}
              className={`hubspot-tab-btn ${activeCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.label} ({count})
            </button>
          )
        })}
      </div>

      {/* ── 2-Column Split: Tasks on Left, Hub Sidebar on Right ─────── */}
      <div className="hubspot-global-home-layout">
        {/* Left Column (Tasks) */}
        <div className="hubspot-global-home-main">{taskListElement}</div>

        {/* Right Column (HubSpot Global Home Sidebar) */}
        <div className="hubspot-global-home-sidebar">
          {/* CRM Readiness Meter */}
          <div className="hubspot-sidebar-card">
            <div className="hubspot-sidebar-card-title">
              <FiTrendingUp size={16} color="#E05E3A" /> CRM Readiness
            </div>
            <div className="hubspot-gauge-wrap">
              <div className="hubspot-gauge-circle">
                <svg width="58" height="58" viewBox="0 0 60 60">
                  <circle
                    cx="30"
                    cy="30"
                    r={radius}
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="5"
                  />
                  <circle
                    cx="30"
                    cy="30"
                    r={radius}
                    fill="none"
                    stroke="#E05E3A"
                    strokeWidth="5"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    transform="rotate(-90 30 30)"
                    style={{ transition: 'stroke-dashoffset 0.4s ease' }}
                  />
                </svg>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: 800,
                    color: '#111827',
                  }}
                >
                  {progressPercent}%
                </div>
              </div>
              <div>
                <p className="hubspot-gauge-label">
                  {progressPercent === 100
                    ? '🎉 Your CRM is 100% configured and ready!'
                    : `You are ${progressPercent}% set up. Complete remaining tasks to maximize conversion.`}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions Hub */}
          <div className="hubspot-sidebar-card">
            <div className="hubspot-sidebar-card-title">
              <FiZap size={16} color="#E05E3A" /> Quick Actions
            </div>
            <div className="hubspot-quick-actions-list">
              <div
                className="hubspot-quick-action-link"
                onClick={() => navigate('/add-lead')}
              >
                <span>📞 Add Inbound Lead</span>
                <FiArrowRight size={13} color="#9CA3AF" />
              </div>
              <div
                className="hubspot-quick-action-link"
                onClick={() => navigate('/settings/whatsapp-setting')}
              >
                <span>💬 WhatsApp Template</span>
                <FiArrowRight size={13} color="#9CA3AF" />
              </div>
              <div
                className="hubspot-quick-action-link"
                onClick={() => navigate('/add-project')}
              >
                <span>📁 New Project Milestone</span>
                <FiArrowRight size={13} color="#9CA3AF" />
              </div>
              <div
                className="hubspot-quick-action-link"
                onClick={() => navigate('/add-user')}
              >
                <span>👥 Invite Team Member</span>
                <FiArrowRight size={13} color="#9CA3AF" />
              </div>
            </div>
          </div>

          {/* AI CRM Assistant Card */}
          <div className="hubspot-sidebar-card" style={{ background: '#FFFDFD' }}>
            <div className="hubspot-sidebar-card-title">
              <FiHelpCircle size={16} color="#E05E3A" /> Need Assistance?
            </div>
            <p style={{ fontSize: '12.5px', color: '#6B7280', margin: '0 0 12px 0', lineHeight: 1.5 }}>
              Have questions about pipelines, WhatsApp setup, or roles? Chat with the AI CRM Assistant anytime.
            </p>
            <button
              className="hubspot-task-primary-btn"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => {
                const launcher = document.querySelector('.chatbot-launcher')
                if (launcher) launcher.click()
              }}
            >
              💬 Open AI Assistant
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SetupGuide
