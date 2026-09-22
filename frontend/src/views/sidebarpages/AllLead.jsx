import React, { useContext, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Container,
  Card,
  Form,
  Button,
  Spinner,
  Table,
  Row,
  Col,
  Dropdown,
  Collapse,
} from 'react-bootstrap'

import {
  FaFileExcel,
  FaPencilAlt,
  FaTrashAlt,
  FaDownload,
  FaFileImport,
  FaWhatsapp,
  FaFolderPlus,
} from 'react-icons/fa'
import EmptyState from '../../components/mycomponent/EmptyState'
import { RiCustomerService2Line } from 'react-icons/ri'
import { GrDocumentPerformance } from 'react-icons/gr'
import { BsFunnel, BsThreeDotsVertical } from 'react-icons/bs'
import CreatableSelect from 'react-select/creatable'
import { formatDateTime } from '../../helpers/dateFormater'

import { useDebounce } from 'use-debounce'

import { AuthContext } from '../../AuthContext'
import apiClient from '../../api/axiosClient'
import { hasPermission } from '../../helpers/hasPermission'

import toast from 'react-hot-toast'

const ConfirmationModal = React.lazy(() => import('../../components/mycomponent/ConfirmationModal'))
import { AssignAdminToTelecaller, AssignTelecallerToBde, AssignBdeToAdmin } from './AssignmentModal'
import WhatsAppModal from '../../components/mycomponent/WhatsAppModal'
const CallingModal = React.lazy(() => import('./CallingModal'))

import { getListState, saveListState } from '../../helpers/listStateStorage'
import { useSocket } from '../../SocketContext'

import '../sidebarCSS/comStyle.css'
import '../sidebarCSS/table.css'

