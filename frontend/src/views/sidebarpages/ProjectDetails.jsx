import React, { useEffect, useState, useContext } from 'react'
import { Container, Card, Row, Col, Form, Button, Spinner, Badge } from 'react-bootstrap'
import DOMPurify from 'dompurify'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { useLocation, useNavigate } from 'react-router-dom'
import { AuthContext } from '../../AuthContext'
import apiClient, { BASE_URL } from '../../api/axiosClient'
import toast from 'react-hot-toast'
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaClock,
  FaCheckCircle,
  FaWhatsappSquare,
  FaPaperclip,
  FaTimes,
  FaLayerGroup,
  FaCode,
} from 'react-icons/fa'
import { IoEyeOutline } from 'react-icons/io5'
import { MdModeEdit, MdVerified } from 'react-icons/md'
import { GrDocumentPdf } from 'react-icons/gr'
import Select from 'react-select'
import PostModal from './PostModal'
import ConfirmationModal from '../../components/mycomponent/ConfirmationModal'
import { motion, AnimatePresence } from 'framer-motion'

import '../sidebarCSS/comStyle.css'

const PillButton = ({
  active,
  hovered,
  setHovered,
  id,
  onClick,
  icon,
  label,
  activeBg,
  activeShadow,
  textColor,
  hoverBgColor,
}) => {
  const isHovered = hovered === id
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(id)}
      onMouseLeave={() => setHovered(null)}
      style={{
        position: 'relative',
        padding: '3px 8px',
        border: 'none',
        background: 'transparent',
        borderRadius: '50px',
        color: active ? '#fff' : isHovered ? textColor : '#4b5563',
        fontWeight: active ? 600 : 500,
        fontSize: '11px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '3px',
        transition: 'color 0.2s ease',
        zIndex: 1,
        outline: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {active && (
        <motion.div
          layoutId="pill-active-bg"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: activeBg,
            borderRadius: '50px',
            boxShadow: activeShadow,
            zIndex: -1,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
      {!active && isHovered && (
        <motion.div
          layoutId="pill-hover-bg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: hoverBgColor,
            borderRadius: '50px',
            zIndex: -1,
          }}
        />
      )}
      <span
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: active ? '#fff' : isHovered ? textColor : '#374151',
        }}
      >
        {icon} {label}
      </span>
    </button>
  )
}

