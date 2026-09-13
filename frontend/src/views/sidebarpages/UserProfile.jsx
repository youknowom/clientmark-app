import React, { useContext, useEffect, useState } from 'react'
import { Container, Card, Form, Button, Row, Col, Spinner } from 'react-bootstrap'

import { FaEye, FaEyeSlash } from 'react-icons/fa'
import apiClient from '../../api/axiosClient'
import Select from 'react-select'
import toast from 'react-hot-toast'
import { Helmet } from 'react-helmet'
import { AuthContext } from '../../AuthContext'
import '../sidebarCSS/comStyle.css'

const UserProfile = () => {
  const { userData } = useContext(AuthContext)

  let formField = {
    fullName: userData?.fullName || '',
    userName: userData?.userName || '',
    mobileNo: userData?.mobileNo || '',
    email: userData?.email || '',
    password: '',
    gender: userData?.gender || '',
    branchName: userData?.branchId?.branchName || '',
    roleName: userData?.roleId?.roleName || '',
    reportToName: userData?.reportToId?.fullName || '',
  }
  const [formData, setFormData] = useState(formField)
  const [error, setError] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const validate = () => {
    const errs = {}

    if (!formData.fullName) errs.fullName = 'Full Name is required'
    if (!formData.mobileNo) errs.mobileNo = 'Mobile is required'
    if (!formData.email) errs.email = 'Mobile number is required'

    setError(errs)
    return Object.keys(errs).length === 0
  }

  //save user data
  const handleSubmit = async () => {
    if (!validate()) return
    let payload = {
      fullName: formData.fullName,
      mobileNo: formData.mobileNo,
      email: formData.email,
      gender: formData.gender,
    }

    if (formData.password) {
      payload.password = formData.password
    }

    setIsSubmitting(true)

    try {
      let response = await apiClient.put('/user/update-self-profile', payload)

      toast.success(response.data.message)
    } catch (error) {
      toast.error(error?.data?.message || 'Internal server error. Try after sometime.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Container className="mt-4 container-lg p-0">
      <Helmet>
        <title>BH - User</title>
      </Helmet>
      <Col lg={12}>
        <Card>
          <Card.Header className="mainBGColor text-white fw-bold">Update Profile</Card.Header>
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
                  className="underline-input"
                  placeholder="Enter user name"
                  disabled
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
                <Form.Label>Password</Form.Label>
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
                <Form.Label>Role</Form.Label>
                <Form.Control
                  type="text"
                  name="roleName"
                  value={formData.roleName}
                  className="underline-input"
                  disabled
                />
              </Form.Group>

              <Form.Group className="col-md-3 mb-2">
                <Form.Label>Branch</Form.Label>
                <Form.Control
                  type="text"
                  name="branchName"
                  value={formData.branchName}
                  className="underline-input"
                  disabled
                />
              </Form.Group>

              {/* Only show Report To field for roles that report to someone */}
              {formData.roleName !== 'Admin' && (
                <Form.Group className="col-md-3 mb-2">
                  <Form.Label>Report To</Form.Label>

                  <Form.Control
                    type="text"
                    name="reportToName"
                    value={formData.reportToName}
                    className="underline-input"
                    disabled
                  />

                  {error.reportToId && <div className="text-danger small">{error.reportToId}</div>}
                </Form.Group>
              )}
            </Row>

            <Button className="button" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Spinner size="sm" animation="border" className="me-2" />
              ) : (
                'Update Profile'
              )}
            </Button>
          </Card.Body>
        </Card>
      </Col>
    </Container>
  )
}

export default UserProfile
