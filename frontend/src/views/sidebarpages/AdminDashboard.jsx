import React, { useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Doughnut, Bar } from 'react-chartjs-2'
import apiClient from '../../api/axiosClient'
import { Container, Row, Col, Card, Table, Button } from 'react-bootstrap'
import {
  FiUsers,
  FiPhoneCall,
  FiCheckCircle,
  FiUserCheck,
  FiFolder,
  FiLayers,
  FiPieChart,
  FiActivity,
  FiCheck,
  FiArrowRight,
  FiCompass,
  FiUserPlus,
  FiCreditCard,
} from 'react-icons/fi'
import { Helmet } from 'react-helmet'
import ThemeContext from './ThemeContext'
import toast from 'react-hot-toast'
import { AuthContext } from '../../AuthContext'

import '../sidebarCSS/dashboard.css'
import '../sidebarCSS/comStyle.css'
import '../sidebarCSS/table.css'
import SetupGuide from '../../components/SetupGuide'
import OnboardingWizard from '../../components/OnboardingWizard'

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
import { clearListState } from '../../helpers/listStateStorage'
import { socket } from '../../socket/socket'

ChartJS.register(ArcElement, Tooltip, Legend, Title, CategoryScale, LinearScale, BarElement)

const AdminDashboard = () => {
  const { theme } = useContext(ThemeContext)
  const navigate = useNavigate()
  const [dashboardView, setDashboardView] = useState(
    () => localStorage.getItem('adminDashboardView') || 'projects',
  )

  const [counts, setCounts] = useState({
    totalUser: 0,
    totalLead: 0,
    totalSellerLead: 0,
    totalBuyerLead: 0,
    newLeadsToday: 0,
    convertedLeads: 0,
    activeUsers: 0,
    totalUsers: 0,
  })
  const [leadStatus, setLeadStatus] = useState({})
  const [leadNature, setLeadNature] = useState({})
  const [recentSellerLead, setRecentSellerLead] = useState([])

  // Project dashboard states
  const [projectCounts, setProjectCounts] = useState({
    totalProjects: 0,
    newProjectsToday: 0, // assigned projects
    projectsInProgress: 0, // completed projects
    completedProjects: 0, // total developers
    activeDevelopers: 0, // developers working on projects
  })
  const [projectStatus, setProjectStatus] = useState({})
  const [recentProjects, setRecentProjects] = useState([])

  const [projectReport, setProjectReport] = useState([])
  const [projectActivities, setProjectActivities] = useState({
    totalActivities: 0,
    recentActivities: 0,
    pendingActivities: 0,
    completedActivities: 0,
    activityList: [],
  })
  const [developerLeaderboard, setDeveloperLeaderboard] = useState([])

  const [telecallerReport, setTelecallerReport] = useState([])
  const [callingWork, setCallingWork] = useState({})

  const [dateFilter, setDateFilter] = useState({ fromDate: '', toDate: '' })

  // ─── Handle card click with optional filter state ────────────────────────────
  const handleCardClick = (item) => {
    if (item.filter) {
      navigate(item.link, { state: { filter: item.filter } })
    } else {
      navigate(item.link)
    }
  }

  // Telecaller report
  const fetchTelecallerReport = async () => {
    try {
      const res = await apiClient.get('/lead/get-telecaller-lead-report', {

        params: {
          fromDate: dateFilter.fromDate,
          toDate: dateFilter.toDate,
        },
      })
      setTelecallerReport(res.data.data || [])
    } catch (err) {
      setTelecallerReport([])
    } finally {
    }
  }

  // Project team report
  const fetchProjectTeamReport = async () => {
    try {
      const res = await apiClient.get('/project/get-projects', {

        params: {
          limit: 1000,
          ...(dateFilter.fromDate && { fromDate: dateFilter.fromDate }),
          ...(dateFilter.toDate && { toDate: dateFilter.toDate }),
        },
      })

      const usersRes = await apiClient.get('/user/get-user-list', {

        params: { limit: 1000 },
      })

      const projects = res.data.data || []
      const allUsers = usersRes.data.data || []

      const developers = allUsers.filter((user) => {
        const roleName = user.roleId?.roleName?.toLowerCase() || ''
        return (
          roleName.includes('developer') ||
          roleName.includes('dev') ||
          roleName === 'programmer' ||
          roleName.includes('engineer') ||
          roleName.includes('coder')
        )
      })

      const developerStats = {}

      developers.forEach((dev) => {
        developerStats[dev._id] = {
          fullName: dev.fullName || dev.name || 'Unknown',
          assignedProjects: 0,
          completedProjects: 0,
          totalProjects: 0,
        }
      })

      projects.forEach((project) => {
        if (project.AssignedDevelopers && Array.isArray(project.AssignedDevelopers)) {
          project.AssignedDevelopers.forEach((devId) => {
            const id = typeof devId === 'object' ? devId._id || devId.id : devId

            if (developerStats[id]) {
              developerStats[id].totalProjects++

              if ((project.ProjectStatus || '').toLowerCase() !== 'completed') {
                developerStats[id].assignedProjects++
              }

              if ((project.ProjectStatus || '').toLowerCase() === 'completed') {
                developerStats[id].completedProjects++
              }
            }
          })
        }
      })

      const teamReport = Object.values(developerStats)
        .filter((dev) => dev.totalProjects > 0)
        .sort((a, b) => b.totalProjects - a.totalProjects)
        .slice(0, 10)

      setProjectReport(teamReport)
    } catch (err) {
      setProjectReport([])
    } finally {
    }
  }

  // Fetch developer activity leaderboard
  const fetchDeveloperLeaderboard = async () => {
    try {
      const projectsRes = await apiClient.get('/project/get-projects', {

        params: { limit: 1000 },
      })

      const projects = projectsRes.data.data || []
      const developerActivityMap = {}

      for (const project of projects) {
        try {
          const timelineRes = await apiClient.get(`/project/${project._id}/timeline`)

          const timeline = timelineRes.data.data || []

          timeline.forEach((activity) => {
            const developer = activity.addById
            if (developer) {
              const devKey = developer._id
              const devName = developer.fullName || developer.name || 'Unknown'

              if (!developerActivityMap[devKey]) {
                developerActivityMap[devKey] = {
                  name: devName,
                  posts: 0,
                  projects: new Set(),
                }
              }

              developerActivityMap[devKey].posts++
              developerActivityMap[devKey].projects.add(project._id)
            }
          })
        } catch (timelineErr) {
        }
      }

      const leaderboard = Object.values(developerActivityMap)
        .map((dev) => ({
          ...dev,
          projectCount: dev.projects.size,
        }))
        .sort((a, b) => b.posts - a.posts)
        .slice(0, 10)

      setDeveloperLeaderboard(leaderboard)
    } catch (err) {
      setDeveloperLeaderboard([])
    } finally {
    }
  }

  // Fetch project activities
  const fetchProjectActivities = async () => {
    try {
      const projectsRes = await apiClient.get('/project/get-projects', {

        params: { limit: 1000 },
      })

      const usersRes = await apiClient.get('/user/get-user-list', {

        params: { limit: 1000 },
      })

      const projects = projectsRes.data.data || []
      const allUsers = usersRes.data.data || []

      const userMap = {}
      allUsers.forEach((user) => {
        userMap[user._id] = user.fullName || user.name || 'Unknown User'
      })

      const projectActivitiesList = []

      projects.forEach((project) => {
        const projectManager = project.AssignedProjectManager || 'Not Assigned'

        let developers = []
        if (project.AssignedDevelopers && Array.isArray(project.AssignedDevelopers)) {
          developers = project.AssignedDevelopers.map((devId) => {
            const id = typeof devId === 'object' ? devId._id || devId.id : devId
            return userMap[id] || 'Unknown Developer'
          })
        }

        const developersText =
          developers.length > 0 ? developers.join(', ') : 'No Developers Assigned'

        projectActivitiesList.push({
          id: project._id,
          projectName: project.ProjectName || 'Unknown Project',
          projectId: project._id,
          manager: projectManager,
          developers: developersText,
          status: project.ProjectStatus || 'Unknown',
          createdDate: project.createdAt,
        })
      })

      const sortedActivities = projectActivitiesList.sort(
        (a, b) => new Date(b.createdDate) - new Date(a.createdDate),
      )

      setProjectActivities({
        totalActivities: sortedActivities.length,
        activityList: sortedActivities.slice(0, 10),
      })
    } catch (err) {
      setProjectActivities({ totalActivities: 0, activityList: [] })
    } finally {
    }
  }

  // Lead card data
  const cardData = [
    {
      count: counts.totalLead || 0,
      label: 'Total Leads',
      icon: <FiUsers size={17} />,
      link: '/all-lead',
    },
    {
      count: counts.newLeadsToday || 0,
      label: 'New Leads Today',
      icon: <FiPhoneCall size={17} />,
      link: '/all-lead',
    },
    {
      count: counts.convertedLeads || 0,
      label: 'Converted Leads',
      icon: <FiCheckCircle size={17} />,
      link: '/all-lead',
    },
    {
      count: `${counts.activeUsers || 0}/${counts.totalUsers || 0}`,
      label: 'Active Users',
      icon: <FiUserCheck size={17} />,
      filter: { excludeRole: 'developer' }, // exclude devs — show only TC & BDE
      link: '/all-user',
    },
  ]

  // Project card data — with filter keys for Assigned and Completed
  const projectCardData = [
    {
      count: projectCounts.totalProjects || 0,
      label: 'Total Projects',
      icon: <FiFolder size={17} />,
      link: '/all-project',
    },
    {
      count: projectCounts.newProjectsToday || 0,
      label: 'Assigned Projects',
      icon: <FiLayers size={17} />,
      filter: 'Assigned', // ← navigates to AllProject with status=Assigned
      link: '/all-project',
    },
    {
      count: projectCounts.projectsInProgress || 0,
      label: 'Completed Projects',
      icon: <FiCheckCircle size={17} />,
      filter: 'Completed',
      link: '/all-project',
    },
    {
      count: `${projectCounts.activeDevelopers || 0}/${projectCounts.completedProjects || 0}`,
      label: 'Active Developers',
      icon: <FiActivity size={17} />,
      filter: { role: 'developer' }, // Use a filter object for developers
      link: '/all-user',
    },
  ]

  // Chart data - Doughnut for Lead Stage
  const doughnutData = {
    labels: ['NEW', 'TELECALLING', 'SALES', 'CLOSED'],
    datasets: [
      {
        label: 'Lead Stage',
        data: [
          leadStatus.NEW || 0,
          leadStatus.TELECALLING || 0,
          leadStatus.SALES || 0,
          leadStatus.CLOSED || 0,
        ],
        backgroundColor: ['#111827', '#E05E3A', '#10B981', '#64748B'],
        borderColor: ['#fff'],
        borderWidth: 2,
      },
    ],
  }

  const leadStatusBarData = {
    labels: ['NEW', 'ASSIGNED_TO_TC', 'ASSIGNED_TO_BDE', 'WON', 'LOST'],
    datasets: [
      {
        label: 'Lead Status Count',
        data: [
          leadNature.NEW || 0,
          leadNature.ASSIGNED_TO_TELECALLER || 0,
          leadNature.ASSIGNED_TO_BDE || 0,
          leadNature.WON || 0,
          leadNature.LOST || 0,
        ],
        backgroundColor: ['#111827', '#3B82F6', '#E05E3A', '#10B981', '#64748B'],
        borderWidth: 1,
      },
    ],
  }

  const leadStatusBarOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Lead Status Distribution' },
    },
    scales: { y: { beginAtZero: true } },
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



  const projectDoughnutData = {
    labels: ['Not assigned', 'Assigned', 'Hold', 'In Progress', 'Testing', 'Client Review', 'Completed'],
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

  // Fetch lead status data
  const getLeadStatusData = async () => {
    try {
      const leadsResponse = await apiClient.get('/lead/get-leads', {
        params: {
          limit: 1000,
          fromDate: dateFilter.fromDate,
          toDate: dateFilter.toDate,
        },
      })

      const leads = leadsResponse.data.data || []

      const stageCounts = {
        NEW: leads.filter((lead) => (lead.leadStage || '').toUpperCase() === 'NEW').length,
        TELECALLING: leads.filter((lead) => (lead.leadStage || '').toUpperCase() === 'TELECALLING')
          .length,
        SALES: leads.filter((lead) => (lead.leadStage || '').toUpperCase() === 'SALES').length,
        CLOSED: leads.filter((lead) => (lead.leadStage || '').toUpperCase() === 'CLOSED').length,
        total: leads.length,
      }

      const statusCounts = {
        NEW: leads.filter((lead) => (lead.leadStatus || '').toUpperCase() === 'NEW').length,
        ASSIGNED_TO_TELECALLER: leads.filter(
          (lead) => (lead.leadStatus || '').toUpperCase() === 'ASSIGNED_TO_TELECALLER',
        ).length,
        ASSIGNED_TO_BDE: leads.filter(
          (lead) => (lead.leadStatus || '').toUpperCase() === 'ASSIGNED_TO_BDE',
        ).length,
        WON: leads.filter((lead) => (lead.leadStatus || '').toUpperCase() === 'WON').length,
        LOST: leads.filter((lead) => (lead.leadStatus || '').toUpperCase() === 'LOST').length,
        total: leads.length,
      }

      return { stageCounts, statusCounts }
    } catch (error) {
      return {
        stageCounts: { NEW: 0, TELECALLING: 0, SALES: 0, CLOSED: 0, total: 0 },
        statusCounts: {
          NEW: 0,
          ASSIGNED_TO_TELECALLER: 0,
          ASSIGNED_TO_BDE: 0,
          WON: 0,
          LOST: 0,
          total: 0,
        },
      }
    }
  }

  // Fetch lead dashboard data
  const getAdminDbDtl = async () => {
    try {
      const { stageCounts, statusCounts } = await getLeadStatusData()

      const leadsResponse = await apiClient.get('/lead/get-leads', {
        params: {
          limit: 1000,
          fromDate: dateFilter.fromDate,
          toDate: dateFilter.toDate,
        },
      })

      const usersResponse = await apiClient
        .get('/user/get-user-list', { params: { limit: 1000 } })
        .catch(() => ({ data: { data: [] } }))

      const leads = leadsResponse.data.data || []
      const allUsers = usersResponse.data.data || []

      // Filter for telecallers and BDEs (users who handle leads)
      const leadHandlers = allUsers.filter((user) => {
        const roleName = user.roleId?.roleName?.toLowerCase() || ''
        return (
          roleName.includes('telecaller') ||
          roleName.includes('tele') ||
          roleName.includes('bde') ||
          roleName.includes('business') ||
          roleName.includes('sales') ||
          roleName.includes('call') ||
          roleName.includes('lead')
        )
      })

      const totalLeads = stageCounts.total || leads.length
      const totalUsers = leadHandlers.length

      const today = new Date().toDateString()
      const newLeadsToday = leads.filter(
        (lead) => new Date(lead.addDate || lead.createdAt).toDateString() === today,
      ).length

      const convertedLeads = stageCounts.CLOSED || 0

      // Calculate active users: leadHandlers who have at least one lead assigned
      // Lead model uses assignedToTelecaller and assignedToBDE (not assignTo)
      const leadHandlerIdSet = new Set(leadHandlers.map((u) => String(u._id)))
      const activeUserIds = new Set()
      leads.forEach((lead) => {
        // Check telecaller assignment
        const tcId = lead.assignedToTelecaller?._id
          ? String(lead.assignedToTelecaller._id)
          : lead.assignedToTelecaller
            ? String(lead.assignedToTelecaller)
            : null
        if (tcId && leadHandlerIdSet.has(tcId)) activeUserIds.add(tcId)

        // Check BDE assignment
        const bdeId = lead.assignedToBDE?._id
          ? String(lead.assignedToBDE._id)
          : lead.assignedToBDE
            ? String(lead.assignedToBDE)
            : null
        if (bdeId && leadHandlerIdSet.has(bdeId)) activeUserIds.add(bdeId)
      })

      const activeUsers = activeUserIds.size
      const totalLeadHandlers = leadHandlers.length

      setCounts({
        totalUser: totalUsers,
        totalLead: totalLeads,
        totalSellerLead: totalLeads,
        totalBuyerLead: 0,
        newLeadsToday: newLeadsToday,
        convertedLeads: convertedLeads,
        activeUsers: activeUsers,
        totalUsers: totalLeadHandlers,
      })

      setLeadStatus(stageCounts)
      setLeadNature(statusCounts)

      const recentLeads = leads
        .sort((a, b) => new Date(b.addDate || b.createdAt) - new Date(a.addDate || a.createdAt))
        .slice(0, 5)

      setRecentSellerLead(recentLeads)


      setCallingWork({
        totalCall: 0,
        totalNotAnswered: 0,
        totalAnswered: 0,
        totalInitiate: 0,
        callingList: [],
      })
    } catch (error) {
    }
  }

  // Fetch project dashboard data
  const getProjectDashboardData = async () => {
    try {
      const usersResponse = await apiClient
        .get('/user/get-user-list', {

          params: { limit: 1000 },
        })
        .catch(() => ({ data: { data: [] } }))

      const allUsers = usersResponse.data.data || []

      const developers = allUsers.filter((user) => {
        const roleName = user.roleId?.roleName?.toLowerCase() || ''
        return (
          roleName.includes('developer') ||
          roleName.includes('dev') ||
          roleName === 'programmer' ||
          roleName.includes('engineer') ||
          roleName.includes('coder')
        )
      })

      const statusResponse = await apiClient.get('/project/get-project-status-report', {

        params: {
          ...(dateFilter.fromDate && { fromDate: dateFilter.fromDate }),
          ...(dateFilter.toDate && { toDate: dateFilter.toDate }),
        },
      })

      const statusData = statusResponse.data.data || {}

      const projectsResponse = await apiClient.get('/project/get-projects', {

        params: {
          limit: 1000,
          ...(dateFilter.fromDate && { fromDate: dateFilter.fromDate }),
          ...(dateFilter.toDate && { toDate: dateFilter.toDate }),
        },
      })

      const projects = projectsResponse.data.data || []

      const statusCounts = {
        'Not assigned': statusData.created || 0,
        Assigned: statusData.assigned || 0,
        Hold: statusData.hold || 0,
        'In Progress': statusData.inProgress || 0,
        Testing: statusData.testing || 0,
        'Client Review': statusData.clientReview || 0,
        Completed: statusData.completed || 0,
      }

      const assignedProjects = statusData.assigned || 0

      const activeDeveloperIds = new Set()
      const developerIds = new Set(developers.map((d) => String(d._id)))

      projects.forEach((project) => {
        if (project.AssignedDevelopers && Array.isArray(project.AssignedDevelopers)) {
          project.AssignedDevelopers.forEach((dev) => {
            const devId = typeof dev === 'object' && dev !== null ? dev._id || dev.id : dev
            if (devId && developerIds.has(String(devId))) {
              activeDeveloperIds.add(String(devId))
            }
          })
        }
      })

      setProjectCounts({
        totalProjects: statusData.total || 0,
        newProjectsToday: assignedProjects,
        projectsInProgress: statusData.completed || 0,
        completedProjects: developers?.length || 0,
        activeDevelopers: activeDeveloperIds.size,
      })

      setProjectStatus(statusCounts)

      const recentProjectsData = projects
        .sort(
          (a, b) =>
            new Date(b.createdAt || b.ProjectStartDate) -
            new Date(a.createdAt || a.ProjectStartDate),
        )
        .slice(0, 5)

      setRecentProjects(recentProjectsData)
    } catch (error) {
      setProjectCounts({
        totalProjects: 0,
        newProjectsToday: 0,
        projectsInProgress: 0,
        completedProjects: 0,
        activeDevelopers: 0,
      })
      setProjectStatus({
        ' Not assigned': 0,
        Assigned: 0,
        Hold: 0,
        'In Progress': 0,
        Testing: 0,
        'Client Review': 0,
        Completed: 0,
      })
      setRecentProjects([])
    } finally {
    }
  }

  const getDashboardData = () => {
    if (dashboardView === 'leads') {
      getAdminDbDtl()
      fetchTelecallerReport()
    } else {
      getProjectDashboardData()
      fetchProjectTeamReport()
      fetchDeveloperLeaderboard()
      fetchProjectActivities()
    }
  }

  useEffect(() => {
    getDashboardData()
  }, [dateFilter, dashboardView])

  useEffect(() => {
    clearListState('ALL_PROJECT')
  }, [])

  useEffect(() => {
    if (!socket) return

    // Project events — backend emits 'create-project' on both create AND update
    // Lead events — for when Admin is viewing the Lead tab
    const events = [
      'create-project',   // project created / updated / deleted
      'update-leaderboard', // timeline post added / deleted
      'create-lead',        // lead created / imported
      'update-lead',        // lead fields updated
      'delete-lead',        // lead deleted
      'many-admin-to-telecaller', // lead assigned to TC
      'many-telecaller-to-bde',   // lead moved to BDE
      'many-bde-to-admin',        // lead returned to admin
    ]

    // Use a stable ref so the handler always reads the latest getDashboardData
    const handler = () => getDashboardData()
    events.forEach((event) => socket.on(event, handler))

    return () => events.forEach((event) => socket.off(event, handler))
  }, [socket, dashboardView, dateFilter])

  // ── Setup Guide & Onboarding Wizard ──────────────────────────
  const [showWizard, setShowWizard] = useState(false)

  return (
    <div>
      <Helmet>
        <title>Admin Dashboard — Clientmark</title>
      </Helmet>

      <Container className="mt-4 container-lg p-0">
        {/* ─── HubSpot-Style Setup Guide & Onboarding ─── */}
        <SetupGuide
          mode="inline"
          onLaunchWizard={() => setShowWizard(true)}
        />

        <OnboardingWizard
          isOpen={showWizard}
          onClose={() => setShowWizard(false)}
          onComplete={() => setShowWizard(false)}
        />

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
              {dashboardView === 'leads' ? 'Lead Dashboard' : 'Project Dashboard'}
            </h1>
          </Col>
          <Col
            xs="12"
            md="6"
            className="d-flex justify-content-md-end align-items-center mt-2 mt-md-0 gap-2"
          >
            {/* Toggle Switch */}
            <div
              style={{
                position: 'relative',
                backgroundColor: '#F4F4F1',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                borderRadius: '20px',
                padding: '3px',
                display: 'flex',
                minWidth: '150px',
                transition: 'all 0.2s ease',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '3px',
                  left: dashboardView === 'leads' ? '3px' : '50%',
                  width: 'calc(50% - 3px)',
                  height: 'calc(100% - 6px)',
                  backgroundColor: 'var(--primary-color, #111827)',
                  borderRadius: '16px',
                  transition: 'left 0.2s ease-in-out',
                }}
              />
              <button
                style={{
                  position: 'relative',
                  zIndex: 2,
                  width: '50%',
                  padding: '5px 12px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: dashboardView === 'leads' ? '#ffffff' : '#64748B',
                  fontWeight: '600',
                  fontSize: '12px',
                  borderRadius: '16px',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setDashboardView('leads')
                  localStorage.setItem('adminDashboardView', 'leads')
                }}
              >
                Leads
              </button>
              <button
                style={{
                  position: 'relative',
                  zIndex: 2,
                  width: '50%',
                  padding: '5px 12px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: dashboardView === 'projects' ? '#ffffff' : '#64748B',
                  fontWeight: '600',
                  fontSize: '12px',
                  borderRadius: '16px',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setDashboardView('projects')
                  localStorage.setItem('adminDashboardView', 'projects')
                }}
              >
                Projects
              </button>
            </div>

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
            <Button className="button" onClick={() => getDashboardData()}>
              Apply
            </Button>
          </Col>
        </Row>

        {dashboardView === 'leads' ? (
          <>
            {/* LEADS DASHBOARD CONTENT */}
            <Row className="mb-4">
              <Col xs={12}>
                <Row className="g-3">
                  {cardData.map((item, idx) => (
                    <Col key={idx} xs={12} sm={6} md={3}>
                      <div
                        className="dashboard-kpi-card"
                        onClick={() => handleCardClick(item)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="dashboard-kpi-top">
                          <span className="dashboard-kpi-label">{item.label}</span>
                          <div className="dashboard-kpi-icon-wrap">{item.icon}</div>
                        </div>
                        <div className="dashboard-kpi-value">
                          {typeof item.count === 'number'
                            ? item.count.toLocaleString()
                            : item.count}
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </Col>
            </Row>

            <Row className="mb-4">
              <Col xs={12}>
                <Row className="g-3">
                  <Col md={6}>
                    <Card className="p-3 shadow-sm rounded-4" style={{ height: '400px' }}>
                      <h6 className="fw-bold mb-1">Lead Stage Progress</h6>
                      <p className="text-muted" style={{ fontSize: '12px' }}>
                        Total:{' '}
                        {(leadStatus.NEW || 0) +
                          (leadStatus.TELECALLING || 0) +
                          (leadStatus.SALES || 0) +
                          (leadStatus.CLOSED || 0)}{' '}
                        &nbsp;|&nbsp; New: {leadStatus.NEW || 0} &nbsp;|&nbsp; Closed:{' '}
                        {leadStatus.CLOSED || 0}
                      </p>
                      <div
                        style={{
                          width: '280px',
                          height: '280px',
                          margin: 'auto',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {(leadStatus.NEW || 0) +
                          (leadStatus.TELECALLING || 0) +
                          (leadStatus.SALES || 0) +
                          (leadStatus.CLOSED || 0) ===
                        0 ? (
                          <div className="text-center text-muted small">No lead stage data yet</div>
                        ) : (
                          <Doughnut data={doughnutData} options={doughnutOptions} />
                        )}
                      </div>
                    </Card>
                  </Col>
                  <Col md={6}>
                    <Card className="p-3 shadow-sm rounded-4" style={{ height: '400px' }}>
                      <h6 className="fw-bold mb-1">Lead Status Distribution</h6>
                      <p className="text-muted" style={{ fontSize: '12px' }}>
                        Total: {counts.totalLead || 0} &nbsp;|&nbsp; New: {leadStatus.NEW || 0}{' '}
                        &nbsp;|&nbsp; Closed: {leadStatus.CLOSED || 0}
                      </p>
                      <div style={{ width: '100%', height: '320px' }}>
                        <Bar data={leadStatusBarData} options={leadStatusBarOptions} />
                      </div>
                    </Card>
                  </Col>
                </Row>
              </Col>
            </Row>

            <Row className="mb-4">
              <Col xs={12}>
                <Row className="g-3">
                  <Col md={12}>
                    <Card className="p-3 shadow-sm rounded-4" style={{ height: '250px' }}>
                      <h6 className="fw-bold mb-3">Recent Leads</h6>
                      <Table hover responsive className="user-table">
                        <thead>
                          <tr>
                            <th>Lead</th>
                            <th>Customer</th>
                            <th>Status</th>
                            <th>Telecaller</th>
                          </tr>
                        </thead>
                        <tbody>
                          {!Array.isArray(recentSellerLead) || recentSellerLead?.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="text-center text-muted">
                                No record found
                              </td>
                            </tr>
                          ) : (
                            recentSellerLead?.slice(0, 5).map((lead, idx) => (
                              <tr key={lead.leadUuid || idx}>
                                <td style={{ fontSize: '13px' }}>{lead.leadNo || 'N/A'}</td>
                                <td style={{ fontSize: '13px', fontWeight: '500' }}>
                                  {lead.fullName || 'N/A'}
                                </td>
                                <td>
                                  <span
                                    className="badge"
                                    style={{
                                      backgroundColor:
                                        (lead.leadStatus || '').toUpperCase() === 'INTERESTED' ||
                                          (lead.leadStatus || '').toUpperCase() === 'CONVERTED' ||
                                          (lead.leadStatus || '').toUpperCase() === 'WON'
                                          ? '#28a745'
                                          : (lead.leadStatus || '').toUpperCase() === 'NEW'
                                            ? '#007bff'
                                            : (lead.leadStatus || '').toUpperCase() === 'LOST'
                                              ? '#dc3545'
                                              : (lead.leadStatus || '').toUpperCase() ===
                                                'IN-PROGRESS'
                                                ? '#ffc107'
                                                : '#6c757d',
                                      color: 'white',
                                      fontSize: '11px',
                                      padding: '4px 8px',
                                    }}
                                  >
                                    {(lead.leadStatus || 'N/A').toLowerCase()}
                                  </span>
                                </td>
                                <td style={{ fontSize: '13px' }}>
                                  {lead.assignedTo || lead.assignToName || 'N/A'}
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

            <Row className="mb-4">
              <Col xs={12}>
                <Row className="g-3">
                  {/* TeleCaller Team Work */}
                  <Col md={6}>
                    <Card className="shadow-sm rounded-4 p-3" style={{ height: '300px' }}>
                      <Card.Header className="py-1 d-flex justify-content-between align-items-center ps-0">
                        <span style={{ fontWeight: 'bold' }}>TeleCaller Team Work</span>
                      </Card.Header>
                      <Table hover responsive className="user-table">
                        <thead>
                          <tr>
                            <th>TeleCaller</th>
                            <th>Total</th>
                            <th>Pending</th>
                            <th>Completed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {telecallerReport.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="text-center text-muted">
                                No telecaller data found
                              </td>
                            </tr>
                          ) : (
                            telecallerReport.slice(0, 5).map((caller, idx) => (
                              <tr key={caller.telecallerId || idx}>
                                <td>{caller.fullName || 'NA'}</td>
                                <td>{caller.totalLeads || 0}</td>
                                <td>{caller.pendingLeads || 0}</td>
                                <td>{caller.completedLeads || 0}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </Table>
                    </Card>
                  </Col>

                  {/* Call Logs */}
                  <Col md={6}>
                    <Card className="shadow-sm rounded-4 p-3" style={{ height: '300px' }}>
                      <Card.Header className="py-1 d-flex justify-content-between align-items-center ps-0">
                        <span style={{ fontWeight: 'bold' }}>Call Logs</span>
                      </Card.Header>
                      <Table hover responsive className="user-table">
                        <thead>
                          <tr>
                            <th>Lead No</th>
                            <th>Status</th>
                            <th>Call By</th>
                            <th>Call To</th>
                            <th>Call Time</th>
                            <th>Duration</th>
                            <th>Outcome</th>
                          </tr>
                        </thead>
                        <tbody>
                          {!Array.isArray(callingWork?.callingList) ||
                            callingWork?.callingList?.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="text-center text-muted">
                                No call logs found
                              </td>
                            </tr>
                          ) : (
                            callingWork?.callingList?.slice(0, 5).map((call, idx) => (
                              <tr key={call.callUuid || call.leadUuid || idx}>
                                <td>{call.leadId || call.leadNo || 'NA'}</td>
                                <td>
                                  <span
                                    className={`badge ${call.callStatus === 'Completed'
                                      ? 'bg-success'
                                      : call.callStatus === 'Missed'
                                        ? 'bg-danger'
                                        : call.callStatus === 'In Progress'
                                          ? 'bg-primary'
                                          : 'bg-secondary'
                                      }`}
                                  >
                                    {call.callStatus || 'NA'}
                                  </span>
                                </td>
                                <td>{call.callerName || call.callBy || 'NA'}</td>
                                <td>{call.destinationName || call.callTo || 'NA'}</td>
                                <td>{call.callTime || call.startTime || 'NA'}</td>
                                <td>{call.duration || 'NA'}</td>
                                <td>
                                  <span
                                    className={`badge ${call.outcome === 'Interested'
                                      ? 'bg-success'
                                      : call.outcome === 'Not Interested'
                                        ? 'bg-danger'
                                        : call.outcome === 'Follow Up'
                                          ? 'bg-warning'
                                          : 'bg-secondary'
                                      }`}
                                  >
                                    {call.outcome || call.callOutcome || 'NA'}
                                  </span>
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
          </>
        ) : (
          <>
            {/* PROJECTS DASHBOARD CONTENT */}
            <Row className="mb-4">
              <Col xs={12}>
                <Row className="g-3">
                  {projectCardData.map((item, idx) => (
                    <Col key={idx} xs={12} sm={6} md={3}>
                      <div
                        className="dashboard-kpi-card"
                        onClick={() => handleCardClick(item)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="dashboard-kpi-top">
                          <span className="dashboard-kpi-label">{item.label}</span>
                          <div className="dashboard-kpi-icon-wrap">{item.icon}</div>
                        </div>
                        <div className="dashboard-kpi-value">
                          {typeof item.count === 'number'
                            ? item.count.toLocaleString()
                            : item.count}
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </Col>
            </Row>

            <Row className="mb-4">
              <Col xs={12}>
                <Row className="g-3">
                  <Col md={6}>
                    <Card className="p-3 shadow-sm rounded-4" style={{ height: '400px' }}>
                      <h6 className="fw-bold mb-1">Project Status Progress</h6>
                      <p className="text-muted" style={{ fontSize: '12px' }}>
                        Total: {projectCounts.totalProjects || 0} &nbsp;|&nbsp; In Progress:{' '}
                        {projectStatus['In Progress'] || 0} &nbsp;|&nbsp; Completed:{' '}
                        {projectStatus.Completed || 0}
                      </p>
                      <div
                        style={{
                          width: '280px',
                          height: '280px',
                          margin: 'auto',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {projectCounts.totalProjects === 0 ? (
                          <div className="text-center text-muted small">No project status data yet</div>
                        ) : (
                          <Doughnut data={projectDoughnutData} options={doughnutOptions} />
                        )}
                      </div>
                    </Card>
                  </Col>
                  <Col md={6}>
                    <Card className="p-3 shadow-sm rounded-4" style={{ height: '400px' }}>
                      <h6 className="fw-bold mb-3">Developer Activity Leaderboard</h6>
                      <div style={{ width: '100%', height: '320px', position: 'relative' }}>
                        <Bar
                          data={developerLeaderboardData}
                          options={developerLeaderboardOptions}
                        />
                      </div>
                    </Card>
                  </Col>
                </Row>
              </Col>
            </Row>

            <Row className="mb-4">
              <Col xs={12}>
                <Row className="g-3">
                  <Col md={12}>
                    <Card className="p-3 shadow-sm rounded-4" style={{ height: '250px' }}>
                      <h6 className="fw-bold mb-3">Recent Projects</h6>
                      <Table hover responsive className="user-table">
                        <thead>
                          <tr>
                            <th>Project ID</th>
                            <th>Project Name</th>
                            <th>Status</th>
                            <th>Project Manager</th>
                          </tr>
                        </thead>
                        <tbody>
                          {!Array.isArray(recentProjects) || recentProjects?.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="text-center text-muted">
                                No record found
                              </td>
                            </tr>
                          ) : (
                            recentProjects?.slice(0, 5).map((project, idx) => (
                              <tr key={project._id || idx}>
                                <td style={{ fontSize: '13px' }}>{project.ProjectId || 'N/A'}</td>
                                <td style={{ fontSize: '13px', fontWeight: '500' }}>
                                  {project.ProjectName || 'N/A'}
                                </td>
                                <td>
                                  <span
                                    className="badge"
                                    style={{
                                      backgroundColor:
                                        (project.ProjectStatus || '').toLowerCase() === 'completed'
                                          ? '#28a745'
                                          : (project.ProjectStatus || '').toLowerCase() ===
                                            'Not assigned'
                                            ? '#007bff'
                                            : (project.ProjectStatus || '')
                                              .toLowerCase()
                                              .includes('hold')
                                              ? '#dc3545'
                                              : (project.ProjectStatus || '')
                                                .toLowerCase()
                                                .includes('progress')
                                                ? '#ffc107'
                                                : '#6c757d',
                                      color: 'white',
                                      fontSize: '11px',
                                      padding: '4px 8px',
                                    }}
                                  >
                                    {(project.ProjectStatus || 'N/A').toLowerCase()}
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

            <Row className="mb-4">
              <Col xs={12}>
                <Row className="g-3">
                  {/* Project Team Work */}
                  <Col md={6}>
                    <Card className="shadow-sm rounded-4 p-3" style={{ height: '300px' }}>
                      <Card.Header className="py-1 d-flex justify-content-between align-items-center ps-0">
                        <span style={{ fontWeight: 'bold' }}>Project Team Work</span>
                      </Card.Header>
                      <Table hover responsive className="user-table">
                        <thead>
                          <tr>
                            <th>Developer</th>
                            <th>Total</th>
                            <th>Assigned</th>
                            <th>Completed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {projectReport.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="text-center text-muted">
                                No project team data found
                              </td>
                            </tr>
                          ) : (
                            projectReport.slice(0, 5).map((member, idx) => (
                              <tr key={member.fullName || idx}>
                                <td>{member.fullName || 'NA'}</td>
                                <td>{member.totalProjects || 0}</td>
                                <td>{member.assignedProjects || 0}</td>
                                <td>{member.completedProjects || 0}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </Table>
                    </Card>
                  </Col>

                  {/* Project Activities */}
                  <Col md={6}>
                    <Card className="shadow-sm rounded-4 p-3" style={{ height: '300px' }}>
                      <Card.Header className="py-1 d-flex justify-content-between align-items-center ps-0">
                        <span style={{ fontWeight: 'bold' }}>Project Activities</span>
                      </Card.Header>
                      <Table hover responsive className="user-table">
                        <thead>
                          <tr>
                            <th>Project Name</th>
                            <th>Assigned Manager</th>
                            <th>Developers</th>
                          </tr>
                        </thead>
                        <tbody>
                          {!Array.isArray(projectActivities?.activityList) ||
                            projectActivities?.activityList?.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="text-center text-muted">
                                No project activities found
                              </td>
                            </tr>
                          ) : (
                            projectActivities.activityList.slice(0, 5).map((activity, idx) => (
                              <tr key={activity.id || idx}>
                                <td style={{ fontSize: '13px', fontWeight: '500' }}>
                                  {activity.projectName.length > 25
                                    ? activity.projectName.substring(0, 25) + '...'
                                    : activity.projectName}
                                </td>
                                <td style={{ fontSize: '12px' }}>{activity.manager}</td>
                                <td style={{ fontSize: '12px' }}>
                                  {activity.developers.length > 40
                                    ? activity.developers.substring(0, 40) + '...'
                                    : activity.developers}
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
          </>
        )}
      </Container>
    </div>
  )
}

export default AdminDashboard