const ProjectDetails = () => {
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState(null) // 'preview' | 'edit' | 'pdf' | 'whatsapp' | null
  const [hoverTab, setHoverTab] = useState(null) // tracks which button is hovered
  const [editForm, setEditForm] = useState(null)
  const { token, userData } = useContext(AuthContext)
  const location = useLocation()
  const navigate = useNavigate()
  const projectId = location.state?.projectId
  const [project, setProject] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Modal state
  const [showPostModal, setShowPostModal] = useState(false)
  const [editingPost, setEditingPost] = useState(null)

  // Confirmation modal
  const [confirmState, setConfirmState] = useState({
    show: false,
    message: '',
    onConfirm: () => {},
  })

  // Posts state
  const [posts, setPosts] = useState([])

  // NEW: Developer and Project Manager lists
  const [projectManagers, setProjectManagers] = useState([])
  const [developers, setDevelopers] = useState([])

  // Helper function to check if user can edit a post
  const canEditPost = (post) => {
    if (!userData?._id) return false

    // Check if user ID matches the post creator ID
    const postCreatorId = post.addById
    if (postCreatorId) {
      return String(postCreatorId) === String(userData._id)
    }

    // Fallback to name comparison (less reliable)
    return post.developer?.name === userData?.fullName
  }

  // NEW: Fetch Developer users
  const getDeveloperUsers = async (search = '') => {
    try {
      // 1. Get Developer roleId
      const roleRes = await apiClient.get('/user/get-role-list', {
        params: { search: 'Developer' },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const developerRole = roleRes.data.data.find((r) => r.roleName === 'Developer')
      if (!developerRole) {
        setProjectManagers([])
        setDevelopers([])
        return
      }
      // 2. Get users with Developer roleId
      const res = await apiClient.get('/user/get-user-list', {
        params: {
          roleId: developerRole._id,
          search,
          limit: 50,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setProjectManagers(res.data.data)
      setDevelopers(res.data.data)
    } catch (error) {
      setProjectManagers([])
      setDevelopers([])
    }
  }

  // Fetch full project details
  const getProjectDetails = async () => {
    try {
      setIsLoading(true)
      const response = await apiClient.get(`/project/get-project`, {
        params: { projectId: projectId },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      setProject(response.data.data)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to fetch project details.')
      navigate(-1)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!projectId) {
      toast.error('No project ID found.')
      navigate(-1)
      return
    }
    getProjectDetails()
    getProjectTimeline()
    getDeveloperUsers()
  }, [projectId, token, navigate])

  useEffect(() => {
    if (project && !isEditing) {
      setEditForm({ ...project })
    }
  }, [project, isEditing])

  const mapTimelinePost = (item) => {
    const createdAt = item?.createdAt ? new Date(item.createdAt) : null
    const updatedAt = item?.updatedAt ? new Date(item.updatedAt) : null
    const edited = updatedAt && createdAt && updatedAt > createdAt
    const roleName = item?.addById?.roleId?.roleName || ''
    const isAdmin = roleName.toLowerCase().includes('admin')

    return {
      id: item?._id,
      addById: item?.addById?._id || item?.addById || null,
      module: item?.moduleName || '',
      phase: item?.phase || '',
      isAdmin,
      developer: {
        name: item?.addById?.fullName || item?.addById?.name || userData?.fullName || 'Developer',
      },
      content: item?.description || '',
      images: Array.isArray(item?.attachements) ? item.attachements : [],
      createdAt,
      updatedAt,
      edited,
    }
  }

  const getProjectTimeline = async () => {
    try {
      const response = await apiClient.get(`/project/${projectId}/timeline`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = Array.isArray(response?.data?.data) ? response.data.data : []
      setPosts(data.map(mapTimelinePost))
    } catch (error) {
      toast.error(error?.message || 'Failed to fetch timeline posts.')
    }
  }

  const handlePostSubmit = async (postData) => {
    try {
      const formData = new FormData()

      formData.append('moduleName', postData.module || postData.title)
      formData.append('description', postData.content)
      formData.append('phase', postData.phase)

      // append multiple images
      postData.images.forEach((img) => {
        if (img instanceof File) {
          formData.append('attachments', img)
        }
      })

      if (editingPost) {
        await apiClient.put(`/project/${projectId}/timeline/${editingPost.id}`, {
          moduleName: postData.module || postData.title,
          description: postData.content,
          attachements: postData.images,
          phase: postData.phase,
        })
        await getProjectTimeline()
        toast.success('Post updated successfully!')
        setEditingPost(null)
        return
      }

      await apiClient.post(`/project/${projectId}/timeline`, formData, {
        isFileUpload: true,
      })
      await getProjectTimeline()
      toast.success('Post added successfully!')
    } catch (error) {
      toast.error(error?.message || 'Failed to save post.')
    }
  }

  const handleEditPost = (post) => {
    if (canEditPost(post)) {
      setEditingPost(post)
      setShowPostModal(true)
    } else {
      toast.error('You can only edit your own posts')
    }
  }

  const handleDeleteClick = (postId) => {
    let postToDelete = postId

    setConfirmState({
      show: true,
      message: 'Do you want to delete this post?',
      onConfirm: async () => {
        try {
          await apiClient.delete(`/project/${projectId}/timeline/${postToDelete}`, {})
          await getProjectTimeline()
          toast.success('Post deleted successfully!')
        } catch (error) {
          toast.error(error?.message || 'Failed to delete post.')
        } finally {
          setConfirmState({ show: false, message: '', onConfirm: null })
        }
      },
    })
  }

  const confirmDelete = async () => {}

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return ''

    const date = new Date(timestamp)
    if (isNaN(date.getTime())) return ''

    const now = new Date()
    const diff = now - date
    const minutes = diff / 60000

    // Show "Just now" only for 1 minute
    if (minutes < 1) return 'Just now'

    // After 1 minute → show real time
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const [selectedPhase, setSelectedPhase] = useState(null)
  const [selectedPhaseIndex, setSelectedPhaseIndex] = useState(null)
  const [lightboxImg, setLightboxImg] = useState(null)
  const [selectMode, setSelectMode] = useState(false)
  const [confirmingPhaseIndex, setConfirmingPhaseIndex] = useState(null)
  const [markingPhaseIndex, setMarkingPhaseIndex] = useState(null)

  const isAdminUser = ['admin', 'developer'].some((role) =>
    userData?.roleId?.roleName?.toLowerCase().includes(role),
  )
  const isStrictAdmin = (userData?.roleId?.roleName || '').toLowerCase().includes('admin')

  const markPhaseCompleted = async (index) => {
    try {
      setMarkingPhaseIndex(index)
      const updatedPhases = (project.PhaseDetails || []).map((ph, i) =>
        i === index
          ? { ...ph, PhaseStatus: ph.PhaseStatus === 'Completed' ? 'Not Started' : 'Completed' }
          : ph,
      )
      await apiClient.put(
        '/project/update-project',
        { _id: project._id, PhaseDetails: updatedPhases },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      // Update only the PhaseDetails in local state — avoids full re-fetch and page scroll-to-top
      setProject((prev) => ({ ...prev, PhaseDetails: updatedPhases }))
      setConfirmingPhaseIndex(null)
      toast.success('Phase status updated!')
    } catch (error) {
      toast.error('Failed to update phase status')
    } finally {
      setMarkingPhaseIndex(null)
    }
  }

  if (isLoading) {
    return (
      <Container className="mt-4 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    )
  }

  if (!project) {
    return <div>No project data found.</div>
  }

  const handleEditClick = () => {
    setIsEditing(true)
    setEditForm({ ...project })
  }

  const handleUpdateClick = async () => {
    try {
      const payload = {
        ...editForm,
        _id: project._id,
        // Ensure we're sending the manager name from the selected option
        AssignedProjectManager:
          editForm.AssignedProjectManagerName || editForm.AssignedProjectManager || '',
      }

      await apiClient.put('/project/update-project', payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      toast.success('Project updated successfully!')
      await getProjectDetails()
      setIsEditing(false)
      setActiveTab(null)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Update failed')
    }
  }

  const handleEditChange = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }))
  }

  // Use only real backend phases
  const phases = project?.PhaseDetails || project?.phaseDetails || project?.phases || []

  const hasPhases = phases.length > 0

  // NEW: Helper function to get developer name from ID or object
  const getDeveloperName = (dev) => {
    if (!dev) return ''
    if (typeof dev === 'string') {
      // If it's an ID, try to find the name from developers list
      const found = developers.find((d) => d._id === dev)
      return found ? found.fullName : dev
    }
    // If it's an object, extract the name
    return dev.fullName || dev.name || ''
  }

  // NEW: Helper function to get developer names as comma-separated string
  const getDeveloperNames = (devArray) => {
    if (!Array.isArray(devArray)) return ''
    return devArray.map(getDeveloperName).filter(Boolean).join(', ')
  }

  // NEW: Helper function to get developer IDs from project data
  const getDeveloperIds = (devArray) => {
    if (!Array.isArray(devArray)) return []
    return devArray
      .map((dev) => {
        if (typeof dev === 'string') return dev
        return dev._id || dev.id || ''
      })
      .filter(Boolean)
  }

  //WhatsApp function for share the preview
  const sendWhatsAppToClient = async () => {
    try {
      toast.loading('Preparing WhatsApp message...')

      const res = await apiClient.post('/project/send-link-to-client', {
        _id: project._id,
      })

      toast.dismiss()
      toast.success('WhatsApp message sent successfully')
    } catch (error) {
      toast.dismiss()
      toast.error(error?.response?.data?.message || 'Failed to send WhatsApp message')
    }
  }

  return (
    <>
      <Container className="mt-4 container-lg px-3 px-md-0">
        {/* ==================== PROJECT DETAILS SECTION ==================== */}
        <Card className="mb-4 shadow-sm">
          <Card.Header className="mainBGColor text-white fw-bold d-flex justify-content-between align-items-center flex-wrap gap-2">
            {/* ── Left: Title only ── */}
            <span style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '0.2px' }}>
              Project Details
            </span>

            {/* ── Right: Custom Color Pill ── */}
            <div
              className="d-flex align-items-center hide-scroll"
              style={{
                background: '#ffffff',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: '50px',
                padding: '4px',
                boxShadow: '0 3px 14px rgba(0,0,0,0.1)',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                maxWidth: '100%',
              }}
            >
              <style>{`.hide-scroll::-webkit-scrollbar { display: none; }`}</style>
              <AnimatePresence>
                <div className="d-flex align-items-center" style={{ gap: '4px' }}>
                  <PillButton
                    id="preview"
                    active={activeTab === 'preview'}
                    hovered={hoverTab}
                    setHovered={setHoverTab}
                    onClick={() => {
                      setHoverTab(null)
                      setTimeout(() => {
                        window.open(`/project-preview/${project.slug}`, '_blank')
                      }, 200)
                    }}
                    icon={
                      <IoEyeOutline
                        size={16}
                        color={activeTab === 'preview' ? '#fff' : '#2563eb'}
                      />
                    }
                    label="Preview"
                    activeBg="linear-gradient(135deg, #3b82f6, #1d4ed8)"
                    activeShadow="0 3px 12px rgba(59,130,246,0.40)"
                    textColor="#2563eb"
                    hoverBgColor="#eff6ff"
                  />

                  <div style={{ width: '1px', height: '20px', background: '#e5e7eb' }} />

                  {isEditing ? (
                    <>
                      <PillButton
                        id="update"
                        active={activeTab === 'update'}
                        hovered={hoverTab}
                        setHovered={setHoverTab}
                        onClick={() => {
                          setActiveTab('update')
                          handleUpdateClick()
                        }}
                        icon={
                          <span
                            style={{
                              fontWeight: 'bold',
                              color: activeTab === 'update' ? '#fff' : '#059669',
                            }}
                          >
                            ✓
                          </span>
                        }
                        label="Update"
                        activeBg="linear-gradient(135deg, #10b981, #047857)"
                        activeShadow="0 3px 12px rgba(16,185,129,0.40)"
                        textColor="#059669"
                        hoverBgColor="#ecfdf5"
                      />
                      <div style={{ width: '1px', height: '20px', background: '#e5e7eb' }} />
                      <PillButton
                        id="cancel"
                        active={activeTab === 'cancel'}
                        hovered={hoverTab}
                        setHovered={setHoverTab}
                        onClick={() => {
                          setIsEditing(false)
                          setActiveTab(null)
                        }}
                        icon={
                          <span
                            style={{
                              fontWeight: 'bold',
                              color: activeTab === 'cancel' ? '#fff' : '#dc2626',
                            }}
                          >
                            ✕
                          </span>
                        }
                        label="Cancel"
                        activeBg="linear-gradient(135deg, #ef4444, #b91c1c)"
                        activeShadow="0 3px 12px rgba(239,68,68,0.40)"
                        textColor="#dc2626"
                        hoverBgColor="#fef2f2"
                      />
                    </>
                  ) : (
                    <PillButton
                      id="edit"
                      active={activeTab === 'edit'}
                      hovered={hoverTab}
                      setHovered={setHoverTab}
                      onClick={() => {
                        handleEditClick()
                        setActiveTab('edit')
                      }}
                      icon={
                        <MdModeEdit size={16} color={activeTab === 'edit' ? '#fff' : '#059669'} />
                      }
                      label="Edit"
                      activeBg="linear-gradient(135deg, #10b981, #047857)"
                      activeShadow="0 3px 12px rgba(16,185,129,0.40)"
                      textColor="#059669"
                      hoverBgColor="#ecfdf5"
                    />
                  )}
                  <div style={{ width: '1px', height: '20px', background: '#e5e7eb' }} />
                  <PillButton
                    id="whatsapp"
                    active={activeTab === 'whatsapp'}
                    hovered={hoverTab}
                    setHovered={setHoverTab}
                    onClick={() => {
                      setActiveTab('whatsapp')
                      sendWhatsAppToClient()
                      setTimeout(() => setActiveTab(isEditing ? 'edit' : null), 1400)
                    }}
                    icon={
                      <FaWhatsappSquare
                        size={17}
                        color={activeTab === 'whatsapp' ? '#fff' : '#16a34a'}
                      />
                    }
                    label="WhatsApp"
                    activeBg="linear-gradient(135deg, #25D366, #128C7E)"
                    activeShadow="0 3px 12px rgba(37,211,102,0.40)"
                    textColor="#16a34a"
                    hoverBgColor="#f0fdf4"
                  />
                </div>
              </AnimatePresence>
            </div>
          </Card.Header>

          <Card.Body>
            <Row>
              <h5 className="col-12 mb-3">Project Information</h5>
              <Form.Group className="col-md-3 mb-2">
                <Form.Label>Project Name</Form.Label>
                <Form.Control
                  type="text"
                  value={isEditing ? editForm?.ProjectName || '' : project.ProjectName || ''}
                  readOnly={!isEditing}
                  className="underline-input"
                  onChange={(e) => isEditing && handleEditChange('ProjectName', e.target.value)}
                />
              </Form.Group>
              <Form.Group className="col-md-3 mb-2">
                <Form.Label>Project Type</Form.Label>
                <Form.Control
                  type="text"
                  value={isEditing ? editForm?.ProjectType || '' : project.ProjectType || ''}
                  readOnly={!isEditing}
                  className="underline-input"
                  onChange={(e) => isEditing && handleEditChange('ProjectType', e.target.value)}
                />
              </Form.Group>
              <Form.Group className="col-md-3 mb-2">
                <Form.Label>Priority</Form.Label>
                {isEditing ? (
                  <Form.Select
                    value={editForm?.ProjectPriority || ''}
                    onChange={(e) => handleEditChange('ProjectPriority', e.target.value)}
                    className="underline-input"
                  >
                    <option value="">Select Priority</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </Form.Select>
                ) : (
                  <Form.Control
                    type="text"
                    value={project.ProjectPriority || ''}
                    readOnly
                    className="underline-input"
                  />
                )}
              </Form.Group>
              <Form.Group className="col-md-3 mb-2">
                <Form.Label>Status</Form.Label>
                {isEditing ? (
                  <Form.Select
                    value={editForm?.ProjectStatus || ''}
                    onChange={(e) => handleEditChange('ProjectStatus', e.target.value)}
                    className="underline-input"
                  >
                    <option value="">Select Status</option>
                    <option value="Created">Created</option>
                    <option value="Assigned">Assigned</option>
                    <option value="Hold">Hold</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Testing">Testing</option>
                    <option value="Client Review">Client Review</option>
                    <option value="Completed">Completed</option>
                  </Form.Select>
                ) : (
                  <Form.Control
                    type="text"
                    value={project.ProjectStatus || ''}
                    readOnly
                    className="underline-input"
                  />
                )}
              </Form.Group>
              <Form.Group className="col-md-6 mb-2">
                <Form.Label>Start Date</Form.Label>
                <Form.Control
                  type="date"
                  value={
                    isEditing
                      ? editForm?.ProjectStartDate?.split('T')[0] || ''
                      : project.ProjectStartDate?.split('T')[0] || ''
                  }
                  readOnly={!isEditing}
                  className="underline-input"
                  onChange={(e) =>
                    isEditing && handleEditChange('ProjectStartDate', e.target.value)
                  }
                />
              </Form.Group>
              <Form.Group className="col-md-6 mb-2">
                <Form.Label>End Date (Expected)</Form.Label>
                <Form.Control
                  type="date"
                  value={
                    isEditing
                      ? editForm?.ProjectEndDate?.split('T')[0] || ''
                      : project.ProjectEndDate?.split('T')[0] || ''
                  }
                  readOnly={!isEditing}
                  className="underline-input"
                  onChange={(e) => isEditing && handleEditChange('ProjectEndDate', e.target.value)}
                />
              </Form.Group>
              <Form.Group className="col-md-12 mb-4">
                <Form.Label>Project Description</Form.Label>
                {isEditing ? (
                  <ReactQuill
                    value={editForm?.ProjectDescription || ''}
                    onChange={(value) => handleEditChange('ProjectDescription', value)}
                    placeholder="Enter project description..."
                    style={{ height: '150px', marginBottom: '50px' }}
                    modules={{
                      toolbar: [
                        [{ header: [1, 2, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ list: 'ordered' }, { list: 'bullet' }],
                        ['clean'],
                      ],
                    }}
                    formats={['header', 'bold', 'italic', 'underline', 'strike', 'list', 'bullet']}
                  />
                ) : (
                  <div
                    className="border rounded p-2 bg-light"
                    style={{ minHeight: '80px' }}
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(project.ProjectDescription || ''),
                    }}
                  />
                )}
              </Form.Group>

              <hr className="my-3 w-100" />
              <h5 className="col-12 mb-3">Client Details</h5>
              <Form.Group className="col-md-4 mb-2">
                <Form.Label>Client Name</Form.Label>
                <Form.Control
                  type="text"
                  value={isEditing ? editForm?.ClientName || '' : project.ClientName || ''}
                  readOnly={!isEditing}
                  className="underline-input"
                  onChange={(e) => isEditing && handleEditChange('ClientName', e.target.value)}
                />
              </Form.Group>
              <Form.Group className="col-md-4 mb-2">
                <Form.Label>Client Email</Form.Label>
                <Form.Control
                  type="email"
                  value={isEditing ? editForm?.email || '' : project.email || ''}
                  readOnly={!isEditing}
                  className="underline-input"
                  onChange={(e) => isEditing && handleEditChange('email', e.target.value)}
                />
              </Form.Group>
              <Form.Group className="col-md-4 mb-2">
                <Form.Label>Client Phone</Form.Label>
                <Form.Control
                  type="text"
                  value={isEditing ? editForm?.mobileNo || '' : project.mobileNo || ''}
                  readOnly={!isEditing}
                  className="underline-input"
                  inputMode="tel"
                  onPaste={(e) => {
                    if (!isEditing) return
                    e.preventDefault()
                    const pasted = e.clipboardData.getData('text') || ''
                    const sanitized = pasted.replace(/[^\d+]/g, '')
                    handleEditChange('mobileNo', sanitized)
                  }}
                  onChange={(e) => {
                    if (!isEditing) return
                    const sanitized = e.target.value.replace(/[^\d+]/g, '')
                    handleEditChange('mobileNo', sanitized)
                  }}
                />
              </Form.Group>

              <hr className="my-3 w-100" />
              <h5 className="col-12 mb-3">Team & Planning</h5>

              {/* FIXED: Project Manager with Select dropdown in edit mode */}
              <Form.Group className="col-md-3 mb-2">
                <Form.Label>Project Manager</Form.Label>
                {isEditing ? (
                  <Select
                    options={projectManagers.map((user) => ({
                      label: user.fullName,
                      value: user._id,
                    }))}
                    value={
                      projectManagers
                        .map((user) => ({ label: user.fullName, value: user._id }))
                        .find(
                          (u) =>
                            u.value === editForm?.AssignedProjectManagerId ||
                            u.label === editForm?.AssignedProjectManager ||
                            u.label === editForm?.AssignedProjectManagerName,
                        ) || null
                    }
                    onChange={(selected) => {
                      handleEditChange('AssignedProjectManagerId', selected ? selected.value : '')
                      handleEditChange('AssignedProjectManagerName', selected ? selected.label : '')
                    }}
                    className="underline-input select"
                    classNamePrefix="lead-select"
                    placeholder="Select project manager"
                    isClearable
                    menuPlacement="auto"
                    menuShouldScrollIntoView={false}
                    styles={{ menu: (base) => ({ ...base, maxHeight: 220 }) }}
                  />
                ) : (
                  <Form.Control
                    type="text"
                    value={project.AssignedProjectManager || ''}
                    readOnly
                    className="underline-input"
                  />
                )}
              </Form.Group>

              {/* FIXED: Developers with Multi-Select dropdown in edit mode */}
              <Form.Group className="col-md-3 mb-2">
                <Form.Label>Developers</Form.Label>
                {isEditing ? (
                  <Select
                    options={developers.map((user) => ({
                      label: user.fullName,
                      value: user._id,
                    }))}
                    value={developers
                      .map((user) => ({ label: user.fullName, value: user._id }))
                      .filter((u) => {
                        const currentIds = getDeveloperIds(editForm?.AssignedDevelopers || [])
                        return currentIds.includes(u.value)
                      })}
                    onChange={(selected) =>
                      handleEditChange(
                        'AssignedDevelopers',
                        selected ? selected.map((s) => s.value) : [],
                      )
                    }
                    isMulti
                    className="underline-input select"
                    classNamePrefix="lead-select"
                    placeholder="Select developers"
                    isClearable
                    menuPlacement="auto"
                    menuShouldScrollIntoView={false}
                    styles={{ menu: (base) => ({ ...base, maxHeight: 220 }) }}
                  />
                ) : (
                  <Form.Control
                    type="text"
                    value={getDeveloperNames(project.AssignedDevelopers || [])}
                    readOnly
                    className="underline-input"
                  />
                )}
              </Form.Group>

              <Form.Group className="col-md-3 mb-2">
                <Form.Label>Technology Stack</Form.Label>
                <Form.Control
                  type="text"
                  value={
                    isEditing ? editForm?.TechnologyStack || '' : project.TechnologyStack || ''
                  }
                  readOnly={!isEditing}
                  className="underline-input"
                  onChange={(e) => isEditing && handleEditChange('TechnologyStack', e.target.value)}
                />
              </Form.Group>
              <Form.Group className="col-md-3 mb-2">
                <Form.Label>Estimated Days</Form.Label>
                <Form.Control
                  type="number"
                  value={isEditing ? editForm?.EstimatedHours || '' : project.EstimatedHours || ''}
                  readOnly={!isEditing}
                  className="underline-input"
                  onChange={(e) => isEditing && handleEditChange('EstimatedHours', e.target.value)}
                />
              </Form.Group>

              {isStrictAdmin && (
                <Form.Group className="col-md-3 mb-2">
                  <Form.Label>Project Budget</Form.Label>
                  <Form.Control
                    type="number"
                    min={0}
                    value={isEditing ? editForm?.ProjectCost || '' : project.ProjectCost || ''}
                    readOnly={!isEditing}
                    className="underline-input"
                    onChange={(e) => isEditing && handleEditChange('ProjectCost', e.target.value)}
                  />
                </Form.Group>
              )}
            </Row>
          </Card.Body>
        </Card>

        {/* ==================== PROJECT PHASES SECTION ==================== */}
        <Card className="mb-4 shadow-sm">
          <Card.Header className="mainBGColor text-white fw-bold d-flex justify-content-between align-items-center">
            <span>Project Phases</span>
            {isAdminUser && !isEditing && (
              <button
                onClick={() => {
                  setSelectMode((prev) => !prev)
                  setConfirmingPhaseIndex(null)
                }}
                style={{
                  background: selectMode ? '#fff' : 'rgba(255,255,255,0.2)',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '4px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: selectMode ? '#1e3a5f' : '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {selectMode ? '✕ Cancel' : '✎ Select'}
              </button>
            )}
          </Card.Header>
          <Card.Body className="p-4">
            {isEditing ? (
              /* ── EDIT MODE: same layout as AddProject ── */
              <Row>
                {(editForm?.PhaseDetails || []).map((phase, index) => (
                  <React.Fragment key={index}>
                    <Form.Group className="col-md-4 mb-2">
                      <Form.Label>
                        Phase Name <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        value={phase.PhaseName || ''}
                        onChange={(e) =>
                          handleEditChange(
                            'PhaseDetails',
                            editForm.PhaseDetails.map((p, i) =>
                              i === index ? { ...p, PhaseName: e.target.value } : p,
                            ),
                          )
                        }
                        className="underline-input"
                        placeholder="Enter phase name"
                      />
                    </Form.Group>

                    <Form.Group className="col-md-5 mb-2">
                      <Form.Label>
                        Phase Description <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        value={phase.PhaseDescription || ''}
                        onChange={(e) =>
                          handleEditChange(
                            'PhaseDetails',
                            editForm.PhaseDetails.map((p, i) =>
                              i === index ? { ...p, PhaseDescription: e.target.value } : p,
                            ),
                          )
                        }
                        className="underline-input"
                        placeholder="Enter phase description"
                      />
                    </Form.Group>

                    <Form.Group className="col-md-2 mb-2">
                      <Form.Label>
                        Days <span className="text-danger">*</span>
                      </Form.Label>
                      <div className="d-flex align-items-center gap-2">
                        <Form.Control
                          type="number"
                          value={phase.PhaseDays || ''}
                          onChange={(e) => {
                            const val = e.target.value
                            if (val === '' || Number(val) >= 0) {
                              handleEditChange(
                                'PhaseDetails',
                                editForm.PhaseDetails.map((p, i) =>
                                  i === index ? { ...p, PhaseDays: val } : p,
                                ),
                              )
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === '-' || e.key === 'e') e.preventDefault()
                          }}
                          className="underline-input"
                          placeholder="Enter days"
                        />
                        {(editForm?.PhaseDetails || []).length > 1 && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() =>
                              handleEditChange(
                                'PhaseDetails',
                                editForm.PhaseDetails.filter((_, i) => i !== index),
                              )
                            }
                            title="Remove phase"
                            style={{ minWidth: 'auto' }}
                          >
                            x
                          </Button>
                        )}
                      </div>
                    </Form.Group>

                    {index === (editForm?.PhaseDetails || []).length - 1 && (
                      <Form.Group className="col-md-1 mb-2 d-flex align-items-end">
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() =>
                            handleEditChange('PhaseDetails', [
                              ...(editForm?.PhaseDetails || []),
                              {
                                PhaseName: '',
                                PhaseDescription: '',
                                PhaseDays: '',
                                PhaseStatus: 'Not Started',
                              },
                            ])
                          }
                        >
                          +
                        </Button>
                      </Form.Group>
                    )}
                  </React.Fragment>
                ))}
              </Row>
            ) : (
              /* ── VIEW MODE: read-only phase cards ── */
              <Row>
                {!phases || phases.length === 0 ? (
                  <div className="text-center text-muted py-5 w-100">
                    <h6>No phases added yet</h6>
                    <p>Add project phases to start tracking progress.</p>
                  </div>
                ) : (
                  phases.map((phase, index) => {
                    const phaseName =
                      phase.PhaseName || phase.phaseName || phase.name || `Phase ${index + 1}`
                    const hasPostsForPhase = posts.some(
                      (post) => post.phase?.trim() === phaseName?.trim(),
                    )
                    const isCompleted = phase.PhaseStatus === 'Completed' || hasPostsForPhase
                    const isSelected = selectedPhaseIndex === index
                    const isConfirming = confirmingPhaseIndex === index
                    const isMarking = markingPhaseIndex === index

                    return (
                      <Col sm={6} md={4} lg={3} key={phase._id || index} className="mb-3">
                        <div style={{ position: 'relative' }}>
                          {/* ── Select mode top-right circle ── */}
                          {selectMode && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation()
                                setConfirmingPhaseIndex(isConfirming ? null : index)
                              }}
                              title={isCompleted ? 'Completed' : 'Click to mark'}
                              style={{
                                position: 'absolute',
                                top: -9,
                                right: -9,
                                zIndex: 20,
                                width: 24,
                                height: 24,
                                borderRadius: '50%',
                                background: isCompleted
                                  ? 'linear-gradient(135deg,#22c55e,#16a34a)'
                                  : 'linear-gradient(135deg,#94a3b8,#64748b)',
                                border: '2.5px solid #fff',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.20)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'transform 0.15s',
                              }}
                            >
                              {isCompleted ? (
                                <FaCheckCircle size={12} color="#fff" />
                              ) : (
                                <span
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    background: '#fff',
                                    display: 'block',
                                  }}
                                />
                              )}
                            </div>
                          )}

                          {/* ── Mark as Completed tooltip ── */}
                          {selectMode && isConfirming && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                position: 'absolute',
                                bottom: 'calc(100% + 10px)',
                                right: 0,
                                zIndex: 30,
                                background: '#fff',
                                border: '1px solid #e2e8f0',
                                borderRadius: '12px',
                                boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
                                padding: '10px 14px',
                                whiteSpace: 'nowrap',
                                minWidth: 160,
                              }}
                            >
                              {/* arrow pointer */}
                              <div
                                style={{
                                  position: 'absolute',
                                  bottom: -7,
                                  right: 12,
                                  width: 12,
                                  height: 12,
                                  background: '#fff',
                                  border: '1px solid #e2e8f0',
                                  borderTop: 'none',
                                  borderLeft: 'none',
                                  transform: 'rotate(45deg)',
                                }}
                              />
                              <p
                                style={{
                                  fontSize: 11,
                                  color: '#64748b',
                                  margin: '0 0 8px',
                                  fontWeight: 500,
                                }}
                              >
                                Phase {index + 1} — {phaseName}
                              </p>
                              <button
                                disabled={isMarking}
                                onClick={() => markPhaseCompleted(index)}
                                style={{
                                  width: '100%',
                                  background: isCompleted
                                    ? 'linear-gradient(135deg,#f59e0b,#d97706)'
                                    : 'linear-gradient(135deg,#22c55e,#16a34a)',
                                  border: 'none',
                                  borderRadius: '8px',
                                  color: '#fff',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  padding: '7px 12px',
                                  cursor: isMarking ? 'not-allowed' : 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 6,
                                  opacity: isMarking ? 0.7 : 1,
                                }}
                              >
                                {isMarking ? (
                                  <>
                                    <Spinner size="sm" animation="border" /> Saving...
                                  </>
                                ) : isCompleted ? (
                                  <>
                                    <FaClock size={11} /> Mark Incomplete
                                  </>
                                ) : (
                                  <>
                                    <FaCheckCircle size={11} /> Mark as Completed
                                  </>
                                )}
                              </button>
                            </div>
                          )}

                          {/* ── Phase card ── */}
                          <div
                            onClick={() => {
                              if (selectMode) {
                                setConfirmingPhaseIndex(isConfirming ? null : index)
                                return
                              }
                              if (isSelected) {
                                setSelectedPhaseIndex(null)
                                setSelectedPhase(null)
                              } else {
                                setSelectedPhaseIndex(index)
                                setSelectedPhase(phaseName)
                              }
                            }}
                            style={{
                              borderRadius: 14,
                              overflow: 'hidden',
                              border: isConfirming
                                ? '2px solid #3b82f6'
                                : isSelected
                                  ? '2px solid #3b82f6'
                                  : isCompleted
                                    ? '2px solid #22c55e'
                                    : '2px solid #e9ecef',
                              background: '#fff',
                              boxShadow:
                                isConfirming || isSelected
                                  ? '0 0 0 3px rgba(59,130,246,0.15)'
                                  : isCompleted
                                    ? '0 0 0 3px rgba(34,197,94,0.10)'
                                    : '0 2px 8px rgba(0,0,0,0.06)',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-3px)'
                              e.currentTarget.style.boxShadow = isCompleted
                                ? '0 8px 20px rgba(34,197,94,0.20)'
                                : '0 8px 20px rgba(0,0,0,0.10)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)'
                              e.currentTarget.style.boxShadow =
                                isConfirming || isSelected
                                  ? '0 0 0 3px rgba(59,130,246,0.15)'
                                  : isCompleted
                                    ? '0 0 0 3px rgba(34,197,94,0.10)'
                                    : '0 2px 8px rgba(0,0,0,0.06)'
                            }}
                          >
                            {/* Coloured top strip */}
                            <div
                              style={{
                                background: isCompleted
                                  ? 'linear-gradient(135deg,#22c55e 0%,#16a34a 100%)'
                                  : 'linear-gradient(135deg,#64748b 0%,#475569 100%)',
                                padding: '10px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              <span
                                style={{
                                  color: '#fff',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  opacity: 0.85,
                                }}
                              >
                                Phase {index + 1}
                              </span>
                              {isCompleted ? (
                                <FaCheckCircle size={14} color="#fff" />
                              ) : (
                                <span
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.4)',
                                    display: 'inline-block',
                                  }}
                                />
                              )}
                            </div>

                            {/* Card body */}
                            <div style={{ padding: '12px 14px 14px' }}>
                              <div
                                style={{
                                  fontSize: 14,
                                  fontWeight: 700,
                                  color: '#1e293b',
                                  marginBottom: 2,
                                  lineHeight: 1.3,
                                }}
                              >
                                {phaseName}
                              </div>
                              <div
                                style={{
                                  fontSize: 12,
                                  color: '#94a3b8',
                                  marginBottom: 10,
                                  lineHeight: 1.4,
                                  minHeight: 18,
                                }}
                              >
                                {phase.PhaseDescription || phase.description || '—'}
                              </div>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 6,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    background: isCompleted ? '#dcfce7' : '#f1f5f9',
                                    color: isCompleted ? '#15803d' : '#475569',
                                    borderRadius: 20,
                                    padding: '2px 10px',
                                  }}
                                >
                                  {phase.PhaseDays || phase.days || 'N/A'} days
                                </span>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    color:
                                      phase.PhaseStatus === 'Completed'
                                        ? '#15803d'
                                        : hasPostsForPhase
                                          ? '#2563eb'
                                          : '#94a3b8',
                                  }}
                                >
                                  {phase.PhaseStatus === 'Completed' ? (
                                    <>
                                      <FaCheckCircle size={10} /> Completed
                                    </>
                                  ) : hasPostsForPhase ? (
                                    <>
                                      <FaCheckCircle size={10} /> Has Posts
                                    </>
                                  ) : (
                                    <>
                                      <FaClock size={10} /> Pending
                                    </>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Col>
                    )
                  })
                )}
              </Row>
            )}
          </Card.Body>
        </Card>

        {/* ==================== Updates SECTION ==================== */}
        <Card className="mb-4 shadow-sm">
          <Card.Header className="mainBGColor text-white fw-bold d-flex justify-content-between align-items-center">
            <span>Developer Progress Updates</span>
            <Button
              size="sm"
              variant="light"
              onClick={() => {
                setEditingPost(null)
                setShowPostModal(true)
              }}
              className="d-flex align-items-center gap-1"
            >
              Add Progress
              <FaPlus size={14} />
            </Button>
          </Card.Header>
          <Card.Body className="p-3">
            {/* Phase filter chips */}
            {phases.length > 0 && (
              <div className="det-phase-filter">
                <button
                  className={`det-filter-chip${!selectedPhase ? ' active' : ''}`}
                  onClick={() => {
                    setSelectedPhase(null)
                    setSelectedPhaseIndex(null)
                  }}
                >
                  All Phases
                </button>
                {phases.map((ph, i) => {
                  const pn = ph.PhaseName || ph.phaseName || ph.name || `Phase ${i + 1}`
                  return (
                    <button
                      key={i}
                      className={`det-filter-chip${selectedPhaseIndex === i ? ' active' : ''}`}
                      onClick={() => {
                        if (selectedPhaseIndex === i) {
                          setSelectedPhase(null)
                          setSelectedPhaseIndex(null)
                        } else {
                          setSelectedPhase(pn)
                          setSelectedPhaseIndex(i)
                        }
                      }}
                    >
                      {pn}
                    </button>
                  )
                })}
              </div>
            )}

            {(() => {
              const visiblePosts = selectedPhase
                ? posts.filter((post) => post.phase?.trim() === selectedPhase?.trim())
                : posts
              return visiblePosts.length === 0 ? (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '48px 20px',
                    color: '#94a3b8',
                    background: '#f8fafc',
                    borderRadius: 12,
                    border: '1px dashed #cbd5e1',
                  }}
                >
                  <FaLayerGroup size={32} style={{ marginBottom: 10, opacity: 0.4 }} />
                  <p style={{ margin: 0, fontWeight: 500 }}>
                    No posts yet. Click "Add Post" to create your first update!
                  </p>
                </div>
              ) : (
                <div>
                  {visiblePosts.map((post, postIdx) => (
                    <div className="det-timeline-item" key={post.id}>
                      {/* Avatar dot + vertical line */}
                      <div className="det-timeline-dot-wrap">
                        <div className="det-timeline-dot">
                          {post.developer.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        {postIdx < visiblePosts.length - 1 && <div className="det-timeline-line" />}
                      </div>

                      {/* Card */}
                      <div className="det-timeline-card">
                        {/* Head */}
                        <div className="det-timeline-card-head">
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: 13,
                              color: '#1e293b',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                          >
                            {post.developer.name}
                            {post.isAdmin && <MdVerified size={14} color="#2563eb" title="Admin" />}
                          </span>

                          {post.phase && (
                            <span
                              className="det-phase-badge"
                              style={{ background: '#eff6ff', color: '#2563eb' }}
                            >
                              <FaLayerGroup size={9} /> {post.phase}
                            </span>
                          )}
                          {post.module && (
                            <span
                              className="det-phase-badge"
                              style={{ background: '#f0fdf4', color: '#15803d' }}
                            >
                              <FaCode size={9} /> {post.module}
                            </span>
                          )}

                          <span
                            style={{
                              marginLeft: 'auto',
                              fontSize: 11,
                              color: '#94a3b8',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              flexWrap: 'nowrap',
                            }}
                          >
                            <FaClock size={10} />
                            {formatTimeAgo(post.edited ? post.updatedAt : post.createdAt)}
                            {post.edited && (
                              <span style={{ color: '#f59e0b', fontWeight: 600 }}> · Edited</span>
                            )}
                          </span>

                          {canEditPost(post) && (
                            <span
                              title="Delete"
                              onClick={() => handleDeleteClick(post.id)}
                              style={{
                                cursor: 'pointer',
                                color: '#ef4444',
                                marginLeft: 4,
                                display: 'flex',
                                alignItems: 'center',
                              }}
                            >
                              <FaTrash size={12} />
                            </span>
                          )}
                        </div>

                        {/* Body */}
                        <div className="det-timeline-card-body">
                          <div
                            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}
                          />

                          {post.images && post.images.length > 0 && (
                            <div
                              style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}
                            >
                              {post.images.map((file, idx) => {
                                const isPdf = file.toLowerCase().endsWith('.pdf')
                                const fullUrl = file.startsWith('http')
                                  ? file
                                  : `${BASE_URL}${file}`
                                return isPdf ? (
                                  <a
                                    key={idx}
                                    href={fullUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="det-attach-btn"
                                    style={{
                                      color: '#e65100',
                                      background: '#fff3e0',
                                      borderColor: '#ffcc80',
                                    }}
                                  >
                                    <FaPaperclip size={11} />
                                    PDF {post.images.length > 1 ? idx + 1 : ''}
                                  </a>
                                ) : (
                                  <button
                                    key={idx}
                                    className="det-attach-btn"
                                    onClick={() => setLightboxImg(fullUrl)}
                                  >
                                    <FaPaperclip size={11} />
                                    View Attachment {post.images.length > 1 ? idx + 1 : ''}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </Card.Body>
        </Card>

        {/* Post Modal */}
        <PostModal
          show={showPostModal}
          onHide={() => {
            setShowPostModal(false)
            setEditingPost(null)
          }}
          onPost={handlePostSubmit}
          existingPost={editingPost}
          phases={project?.PhaseDetails || project?.phaseDetails || project?.phases || []}
        />

        {/* Confirmation Modal */}
        <ConfirmationModal
          show={confirmState.show}
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState((prev) => ({ ...prev, show: false }))}
        />
      </Container>

      {/* Attachment Lightbox */}
      {lightboxImg && (
        <div
          onClick={() => setLightboxImg(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2000,
            background: 'rgba(0,0,0,0.82)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <button
            onClick={() => setLightboxImg(null)}
            style={{
              position: 'fixed',
              top: '16px',
              right: '20px',
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '38px',
              height: '38px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
              zIndex: 2001,
              backdropFilter: 'blur(4px)',
            }}
          >
            <FaTimes size={18} />
          </button>
          <img
            src={lightboxImg}
            alt="Attachment"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '92vw',
              maxHeight: '90vh',
              width: 'auto',
              height: 'auto',
              borderRadius: '10px',
              boxShadow: '0 16px 60px rgba(0,0,0,0.7)',
              display: 'block',
            }}
          />
        </div>
      )}
    </>
  )
}

export default ProjectDetails
