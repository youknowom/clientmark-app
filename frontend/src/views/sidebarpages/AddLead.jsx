// import React, { useContext, useEffect, useState } from 'react'
// import { Container, Card, Form, Button, Row, Col, Spinner } from 'react-bootstrap'
// import { Country, State, City } from 'country-state-city'
// import PhoneInput from 'react-phone-input-2'
// import 'react-phone-input-2/lib/style.css'
// import { formatDateTimeLocal } from '../../helpers/dateFormater'

// import apiClient from '../../api/axiosClient'
// import Select from 'react-select'
// import toast from 'react-hot-toast'
// import { AuthContext } from '../../AuthContext'

// import '../sidebarCSS/comStyle.css'

// const AddLead = ({ editData }) => {
//   const { userData } = useContext(AuthContext)
//   const isEdit = !!editData

//   let initialData = {
//     fullName: '',
//     mobileNo: '',
//     whatsappNo: '',
//     email: '',
//     gender: 'Male',
//     country: 'India',
//     state: '',
//     city: '',
//     address: '',
//     businessName: '',
//     serviceRequirement: '',
//     remark: '',
//   }
//   const [formData, setFormData] = useState(initialData)

//   const [error, setError] = useState({})
//   const [isSubmitting, setIsSubmitting] = useState(false)

//   const disableButton = isSubmitting

//   const validate = () => {
//     const errs = {}
//     if (!formData.fullName) errs.fullName = 'Full Name is required'
//     if (!formData.mobileNo) errs.mobileNo = 'Mobile is required'
//     setError(errs)
//     return Object.keys(errs).length === 0
//   }

//   const handleSubmit = async () => {
//     if (!validate()) return
//     setIsSubmitting(true)

//     try {
//       let response
//       const payload = {
//         ...formData,
//         mobileNo: Number(formData.mobileNo),
//         whatsappNo: Number(formData.whatsappNo),
//       }

//       if (isEdit) {
//         // UPDATE
//         response = await apiClient.put(`/lead/update-lead`, payload)
//       } else {
//         // CREATE
//         response = await apiClient.post(`/lead/create-lead`, payload)
//       }

//       toast.success(response.data.message)

//       if (!isEdit) {
//         setFormData(initialData)
//       }
//     } catch (error) {
//       toast.error(error?.response?.data?.message || 'Internal server error')
//     } finally {
//       setIsSubmitting(false)
//     }
//   }

//   useEffect(() => {
//     if (isEdit && editData) {
//       setFormData((prev) => ({
//         ...prev,
//         ...editData,
//         contactTime: formatDateTimeLocal(editData.contactTime || ''),
//       }))
//     }
//   }, [isEdit, editData])

//   return (
//     <Container className="mt-4 container-lg p-0">
//       <Col lg={12}>
//         <Card>
//           <Card.Header className="mainBGColor text-white fw-bold">
//             {isEdit ? 'Update Lead Data' : 'Add Lead Data'}
//           </Card.Header>
//           <Card.Body>
//             <Row>
//               {/* ===PERSONAL DETAILS===*/}
//               <h5 className="col-12">Customer Details</h5>
//               {/* Full Name */}
//               <Form.Group className="col-md-3 mb-2">
//                 <Form.Label>
//                   Full Name <span className="text-danger">*</span>
//                 </Form.Label>
//                 <Form.Control
//                   type="text"
//                   name="fullName"
//                   value={formData.fullName}
//                   onChange={(e) => {
//                     let value = e.target.value

//                     // Capitalize first letter of each word
//                     let capitalizedValue = value
//                       .split(' ')
//                       .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
//                       .join(' ')

//                     setFormData({ ...formData, fullName: capitalizedValue })
//                     setError({ ...error, fullName: '' })
//                   }}
//                   className="underline-input"
//                   placeholder="Enter full name"
//                 />
//                 {error.fullName && <div className="text-danger small">{error.fullName}</div>}
//               </Form.Group>

