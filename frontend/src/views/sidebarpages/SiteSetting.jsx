import React, { useState, useEffect, useContext } from 'react'
import { Container, Card, Form, Row, Col, Button, Spinner } from 'react-bootstrap'
import PhoneInput from 'react-phone-input-2'
import 'react-phone-input-2/lib/style.css'
import { Helmet } from 'react-helmet'
import { hasPermission } from '../../helpers/hasPermission'
import { AuthContext } from '../../AuthContext'

import toast from 'react-hot-toast'

import apiClient, { BASE_URL } from '../../api/axiosClient'
import { syncFaviconFromSettings } from '../../helpers/dynamicFavicon'

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
      try {
        localStorage.setItem('cm_site_setting', JSON.stringify(respData))
      } catch (e) {}
      syncFaviconFromSettings(respData)
    } catch (error) {
    } finally {
      setIsLoading('')
    }
  }

  // Handle Logo file selection with format and size validation
  const handleLogoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const validExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.svg']
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    const isValidType = file.type.startsWith('image/') || validExtensions.includes(ext)

    if (!isValidType) {
      toast.error('Invalid logo format. Please upload a PNG, JPG, JPEG, WebP, or SVG file.')
      e.target.value = ''
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Logo file size exceeds 10MB limit. Please choose a smaller image.')
      e.target.value = ''
      return
    }

    setSiteSetting((prev) => ({ ...prev, mainLogo: file }))
    setLogoPreview(URL.createObjectURL(file))
    setError((prev) => ({ ...prev, mainLogo: '' }))
    toast.success(`Logo "${file.name}" selected. Click "Save Settings" to apply.`)
  }

  // Handle Favicon file selection with format and size validation
  const handleFaviconChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const validExtensions = ['.png', '.ico', '.svg', '.jpg', '.jpeg', '.webp']
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
    const isValidType =
      file.type.startsWith('image/') ||
      file.type.includes('icon') ||
      validExtensions.includes(ext)

    if (!isValidType) {
      toast.error('Invalid favicon format. Please upload a PNG, ICO, SVG, or JPG file.')
      e.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Favicon file size exceeds 5MB limit. Please choose a smaller image.')
      e.target.value = ''
      return
    }

    setSiteSetting((prev) => ({ ...prev, favicon: file }))
    setFaviconPreview(URL.createObjectURL(file))
    setError((prev) => ({ ...prev, favicon: '' }))
    toast.success(`Favicon "${file.name}" selected. Click "Save Settings" to apply.`)
  }

  //save data in backend
  const saveSiteSetting = async () => {
    const err = {}

    // Only Company Name is required
    if (!siteSetting.projectName || siteSetting.projectName.trim() === '') {
      err.projectName = 'Company / Project name is required.'
    }

    // Optional email validation
    if (siteSetting.email && siteSetting.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(siteSetting.email.trim())) {
        err.email = 'Please enter a valid email address.'
      }
    }

    // Phone validation — only if user entered real phone digits (ignoring standalone country code)
    const validatePhone = (value, countryMeta, label) => {
      if (!value) return null
      const digits = value.replace(/\D/g, '')
      const dialCodeDigits = countryMeta?.dialCode ? countryMeta.dialCode.replace(/\D/g, '') : ''
      if (digits.length === 0 || digits === dialCodeDigits) {
        return null
      }
      if (digits.length < 7 || digits > 15) {
        return `Please enter a valid ${label} (7-15 digits)`
      }
      return null
    }

    const phoneErr = validatePhone(siteSetting.phone, phoneCountryMeta, 'phone number')
    if (phoneErr) err.phone = phoneErr

    const waErr = validatePhone(siteSetting.companyWhatsapp, waCountryMeta, 'WhatsApp number')
    if (waErr) err.companyWhatsapp = waErr

    setError(err)

    if (Object.keys(err).length > 0) {
      const firstError = Object.values(err)[0]
      toast.error(firstError)
      return
    }

    let payload = new FormData()
    payload.append('logoHeight', siteSetting.logoHeight || 50)
    payload.append('logoWidth', siteSetting.logoWidth || 150)
    payload.append('projectName', (siteSetting.projectName || '').trim())

    if (siteSetting.mainLogo instanceof File) {
      payload.append('mainLogo', siteSetting.mainLogo)
    }
    if (siteSetting.favicon instanceof File) {
      payload.append('favicon', siteSetting.favicon)
    }

    if (siteSetting.email) payload.append('email', siteSetting.email.trim())
    if (siteSetting.host) payload.append('host', siteSetting.host.trim())
    if (siteSetting.phone) payload.append('phone', siteSetting.phone)
    if (siteSetting.companyWhatsapp) payload.append('companyWhatsapp', siteSetting.companyWhatsapp)
    if (siteSetting.password && siteSetting.password.trim() !== '') {
      payload.append('password', siteSetting.password.trim())
    }

    setIsLoading('submit')
    try {
      let response = await apiClient.post('/software-setting/update-site-setting', payload, {
        isFileUpload: true,
      })

      toast.success(response?.data?.message || 'Settings saved successfully.')
      await getSiteSetting()
    } catch (error) {
      const errMsg =
        error?.response?.data?.message ||
        error?.data?.message ||
        error?.message ||
        'Failed to save settings. Please try again.'
      toast.error(errMsg)
    } finally {
      setIsLoading('')
    }
  }

  useEffect(() => {
    getSiteSetting()
  }, [])

  return (
    <Container className="mt-4 containe No.er-lg gap-2 d-md-flex p-0">
      <Helmet>
        <title>Site Settings — Clientmark</title>
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
                            SMTP Host <span className="text-muted small fw-normal">(Optional)</span>
                          </Form.Label>
                          <Form.Control
                            type="text"
                            value={siteSetting.host}
                            onChange={(e) => {
                              setSiteSetting({ ...siteSetting, host: e.target.value.trim() })
                              setError({ ...error, host: '' })
                            }}
                            className="underline-input"
                            placeholder="e.g. smtp.gmail.com"
                          />
                          {error.host && <div className="text-danger small">{error.host}</div>}
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>
                            SMTP User <span className="text-muted small fw-normal">(Optional)</span>
                          </Form.Label>
                          <Form.Control
                            type="text"
                            value={siteSetting.email}
                            onChange={(e) => {
                              setSiteSetting({ ...siteSetting, email: e.target.value.trim() })
                              setError({ ...error, email: '' })
                            }}
                            className="underline-input"
                            placeholder="e.g. notify@yourcompany.com"
                          />
                          {error.email && <div className="text-danger small">{error.email}</div>}
                        </Form.Group>
                      </Col>

                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>
                            SMTP Password <span className="text-muted small fw-normal">(Optional)</span>
                          </Form.Label>
                          <Form.Control
                            type="password"
                            value={siteSetting.password}
                            onChange={(e) => {
                              setSiteSetting({
                                ...siteSetting,
                                password: e.target.value.trim(),
                              })
                              setError({ ...error, password: '' })
                            }}
                            className="underline-input"
                            placeholder="Enter SMTP password"
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

                    <h5 className="fw-semibold mb-3">Logo & Branding Settings</h5>

                    <Form.Group className="mb-3">
                      <Form.Label className="d-flex justify-content-between">
                        <span>Main Logo</span>
                        <span className="text-muted small">PNG, JPG, WebP, SVG (Max 10MB)</span>
                      </Form.Label>
                      <Form.Control
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                        onChange={handleLogoChange}
                        className="underline-input"
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label className="d-flex justify-content-between">
                        <span>Favicon (Browser Tab Icon)</span>
                        <span className="text-muted small">PNG, ICO, SVG, JPG (32×32 or 64×64, Max 5MB)</span>
                      </Form.Label>
                      <Form.Control
                        type="file"
                        accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml,image/jpeg,image/jpg"
                        onChange={handleFaviconChange}
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

                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <h6 className="mb-0 fw-semibold">Browser Tab Favicon</h6>
                      <span
                        className="badge"
                        style={{
                          background: faviconPreview || existingFavicon ? '#DEF7EC' : (logoPreview || existingLogo ? '#E1EFFE' : '#F3F4F6'),
                          color: faviconPreview || existingFavicon ? '#03543F' : (logoPreview || existingLogo ? '#1E429F' : '#374151'),
                          fontSize: '11px',
                          fontWeight: 500,
                        }}
                      >
                        {faviconPreview || existingFavicon
                          ? 'Custom Favicon Active'
                          : logoPreview || existingLogo
                          ? 'Using Company Logo'
                          : 'Default Clientmark'}
                      </span>
                    </div>

                    {/* Simulated Browser Tab */}
                    <div
                      className="p-2 mb-3 rounded"
                      style={{
                        background: '#EAECEF',
                        border: '1px solid #D5D8DC',
                      }}
                    >
                      <div
                        className="d-inline-flex align-items-center px-3 py-1 bg-white rounded-top shadow-sm"
                        style={{
                          maxWidth: '240px',
                          borderTop: '2px solid #E05E3A',
                          gap: '8px',
                        }}
                      >
                        <img
                          src={
                            faviconPreview ||
                            existingFavicon ||
                            logoPreview ||
                            existingLogo ||
                            '/favicon.svg'
                          }
                          alt="Tab icon"
                          style={{ width: '16px', height: '16px', objectFit: 'contain', borderRadius: '3px' }}
                        />
                        <span
                          className="text-truncate fw-medium"
                          style={{ fontSize: '12px', color: '#1A1F36', maxWidth: '140px' }}
                        >
                          {siteSetting.projectName || 'Clientmark'} — CRM
                        </span>
                        <span style={{ fontSize: '10px', color: '#9CA3AF', marginLeft: 'auto' }}>✕</span>
                      </div>
                    </div>

                    {/* Icon sizes preview */}
                    <div
                      className="p-3 bg-light rounded d-flex align-items-center justify-content-center"
                      style={{ gap: '20px' }}
                    >
                      <div className="text-center">
                        <img
                          src={
                            faviconPreview ||
                            existingFavicon ||
                            logoPreview ||
                            existingLogo ||
                            '/favicon.svg'
                          }
                          alt="Favicon 32x32"
                          style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                        />
                        <div className="text-muted" style={{ fontSize: '10px', marginTop: '4px' }}>
                          32×32 (Tab)
                        </div>
                      </div>
                      <div className="text-center">
                        <img
                          src={
                            faviconPreview ||
                            existingFavicon ||
                            logoPreview ||
                            existingLogo ||
                            '/favicon.svg'
                          }
                          alt="Favicon 64x64"
                          style={{ width: '64px', height: '64px', objectFit: 'contain' }}
                        />
                        <div className="text-muted" style={{ fontSize: '10px', marginTop: '4px' }}>
                          64×64 (HiDPI)
                        </div>
                      </div>
                    </div>
                    <p className="text-muted small mt-2 mb-0" style={{ fontSize: '11px' }}>
                      On the public landing page, Clientmark branding is preserved. When clients log into your workspace, your custom favicon and logo are displayed.
                    </p>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Col>
    </Container>
  )
}

export default SiteSetting
