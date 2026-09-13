import React, { useContext, useEffect, useMemo, useState } from 'react'
import { Container, Row, Col, Card, Form, Button, Spinner, Table, Badge } from 'react-bootstrap'
import { Chart, registerables } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import {
  FaFileExcel,
  FaLayerGroup,
  FaCheckCircle,
  FaClock,
  FaRupeeSign,
  FaChartPie,
  FaChartBar,
} from 'react-icons/fa'
import { Helmet } from 'react-helmet'
import toast from 'react-hot-toast'

import apiClient from '../../api/axiosClient'
import ThemeContext from './ThemeContext'

import '../sidebarCSS/comStyle.css'
import '../sidebarCSS/table.css'

Chart.register(...registerables)

const STATUS_ROWS = [
  { key: 'created', budgetKey: 'createdBudget', label: 'Not Assigned', color: '#6c757d' },
  { key: 'assigned', budgetKey: 'assignedBudget', label: 'Assigned', color: '#0ea5e9' },
  { key: 'hold', budgetKey: 'holdBudget', label: 'On Hold', color: '#f59e0b' },
  { key: 'inProgress', budgetKey: 'inProgressBudget', label: 'In Progress', color: '#2563eb' },
  { key: 'testing', budgetKey: 'testingBudget', label: 'Testing', color: '#f97316' },
  {
    key: 'clientReview',
    budgetKey: 'clientReviewBudget',
    label: 'Client Review',
    color: '#ec4899',
  },
  { key: 'completed', budgetKey: 'completedBudget', label: 'Completed', color: '#16a34a' },
]

const formatINR = (value) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))

