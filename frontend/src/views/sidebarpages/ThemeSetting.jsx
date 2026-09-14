import React, { useState, useEffect, useContext } from 'react'
import { Container, Card, Form, Row, Col, Button, Spinner } from 'react-bootstrap'
import { Helmet } from 'react-helmet'
import { FiCheck, FiRefreshCw, FiEye, FiTrendingUp } from 'react-icons/fi'
import { hasPermission } from '../../helpers/hasPermission'
import { AuthContext } from '../../AuthContext'
import ThemeContext from './ThemeContext'
import toast from 'react-hot-toast'
import apiClient from '../../api/axiosClient'

import '../sidebarCSS/comStyle.css'
import '../sidebarCSS/table.css'

const PRESETS = [
  {
    name: 'Sarvam Editorial',
    desc: 'Editorial obsidian, warm stone base & terracotta accent',
    primaryColor: '#111827',
    secondaryColor: '#E05E3A',
    backgroundColor: '#FBFBF9',
    textColor: '#111827',
  },
  {
    name: 'Slate Indigo',
    desc: 'Deep navy obsidian with crisp electric indigo accent',
    primaryColor: '#0F172A',
    secondaryColor: '#6366F1',
    backgroundColor: '#F8FAFC',
    textColor: '#0F172A',
  },
  {
    name: 'Forest Emerald',
    desc: 'Dark botanical slate with vibrant emerald accent',
    primaryColor: '#064E3B',
    secondaryColor: '#10B981',
    backgroundColor: '#F7FAF8',
    textColor: '#064E3B',
  },
  {
    name: 'Warm Monolith',
    desc: 'Minimalist charcoal with amber terracotta highlight',
    primaryColor: '#1C1917',
    secondaryColor: '#D97706',
    backgroundColor: '#FAFAF9',
    textColor: '#1C1917',
  },
]

