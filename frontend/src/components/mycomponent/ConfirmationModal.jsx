import React from 'react'
import { Modal, Button } from 'react-bootstrap'

let body = {
  borderBottom: '1px solid #00599f',
  color: '#00599f',
}

const ConfirmationModal = ({ show, message, onConfirm, onCancel }) => {
  return (
    <Modal show={show} onHide={onCancel} centered>
      <Modal.Body className="text-center" style={body}>
        <h5>{message}</h5>
      </Modal.Body>
      <Modal.Footer className="d-flex justify-content-center">
        <Button
          className="px-4 py-0"
          variant="success"
          style={{ color: 'white' }}
          onClick={onConfirm}
        >
          Yes
        </Button>
        <Button
          className="px-4 py-0"
          variant="danger"
          style={{ color: 'white' }}
          onClick={onCancel}
        >
          No
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default ConfirmationModal
