import React, { useState, useEffect, useContext } from 'react'
import { Container, Card, Form, Row, Col, Button, Table, Spinner } from 'react-bootstrap'
import { Helmet } from 'react-helmet'
import { AuthContext } from '../../AuthContext'
import { hasPermission } from '../../helpers/hasPermission'

import toast from 'react-hot-toast'

import apiClient from '../../api/axiosClient'

const ConfirmationModal = React.lazy(() => import('../../components/mycomponent/ConfirmationModal'))
import { AssignAdminToTelecaller, AssignTelecallerToBde, AssignBdeToAdmin } from './AssignmentModal'
import { formatDateTime } from '../../helpers/dateFormater'

import '../sidebarCSS/comStyle.css'
import '../sidebarCSS/table.css'

const AssignAndProgress = ({ leadId }) => {
  const { userData } = useContext(AuthContext)
  const [leadProgress, setLeadProgress] = useState([])

  const [formData, setFormData] = useState({
    leadNo: '',
    fullName: '',
    mobileNo: '',
    whatsappNo: '',
    email: '',
    businessName: '',
    serviceRequirement: '',
    remark: '',
    leadStage: '',
    callStatus: '',
    leadStatus: '',
  })
  const [error, setError] = useState({})

  //state for Admin to Telecaller assignment
  const [showAdminToTC, setShowAdminToTC] = useState(false)

  //state for  Telecaller To BDE assignment
  const [showTcToBde, setShowTcToBde] = useState(false)

  //state for  BDE To Admin assignment
  const [showBdeToAdmin, setShowBdeToAdmin] = useState(false)

  const [isLoading, setIsLoading] = useState('')
  const [confirmState, setConfirmState] = useState({
    show: false,
    message: '',
    onConfirm: () => {},
  })

  //get lead progress history
  const getLeadProgess = async () => {
    try {
      const response = await apiClient.get('/lead/get-lead-progess', {
        params: { leadId: leadId },
      })
      setLeadProgress(response.data.leadProgress)
      setFormData((prev) => ({
        ...prev,
        ...response.data.leadDetails,
      }))
    } catch (error) {
      setLeadProgress([])
    } finally {
      setIsLoading('')
    }
  }

  //open AssignAdminToTelecaller model
  const openAdminToTC = async () => {
    if (!validate()) return
    let result = await handleSubmit()
    if (result.status == false) {
      toast.error(result.message)
    }

    setShowAdminToTC(true)
  }

  //open AssignTelecallerToBde model
  const openTcToBde = async () => {
    if (!validate()) return
    let result = await handleSubmit()
    if (result.status == false) {
      toast.error(result.message)
    }

    setShowTcToBde(true)
  }

  //open AssignBdeToAdmin model
  const openBdeToAdmin = async () => {
    if (!validate()) return
    let result = await handleSubmit()
    if (result.status == false) {
      toast.error(result.message)
    }

    setShowBdeToAdmin(true)
  }

  const validate = () => {
    const errs = {}
    if (!formData.fullName) errs.fullName = 'Full Name is required'
    if (!formData.mobileNo) errs.mobileNo = 'Mobile is required'
    setError(errs)
    return Object.keys(errs).length === 0
  }

  //update data after assignment
  const handleSubmit = async () => {
    try {
      const payload = {
        ...formData,
        mobileNo: Number(formData.mobileNo),
        whatsappNo: Number(formData.whatsappNo),
      }

      let response = await apiClient.put(`/lead/update-lead`, payload)

      return { status: true, message: response?.data?.message }
    } catch (error) {
      return { status: false, message: error?.data?.message }
    }
  }

  useEffect(() => {
    getLeadProgess()
  }, [leadId])

  return (
    <Container className="mt-4 container-lg gap-2 d-md-flex p-0">
      <Helmet>
        <title>Progress — Clientmark</title>
      </Helmet>
      {/* left side section -- details and assignment */}
      <Col md={6}>
        <Card>
          <Card.Header className="mainBGColor text-white py-1 fw-bold">Lead Details</Card.Header>
          <Card.Body>
            <Row className="g-2">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    Lead No <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="leadNo"
                    value={formData.leadNo}
                    disabled
                    className="underline-input disable-input"
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
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
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>
                    Mobile No <span className="text-danger">*</span>
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
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>WhatsApp No</Form.Label>
                  <Form.Control
                    type="text"
                    name="whatsappNo"
                    value={formData.whatsappNo}
                    onChange={(e) => {
                      let value = e.target.value
                      value = value.replace(/\D/g, '')
                      if (value.length <= 10) {
                        setFormData({ ...formData, whatsappNo: value })
                        setError({ ...error, whatsappNo: '' })
                      }
                    }}
                    className="underline-input"
                    placeholder="Enter whatsapp"
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                  {error.whatsappNo && <div className="text-danger small">{error.whatsappNo}</div>}
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
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
                  {error.email && <div className="text-danger small">{error.email}</div>}
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Business Name</Form.Label>
                  <Form.Control
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={(e) => {
                      let value = e.target.value

                      // Capitalize first letter of each word
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
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Requirement</Form.Label>
                  <Form.Control
                    type="text"
                    name="serviceRequirement"
                    value={formData.serviceRequirement}
                    onChange={(e) => {
                      let value = e.target.value

                      // Capitalize first letter of each word
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
              </Col>

              <Col md={6}>
                <Form.Group>
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
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Lead Stage</Form.Label>
                  <Form.Control
                    type="text"
                    name="leadStage"
                    value={formData.leadStage}
                    disabled
                    className="underline-input disable-input"
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Call Status</Form.Label>
                  <Form.Control
                    type="text"
                    name="callStatus"
                    value={formData.callStatus}
                    disabled
                    className="underline-input disable-input"
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Lead Status</Form.Label>
                  <Form.Control
                    type="text"
                    name="leadStatus"
                    value={formData.leadStatus}
                    disabled
                    className="underline-input disable-input"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row className="g-2 mt-2">
              {hasPermission(userData, 'update:lead') && (
                <Col xs={12} md={4}>
                  <Button
                    variant="outline-primary"
                    className="w-100"
                    style={{
                      fontSize: '12px',
                      padding: '6px 2px',
                      fontWeight: 'bold',
                    }}
                    onClick={() => {
                      if (leadId === '') {
                        toast.error('Please select lead.')
                        return
                      }
                      openAdminToTC()
                    }}
                  >
                    Assign Telecaller
                  </Button>
                </Col>
              )}

              {hasPermission(userData, 'update:lead') && (
                <Col xs={12} md={4}>
                  <Button
                    variant="outline-success"
                    className="w-100"
                    style={{
                      fontSize: '12px',
                      padding: '6px 8px',
                      fontWeight: 'bold',
                    }}
                    onClick={() => {
                      if (leadId === '') {
                        toast.error('Please select lead.')
                        return
                      }
                      openTcToBde()
                    }}
                  >
                    Assign BDE
                  </Button>
                </Col>
              )}

              {hasPermission(userData, 'update:lead') && (
                <Col xs={12} md={4}>
                  <Button
                    variant="outline-info"
                    className="w-100"
                    style={{
                      fontSize: '12px',
                      padding: '6px 8px',
                      fontWeight: 'bold',
                    }}
                    onClick={() => {
                      if (leadId === '') {
                        toast.error('Please select lead.')
                        return
                      }
                      openBdeToAdmin()
                    }}
                  >
                    Assign Admin
                  </Button>
                </Col>
              )}
            </Row>
          </Card.Body>
        </Card>
      </Col>

      {/* right Side section -- progress hisotry */}
      <Col md={6} className="mt-2 mt-lg-0">
        <Card>
          <Card.Header className="mainBGColor text-white py-1 fw-bold">
            Progress History
          </Card.Header>
          <Card.Body>
            <Table bordered hover striped responsive className="user-table">
              <thead>
                <tr>
                  <th>Sr No</th>
                  <th>Assign By</th>
                  <th>Assign To</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>
                {isLoading === 'progress-loading' ? (
                  <tr>
                    <td colSpan="5" className="text-center">
                      <Spinner size="sm" animation="border" />
                    </td>
                  </tr>
                ) : leadProgress.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center">
                      --- No Progess Found ---
                    </td>
                  </tr>
                ) : (
                  leadProgress?.map((d, idx) => (
                    <tr key={d._id}>
                      <td>{idx + 1}</td>
                      <td>{d.assignById.fullName}</td>
                      <td>{d.assignToId.fullName}</td>
                      <td>{formatDateTime(d.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      </Col>

      <AssignAdminToTelecaller
        showAdminToTC={showAdminToTC}
        setShowAdminToTC={setShowAdminToTC}
        selectedLead={[{ _id: leadId }]}
        setConfirmState={setConfirmState}
      />

      <AssignTelecallerToBde
        showTcToBde={showTcToBde}
        setShowTcToBde={setShowTcToBde}
        selectedLead={[{ _id: leadId }]}
        setConfirmState={setConfirmState}
      />

      <AssignBdeToAdmin
        showBdeToAdmin={showBdeToAdmin}
        setShowBdeToAdmin={setShowBdeToAdmin}
        selectedLead={[{ _id: leadId }]}
        setConfirmState={setConfirmState}
      />
      <ConfirmationModal
        show={confirmState.show}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, show: false }))}
      />
    </Container>
  )
}

export default AssignAndProgress