const ThemeSetting = () => {
  const { userData } = useContext(AuthContext)
  const { theme, updateTheme } = useContext(ThemeContext)

  const [mainThemeFormData, setMainThemeFormData] = useState({
    primaryColor: theme?.primaryColor || '#111827',
    secondaryColor: theme?.secondaryColor || '#E05E3A',
    backgroundColor: theme?.backgroundColor || '#FBFBF9',
    textColor: theme?.textColor || '#111827',
  })

  const [error, setError] = useState({})
  const [isLoading, setIsLoading] = useState('')

  // Fetch saved theme from backend
  const getTheme = async () => {
    try {
      setIsLoading('theme-loading')
      const response = await apiClient.get('/software-setting/get-main-theme')
      const mainTheme = response?.data?.data?.mainTheme

      if (mainTheme?.primaryColor) {
        const loaded = {
          primaryColor: mainTheme.primaryColor,
          secondaryColor: mainTheme.secondaryColor,
          backgroundColor: mainTheme.backgroundColor,
          textColor: mainTheme.textColor,
        }
        setMainThemeFormData(loaded)
        updateTheme(loaded)
      }
    } catch (error) {
      console.error('Failed to load theme:', error)
    } finally {
      setIsLoading('')
    }
  }

  useEffect(() => {
    getTheme()
  }, [])

  const handleApplyPreset = (preset) => {
    const updated = {
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      backgroundColor: preset.backgroundColor,
      textColor: preset.textColor,
    }
    setMainThemeFormData(updated)
    setError({})
    updateTheme(updated)
  }

  const handleColorChange = (key, value) => {
    const updated = { ...mainThemeFormData, [key]: value }
    setMainThemeFormData(updated)
    setError((prev) => ({ ...prev, [key]: '' }))
    // Live update CSS variables immediately so the user can preview in real-time
    updateTheme(updated)
  }

  // Save theme in backend & sync globally
  const saveMainTheme = async () => {
    const err = {}
    if (!mainThemeFormData.primaryColor?.trim()) err.primaryColor = 'Primary color is required.'
    if (!mainThemeFormData.secondaryColor?.trim()) err.secondaryColor = 'Secondary color is required.'
    if (!mainThemeFormData.backgroundColor?.trim()) err.backgroundColor = 'Background color is required.'
    if (!mainThemeFormData.textColor?.trim()) err.textColor = 'Text color is required.'

    setError(err)
    if (Object.keys(err).length > 0) return

    setIsLoading('submit')
    try {
      const response = await apiClient.put('/software-setting/update-main-theme', mainThemeFormData)
      updateTheme(mainThemeFormData)
      toast.success(response?.data?.message || 'Theme saved and applied successfully.')
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to save theme.')
    } finally {
      setIsLoading('')
    }
  }

  const handleResetToDefault = () => {
    handleApplyPreset(PRESETS[0])
    toast.success('Reset to Sarvam Editorial default.')
  }

  return (
    <Container className="mt-4 container-lg p-0 pb-5">
      <Helmet>
        <title>Theme Settings — Clientmark</title>
      </Helmet>

      {/* Header section */}
      <div className="mb-4">
        <h4 className="fw-bold mb-1" style={{ color: '#111827', letterSpacing: '-0.02em' }}>
          Theme & Design System
        </h4>
        <p className="text-muted small mb-0">
          Customize brand palette, background tone, and UI accents across your entire Clientmark workspace.
        </p>
      </div>

      <Row className="g-4">
        {/* Left Column: Presets & Color Customization */}
        <Col xs={12} lg={7} xl={8}>
          {/* Curated Presets */}
          <Card className="mb-4 shadow-sm border-0" style={{ borderRadius: '14px' }}>
            <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <div>
                <span className="fw-bold text-dark d-block">Curated SaaS Palettes</span>
                <span className="text-muted small">One-click enterprise-grade color schemes</span>
              </div>
              <Button
                variant="link"
                className="text-decoration-none text-muted p-0 small d-flex align-items-center gap-1"
                onClick={handleResetToDefault}
              >
                <FiRefreshCw size={12} /> Reset default
              </Button>
            </Card.Header>
            <Card.Body className="p-3">
              <Row className="g-3">
                {PRESETS.map((preset, idx) => {
                  const isActive =
                    mainThemeFormData.primaryColor?.toLowerCase() === preset.primaryColor.toLowerCase() &&
                    mainThemeFormData.secondaryColor?.toLowerCase() === preset.secondaryColor.toLowerCase()

                  return (
                    <Col xs={12} sm={6} key={idx}>
                      <div
                        onClick={() => handleApplyPreset(preset)}
                        style={{
                          border: isActive ? '2px solid #111827' : '1px solid #E8E8E5',
                          borderRadius: '12px',
                          padding: '14px',
                          cursor: 'pointer',
                          backgroundColor: isActive ? '#FAFAF9' : '#FFFFFF',
                          transition: 'all 0.15s ease',
                          position: 'relative',
                        }}
                      >
                        {isActive && (
                          <span
                            style={{
                              position: 'absolute',
                              top: '10px',
                              right: '10px',
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              backgroundColor: '#111827',
                              color: 'white',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                            }}
                          >
                            <FiCheck size={11} />
                          </span>
                        )}
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <div
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              backgroundColor: preset.primaryColor,
                              border: '1px solid rgba(0,0,0,0.1)',
                            }}
                          />
                          <div
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              backgroundColor: preset.secondaryColor,
                              border: '1px solid rgba(0,0,0,0.1)',
                            }}
                          />
                          <div
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              backgroundColor: preset.backgroundColor,
                              border: '1px solid rgba(0,0,0,0.1)',
                            }}
                          />
                        </div>
                        <div className="fw-semibold text-dark small">{preset.name}</div>
                        <div className="text-muted" style={{ fontSize: '11px', marginTop: '2px' }}>
                          {preset.desc}
                        </div>
                      </div>
                    </Col>
                  )
                })}
              </Row>
            </Card.Body>
          </Card>

          {/* Detailed Color Pickers */}
          <Card className="shadow-sm border-0" style={{ borderRadius: '14px' }}>
            <Card.Header className="bg-white py-3 border-bottom">
              <span className="fw-bold text-dark d-block">Custom Palette Tuning</span>
              <span className="text-muted small">Fine-tune each individual token</span>
            </Card.Header>
            <Card.Body className="p-3">
              <Row className="g-3">
                {/* Primary Color */}
                <Col xs={12} sm={6}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-dark mb-1">
                      Primary Brand Color
                    </Form.Label>
                    <div className="d-flex align-items-center gap-2">
                      <input
                        type="color"
                        value={mainThemeFormData.primaryColor}
                        onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                        style={{
                          width: '42px',
                          height: '38px',
                          border: '1px solid #E8E8E5',
                          borderRadius: '8px',
                          padding: '2px',
                          cursor: 'pointer',
                        }}
                      />
                      <Form.Control
                        type="text"
                        value={mainThemeFormData.primaryColor}
                        onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                        className="form-control-sm"
                        style={{ fontFamily: 'monospace', fontSize: '13px' }}
                      />
                    </div>
                    {error.primaryColor && <div className="text-danger small mt-1">{error.primaryColor}</div>}
                  </Form.Group>
                </Col>

                {/* Secondary Color */}
                <Col xs={12} sm={6}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-dark mb-1">
                      Accent / Secondary Color
                    </Form.Label>
                    <div className="d-flex align-items-center gap-2">
                      <input
                        type="color"
                        value={mainThemeFormData.secondaryColor}
                        onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                        style={{
                          width: '42px',
                          height: '38px',
                          border: '1px solid #E8E8E5',
                          borderRadius: '8px',
                          padding: '2px',
                          cursor: 'pointer',
                        }}
                      />
                      <Form.Control
                        type="text"
                        value={mainThemeFormData.secondaryColor}
                        onChange={(e) => handleColorChange('secondaryColor', e.target.value)}
                        className="form-control-sm"
                        style={{ fontFamily: 'monospace', fontSize: '13px' }}
                      />
                    </div>
                    {error.secondaryColor && <div className="text-danger small mt-1">{error.secondaryColor}</div>}
                  </Form.Group>
                </Col>

                {/* Background Color */}
                <Col xs={12} sm={6}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-dark mb-1">
                      Workspace Background
                    </Form.Label>
                    <div className="d-flex align-items-center gap-2">
                      <input
                        type="color"
                        value={mainThemeFormData.backgroundColor}
                        onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                        style={{
                          width: '42px',
                          height: '38px',
                          border: '1px solid #E8E8E5',
                          borderRadius: '8px',
                          padding: '2px',
                          cursor: 'pointer',
                        }}
                      />
                      <Form.Control
                        type="text"
                        value={mainThemeFormData.backgroundColor}
                        onChange={(e) => handleColorChange('backgroundColor', e.target.value)}
                        className="form-control-sm"
                        style={{ fontFamily: 'monospace', fontSize: '13px' }}
                      />
                    </div>
                    {error.backgroundColor && <div className="text-danger small mt-1">{error.backgroundColor}</div>}
                  </Form.Group>
                </Col>

                {/* Text Color */}
                <Col xs={12} sm={6}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-dark mb-1">
                      Primary Typography Color
                    </Form.Label>
                    <div className="d-flex align-items-center gap-2">
                      <input
                        type="color"
                        value={mainThemeFormData.textColor}
                        onChange={(e) => handleColorChange('textColor', e.target.value)}
                        style={{
                          width: '42px',
                          height: '38px',
                          border: '1px solid #E8E8E5',
                          borderRadius: '8px',
                          padding: '2px',
                          cursor: 'pointer',
                        }}
                      />
                      <Form.Control
                        type="text"
                        value={mainThemeFormData.textColor}
                        onChange={(e) => handleColorChange('textColor', e.target.value)}
                        className="form-control-sm"
                        style={{ fontFamily: 'monospace', fontSize: '13px' }}
                      />
                    </div>
                    {error.textColor && <div className="text-danger small mt-1">{error.textColor}</div>}
                  </Form.Group>
                </Col>

                {/* Save button */}
                <Col xs={12} className="pt-2">
                  {hasPermission(userData, 'update:theme-setting') ? (
                    <button
                      className="button"
                      onClick={saveMainTheme}
                      disabled={isLoading === 'submit'}
                      style={{
                        padding: '10px 24px',
                        borderRadius: '9999px',
                        fontWeight: 600,
                        fontSize: '14px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      {isLoading === 'submit' ? (
                        <>
                          <Spinner size="sm" animation="border" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <FiCheck size={16} />
                          <span>Save & Apply Theme</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="text-muted small">
                      You do not have permission to modify workspace theme settings.
                    </div>
                  )}
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>

        {/* Right Column: Live Interactive Preview */}
        <Col xs={12} lg={5} xl={4}>
          <Card
            className="shadow-sm border-0 sticky-top"
            style={{ borderRadius: '14px', top: '90px' }}
          >
            <Card.Header className="bg-white py-3 border-bottom d-flex align-items-center gap-2">
              <FiEye size={16} className="text-muted" />
              <span className="fw-bold text-dark small">Live Interactive Preview</span>
            </Card.Header>
            <Card.Body
              className="p-3"
              style={{
                backgroundColor: mainThemeFormData.backgroundColor,
                borderRadius: '0 0 14px 14px',
                transition: 'background-color 0.2s ease',
              }}
            >
              {/* Simulated KPI Card */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E8E8E5',
                  padding: '16px',
                  marginBottom: '14px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                }}
              >
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#64748B',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Active Revenue
                  </span>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '8px',
                      backgroundColor: '#F4F4F1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: mainThemeFormData.primaryColor,
                    }}
                  >
                    <FiTrendingUp size={14} />
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: mainThemeFormData.textColor,
                    letterSpacing: '-0.02em',
                  }}
                >
                  $84,250
                </div>
                <div className="mt-2 d-flex align-items-center gap-2">
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      backgroundColor: `${mainThemeFormData.secondaryColor}22`,
                      color: mainThemeFormData.secondaryColor,
                      fontWeight: 600,
                    }}
                  >
                    +14.2% MoM
                  </span>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>vs last month</span>
                </div>
              </div>

              {/* Simulated Action & Badge */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E8E8E5',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                }}
              >
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: mainThemeFormData.textColor,
                    marginBottom: '8px',
                  }}
                >
                  Action Elements
                </div>
                <div className="d-flex flex-column gap-2">
                  <button
                    style={{
                      backgroundColor: mainThemeFormData.primaryColor,
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '9999px',
                      padding: '8px 16px',
                      fontSize: '12px',
                      fontWeight: 600,
                      width: '100%',
                    }}
                  >
                    Primary Button
                  </button>
                  <button
                    style={{
                      backgroundColor: 'transparent',
                      color: mainThemeFormData.secondaryColor,
                      border: `1px solid ${mainThemeFormData.secondaryColor}`,
                      borderRadius: '9999px',
                      padding: '8px 16px',
                      fontSize: '12px',
                      fontWeight: 600,
                      width: '100%',
                    }}
                  >
                    Accent Outline
                  </button>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}

export default ThemeSetting
