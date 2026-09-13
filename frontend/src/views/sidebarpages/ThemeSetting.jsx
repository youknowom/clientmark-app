import React, { useState, useEffect, useContext } from 'react'
import { Container, Card, Form, Row, Col, Button,  Spinner } from 'react-bootstrap'
import { Helmet } from 'react-helmet'
import { hasPermission } from '../../helpers/hasPermission'
import { AuthContext } from '../../AuthContext'

import toast from 'react-hot-toast'

import apiClient from '../../api/axiosClient'

import '../sidebarCSS/comStyle.css'
import '../sidebarCSS/table.css'

const ThemeSetting = () => {
  const { userData } = useContext(AuthContext)
  const [mainThemeFormData, setMainThemeFormData] = useState({
    primaryColor: '',
    secondaryColor: '',
    backgroundColor: '',
    textColor: '',
  })

  const [error, setError] = useState({})
  const [isLoading, setIsLoading] = useState('')

  //get theme
  const getTheme = async () => {
    try {
      setIsLoading('branch-loading')
      const response = await apiClient.get('/software-setting/get-main-theme')
      const mainTheme = response?.data?.data?.mainTheme

      setMainThemeFormData({
        primaryColor: mainTheme?.primaryColor,
        secondaryColor: mainTheme?.secondaryColor,
        backgroundColor: mainTheme?.backgroundColor,
        textColor: mainTheme?.textColor,
      })
    } catch (error) {
    } finally {
      setIsLoading('')
    }
  }

  //save data in backend
  const saveMainTheme = async () => {
    const err = {}
    if (mainThemeFormData.primaryColor.trim() === '') {
      err.primaryColor = 'Primary color is required.'
    }

     if (mainThemeFormData.secondaryColor.trim() === '') {
      err.secondaryColor = 'Secondary color is required.'
    }

     if (mainThemeFormData.backgroundColor.trim() === '') {
      err.backgroundColor = 'Background color is required.'
    }

     if (mainThemeFormData.textColor.trim() === '') {
      err.textColor = 'Text color is required.'
    }
    

    setError(err)
    if (Object.keys(err).length > 0) return

    

    setIsLoading('submit')
    try {
      let response = await apiClient.put('/software-setting/update-main-theme', mainThemeFormData)

      toast.success(response?.data?.message || 'Theme saved successfully.')
      resetForm()
      getTheme()
    } catch (error) {
      toast.error(error?.data?.message || 'Internal server error. Try after sometime.')
    } finally {
      setIsLoading('')
    }
  }

  const resetForm = () => {
    setMainThemeFormData({
      primaryColor: '',
      secondaryColor: '',
      backgroundColor: '',
      textColor: '',
    })
  }

  useEffect(() => {
    getTheme()
  }, [])

  return (
    <Container className="mt-4 container-lg gap-2 d-md-flex p-0">
      <Helmet>
        <title>Theme Settings — Clientmark</title>
      </Helmet>
      {/* left side section */}
      <Col xs={12} sm={12} md={12} lg={12} xl={8}>
        <Card>
          <Card.Header className="mainBGColor text-white py-1 fw-bold">Theme Setting</Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Primary Color <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="color"
                    value={mainThemeFormData.primaryColor}
                    onChange={(e) => {
                      setMainThemeFormData({ ...mainThemeFormData, primaryColor: e.target.value })
                      setError({ ...error, primaryColor: '' })
                    }}
                    className="underline-input"
                    placeholder="Enter primary color"
                  />
                  {error.primaryColor && <div className="text-danger small">{error.primaryColor}</div>}
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Secondary Color <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="color"
                    value={mainThemeFormData.secondaryColor}
                    onChange={(e) => {
                      setMainThemeFormData({ ...mainThemeFormData, secondaryColor: e.target.value.trim() })
                      setError({ ...error, secondaryColor: '' })
                    }}
                    className="underline-input"
                    placeholder="Enter secondary color"
                  />
                  {error.secondaryColor && <div className="text-danger small">{error.secondaryColor}</div>}
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Background Color <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="color"
                    value={mainThemeFormData.backgroundColor}
                    onChange={(e) => {
                      setMainThemeFormData({ ...mainThemeFormData, backgroundColor: e.target.value.trim() })
                      setError({ ...error, backgroundColor: '' })
                    }}
                    className="underline-input"
                    placeholder="Enter background color"
                  />
                  {error.branchCode && <div className="text-danger small">{error.branchCode}</div>}
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Text Color <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="color"
                    value={mainThemeFormData.textColor}
                    onChange={(e) => {
                      setMainThemeFormData({ ...mainThemeFormData, textColor: e.target.value.trim() })
                      setError({ ...error, textColor: '' })
                    }}
                    className="underline-input"
                    placeholder="Enter text color"
                  />
                  {error.textColor && <div className="text-danger small">{error.textColor}</div>}
                </Form.Group>
              </Col>

              <Col md={12}>
                {hasPermission(userData, 'update:theme-setting') && (
                  <Button
                    className="button"
                    onClick={saveMainTheme}
                    disabled={isLoading === 'submit'}
                  >
                    {isLoading === 'submit' ? (
                      <Spinner size="sm" animation="border" />
                    ) : (
                      'Save Theme'
                    )}
                  </Button>
                )}

                
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Col>
    </Container>
  )
}

export default ThemeSetting
