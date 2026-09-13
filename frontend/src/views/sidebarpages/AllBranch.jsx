import React, { useState, useEffect, useContext } from 'react'
import { Container, Card, Form, Row, Col, Button, Table, Spinner } from 'react-bootstrap'
import { Helmet } from 'react-helmet'
import { FaPencilAlt, FaTrashAlt } from 'react-icons/fa'
import { hasPermission } from '../../helpers/hasPermission'
import { AuthContext } from '../../AuthContext'

import toast from 'react-hot-toast'

import apiClient from '../../api/axiosClient'

const ConfirmationModal = React.lazy(() => import('../../components/mycomponent/ConfirmationModal'))

import '../sidebarCSS/comStyle.css'
import '../sidebarCSS/table.css'

const AllBranch = () => {
  const { userData } = useContext(AuthContext)
  const [data, setData] = useState([])
  const [formData, setFormData] = useState({
    branchName: '',
    branchCode: '',
  })
  const [error, setError] = useState({})
  const [isEdit, setIsEdit] = useState(false)
  const [isLoading, setIsLoading] = useState('')

  const [confirmState, setConfirmState] = useState({
    show: false,
    message: '',
    onConfirm: () => {},
  })

  //get department
  const getBranch = async () => {
    try {
      setIsLoading('branch-loading')
      const response = await apiClient.get('/branch/get-branches',{
        params:{branchId:userData?.branchId?._id}
      })
      setData(response.data.data)
    } catch (error) {
      setData([])
    } finally {
      setIsLoading('')
    }
  }

  //save data in backend
  const handleSubmit = async () => {
    const err = {}
    if (formData.branchName.trim() === '') {
      err.branchName = 'Branch name is required.'
    }
    if (formData.branchCode === '') {
      err.branchCode = 'Branch code is required.'
    }

    setError(err)
    if (Object.keys(err).length > 0) return

    setIsLoading('submit')

    setConfirmState({
      show: true,
      message: `Do you want to ${isEdit ? 'update' : 'add'} branch?`,
      onConfirm: async () => {
        try {
          let response
          if (isEdit) {
            formData.branchId = formData._id
            response = await apiClient.put('/branch/update-branch', formData)
          } else {
            response = await apiClient.post('/branch/add-branch', formData)
          }

          toast.success(response.data.message)
          resetForm()
          getBranch()
        } catch (error) {
          toast.error(error?.data?.message || 'Internal server error. Try after sometime.')
        } finally {
          setIsLoading('')
          setConfirmState({ show: false, message: '', onConfirm: null })
        }
      },
    })
  }

  //delete branch
  const deleteBranch = async (branchId) => {
    setConfirmState({
      show: true,
      message: 'Do you want to delete branch?',
      onConfirm: async () => {
        try {
          setIsLoading('delete')
          const response = await apiClient.delete('/branch/delete-branch', {
            data: {
              branchId: branchId,
            },
          })
          toast.success(response.data.message)
          getBranch()
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
      branchName: data.branchName,
      branchCode: data.branchCode,
      _id: data._id,
    })
    setIsEdit(true)
  }

  const resetForm = () => {
    setFormData({
      branchName: '',
      branchCode: '',
    })
    setIsEdit(false)
  }

  useEffect(() => {
    getBranch()
  }, [])

  return (
    <Container className="mt-4 container-lg gap-2 d-md-flex p-0">
      <Helmet>
        <title>BH - Branch</title>
      </Helmet>
      {/* left side section */}
      <Col md={6}>
        <Card>
          <Card.Header className="mainBGColor text-white py-1 fw-bold">
            {isEdit ? 'Update Branch' : 'Add New Branch'}
          </Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Branch Name <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.branchName}
                    onChange={(e) => {
                      setFormData({ ...formData, branchName: e.target.value })
                      setError({ ...error, branchName: '' })
                    }}
                    className="underline-input"
                    placeholder="Enter branch name"
                  />
                  {error.branchName && <div className="text-danger small">{error.branchName}</div>}
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Branch Code <span className="text-danger">*</span>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={formData.branchCode}
                    onChange={(e) => {
                      setFormData({ ...formData, branchCode: e.target.value.trim() })
                      setError({ ...error, branchCode: '' })
                    }}
                    className="underline-input"
                    placeholder="Enter branch code"
                  />
                  {error.branchCode && <div className="text-danger small">{error.branchCode}</div>}
                </Form.Group>
              </Col>

              <Col md={12}>
                {hasPermission(userData, 'add:branch') && !isEdit && (
                  <Button
                    className="button"
                    onClick={handleSubmit}
                    disabled={isLoading === 'submit'}
                  >
                    {isLoading === 'submit' ? (
                      <Spinner size="sm" animation="border" />
                    ) : (
                      'Add Branch'
                    )}
                  </Button>
                )}

                {hasPermission(userData, 'update:branch') && isEdit && (
                  <Button
                    className="button"
                    onClick={handleSubmit}
                    disabled={isLoading === 'submit'}
                  >
                    {isLoading === 'submit' ? (
                      <Spinner size="sm" animation="border" />
                    ) : (
                      'Update Branch'
                    )}
                  </Button>
                )}

                {isEdit && (
                  <Button className="button ms-2" onClick={resetForm}>
                    Cancel
                  </Button>
                )}
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Col>

      {/* right Side section */}
      <Col md={6} className='mt-2 mt-lg-0'>
        <Card>
          <Card.Header className="mainBGColor text-white py-1 fw-bold">All Branch</Card.Header>
          <Card.Body>
            <Table bordered hover striped responsive className="user-table">
              <thead>
                <tr>
                  <th>Sr No</th>
                  <th>Branch Name</th>
                  <th>Branch Code</th>
                  <th>No Of Users</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {isLoading === 'branch-loading' ? (
                  <tr>
                    <td colSpan="5" className="text-center">
                      <Spinner size="sm" animation="border" />
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center">
                      --- No branch Found ---
                    </td>
                  </tr>
                ) : (
                  data?.map((d, idx) => (
                    <tr key={d._id}>
                      <td>{idx + 1}</td>
                      <td>{d.branchName}</td>
                      <td>{d.branchCode}</td>
                      <td>{d.employeeCount}</td>
                      <td>
                        {hasPermission(userData, 'update:branch') && (
                          <Button className="editSpan" onClick={() => handleEdit(d)}>
                            <FaPencilAlt />
                          </Button>
                        )}
                        {hasPermission(userData, 'delete:branch') && (
                          <Button
                            className="deleteicon"
                            disabled={isLoading === 'delete'}
                            onClick={() => deleteBranch(d._id)}
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

export default AllBranch
