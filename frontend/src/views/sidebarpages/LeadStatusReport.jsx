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

function LeadStatusReport() {
  const { userData } = useContext(AuthContext)

  const LIST_KEY = 'LEAD_STATUS_REPORT_LIST'
  const saved = getListState(LIST_KEY)

  const [isLoading, setIsLoading] = useState('')
  const [data, setData] = useState({})

  const [filter, setFilter] = useState(
    saved?.filter || {
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
      const response = await apiClient.get('/lead/get-lead-status-report', {
        params: {
          fromDate: filter.fromDate,
          toDate: filter.toDate,
        },
      })
      setData(response.data.data)
    } catch (error) {
      setData([])
    }
  }

  //export data
  const handleExport = async () => {
    try {
      setIsLoading('export')
      const response = await apiClient.get(`/lead/export-lead-status-report`, {
        params: {
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
          <div>Lead Status Report</div>
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
            
               
              <tbody>
                {!data ? (
                  <tr>
                    <td colSpan="2" className="text-center py-2">
                      --- No Records Found ---
                    </td>
                  </tr>
                ) : (
                  <>
                   <tr>
                      <th>Status</th>
                      <th>Count</th>
                    </tr>
                    <tr>
                      <td>Total Leads</td>
                      <td>{data?.total || 0}</td>
                    </tr>
                    <tr>
                      <td>Assigned to Telecaller</td>
                      <td>{data?.assignToTelecaller || 0}</td>
                    </tr>
                    <tr>
                      <td>Assigned to BDE</td>
                      <td>{data?.assignToBde || 0}</td>
                    </tr>
                    <tr>
                      <td>Won</td>
                      <td>{data?.won || 0}</td>
                    </tr>
                    <tr>
                      <td>Lost</td>
                      <td>{data?.lost || 0}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </Container>
  )
}

export default LeadStatusReport