function AllLead() {
  // WhatsApp Modal state
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false)
  const [selectedLeadForWhatsApp, setSelectedLeadForWhatsApp] = useState(null)

  // WhatsApp send handler
  const handleSendWhatsApp = async (msg) => {
    if (!selectedLeadForWhatsApp?._id) {
      toast.error('No lead selected')
      return
    }
    try {
      toast.loading('Sending WhatsApp message...')
      const res = await apiClient.post('/lead/send-whatsapp', {
        leadId: selectedLeadForWhatsApp._id,
        message: msg,
      })
      toast.dismiss()
      if (res.data.success) {
        toast.success('WhatsApp message sent successfully')
      } else {
        toast.error(res.data.message || 'Failed to send WhatsApp message')
      }
    } catch (error) {
      toast.dismiss()
      toast.error(error?.response?.data?.message || 'Failed to send WhatsApp message')
    }
  }
  const socket = useSocket()
  const { userData } = useContext(AuthContext)
  const navigate = useNavigate()
  const location = useLocation()

  const LIST_KEY = 'ALL_LEAD'
  const saved = getListState(LIST_KEY)

  const dbStatus = location?.state?.filter || ''

  const [isLoading, setIsLoading] = useState('')
  const [data, setData] = useState([])
  const [failedLead, setFailedLead] = useState([])
  const [formData, setFormData] = useState({})

  const [filter, setFilter] = useState(() => {
    if (dbStatus) {
      return {
        search: '',
        fromDate: '',
        toDate: '',
        leadStatus: dbStatus,
        callStatus: '',
        leadStage: '',
      }
    }
    return saved?.filter || {}
  })

  const [debouncedSearch] = useDebounce(filter.search, 300)
  const [pagination, setPagination] = useState(
    saved?.pagination || { page: 1, limit: 10, totalPages: 1 },
  )

  const [openRow, setOpenRow] = useState(null)
  const toggleRow = (index) => {
    setOpenRow(openRow === index ? null : index)
  }

  const [showFilter, setShowFilter] = useState(false)
  const toggleFilter = () => setShowFilter(!showFilter)

  const [selectedLead, setSelectedLead] = useState([])

  const [confirmState, setConfirmState] = useState({
    show: false,
    message: '',
    onConfirm: () => {},
  })

  //state for Admin to Telecaller assignment
  const [showAdminToTC, setShowAdminToTC] = useState(false)

  //state for  Telecaller To BDE assignment
  const [showTcToBde, setShowTcToBde] = useState(false)

  //state for  BDE To Admin assignment
  const [showBdeToAdmin, setShowBdeToAdmin] = useState(false)

  //state for open calling modal
  const [showCallingModal, setShowCallingModal] = useState(false)

  const leadStageColor = {
    NEW: { bg: '#F3F4F6', tx: '#374151' },
    TELECALLING: { bg: '#EFF6FF', tx: '#1D4ED8' },
    SALES: { bg: '#EEF2FF', tx: '#4338CA' },
    CLOSED: { bg: '#ECFDF5', tx: '#047857' },
  }

  const callStatusColor = {
    PENDING: { bg: '#FFFBEB', tx: '#B45309' },
    NOT_CONNECTED: { bg: '#FEF2F2', tx: '#B91C1C' },
    CONNECTED: { bg: '#ECFDF5', tx: '#047857' },
    CALL_BACK: { bg: '#F5F3FF', tx: '#6D28D9' },
  }

  const leadStatusColor = {
    NEW: { bg: '#F3F4F6', tx: '#374151' },
    ASSIGNED_TO_TELECALLER: { bg: '#EFF6FF', tx: '#1D4ED8' },
    ASSIGNED_TO_BDE: { bg: '#EEF2FF', tx: '#4338CA' },
    WON: { bg: '#ECFDF5', tx: '#047857' },
    LOST: { bg: '#FEF2F2', tx: '#B91C1C' },
  }

  const leadStageDD = [
    { value: 'NEW', label: 'NEW' },
    { value: 'TELECALLING', label: 'TELECALLING' },
    { value: 'SALES', label: 'SALES' },
    { value: 'CLOSED', label: 'CLOSED' },
  ]

  const callStatusDD = [
    { value: 'PENDING', label: 'PENDING' },
    { value: 'NOT_CONNECTED', label: 'NOT_CONNECTED' },
    { value: 'CONNECTED', label: 'CONNECTED' },
    { value: 'CALL_BACK', label: 'CALL_BACK' },
  ]

  const leadStatusDD = [
    { value: 'NEW', label: 'NEW' },
    { value: 'ASSIGNED_TO_TELECALLER', label: 'ASSIGNED_TO_TC' },
    { value: 'ASSIGNED_TO_BDE', label: 'ASSIGNED_TO_BDE' },
    { value: 'WON', label: 'WON' },
    { value: 'LOST', label: 'LOST' },
  ]

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({
      ...prev,
      page: newPage,
    }))
  }

  // Trigger file input when user clicks "Import"
  const handleFileSelect = () => {
    document.getElementById('excelFileInput').click()
  }

  // Handle file change event
  const onFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      handleFileUpload(file)
    }
    e.target.value = null
  }

  // Upload file to backend
  const handleFileUpload = async (file) => {
    try {
      if (!file) {
        toast.error('Please select a file to upload.')
        return
      }

      const allowedExtensions = ['xls', 'xlsx']
      const fileExtension = file.name.split('.').pop().toLowerCase()

      if (!allowedExtensions.includes(fileExtension)) {
        toast.error('Invalid file type. Please upload an Excel file (.xls or .xlsx).')
        return
      }

      const formData = new FormData()
      formData.append('file', file)

      setIsLoading('import')

      const response = await apiClient.post('/lead/import-lead', formData, {
        isFileUpload: true,
      })

      toast.success(response.data.message || 'Leads imported successfully!')
      getLeads()
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to import leads.')
    } finally {
      setIsLoading('')
    }
  }

  //fetch leads
  const getLeads = async () => {
    try {
      const response = await apiClient.get('/lead/get-leads', {
        params: {
          search: debouncedSearch,
          fromDate: filter.fromDate,
          toDate: filter.toDate,
          leadStatus: filter.leadStatus,
          callStatus: filter.callStatus,
          leadStage: filter.leadStage,
          page: pagination.page,
          limit: pagination.limit,
        },
      })

      setData(response.data.data)
      setPagination((prev) => ({
        ...prev,
        totalPages: response.data.pagination?.totalPages || 1,
      }))
    } catch (error) {
      setData([])
      setPagination((prev) => ({ ...prev, totalPages: 1 }))
    }
  }

  //delete single lead
  const deleteLead = async (_id) => {
    try {
      const res = await apiClient.delete(`/lead/delete-lead/${_id}`)
      toast.success(res.data.message || 'Successfully delete lead.')
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
      const response = await apiClient.get(`/lead/export-lead`, {
        params: {
          search: debouncedSearch,
          fromDate: filter.fromDate,
          toDate: filter.toDate,
          leadStatus: filter.leadStatus,
          callStatus: filter.callStatus,
          leadStage: filter.leadStage,
        },
        responseType: 'blob',
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'Leads.xlsx')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success('File exported successfully.')
    } catch (err) {
      toast.error(err?.data?.message || 'Internal server error. Try after sometime.')
    } finally {
      setIsLoading('')
    }
  }

  //download sample
  const downSample = async () => {
    try {
      setIsLoading('sample')
      const response = await apiClient.get(`/lead/down-sample`, {
        params: { search: filter.search },
        responseType: 'blob',
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'Lead_Template.xlsx')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success('Downloaded successfully.')
    } catch (err) {
      toast.error(err?.data?.message || 'Internal server error. Try after sometime.')
    } finally {
      setIsLoading('')
    }
  }

  //delete selected
  const deleteMarked = async () => {
    try {
      const _ids = selectedLead.map((lead) => lead?._id)

      if (_ids.length === 0) {
        toast.error('No leads selected to delete.')
        return
      }

      const response = await apiClient.delete('/lead/delete-many-lead', {
        data: { selectedLead: _ids },
      })

      toast.success(response.data.message || 'Successfully deleted leads.')

      // store failed ids
      setFailedLead(response.data.failedIds || [])

      setPagination((prev) => ({ ...prev, page: 1 }))
      getLeads()
    } catch (error) {
      toast.error(error?.data?.message || 'Failed to delete leads.')
    } finally {
      setConfirmState({ show: false, message: '', onConfirm: () => {} })
    }
  }

  //select all by clicking checkbox
  const handleSelectAll = () => {
    const currentPageLeads = data.map((d) => ({
      _id: d._id,
      leadNo: d.leadNo,
    }))

    const isAllSelected = currentPageLeads.every((lead) =>
      selectedLead.some((selected) => selected?._id === lead?._id),
    )

    if (isAllSelected) {
      // Deselect only this page
      setSelectedLead((prev) =>
        prev.filter((selected) => !currentPageLeads.some((lead) => lead?._id === selected?._id)),
      )
    } else {
      // Select all on this page + keep old selections
      const merged = [...selectedLead]

      currentPageLeads.forEach((lead) => {
        if (!merged.some((selected) => selected?._id === lead?._id)) {
          merged.push(lead)
        }
      })

      setSelectedLead(merged)
    }
  }

  //select single
  const handleSelectLead = (_id, leadNo) => {
    setSelectedLead((prevSelectedLead) => {
      const isAlreadySelected = prevSelectedLead.some((lead) => lead?._id === _id)

      setFailedLead((prev) => prev.filter((id) => id !== _id))

      if (isAlreadySelected) {
        // Deselect
        return prevSelectedLead.filter((lead) => lead?._id !== _id)
      } else {
        // Select
        return [...prevSelectedLead, { _id, leadNo }]
      }
    })
  }

  //open AssignAdminToTelecaller model
  const openAdminToTC = () => {
    setShowAdminToTC(true)
  }

  //open AssignTelecallerToBde model
  const openTcToBde = () => {
    setShowTcToBde(true)
  }

  //open AssignBdeToAdmin model
  const openBdeToAdmin = async () => {
    setShowBdeToAdmin(true)
  }

  //open CallingModal
  const openCallingModal = async (lead) => {
    setFormData(lead)
    setShowCallingModal(true)
  }

  useEffect(() => {
    getLeads()
  }, [debouncedSearch, pagination.page, pagination.limit, filter])

  useEffect(() => {
    saveListState(LIST_KEY, { filter, pagination })
  }, [filter, pagination])

  useEffect(() => {
    if (!socket) return

    const events = [
      'create-lead',
      'many-admin-to-telecaller',
      'many-telecaller-to-bde',
      'many-bde-to-admin',
      'single-telecaller-to-bde',
    ]

    events.forEach((event) => socket.on(event, getLeads))

    return () => events.forEach((event) => socket.off(event, getLeads))
  }, [socket])

  return (
    <Container className="mt-4 container-lg p-0">
      <Card>
        <Card.Header className="mainBGColor text-white fw-bold">All Lead Data</Card.Header>
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

            {/* Three Dots Button */}
            <Dropdown>
              <Dropdown.Toggle
                variant="light"
                style={{
                  border: '1px solid #ddd',
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isLoading === 'sample' || isLoading === 'import' ? (
                  <Spinner size="sm" animation="border" className="me-2" />
                ) : (
                  <BsThreeDotsVertical />
                )}
              </Dropdown.Toggle>

              <Dropdown.Menu align="start">
                {/* Download Sample Option */}
                <Dropdown.Item onClick={downSample}>
                  <FaDownload className="me-2 text-primary" />
                  Sample
                </Dropdown.Item>

                {/* Import Option */}
                <Dropdown.Item onClick={handleFileSelect}>
                  <FaFileImport className="me-2 text-success" />
                  Import
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>

            {/* Hidden file input */}
            <input
              type="file"
              id="excelFileInput"
              accept=".xls,.xlsx"
              style={{ display: 'none' }}
              onChange={onFileChange}
            />

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

            {hasPermission(userData, 'update:lead') && (
              <Button
                variant="outline-primary"
                style={{
                  width: '120px',
                  fontSize: '12px',
                  padding: '4px 2px',
                  fontWeight: 'bold',
                }}
                onClick={() => {
                  if (selectedLead.length <= 0) {
                    toast.error('Please select lead.')
                    return
                  }
                  openAdminToTC()
                }}
              >
                Assign Telecaller
              </Button>
            )}

            {hasPermission(userData, 'update:lead') && (
              <Button
                variant="outline-success"
                style={{
                  width: '120px',
                  fontSize: '12px',
                  padding: '4px 2px',
                  fontWeight: 'bold',
                }}
                onClick={() => {
                  if (selectedLead.length <= 0) {
                    toast.error('Please select lead.')
                    return
                  }
                  openTcToBde()
                }}
              >
                Assign BDE
              </Button>
            )}

            {hasPermission(userData, 'update:lead') && (
              <Button
                variant="outline-info"
                style={{
                  width: '120px',
                  fontSize: '12px',
                  padding: '4px 2px',
                  fontWeight: 'bold',
                }}
                onClick={() => {
                  if (selectedLead.length <= 0) {
                    toast.error('Please select lead.')
                    return
                  }
                  openBdeToAdmin()
                }}
              >
                Assign Admin
              </Button>
            )}

            {hasPermission(userData, 'delete:lead') && (
              <Button
                variant="outline-danger"
                style={{
                  width: '120px',
                  fontSize: '12px',
                  padding: '4px 2px',
                  fontWeight: 'bold',
                }}
                onClick={() => {
                  if (selectedLead.length <= 0) {
                    toast.error('Please select lead.')
                    return
                  }

                  setConfirmState({
                    show: true,
                    message: `Are you sure you want to delete selected ${selectedLead.length} lead(s)?`,
                    onConfirm: () => deleteMarked(),
                  })
                }}
              >
                Delete Marked
              </Button>
            )}
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
                        placeholder="Search by Name, Mobile, or No"
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

                    {/* lead stage dropdown */}
                    <Col xs={12} sm={6} md={4} lg={2}>
                      <Form.Label style={{ fontSize: '12px', fontWeight: '500' }}>
                        Lead Stage
                      </Form.Label>
                      <Form.Select
                        value={filter.leadStage}
                        onChange={(e) => setFilter({ ...filter, leadStage: e.target.value })}
                        style={{ fontSize: '12px', padding: '6px 10px' }}
                      >
                        <option value="">All Stage</option>
                        {leadStageDD?.map((d, index) => (
                          <option key={index} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Col>

                    {/* call status dropdown */}
                    <Col xs={12} sm={6} md={4} lg={2}>
                      <Form.Label style={{ fontSize: '12px', fontWeight: '500' }}>
                        Call Status
                      </Form.Label>
                      <Form.Select
                        value={filter.callStatus}
                        onChange={(e) => setFilter({ ...filter, callStatus: e.target.value })}
                        style={{ fontSize: '12px', padding: '6px 10px' }}
                      >
                        <option value="">All Status</option>
                        {callStatusDD?.map((d, index) => (
                          <option key={index} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Col>

                    {/* Lead Status Dropdown */}
                    <Col xs={12} sm={6} md={4} lg={2}>
                      <Form.Label style={{ fontSize: '12px', fontWeight: '500' }}>
                        Lead Status
                      </Form.Label>
                      <Form.Select
                        value={filter.leadStatus}
                        onChange={(e) => setFilter({ ...filter, leadStatus: e.target.value })}
                        style={{ fontSize: '12px', padding: '6px 10px' }}
                      >
                        <option value="">All Status</option>
                        {leadStatusDD?.map((d, index) => (
                          <option key={index} value={d.value}>
                            {d.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Col>

                    {/* export */}
                    <Col xs={12} sm={6} md={4} lg={2}>
                      <Form.Label style={{ fontSize: '12px', fontWeight: '500' }}>
                        Export
                      </Form.Label>
                      <Button
                        variant="success"
                        className="w-100"
                        onClick={handleExport}
                        style={{ fontSize: '12px', padding: '6px 12px', color: 'white' }}
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
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </div>
          )}

          <div className="table-scroll-container">
            {' '}
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
                        data.every((d) => selectedLead.some((lead) => lead._id === d._id))
                      }
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Sr</th>
                  <th>Lead No</th>
                  <th>Customer Name</th>
                  <th>Mobile</th>
                  <th>Lead Stage</th>
                  <th>Call Status</th>
                  <th>Lead Status</th>
                  <th>Add Date</th>
                  <th>Add by</th>
                  <th className="sticky-action-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data?.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="p-0 border-0">
                      <EmptyState
                        title="No leads found"
                        description={
                          filter?.search || filter?.leadStatus || filter?.fromDate
                            ? "No leads matched your active filters. Try resetting filters."
                            : "No leads are currently available. Create your first lead to start tracking."
                        }
                        actionLabel={
                          filter?.search || filter?.leadStatus || filter?.fromDate
                            ? "Reset Filters"
                            : hasPermission(userData, 'add:lead')
                            ? "Add New Lead"
                            : null
                        }
                        onAction={
                          filter?.search || filter?.leadStatus || filter?.fromDate
                            ? handleReset
                            : () => navigate('/lead-tab?tab=addLead')
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  data?.map((d, index) => (
                    <React.Fragment key={d._id}>
                      <tr
                        key={d._id}
                        style={{ color: 'red', cursor: 'pointer' }}
                        onClick={() => toggleRow(index)}
                      >
                        {/* Row Checkbox */}
                        <td>
                          <Form.Check
                            type="checkbox"
                            className={`custom-checkbox ${
                              failedLead?.includes(d._id.toString()) ? 'red-checkbox' : ''
                            }`}
                            checked={selectedLead?.some((lead) => lead._id === d._id)}
                            onChange={() => handleSelectLead(d._id, d.leadNo)}
                          />
                        </td>
                        <td>{(pagination.page - 1) * pagination.limit + index + 1}</td>
                        <td>{d.leadNo}</td>
                        <td>{d.fullName}</td>
                        <td>{d.mobileNo}</td>
                        <td>
                          <span
                            style={{
                              backgroundColor: leadStageColor[d.leadStage].bg,
                              color: leadStageColor[d.leadStage].tx,
                              padding: '1px 8px',
                              borderRadius: '4px',
                              fontWeight: '500',
                              display: 'inline-block',
                              minWidth: '50px',
                              textAlign: 'center',
                            }}
                          >
                            {d.leadStage}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              backgroundColor: callStatusColor[d.callStatus].bg,
                              color: callStatusColor[d.callStatus].tx,
                              padding: '1px 8px',
                              borderRadius: '4px',
                              fontWeight: '500',
                              display: 'inline-block',
                              minWidth: '50px',
                              textAlign: 'center',
                            }}
                          >
                            {d.callStatus}
                          </span>
                        </td>
                        <td>
                          <span
                            style={{
                              backgroundColor: leadStatusColor[d.leadStatus]?.bg || '#F3F4F6',
                              color: leadStatusColor[d.leadStatus]?.tx || '#374151',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontWeight: '600',
                              fontSize: '11px',
                              display: 'inline-block',
                              textAlign: 'center',
                              border: '1px solid rgba(0,0,0,0.06)',
                            }}
                          >
                            {d.leadStatus === 'ASSIGNED_TO_TELECALLER' ? 'ASSIGNED_TO_TC' : d.leadStatus}
                          </span>
                        </td>
                        <td>{formatDateTime(d.createdAt) || '--'}</td>
                        <td>{d.addById?.fullName || '--'}</td>
                        <td className="sticky-action-col action">
                          {/* //whatsapp */}
                          <Button
                            title="WhatsApp"
                            className="me-2 editSpan"
                            style={{ backgroundColor: '#25D366', border: 'none', color: '#fff' }}
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedLeadForWhatsApp(d)
                              setShowWhatsAppModal(true)
                            }}
                          >
                            <FaWhatsapp />
                          </Button>

                          {/* //call */}
                          <Button
                            title="Call"
                            className="me-2 zoiper"
                            onClick={() => {
                              openCallingModal(d)
                            }}
                          >
                            <RiCustomerService2Line />
                          </Button>

                          {/* //progress */}
                          <Button
                            title="Progress"
                            className="me-2 assign"
                            onClick={() =>
                              navigate('/lead-tab?tab=progress', {
                                state: { user: d, tabName: 'progress', comeFrom: 'all-lead' },
                              })
                            }
                          >
                            <GrDocumentPerformance />
                          </Button>

                          {/* //Edit */}
                          <Button
                            title="Edit"
                            className="me-2 editSpan"
                            onClick={() =>
                              navigate('/lead-tab?tab=addLead', {
                                state: { user: d, tabName: 'addLead' },
                              })
                            }
                          >
                            <FaPencilAlt />
                          </Button>

                          {/* //Convert to Project */}
                          {hasPermission(userData, 'add:project') && (
                            <Button
                              title="Convert to Project"
                              className="me-2"
                              style={{
                                backgroundColor: d.leadStatus === 'WON' ? '#10B981' : '#F3F4F6',
                                borderColor: d.leadStatus === 'WON' ? '#10B981' : 'rgba(0,0,0,0.08)',
                                color: d.leadStatus === 'WON' ? '#FFFFFF' : '#374151',
                                fontSize: '11px',
                                padding: '5px 8px',
                                borderRadius: '6px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate('/add-project', {
                                  state: { fromLead: d },
                                })
                              }}
                            >
                              <FaFolderPlus />
                              {d.leadStatus === 'WON' && (
                                <span style={{ fontSize: '10px', fontWeight: 600 }}>Convert</span>
                              )}
                            </Button>
                          )}

                          {/* //Delete */}
                          {hasPermission(userData, 'delete:lead') && (
                            <Button
                              title="Delete"
                              className="deleteicon"
                              onClick={() =>
                                setConfirmState({
                                  show: true,
                                  message: 'Are you sure you want to delete this lead?',
                                  onConfirm: () => deleteLead(d?._id),
                                })
                              }
                            >
                              <FaTrashAlt />
                            </Button>
                          )}
                        </td>
                      </tr>

                      <tr>
                        <td colSpan={11} style={{ padding: 0, border: 'none' }}>
                          <Collapse in={openRow === index}>
                            <div>
                              <div style={{ padding: '8px 10px' }}>
                                <table className="table table-bordered table-sm mb-0 bg-white" style={{ fontSize: '11px', width: 'auto', minWidth: '500px' }}>
                                  <tbody>
                                    <tr>
                                      <td style={{ fontWeight: 'bold' }}>Business Name</td>
                                      <td style={{ fontWeight: 'bold' }}>Service Requirement</td>
                                      <td style={{ fontWeight: 'bold' }}>Remark</td>
                                    </tr>
                                    <tr>
                                      <td>{d?.businessName || '--'}</td>
                                      <td>{d?.serviceRequirement || '--'}</td>
                                      <td>{d?.remark || '--'}</td>
                                    </tr>
                                    <tr>
                                      <td style={{ fontWeight: 'bold' }}>BDE Name</td>
                                      <td style={{ fontWeight: 'bold' }} colSpan={2}>Telecaller Name</td>
                                    </tr>
                                    <tr>
                                      <td>{d?.assignedToBDE?.fullName || '--'}</td>
                                      <td colSpan={2}>{d?.assignedToTelecaller?.fullName || '--'}</td>
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

      <AssignAdminToTelecaller
        showAdminToTC={showAdminToTC}
        setShowAdminToTC={setShowAdminToTC}
        selectedLead={selectedLead}
        setConfirmState={setConfirmState}
      />

      <AssignTelecallerToBde
        showTcToBde={showTcToBde}
        setShowTcToBde={setShowTcToBde}
        selectedLead={selectedLead}
        setConfirmState={setConfirmState}
      />

      <AssignBdeToAdmin
        showBdeToAdmin={showBdeToAdmin}
        setShowBdeToAdmin={setShowBdeToAdmin}
        selectedLead={selectedLead}
        setConfirmState={setConfirmState}
      />
      <CallingModal
        showCallingModal={showCallingModal}
        setShowCallingModal={setShowCallingModal}
        setConfirmState={setConfirmState}
        formData={formData}
        setFormData={setFormData}
      />
      <ConfirmationModal
        show={confirmState.show}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, show: false }))}
      />
      {/* WhatsApp Modal Integration (single instance) */}
      <WhatsAppModal
        show={showWhatsAppModal}
        onHide={() => setShowWhatsAppModal(false)}
        lead={selectedLeadForWhatsApp}
        onSend={handleSendWhatsApp}
      />
    </Container>
  )
}

export default AllLead
