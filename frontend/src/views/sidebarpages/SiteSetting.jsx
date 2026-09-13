import React, { useState, useEffect, useContext } from 'react'
import { Container, Card, Form, Row, Col, Button, Spinner } from 'react-bootstrap'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import { Helmet } from 'react-helmet'
import { hasPermission } from '../../helpers/hasPermission'
import { AuthContext } from '../../AuthContext'

import toast from 'react-hot-toast'

import apiClient, { BASE_URL } from '../../api/axiosClient'

const ConfirmationModal = React.lazy(() => import('../../components/mycomponent/ConfirmationModal'))

import '../sidebarCSS/comStyle.css'
import '../sidebarCSS/table.css'

const SiteSetting = () => {
  const { userData } = useContext(AuthContext)
  const [siteSetting, setSiteSetting] = useState({
    mainLogo: '',
    logoWidth: 150,
    logoHeight: 50,
    favicon: '',
    projectName: '',
    host: '',
    email: '',
    password: '',
    phone: '',
    companyWhatsapp: '',
  })

  const [existingLogo, setExistingLogo] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [existingFavicon, setExistingFavicon] = useState(null)
  const [faviconPreview, setFaviconPreview] = useState(null)

  // Track country meta for proper phone validation
  const [phoneCountryMeta, setPhoneCountryMeta] = useState(null)
  const [waCountryMeta, setWaCountryMeta] = useState(null)

  const [error, setError] = useState({})
  const [isLoading, setIsLoading] = useState('')

  const [confirmState, setConfirmState] = useState({
    show: false,
    message: '',
    onConfirm: () => {},
  })

  //get site setting
  const getSiteSetting = async () => {
    try {
      const response = await apiClient.get('/software-setting/get-site-setting')
      const respData = response?.data?.data

      setSiteSetting({
        logoWidth: respData?.logoWidth || 150,
        logoHeight: respData?.logoHeight || 50,
        projectName: respData?.projectName || '',
        email: respData?.email || '',
        host: respData?.host || '',
        phone: respData?.phone || '',
        companyWhatsapp: respData?.companyWhatsapp || '',
      })
      if (respData?.mainLogo) {
        setExistingLogo(`${BASE_URL}${respData.mainLogo}`)
      }
      if (respData?.favicon) {
        setExistingFavicon(`${BASE_URL}${respData.favicon}`)
      }
    } catch (error) {
    } finally {
      setIsLoading('')
    }
  }

  //save data in backend
  const saveSiteSetting = async () => {
    const err = {}
    if (!siteSetting.projectName || siteSetting.projectName.trim() === '') {
      err.projectName = 'Project name is required.'
    }

    if (!siteSetting.host || siteSetting.host.trim() === '') {
      err.host = 'SMTP Host is required.'
    }

    if (!siteSetting.logoHeight) {
      err.logoHeight = 'Logo height is required.'
    }

    if (!siteSetting.logoWidth) {
      err.logoWidth = 'Logo widht color is required.'
    }

    if (!siteSetting.email || siteSetting.email.trim() === '') {
      err.email = 'Email is required.'
    }

    // Phone validation — exact digit count per country (optional fields)
    const validatePhone = (value, countryMeta, label) => {
      if (!value) return null
      const actualDigits = value.replace(/\D/g, '').length
      const expectedDigits = countryMeta?.format?.replace(/[^.]/g, '').length || 0
      if (expectedDigits > 0 && actualDigits !== expectedDigits) {
        return `Enter a valid ${countryMeta?.name || label} number`
      }
      if (actualDigits < 7 || actualDigits > 15) return `Enter a valid ${label}`
      return null
    }
    const phoneErr = validatePhone(siteSetting.phone, phoneCountryMeta, 'phone number')
    if (phoneErr) err.phone = phoneErr
    const waErr = validatePhone(siteSetting.companyWhatsapp, waCountryMeta, 'WhatsApp number')
    if (waErr) err.companyWhatsapp = waErr

    setError(err)
    if (Object.keys(err).length > 0) {
      toast.error('Please fill in all required fields and correct the validation errors.')
      return
    }

    let payload = new FormData()
    payload.append('logoHeight', siteSetting.logoHeight)
    payload.append('logoWidth', siteSetting.logoWidth)
    payload.append('projectName', siteSetting.projectName)
    payload.append('mainLogo', siteSetting.mainLogo)
    if (siteSetting.favicon) payload.append('favicon', siteSetting.favicon)
    payload.append('email', siteSetting.email)
    payload.append('host', siteSetting.host)
    if (siteSetting.phone) payload.append('phone', siteSetting.phone)
    if (siteSetting.companyWhatsapp) payload.append('companyWhatsapp', siteSetting.companyWhatsapp)
    if (siteSetting.password) {
      payload.append('password', siteSetting.password)
    }

    setConfirmState({
      show: true,
      message: `Do you want to save setting?`,
      onConfirm: async () => {
        setIsLoading('submit')
        try {
          let response = await apiClient.post('/software-setting/update-site-setting', payload, {
            isFileUpload: true,
          })

          toast.success(response.data.message)

          getSiteSetting()
        } catch (error) {
          toast.error(error?.data?.message || 'Internal server error. Try after sometime.')
        } finally {
          setIsLoading('')
          setConfirmState({ show: false, message: '', onConfirm: null })
        }
      },
    })
  }

  useEffect(() => {
    getSiteSetting()
  }, [])

  return (
    <Container className="mt-4 containe No.er-lg gap-2 d-md-flex p-0">
      <Helmet>
        <title>{siteSetting?.projectName} - Site</title>
      </Helmet>
      {/* left side section */}
      <Col xs={12} sm={12} md={12} lg={12} xl={12}>
        <Card>
          <Card.Header className="mainBGColor text-white py-1 fw-bold">Site Setting</Card.Header>
          <Card.Body>
            <Row className="g-4">
              {/* LEFT SIDE — FORM */}
              <Col lg={8}>
                <Card className="shadow-sm border-0">
                  <Card.Body>
                    <h5 className="fw-semibold mb-4">General Settings</h5>

                    <Form.Group className="mb-3">
                      <Form.Label>
                        Company Name <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        value={siteSetting.projectName}
                        onChange={(e) => {
                          setSiteSetting({ ...siteSetting, projectName: e.target.value })
                          setError({ ...error, projectName: '' })
                        }}
                        className="underline-input"
                        placeholder="Enter project name"
                      />
                      {error.projectName && (
                        <div className="text-danger small">{error.projectName}</div>
                      )}
                    </Form.Group>

                    <Row>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>
                            SMTP Host <span className="text-danger">*</span>
                          </Form.Label>
                          <Form.Control
                            type="text"
                            value={siteSetting.host}
                            onChange={(e) => {
                              setSiteSetting({ ...siteSetting, host: e.target.value.trim() })
                              setError({ ...error, host: '' })
                            }}
                            className="underline-input"
                            placeholder="Enter host"
                          />
                          {error.host && <div className="text-danger small">{error.host}</div>}
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>
                            SMTP User <span className="text-danger">*</span>
                          </Form.Label>
                          <Form.Control
                            type="text"
                            value={siteSetting.email}
                            onChange={(e) => {
                              setSiteSetting({ ...siteSetting, email: e.target.value.trim() })
                              setError({ ...error, email: '' })
                            }}
                            className="underline-input"
                            placeholder="Enter email"
                          />
                          {error.email && <div className="text-danger small">{error.email}</div>}
                        </Form.Group>
                      </Col>

                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>SMTP Password</Form.Label>
                          <Form.Control
                            type="text"
                            value={siteSetting.password}
                            onChange={(e) => {
                              setSiteSetting({
                                ...siteSetting,
                                password: e.target.value.trim(),
                              })
                              setError({ ...error, password: '' })
                            }}
                            className="underline-input"
                            placeholder="Enter password"
                          />
                          {error.password && (
                            <div className="text-danger small">{error.password}</div>
                          )}
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row className="mt-3">
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Primary Phone</Form.Label>
                          <PhoneInput
                            country={'in'}
                            value={siteSetting.phone}
                            onChange={(value, country) => {
                              setPhoneCountryMeta(country || null)
                              if (!value) {
                                setSiteSetting({ ...siteSetting, phone: '' })
                                setError({ ...error, phone: '' })
                                return
                              }
                              const digits = String(value).replace(/\D/g, '')
                              const dialCode = country?.dialCode || ''
                              const finalValue =
                                dialCode && digits.startsWith(dialCode)
                                  ? `+${digits}`
                                  : `+${dialCode}${digits}`
                              setSiteSetting({ ...siteSetting, phone: finalValue })
                              setError({ ...error, phone: '' })
                            }}
                            enableSearch={true}
                            placeholder="Enter Phone Number"
                            inputClass="form-control underline-input"
                            containerClass="w-100"
                          />
                          {error.phone && <div className="text-danger small">{error.phone}</div>}
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>WhatsApp Support</Form.Label>
                          <PhoneInput
                            country={'in'}
                            value={siteSetting.companyWhatsapp}
                            onChange={(value, country) => {
                              setWaCountryMeta(country || null)
                              if (!value) {
                                setSiteSetting({ ...siteSetting, companyWhatsapp: '' })
                                setError({ ...error, companyWhatsapp: '' })
                                return
                              }
                              const digits = String(value).replace(/\D/g, '')
                              const dialCode = country?.dialCode || ''
                              const finalValue =
                                dialCode && digits.startsWith(dialCode)
                                  ? `+${digits}`
                                  : `+${dialCode}${digits}`
                              setSiteSetting({ ...siteSetting, companyWhatsapp: finalValue })
                              setError({ ...error, companyWhatsapp: '' })
                            }}
                            enableSearch={true}
                            placeholder="Enter WhatsApp number"
                            inputClass="form-control underline-input"
                            containerClass="w-100"
                          />
                          {error.companyWhatsapp && (
                            <div className="text-danger small">{error.companyWhatsapp}</div>
                          )}
                        </Form.Group>
                      </Col>
                    </Row>

                    <hr className="my-4" />

                    <h5 className="fw-semibold mb-3">Logo Settings</h5>

                    <Form.Group className="mb-3">
                      <Form.Label>Main Logo</Form.Label>
                      <Form.Control
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0]
                          if (file) {
                            setSiteSetting({ ...siteSetting, mainLogo: file })
                            setLogoPreview(URL.createObjectURL(file))
                            setError({ ...error, mainLogo: '' })
                          }
                        }}
                        className="underline-input"
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>
                        Favicon{' '}
                        <span className="text-muted small">
                          (shown in browser tab, 32×32 or 64×64 recommended)
                        </span>
                      </Form.Label>
                      <Form.Control
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0]
                          if (file) {
                            setSiteSetting({ ...siteSetting, favicon: file })
                            setFaviconPreview(URL.createObjectURL(file))
                          }
                        }}
                        className="underline-input"
                      />
                    </Form.Group>

                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>
                            Logo Width: <strong>{siteSetting.logoWidth || 150}px</strong>
                          </Form.Label>
                          <Form.Range
                            min={50}
                            max={400}
                            value={siteSetting.logoWidth || 150}
                            onChange={(e) =>
                              setSiteSetting({
                                ...siteSetting,
                                logoWidth: e.target.value,
                              })
                            }
                          />
                        </Form.Group>
                      </Col>

                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>
                            Logo Height: <strong>{siteSetting.logoHeight || 50}px</strong>
                          </Form.Label>
                          <Form.Range
                            min={30}
                            max={200}
                            value={siteSetting.logoHeight || 50}
                            onChange={(e) =>
                              setSiteSetting({
                                ...siteSetting,
                                logoHeight: e.target.value,
                              })
                            }
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    {hasPermission(userData, 'update:site-setting') && (
                      <div className="text-start mt-4">
                        <Button
                          className="button px-4"
                          onClick={saveSiteSetting}
                          disabled={isLoading === 'submit'}
                        >
                          {isLoading === 'submit' ? (
                            <Spinner size="sm" animation="border" />
                          ) : (
                            'Save Settings'
                          )}
                        </Button>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>

              {/* RIGHT SIDE — LOGO PREVIEW */}
              <Col lg={4}>
                <Card className="shadow-sm border-0 text-center">
                  <Card.Body>
                    <h6 className="mb-4 fw-semibold">Logo Preview</h6>

                    {logoPreview || existingLogo ? (
                      <div className="p-3 bg-light rounded">
                        <img
                          src={logoPreview || existingLogo}
                          alt="Logo Preview"
                          style={{
                            width: `${siteSetting.logoWidth || 150}px`,
                            height: `${siteSetting.logoHeight || 50}px`,
                            objectFit: 'contain',
                          }}
                        />
                      </div>
                    ) : (
                      <div className="text-muted small">Upload logo to preview</div>
                    )}

                    <hr className="my-3" />

                    <h6 className="mb-3 fw-semibold">Favicon Preview</h6>
                    {faviconPreview || existingFavicon ? (
                      <div
                        className="p-3 bg-light rounded d-flex align-items-center justify-content-center"
                        style={{ gap: '12px' }}
                      >
                        <div className="text-center">
                          <img
                            src={faviconPreview || existingFavicon}
                            alt="Favicon Preview"
                            style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                          />
                          <div
                            className="text-muted"
                            style={{ fontSize: '10px', marginTop: '4px' }}
                          >
                            32×32
                          </div>
                        </div>
                        <div className="text-center">
                          <img
                            src={faviconPreview || existingFavicon}
                            alt="Favicon Preview"
                            style={{ width: '64px', height: '64px', objectFit: 'contain' }}
                          />
                          <div
                            className="text-muted"
                            style={{ fontSize: '10px', marginTop: '4px' }}
                          >
                            64×64
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted small">Upload favicon to preview</div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Col>

      <ConfirmationModal
        show={confirmState.show}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, show: false }))}
      />
    </Container>
  )
}

export default SiteSetting
