import React, { useContext, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Doughnut, Bar } from 'react-chartjs-2'
import apiClient from '../../api/axiosClient'
import { Container, Row, Col, Card, Table, Button } from 'react-bootstrap'
import {
  HiOutlineUsers,
  HiOutlineCheckBadge,
  HiOutlinePhoneXMark,
  HiOutlineBriefcase,
} from 'react-icons/hi2'

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

const BDEDashboard = () => {
  const { token, userData } = useContext(AuthContext)
  const { theme } = useContext(ThemeContext)
  const navigate = useNavigate()
  const [dateFilter, setDateFilter] = useState({ fromDate: '', toDate: '' })
  const [isLoading, setIsLoading] = useState('')

  const [counts, setCounts] = useState({
    totalLead: 0,
    winLead: 0,
    lossLead: 0,
  })

  const [leadStageStatus, setLeadStageStatus] = useState({
    total: 0,
    pending: 0,
    completed: 0,
  })

  const [leadStatusDistribution, setLeadStatusDistribution] = useState({
    NEW: 0,
    ASSIGNED_TO_TELECALLER: 0,
    ASSIGNED_TO_BDE: 0,
    WON: 0,
    LOST: 0,
  })

  const [recentLeads, setRecentLeads] = useState([])

  // ── Card data ────────────────────────────────────────────────────────────────
  const cardData = [
    {
      count: counts.totalLead,
      label: 'Total Lead',
      icon: <HiOutlineUsers size={28} />,
      iconBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      iconColor: '#fff',
      link: '/all-lead',
      filter: null,
    },
    {
      count: counts.winLead,
      label: 'Win Lead',
      icon: <HiOutlineCheckBadge size={28} />,
      iconBg: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
      iconColor: '#fff',
      link: '/all-lead',
      filter: null,
    },
    {
      count: counts.lossLead,
      label: 'Loss Lead',
      icon: <HiOutlinePhoneXMark size={28} />,
      iconBg: 'linear-gradient(135deg, #dc3545 0%, #ff6b6b 100%)',
      iconColor: '#fff',
      link: '/all-lead',
      filter: null,
    },
  ]

  // ── Doughnut chart ───────────────────────────────────────────────────────────
  const doughnutData = {
    labels: ['Completed', 'Pending'],
    datasets: [
      {
        label: 'Lead Progress',
        data: [leadStageStatus.completed, leadStageStatus.pending],
        backgroundColor: ['#10B981', '#F59E0B'],
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
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0
            return `${label}: ${value} (${percentage}%)`
          },
        },
      },
    },
  }

  // ── Bar chart ────────────────────────────────────────────────────────────────
  const leadStatusBarData = {
    labels: ['NEW', 'ASSIGNED_TO_TC', 'ASSIGNED_TO_BDE', 'WON', 'LOST'],
    datasets: [
      {
        label: 'Lead Status Count',
        data: [
          leadStatusDistribution.NEW,
          leadStatusDistribution.ASSIGNED_TO_TELECALLER,
          leadStatusDistribution.ASSIGNED_TO_BDE,
          leadStatusDistribution.WON,
          leadStatusDistribution.LOST,
        ],
        backgroundColor: ['#36A2EB', '#FF6384', '#FFCE56', '#4BC0C0', '#9966FF'],
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

  // ── Main fetch ───────────────────────────────────────────────────────────────
  const getBDEDashboardData = async () => {
    try {
      setIsLoading('dashboard')

      if (!userData?._id) return

      // Backend auto-scopes to this BDE's assigned leads via JWT role (role=BDE)
      // No need to pass extra assignTo param — backend sets filter.assignedToBDE = loginUserId
      const leadsResponse = await apiClient.get('/lead/get-leads', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          limit: 1000,
          ...(dateFilter.fromDate && { fromDate: dateFilter.fromDate }),
          ...(dateFilter.toDate && { toDate: dateFilter.toDate }),
        },
      })

      const leads = leadsResponse.data.data || []

      // ── Cards ────────────────────────────────────────────────────────────────
      const totalLead = leads.length

      const winLead = leads.filter(
        (lead) =>
          (lead.leadStatus || '').toUpperCase() === 'WON' ||
          (lead.leadStatus || '').toUpperCase() === 'CONVERTED' ||
          (lead.leadStage || '').toUpperCase() === 'CLOSED',
      ).length

      const lossLead = leads.filter(
        (lead) => (lead.leadStatus || '').toUpperCase() === 'LOST',
      ).length

      setCounts({ totalLead, winLead, lossLead })

      // ── Doughnut — completed = WON/CLOSED, pending = rest ────────────────────
      const completedLeads = leads.filter(
        (lead) =>
          (lead.leadStatus || '').toUpperCase() === 'WON' ||
          (lead.leadStatus || '').toUpperCase() === 'LOST' ||
          (lead.leadStage || '').toUpperCase() === 'CLOSED',
      ).length

      const pendingLeads = totalLead - completedLeads

      setLeadStageStatus({
        total: totalLead,
        pending: pendingLeads,
        completed: completedLeads,
      })

      // ── Bar chart status counts ───────────────────────────────────────────────
      setLeadStatusDistribution({
        NEW: leads.filter((l) => (l.leadStatus || '').toUpperCase() === 'NEW').length,
        ASSIGNED_TO_TELECALLER: leads.filter(
          (l) => (l.leadStatus || '').toUpperCase() === 'ASSIGNED_TO_TELECALLER',
        ).length,
        ASSIGNED_TO_BDE: leads.filter(
          (l) => (l.leadStatus || '').toUpperCase() === 'ASSIGNED_TO_BDE',
        ).length,
        WON: leads.filter((l) => (l.leadStatus || '').toUpperCase() === 'WON').length,
        LOST: leads.filter((l) => (l.leadStatus || '').toUpperCase() === 'LOST').length,
      })

      // ── Recent leads — latest 5 ───────────────────────────────────────────────
      const sorted = [...leads]
        .sort((a, b) => new Date(b.addDate || b.createdAt) - new Date(a.addDate || a.createdAt))
        .slice(0, 5)

      setRecentLeads(sorted)
    } catch (error) {
      toast.error('Failed to load BDE dashboard data')
    } finally {
      setIsLoading('')
    }
  }

  const handleCardClick = (item) => {
    if (item.filter) {
      navigate(item.link, { state: { filter: item.filter } })
    } else {
      navigate(item.link)
    }
  }

  const getLeadStatusBadgeColor = (status) => {
    const s = (status || '').toUpperCase()
    if (s === 'WON' || s === 'CONVERTED' || s === 'INTERESTED') return '#28a745'
    if (s === 'NEW') return '#007bff'
    if (s === 'LOST') return '#dc3545'
    if (s === 'IN-PROGRESS' || s === 'ASSIGNED_TO_TELECALLER' || s === 'ASSIGNED_TO_BDE')
      return '#ffc107'
    return '#6c757d'
  }

  useEffect(() => {
    getBDEDashboardData()
  }, [dateFilter])

  useEffect(() => {
    if (!socket) return
    const events = ['create-lead', 'update-lead', 'delete-lead', 'many-telecaller-to-bde', 'single-telecaller-to-bde', 'many-bde-to-admin']
    const handler = () => getBDEDashboardData()
    events.forEach((event) => socket.on(event, handler))
    return () => events.forEach((event) => socket.off(event, handler))
  }, [socket, dateFilter])

  return (
    <div>
      <Helmet>
        <title>BH - BDE Dashboard</title>
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
              BDE Dashboard
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
            <Button className="button" onClick={() => getBDEDashboardData()}>
              Apply
            </Button>
          </Col>
        </Row>

        {/* ROW 1 — Summary Cards */}
        <Row className="mb-4">
          <Col xs={12}>
            <Row className="g-3">
              {cardData.map((item, idx) => (
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

        {/* ROW 2 — Charts */}
        <Row className="mb-4">
          <Col xs={12}>
            <Row className="g-3">
              {/* Doughnut */}
              <Col md={6}>
                <Card className="p-3 shadow-sm rounded-4" style={{ height: '400px' }}>
                  <h6 className="fw-bold mb-1">My Lead Progress</h6>
                  <p className="text-muted" style={{ fontSize: '12px' }}>
                    Total: {leadStageStatus.total} &nbsp;|&nbsp; Pending: {leadStageStatus.pending}{' '}
                    &nbsp;|&nbsp; Completed: {leadStageStatus.completed}
                  </p>
                  <div style={{ width: '280px', height: '280px', margin: 'auto' }}>
                    <Doughnut data={doughnutData} options={doughnutOptions} />
                  </div>
                </Card>
              </Col>

              {/* Bar */}
              <Col md={6}>
                <Card className="p-3 shadow-sm rounded-4" style={{ height: '400px' }}>
                  <h6 className="fw-bold mb-3">Lead Status Distribution</h6>
                  <div style={{ width: '100%', height: '320px' }}>
                    <Bar data={leadStatusBarData} options={leadStatusBarOptions} />
                  </div>
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>

        {/* ROW 3 — Recent Lead Activity */}
        <Row className="mb-4">
          <Col xs={12}>
            <Card className="p-3 shadow-sm rounded-4" style={{ minHeight: '250px' }}>
              <h6 className="fw-bold mb-3">Recent Lead Activity</h6>
              <Table hover responsive className="user-table">
                <thead style={{ backgroundColor: '#FF8C42' }}>
                  <tr>
                    <th style={{ color: 'white', backgroundColor: '#FF8C42', fontSize: '14px' }}>
                      Lead No
                    </th>
                    <th style={{ color: 'white', backgroundColor: '#FF8C42', fontSize: '14px' }}>
                      Customer
                    </th>
                    <th style={{ color: 'white', backgroundColor: '#FF8C42', fontSize: '14px' }}>
                      Mobile
                    </th>
                    <th style={{ color: 'white', backgroundColor: '#FF8C42', fontSize: '14px' }}>
                      Status
                    </th>
                    <th style={{ color: 'white', backgroundColor: '#FF8C42', fontSize: '14px' }}>
                      Stage
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-muted">
                        No record found
                      </td>
                    </tr>
                  ) : (
                    recentLeads.map((lead, idx) => (
                      <tr key={lead._id || idx}>
                        <td style={{ fontSize: '13px' }}>{lead.leadNo || 'N/A'}</td>
                        <td style={{ fontSize: '13px', fontWeight: '500' }}>
                          {lead.fullName || 'N/A'}
                        </td>
                        <td style={{ fontSize: '13px' }}>
                          {lead.mobileNo || lead.mobile || 'N/A'}
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              backgroundColor: getLeadStatusBadgeColor(lead.leadStatus),
                              color: 'white',
                              fontSize: '11px',
                              padding: '4px 8px',
                            }}
                          >
                            {(lead.leadStatus || 'N/A').toUpperCase() === 'ASSIGNED_TO_TELECALLER' ? 'ASSIGNED_TO_TC' : (lead.leadStatus || 'N/A').toLowerCase()}
                          </span>
                        </td>
                        <td style={{ fontSize: '13px' }}>{lead.leadStage || 'N/A'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  )
}

export default BDEDashboard
