import React, { useContext, useEffect, useState } from 'react'
import { Container, Card, Form, Button, Row, Col, Spinner } from 'react-bootstrap'
import { useLocation, useNavigate } from 'react-router-dom'

import { FaEye, FaEyeSlash } from 'react-icons/fa'
import apiClient from '../../api/axiosClient'
import Select from 'react-select'
import toast from 'react-hot-toast'
import { Helmet } from 'react-helmet'
import { AuthContext } from '../../AuthContext'
import '../sidebarCSS/comStyle.css'

const AddUserForm = () => {
  const { userData } = useContext(AuthContext)
  const navigate = useNavigate()
  const location = useLocation()
  const editData = location.state?.user || null
  const isEdit = !!editData

  let formField = {
    fullName: '',
    userName: '',
    mobileNo: '',
    email: '',
    password: '',
    gender: 'Male',
    branchName: '',
    branchId: '',
    roleName: '',
    roleId: '',
    status: 'Active',
    reportToName: '',
    reportToId: '',
  }
  const [formData, setFormData] = useState(formField)
  const [branches, setBranches] = useState([])
  const [roles, setRoles] = useState([])
  const [reportUsers, setReportUsers] = useState([])
  const [error, setError] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const validate = () => {
    const errs = {}

    if (!formData.fullName) errs.fullName = 'Full Name is required'
    if (!formData.userName) errs.userName = 'Username is required'
    if (!formData.mobileNo) errs.mobileNo = 'Mobile is required'
    if (!formData.email) errs.email = 'Mobile number is required'
    if (!isEdit && !formData.password) errs.password = 'Password is required'
    if (!formData.branchName) errs.branchName = 'Please select Branch'
    if (!formData.roleName) errs.roleName = 'Please select role'

    // Only Admin doesn't need to report to anyone
    if (formData.roleName !== 'Admin' && !formData.reportToId) {
      errs.reportToId = 'Please select report person'
    }

    setError(errs)
    return Object.keys(errs).length === 0
  }

  //save user data
  const handleSubmit = async () => {
    if (!validate()) return

    setIsSubmitting(true)

    try {
      const payload = isEdit ? { ...formData, userId: editData._id } : formData

      let response = null
      if (isEdit) {
        response = await apiClient.put('/user/update-user', payload)
      } else {
        response = await apiClient.post('/user/create-user', payload)
      }

      toast.success(response.data.message)
      setTimeout(() => {
        navigate('/all-user')
      }, 1000)
    } catch (error) {
      toast.error(error?.data?.message || 'Internal server error. Try after sometime.')
    } finally {
      setIsSubmitting(false)
    }
  }

  //get branches
  const getBranches = async (search) => {
    try {
      const response = await apiClient.get('/branch/get-branches', {
        params: { search: search },
      })

      setBranches(response.data.data)
    } catch (error) {
      setBranches([])
    }
  }

  //fetch role
  const getRole = async (search) => {
    try {
      const response = await apiClient.get('/user/get-role-list', { params: { search: search } })
      setRoles(response.data.data)
    } catch (error) {
      setRoles([])
    }
  }

  //fetch report to users
  const getReportUsers = async (search) => {
    try {
      let roleId = ''
      let branchId = ''

      if (formData.roleName === 'Admin') {
        // Admin doesn't report to anyone, so clear the report users
        setReportUsers([])
        return
      } else if (formData.roleName === 'TeleCaller') {
        // TeleCaller reports to Sales Executive
        roleId = roles.find((item) => item.roleName === 'BDE')?._id || ''
        branchId = formData.branchId
      } else if (formData.roleName === 'BDE') {
        // Sales Executive reports to Admin
        roleId = roles.find((item) => item.roleName === 'Admin')?._id || ''
        branchId = ''
      } else {
        // All other roles (Developer, etc.) report to Admin
        roleId = roles.find((item) => item.roleName === 'Admin')?._id || ''
        branchId = ''
      }

      const response = await apiClient.get('/user/get-user-list', {
        params: {
          search: search,
          limit: 50,
          branchId: branchId,
          roleId: roleId,
          wantParent: 'Yes',
        },
      })
      setReportUsers(response.data.data)
    } catch (error) {
      setReportUsers([])
    }
  }

  useEffect(() => {
    if (isEdit) {
      setFormData({
        fullName: editData.fullName,
        userName: editData.userName,
        mobileNo: editData.mobileNo,
        email: editData.email,
        gender: editData.gender,
        branchName: editData?.branchId?.branchName,
        branchId: editData?.branchId?._id,
        roleName: editData?.roleId?.roleName,
        roleId: editData?.roleId?._id,
        status: editData.status,
        reportToName: editData?.reportToId?.fullName,
        reportToId: editData?.reportToId?._id,
      })
    }
  }, [editData])

  useEffect(() => {
    if (formData.roleName) {
      getReportUsers()
    }
  }, [formData.branchId, formData.roleName])

  useEffect(() => {
    getBranches()
    getRole()
  }, [])

  return (
    <Container className="mt-4 container-lg p-0">
      <Helmet>
        <title>BH - User</title>
      </Helmet>
      <Col lg={12}>
        <Card>
          <Card.Header className="mainBGColor text-white fw-bold">
            {isEdit ? 'Update User' : 'Add User'}
          </Card.Header>
          <Card.Body>
            <Row>
              <Form.Group className="col-md-3 mb-2">
                <Form.Label>
                  Full Name <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={(e) => {
                    let value = e.target.value

                    // Capitalize first letter of each word
                    let capitalizedValue = value
                      .split(' ')
                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                      .join(' ')

                    setFormData({ ...formData, fullName: capitalizedValue })
                    setError({ ...error, fullName: '' })
                  }}
                  className="underline-input"
                  placeholder="Enter full name"
                />

                {error.fullName && <div className="text-danger small">{error.fullName}</div>}
              </Form.Group>

              <Form.Group className="col-md-3 mb-2">
                <Form.Label>
                  User Name <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="userName"
                  value={formData.userName}
                  onChange={(e) => {
                    let value = e.target.value
                    value = value.replace(/\s+/g, '')
                    setFormData({ ...formData, userName: value })
                    setError({ ...error, userName: '' })
                  }}
                  className="underline-input"
                  placeholder="Enter user name"
                />
                {error.userName && <div className="text-danger small">{error.userName}</div>}
              </Form.Group>

              <Form.Group className="col-md-3 mb-2">
                <Form.Label>
                  Mobile <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="mobileNo"
                  value={formData.mobileNo}
                  onChange={(e) => {
                    let value = e.target.value
                    value = value.replace(/\D/g, '')
                    if (value.length <= 10) {
                      setFormData({ ...formData, mobileNo: value })
                      setError({ ...error, mobileNo: '' })
                    }
                  }}
                  className="underline-input"
                  placeholder="Enter mobile"
                  inputMode="numeric"
                  pattern="[0-9]*"
                />

                {error.mobileNo && <div className="text-danger small">{error.mobileNo}</div>}
              </Form.Group>

              <Form.Group className="col-md-3 mb-2">
                <Form.Label>
                  Email <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={(e) => {
                    let value = e.target.value
                    value = value.replace(/\s+/g, '')
                    setFormData({ ...formData, email: value })
                    setError({ ...error, email: '' })
                  }}
                  className="underline-input"
                  placeholder="Enter email address"
                />
                {error.email && <div className="text-danger small">{error.email}</div>}
              </Form.Group>

              <Form.Group className="col-md-3 mb-2">
                <Form.Label>
                  Password <span className="text-danger">*</span>
                </Form.Label>
                <div className="position-relative">
                  <Form.Control
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={(e) => {
                      let value = e.target.value
                      value = value.replace(/\s+/g, '')
                      setFormData({ ...formData, password: value })
                      setError({ ...error, password: '' })
                    }}
                    className="underline-input pe-5"
                    autoComplete="new-password"
                    placeholder="Enter password"
                  />
                  <span
                    onClick={() => setShowPassword((prev) => !prev)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      cursor: 'pointer',
                      color: '#555',
                    }}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </span>
                </div>
                {error.password && <div className="text-danger small">{error.password}</div>}
              </Form.Group>

              <Form.Group className="col-md-3 mb-2">
                <Form.Label>Gender</Form.Label>

                <Select
                  options={['Male', 'Female'].map((r) => ({
                    label: r,
                    value: r,
                  }))}
                  value={
                    formData.gender
                      ? {
                        label: formData.gender,
                        value: formData.gender,
                      }
                      : null
                  }
                  onChange={(selected) =>
                    setFormData((prev) => ({
                      ...prev,
                      gender: selected ? selected.value : '',
                    }))
                  }
                  className="underline-input select"
                  classNamePrefix="lead-select"
                  placeholder="Select Gender"
                />
              </Form.Group>

              <Form.Group className="col-md-3 mb-2">
                <Form.Label>
                  Role <span className="text-danger">*</span>
                </Form.Label>
                <Select
                  options={roles
                    ?.filter((r) => r.roleName !== 'Admin')
                    .map((r) => ({
                      label: r.roleName,
                      value: r._id,
                      roleName: r.roleName,
                    }))}
                  value={
                    formData.roleId
                      ? {
                        label: formData.roleName,
                        value: formData.roleId,
                      }
                      : null
                  }
                  onInputChange={(inputValue) => {
                    getRole(inputValue)
                  }}
                  onChange={(selected) => {
                    setFormData((prev) => ({
                      ...prev,
                      roleName: selected ? selected.roleName : '',
                      roleId: selected ? selected.value : '',
                      branchName: '',
                      branchId: '',
                      reportToName: '',
                      reportToId: '',
                    }))
                    setError({ ...error, roleName: '' })
                  }}
                  className="underline-input select"
                  classNamePrefix="lead-select"
                  placeholder="Role..."
                  isClearable
                  isSearchable
                />
                {error.roleName && <div className="text-danger small">{error.roleName}</div>}
              </Form.Group>

              <Form.Group className="col-md-3 mb-2">
                <Form.Label>
                  Branch<span className="text-danger">*</span>
                </Form.Label>
                <Select
                  options={branches?.map((r) => ({
                    label: r.branchName,
                    value: r._id,
                    branchName: r.branchName,
                  }))}
                  value={
                    formData.branchId
                      ? {
                        label: formData.branchName,
                        value: formData.branchId,
                      }
                      : null
                  }
                  onInputChange={(inputValue) => {
                    getBranches(inputValue)
                  }}
                  onChange={(selected) => {
                    setFormData((prev) => ({
                      ...prev,
                      branchName: selected ? selected.branchName : '',
                      branchId: selected ? selected.value : '',
                      // CLEAR report person when branch changes
                      reportToName: '', // NEW
                      reportToId: '', // NEW
                    }))
                    setError({ ...error, branchName: '' })
                  }}
                  className="underline-input select"
                  classNamePrefix="lead-select"
                  placeholder="Branch..."
                  isClearable
                  isSearchable
                  isDisabled={!formData.roleName}
                />
                {error.branchName && <div className="text-danger small">{error.branchName}</div>}
              </Form.Group>

              {/* Only show Report To field for roles that report to someone */}
              {formData.roleName !== 'Admin' && (
                <Form.Group className="col-md-3 mb-2">
                  <Form.Label>Report To</Form.Label>

                  <Select
                    options={reportUsers?.map((u) => ({
                      label: u.fullName,
                      value: u._id,
                      fullName: u.fullName,
                    }))}
                    value={
                      formData.reportToId
                        ? {
                          label: formData.reportToName,
                          value: formData.reportToId,
                        }
                        : null
                    }
                    onInputChange={(inputValue) => {
                      getReportUsers(inputValue)
                    }}
                    onChange={(selected) => {
                      setFormData((prev) => ({
                        ...prev,
                        reportToName: selected ? selected.fullName : '',
                        reportToId: selected ? selected.value : '',
                      }))
                      setError({ ...error, reportToId: '' })
                    }}
                    className="underline-input select"
                    classNamePrefix="lead-select"
                    placeholder="Report to..."
                    isClearable
                    isSearchable
                    isDisabled={!formData.branchName} // disable until role selected
                  />

                  {error.reportToId && <div className="text-danger small">{error.reportToId}</div>}
                </Form.Group>
              )}

              <Form.Group className="col-md-3 mb-2">
                <Form.Label>Status</Form.Label>

                <Select
                  options={['Active', 'Inactive'].map((r) => ({
                    label: r,
                    value: r,
                  }))}
                  value={
                    formData.status
                      ? {
                        label: formData.status,
                        value: formData.status,
                      }
                      : null
                  }
                  onChange={(selected) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: selected ? selected.value : '',
                    }))
                  }
                  className="underline-input select"
                  classNamePrefix="lead-select"
                  placeholder="Select status"
                />
              </Form.Group>
            </Row>

            <Button className="button" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Spinner size="sm" animation="border" className="me-2" />
              ) : isEdit ? (
                'Update User'
              ) : (
                'Add User'
              )}
            </Button>
          </Card.Body>
        </Card>
      </Col>
    </Container>
  )
}

export default AddUserForm