function MetricCard({ title, value, icon, tone }) {
  const tones = {
    blue: { ring: 'var(--primary-color)', bg: 'rgba(59, 130, 246, 0.12)' },
    green: { ring: '#16a34a', bg: 'rgba(22,163,74,0.12)' },
    amber: { ring: '#f59e0b', bg: 'rgba(245,158,11,0.16)' },
    slate: { ring: 'var(--secondary-color)', bg: 'rgba(100, 116, 139, 0.12)' },
  }
  const color = tones[tone] || tones.slate

  return (
    <Card style={{ border: 'none', borderRadius: 14, boxShadow: '0 6px 20px rgba(15,23,42,0.08)' }}>
      <Card.Body className="d-flex align-items-center gap-3" style={{ padding: '16px 18px' }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            display: 'grid',
            placeItems: 'center',
            color: color.ring,
            background: color.bg,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>{title}</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
            {value}
          </div>
        </div>
      </Card.Body>
    </Card>
  )
}

function ProjectStatusReport() {
  const { theme } = useContext(ThemeContext)

  const [filter, setFilter] = useState({ fromDate: '', toDate: '' })
  const [isLoading, setIsLoading] = useState('')
  const [report, setReport] = useState({})

  const fetchReport = async () => {
    try {
      setIsLoading('report')
      const response = await apiClient.get('/project/get-project-status-report', {
        params: {
          fromDate: filter.fromDate,
          toDate: filter.toDate,
        },
      })
      setReport(response?.data?.data || {})
    } catch (error) {
      setReport({})
      toast.error('Failed to load project status report')
    } finally {
      setIsLoading('')
    }
  }

  const handleExport = async () => {
    try {
      setIsLoading('export')
      const response = await apiClient.get('/project/export-project-status-report', {
        params: {
          fromDate: filter.fromDate,
          toDate: filter.toDate,
        },
        responseType: 'blob',
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'Project_Status_Report.xlsx')
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success('Report exported successfully')
    } catch (error) {
      toast.error('Export failed')
    } finally {
      setIsLoading('')
    }
  }

  useEffect(() => {
    fetchReport()
  }, [filter.fromDate, filter.toDate])

  const totalProjects = report?.total || 0
  const totalBudget = Number(report?.totalBudget || 0)
  const completedBudget = Number(report?.completedBudget || 0)
  const pipelineBudget = Math.max(totalBudget - completedBudget, 0)

  const rows = useMemo(() => {
    return STATUS_ROWS.map((s) => {
      const count = Number(report?.[s.key] || 0)
      const budget = Number(report?.[s.budgetKey] || 0)
      return {
        ...s,
        count,
        budget,
      }
    })
  }, [report])

  const countBarData = useMemo(
    () => ({
      labels: rows.map((s) => s.label),
      datasets: [
        {
          label: 'Projects',
          data: rows.map((s) => s.count),
          backgroundColor: rows.map((s) => s.color),
          borderRadius: 8,
          maxBarThickness: 34,
        },
      ],
    }),
    [rows],
  )

  const countBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.raw} project(s)`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        ticks: { precision: 0 },
        border: { display: false },
      },
    },
  }

  const stageBudgetRanking = useMemo(() => {
    return rows
      .map((s) => ({
        label: s.label,
        value: s.budget,
        color: s.color,
      }))
      .sort((a, b) => b.value - a.value)
  }, [rows])

  const budgetRankingData = {
    labels: stageBudgetRanking.map((r) => r.label),
    datasets: [
      {
        label: 'Budget',
        data: stageBudgetRanking.map((r) => r.value),
        backgroundColor: stageBudgetRanking.map((r) => r.color),
        borderRadius: 8,
        maxBarThickness: 22,
      },
    ],
  }

  const budgetRankingOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${formatINR(ctx.raw)}`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          callback: (v) => {
            const n = Number(v)
            if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`
            if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
            if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`
            return `₹${n}`
          },
          font: { size: 11 },
        },
        border: { display: false },
      },
      y: {
        grid: { display: false },
        ticks: { font: { size: 11 } },
        border: { display: false },
      },
    },
  }

  return (
    <Container className="mt-4 container-lg p-0">
      <Helmet>
        <title>Project Status Report — Clientmark</title>
      </Helmet>

      <Card style={{ border: 'none', borderRadius: 14, overflow: 'hidden' }}>
        <Card.Header className="mainBGColor text-white fw-bold d-flex justify-content-between align-items-center">
          <span>Project Status Report</span>
          <Button className="button" onClick={handleExport} disabled={isLoading === 'export'}>
            {isLoading === 'export' ? (
              <Spinner size="sm" animation="border" />
            ) : (
              <>
                <FaFileExcel className="me-1" /> Export
              </>
            )}
          </Button>
        </Card.Header>
        <Card.Body style={{ background: 'var(--background-color)' }}>
          <Row className="g-2 align-items-end mb-3">
            <Col xs={12} md={3}>
              <Form.Label className="small fw-semibold mb-1">From Date</Form.Label>
              <Form.Control
                type="date"
                value={filter.fromDate}
                onChange={(e) => setFilter((prev) => ({ ...prev, fromDate: e.target.value }))}
              />
            </Col>
            <Col xs={12} md={3}>
              <Form.Label className="small fw-semibold mb-1">To Date</Form.Label>
              <Form.Control
                type="date"
                value={filter.toDate}
                onChange={(e) => setFilter((prev) => ({ ...prev, toDate: e.target.value }))}
              />
            </Col>
          </Row>

          {isLoading === 'report' ? (
            <Card style={{ borderRadius: 12 }}>
              <Card.Body className="text-center py-5">
                <Spinner animation="border" size="sm" className="me-2" /> Loading report...
              </Card.Body>
            </Card>
          ) : (
            <>
              <Row className="g-3 mb-3">
                <Col xs={12} sm={6} xl={3}>
                  <MetricCard
                    title="Total Projects"
                    value={totalProjects}
                    icon={<FaLayerGroup />}
                    tone="blue"
                  />
                </Col>
                <Col xs={12} sm={6} xl={3}>
                  <MetricCard
                    title="Total Budget"
                    value={formatINR(totalBudget)}
                    icon={<FaRupeeSign />}
                    tone="slate"
                  />
                </Col>
                <Col xs={12} sm={6} xl={3}>
                  <MetricCard
                    title="Completed Budget"
                    value={formatINR(completedBudget)}
                    icon={<FaCheckCircle />}
                    tone="green"
                  />
                </Col>
                <Col xs={12} sm={6} xl={3}>
                  <MetricCard
                    title="Pending Pipeline"
                    value={formatINR(pipelineBudget)}
                    icon={<FaClock />}
                    tone="amber"
                  />
                </Col>
              </Row>

              <Row className="g-3 mb-3">
                <Col xs={12}>
                  <Card
                    style={{
                      border: 'none',
                      borderRadius: 14,
                      boxShadow: '0 6px 20px rgba(15,23,42,0.08)',
                    }}
                  >
                    <Card.Body>
                      <div
                        className="fw-bold"
                        style={{ fontSize: 14, color: theme?.textColor || 'var(--text-color)' }}
                      >
                        Project Count by Status
                      </div>
                      <div className="small text-muted mb-3">
                        Stage load across full project lifecycle
                      </div>
                      <div style={{ height: 280 }}>
                        <Bar data={countBarData} options={countBarOptions} />
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <Row className="g-3 mb-3">
                <Col xs={12}>
                  <Card
                    style={{
                      border: 'none',
                      borderRadius: 14,
                      boxShadow: '0 6px 20px rgba(15,23,42,0.08)',
                    }}
                  >
                    <Card.Body>
                      <div
                        className="fw-bold"
                        style={{ fontSize: 14, color: theme?.textColor || 'var(--text-color)' }}
                      >
                        Budget Concentration (Descending)
                      </div>
                      <div className="small text-muted mb-3">
                        Highest budget holding stages first for management attention
                      </div>
                      <div style={{ height: 300 }}>
                        <Bar data={budgetRankingData} options={budgetRankingOptions} />
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <Card
                style={{
                  border: 'none',
                  borderRadius: 14,
                  boxShadow: '0 6px 20px rgba(15,23,42,0.08)',
                }}
              >
                <Card.Body>
                  <div
                    className="fw-bold"
                    style={{ fontSize: 14, color: theme?.textColor || 'var(--text-color)' }}
                  >
                    Detailed Status Summary
                  </div>
                  <div className="small text-muted mb-3">
                    Counts and budgets mapped directly from current backend response fields
                  </div>

                  <Table responsive hover className="align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th className="text-center">Projects</th>
                        <th className="text-end">Budget</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.key}>
                          <td>
                            <Badge
                              bg="light"
                              text="dark"
                              style={{
                                borderLeft: `4px solid ${row.color}`,
                                borderRadius: 8,
                                padding: '8px 10px',
                                fontWeight: 600,
                              }}
                            >
                              {row.label}
                            </Badge>
                          </td>
                          <td className="text-center fw-semibold">{row.count}</td>
                          <td className="text-end">{formatINR(row.budget)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th>Total</th>
                        <th className="text-center" style={{ color: 'var(--primary-color)' }}>
                          {totalProjects}
                        </th>
                        <th className="text-end" style={{ color: 'var(--primary-color)' }}>
                          {formatINR(totalBudget)}
                        </th>
                      </tr>
                    </tfoot>
                  </Table>
                </Card.Body>
              </Card>
            </>
          )}
        </Card.Body>
      </Card>
    </Container>
  )
}

export default ProjectStatusReport
