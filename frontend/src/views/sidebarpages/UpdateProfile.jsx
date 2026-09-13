import React, { useContext, useEffect, useState } from 'react'
import { Helmet } from 'react-helmet'
import { Container, Card, Form, Button, Row, Col, Spinner } from 'react-bootstrap'
import { useLocation, useNavigate } from 'react-router-dom'
import 'react-phone-input-2/lib/style.css'
import PhoneInput from 'react-phone-input-2'

import { FaEye, FaEyeSlash } from 'react-icons/fa'
import apiClient from '../../api/axiosClient'
import Select from 'react-select'
import toast from 'react-hot-toast'

import { AuthContext } from '../../AuthContext'

import '../sidebarCSS/comStyle.css'

const UpdateUserProfileForm = () => {
  const { userData, setUserData } = useContext(AuthContext)

  const navigate = useNavigate()
  const location = useLocation()
  const editData = location.state?.user || null
  const isEdit = !!editData

  const [formData, setFormData] = useState({
    userUuid: '',
    fullName: '',
    userName: '',
    mobileNo: '',
    email: '',
    password: '',
    location: '',
    gender: 'Male',
    departmentName: '',
    role: '',
    parentUuid: '',
    parentName: '',
  })

  const [error, setError] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const validate = () => {
    const errs = {}
    if (!formData.fullName) errs.fullName = 'Full Name is required'
    if (!formData.userName) errs.userName = 'Username is required'
    if (!formData.mobileNo) errs.mobileNo = 'Mobile is required'
    if (!formData.email) errs.email = 'Mobile number is required'

    setError(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return

    setIsSubmitting(true)

    try {
      let response = await apiClient.put('/user/update-user', formData)

      toast.success(response.data.message)

      setUserData({ ...userData, formData })
    } catch (error) {
      toast.error(error?.data?.message || 'Internal server error. Try after sometime.')
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (userData) {
      setFormData({
        userUuid: userData.userUuid,
        fullName: userData.fullName,
        userName: userData.userName,
        mobileNo: userData.mobileNo,
        email: userData.email,
        location: userData.location,
        gender: userData.gender,
        departmentName: userData.department,
        role: userData.role,
        parentUuid: userData.parentUuid,
        parentName: userData.parentName,
      })
    }
  }, [userData])

  return (
    <Container className="mt-4 container-lg p-0">
      <Helmet>
        <title>BH - Profile</title>
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
                  User Name (Unique Id) <span className="text-danger">*</span>
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
                  className="underline-input disable-input"
                  placeholder="Enter user name "
                  disabled
                />
                {error.userName && <div className="text-danger small">{error.userName}</div>}
              </Form.Group>

              <Form.Group className="col-md-3 mb-2">
                <Form.Label>
                  Mobile <span className="text-danger">*</span>
                </Form.Label>

                <PhoneInput
                  country={'in'} // default selected country
                  value={formData.mobileNo}
                  onChange={(value, country) => {
                    // If cleared
                    if (!value) {
                      setFormData({ ...formData, mobileNo: '' })
                      setError({ ...error, mobileNo: '' })
                      return
                    }

                    // keep only digits
                    let digits = String(value).replace(/\D/g, '')
                    const dialCode = country?.dialCode || ''

                    if (dialCode && !digits.startsWith(dialCode) && digits.startsWith('0')) {
                      digits = digits.replace(/^0+/, '')
                    }

                    // Build final E.164 value without duplicating dial code
                    let finalValue
                    if (dialCode && digits.startsWith(dialCode)) {
                      finalValue = `+${digits}`
                    } else if (dialCode) {
                      finalValue = `+${dialCode}${digits}`
                    } else {
                      finalValue = `+${digits}`
                    }

                    setFormData({ ...formData, mobileNo: finalValue })
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
                <Form.Label>Location (Ex: Pune, Dubai)</Form.Label>
                <Form.Control
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={(e) => {
                    let value = e.target.value

                    // Capitalize first letter of each word
                    let capitalizedValue = value
                      .split(' ')
                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                      .join(' ')

                    setFormData({ ...formData, location: capitalizedValue })
                  }}
                  className="underline-input"
                  placeholder="Enter full name"
                />
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
                  Department <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="departmentName"
                  value={formData.departmentName}
                  onChange={(e) => {
                    let value = e.target.value

                    // Capitalize first letter of each word
                    let capitalizedValue = value
                      .split(' ')
                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                      .join(' ')

                    setFormData({ ...formData, departmentName: capitalizedValue })
                    setError({ ...error, departmentName: '' })
                  }}
                  className="underline-input disable-input"
                  placeholder="Department"
                  disabled
                />
              </Form.Group>

              <Form.Group className="col-md-3 mb-2">
                <Form.Label>
                  Role <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="role"
                  value={formData.role}
                  onChange={(e) => {
                    let value = e.target.value

                    // Capitalize first letter of each word
                    let capitalizedValue = value
                      .split(' ')
                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                      .join(' ')

                    setFormData({ ...formData, role: capitalizedValue })
                    setError({ ...error, role: '' })
                  }}
                  className="underline-input disable-input"
                  placeholder="Role"
                  disabled
                />
              </Form.Group>

              <Form.Group className="col-md-3 mb-2">
                <Form.Label>
                  Report To <span className="text-danger">*</span>
                </Form.Label>
                <Form.Control
                  type="text"
                  name="parentName"
                  value={formData.parentName}
                  onChange={(e) => {
                    let value = e.target.value

                    // Capitalize first letter of each word
                    let capitalizedValue = value
                      .split(' ')
                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                      .join(' ')

                    setFormData({ ...formData, parentName: capitalizedValue })
                    setError({ ...error, parentName: '' })
                  }}
                  className="underline-input disable-input"
                  placeholder="Report to"
                  disabled
                />
              </Form.Group>
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

export default UpdateUserProfileForm
