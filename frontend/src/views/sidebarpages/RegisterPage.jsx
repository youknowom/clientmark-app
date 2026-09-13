import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import axiosClient from '../../api/axiosClient'
import logo from '../../assets/brand/logo.png'

const RegisterPage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    phone: '',
    userName: '',
    password: '',
    confirmPassword: '',
  })

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.companyName || !formData.email || !formData.userName || !formData.password) {
      toast.error('Please fill in all required fields.')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters.')
      return
    }

    setLoading(true)

    try {
      const response = await axiosClient.post('/tenant/register', {
        companyName: formData.companyName,
        email: formData.email,
        phone: formData.phone,
        userName: formData.userName,
        password: formData.password,
      })

      if (response.data?.token || response.data?.success) {
        toast.success('Registration successful! Redirecting to login...')
        if (response.data?.token) {
          sessionStorage.setItem('token', response.data.token)
        }
        setTimeout(() => {
          navigate('/login')
        }, 1500)
      } else {
        toast.error(response.data?.message || 'Registration failed.')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-light min-vh-100 d-flex flex-row align-items-center py-4">
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
              <div className="card-body p-4 p-md-5">
                <div className="text-center mb-4">
                  <img src={logo} alt="Logo" height="48" className="mb-3" />
                  <h3 className="fw-bold text-primary">Start Your 14-Day Free Trial</h3>
                  <p className="text-muted">Create your company account and get instant access</p>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Company / Organization Name *</label>
                    <input
                      type="text"
                      className="form-control form-control-lg fs-6"
                      placeholder="e.g. Acme Innovations"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Work Email *</label>
                      <input
                        type="email"
                        className="form-control form-control-lg fs-6"
                        placeholder="admin@company.com"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Phone Number</label>
                      <input
                        type="text"
                        className="form-control form-control-lg fs-6"
                        placeholder="+91 9876543210"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <hr className="my-4 text-muted opacity-25" />

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Admin Username *</label>
                    <input
                      type="text"
                      className="form-control form-control-lg fs-6"
                      placeholder="admin"
                      name="userName"
                      value={formData.userName}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Password *</label>
                      <input
                        type="password"
                        className="form-control form-control-lg fs-6"
                        placeholder="••••••••"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Confirm Password *</label>
                      <input
                        type="password"
                        className="form-control form-control-lg fs-6"
                        placeholder="••••••••"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn btn-primary btn-lg w-100 mt-3 fw-semibold py-3"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    ) : null}
                    {loading ? 'Creating Account...' : 'Create Account & Start Trial'}
                  </button>
                </form>

                <div className="text-center mt-4">
                  <p className="mb-0 text-muted fs-6">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary fw-semibold text-decoration-none">
                      Sign In
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
