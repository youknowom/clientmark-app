import React, { useContext, useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Container, Card, Form, Button, Spinner, Table, Row, Col } from 'react-bootstrap'
import Select from 'react-select'

import { FaFileExcel, FaPencilAlt, FaTrashAlt } from 'react-icons/fa'
import { BsFunnel } from 'react-icons/bs'
import CreatableSelect from 'react-select/creatable'

import { useDebounce } from 'use-debounce'

import { AuthContext } from '../../AuthContext'
import { hasPermission } from '../../helpers/hasPermission'
import apiClient from '../../api/axiosClient'

import { getListState, saveListState } from '../../helpers/listStateStorage'
import toast from 'react-hot-toast'

const ConfirmationModal = React.lazy(() => import('../../components/mycomponent/ConfirmationModal'))

import '../sidebarCSS/comStyle.css'
import '../sidebarCSS/table.css'

function AllUser() {
  const { userData } = useContext(AuthContext)
  const navigate = useNavigate()
  const location = useLocation()

  // Role name passed from dashboard card click (e.g. 'developer')
  const incomingRoleName = location.state?.filter?.role || ''
  // Role keyword to EXCLUDE (e.g. 'developer' - hide devs in lead dashboard)
  const excludeRoleKeyword = location.state?.filter?.excludeRole || ''

  const LIST_KEY = 'ALL_USER_LIST'
  const saved = getListState(LIST_KEY)

  const [isLoading, setIsLoading] = useState('')
  const [data, setData] = useState([])
  const [roles, setRoles] = useState([])
  const [branches, setBranches] = useState([])

  // If navigated from a dashboard card (any filter in location state),
  // always start with a CLEAN filter — ignore stale cached state.
  // Stale roleId in saved state would cause backend to filter wrong users,
  // then client-side exclusion removes them all → nothing shown.
  const hasIncomingFilter = !!(incomingRoleName || excludeRoleKeyword)

  const [filter, setFilter] = useState(
    hasIncomingFilter
      ? { search: '', branchId: '', roleId: '', fromDate: '', toDate: '' }
      : saved?.filter || { search: '', branchId: '', roleId: '', fromDate: '', toDate: '' },
  )

  const [showFilter, setShowFilter] = useState(false)
  const toggleFilter = () => setShowFilter(!showFilter)

  const [pagination, setPagination] = useState(
    saved?.pagination || {
      page: 1,
      limit: 10,
      totalPages: 1,
    },
  )
  const [debouncedSearch] = useDebounce(filter.search, 300)

  const [confirmState, setConfirmState] = useState({
    show: false,
    message: '',
    onConfirm: () => { },
  })

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({
      ...prev,
      page: newPage,
    }))
  }

  //fetch user list
  const getUserList = async () => {
    try {
      const response = await apiClient.get('/user/get-user-list', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          search: filter.search,
          branchId: filter.branchId,
          roleId: filter.roleId,
          fromDate: filter.fromDate,
          toDate: filter.toDate,
        },
      })
      const rawData = response.data.data
      // If an excludeRole keyword was passed from dashboard, hide those roles client-side
      const filtered = excludeRoleKeyword
        ? rawData.filter(
          (u) =>
            !u?.roleId?.roleName?.toLowerCase().includes(excludeRoleKeyword.toLowerCase()),
        )
        : rawData
      setData(filtered)
      setPagination({ ...pagination, totalPages: response.data.pagination.totalPages })
    } catch (error) {
      setData([])
      setPagination({ ...pagination, totalPages: 1 })
    }
  }

  //get branches
  const getBranches = async (search) => {
    try {
      const response = await apiClient.get('/branch/get-branches', {
        params: {
          search: search,
          branchId: userData?.branchId?._id,
        },
      })
      setBranches(response.data.data)
    } catch (error) {
      setBranches([])
    }
  }

  //get roles
  const getRoles = async (search) => {
    try {
      const response = await apiClient.get('/user/get-role-list', {
        params: {
          search: search,
        },
      })
      setRoles(response.data.data)
    } catch (error) {
      setRoles([])
    }
  }

  //delete single user
  const deleteUser = async (userId) => {
    try {
      const res = await apiClient.delete('/user/delete-user', {
        data: { userId },
      })

      toast.success(res.data.message)
      setData((prev) => prev.filter((u) => u?._id !== userId))
    } catch (err) {
      toast.error(err?.data?.message || 'Internal server error. Try after sometime.')
    } finally {
      setConfirmState({ show: false, message: '', onConfirm: () => { } })
    }
  }

  //export data
  const handleExport = async () => {
    try {
      setIsLoading('export')
      const response = await apiClient.get(`/user/export-user-list`, {
        params: {
          search: filter.search,
          branchId: filter.branchId,
          roleId: filter.roleId,
          fromDate: filter.fromDate,
          toDate: filter.toDate,
        },
        responseType: 'blob',
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', 'User_List.xlsx')
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast.success('File exported successfully.')
    } catch (err) {
      toast.error(err?.data?.message || 'Internal server error. Try after sometime.')
    } finally {
      setIsLoading('')
    }
  }

  useEffect(() => {
    getRoles()
    getBranches()
  }, [])

  // Once roles load, if a role name was passed from the dashboard card,
  // find its _id and pre-apply the filter automatically
  useEffect(() => {
    if (!incomingRoleName || roles.length === 0) return
    const match = roles.find(
      (r) => r.roleName.toLowerCase().includes(incomingRoleName.toLowerCase())
    )
    if (match) {
      setFilter((prev) => ({ ...prev, roleId: match._id }))
    }
  }, [roles, incomingRoleName])

  useEffect(() => {
    getUserList()
  }, [debouncedSearch, pagination.page, pagination.limit, filter])

  useEffect(() => {
    saveListState(LIST_KEY, { filter, pagination })
  }, [filter, pagination])

  return (
    <Container className="mt-4 container-lg p-0">
      <Card>
        <Card.Header className="d-flex justify-content-between mainBGColor text-white fw-bold py-1">
          {' '}
          <div>All User</div>
          {hasPermission(userData, 'add:user') && (
            <Button className="button" onClick={() => navigate('/add-user')}>
              Add User
            </Button>
          )}
        </Card.Header>
        <Card.Body>
          <div className="d-flex align-items-center mb-3" style={{ gap: '10px' }}>
            {/* Filter Icon Button */}
            <Button
              title="Filter"
              variant="light"
              onClick={toggleFilter}
              style={{
                border: '1px solid #ddd',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BsFunnel size={16} />
            </Button>

            {/* Limit Dropdown */}
            <CreatableSelect
              options={[10, 50, 100].map((v) => ({
                label: String(v),
                value: v,
              }))}
              value={
                pagination.limit
                  ? { label: String(pagination.limit), value: pagination.limit }
                  : null
              }
              onChange={(selected) => {
                const value = Number(selected?.value)
                setPagination((prev) => ({
                  ...prev,
                  limit: value,
                  page: 1,
                }))
              }}
              placeholder="Limit"
              isClearable={false}
              classNamePrefix="lead-select"
              styles={{
                container: (base) => ({
                  ...base,
                  width: 90,
                  fontSize: '12px',
                }),
                control: (base) => ({
                  ...base,
                  minHeight: 28,
                  height: 28,
                }),
                valueContainer: (base) => ({
                  ...base,
                  padding: '0 6px',
                }),
                input: (base) => ({
                  ...base,
                  margin: 0,
                  padding: 0,
                }),
                indicatorsContainer: (base) => ({
                  ...base,
                  height: 28,
                }),
              }}
            />
          </div>

          {showFilter && (
            <div style={{ position: 'relative', width: '100%' }}>
              <Card className="mb-3 shadow-sm w-100">
                <Card.Body className="pt-2">
                  <Row className="g-2">
                    {/* Search */}
                    <Col xs={12} sm={6} md={4} lg={4}>
                      <Form.Label style={{ fontSize: '12px', fontWeight: '500' }}>
                        Search Here
                      </Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Name, Mobile"
                        value={filter.search}
                        onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                        style={{ fontSize: '12px', padding: '6px 10px' }}
                      />
                    </Col>

                    <Col xs={12} sm={6} md={4} lg={2}>
                      <Form.Label style={{ fontSize: '12px', fontWeight: '500' }}>Role</Form.Label>
                      <Select
                        options={roles?.map((b) => ({
                          label: b.roleName,
                          value: b._id,
                        }))}
                        value={
                          filter.roleId
                            ? roles
                              ?.map((b) => ({
                                label: b.roleName,
                                value: b._id,
                              }))
                              .find((opt) => opt.value === filter.roleId) || null
                            : null
                        }
                        onInputChange={(inputValue) => {
                          getRoles(inputValue)
                        }}
                        onChange={(selected) => {
                          setFilter((prev) => ({
                            ...prev,
                            roleId: selected ? selected.value : '',
                          }))
                        }}
                        className="underline-input select"
                        classNamePrefix="lead-select"
                        placeholder="Role..."
                        isClearable
                        isSearchable
                      />
                    </Col>

                    <Col xs={12} sm={6} md={4} lg={2}>
                      <Form.Label style={{ fontSize: '12px', fontWeight: '500' }}>
                        Branch
                      </Form.Label>
                      <Select
                        options={branches?.map((b) => ({
                          label: b.branchName,
                          value: b._id,
                        }))}
                        value={
                          filter.branchId
                            ? branches
                              ?.map((b) => ({
                                label: b.branchName,
                                value: b._id,
                              }))
                              .find((opt) => opt.value === filter.branchId) || null
                            : null
                        }
                        onInputChange={(inputValue) => {
                          getBranches(inputValue)
                        }}
                        onChange={(selected) => {
                          setFilter((prev) => ({
                            ...prev,
                            branchId: selected ? selected.value : '',
                          }))
                        }}
                        className="underline-input select"
                        classNamePrefix="lead-select"
                        placeholder="Branch..."
                        isClearable
                        isSearchable
                      />
                    </Col>

                    {/* From Date */}
                    <Col xs={12} sm={6} md={4} lg={2}>
                      <Form.Label style={{ fontSize: '12px', fontWeight: '500' }}>
                        From Date
                      </Form.Label>
                      <Form.Control
                        type="date"
                        value={filter.fromDate}
                        onChange={(e) => setFilter({ ...filter, fromDate: e.target.value })}
                        style={{ fontSize: '12px', padding: '6px 10px' }}
                      />
                    </Col>

                    {/* To Date */}
                    <Col xs={12} sm={6} md={4} lg={2}>
                      <Form.Label style={{ fontSize: '12px', fontWeight: '500' }}>
                        To Date
                      </Form.Label>
                      <Form.Control
                        type="date"
                        value={filter.toDate}
                        onChange={(e) => setFilter({ ...filter, toDate: e.target.value })}
                        style={{ fontSize: '12px', padding: '6px 10px' }}
                      />
                    </Col>

                    {/* export */}
                    <Col xs={12} sm={6} md={4} lg={2}>
                      <Form.Label style={{ fontSize: '12px', fontWeight: '500' }}>
                        Export
                      </Form.Label>
                      <Button
                        variant="success"
                        className="w-100"
                        onClick={handleExport}
                        style={{ fontSize: '12px', padding: '6px 12px', color: 'white' }}
                      >
                        {isLoading === 'export' ? (
                          <Spinner size="sm" animation="border" className="me-2" />
                        ) : (
                          <>
                            <FaFileExcel className="me-1" />
                            Export
                          </>
                        )}
                      </Button>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </div>
          )}

          <div className="table-scroll-container">
            {' '}
            <Table bordered hover striped className="user-table">
              <thead>
                <tr>
                  <th>Sr</th>
                  <th>Full Name</th>
                  <th>Username</th>
                  <th>Mobile</th>
                  <th>Role</th>
                  <th>Report To</th>
                  <th>Branch</th>
                  <th className="sticky-action-col">Action</th>
                </tr>
              </thead>
              <tbody>
                {data?.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-2">
                      --- No Records Found ---
                    </td>
                  </tr>
                ) : (
                  data?.map((d, index) => (
                    <React.Fragment key={d._id}>
                      <tr key={d._id} style={{ color: 'red', cursor: 'pointer' }}>
                        <td>{(pagination.page - 1) * pagination.limit + index + 1}</td>
                        <td>{d?.fullName || '-'}</td>
                        <td>{d?.userName || '-'}</td>
                        <td>{d?.mobileNo || '-'}</td>
                        <td>{d?.roleId?.roleName || '-'}</td>
                        <td>{d?.reportToId?.fullName || '-'}</td>
                        <td>{d?.branchId?.branchName || '-'}</td>
                        <td className="sticky-action-col action">
                          <Button
                            title="Edit"
                            className="me-2 editSpan"
                            onClick={() =>
                              navigate('/add-user', {
                                state: { user: d },
                              })
                            }
                          >
                            <FaPencilAlt />
                          </Button>
                          {hasPermission(userData, 'delete:user') && (
                            <Button
                              title="Delete"
                              className="deleteicon"
                              onClick={() =>
                                setConfirmState({
                                  show: true,
                                  message: 'Do you want to delete this user?',
                                  onConfirm: () => deleteUser(d?._id),
                                })
                              }
                            >
                              <FaTrashAlt />
                            </Button>
                          )}
                        </td>
                      </tr>
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </Table>
          </div>

          <div className="pagination-controls text-center">
            <Button
              className="button"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              Prev
            </Button>
            <span className="mx-3">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              className="button"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </Card.Body>
      </Card>

      <ConfirmationModal
        show={confirmState.show}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState((prev) => ({ ...prev, show: false }))}
      />
    </Container>
  )
}

export default AllUser
