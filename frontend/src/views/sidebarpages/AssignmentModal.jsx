import { Modal, Form, Button } from 'react-bootstrap'
import Select from 'react-select'
import { useEffect, useState } from 'react'
import apiClient from '../../api/axiosClient'
import toast from 'react-hot-toast'
import '../sidebarCSS/zoiperPage.css'

// many lead admin to telecaller
export function AssignAdminToTelecaller({
  showAdminToTC,
  setShowAdminToTC,
  selectedLead,
  setConfirmState,
}) {
  const [formData, setFormData] = useState({
    leadCount: 0,
    assignToName: '',
    assignToId: '',
  })

  const [telecallers, setTelecallers] = useState([])

  const getTelecaller = async (search = '') => {
    try {
      const response = await apiClient.get('user/get-user-dropdown', {
        params: {
          roleName: 'TeleCaller',
          search,
        },
      })
      setTelecallers(response?.data?.data || [])
    } catch (error) {
      setTelecallers([])
    }
  }

  const handleSubmit = () => {
    if (!formData.assignToId) {
      toast.error('Select telecaller')
      return
    }

    if (selectedLead.length === 0) {
      toast.error('Select atleast one lead')
      return
    }
    let leadIds = selectedLead.map((item) => item._id)
    let payload = {
      leadIds: leadIds,
      assignToId: formData.assignToId,
    }

    setConfirmState({
      show: true,
      message: 'Do you want to assign lead.',
      onConfirm: async () => {
        try {
          const response = await apiClient.post('/lead/many-admin-to-telecaller', payload, {
            responseType: 'blob',
          })

          toast.success('Assignment Complete. Please check excel.')

          // download file
          const url = window.URL.createObjectURL(new Blob([response.data]))
          const link = document.createElement('a')
          link.href = url
          link.setAttribute('download', 'AdminToTelecaller.xlsx')
          document.body.appendChild(link)
          link.click()
          link.remove()
        } catch (error) {
          toast.error(error?.data?.message || 'Internal server error. Try after sometime.')
        } finally {
          setShowAdminToTC(false)
          setConfirmState({ show: false, message: '', onConfirm: null })
        }
      },
    })
  }

  useEffect(() => {
    if (showAdminToTC) {
      getTelecaller()
    }
  }, [showAdminToTC])

  return (
    <Modal
      show={showAdminToTC}
      onHide={() => setShowAdminToTC(false)}
      centered
      backdrop={true}
      keyboard={true}
      className="connecting-modal"
    >
      <div className="connecting-modal-body p-4 rounded-4">
        <div className=" pt-1 mt-1">
          <Form>
            {/* <h5 className="mb-3 fw-semibold m">Assign Lead to Telecaller</h5> */}
            <div className="row">
              <div className="col-md-12 mb-3">
                <Form.Label>Select Telecaller</Form.Label>
                <Select
                  options={telecallers.map((r) => ({
                    label: r.fullName,
                    value: r._id,
                  }))}
                  value={
                    formData.assignToId
                      ? {
                          label: formData.assignToName,
                          value: formData.assignToId,
                        }
                      : null
                  }
                  onInputChange={(inputValue) => {
                    getTelecaller(inputValue)
                  }}
                  onChange={(selected) => {
                    setFormData((prev) => ({
                      ...prev,
                      assignToId: selected ? selected.value : '',
                      assignToName: selected ? selected.label : '',
                    }))
                  }}
                  className="underline-input select"
                  classNamePrefix="lead-select"
                  placeholder="Assign to"
                  menuPortalTarget={document.body}
                  styles={{
                    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                  }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="d-flex justify-content-start gap-2">
              <Button className="button" onClick={() => setShowAdminToTC(false)}>
                Exit
              </Button>
              <Button className="button" onClick={handleSubmit}>
                Assign Telecaller
              </Button>
            </div>
          </Form>
        </div>
      </div>
    </Modal>
  )
}

// many lead  telecaller to bde
export function AssignTelecallerToBde({
  showTcToBde,
  setShowTcToBde,
  selectedLead,
  setConfirmState,
}) {
  const [formData, setFormData] = useState({
    callStatus: 'PENDING',
  })
  const callStatusDD = [
    { value: 'PENDING', label: 'PENDING' },
    { value: 'NOT_CONNECTED', label: 'NOT_CONNECTED' },
    { value: 'CONNECTED', label: 'CONNECTED' },
    { value: 'CALL_BACK', label: 'CALL_BACK' },
  ]

  const handleSubmit = () => {
    if (!formData.callStatus) {
      toast.error('Select call status')
      return
    }

    if (selectedLead.length === 0) {
      toast.error('Select atleast one lead')
      return
    }
    let leadIds = selectedLead.map((item) => item._id)
    let payload = {
      leadIds: leadIds,
      callStatus: formData.callStatus,
    }

    setConfirmState({
      show: true,
      message: 'Do you want to assign lead.',
      onConfirm: async () => {
        try {
          const response = await apiClient.post('/lead/many-telecaller-to-bde', payload, {
            responseType: 'blob',
          })

          toast.success('Assignment Complete. Please check excel.')

          // download file
          const url = window.URL.createObjectURL(new Blob([response.data]))
          const link = document.createElement('a')
          link.href = url
          link.setAttribute('download', 'TelecallerToBde.xlsx')
          document.body.appendChild(link)
          link.click()
          link.remove()
        } catch (error) {
          toast.error(error?.data?.message || 'Internal server error. Try after sometime.')
        } finally {
          setShowTcToBde(false)
          setConfirmState({ show: false, message: '', onConfirm: null })
        }
      },
    })
  }

  return (
    <Modal
      show={showTcToBde}
      onHide={() => setShowTcToBde(false)}
      centered
      backdrop={true}
      keyboard={true}
      className="connecting-modal"
    >
      <div className="connecting-modal-body p-4 rounded-4">
        <div className=" pt-1 mt-1">
          <Form>
            {/* <h5 className="mb-3 fw-semibold m">Assign Lead to Telecaller</h5> */}
            <div className="row">
              <div className="col-md-12 mb-3">
                <Form.Label>Call Status</Form.Label>
                <Form.Select
                  value={formData.callStatus}
                  onChange={(e) => setFormData({ ...formData, callStatus: e.target.value })}
                  style={{ fontSize: '12px', padding: '6px 10px' }}
                >
                  <option value="">All Status</option>
                  {callStatusDD?.map((d, index) => (
                    <option key={index} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </Form.Select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="d-flex justify-content-start gap-2">
              <Button className="button" onClick={() => setShowTcToBde(false)}>
                Exit
              </Button>
              <Button className="button" onClick={handleSubmit}>
                Assign BDE
              </Button>
            </div>
          </Form>
        </div>
      </div>
    </Modal>
  )
}

// many lead  bde to admin
export function AssignBdeToAdmin({
  showBdeToAdmin,
  setShowBdeToAdmin,
  selectedLead,
  setConfirmState,
}) {
  const [formData, setFormData] = useState({
    leadStatus: 'WON',
  })
  const leadStatus = [
    { value: 'WON', label: 'WON' },
    { value: 'LOST', label: 'LOST' },
  ]

  const handleSubmit = () => {
    if (!formData.leadStatus) {
      toast.error('Select lead status')
      return
    }

    if (selectedLead.length === 0) {
      toast.error('Select atleast one lead')
      return
    }
    let leadIds = selectedLead.map((item) => item._id)
    let payload = {
      leadIds: leadIds,
      leadStatus: formData.leadStatus,
    }

    setConfirmState({
      show: true,
      message: 'Do you want to assign lead.',
      onConfirm: async () => {
        try {
          const response = await apiClient.post('/lead/many-bde-to-admin', payload, {
            responseType: 'blob',
          })

          toast.success('Assignment Complete. Please check excel.')

          // download file
          const url = window.URL.createObjectURL(new Blob([response.data]))
          const link = document.createElement('a')
          link.href = url
          link.setAttribute('download', 'BdeToAdmin.xlsx')
          document.body.appendChild(link)
          link.click()
          link.remove()
        } catch (error) {
          toast.error(error?.data?.message || 'Internal server error. Try after sometime.')
        } finally {
          setShowBdeToAdmin(false)
          setConfirmState({ show: false, message: '', onConfirm: null })
        }
      },
    })
  }

  return (
    <Modal
      show={showBdeToAdmin}
      onHide={() => setShowBdeToAdmin(false)}
      centered
      backdrop={true}
      keyboard={true}
      className="connecting-modal"
    >
      <div className="connecting-modal-body p-4 rounded-4">
        <div className=" pt-1 mt-1">
          <Form>
            {/* <h5 className="mb-3 fw-semibold m">Assign Lead to Telecaller</h5> */}
            <div className="row">
              <div className="col-md-12 mb-3">
                <Form.Label>Lead Status</Form.Label>
                <Form.Select
                  value={formData.leadStatus}
                  onChange={(e) => setFormData({ ...formData, leadStatus: e.target.value })}
                  style={{ fontSize: '12px', padding: '6px 10px' }}
                >
                  <option value="">All Status</option>
                  {leadStatus?.map((d, index) => (
                    <option key={index} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </Form.Select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="d-flex justify-content-start gap-2">
              <Button className="button" onClick={() => setShowBdeToAdmin(false)}>
                Exit
              </Button>
              <Button className="button" onClick={handleSubmit}>
                Assign Admin
              </Button>
            </div>
          </Form>
        </div>
      </div>
    </Modal>
  )
}
