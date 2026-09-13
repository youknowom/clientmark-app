import React, { useState, useEffect } from 'react'
import { Modal, Form, Button, Row, Col } from 'react-bootstrap'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { FaImage } from 'react-icons/fa'
import toast from 'react-hot-toast'

const PostModal = ({ show, onHide, onPost, existingPost = null, phases = [] }) => {
  const [selectedPhase, setSelectedPhase] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedImages, setSelectedImages] = useState([])

  const handleImageUpload = (event) => {
    const files = Array.from(event.target.files)

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']

    const validFiles = files.filter((file) => allowedTypes.includes(file.type))

    // Optional: show alert if invalid files selected
    if (validFiles.length !== files.length) {
      alert('Only PNG, JPG, JPEG, and PDF files are allowed.')
    }

    const filesWithPreview = validFiles.map((file) => ({
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null, // no preview for PDF
      type: file.type,
    }))

    setSelectedImages((prev) => [...prev, ...filesWithPreview])
  }

  const removeImage = (index) => {
    setSelectedImages((prev) => {
      const updated = [...prev]

      // revoke preview URL to prevent memory leak
      if (updated[index]?.preview) {
        URL.revokeObjectURL(updated[index].preview)
      }

      updated.splice(index, 1)
      return updated
    })
  }

  const handlePost = () => {
    if (!selectedPhase.trim()) {
      toast.error('Please select a phase')
      return
    }
    if (!title.trim()) {
      toast.error('Please enter a title')
      return
    }
    if (!description.trim()) {
      toast.error('Please add a description')
      return
    }

    onPost({
      phase: selectedPhase,
      module: title,
      title: title,
      content: description,
      images: selectedImages.map((img) => img.file || img),
    })

    // Reset form
    setSelectedPhase('')
    setTitle('')
    setDescription('')
    setSelectedImages([])
    onHide()
  }

  const handleClose = () => {
    setSelectedPhase('')
    setTitle('')
    setDescription('')
    setSelectedImages([])
    onHide()
  }

  const quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link'],
      ['clean'],
    ],
  }

  // If editing existing post, populate fields
  useEffect(() => {
    if (existingPost) {
      setSelectedPhase(existingPost.phase || '')
      setTitle(existingPost.module || existingPost.title || '')
      setDescription(existingPost.content || '')
      setSelectedImages(existingPost.images || [])
    } else {
      // Reset form when opening for new post
      setSelectedPhase('')
      setTitle('')
      setDescription('')
      setSelectedImages([])
    }
  }, [existingPost, show])

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header
        closeButton
        style={{ backgroundColor: '#ff7f39', color: 'white', padding: '8px 16px' }}
      >
        <Modal.Title style={{ fontSize: '15px' }}>
          {existingPost ? 'Edit Post' : 'Add New Post'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Phase Selection */}
        <Form.Group className="mb-3">
          <Form.Label className="mb-2">
            Select Phase <span className="text-danger">*</span>
          </Form.Label>
          <Form.Select
            value={selectedPhase}
            onChange={(e) => setSelectedPhase(e.target.value)}
            required
          >
            <option value="">Choose a phase...</option>
            {phases.map((phase, index) => (
              <option
                key={index}
                value={phase.PhaseName || phase.phaseName || `Phase ${index + 1}`}
              >
                {`Phase ${index + 1} - ${phase.PhaseName || phase.phaseName || `Phase ${index + 1}`}`}
              </option>
            ))}
          </Form.Select>
        </Form.Group>

        {/* Title */}
        <Form.Group className="mb-3">
          <Form.Label className="mb-2">
            Title <span className="text-danger">*</span>
          </Form.Label>
          <Form.Control
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter post title"
            required
          />
        </Form.Group>

        {/* Description with React Quill */}
        <Form.Group className="mb-3">
          <Form.Label>
            Description <span className="text-danger">*</span>
          </Form.Label>
          <div style={{ height: '250px', marginBottom: '15px' }}>
            <ReactQuill
              theme="snow"
              value={description}
              onChange={setDescription}
              style={{ height: '200px' }}
              modules={quillModules}
              placeholder="Write your progress update..."
            />
          </div>
        </Form.Group>

        {/* Image Upload */}
        <Form.Group className="mb-3">
          <Form.Label className="d-flex align-items-center gap-2">
            <FaImage /> Upload Images (Optional)
          </Form.Label>
          <Form.Control type="file" multiple accept="image/*" onChange={handleImageUpload} />

          {selectedImages.length > 0 && (
            <div className="mt-2">
              <Row>
                {selectedImages.map((img, idx) => (
                  <Col xs={4} md={3} key={idx} className="mb-2">
                    <div className="position-relative">
                      <img
                        src={img.preview || img}
                        alt={`Upload ${idx}`}
                        className="img-thumbnail w-100"
                        style={{ height: '80px', objectFit: 'cover' }}
                      />

                      <Button
                        size="sm"
                        variant="danger"
                        className="position-absolute top-0 end-0 p-1"
                        onClick={() => removeImage(idx)}
                        style={{ fontSize: '12px' }}
                      >
                        ×
                      </Button>
                    </div>
                  </Col>
                ))}
              </Row>
            </div>
          )}
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button style={{ backgroundColor: '#ff7f39', borderColor: '#ff7f39' }} onClick={handlePost}>
          {existingPost ? 'Update Post' : 'Post'}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default PostModal
