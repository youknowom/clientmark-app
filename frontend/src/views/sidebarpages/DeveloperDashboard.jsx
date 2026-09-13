import React, { useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Doughnut, Bar } from 'react-chartjs-2'
import apiClient from '../../api/axiosClient'
import { Container, Row, Col, Card, Table, Button } from 'react-bootstrap'
import { AiOutlineFileProtect } from 'react-icons/ai'
import { MdOutlineComputer } from 'react-icons/md'
import { BsCheckCircle } from 'react-icons/bs'
import { Helmet } from 'react-helmet'
import ThemeContext from './ThemeContext'
import toast from 'react-hot-toast'
import { AuthContext } from '../../AuthContext'

import '../sidebarCSS/dashboard.css'
import '../sidebarCSS/comStyle.css'
import '../sidebarCSS/table.css'

import {
  Chart as ChartJS,
  Tooltip,
  Legend,
  ArcElement,
  Title,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js'
import { socket } from '../../socket/socket'

ChartJS.register(ArcElement, Tooltip, Legend, Title, CategoryScale, LinearScale, BarElement)

const DeveloperDashboard = () => {
  const { token, userData } = useContext(AuthContext)
  const { theme } = useContext(ThemeContext)
  const navigate = useNavigate()
  const [dateFilter, setDateFilter] = useState({ fromDate: '', toDate: '' })
  const [isLoading, setIsLoading] = useState('')

  // Project dashboard states
  const [projectCounts, setProjectCounts] = useState({
    totalProjects: 0,
    newProjectsToday: 0,
    projectsInProgress: 0,
    completedProjects: 0,
    activeDevelopers: 0,
  })
  const [projectStatus, setProjectStatus] = useState({})
  const [recentProjects, setRecentProjects] = useState([])
  const [projectReport, setProjectReport] = useState([])
  const [projectActivities, setProjectActivities] = useState({
    totalActivities: 0,
    activityList: [],
  })
  const [developerLeaderboard, setDeveloperLeaderboard] = useState([])

  const projectCardData = [
    {
      count: projectCounts.totalProjects || 0,
      label: 'Total Projects',
      icon: <AiOutlineFileProtect size={28} />,
      iconBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      iconColor: '#fff',
      filter: '',
      link: '/all-project',
    },
    {
      count: projectCounts.newProjectsToday || 0,
      label: 'Assigned',
      icon: <MdOutlineComputer size={28} />,
      iconBg: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      iconColor: '#fff',
      filter: 'Assigned',
      link: '/all-project',
    },
    {
      count: projectCounts.projectsInProgress || 0,
      label: 'Completed',
      icon: <BsCheckCircle size={28} />,
      iconBg: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
      iconColor: '#fff',
      filter: 'Completed',
      link: '/all-project',
    },
  ]

  // Project Doughnut chart data
  const projectDoughnutData = {
    labels: [
      'Not assigned',
      'Assigned',
      'Hold',
      'In Progress',
      'Testing',
      'Client Review',
      'Completed',
    ],
    datasets: [
      {
        label: 'Project Status',
        data: [
          projectStatus['Not assigned'] || 0,
          projectStatus.Assigned || 0,
          projectStatus.Hold || 0,
          projectStatus['In Progress'] || 0,
          projectStatus.Testing || 0,
          projectStatus['Client Review'] || 0,
          projectStatus.Completed || 0,
        ],
        backgroundColor: [
          '#3B82F6',
          '#06B6D4',
          '#EF4444',
          '#F59E0B',
          '#8B5CF6',
          '#EC4899',
          '#10B981',
        ],
        borderColor: ['#fff'],
        borderWidth: 2,
      },
    ],
  }

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          generateLabels: function (chart) {
            const data = chart.data
            if (data.labels.length && data.datasets.length) {
              const dataset = data.datasets[0]
              return data.labels.map((label, i) => ({
                text: `${label}: ${dataset.data[i]}`,
                fillStyle: dataset.backgroundColor[i],
                strokeStyle: dataset.backgroundColor[i],
                lineWidth: 0,
                index: i,
              }))
            }
            return []
          },
        },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const label = context.label || ''
            const value = context.parsed || 0
            const total = context.dataset.data.reduce((a, b) => a + b, 0)
            const percentage = ((value / total) * 100).toFixed(1)
            return `${label}: ${value} (${percentage}%)`
          },
        },
      },
    },
  }

  // Developer Leaderboard Bar chart
  const developerLeaderboardData = {
    labels: developerLeaderboard
      .slice(0, 8)
      .map((dev) => (dev.name.length > 15 ? dev.name.substring(0, 15) + '...' : dev.name)),
    datasets: [
      {
        label: 'Timeline Posts',
        data: developerLeaderboard.slice(0, 8).map((dev) => dev.posts),
        backgroundColor: [
          '#3B82F6',
          '#10B981',
          '#F59E0B',
          '#8B5CF6',
          '#EF4444',
          '#06B6D4',
          '#EC4899',
          '#84CC16',
        ],
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  }

  const developerLeaderboardOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: 'Developer Activity Leaderboard',
        font: { size: 14, weight: 'bold' },
      },
      tooltip: {
        callbacks: {
          afterLabel: function (context) {
            const developerIndex = context.dataIndex
            const developer = developerLeaderboard[developerIndex]
            return developer ? `Projects: ${developer.projectCount}` : ''
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        border: { display: true, color: '#dee2e6' },
        grid: { display: true, color: 'rgba(0,0,0,0.07)' },
        ticks: {
          stepSize: 1,
          precision: 0,
        },
        title: { display: true, text: 'Timeline Posts' },
      },
      x: {
        border: { display: true, color: '#dee2e6' },
        grid: { display: false },
      },
    },
  }

  // ── Main data fetch ──────────────────────────────────────────────────────────
  const getProjectDashboardData = async () => {
    try {
      setIsLoading('projectDashboard')

      if (!userData?._id) {
        return
      }

      const developerId = userData._id

      const projectsResponse = await apiClient.get('/project/get-projects', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          limit: 1000,
          ...(dateFilter.fromDate && { fromDate: dateFilter.fromDate }),
          ...(dateFilter.toDate && { toDate: dateFilter.toDate }),
        },
      })

      const allProjects = projectsResponse.data.data || []

      // Only keep projects where this developer is assigned
      const developerProjects = allProjects.filter((project) => {
        if (!project.AssignedDevelopers || !Array.isArray(project.AssignedDevelopers)) return false
        return project.AssignedDevelopers.some((dev) => {
          const devId = typeof dev === 'object' ? dev._id || dev.id : dev
          return String(devId) === String(developerId)
        })
      })

      const totalProjects = developerProjects.length

      // ── FIXED: exact status match, not "not completed" ──────────────────────
      const assignedProjects = developerProjects.filter(
        (p) => (p.ProjectStatus || '') === 'Assigned',
      ).length

      const completedProjects = developerProjects.filter(
        (p) => (p.ProjectStatus || '') === 'Completed',
      ).length
      // ────────────────────────────────────────────────────────────────────────

      // Count all statuses for doughnut chart
      const statusCounts = {
        'Not assigned': 0,
        Assigned: 0,
        Hold: 0,
        'In Progress': 0,
        Testing: 0,
        'Client Review': 0,
        Completed: 0,
      }
      developerProjects.forEach((project) => {
        const status = project.ProjectStatus || 'Not assigned'
        if (Object.prototype.hasOwnProperty.call(statusCounts, status)) {
          statusCounts[status]++
        }
      })

      setProjectCounts({
        totalProjects: totalProjects,
        newProjectsToday: assignedProjects,
        projectsInProgress: completedProjects,
        completedProjects: completedProjects, // actual count, not hardcoded
        activeDevelopers: totalProjects > 0 ? 1 : 0,
      })

      setProjectStatus(statusCounts)

      // Recent projects — latest 5
      const recentProjectsData = [...developerProjects]
        .sort(
          (a, b) =>
            new Date(b.createdAt || b.ProjectStartDate) -
            new Date(a.createdAt || a.ProjectStartDate),
        )
        .slice(0, 5)

      setRecentProjects(recentProjectsData)

      await fetchDeveloperProjectReport(developerProjects)
      await fetchDeveloperLeaderboard()
      await fetchDeveloperProjectActivities(developerProjects)
    } catch (error) {
      setProjectCounts({
        totalProjects: 0,
        newProjectsToday: 0,
        projectsInProgress: 0,
        completedProjects: 0,
        activeDevelopers: 0,
      })
      setProjectStatus({})
      setRecentProjects([])
      toast.error('Failed to load Developer dashboard data')
    } finally {
      setIsLoading('')
    }
  }

  // Fetch report for current developer
  const fetchDeveloperProjectReport = async (developerProjects) => {
    try {
      if (!userData) return

      const totalProjects = developerProjects.length
      // ── FIXED: exact status match ────────────────────────────────────────────
      const assignedProjects = developerProjects.filter(
        (p) => (p.ProjectStatus || '') === 'Assigned',
      ).length
      const completedProjects = developerProjects.filter(
        (p) => (p.ProjectStatus || '') === 'Completed',
      ).length
      // ────────────────────────────────────────────────────────────────────────

      setProjectReport([
        {
          fullName: userData.fullName || userData.name || 'Current Developer',
          totalProjects,
          assignedProjects,
          completedProjects,
        },
      ])
    } catch (error) {
      setProjectReport([])
    }
  }

  // Fetch leaderboard from timeline data
  const fetchDeveloperLeaderboard = async () => {
    try {
      const projectsResponse = await apiClient.get('/project/get-projects', {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 1000 },
      })

      const projects = projectsResponse.data.data || []
      const developerActivityMap = {}

      for (const project of projects) {
        try {
          const timelineRes = await apiClient.get(`/project/${project._id}/timeline`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          const timeline = timelineRes.data.data || []

          timeline.forEach((activity) => {
            const developer = activity.addById
            if (developer) {
              const devKey = developer._id
              const devName = developer.fullName || developer.name || 'Unknown'

              if (!developerActivityMap[devKey]) {
                developerActivityMap[devKey] = { name: devName, posts: 0, projects: new Set() }
              }
              developerActivityMap[devKey].posts++
              developerActivityMap[devKey].projects.add(project._id)
            }
          })
        } catch {
          // skip projects with no timeline
        }
      }

      const leaderboard = Object.values(developerActivityMap)
        .map((dev) => ({ ...dev, projectCount: dev.projects.size }))
        .sort((a, b) => b.posts - a.posts)
        .slice(0, 10)

      setDeveloperLeaderboard(leaderboard)
    } catch (err) {
      setDeveloperLeaderboard([])
    }
  }

  // Fetch activities for developer's projects
  const fetchDeveloperProjectActivities = async (developerProjects) => {
    try {
      const usersRes = await apiClient.get('/user/get-user-list', {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 1000 },
      })

      const allUsers = usersRes.data.data || []
      const userMap = {}
      allUsers.forEach((user) => {
        userMap[user._id] = user.fullName || user.name || 'Unknown User'
      })

      const list = developerProjects.map((project) => {
        const projectManager = project.AssignedProjectManager || 'Not Assigned'
        let developers = []
        if (project.AssignedDevelopers && Array.isArray(project.AssignedDevelopers)) {
          developers = project.AssignedDevelopers.map((devId) => {
            const id = typeof devId === 'object' ? devId._id || devId.id : devId
            return userMap[id] || 'Unknown Developer'
          })
        }
        return {
          id: project._id,
          projectName: project.ProjectName || 'Unknown Project',
          manager: projectManager,
          developers: developers.length > 0 ? developers.join(', ') : 'No Developers Assigned',
          status: project.ProjectStatus || 'Unknown',
          createdDate: project.createdAt,
        }
      })

      const sorted = list.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate))

      setProjectActivities({
        totalActivities: sorted.length,
        activityList: sorted.slice(0, 10),
      })
    } catch (error) {
      setProjectActivities({ totalActivities: 0, activityList: [] })
    }
  }

  useEffect(() => {
    getProjectDashboardData()
  }, [dateFilter])

  // ── Card click handler ───────────────────────────────────────────────────────
  // filter: null  → go to /all-project with NO state = show all
  // filter value  → pass as route state so AllProject pre-filters the status
  const handleCardClick = (item) => {
    if (item.filter) {
      navigate(item.link, { state: { filter: item.filter } })
    } else {
      navigate(item.link)
    }
  }

  // Helper: badge colour per status
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Completed':
        return '#28a745'
      case 'Not assigned':
        return '#007bff'
      case 'Hold':
        return '#dc3545'
      case 'In Progress':
        return '#ffc107'
      case 'Assigned':
        return '#06B6D4'
      case 'Testing':
        return '#8B5CF6'
      case 'Client Review':
        return '#EC4899'
      default:
        return '#6c757d'
    }
  }

  useEffect(() => {
    if (!socket) return
    // 'update-project' is the event emitted by the backend on project changes
    const events = ['create-project', 'update-leaderboard']
    const handler = () => getProjectDashboardData()
    events.forEach((event) => socket.on(event, handler))
    return () => events.forEach((event) => socket.off(event, handler))
  }, [socket, dateFilter])
  return (
    <div>
      <Helmet>
        <title>Developer Dashboard — Clientmark</title>
      </Helmet>
      <Container className="mt-4 container-lg p-0">
        {/* Header */}
        <Row className="mb-3 align-items-center justify-content-between">
          <Col xs="12" md="6">
            <h1
              style={{
                fontWeight: 700,
                fontSize: '1.5rem',
                color: theme.primaryColor,
                marginBottom: 0,
              }}
            >
              Developer Dashboard
            </h1>
          </Col>
          <Col
            xs="12"
            md="6"
            className="d-flex justify-content-md-end align-items-center mt-2 mt-md-0 gap-2"
          >
            <input
              type="date"
              className="form-control form-control-sm"
              value={dateFilter.fromDate}
              onChange={(e) => setDateFilter({ ...dateFilter, fromDate: e.target.value })}
              style={{ maxWidth: 140 }}
            />
            <input
              type="date"
              className="form-control form-control-sm"
              value={dateFilter.toDate}
              onChange={(e) => setDateFilter({ ...dateFilter, toDate: e.target.value })}
              style={{ maxWidth: 140 }}
            />
            <Button className="button" onClick={() => getProjectDashboardData()}>
              Apply
            </Button>
          </Col>
        </Row>

        {/* ROW 1 - Summary Cards */}
        <Row className="mb-4">
          <Col xs={12}>
            <Row className="g-3">
              {projectCardData.map((item, idx) => (
                <Col key={idx} xs={12} sm={6} md={4}>
                  <Card
                    className="d-flex flex-row align-items-center justify-content-between shadow-sm rounded-4 dashboard-tile-card"
                    onClick={() => handleCardClick(item)}
                    style={{ cursor: 'pointer', height: '110px', padding: '20px' }}
                  >
                    <div>
                      <div className="text-muted small fw-bold mb-1">{item.label}</div>
                      <div className="fw-bold fs-3 text-dark">{item.count.toLocaleString()}</div>
                    </div>
                    <div
                      className="d-flex align-items-center justify-content-center ms-3"
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: item.iconBg,
                        color: item.iconColor,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      }}
                    >
                      {item.icon}
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          </Col>
        </Row>

        {/* ROW 2 - Charts */}
        <Row className="mb-4">
          <Col xs={12}>
            <Row className="g-3">
              <Col md={6}>
                <Card className="p-3 shadow-sm rounded-4" style={{ height: '400px' }}>
                  <h6 className="fw-bold mb-1">My Project Status Progress</h6>
                  <p className="text-muted" style={{ fontSize: '12px' }}>
                    Total: {projectCounts.totalProjects || 0} &nbsp;|&nbsp; Assigned:{' '}
                    {projectStatus.Assigned || 0} &nbsp;|&nbsp; Completed:{' '}
                    {projectStatus.Completed || 0}
                  </p>
                  <div style={{ width: '280px', height: '280px', margin: 'auto' }}>
                    <Doughnut data={projectDoughnutData} options={doughnutOptions} />
                  </div>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="p-3 shadow-sm rounded-4" style={{ height: '400px' }}>
                  <h6 className="fw-bold mb-3">Developer Activity Leaderboard</h6>
                  <div style={{ width: '100%', height: '320px', position: 'relative' }}>
                    <Bar data={developerLeaderboardData} options={developerLeaderboardOptions} />
                  </div>
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>

        {/* ROW 3 - Recent Projects */}
        <Row className="mb-4">
          <Col xs={12}>
            <Row className="g-3">
              <Col md={12}>
                <Card className="p-3 shadow-sm rounded-4" style={{ height: '250px' }}>
                  <h6 className="fw-bold mb-3">My Recent Projects</h6>
                  <Table hover responsive className="user-table">
                    <thead style={{ backgroundColor: '#FF8C42' }}>
                      <tr>
                        <th
                          style={{ color: 'white', backgroundColor: '#FF8C42', fontSize: '14px' }}
                        >
                          Project ID
                        </th>
                        <th
                          style={{ color: 'white', backgroundColor: '#FF8C42', fontSize: '14px' }}
                        >
                          Project Name
                        </th>
                        <th
                          style={{ color: 'white', backgroundColor: '#FF8C42', fontSize: '14px' }}
                        >
                          Status
                        </th>
                        <th
                          style={{ color: 'white', backgroundColor: '#FF8C42', fontSize: '14px' }}
                        >
                          Project Manager
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {!Array.isArray(recentProjects) || recentProjects.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center text-muted">
                            No record found
                          </td>
                        </tr>
                      ) : (
                        recentProjects.slice(0, 5).map((project, idx) => (
                          <tr key={project._id || idx}>
                            <td style={{ fontSize: '13px' }}>{project.ProjectId || 'N/A'}</td>
                            <td style={{ fontSize: '13px', fontWeight: '500' }}>
                              {project.ProjectName || 'N/A'}
                            </td>
                            <td>
                              <span
                                className="badge"
                                style={{
                                  backgroundColor: getStatusBadgeColor(project.ProjectStatus),
                                  color: 'white',
                                  fontSize: '11px',
                                  padding: '4px 8px',
                                }}
                              >
                                {project.ProjectStatus || 'N/A'}
                              </span>
                            </td>
                            <td style={{ fontSize: '13px' }}>
                              {project.AssignedProjectManager || 'N/A'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </Table>
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>
      </Container>
    </div>
  )
}

export default DeveloperDashboard
