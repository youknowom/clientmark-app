import React, { useContext, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Container, Card, Form, Button, Spinner, Table, Row, Col, Collapse } from 'react-bootstrap'

import { FaRegEye } from 'react-icons/fa'
import { FaFileExcel, FaTrashAlt } from 'react-icons/fa'
import { BsFunnel } from 'react-icons/bs'
import CreatableSelect from 'react-select/creatable'
import { formatDateTime } from '../../helpers/dateFormater'
import { useDebounce } from 'use-debounce'
import { AuthContext } from '../../AuthContext'
import apiClient from '../../api/axiosClient'
import toast from 'react-hot-toast'
const ConfirmationModal = React.lazy(() => import('../../components/mycomponent/ConfirmationModal'))
import { getListState, saveListState } from '../../helpers/listStateStorage'
import { useSocket } from '../../SocketContext'
import EmptyState from '../../components/mycomponent/EmptyState'

import '../sidebarCSS/comStyle.css'
import '../sidebarCSS/table.css'

function AllProject() {
  const { token } = useContext(AuthContext)
  const socket = useSocket()
  const location = useLocation()
  const navigate = useNavigate()

  const LIST_KEY = 'ALL_PROJECT'
  const saved = getListState(LIST_KEY)

  const dbStatus = location.state?.filter

  const [isLoading, setIsLoading] = useState('')
  const [data, setData] = useState([])
  const [failedProject, setFailedProject] = useState([])

  const [filter, setFilter] = useState(() => {
    if (dbStatus) {
      return {
        search: '',
        fromDate: '',
        toDate: '',
        status: dbStatus,
        priority: '',
      }
    }
    return saved?.filter || {}
  })
  const [debouncedSearch] = useDebounce(filter.search, 300)
  const [pagination, setPagination] = useState(
    saved?.pagination || { page: 1, limit: 10, totalPages: 1 },
  )

  const [showFilter, setShowFilter] = useState(false)
  const toggleFilter = () => setShowFilter(!showFilter)

  const [openRow, setOpenRow] = useState(null)
  const toggleRow = (index) => {
    setOpenRow(openRow === index ? null : index)
  }

  const [selectedProject, setSelectedProject] = useState([])

  const [confirmState, setConfirmState] = useState({
    show: false,
    message: '',
    onConfirm: () => {},
  })

  // Priority and Status color mapping with modern, accessible palette
  const priorityDD = [
    { label: 'Low', value: 'Low', bg: '#ECFDF5', tx: '#047857' },
    { label: 'Medium', value: 'Medium', bg: '#FFFBEB', tx: '#B45309' },
    { label: 'High', value: 'High', bg: '#FEF2F2', tx: '#B91C1C' },
  ]

  const statusDD = [
    { label: 'Not assigned', value: 'Not assigned', bg: '#F3F4F6', tx: '#374151' },
    { label: 'Assigned', value: 'Assigned', bg: '#EFF6FF', tx: '#1D4ED8' },
    { label: 'Hold', value: 'Hold', bg: '#FFFBEB', tx: '#B45309' },
    { label: 'In Progress', value: 'In Progress', bg: '#F0FDFA', tx: '#0F766E' },
    { label: 'Testing', value: 'Testing', bg: '#F5F3FF', tx: '#6D28D9' },
    { label: 'Client Review', value: 'Client Review', bg: '#FFF7ED', tx: '#C2410C' },
    { label: 'Completed', value: 'Completed', bg: '#ECFDF5', tx: '#047857' },
  ]

  const getPriorityBadge = (priority) => {
    const found = priorityDD.find((p) => p.value === priority)
    return found || { bg: '#F3F4F6', tx: '#374151' }
  }
  const getStatusBadge = (status) => {
    const found = statusDD.find((s) => s.value === status)
    return found || { bg: '#F3F4F6', tx: '#374151' }
  }

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({
      ...prev,
      page: newPage,
    }))
  }

  //fetch projects
  const getProjects = async () => {
    try {
      const response = await apiClient.get('/project/get-projects', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params: {
          search: debouncedSearch,
          status: filter.status,
          priority: filter.priority,
          page: pagination.page,
          limit: pagination.limit,
        },
      })

      setData(response.data.data)
      setPagination((prev) => ({
        ...prev,
        totalPages: response.data.pagination?.pages || 1,
      }))
    } catch (error) {
      setData([])
      setPagination((prev) => ({ ...prev, totalPages: 1 }))
    }
  }

  //delete single project
  const deleteProject = async (_id) => {
    try {
      const res = await apiClient.delete(`/project/delete-project/${_id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      toast.success(res.data.message || 'Successfully deleted project.')
      setData((prev) => prev.filter((u) => u?._id !== _id))
    } catch (err) {
      toast.error(err?.data?.message || 'Internal server error. Try after sometime.')
    } finally {
      setConfirmState({ show: false, message: '', onConfirm: () => {} })
    }
  }

  //export data
  const handleExport = async () => {
    try {
      setIsLoading('export')

      const response = await apiClient.get('/project/export-projects', {
        params: {
          search: debouncedSearch,
          fromDate: filter.fromDate,
          toDate: filter.toDate,
          status: filter.status,
          priority: filter.priority,
        },
        responseType: 'blob',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'Projects.xlsx')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success('File exported successfully.')
    } catch (err) {
      toast.error('Failed to export project.')
    } finally {
      setIsLoading('')
    }
  }

  //delete selected projects
  const deleteMarked = async () => {
    try {
      const _ids = selectedProject.map((project) => project?._id)

      if (_ids.length === 0) {
        toast.error('No projects selected to delete.')
        return
      }

      const response = await apiClient.delete('/project/delete-many-projects', {
        data: { ids: _ids },
      })

      toast.success(response.data.message || 'Successfully deleted projects.')

      setFailedProject(response.data.failedIds || [])

      setPagination((prev) => ({ ...prev, page: 1 }))
      getProjects()
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to delete projects.')
    } finally {
      setConfirmState({ show: false, message: '', onConfirm: () => {} })
    }
  }

  //select all by clicking checkbox
  const handleSelectAll = () => {
    const currentPageProjects = data.map((d) => ({
      _id: d._id,
      ProjectId: d.ProjectId,
    }))

    const isAllSelected = currentPageProjects.every((project) =>
      selectedProject.some((selected) => selected?._id === project?._id),
    )

    if (isAllSelected) {
      // Deselect only this page
      setSelectedProject((prev) =>
        prev.filter(
          (selected) => !currentPageProjects.some((project) => project?._id === selected?._id),
        ),
      )
    } else {
      // Select all on this page + keep old selections
      const merged = [...selectedProject]

      currentPageProjects.forEach((project) => {
        if (!merged.some((selected) => selected?._id === project?._id)) {
          merged.push(project)
        }
      })

      setSelectedProject(merged)
    }
  }

  //select single
  const handleSelectProject = (_id, ProjectId) => {
    setSelectedProject((prevSelectedProject) => {
      const isAlreadySelected = prevSelectedProject.some((project) => project?._id === _id)

      setFailedProject((prev) => prev.filter((id) => id !== _id))

      if (isAlreadySelected) {
        // Deselect
        return prevSelectedProject.filter((project) => project?._id !== _id)
      } else {
        // Select
        return [...prevSelectedProject, { _id, ProjectId }]
      }
    })
  }

  useEffect(() => {
    getProjects()
  }, [debouncedSearch, pagination.page, pagination.limit, filter])

  useEffect(() => {
    saveListState(LIST_KEY, { filter, pagination })
  }, [filter, pagination])

  useEffect(() => {
    if (!socket) return

    const events = ['create-project']

    events.forEach((event) => socket.on(event, getProjects))

    return () => events.forEach((event) => socket.off(event, getProjects))
  }, [socket])

  return (
    <Container className="mt-4 container-lg p-0">
      {/* Confirmation Modal */}
      <React.Suspense fallback={null}>
        <ConfirmationModal
          show={confirmState.show}
          message={confirmState.message}
          onConfirm={() => {
            confirmState.onConfirm()
          }}
          onCancel={() => setConfirmState({ ...confirmState, show: false })}
        />
      </React.Suspense>
      <Card>
        <Card.Header className="mainBGColor text-white fw-bold">All Project Data</Card.Header>
        <Card.Body>
          <div className="d-flex align-items-center mb-3" style={{ gap: '10px' }}>
            {/* Filter Icon Button */}
            <Button
              title="Filter"
              variant="light"
              onClick={toggleFilter}
              style={{
                border: '1px solid #ddd',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BsFunnel size={16} />
            </Button>

            {/* Limit Dropdown */}
            <CreatableSelect
              options={[10, 50, 100, 500, 1000].map((v) => ({
                label: String(v),
                value: v,
              }))}
              value={
                pagination.limit
                  ? { label: String(pagination.limit), value: pagination.limit }
                  : null
              }
              onChange={(selected) => {
                const value = Number(selected?.value)
                setPagination((prev) => ({
                  ...prev,
                  limit: value,
                  page: 1,
                }))
              }}
              placeholder="Limit"
              isClearable={false}
              classNamePrefix="lead-select"
              styles={{
                container: (base) => ({
                  ...base,
                  width: 90,
                  fontSize: '12px',
                }),
                control: (base) => ({
                  ...base,
                  minHeight: 28,
                  height: 28,
                }),
                valueContainer: (base) => ({
                  ...base,
                  padding: '0 6px',
                }),
                input: (base) => ({
                  ...base,
                  margin: 0,
                  padding: 0,
                }),
                indicatorsContainer: (base) => ({
                  ...base,
                  height: 28,
                }),
              }}
            />
            {/* export */}
            <Button
              variant="success"
              onClick={handleExport}
              style={{
                height: '32px',
                fontSize: '12px',
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              {isLoading === 'export' ? (
                <Spinner size="sm" animation="border" className="me-2" />
              ) : (
                <>
                  <FaFileExcel className="me-1" />
                  Export
                </>
              )}
            </Button>
            {/* <Button
              variant="outline-danger"
              style={{
                height: '32px',
                fontSize: '12px',
                padding: '0 12px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
              }}
              onClick={() => {
                if (selectedProject.length <= 0) {
                  toast.error('Please select project.')
                  return
                }

                setConfirmState({
                  show: true,
                  message: `Are you sure you want to delete selected ${selectedProject.length} project(s)?`,
                  onConfirm: () => deleteMarked(),
                })
              }}
            >
              Delete Marked
            </Button> */}
          </div>

          {showFilter && (
            <div style={{ position: 'relative', width: '100%' }}>
              <Card className="mb-3 shadow-sm w-100">
                <Card.Body className="pt-2">
                  <Row className="g-2">
                    {/* Search */}
                    <Col xs={12} sm={6} md={4} lg={4}>
                      <Form.Label style={{ fontSize: '12px', fontWeight: '500' }}>
                        Search Here
                      </Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Search by Project Name, Client Name, or Project ID"
                        value={filter.search}
                        onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                        style={{ fontSize: '12px', padding: '6px 10px' }}
                      />
                    </Col>

                    {/* From Date */}
                    <Col xs={12} sm={6} md={4} lg={2}>
                      <Form.Label style={{ fontSize: '12px', fontWeight: '500' }}>
                        From Date
                      </Form.Label>
                      <Form.Control
                        type="date"
                        value={filter.fromDate}
                        onChange={(e) => setFilter({ ...filter, fromDate: e.target.value })}
                        style={{ fontSize: '12px', padding: '6px 10px' }}
                      />
                    </Col>

                    {/* To Date */}
                    <Col xs={12} sm={6} md={4} lg={2}>
                      <Form.Label style={{ fontSize: '12px', fontWeight: '500' }}>
                        To Date
                      </Form.Label>
                      <Form.Control
                        type="date"
                        value={filter.toDate}
                        onChange={(e) => setFilter({ ...filter, toDate: e.target.value })}
                        style={{ fontSize: '12px', padding: '6px 10px' }}
                      />
                    </Col>

                    {/* Priority dropdown */}
                    <Col xs={12} sm={6} md={4} lg={2}>
                      <Form.Label style={{ fontSize: '12px', fontWeight: '500' }}>
                        Priority
                      </Form.Label>
                      <Form.Select
                        value={filter.priority}
                        onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
                        style={{ fontSize: '12px', padding: '6px 10px' }}
                      >
                        <option value="">All Priority</option>
                        {priorityDD?.map((d, index) => (
                          <option key={index} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Col>

                    {/* Status Dropdown */}
                    <Col xs={12} sm={6} md={4} lg={2}>
                      <Form.Label style={{ fontSize: '12px', fontWeight: '500' }}>
                        Status
                      </Form.Label>
                      <Form.Select
                        value={filter.status}
                        onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                        style={{ fontSize: '12px', padding: '6px 10px' }}
                      >
                        <option value="">All Status</option>
                        {statusDD?.map((d, index) => (
                          <option key={index} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </div>
          )}

          <div className="table-scroll-container">
            <Table bordered hover striped className="user-table">
              <thead>
                <tr>
                  {/* Select All Checkbox */}
                  <th>
                    <Form.Check
                      type="checkbox"
                      className="custom-checkbox"
                      checked={
                        data.length > 0 &&
                        data.every((d) => selectedProject.some((project) => project._id === d._id))
                      }
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Sr</th>
                  <th>Project ID</th>
                  <th>Project Name</th>
                  <th>Client Name</th>
                  <th>Status</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th className="sticky-action-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-0 border-0">
                      <EmptyState
                        title="No projects found"
                        description={
                          filter?.search || filter?.status || filter?.priority || filter?.fromDate
                            ? "No projects matched your active filters. Try resetting filters."
                            : "No projects exist yet. Create your first project or convert a closed lead."
                        }
                        actionLabel={
                          filter?.search || filter?.status || filter?.priority || filter?.fromDate
                            ? "Reset Filters"
                            : "Create Project"
                        }
                        onAction={
                          filter?.search || filter?.status || filter?.priority || filter?.fromDate
                            ? handleReset
                            : () => navigate('/add-project')
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  data?.map((d, index) => (
                    <React.Fragment key={d._id}>
                      <tr
                        style={{ cursor: 'pointer' }}
                        onClick={() => toggleRow(index)}
                      >
                        {/* Row Checkbox */}
                        <td>
                          <Form.Check
                            type="checkbox"
                            className={`custom-checkbox ${
                              failedProject?.includes(d._id.toString()) ? 'red-checkbox' : ''
                            }`}
                            checked={selectedProject?.some((project) => project._id === d._id)}
                            onChange={() => handleSelectProject(d._id, d.ProjectId)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td>{(pagination.page - 1) * pagination.limit + index + 1}</td>
                        <td>{d.ProjectId}</td>
                        <td>{d.ProjectName}</td>
                        <td>{d.ClientName || '--'}</td>
                        <td>
                          {(() => {
                            const badge = getStatusBadge(d.ProjectStatus)
                            return (
                              <span
                                style={{
                                  backgroundColor: badge.bg,
                                  color: badge.tx,
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  display: 'inline-block',
                                  border: '1px solid rgba(0,0,0,0.06)',
                                }}
                              >
                                {d.ProjectStatus}
                              </span>
                            )
                          })()}
                        </td>
                        <td>
                          {d.createdAt ? formatDateTime(new Date(d.createdAt)) : '--'}
                        </td>

                        <td>
                          {d.ProjectEndDate ? formatDateTime(new Date(d.ProjectEndDate)) : '--'}
                        </td>
                        <td className="sticky-action-col action">
                          <Button
                            title="View"
                            className="me-2 editSpan"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate('/project-details', {
                                state: { projectId: d._id },
                              })
                            }}
                          >
                            <FaRegEye />
                          </Button>
                          <Button
                            title="Delete"
                            className="deleteicon"
                            onClick={(e) => {
                              e.stopPropagation()
                              setConfirmState({
                                show: true,
                                message: 'Are you sure you want to delete this project?',
                                onConfirm: () => deleteProject(d?._id),
                              })
                            }}
                          >
                            <FaTrashAlt />
                          </Button>
                        </td>
                      </tr>

                      {/* Hidden details row */}
                      <tr>
                        <td colSpan={9} style={{ padding: 0, border: 'none' }}>
                          <Collapse in={openRow === index}>
                            <div>
                              <div style={{ padding: '8px 10px' }}>
                                <table className="table table-bordered table-sm mb-0 bg-white" style={{ fontSize: '11px', width: 'auto', minWidth: '500px' }}>
                                  <tbody>
                                    <tr>
                                      <td style={{ fontWeight: 'bold', width: '40%' }}>Project Manager</td>
                                      <td style={{ fontWeight: 'bold', width: '60%' }}>Assigned Developers</td>
                                    </tr>
                                    <tr>
                                      <td>{d?.AssignedProjectManager || d?.AssignedProjectManagerName || '--'}</td>
                                      <td>
                                        {Array.isArray(d?.AssignedDevelopers) && d.AssignedDevelopers.length > 0
                                          ? d.AssignedDevelopers.map((dev) => dev?.fullName || dev?.label || dev).join(', ')
                                          : '--'}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </Collapse>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </Table>
          </div>

          <div className="pagination-controls text-center">
            <Button
              className="button"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              Prev
            </Button>
            <span className="mx-3">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              className="button"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </Card.Body>
      </Card>
    </Container>
  )
}

export default AllProject
