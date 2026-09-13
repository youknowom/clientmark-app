import React, { useState, useEffect, useContext } from 'react'
import { Container, Card, Form, Row, Col, Button, Table, Spinner } from 'react-bootstrap'
import { AuthContext } from '../../AuthContext'
import { Helmet } from 'react-helmet'
import { hasPermission } from '../../helpers/hasPermission'
import { FaPencilAlt, FaTrashAlt } from 'react-icons/fa'

import toast from 'react-hot-toast'

import apiClient from '../../api/axiosClient'
const ConfirmationModal = React.lazy(() => import('../../components/mycomponent/ConfirmationModal'))

import '../sidebarCSS/comStyle.css'
import '../sidebarCSS/table.css'

const RolePermission = () => {
  const { userData } = useContext(AuthContext)
  const [data, setData] = useState([])
  const [permissions, setPermissions] = useState([])

  const [formData, setFormData] = useState({
    roleName: '',
    priority: '',
  })
  const [selectedPermissions, setSelectedPermissions] = useState([])

  const [error, setError] = useState({})
  const [isEdit, setIsEdit] = useState(false)
  const [isLoading, setIsLoading] = useState('')

  const [confirmState, setConfirmState] = useState({
    show: false,
    message: '',
    onConfirm: () => {},
  })

  const togglePermission = (code) => {
    setSelectedPermissions((prev) =>
      prev.includes(code) ? prev.filter((p) => p !== code) : [...prev, code],
    )
  }

  const isChecked = (code) => selectedPermissions.includes(code)

  //get role
  const getRole = async () => {
    try {
      setIsLoading('role-loading')
      const response = await apiClient.get('/user/get-role-list')
      const roleList = response.data.data || []
      setData(roleList)

      // Default open in update mode with Admin role when available.
      if (!isEdit && roleList.length > 0) {
        const defaultRole =
          roleList.find((r) => (r?.roleName || '').toLowerCase() === 'admin') || roleList[0]

        if (defaultRole) {
          setFormData({
            roleName: defaultRole.roleName,
            priority: defaultRole.priority,
            _id: defaultRole._id,
          })
          setSelectedPermissions(defaultRole.permissions || [])
          setIsEdit(true)
        }
      }
    } catch (error) {
      setData([])
    } finally {
      setIsLoading('')
    }
  }

  //get permission
  const getPermissionList = async () => {
    try {
      const response = await apiClient.get('/user/get-permission-list')
      setPermissions(response.data.data)
    } catch (error) {
      setPermissions([])
    }
  }

  //save data in backend
  const handleSubmit = async () => {
    if (!isEdit) {
      toast.error('Creating new roles is disabled')
      return
    }

    const err = {}
    if (formData.roleName.trim() === '') {
      err.roleName = 'Role name is required.'
    }
    if (formData.priority === '') {
      err.priority = 'Priority is required.'
    }

    if (selectedPermissions?.length === 0) {
      err.permissions = 'Select permission'
      toast.error('Select atleast one permission')
    }
    setError(err)
    if (Object.keys(err).length > 0) return

    const payload = {
      ...formData,
      permissions: selectedPermissions,
    }

    setConfirmState({
      show: true,
      message: 'Do you want to update permissions?',
      onConfirm: async () => {
        try {
          setIsLoading('submit')

          payload.roleId = formData._id
          const response = await apiClient.put('/user/update-role', payload)

          toast.success(response.data.message)
          await getRole()
        } catch (error) {
          toast.error(error?.data?.message || 'Internal server error. Try after sometime.')
        } finally {
          setIsLoading('')
          setConfirmState({ show: false, message: '', onConfirm: null })
        }
      },
    })
  }

  //delete role
  const deleteRole = async (roleId) => {
    setConfirmState({
      show: true,
      message: 'Do you want to delete role?',
      onConfirm: async () => {
        try {
          setIsLoading('delete')
          const response = await apiClient.delete('/user/delete-role', {
            data: {
              roleId: roleId,
            },
          })
          toast.success(response.data.message)
          getRole()
        } catch (error) {
          toast.error(error?.data?.message || 'Internal server error. Try after sometime.')
        } finally {
          setIsLoading('')
          setConfirmState({ show: false, message: '', onConfirm: null })
        }
      },
    })
  }

  //handle edit when click on edit icon
  const handleEdit = (data) => {
    setFormData({
      roleName: data.roleName,
      priority: data.priority,
      _id: data._id,
    })

    setSelectedPermissions(data.permissions || [])
    setIsEdit(true)
  }

  const resetForm = () => {
    setFormData({
      roleName: '',
      priority: '',
    })
    setSelectedPermissions([])
    setIsEdit(false)
  }

  useEffect(() => {
    getRole()
    getPermissionList()
  }, [])

  return (
    <Container className="mt-4 container-lg gap-2 d-md-flex p-0">
      <Helmet>
        <title>Roles & Permissions — Clientmark</title>
      </Helmet>
      {/* left side section */}
      <Col md={8}>
        <Card>
          <Card.Header className="mainBGColor text-white py-1 fw-bold">
            {isEdit ? 'Update Permissions' : 'Role Update'}
          </Card.Header>
          <Card.Body>
            {!isEdit ? (
              <div className="text-muted small">
                Select a role from "All Role" to update. New role creation is disabled.
              </div>
            ) : (
              <Row className="g-3">
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      Role Name <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.roleName}
                      disabled
                      onChange={(e) => {
                        setFormData({ ...formData, roleName: e.target.value })
                        setError({ ...error, roleName: '' })
                      }}
                      className="underline-input"
                      placeholder="Enter role name"
                    />
                    {error.roleName && <div className="text-danger small">{error.roleName}</div>}
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      Priority <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="number"
                      min={1}
                      value={formData.priority}
                      disabled
                      onChange={(e) => {
                        const value = e.target.value

                        // Allow empty value while typing, otherwise enforce min = 1
                        if (value === '' || Number(value) >= 1) {
                          setFormData({ ...formData, priority: value })
                          setError({ ...error, priority: '' })
                        }
                      }}
                      className="underline-input"
                      placeholder="Enter priority"
                    />

                    {error.priority && <div className="text-danger small">{error.priority}</div>}
                  </Form.Group>
                </Col>

                <Col md={12}>
                  <Table bordered hover striped responsive className="user-table">
                    <thead>
                      <tr>
                        <th>Permission</th>
                        <th>Create</th>
                        <th>View</th>
                        <th>Update</th>
                        <th>Delete</th>
                      </tr>
                    </thead>

                    <tbody>
                      {permissions.map((perm) => {
                        const mapAction = {
                          create: perm.subPermission.find((p) => p.code.startsWith('add:')),
                          view: perm.subPermission.find((p) => p.code.startsWith('view:')),
                          update: perm.subPermission.find((p) => p.code.startsWith('update:')),
                          delete: perm.subPermission.find((p) => p.code.startsWith('delete:')),
                        }

                        return (
                          <tr key={perm._id}>
                            <td>{perm.permissionName}</td>

                            {['create', 'view', 'update', 'delete'].map((action) => (
                              <td key={action}>
                                {mapAction[action] ? (
                                  <Form.Check
                                    type="checkbox"
                                    checked={isChecked(mapAction[action].code)}
                                    onChange={() => togglePermission(mapAction[action].code)}
                                  />
                                ) : (
                                  '-'
                                )}
                              </td>
                            ))}
                          </tr>
                        )
                      })}
                    </tbody>
                  </Table>
                </Col>

                <Col md={12}>
                  {hasPermission(userData, 'update:role') && (
                    <Button
                      className="button"
                      onClick={handleSubmit}
                      disabled={isLoading === 'submit'}
                    >
                      {isLoading === 'submit' ? (
                        <Spinner size="sm" animation="border" />
                      ) : (
                        'Update Permissions'
                      )}
                    </Button>
                  )}

                  <Button className="button ms-2" onClick={resetForm}>
                    Cancel
                  </Button>
                </Col>
              </Row>
            )}
          </Card.Body>
        </Card>
      </Col>

      {/* right Side section */}
      <Col md={4} className="mt-2 mt-lg-0">
        <Card>
          <Card.Header className="mainBGColor text-white py-1 fw-bold">All Role</Card.Header>
          <Card.Body>
            <Table bordered hover striped responsive className="user-table">
              <thead>
                <tr>
                  <th>Sr</th>
                  <th>Role</th>
                  <th>Users</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {isLoading === 'role-loading' ? (
                  <tr>
                    <td colSpan="4" className="text-center">
                      <Spinner size="sm" animation="border" />
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center">
                      --- No Role Found ---
                    </td>
                  </tr>
                ) : (
                  data?.map((d, idx) => (
                    <tr key={d._id}>
                      <td>{idx + 1}</td>
                      <td>{d.roleName}</td>
                      <td>{d.employeeCount}</td>
                      <td>
                        {hasPermission(userData, 'update:role') && (
                          <Button className="editSpan" onClick={() => handleEdit(d)}>
                            <FaPencilAlt />
                          </Button>
                        )}
                        {hasPermission(userData, 'delete:role') && (
                          <Button
                            className="deleteicon"
                            disabled={isLoading === 'delete'}
                            onClick={() => deleteRole(d._id)}
                          >
                            {isLoading === 'delete' ? (
                              <Spinner animation="border" size="sm" />
                            ) : (
                              <FaTrashAlt size={10} />
                            )}
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
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

export default RolePermission