//               {/* Mobile
//               <Form.Group className="col-md-3 mb-2">
//                 <Form.Label>
//                   Mobile <span className="text-danger">*</span>
//                 </Form.Label>
//                 <Form.Control
//                   type="text"
//                   name="mobileNo"
//                   value={formData.mobileNo}
//                   onChange={(e) => {
//                     let value = e.target.value
//                     value = value.replace(/\D/g, '')
//                     if (value.length <= 10) {
//                       setFormData({ ...formData, mobileNo: value })
//                       setError({ ...error, mobileNo: '' })
//                     }
//                   }}
//                   className="underline-input"
//                   placeholder="Enter mobile"
//                   inputMode="numeric"
//                   pattern="[0-9]*"
//                 />
//                 {error.mobileNo && <div className="text-danger small">{error.mobileNo}</div>}
//               </Form.Group> */}
//               {/* Mobile */}
//               <Form.Group className="col-md-3 mb-2">
//                 <Form.Label>
//                   Mobile <span className="text-danger">*</span>
//                 </Form.Label>
//                 <PhoneInput
//                   country={'in'}
//                   value={formData.mobileNo}
//                   onChange={(value, country) => {
//                     if (!value) {
//                       setFormData({ ...formData, mobileNo: '' })
//                       setError({ ...error, mobileNo: '' })
//                       return
//                     }

//                     let digits = String(value).replace(/\D/g, '')
//                     const dialCode = country?.dialCode || ''

//                     if (dialCode && !digits.startsWith(dialCode) && digits.startsWith('0')) {
//                       digits = digits.replace(/^0+/, '')
//                     }

//                     const finalValue =
//                       dialCode && digits.startsWith(dialCode)
//                         ? `+${digits}`
//                         : `+${dialCode}${digits}`

//                     setFormData({ ...formData, mobileNo: finalValue })
//                     setError({ ...error, mobileNo: '' })
//                   }}
//                   enableSearch={true}
//                   placeholder="Enter mobile number"
//                   inputClass="form-control underline-input"
//                   containerClass="w-100"
//                   inputProps={{
//                     name: 'mobileNo',
//                     required: true,
//                   }}
//                 />
//                 {error.mobileNo && <div className="text-danger small">{error.mobileNo}</div>}
//               </Form.Group>

//               {/* WhatsApp No */}
//               <Form.Group className="col-md-3 mb-2">
//                 <Form.Label>
//                   WhatsApp No <span className="text-danger">*</span>
//                 </Form.Label>

//                 <Form.Control
//                   type="text"
//                   name="whatsappNo"
//                   value={formData.whatsappNo}
//                   onChange={(e) => {
//                     let value = e.target.value
//                     value = value.replace(/\D/g, '')
//                     if (value.length <= 10) {
//                       setFormData({ ...formData, whatsappNo: value })
//                       setError({ ...error, whatsappNo: '' })
//                     }
//                   }}
//                   className="underline-input"
//                   placeholder="Enter whatsapp"
//                   inputMode="numeric"
//                   pattern="[0-9]*"
//                 />
//               </Form.Group>

//               {/* Email */}
//               <Form.Group className="col-md-3 mb-2">
//                 <Form.Label>Email</Form.Label>
//                 <Form.Control
//                   type="email"
//                   name="email"
//                   value={formData.email}
//                   onChange={(e) => {
//                     let value = e.target.value.replace(/\s+/g, '')
//                     setFormData({ ...formData, email: value })
//                     setError({ ...error, email: '' })
//                   }}
//                   className="underline-input"
//                   placeholder="Enter email address"
//                 />
//               </Form.Group>

//               {/* Gender */}
//               <Form.Group className="col-md-3 mb-2">
//                 <Form.Label>Gender</Form.Label>
//                 <Select
//                   options={['Male', 'Female'].map((r) => ({
//                     label: r,
//                     value: r,
//                   }))}
//                   value={
//                     formData.gender ? { label: formData.gender, value: formData.gender } : null
//                   }
//                   onChange={(selected) =>
//                     setFormData((prev) => ({ ...prev, gender: selected ? selected.value : '' }))
//                   }
//                   className="underline-input select"
//                   classNamePrefix="lead-select"
//                   placeholder="Select Gender"
//                 />
//               </Form.Group>

//               {/* Country */}
//               <Form.Group className="col-md-3 mb-2">
//                 <Form.Label>Country</Form.Label>
//                 <Select
//                   options={Country.getAllCountries().map((c) => ({
//                     label: c.name,
//                     value: c.isoCode,
//                   }))}
//                   value={
//                     formData.country
//                       ? {
//                           label: formData.country,
//                           value: Country.getAllCountries().find((c) => c.name === formData.country)
//                             ?.isoCode,
//                         }
//                       : null
//                   }
//                   onChange={(val) =>
//                     setFormData((prev) => ({
//                       ...prev,
//                       country: val.label, // store name only
//                       state: '',
//                       city: '',
//                     }))
//                   }
//                   className="underline-input select"
//                   classNamePrefix="lead-select"
//                   placeholder="Select Country"
//                 />
//               </Form.Group>

