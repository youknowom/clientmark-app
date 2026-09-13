import React, { useState, useEffect, useCallback } from 'react'
import {
  Container,
  Card,
  Table,
  Button,
  Form,
  Row,
  Col,
  Spinner,
  Badge,
  Modal,
} from 'react-bootstrap'
import { Helmet } from 'react-helmet'
import toast from 'react-hot-toast'
import { BsFunnel } from 'react-icons/bs'
import { FaWhatsapp, FaTrash, FaTrashAlt } from 'react-icons/fa'
import apiClient from '../../api/axiosClient'
import { formatDateTime } from '../../helpers/dateFormater'
import '../sidebarCSS/comStyle.css'
import '../sidebarCSS/table.css'

const MSG_LIMIT = 60

function WhatsappchatRecord() {
  const [data, setData] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [msgModal, setMsgModal] = useState({ show: false, text: '' })
  const [deleteId, setDeleteId] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false)
  const handleDeleteAllChats = async () => {
    try {
      await apiClient.delete('/lead/whatsapp-chat-records-all')
      toast.success('All chat records deleted')
      fetchChats()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete all chat records')
    }
    setShowDeleteAllModal(false)
  }
  const handleDeleteChat = async (id) => {
    try {
      await apiClient.delete(`/lead/whatsapp-chat-record/${id}`)
      toast.success('Chat record deleted')
      fetchChats()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete chat record')
    }
    setShowDeleteModal(false)
    setDeleteId(null)
  }

  const [filter, setFilter] = useState({
    search: '',
    fromDate: '',
    toDate: '',
  })

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalPages: 1,
    totalRecords: 0,
  })

  const fetchChats = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await apiClient.get('/lead/whatsapp-chat-records', {
        params: {
          search: filter.search,
          fromDate: filter.fromDate,
          toDate: filter.toDate,
          page: pagination.page,
          limit: pagination.limit,
        },
      })
      setData(res.data.data || [])
      setPagination((prev) => ({
        ...prev,
        totalPages: res.data.pagination?.totalPages || 1,
        totalRecords: res.data.pagination?.totalRecords || 0,
      }))
    } catch (err) {
      setData([])
      toast.error(err?.response?.data?.message || 'Failed to load chat records')
    } finally {
      setIsLoading(false)
    }
  }, [filter, pagination.page, pagination.limit])

  useEffect(() => {
    fetchChats()
  }, [pagination.page, pagination.limit])

  const openMsgModal = (text) => setMsgModal({ show: true, text })
  const closeMsgModal = () => setMsgModal({ show: false, text: '' })

  const handleSearch = () => {
    setPagination((prev) => ({ ...prev, page: 1 }))
    fetchChats()
  }

  const handleClearFilter = () => {
    setFilter({ search: '', fromDate: '', toDate: '' })
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }))
  }

  return (
    <Container className="mt-4 container-lg p-0">
      <Helmet>
        <title>BH – WhatsApp Chat Logs</title>
      </Helmet>

      <Card>
        <Card.Header className="mainBGColor text-white fw-bold d-flex align-items-center gap-2">
          <FaWhatsapp size={18} />
          WhatsApp Chat Logs
        </Card.Header>

        <Card.Body>
          {/* Toolbar */}
          <div className="d-flex align-items-center mb-3" style={{ gap: '10px' }}>
            {/* Filter Icon Button (copied from AllProject.jsx) */}
            <Button
              title="Filter"
              variant="light"
              onClick={() => setShowFilter((p) => !p)}
              style={{
                border: '1px solid #ddd',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <BsFunnel size={14} />
            </Button>

            <span
              className="ms-auto text-muted"
              style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: 10 }}
            >
              Total Records: <strong>{pagination.totalRecords}</strong>
              <Button
                variant="outline-danger"
                size="sm"
                style={{ fontSize: 12, padding: '2px 10px' }}
                onClick={() => setShowDeleteAllModal(true)}
                disabled={pagination.totalRecords === 0}
                title="Delete All Chats"
              >
                Delete All
              </Button>
            </span>
            {/* Delete All Confirmation Modal */}
            <Modal
              show={showDeleteAllModal}
              onHide={() => setShowDeleteAllModal(false)}
              centered
              size="sm"
            >
              <Modal.Header closeButton className="border-0 pb-1">
                <Modal.Title style={{ fontSize: '15px', color: '#dc3545' }}>
                  Delete All Chat Records
                </Modal.Title>
              </Modal.Header>
              <Modal.Body style={{ fontSize: '14px' }}>
                Are you sure you want to delete <b>all</b> WhatsApp chat records? This action cannot
                be undone.
              </Modal.Body>
              <Modal.Footer className="border-0 pt-1">
                <Button variant="secondary" size="sm" onClick={() => setShowDeleteAllModal(false)}>
                  Cancel
                </Button>
                <Button variant="danger" size="sm" onClick={handleDeleteAllChats}>
                  Delete All
                </Button>
              </Modal.Footer>
            </Modal>
          </div>

          {/* Filter Panel */}
          {showFilter && (
            <Card className="mb-3 shadow-sm">
              <Card.Body className="pt-2 pb-2">
                <Row className="g-2 align-items-end">
                  <Col xs={12} sm={6} md={4}>
                    <Form.Label style={{ fontSize: '12px', fontWeight: '500' }}>
                      Search (Name / Number / Message)
                    </Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Search..."
                      value={filter.search}
                      onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                      style={{ fontSize: '12px' }}
                    />
                  </Col>
                  <Col xs={12} sm={6} md={2}>
                    <Form.Label style={{ fontSize: '12px', fontWeight: '500' }}>
                      From Date
                    </Form.Label>
                    <Form.Control
                      type="date"
                      value={filter.fromDate}
                      onChange={(e) => setFilter({ ...filter, fromDate: e.target.value })}
                      style={{ fontSize: '12px' }}
                    />
                  </Col>
                  <Col xs={12} sm={6} md={2}>
                    <Form.Label style={{ fontSize: '12px', fontWeight: '500' }}>To Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={filter.toDate}
                      onChange={(e) => setFilter({ ...filter, toDate: e.target.value })}
                      style={{ fontSize: '12px' }}
                    />
                  </Col>
                  <Col xs={12} sm={6} md="auto">
                    <div className="d-flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleSearch}
                        style={{ fontSize: '12px' }}
                      >
                        Search
                      </Button>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={handleClearFilter}
                        style={{ fontSize: '12px' }}
                      >
                        Clear
                      </Button>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}

          {/* Table */}
          <div className="table-scroll-container">
            <Table bordered hover striped className="user-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>Lead Name</th>
                  <th>Lead No</th>
                  <th>WhatsApp No</th>
                  <th>Message</th>
                  <th>Sent By</th>
                  <th>Date &amp; Time</th>
                  <th style={{ width: '40px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4">
                      <Spinner animation="border" size="sm" className="me-2" />
                      Loading...
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-muted">
                      No WhatsApp chat records found.
                    </td>
                  </tr>
                ) : (
                  data.map((chat, idx) => (
                    <tr key={chat._id}>
                      <td>{(pagination.page - 1) * pagination.limit + idx + 1}</td>
                      <td>{chat.leadId?.fullName || chat.leadName || '—'}</td>
                      <td>
                        <Badge bg="secondary" style={{ fontSize: '11px' }}>
                          {chat.leadId?.leadNo || '—'}
                        </Badge>
                      </td>
                      <td>
                        <span style={{ color: '#25D366', fontWeight: '600' }}>
                          <FaWhatsapp className="me-1" />
                          {chat.whatsappNo}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', maxWidth: '220px' }}>
                        {chat.message && chat.message.length > MSG_LIMIT ? (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'baseline',
                              gap: '4px',
                              overflow: 'hidden',
                            }}
                          >
                            <span
                              style={{
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                flex: 1,
                              }}
                            >
                              {chat.message.slice(0, MSG_LIMIT)}
                            </span>
                            <span
                              style={{
                                color: '#0d6efd',
                                cursor: 'pointer',
                                fontWeight: '600',
                                whiteSpace: 'nowrap',
                                flexShrink: 0,
                              }}
                              onClick={() => openMsgModal(chat.message)}
                            >
                              view more
                            </span>
                          </div>
                        ) : (
                          <span style={{ wordBreak: 'break-word' }}>{chat.message}</span>
                        )}
                      </td>
                      <td>{chat.sentBy?.fullName || '—'}</td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>
                        {formatDateTime(chat.createdAt)}
                      </td>
                      <td>
                        <Button
                          className="deleteicon"
                          title="Delete Chat"
                          onClick={() => {
                            setDeleteId(chat._id)
                            setShowDeleteModal(true)
                          }}
                        >
                          <FaTrashAlt />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="d-flex justify-content-center align-items-center gap-2 mt-3 flex-wrap">
              <Button
                variant="outline-primary"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                Prev
              </Button>

              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 || p === pagination.totalPages || Math.abs(p - pagination.page) <= 2,
                )
                .reduce((acc, p, i, arr) => {
                  if (i > 0 && p - arr[i - 1] > 1) acc.push('...')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) =>
                  p === '...' ? (
                    <span key={`dots-${i}`} className="px-1 text-muted">
                      …
                    </span>
                  ) : (
                    <Button
                      key={p}
                      variant={p === pagination.page ? 'primary' : 'outline-primary'}
                      size="sm"
                      onClick={() => handlePageChange(p)}
                    >
                      {p}
                    </Button>
                  ),
                )}

              <Button
                variant="outline-primary"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>
      {/* Full Message Popup */}
      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered size="sm">
        <Modal.Header closeButton className="border-0 pb-1">
          <Modal.Title style={{ fontSize: '15px', color: '#dc3545' }}>
            Delete Chat Record
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ fontSize: '14px' }}>
          Are you sure you want to delete this chat record?
        </Modal.Body>
        <Modal.Footer className="border-0 pt-1">
          <Button variant="secondary" size="sm" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={() => handleDeleteChat(deleteId)}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal show={msgModal.show} onHide={closeMsgModal} centered size="md">
        <Modal.Header closeButton className="border-0 pb-1">
          <Modal.Title style={{ fontSize: '16px', color: '#25D366' }}>
            <span style={{ color: '#25D366' }}>
              <FaWhatsapp className="me-2" />
            </span>
            Message
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ whiteSpace: 'pre-wrap', fontSize: '14px', lineHeight: '1.6' }}>
          {msgModal.text}
        </Modal.Body>
        <Modal.Footer className="border-0 pt-1">
          <Button variant="secondary" size="sm" onClick={closeMsgModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}

export default WhatsappchatRecord
