import React, { useContext, useEffect, useState } from 'react'
import { Container, Card, Form, Button, Spinner, Table, Row, Col } from 'react-bootstrap'
import Select from 'react-select'

import { FaFileExcel } from 'react-icons/fa'
import { BsFunnel } from 'react-icons/bs'

import { useDebounce } from 'use-debounce'

import { AuthContext } from '../../AuthContext'
import apiClient from '../../api/axiosClient'

import { getListState, saveListState } from '../../helpers/listStateStorage'
import toast from 'react-hot-toast'

import '../sidebarCSS/comStyle.css'
import '../sidebarCSS/table.css'

function BdeLeadReport() {
  const { userData } = useContext(AuthContext)

  const LIST_KEY = 'BDE_LEAD_REPORT_LIST'
  const saved = getListState(LIST_KEY)

  const [isLoading, setIsLoading] = useState('')
  const [data, setData] = useState([])
  const [branches, setBranches] = useState([])

  const [filter, setFilter] = useState(
    saved?.filter || {
      search: '',
      branchId: '',
      roleId: '',
      fromDate: '',
      toDate: '',
    },
  )

  const [showFilter, setShowFilter] = useState(false)
  const toggleFilter = () => setShowFilter(!showFilter)

  const [debouncedSearch] = useDebounce(filter.search, 300)

  //fetch telecaller lead report
  const getTelecallerLeadReport = async () => {
    try {
      const response = await apiClient.get('/lead/get-bde-lead-report', {
        params: {
          search: filter.search,
          branchId: filter.branchId,
          roleId: filter.roleId,
          fromDate: filter.fromDate,
          toDate: filter.toDate,
        },
      })
      setData(response.data.data)
    } catch (error) {
      setData([])
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

  //export data
  const handleExport = async () => {
    try {
      setIsLoading('export')
      const response = await apiClient.get(`/lead/export-bde-lead-report`, {
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
      link.setAttribute('download', 'BdeLeadReport.xlsx')
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
    getBranches()
  }, [])

  useEffect(() => {
    getTelecallerLeadReport()
  }, [debouncedSearch, filter])

  useEffect(() => {
    saveListState(LIST_KEY, { filter })
  }, [filter])

  return (
    <Container className="mt-4 container-lg p-0">
      <Card>
        <Card.Header className="d-flex justify-content-between mainBGColor text-white fw-bold py-1">
          {' '}
          <div>BDE Lead Report</div>
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
                  <th>BDE</th>
                  <th>Branch</th>
                  <th>Total</th>
                  <th>Pending</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {data?.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-2">
                      --- No Records Found ---
                    </td>
                  </tr>
                ) : (
                  data?.map((d, index) => (
                    <React.Fragment key={d._id}>
                      <tr key={d._id} style={{ color: 'red', cursor: 'pointer' }}>
                        <td>{index + 1}</td>
                        <td>{d?.fullName || '-'}</td>
                        <td>{d?.branchName || '-'}</td>
                        <td>{d?.totalLeads || '0'}</td>
                        <td>{d?.completedLeads || '0'}</td>
                        <td>{d?.pendingLeads || '0'}</td>
                      </tr>
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </Container>
  )
}

export default BdeLeadReport