//               {/* State */}
//               <Form.Group className="col-md-3 mb-2">
//                 <Form.Label>State</Form.Label>
//                 <Select
//                   options={
//                     // convert country name to code before calling
//                     State.getStatesOfCountry(
//                       Country.getAllCountries().find((c) => c.name === formData.country)?.isoCode ||
//                         '',
//                     ).map((s) => ({
//                       label: s.name,
//                       value: s.isoCode,
//                     }))
//                   }
//                   value={
//                     formData.state
//                       ? {
//                           label: formData.state,
//                           value: State.getStatesOfCountry(
//                             Country.getAllCountries().find((c) => c.name === formData.country)
//                               ?.isoCode || '',
//                           ).find((s) => s.name === formData.state)?.isoCode,
//                         }
//                       : null
//                   }
//                   onChange={(val) =>
//                     setFormData((prev) => ({
//                       ...prev,
//                       state: val.label, // store state name
//                       city: '',
//                     }))
//                   }
//                   className="underline-input select"
//                   classNamePrefix="lead-select"
//                   placeholder="Select State"
//                 />
//               </Form.Group>

//               {/* City */}
//               <Form.Group className="col-md-3 mb-2">
//                 <Form.Label>City</Form.Label>
//                 <Select
//                   options={City.getCitiesOfState(
//                     Country.getAllCountries().find((c) => c.name === formData.country)?.isoCode ||
//                       '',
//                     State.getStatesOfCountry(
//                       Country.getAllCountries().find((c) => c.name === formData.country)?.isoCode ||
//                         '',
//                     ).find((s) => s.name === formData.state)?.isoCode || '',
//                   ).map((city) => ({
//                     label: city.name,
//                     value: city.name,
//                   }))}
//                   value={formData.city ? { label: formData.city, value: formData.city } : null}
//                   onChange={
//                     (val) => setFormData((prev) => ({ ...prev, city: val.label })) // store city name
//                   }
//                   className="underline-input select"
//                   classNamePrefix="lead-select"
//                   placeholder="Select City"
//                 />
//               </Form.Group>

//               {/* Address */}
//               <Form.Group className="col-md-6 mb-2">
//                 <Form.Label>Address</Form.Label>
//                 <Form.Control
//                   as="textarea"
//                   rows={1}
//                   name="address"
//                   value={formData.address}
//                   onChange={(e) => setFormData({ ...formData, address: e.target.value })}
//                   className="underline-input"
//                   placeholder="Enter address"
//                 />
//               </Form.Group>
//               {/* ===Business DETAILS=== */}
//               <hr className="my-3 w-100" />
//               <h5 className="col-12">Business Details</h5>
//               <Form.Group className="col-md-3 mb-2">
//                 <Form.Label>Business Name</Form.Label>
//                 <Form.Control
//                   type="text"
//                   name="businessName"
//                   value={formData.businessName}
//                   onChange={(e) => {
//                     let value = e.target.value

//                     // Capitalize first letter of each word
//                     let capitalizedValue = value
//                       .split(' ')
//                       .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
//                       .join(' ')

//                     setFormData({ ...formData, businessName: capitalizedValue })
//                     setError({ ...error, businessName: '' })
//                   }}
//                   className="underline-input"
//                   placeholder="Enter business name"
//                 />
//               </Form.Group>

//               <Form.Group className="col-md-3 mb-2">
//                 <Form.Label>Service Requirement</Form.Label>
//                 <Form.Control
//                   type="text"
//                   name="serviceRequirement"
//                   value={formData.serviceRequirement}
//                   onChange={(e) => {
//                     let value = e.target.value

//                     // Capitalize first letter of each word
//                     let capitalizedValue = value
//                       .split(' ')
//                       .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
//                       .join(' ')

//                     setFormData({ ...formData, serviceRequirement: capitalizedValue })
//                   }}
//                   className="underline-input"
//                   placeholder="Enter Service Requirement"
//                 />
//               </Form.Group>
//               <Form.Group className="col-md-6 mb-2">
//                 <Form.Label>Remark</Form.Label>
//                 <Form.Control
//                   as="textarea"
//                   rows={1}
//                   name="remark"
//                   value={formData.remark}
//                   onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
//                   className="underline-input"
//                   placeholder="Enter any additional remarks"
//                 />
//               </Form.Group>
//             </Row>

