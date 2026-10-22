import React, { useContext, useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Doughnut, Bar } from 'react-chartjs-2'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import apiClient from '../../api/axiosClient'
import {
  Container,
  Row,
  Col,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Button,
  Badge,
} from '../../components/ui'
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
import { cn } from '../../lib/utils'
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
gsap.registerPlugin(useGSAP)

const AdminDashboard = () => {
  const { theme } = useContext(ThemeContext)
  const navigate = useNavigate()
  const [dashboardView, setDashboardView] = useState(
    () => localStorage.getItem('adminDashboardView') || 'projects',
  )
  const [showWizard, setShowWizard] = useState(false)
  const dashboardRef = useRef(null)

  // GSAP Choreographed Entrance using official useGSAP hook
  useGSAP(
    () => {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (prefersReducedMotion) return

      gsap.fromTo(
        '.dashboard-kpi-card',
        { y: 14, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.35,
          stagger: 0.05,
          ease: 'power2.out',
          clearProps: 'transform',
        },
      )
      gsap.fromTo(
        '.dashboard-panel-reveal',
        { y: 16, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.4,
          stagger: 0.06,
          delay: 0.05,
          ease: 'power2.out',
          clearProps: 'transform',
        },
      )
    },
    {
      scope: dashboardRef,
      dependencies: [dashboardView],
      revertOnUpdate: true,
    },
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
      filter: { leadStage: 'NEW' },
      link: '/all-lead',
    },
    {
      count: counts.convertedLeads || 0,
      label: 'Converted Leads',
      icon: <FiCheckCircle size={17} />,
      filter: { leadStatus: 'WON' },
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

    const events = [
      'project:created',
      'project:updated',
      'project:deleted',
      'leaderboard:updated',
      'lead:created',
      'lead:updated',
      'lead:deleted',
      'lead:transferred',
    ]

    // Use a stable ref so the handler always reads the latest getDashboardData
    const handler = () => getDashboardData()
    events.forEach((event) => socket.on(event, handler))

    return () => events.forEach((event) => socket.off(event, handler))
  }, [socket, dashboardView, dateFilter])

  // ── Setup Guide & Onboarding Wizard ───
  const getLeadBadgeVariant = (status) => {
    const s = (status || '').toUpperCase()
    if (s === 'CONVERTED' || s === 'WON' || s === 'INTERESTED') return 'success'
    if (s === 'NEW') return 'brand'
    if (s === 'LOST') return 'destructive'
    if (s.includes('PROGRESS')) return 'warning'
    return 'secondary'
  }

  const getProjectBadgeVariant = (status) => {
    const s = (status || '').toLowerCase()
    if (s === 'completed') return 'success'
    if (s === 'not assigned') return 'brand'
    if (s.includes('hold')) return 'destructive'
    if (s.includes('progress')) return 'warning'
    return 'secondary'
  }

  return (
    <div className="w-full pb-10" ref={dashboardRef}>
      <Helmet>
        <title>Admin Dashboard — Clientmark</title>
      </Helmet>

      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-5">
        {/* ─── Setup Guide & Onboarding ─── */}
        <SetupGuide
          mode="inline"
          onLaunchWizard={() => setShowWizard(true)}
        />

        <OnboardingWizard
          isOpen={showWizard}
          onClose={() => setShowWizard(false)}
          onComplete={() => setShowWizard(false)}
        />

        {/* ─── Dashboard Header Bar ─── */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {dashboardView === 'leads' ? 'Lead Pipeline Intelligence' : 'Project Delivery Matrix'}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {dashboardView === 'leads'
                ? 'Real-time overview of inbound, active, and converted opportunities'
                : 'Track engineering delivery velocity, project milestones, and developer workloads'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Switcher Tabs */}
            <div className="inline-flex h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground border border-border/50">
              <button
                type="button"
                onClick={() => {
                  setDashboardView('leads')
                  localStorage.setItem('adminDashboardView', 'leads')
                }}
                className={cn(
                  'inline-flex items-center justify-center rounded-md px-3.5 py-1 text-xs font-semibold transition-all cursor-pointer',
                  dashboardView === 'leads'
                    ? 'bg-card text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Leads Pipeline
              </button>
              <button
                type="button"
                onClick={() => {
                  setDashboardView('projects')
                  localStorage.setItem('adminDashboardView', 'projects')
                }}
                className={cn(
                  'inline-flex items-center justify-center rounded-md px-3.5 py-1 text-xs font-semibold transition-all cursor-pointer',
                  dashboardView === 'projects'
                    ? 'bg-card text-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Project Delivery
              </button>
            </div>

            {/* Date Filters */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="h-9 px-2.5 rounded-lg border border-input bg-background text-foreground text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                value={dateFilter.fromDate}
                onChange={(e) => setDateFilter({ ...dateFilter, fromDate: e.target.value })}
              />
              <span className="text-muted-foreground text-xs">to</span>
              <input
                type="date"
                className="h-9 px-2.5 rounded-lg border border-input bg-background text-foreground text-xs shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
                value={dateFilter.toDate}
                onChange={(e) => setDateFilter({ ...dateFilter, toDate: e.target.value })}
              />
              <Button size="sm" onClick={() => getDashboardData()}>
                Apply
              </Button>
            </div>
          </div>
        </div>

        {dashboardView === 'leads' ? (
          <>
            {/* ─── LEADS KPI CARDS ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {cardData.map((item, idx) => (
                <Card
                  key={idx}
                  onClick={() => handleCardClick(item)}
                  interactive
                  className="dashboard-kpi-card p-5 flex flex-col justify-between group relative overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {item.label}
                    </span>
                    <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center transition-transform group-hover:scale-105">
                      {item.icon}
                    </div>
                  </div>
                  <div className="text-3xl font-extrabold tracking-tight text-foreground">
                    {typeof item.count === 'number' ? item.count.toLocaleString() : item.count}
                  </div>
                  <div className="mt-2 flex items-center text-xs text-muted-foreground">
                    <span className="text-primary font-medium flex items-center gap-1 group-hover:underline">
                      View details <FiArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Card>
              ))}
            </div>

            {/* ─── LEADS CHARTS ROW ─── */}
            <div className="dashboard-panel-reveal grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
              {/* Lead Stage Progress */}
              <Card className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Lead Stage Progress</CardTitle>
                      <CardDescription>
                        Total:{' '}
                        {(leadStatus.NEW || 0) +
                          (leadStatus.TELECALLING || 0) +
                          (leadStatus.SALES || 0) +
                          (leadStatus.CLOSED || 0)}{' '}
                        · New: {leadStatus.NEW || 0} · Closed: {leadStatus.CLOSED || 0}
                      </CardDescription>
                    </div>
                    <Badge variant="brand">Stage Funnel</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center pt-2 min-h-[300px]">
                  {(leadStatus.NEW || 0) +
                    (leadStatus.TELECALLING || 0) +
                    (leadStatus.SALES || 0) +
                    (leadStatus.CLOSED || 0) ===
                  0 ? (
                    <div className="text-center text-muted-foreground text-sm">No lead stage data yet</div>
                  ) : (
                    <div className="w-[280px] h-[280px] flex items-center justify-center">
                      <Doughnut data={doughnutData} options={doughnutOptions} />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Lead Status Distribution */}
              <Card className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Lead Status Distribution</CardTitle>
                      <CardDescription>
                        Total: {counts.totalLead || 0} · Won: {leadNature.WON || 0} · Lost: {leadNature.LOST || 0}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">Volume</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 pt-2 min-h-[300px]">
                  <div className="w-full h-[280px]">
                    <Bar data={leadStatusBarData} options={leadStatusBarOptions} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ─── RECENT LEADS TABLE ─── */}
            <Card className="mb-6 overflow-hidden">
              <CardHeader className="border-b border-border/60 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Leads</CardTitle>
                    <CardDescription>Latest prospect inquiries received in the system</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/all-lead')}>
                    View All Leads
                  </Button>
                </div>
              </CardHeader>
              <Table responsive={false}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned Specialist</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!Array.isArray(recentSellerLead) || recentSellerLead?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No recent leads found
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentSellerLead.slice(0, 5).map((lead, idx) => (
                      <TableRow key={lead.leadUuid || idx}>
                        <TableCell className="font-mono text-xs">{lead.leadNo || 'N/A'}</TableCell>
                        <TableCell className="font-semibold">{lead.fullName || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={getLeadBadgeVariant(lead.leadStatus)}>
                            {(lead.leadStatus || 'New').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {lead.assignedTo || lead.assignToName || 'Unassigned'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>

            {/* ─── TELECALLER TEAM WORK & CALL LOGS ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Telecaller Work */}
              <Card className="overflow-hidden">
                <CardHeader className="border-b border-border/60 py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle>Telecaller Performance</CardTitle>
                    <Badge variant="brand">Team</Badge>
                  </div>
                </CardHeader>
                <Table responsive={false}>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Telecaller</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Pending</TableHead>
                      <TableHead>Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {telecallerReport.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                          No telecaller activity recorded
                        </TableCell>
                      </TableRow>
                    ) : (
                      telecallerReport.slice(0, 5).map((caller, idx) => (
                        <TableRow key={caller.telecallerId || idx}>
                          <TableCell className="font-medium">{caller.fullName || 'N/A'}</TableCell>
                          <TableCell>{caller.totalLeads || 0}</TableCell>
                          <TableCell>
                            <Badge variant="warning">{caller.pendingLeads || 0}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="success">{caller.completedLeads || 0}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>

              {/* Call Logs */}
              <Card className="overflow-hidden">
                <CardHeader className="border-b border-border/60 py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle>Call Activity Stream</CardTitle>
                    <Badge variant="secondary">Logs</Badge>
                  </div>
                </CardHeader>
                <Table responsive={false}>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Outcome</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!Array.isArray(callingWork?.callingList) || callingWork?.callingList?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                          No call records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      callingWork.callingList.slice(0, 5).map((call, idx) => (
                        <TableRow key={call.callUuid || call.leadUuid || idx}>
                          <TableCell className="font-medium">{call.leadId || call.leadNo || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                call.callStatus === 'Completed'
                                  ? 'success'
                                  : call.callStatus === 'Missed'
                                    ? 'destructive'
                                    : 'secondary'
                              }
                            >
                              {call.callStatus || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">{call.duration || '00:00'}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                call.outcome === 'Interested'
                                  ? 'success'
                                  : call.outcome === 'Not Interested'
                                    ? 'destructive'
                                    : 'warning'
                              }
                            >
                              {call.outcome || call.callOutcome || 'Logged'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          </>
        ) : (
          <>
            {/* ─── PROJECTS KPI CARDS ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {projectCardData.map((item, idx) => (
                <Card
                  key={idx}
                  onClick={() => handleCardClick(item)}
                  interactive
                  className="dashboard-kpi-card p-5 flex flex-col justify-between group relative overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {item.label}
                    </span>
                    <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center transition-transform group-hover:scale-105">
                      {item.icon}
                    </div>
                  </div>
                  <div className="text-3xl font-extrabold tracking-tight text-foreground">
                    {typeof item.count === 'number' ? item.count.toLocaleString() : item.count}
                  </div>
                  <div className="mt-2 flex items-center text-xs text-muted-foreground">
                    <span className="text-primary font-medium flex items-center gap-1 group-hover:underline">
                      View details <FiArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Card>
              ))}
            </div>

            {/* ─── PROJECTS CHARTS ROW ─── */}
            <div className="dashboard-panel-reveal grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
              {/* Project Status Progress */}
              <Card className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Project Status Progress</CardTitle>
                      <CardDescription>
                        Total: {projectCounts.totalProjects || 0} · In Progress:{' '}
                        {projectStatus['In Progress'] || 0} · Completed: {projectStatus.Completed || 0}
                      </CardDescription>
                    </div>
                    <Badge variant="brand">Delivery</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center pt-2 min-h-[300px]">
                  {projectCounts.totalProjects === 0 ? (
                    <div className="text-center text-muted-foreground text-sm">No project status data yet</div>
                  ) : (
                    <div className="w-[280px] h-[280px] flex items-center justify-center">
                      <Doughnut data={projectDoughnutData} options={doughnutOptions} />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Developer Leaderboard */}
              <Card className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Developer Activity Leaderboard</CardTitle>
                      <CardDescription>Sprint commits and milestone deliveries</CardDescription>
                    </div>
                    <Badge variant="secondary">Engineering</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 pt-2 min-h-[300px]">
                  <div className="w-full h-[280px]">
                    <Bar data={developerLeaderboardData} options={developerLeaderboardOptions} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ─── RECENT PROJECTS TABLE ─── */}
            <Card className="mb-6 overflow-hidden">
              <CardHeader className="border-b border-border/60 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Recent Projects</CardTitle>
                    <CardDescription>Active delivery engagements across client accounts</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/all-project')}>
                    View All Projects
                  </Button>
                </div>
              </CardHeader>
              <Table responsive={false}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project ID</TableHead>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Project Manager</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!Array.isArray(recentProjects) || recentProjects?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No recent projects found
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentProjects.slice(0, 5).map((project, idx) => (
                      <TableRow key={project._id || idx}>
                        <TableCell className="font-mono text-xs">{project.ProjectId || 'N/A'}</TableCell>
                        <TableCell className="font-semibold">{project.ProjectName || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={getProjectBadgeVariant(project.ProjectStatus)}>
                            {(project.ProjectStatus || 'In Progress').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {project.AssignedProjectManager || 'Unassigned'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>

            {/* ─── PROJECT TEAM WORK & ACTIVITIES ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Project Team Work */}
              <Card className="overflow-hidden">
                <CardHeader className="border-b border-border/60 py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle>Developer Velocity</CardTitle>
                    <Badge variant="brand">Workload</Badge>
                  </div>
                </CardHeader>
                <Table responsive={false}>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Developer</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead>Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectReport.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                          No developer workloads recorded
                        </TableCell>
                      </TableRow>
                    ) : (
                      projectReport.slice(0, 5).map((member, idx) => (
                        <TableRow key={member.fullName || idx}>
                          <TableCell className="font-medium">{member.fullName || 'N/A'}</TableCell>
                          <TableCell>{member.totalProjects || 0}</TableCell>
                          <TableCell>
                            <Badge variant="warning">{member.assignedProjects || 0}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="success">{member.completedProjects || 0}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>

              {/* Project Activities */}
              <Card className="overflow-hidden">
                <CardHeader className="border-b border-border/60 py-4">
                  <div className="flex items-center justify-between">
                    <CardTitle>Project Milestones</CardTitle>
                    <Badge variant="secondary">Live</Badge>
                  </div>
                </CardHeader>
                <Table responsive={false}>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!Array.isArray(projectActivities?.activityList) ||
                    projectActivities?.activityList?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                          No project activities found
                        </TableCell>
                      </TableRow>
                    ) : (
                      projectActivities.activityList.slice(0, 5).map((activity, idx) => (
                        <TableRow key={activity.id || idx}>
                          <TableCell className="font-semibold truncate max-w-[180px]">
                            {activity.projectName}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">{activity.manager}</TableCell>
                          <TableCell>
                            <Badge variant={getProjectBadgeVariant(activity.status)}>
                              {activity.status || 'Active'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard
