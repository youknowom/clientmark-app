import React, { useContext, useEffect, useRef, useState } from 'react'
import { Form, Button, Modal, Row, Spinner, Col } from 'react-bootstrap'

import { FiUser, FiPhoneOff, FiPhone, FiPause, FiPlay } from 'react-icons/fi'

import { toast } from 'react-hot-toast'

import { AuthContext } from '../../AuthContext'
import apiClient from '../../api/axiosClient'
import { hasPermission } from '../../helpers/hasPermission'

import 'react-phone-input-2/lib/style.css'
import '../sidebarCSS/zoiperPage.css'

const CallingModal = ({
  showCallingModal,
  setShowCallingModal,
  setConfirmState,
  formData,
  setFormData,
  sip, // SipClient instance passed from parent
}) => {
  const { userData } = useContext(AuthContext)
  const [error, setError] = useState({})

  const [isCalling, setIsCalling] = useState(false) // dialing started
  const [inCall, setInCall] = useState(false) // call established
  const [isMuted, setIsMuted] = useState(false) // mute state
  const [timer, setTimer] = useState(0)

  // Only custom remark
  const [remarkMode, setRemarkMode] = useState('custom') // always custom

  // keep session ref for controlling mute/unmute/attach events
  const sessionRef = useRef(null)
  const timerRef = useRef(null)
  const callLogUuidRef = useRef('')

  //update call log on event
  const updateCallLog = async (callStatus) => {
    try {
      const uuid = callLogUuidRef.current // ALWAYS INSTANT

      if (!uuid) {
        return
      }

      await apiClient.put('/pbx/update-call-log', {
        callLogUuid: uuid,
        callStatus,
        callStartTime: new Date(),
        callEndTime: new Date(),
      })
    } catch (error) {}
  }

  // helper to attach session events (same pattern as SipClient but here we control UI)
  const attachSessionEvents = (session) => {
    if (!session) return
    sessionRef.current = session

    try {
      session.stateChange.on((state) => {
        const s = state?.toString()

        // ---- CALL RINGING / DIALING ----
        if (s === 'Establishing') {
          setIsCalling(true)
          setInCall(false)
        }

        // ---- CALL CONNECTED ----
        else if (s === 'Established') {
          updateCallLog('Answered')
          setInCall(true)
          setIsCalling(true)
          setIsMuted(false)

          try {
            const sessionHandler = session.sessionDescriptionHandler
            if (sessionHandler && sessionHandler.peerConnection) {
              const pc = sessionHandler.peerConnection

              // Remote audio stream
              pc.ontrack = (event) => {
                const audioEl = document.getElementById('remoteAudio')
                if (event.streams && event.streams[0] && audioEl) {
                  audioEl.srcObject = event.streams[0]
                  audioEl.play().catch(() => {})
                }
              }

              // Attach existing tracks (browser sometimes delays ontrack)
              const receivers = pc.getReceivers()
              if (receivers.length) {
                const remoteStream = new MediaStream()
                receivers.forEach((r) => {
                  if (r.track) remoteStream.addTrack(r.track)
                })

                const audioEl = document.getElementById('remoteAudio')
                if (remoteStream.getTracks().length && audioEl) {
                  audioEl.srcObject = remoteStream
                  audioEl.play().catch(() => {})
                }
              }
            }
          } catch (err) {}
        }

        // ---- CALL ENDED ----
        else if (s === 'Terminated') {
          updateCallLog('Not Answered')
          setInCall(false)
          setIsCalling(false)
          setIsMuted(false)
          setTimer(0)
          sessionRef.current = null
        }
      })
    } catch (err) {}
  }

  // Mute/unmute local audio: disable local audio sender tracks
  const toggleMute = async () => {
    const session = sessionRef.current
    if (!session) {
      toast.error('Call not active')
      return
    }

    const sdh = session.sessionDescriptionHandler
    if (!sdh || !sdh.peerConnection) {
      toast.error('Audio stream not ready')
      return
    }

    const pc = sdh.peerConnection
    const senders = pc.getSenders()

    let audioSender = senders.find((s) => s.track && s.track.kind === 'audio')

    if (!audioSender) {
      toast.error('No audio track found')
      return
    }

    // Toggle mute
    audioSender.track.enabled = isMuted // reverse
    setIsMuted(!isMuted)
  }

  const startCall = async () => {
    if (!sip) {
      toast.error('PBX service not active. Please contact admin.')
      return
    }

    try {
      setIsCalling(true)
      setInCall(false)
      setTimer(0)

      // create call log on server (optional) - keep your previous logic if needed
      try {
        const response = await apiClient.post('/pbx/create-call-log', {
          callerName: userData?.fullName,
          extension: userData?.extension,
          leadType: 'Seller',
          leadId: formData?.leadNo,
          callInitiateTime: new Date(),
          destination: formData?.mobileNo,
          destinationName: formData?.fullName,
          callStatus: 'Initiated',
        })

        const respData = response.data
        callLogUuidRef.current = respData.callLogUuid // for SIP events
      } catch (e) {
        toast.error('Failed Initiate. Call-Log Error.')
        try {
        } catch (error) {}
        return
      }

      try {
        await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch (err) {
        toast.error('Microphone permission is disable.')
        setIsCalling(false)
        return
      }

      // Place outbound call
      const numberToDial = formData.mobileNo.replace(/^\+?/, '')
      const session = await sip.call(numberToDial)

      // Attach session events to control UI and mute
      attachSessionEvents(session)
    } catch (err) {
      toast.error('Failed Initiate. PBX Service Error')
      setIsCalling(false)
      setInCall(false)
      sessionRef.current = null
    }
  }

  const disconnectCall = async () => {
    try {
      updateCallLog('Not Answered')

      if (sip?.hangup) {
        await sip.hangup()
      } else {
        const session = sessionRef.current
        if (session) {
          try {
            if (session.state === SessionState.Established) {
              await session.bye()
            } else {
              await session.cancel()
            }
          } catch (e) {}
        }
      }
    } finally {
      setIsCalling(false)
      setInCall(false)
      setIsMuted(false)
      setTimer(0)
      sessionRef.current = null
    }
  }

  //save lead
  const saveLead = async () => {
    if (!formData.fullName) {
      toast.error('Full Name is required')
      return
    }
    if (!formData.mobileNo) {
      toast.error('Mobile is required')
      return
    }

    setConfirmState({
      show: true,
      message: 'Do you want to save data?',
      onConfirm: async () => {
        try {
          const response = await apiClient.put('/lead/update-lead', formData)
          toast.success(response?.data?.message)
        } catch (error) {
          toast.error(error?.data?.message || 'Internal server error. Try after sometime.')
        } finally {
          setConfirmState({ show: false, message: '', onConfirm: null })
        }
      },
    })
  }

  //assign lead to bde
  const telecallerToBde = async () => {
    try {
      if (!formData._id) {
        toast.error('Lead id is missing.')
        return
      }

      if (!formData.fullName) {
        toast.error('Full Name is required')
        return
      }
      if (!formData.mobileNo) {
        toast.error('Mobile is required')
        return
      }

      let payload = {
        leadId: formData?._id,
        callStatus: 'PENDING',
      }

      setConfirmState({
        show: true,
        message: 'Do you want to assign lead?',
        onConfirm: async () => {
          try {
            await apiClient.put('/lead/update-lead', formData)
            const response = await apiClient.post('/lead/single-telecaller-to-bde', payload)
            toast.success(response?.data?.message)
          } catch (error) {
            toast.error(error?.data?.message || 'Internal server error. Try after sometime.')
          } finally {
            setConfirmState({ show: false, message: '', onConfirm: null })
          }
        },
      })
    } catch (error) {}
  }

  // create remoteAudio element once
  useEffect(() => {
    if (!document.getElementById('remoteAudio')) {
      const audio = document.createElement('audio')
      audio.id = 'remoteAudio'
      audio.autoplay = true
      document.body.appendChild(audio)
    }
    return () => {}
  }, [])

  // timer start/stop
  useEffect(() => {
    if (inCall) {
      // start timer
      timerRef.current = setInterval(() => {
        setTimer((t) => t + 1)
      }, 1000)
    } else {
      // stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      if (!isCalling) {
        setTimer(0)
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [inCall, isCalling])

  // Reset states when modal closes
  useEffect(() => {
    if (!showCallingModal) {
      if (sessionRef.current) {
        try {
          sip?.hangup?.()
        } catch (e) {
          // ignore
        }
        sessionRef.current = null
      }
      setIsCalling(false)
      setInCall(false)
      setIsMuted(false)
      setTimer(0)
    }
  }, [showCallingModal, sip])

  useEffect(() => {
    if (!sip) return

    sip.onEvent = (type, message) => {
      if (type === 'calling' || type === 'ringing') {
        setIsCalling(true)
        setInCall(false)
      }

      if (type === 'connected') {
        setIsCalling(true)
        setInCall(true)
      }

      if (type === 'terminated') {
        setIsCalling(false)
        setInCall(false)
        setIsMuted(false)
        setTimer(0)
        sessionRef.current = null
      }
    }
  }, [sip])

  useEffect(() => {
    if (showCallingModal && sip && formData?.mobileNo) {
      // delay slightly so modal renders first
      const timer = setTimeout(() => {
        startCall()
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [showCallingModal])

  return (
    <Modal
      show={showCallingModal}
      onHide={() => setShowCallingModal(false)}
      backdrop="static"
      keyboard={false}
      centered
      className="connecting-modal calling-modal-fullscreen"
    >
      <div className="connecting-modal-body p-0 rounded-4">
        <div className="row g-0">
          {/*LEFT*/}
          <div className="col-12 col-md-3 p-4 left-column">
            {/* === BEGIN: Original calling UI (unchanged) === */}
            <div className="text-center mb-4">
              <h4 className="fw-bold text-accent mb-3">
                {isCalling && !inCall ? 'Calling...' : `00:${timer < 10 ? `0${timer}` : timer}`}
              </h4>

              <div className="d-flex justify-content-center my-3">
                <div className="profile-ring d-flex align-items-center justify-content-center">
                  <FiUser className="text-white" size={50} />
                </div>
              </div>

              <h5 className="mb-0 text-white">{formData?.fullName || 'Unknown'}</h5>
              <p className="text-light small mb-3 opacity-75">{formData?.mobileNo}</p>

              {/* CALL / END / MUTE */}
              <div className="d-flex justify-content-center gap-4 mt-4">
                {!isCalling ? (
                  <Button
                    variant="success"
                    className="rounded-circle p-3 d-flex align-items-center justify-content-center"
                    onClick={startCall}
                  >
                    <FiPhone size={26} />
                  </Button>
                ) : (
                  <Button
                    variant="danger"
                    className="rounded-circle p-3 d-flex align-items-center justify-content-center"
                    onClick={disconnectCall}
                  >
                    <FiPhoneOff size={26} />
                  </Button>
                )}

                <Button
                  variant="warning"
                  className="rounded-circle p-3 d-flex align-items-center justify-content-center"
                  onClick={toggleMute}
                  disabled={!inCall}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <FiPlay size={26} /> : <FiPause size={26} />}
                </Button>
              </div>
            </div>

            {/* === END left original content === */}
          </div>

          {/* RIGHT */}
          <div className="col-12 col-md-9 p-4 right-column bg-light" style={{ color: '#000000' }}>
            <Row>
              <Col md={4}>
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

              <Col md={4}>
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
                </Form.Group>
              </Col>

              <Col md={4}>
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
                </Form.Group>
              </Col>

              <Col md={4}>
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
                </Form.Group>
              </Col>

              <Col md={4}>
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
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group>
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
              </Col>

              <Col md={4}>
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

              <Col md={4}>
                <Form.Group>
                  <Form.Label>Remark</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={1}
                    name="remark"
                    value={formData.remark}
                    onChange={(e) => {
                      setFormData({ ...formData, remark: e.target.value })
                    }}
                    className="underline-input"
                    placeholder="Enter any additional remarks"
                  />
                </Form.Group>
              </Col>

              <Col md={4}>
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

              <Col md={4}>
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

              <Col md={4}>
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
            <Row className="mt-5 g-2 justify-content-start">
              <Col xs={12} md="auto">
                <Button
                  variant="outline-danger"
                  className="w-100 w-md-auto"
                  style={{
                    fontSize: '12px',
                    padding: '6px 12px',
                    fontWeight: 'bold',
                  }}
                  onClick={() => setShowCallingModal(false)}
                >
                  Close
                </Button>
              </Col>

              <Col xs={12} md="auto">
                <Button
                  variant="outline-info"
                  className="w-100 w-md-auto"
                  style={{
                    fontSize: '12px',
                    padding: '6px 12px',
                    fontWeight: 'bold',
                  }}
                  onClick={saveLead}
                >
                  Save
                </Button>
              </Col>

              {hasPermission(userData, 'update:lead') && (
                <Col xs={12} md="auto">
                  <Button
                    variant="outline-success"
                    className="w-100 w-md-auto"
                    style={{
                      fontSize: '12px',
                      padding: '6px 12px',
                      fontWeight: 'bold',
                    }}
                    onClick={telecallerToBde}
                  >
                    Assign BDE
                  </Button>
                </Col>
              )}
            </Row>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default CallingModal