//             <Button
//               className="button"
//               onClick={handleSubmit}
//               disabled={isSubmitting || disableButton}
//             >
//               {isSubmitting ? (
//                 <Spinner size="sm" animation="border" className="me-2" />
//               ) : isEdit ? (
//                 'Update Data'
//               ) : (
//                 'Add Data'
//               )}
//             </Button>
//           </Card.Body>
//         </Card>
//       </Col>
//     </Container>
//   )
// }

// export default AddLead

import React, { useContext, useEffect, useState } from 'react'
import { Container, Card, Form, Button, Row, Col, Spinner } from 'react-bootstrap'
import { Country, State, City } from 'country-state-city'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import { formatDateTimeLocal } from '../../helpers/dateFormater'

import apiClient from '../../api/axiosClient'
import Select from 'react-select'
import toast from 'react-hot-toast'
import { AuthContext } from '../../AuthContext'

import '../sidebarCSS/comStyle.css'

const AddLead = ({ editData }) => {
  const { userData } = useContext(AuthContext)
  const isEdit = !!editData

  let initialData = {
    fullName: '',
    mobileNo: '',
    whatsappNo: '',
    email: '',
    gender: 'Male',
    country: 'India',
    state: '',
    city: '',
    address: '',
    businessName: '',
    serviceRequirement: '',
    remark: '',
  }
  const [formData, setFormData] = useState(initialData)

  const [error, setError] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const disableButton = isSubmitting

  const validate = () => {
    const errs = {}
    if (!formData.fullName) errs.fullName = 'Full Name is required'

    const mobileDigits = formData.mobileNo.replace(/\D/g, '')
    if (!mobileDigits || mobileDigits.length < 7) {
      errs.mobileNo = 'Valid mobile number is required'
    }

    setError(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setIsSubmitting(true)

    try {
      let response
      const payload = {
        ...formData,
        mobileNo: formData.mobileNo, // send as string directly
        whatsappNo: formData.whatsappNo, // send as string directly
      }

      if (isEdit) {
        response = await apiClient.put(`/lead/update-lead`, payload)
      } else {
        response = await apiClient.post(`/lead/create-lead`, payload)
      }

      toast.success(response.data.message)

      if (!isEdit) {
        setFormData(initialData)
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Internal server error')
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (isEdit && editData) {
      setFormData((prev) => ({
        ...prev,
        ...editData,
        contactTime: formatDateTimeLocal(editData.contactTime || ''),
      }))
    }
  }, [isEdit, editData])

  return (
    <Container className="mt-4 container-lg p-0">
      <Col lg={12}>
        <Card>
          <Card.Header className="mainBGColor text-white fw-bold">
            {isEdit ? 'Update Lead Data' : 'Add Lead Data'}
          </Card.Header>
          <Card.Body>
            <Row>
              {/* ===PERSONAL DETAILS=== */}
              <h5 className="col-12">Customer Details</h5>

              {/* Full Name */}
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

                    // Auto-fill whatsapp with same number
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
              <Form.Group className="col-md-6 mb-2">
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

              {/* ===BUSINESS DETAILS=== */}
              <hr className="my-3 w-100" />
              <h5 className="col-12">Business Details</h5>

              <Form.Group className="col-md-3 mb-2">
                <Form.Label>Business Name</Form.Label>
                <Form.Control
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={(e) => {
                    let value = e.target.value
                    let capitalizedValue = value
                      .split(' ')
                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                      .join(' ')
                    setFormData({ ...formData, businessName: capitalizedValue })
                    setError({ ...error, businessName: '' })
                  }}
                  className="underline-input"
                  placeholder="Enter business name"
                />
              </Form.Group>

              <Form.Group className="col-md-3 mb-2">
                <Form.Label>Service Requirement</Form.Label>
                <Form.Control
                  type="text"
                  name="serviceRequirement"
                  value={formData.serviceRequirement}
                  onChange={(e) => {
                    let value = e.target.value
                    let capitalizedValue = value
                      .split(' ')
                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                      .join(' ')
                    setFormData({ ...formData, serviceRequirement: capitalizedValue })
                  }}
                  className="underline-input"
                  placeholder="Enter Service Requirement"
                />
              </Form.Group>

              <Form.Group className="col-md-6 mb-2">
                <Form.Label>Remark</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={1}
                  name="remark"
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  className="underline-input"
                  placeholder="Enter any additional remarks"
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
                'Update Data'
              ) : (
                'Add Data'
              )}
            </Button>
          </Card.Body>
        </Card>
      </Col>
    </Container>
  )
}

export default AddLead
