import React, { useState, useEffect } from 'react'
import { Container, Card, Form, Row, Col, Button, Spinner } from 'react-bootstrap'
import { Helmet } from 'react-helmet'
import toast from 'react-hot-toast'
import apiClient from '../../api/axiosClient'
import '../sidebarCSS/comStyle.css'
import '../sidebarCSS/table.css'

const WhatsappSetting = () => {
  const [waCred, setWaCred] = useState({
    instanceId: '',
    token: '',
    _id: '',
  })

  const [error, setError] = useState({})
  const [isLoading, setIsLoading] = useState(false)

  // Fetch existing credentials
  const getWaCred = async () => {
    try {
      const res = await apiClient.get('/project/get-whatsapp-cred')
      if (res.data.success && res.data.data) {
        setWaCred(res.data.data)
      }
    } catch {
      toast.error('Failed to load WhatsApp credentials')
    }
  }

  useEffect(() => {
    getWaCred()
  }, [])

  // Update credentials
  const updateWaCred = async () => {
    const err = {}
    if (!waCred.instanceId.trim()) err.instanceId = 'Instance ID is required'
    if (!waCred.token.trim()) err.token = 'Token is required'

    setError(err)
    if (Object.keys(err).length > 0) return

    try {
      setIsLoading(true)
      const res = await apiClient.put('/project/update-whatsapp-cred', waCred)

      if (res.data.success) {
        toast.success('WhatsApp credentials updated successfully')
        getWaCred()
      } else {
        toast.error(res.data.message || 'Update failed')
      }
    } catch {
      toast.error('Update failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Container className="mt-4 container-lg gap-2 d-md-flex p-0">
      <Helmet>
        <title>WhatsApp Settings — Clientmark</title>
      </Helmet>

      <Col xs={12} sm={12} md={12} lg={12} xl={8}>
        <Card>
          <Card.Header className="mainBGColor text-white py-1 fw-bold">
            WhatsApp Settings
          </Card.Header>

          <Card.Body>
            <Row className="g-3">
              <Col md={7}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    WhatsApp Instance ID <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={waCred.instanceId}
                    onChange={(e) => {
                      setWaCred({ ...waCred, instanceId: e.target.value })
                      setError({ ...error, instanceId: '' })
                    }}
                    className="underline-input"
                    placeholder="Enter Instance ID"
                  />
                  {error.instanceId && (
                    <div className="text-danger small">{error.instanceId}</div>
                  )}
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>
                    WhatsApp Token <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={waCred.token}
                    onChange={(e) => {
                      setWaCred({ ...waCred, token: e.target.value })
                      setError({ ...error, token: '' })
                    }}
                    className="underline-input"
                    placeholder="Enter WhatsApp Token"
                  />
                  {error.token && (
                    <div className="text-danger small">{error.token}</div>
                  )}
                </Form.Group>

                {/* UPDATE BUTTON */}
                <Button className="button" onClick={updateWaCred} disabled={isLoading}>
                  {isLoading ? <Spinner size="sm" animation="border" /> : 'Update Credentials'}
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Col>
    </Container>
  )
}

export default WhatsappSetting
