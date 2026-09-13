import React, { useContext, useEffect, useState, useRef } from 'react'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import { Container, Card, Form, Button, Row, Col, Spinner, Badge, ListGroup } from 'react-bootstrap'
import ReactQuill from 'react-quill'
import { Country, State, City } from 'country-state-city'
import 'react-quill/dist/quill.snow.css'
import { IoAddCircle, IoClose } from 'react-icons/io5'
import { useNavigate } from 'react-router-dom'
import apiClient from '../../api/axiosClient'
import Select from 'react-select'
import toast from 'react-hot-toast'
import { AuthContext } from '../../AuthContext'
import { useDebounce } from 'use-debounce'
import '../sidebarCSS/comStyle.css'

const AddProject = ({ editData }) => {
  const { userData } = useContext(AuthContext)
  const isEdit = !!editData

  let initialData = {
    // Project fields
    ProjectName: '',
    ProjectType: '',
    ProjectDescription: '',
    ProjectStartDate: '',
    ProjectEndDate: '',
    ProjectPriority: 'Medium',
    ProjectStatus: 'Not assigned',
    AssignedProjectManagerId: '',
    AssignedProjectManagerName: '',
    AssignedDevelopers: [],
    TechnologyStack: '',
    EstimatedHours: '',
    ProjectCost: '',

    // Client fields
    ClientName: '',
    mobileNo: '',
    whatsappNo: '',
    email: '',
    gender: 'Male',
    country: 'India',
    state: '',
    city: '',
    address: '',
  }

  const [formData, setFormData] = useState(initialData)
  const [phaseDetails, setPhaseDetails] = useState([
    { PhaseName: '', PhaseDescription: '', PhaseDays: '', PhaseStatus: 'Not Started' },
  ])

  const [error, setError] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [projectManagers, setProjectManagers] = useState([])
  const [developers, setDevelopers] = useState([])

  // Client autocomplete states
  const [clientSearchResults, setClientSearchResults] = useState([])
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [isLoadingClients, setIsLoadingClients] = useState(false)
  const [selectedClientInfo, setSelectedClientInfo] = useState(null)
  const clientDropdownRef = useRef(null)

  const [debouncedClientSearch] = useDebounce(formData.ClientName, 400)

  const statusOptions = [
    { label: 'Not assigned', value: 'Not assigned', color: '#6c757d' },
    { label: 'Assigned', value: 'Assigned', color: '#0d6efd' },
    { label: 'Hold', value: 'Hold', color: '#ffc107' },
    { label: 'In Progress', value: 'In Progress', color: '#17a2b8' },
    { label: 'Testing', value: 'Testing', color: '#6610f2' },
    { label: 'Client Review', value: 'Client Review', color: '#fd7e14' },
    { label: 'Completed', value: 'Completed', color: '#28a745' },
  ]

  const priorityOptions = [
    { label: 'Low', value: 'Low', color: '#28a745' },
    { label: 'Medium', value: 'Medium', color: '#ffc107' },
    { label: 'High', value: 'High', color: '#dc3545' },
  ]

  const disableButton = isSubmitting

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target)) {
        setShowClientDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Search for existing clients
  useEffect(() => {
    const searchClients = async () => {
      if (!debouncedClientSearch || debouncedClientSearch.length < 2) {
        setClientSearchResults([])
        setShowClientDropdown(false)
        return
      }

      setIsLoadingClients(true)
      try {
        const response = await apiClient.get('/project/search-clients', {
          params: { search: debouncedClientSearch },
        })

        if (response.data.success && response.data.data.length > 0) {
          setClientSearchResults(response.data.data)
          setShowClientDropdown(true)
        } else {
          setClientSearchResults([])
          setShowClientDropdown(false)
        }
      } catch (error) {
        setClientSearchResults([])
        setShowClientDropdown(false)
      } finally {
        setIsLoadingClients(false)
      }
    }

    searchClients()
  }, [debouncedClientSearch])

  const validate = () => {
    const errs = {}

    // Project validations
    if (!formData.ProjectName) errs.ProjectName = 'Project Name is required'
    if (!formData.ClientName) errs.ClientName = 'Client Name is required'

    // Mobile validation
    const mobileDigits = formData.mobileNo.replace(/\D/g, '')
    if (!mobileDigits || mobileDigits.length < 7) {
      errs.mobileNo = 'Valid mobile number is required'
    }

    // Phase validations
    const phaseErrs = phaseDetails.map((phase) => {
      const phaseError = {}
      if (!phase.PhaseName) phaseError.PhaseName = 'Phase Name is required'
      if (!phase.PhaseDescription) phaseError.PhaseDescription = 'Phase Description is required'
      if (!phase.PhaseDays && phase.PhaseDays !== 0) phaseError.PhaseDays = 'Days is required'
      return phaseError
    })

    setError(errs)
    const hasPhaseErrors = phaseErrs.some((phaseError) => Object.keys(phaseError).length > 0)
    return Object.keys(errs).length === 0 && !hasPhaseErrors
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setIsSubmitting(true)

    try {
      let response
      const firstPhase = phaseDetails[0] || {}

      const payload = {
        ...formData,
        AssignedProjectManager: formData.AssignedProjectManagerName || '',
        PhaseDetails: phaseDetails,
        PhaseName: firstPhase.PhaseName || '',
        PhaseDescription: firstPhase.PhaseDescription || '',
        PhaseDays: firstPhase.PhaseDays || '',
        EstimatedHours: formData.EstimatedHours ? Number(formData.EstimatedHours) : undefined,
        ProjectCost: formData.ProjectCost ? Number(formData.ProjectCost) : undefined,
        mobileNo: formData.mobileNo,
        whatsappNo: formData.whatsappNo,
      }

      if (isEdit) {
        response = await apiClient.put(`/project/update-project`, payload)
      } else {
        response = await apiClient.post(`/project/create-project`, payload)
      }

      toast.success(response.data.message)

      if (!isEdit) {
        setFormData(initialData)
        setPhaseDetails([
          { PhaseName: '', PhaseDescription: '', PhaseDays: '', PhaseStatus: 'Not Started' },
        ])
        setSelectedClientInfo(null)
        setTimeout(() => {
          navigate('/all-project')
        }, 1500)
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Internal server error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const navigate = useNavigate()

  useEffect(() => {
    if (isEdit && editData) {
      setFormData((prev) => ({
        ...prev,
        ...editData,
        ProjectStartDate: editData.ProjectStartDate ? editData.ProjectStartDate.split('T')[0] : '',
        ProjectEndDate: editData.ProjectEndDate ? editData.ProjectEndDate.split('T')[0] : '',
      }))

      if (Array.isArray(editData.PhaseDetails) && editData.PhaseDetails.length > 0) {
        setPhaseDetails(
          editData.PhaseDetails.map((phase) => ({
            PhaseName: phase.PhaseName || '',
            PhaseDescription: phase.PhaseDescription || '',
            PhaseDays: phase.PhaseDays || '',
            PhaseStatus: phase.PhaseStatus || 'Not Started',
          })),
        )
      } else {
        setPhaseDetails([
          {
            PhaseName: editData.PhaseName || '',
            PhaseDescription: editData.PhaseDescription || '',
            PhaseDays: editData.PhaseDays || '',
            PhaseStatus: 'Not Started',
          },
        ])
      }
    }
    getDeveloperUsers()
  }, [isEdit, editData])

  const getDeveloperUsers = async (search = '') => {
    try {
      const roleRes = await apiClient.get('/user/get-role-list', {
        params: { search: 'Developer' },
      })
      const developerRole = roleRes.data.data.find((r) => r.roleName === 'Developer')
      if (!developerRole) {
        setProjectManagers([])
        setDevelopers([])
        return
      }

      const res = await apiClient.get('/user/get-user-list', {
        params: {
          roleId: developerRole._id,
          search,
          limit: 50,
        },
      })
      setProjectManagers(res.data.data)
      setDevelopers(res.data.data)
    } catch (error) {
      setProjectManagers([])
      setDevelopers([])
    }
  }

  // Handle client selection from dropdown
  const handleClientSelect = (client) => {
    setFormData({
      ...formData,
      ClientName: client.ClientName || '',
      mobileNo: client.mobileNo || '',
      whatsappNo: client.whatsappNo || '',
      email: client.email || '',
      gender: client.gender || 'Male',
      country: client.country || 'India',
      state: client.state || '',
      city: client.city || '',
      address: client.address || '',
    })
    setSelectedClientInfo({
      name: client.ClientName,
      projectCount: client.projectCount || 0,
    })
    setShowClientDropdown(false)
    setError({ ...error, ClientName: '', mobileNo: '' })
  }

  // Handle manual client name input
  const handleClientNameChange = (e) => {
    const value = e.target.value

    setFormData({ ...formData, ClientName: value })
    setError({ ...error, ClientName: '' })

    // Reset selected client info when user modifies the name
    if (selectedClientInfo && selectedClientInfo.name !== value) {
      setSelectedClientInfo(null)
    }
  }

  // Clear client selection badge
  const handleClearClientBadge = () => {
    setSelectedClientInfo(null)
  }

  return (
    <Container className="mt-4 container-lg p-0">
      <Col lg={12}>
        <Card>
          <Card.Header className="mainBGColor text-white fw-bold">
            {isEdit ? 'Update Project Data' : 'Add Project Data'}
          </Card.Header>
          <Card.Body>
            <Row>
              {/* ===PROJECT DETAILS=== */}
              <h5 className="col-12">Project Information</h5>

              {/* Project Name */}
              <Form.Group className="col-md-4 mb-2">
                <Form.Label>
                  Project Name <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="ProjectName"
                  value={formData.ProjectName}
                  onChange={(e) => {
                    setFormData({ ...formData, ProjectName: e.target.value })
                    setError({ ...error, ProjectName: '' })
                  }}
                  className="underline-input"
                  placeholder="Enter project name"
                />
                {error.ProjectName && <div className="text-danger small">{error.ProjectName}</div>}
              </Form.Group>

              {/* Project Type */}
              <Form.Group className="col-md-4 mb-2">
                <Form.Label>Project Type</Form.Label>
                <Select
                  options={[
                    { label: 'Web Development', value: 'Web Development' },
                    { label: 'Mobile App', value: 'Mobile App' },
                    { label: 'Desktop Application', value: 'Desktop Application' },
                    { label: 'E-commerce', value: 'E-commerce' },
                    { label: 'CMS', value: 'CMS' },
                    { label: 'Other', value: 'Other' },
                  ]}
                  value={
                    formData.ProjectType
                      ? { label: formData.ProjectType, value: formData.ProjectType }
                      : null
                  }
                  onChange={(selected) => setFormData({ ...formData, ProjectType: selected.value })}
                  className="underline-input select"
                  classNamePrefix="lead-select"
                  placeholder="Select project type"
                />
              </Form.Group>

              {/* Priority */}
              <Form.Group className="col-md-4 mb-2">
                <Form.Label>Priority</Form.Label>
                <Select
                  options={priorityOptions}
                  value={priorityOptions.find((p) => p.value === formData.ProjectPriority) || null}
                  onChange={(selected) =>
                    setFormData({ ...formData, ProjectPriority: selected.value })
                  }
                  className="underline-input select"
                  classNamePrefix="lead-select"
                  placeholder="Select Priority"
                  styles={{
                    singleValue: (base, { data }) => ({
                      ...base,
                      backgroundColor: data?.color,
                      color: data?.value === 'Medium' ? '#000' : '#fff',
                      padding: '2px 6px',
                      borderRadius: '2px',
                      fontWeight: 'bold',
                      fontSize: '12px',
                    }),
                    option: (base, { data, isFocused }) => ({
                      ...base,
                      backgroundColor: isFocused ? data.color : 'white',
                      color: isFocused ? (data.value === 'Medium' ? '#000' : '#fff') : 'black',
                      ':hover': {
                        backgroundColor: data.color,
                        color: data.value === 'Medium' ? '#000' : '#fff',
                      },
                    }),
                  }}
                />
              </Form.Group>

              {/* Status */}
              <Form.Group className="col-md-4 mb-2">
                <Form.Label>Status</Form.Label>
                <Select
                  options={statusOptions}
                  value={statusOptions.find((s) => s.value === formData.ProjectStatus) || null}
                  onChange={(selected) =>
                    setFormData({ ...formData, ProjectStatus: selected.value })
                  }
                  className="underline-input select"
                  classNamePrefix="lead-select"
                  placeholder="Select Status"
                  styles={{
                    singleValue: (base, { data }) => ({
                      ...base,
                      backgroundColor: data?.color,
                      color: data?.value === 'Hold' ? '#000' : '#fff',
                      padding: '2px 6px',
                      borderRadius: '2px',
                      fontWeight: 'bold',
                      fontSize: '12px',
                    }),
                    option: (base, { data, isFocused }) => ({
                      ...base,
                      backgroundColor: isFocused ? data.color : 'white',
                      color: isFocused ? (data.value === 'Hold' ? '#000' : '#fff') : 'black',
                      ':hover': {
                        backgroundColor: data.color,
                        color: data.value === 'Hold' ? '#000' : '#fff',
                      },
                    }),
                  }}
                />
              </Form.Group>

              {/* Start Date */}
              <Form.Group className="col-md-4 mb-2">
                <Form.Label>Start Date</Form.Label>
                <Form.Control
                  type="date"
                  name="ProjectStartDate"
                  value={formData.ProjectStartDate}
                  onChange={(e) => setFormData({ ...formData, ProjectStartDate: e.target.value })}
                  className="underline-input"
                />
              </Form.Group>

              {/* End Date */}
              <Form.Group className="col-md-4 mb-2">
                <Form.Label>End Date (Expected)</Form.Label>
                <Form.Control
                  type="date"
                  name="ProjectEndDate"
                  value={formData.ProjectEndDate}
                  onChange={(e) => setFormData({ ...formData, ProjectEndDate: e.target.value })}
                  className="underline-input"
                />
              </Form.Group>

              {/* Project Description */}
              <Form.Group className="col-12 mb-2">
                <Form.Label>Project Description</Form.Label>
                <ReactQuill
                  theme="snow"
                  value={formData.ProjectDescription}
                  onChange={(value) => setFormData({ ...formData, ProjectDescription: value })}
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
              </Form.Group>

              {/* ===PHASE DETAILS=== */}
              <hr className="my-3 w-100" />
              <h5 className="col-12">Phase Details</h5>

              {phaseDetails.map((phase, index) => (
                <React.Fragment key={index}>
                  <Form.Group className="col-md-4 mb-2">
                    <Form.Label>
                      Phase Name <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={phase.PhaseName}
                      onChange={(e) => {
                        const value = e.target.value
                          .split(' ')
                          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                          .join(' ')
                        setPhaseDetails((prev) =>
                          prev.map((p, i) => (i === index ? { ...p, PhaseName: value } : p)),
                        )
                      }}
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
                      value={phase.PhaseDescription}
                      onChange={(e) =>
                        setPhaseDetails((prev) =>
                          prev.map((p, i) =>
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
                        value={phase.PhaseDays}
                        onChange={(e) => {
                          const value = e.target.value
                          if (value === '' || Number(value) >= 0) {
                            setPhaseDetails((prev) =>
                              prev.map((p, i) => (i === index ? { ...p, PhaseDays: value } : p)),
                            )
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === '-' || e.key === 'e') {
                            e.preventDefault()
                          }
                        }}
                        className="underline-input"
                        placeholder="Enter days"
                      />
                      {phaseDetails.length > 1 && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() =>
                            setPhaseDetails((prev) => prev.filter((_, i) => i !== index))
                          }
                          title="Remove phase"
                          style={{ minWidth: 'auto' }}
                        >
                          x
                        </Button>
                      )}
                    </div>
                  </Form.Group>

                  {index === phaseDetails.length - 1 && (
                    <Form.Group className="col-md-1 mb-2 d-flex align-items-end">
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() =>
                          setPhaseDetails((prev) => [
                            ...prev,
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

              {/* ===CLIENT DETAILS=== */}
              <hr className="my-3 w-100" />
              <div className="col-12 d-flex justify-content-between align-items-center mb-2">
                <h5 className="mb-0">Client Details</h5>
              </div>

              {/* Client Name with Autocomplete */}
              <Form.Group className="col-md-3 mb-2" ref={clientDropdownRef}>
                <Form.Label>
                  Client Name <span className="text-danger">*</span>
                </Form.Label>
                <div style={{ position: 'relative' }}>
                  <Form.Control
                    type="text"
                    name="ClientName"
                    value={formData.ClientName}
                    onChange={handleClientNameChange}
                    onFocus={() => {
                      if (clientSearchResults.length > 0) {
                        setShowClientDropdown(true)
                      }
                    }}
                    className="underline-input"
                    placeholder="Enter client name"
                    autoComplete="off"
                  />

                  {/* Loading indicator */}
                  {isLoadingClients && (
                    <div
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                      }}
                    >
                      <Spinner animation="border" size="sm" />
                    </div>
                  )}

                  {/* Dropdown for existing clients */}
                  {showClientDropdown && clientSearchResults.length > 0 && (
                    <ListGroup
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 1000,
                        maxHeight: '200px',
                        overflowY: 'auto',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        marginTop: '2px',
                      }}
                    >
                      {clientSearchResults.map((client, index) => (
                        <ListGroup.Item
                          key={index}
                          action
                          onClick={() => handleClientSelect(client)}
                          style={{
                            cursor: 'pointer',
                            fontSize: '13px',
                            padding: '8px 12px',
                          }}
                        >
                          <div style={{ fontWeight: '600', color: '#212529' }}>
                            {client.ClientName}
                          </div>
                          <div style={{ fontSize: '11px', color: '#6c757d' }}>
                            {client.mobileNo} · {client.projectCount || 0} project
                            {client.projectCount !== 1 ? 's' : ''}
                          </div>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  )}
                </div>
                {error.ClientName && <div className="text-danger small">{error.ClientName}</div>}
                <small className="text-muted" style={{ fontSize: '10px' }}></small>
              </Form.Group>

              {/* Mobile */}
              <Form.Group className="col-md-3 mb-2">
                <Form.Label>
                  Mobile <span className="text-danger">*</span>
                </Form.Label>
                <PhoneInput
                  country={'in'}
                  value={formData.mobileNo}
                  onChange={(value, country) => {
                    if (!value) {
                      setFormData({ ...formData, mobileNo: '', whatsappNo: '' })
                      setError({ ...error, mobileNo: '' })
                      return
                    }

                    let digits = String(value).replace(/\D/g, '')
                    const dialCode = country?.dialCode || ''

                    const finalValue =
                      dialCode && digits.startsWith(dialCode)
                        ? `+${digits}`
                        : `+${dialCode}${digits}`

                    setFormData({ ...formData, mobileNo: finalValue, whatsappNo: finalValue })
                    setError({ ...error, mobileNo: '' })
                  }}
                  enableSearch={true}
                  placeholder="Enter mobile number"
                  inputClass="form-control underline-input"
                  containerClass="w-100"
                  inputProps={{
                    name: 'mobileNo',
                    required: true,
                  }}
                />
                {error.mobileNo && <div className="text-danger small">{error.mobileNo}</div>}
              </Form.Group>

              {/* WhatsApp No */}
              <Form.Group className="col-md-3 mb-2">
                <Form.Label>WhatsApp No</Form.Label>
                <PhoneInput
                  country={'in'}
                  value={formData.whatsappNo}
                  onChange={(value, country) => {
                    if (!value) {
                      setFormData({ ...formData, whatsappNo: '' })
                      return
                    }

                    let digits = String(value).replace(/\D/g, '')
                    const dialCode = country?.dialCode || ''

                    const finalValue =
                      dialCode && digits.startsWith(dialCode)
                        ? `+${digits}`
                        : `+${dialCode}${digits}`

                    setFormData({ ...formData, whatsappNo: finalValue })
                  }}
                  enableSearch={true}
                  placeholder="Enter whatsapp number"
                  inputClass="form-control underline-input"
                  containerClass="w-100"
                  inputProps={{
                    name: 'whatsappNo',
                  }}
                />
              </Form.Group>

              {/* Email */}
              <Form.Group className="col-md-3 mb-2">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={(e) => {
                    let value = e.target.value.replace(/\s+/g, '')
                    setFormData({ ...formData, email: value })
                    setError({ ...error, email: '' })
                  }}
                  className="underline-input"
                  placeholder="Enter email address"
                />
              </Form.Group>

              {/* Gender */}
              <Form.Group className="col-md-3 mb-2">
                <Form.Label>Gender</Form.Label>
                <Select
                  options={['Male', 'Female'].map((r) => ({ label: r, value: r }))}
                  value={
                    formData.gender ? { label: formData.gender, value: formData.gender } : null
                  }
                  onChange={(selected) =>
                    setFormData((prev) => ({ ...prev, gender: selected ? selected.value : '' }))
                  }
                  className="underline-input select"
                  classNamePrefix="lead-select"
                  placeholder="Select Gender"
                />
              </Form.Group>

              {/* Country */}
              <Form.Group className="col-md-3 mb-2">
                <Form.Label>Country</Form.Label>
                <Select
                  options={Country.getAllCountries().map((c) => ({
                    label: c.name,
                    value: c.isoCode,
                  }))}
                  value={
                    formData.country
                      ? {
                          label: formData.country,
                          value: Country.getAllCountries().find((c) => c.name === formData.country)
                            ?.isoCode,
                        }
                      : null
                  }
                  onChange={(val) =>
                    setFormData((prev) => ({ ...prev, country: val.label, state: '', city: '' }))
                  }
                  className="underline-input select"
                  classNamePrefix="lead-select"
                  placeholder="Select Country"
                />
              </Form.Group>

              {/* State */}
              <Form.Group className="col-md-3 mb-2">
                <Form.Label>State</Form.Label>
                <Select
                  options={State.getStatesOfCountry(
                    Country.getAllCountries().find((c) => c.name === formData.country)?.isoCode ||
                      '',
                  ).map((s) => ({ label: s.name, value: s.isoCode }))}
                  value={
                    formData.state
                      ? {
                          label: formData.state,
                          value: State.getStatesOfCountry(
                            Country.getAllCountries().find((c) => c.name === formData.country)
                              ?.isoCode || '',
                          ).find((s) => s.name === formData.state)?.isoCode,
                        }
                      : null
                  }
                  onChange={(val) =>
                    setFormData((prev) => ({ ...prev, state: val.label, city: '' }))
                  }
                  className="underline-input select"
                  classNamePrefix="lead-select"
                  placeholder="Select State"
                />
              </Form.Group>

              {/* City */}
              <Form.Group className="col-md-3 mb-2">
                <Form.Label>City</Form.Label>
                <Select
                  options={City.getCitiesOfState(
                    Country.getAllCountries().find((c) => c.name === formData.country)?.isoCode ||
                      '',
                    State.getStatesOfCountry(
                      Country.getAllCountries().find((c) => c.name === formData.country)?.isoCode ||
                        '',
                    ).find((s) => s.name === formData.state)?.isoCode || '',
                  ).map((city) => ({ label: city.name, value: city.name }))}
                  value={formData.city ? { label: formData.city, value: formData.city } : null}
                  onChange={(val) => setFormData((prev) => ({ ...prev, city: val.label }))}
                  className="underline-input select"
                  classNamePrefix="lead-select"
                  placeholder="Select City"
                />
              </Form.Group>

              {/* Address */}
              <Form.Group className="col-md-12 mb-2">
                <Form.Label>Address</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={1}
                  name="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="underline-input"
                  placeholder="Enter address"
                />
              </Form.Group>

              {/* ===TEAM & PLANNING=== */}
              <hr className="my-3 w-100" />
              <h5 className="col-12">Team & Planning</h5>

              {/* Project Manager */}
              <Form.Group className="col-md-3 mb-2">
                <Form.Label>Project Manager</Form.Label>
                <Select
                  options={projectManagers.map((user) => ({
                    label: user.fullName,
                    value: user._id,
                  }))}
                  value={
                    projectManagers
                      .map((user) => ({ label: user.fullName, value: user._id }))
                      .find((u) => u.value === formData.AssignedProjectManagerId) || null
                  }
                  onChange={(selected) =>
                    setFormData({
                      ...formData,
                      AssignedProjectManagerId: selected ? selected.value : '',
                      AssignedProjectManagerName: selected ? selected.label : '',
                    })
                  }
                  className="underline-input select"
                  classNamePrefix="lead-select"
                  placeholder="Select project manager"
                  isClearable
                  menuPlacement="auto"
                  menuShouldScrollIntoView={false}
                  styles={{ menu: (base) => ({ ...base, maxHeight: 220 }) }}
                />
              </Form.Group>

              {/* Developers */}
              <Form.Group className="col-md-3 mb-2">
                <Form.Label>Developers</Form.Label>
                <Select
                  options={developers.map((user) => ({
                    label: user.fullName,
                    value: user._id,
                  }))}
                  value={developers
                    .map((user) => ({ label: user.fullName, value: user._id }))
                    .filter((u) => formData.AssignedDevelopers.includes(u.value))}
                  onChange={(selected) =>
                    setFormData({
                      ...formData,
                      AssignedDevelopers: selected ? selected.map((s) => s.value) : [],
                    })
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
              </Form.Group>

              {/* Technology Stack */}
              <Form.Group className="col-md-3 mb-2">
                <Form.Label>Technology Stack</Form.Label>
                <Form.Control
                  type="text"
                  name="TechnologyStack"
                  value={formData.TechnologyStack}
                  onChange={(e) => setFormData({ ...formData, TechnologyStack: e.target.value })}
                  className="underline-input"
                  placeholder="e.g. React, Node.js, MongoDB"
                />
              </Form.Group>

              {/* Estimated Days */}
              <Form.Group className="col-md-3 mb-2">
                <Form.Label>Estimated Days</Form.Label>
                <Form.Control
                  type="number"
                  name="EstimatedHours"
                  value={formData.EstimatedHours}
                  onChange={(e) => {
                    let value = e.target.value
                    if (value >= 0) {
                      setFormData({ ...formData, EstimatedHours: value })
                    }
                  }}
                  className="underline-input"
                  placeholder="Enter Estimated Days"
                  min="0"
                />
              </Form.Group>

              {/* Project Budget */}
              <Form.Group className="col-md-3 mb-2">
                <Form.Label>Project Budget</Form.Label>
                <Form.Control
                  type="text"
                  name="ProjectCost"
                  value={formData.ProjectCost}
                  onChange={(e) => {
                    let value = e.target.value.replace(/[^\d.]/g, '')
                    if ((value.match(/\./g) || []).length > 1) {
                      value = value.substring(0, value.length - 1)
                    }
                    setFormData({ ...formData, ProjectCost: value })
                  }}
                  className="underline-input"
                  placeholder="Enter project budget"
                  inputMode="decimal"
                />
              </Form.Group>
            </Row>

            <Button
              className="button"
              onClick={handleSubmit}
              disabled={isSubmitting || disableButton}
            >
              {isSubmitting ? (
                <Spinner size="sm" animation="border" className="me-2" />
              ) : isEdit ? (
                'Update Project'
              ) : (
                'Add Project'
              )}
            </Button>
          </Card.Body>
        </Card>
      </Col>
    </Container>
  )
}

export default AddProject
