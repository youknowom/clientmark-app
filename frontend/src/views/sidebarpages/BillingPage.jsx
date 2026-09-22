import React, { useState, useEffect, useContext } from 'react'
import { Container, Row, Col, Card, Button, ProgressBar, Badge, Modal, Spinner } from 'react-bootstrap'
import { Helmet } from 'react-helmet'
import {
  FiCheck,
  FiZap,
  FiShield,
  FiClock,
  FiAlertCircle,
  FiCreditCard,
  FiArrowRight,
  FiXCircle,
  FiUsers,
  FiInbox,
  FiFolder,
  FiGitBranch,
} from 'react-icons/fi'
import { AuthContext } from '../../AuthContext'
import apiClient from '../../api/axiosClient'
import toast from 'react-hot-toast'
import EmptyState from '../../components/mycomponent/EmptyState'
import '../sidebarCSS/comStyle.css'
import '../sidebarCSS/table.css'

const BillingPage = () => {
  const { userData } = useContext(AuthContext)
  const isAdmin = userData?.roleId?.roleName === 'Admin'

  const [loading, setLoading] = useState(true)
  const [plans, setPlans] = useState([])
  const [mySubscription, setMySubscription] = useState(null)
  const [usageData, setUsageData] = useState(null)
  const [billingCycle, setBillingCycle] = useState('monthly') // 'monthly' | 'yearly'
  const [processingPlanId, setProcessingPlanId] = useState(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  // Fetch billing state
  const fetchData = async () => {
    try {
      setLoading(true)
      const [plansRes, myPlanRes, usageRes] = await Promise.all([
        apiClient.get('/subscription/plans'),
        apiClient.get('/subscription/my-plan'),
        apiClient.get('/subscription/usage'),
      ])

      if (plansRes.data?.success) setPlans(plansRes.data.data || [])
      if (myPlanRes.data?.success) setMySubscription(myPlanRes.data.data)
      if (usageRes.data?.success) setUsageData(usageRes.data.data)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to load subscription details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Listen for Stripe Checkout Return Redirects
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('session_id')
    const status = params.get('status')

    if (status === 'success' && sessionId) {
      const verifySession = async () => {
        try {
          toast.loading('Activating your subscription...', { id: 'stripe-verify' })
          const res = await apiClient.get(`/subscription/stripe/verify-session?sessionId=${sessionId}`)
          toast.dismiss('stripe-verify')
          if (res.data?.success) {
            toast.success('Subscription activated successfully via Stripe!')
            // Clean URL query parameters
            window.history.replaceState({}, document.title, window.location.pathname)
            fetchData()
          } else {
            toast.error(res.data?.message || 'Verification could not complete.')
          }
        } catch (err) {
          toast.dismiss('stripe-verify')
          toast.error(err?.response?.data?.message || 'Subscription activation encountered an issue.')
        }
      }
      verifySession()
    } else if (status === 'cancelled') {
      toast('Stripe checkout was cancelled.', { icon: 'ℹ️' })
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [])

  // Handle Plan Upgrade / Checkout via Stripe
  const handleSelectPlan = async (plan) => {
    if (!isAdmin) {
      toast.error('Only workspace administrators can manage billing.')
      return
    }

    // If it's already the current active plan
    const currentPlanName = mySubscription?.planId?.planName || usageData?.plan
    if (currentPlanName?.toLowerCase() === plan.planName?.toLowerCase()) {
      toast.info('You are already on this plan.')
      return
    }

    try {
      setProcessingPlanId(plan._id)

      // 1. Create Stripe Checkout Session on backend
      const res = await apiClient.post('/subscription/stripe/create-checkout-session', {
        planId: plan._id,
        billingCycle,
      })

      if (!res.data?.success) {
        toast.error(res.data?.message || 'Failed to initialize checkout.')
        return
      }

      // If switched to Free plan directly
      if (res.data.isFreePlan) {
        toast.success(res.data.message || 'Switched to Free plan.')
        await fetchData()
        return
      }

      // 2. Redirect to Stripe Hosted Checkout
      if (res.data.url) {
        toast.loading('Redirecting to secure Stripe Checkout...', { id: 'stripe-redirect' })
        window.location.href = res.data.url
        return
      }

      toast.error('Unable to retrieve checkout session URL.')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to start Stripe checkout.')
    } finally {
      setProcessingPlanId(null)
    }
  }

  // Handle Cancellation
  const handleCancelSubscription = async () => {
    try {
      setCancelling(true)
      const res = await apiClient.post('/subscription/cancel')
      if (res.data?.success) {
        toast.success(res.data.message || 'Subscription scheduled for cancellation.')
        setShowCancelModal(false)
        await fetchData()
      } else {
        toast.error(res.data?.message || 'Failed to cancel subscription.')
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to cancel subscription.')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" style={{ color: '#111827' }} />
        <p className="mt-3 text-muted" style={{ fontSize: '13px' }}>
          Loading subscription & billing details...
        </p>
      </Container>
    )
  }

  const currentPlan = mySubscription?.planId
  const status = mySubscription?.status || usageData?.status || 'trial'
  const isCancelledAtPeriodEnd = mySubscription?.cancelAtPeriodEnd || usageData?.cancelAtPeriodEnd

  return (
    <Container className="p-0 pb-5 container-lg mt-3">
      <Helmet>
        <title>Subscription & Billing — Clientmark</title>
      </Helmet>

      {/* Header */}
      <div className="mb-4">
        <h4 style={{ fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', marginBottom: '4px' }}>
          Subscription & Billing
        </h4>
        <p style={{ color: '#6B7280', fontSize: '13px', margin: 0 }}>
          Manage your agency plan, track live usage against limits, and view invoice history.
        </p>
      </div>

      {/* ─── Current Plan & Usage Summary ─── */}
      <Row className="g-3 mb-4">
        {/* Current Plan Overview */}
        <Col lg={5} md={12}>
          <Card
            style={{
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: '12px',
              height: '100%',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <Card.Body className="p-4 d-flex flex-column justify-content-between">
              <div>
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#6B7280', letterSpacing: '0.05em' }}>
                    Current Workspace Plan
                  </span>
                  <Badge
                    style={{
                      backgroundColor:
                        status === 'active' ? '#ECFDF5' : status === 'trial' ? '#FFFBEB' : '#FEF2F2',
                      color:
                        status === 'active' ? '#047857' : status === 'trial' ? '#B45309' : '#B91C1C',
                      border: '1px solid rgba(0,0,0,0.05)',
                      fontWeight: 600,
                      fontSize: '11px',
                      borderRadius: '20px',
                      padding: '4px 10px',
                    }}
                  >
                    {status === 'active' ? 'Active' : status === 'trial' ? 'Trial Period' : 'Past Due'}
                  </Badge>
                </div>

                <h2 style={{ fontSize: '26px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
                  {currentPlan?.planName || usageData?.plan || 'Free'}
                </h2>

                <p style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.5, marginBottom: '16px' }}>
                  {currentPlan?.description || 'Standard access tier for team collaboration and task tracking.'}
                </p>

                {mySubscription?.currentPeriodEnd && (
                  <div
                    style={{
                      backgroundColor: '#F9FAFB',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      color: '#4B5563',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '16px',
                    }}
                  >
                    <FiClock size={15} style={{ color: '#6B7280' }} />
                    <span>
                      Renewal Date:{' '}
                      <strong>
                        {new Date(mySubscription.currentPeriodEnd).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </strong>
                    </span>
                  </div>
                )}

                {isCancelledAtPeriodEnd && (
                  <div
                    style={{
                      backgroundColor: '#FFFBEB',
                      border: '1px solid #FDE68A',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#92400E',
                      marginBottom: '16px',
                      display: 'flex',
                      gap: '8px',
                    }}
                  >
                    <FiAlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <span>
                      Subscription is set to cancel at the end of the billing period. Your workspace will remain active until then.
                    </span>
                  </div>
                )}
              </div>

              {isAdmin && status === 'active' && !isCancelledAtPeriodEnd && (
                <div className="pt-2 border-top">
                  <Button
                    variant="link"
                    className="p-0 text-danger"
                    style={{ fontSize: '12.5px', textDecoration: 'none' }}
                    onClick={() => setShowCancelModal(true)}
                  >
                    Cancel Subscription
                  </Button>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Live Usage & Entitlement Limits */}
        <Col lg={7} md={12}>
          <Card
            style={{
              border: '1px solid rgba(0,0,0,0.08)',
              borderRadius: '12px',
              height: '100%',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <Card.Body className="p-4">
              <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#6B7280', letterSpacing: '0.05em' }}>
                Resource Usage & Limits
              </span>

              <Row className="g-3 mt-1">
                {/* Users */}
                <Col sm={6} xs={12}>
                  <div style={{ backgroundColor: '#F9FAFB', padding: '12px 14px', borderRadius: '8px' }}>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span style={{ fontSize: '12px', color: '#4B5563', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FiUsers size={14} /> Team Members
                      </span>
                      <strong style={{ fontSize: '12px', color: '#111827' }}>
                        {usageData?.usage?.users?.current ?? 0} /{' '}
                        {usageData?.usage?.users?.max === -1 ? '∞' : usageData?.usage?.users?.max ?? 3}
                      </strong>
                    </div>
                    {usageData?.usage?.users?.max !== -1 && (
                      <ProgressBar
                        now={Math.min(
                          100,
                          ((usageData?.usage?.users?.current || 0) / (usageData?.usage?.users?.max || 1)) * 100
                        )}
                        style={{ height: '5px', backgroundColor: '#E5E7EB' }}
                        variant={
                          ((usageData?.usage?.users?.current || 0) / (usageData?.usage?.users?.max || 1)) >= 0.9
                            ? 'danger'
                            : 'dark'
                        }
                      />
                    )}
                  </div>
                </Col>

                {/* Leads */}
                <Col sm={6} xs={12}>
                  <div style={{ backgroundColor: '#F9FAFB', padding: '12px 14px', borderRadius: '8px' }}>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span style={{ fontSize: '12px', color: '#4B5563', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FiInbox size={14} /> Leads
                      </span>
                      <strong style={{ fontSize: '12px', color: '#111827' }}>
                        {usageData?.usage?.leads?.current ?? 0} /{' '}
                        {usageData?.usage?.leads?.max === -1 ? '∞' : usageData?.usage?.leads?.max ?? 100}
                      </strong>
                    </div>
                    {usageData?.usage?.leads?.max !== -1 && (
                      <ProgressBar
                        now={Math.min(
                          100,
                          ((usageData?.usage?.leads?.current || 0) / (usageData?.usage?.leads?.max || 1)) * 100
                        )}
                        style={{ height: '5px', backgroundColor: '#E5E7EB' }}
                        variant={
                          ((usageData?.usage?.leads?.current || 0) / (usageData?.usage?.leads?.max || 1)) >= 0.9
                            ? 'danger'
                            : 'dark'
                        }
                      />
                    )}
                  </div>
                </Col>

                {/* Projects */}
                <Col sm={6} xs={12}>
                  <div style={{ backgroundColor: '#F9FAFB', padding: '12px 14px', borderRadius: '8px' }}>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span style={{ fontSize: '12px', color: '#4B5563', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FiFolder size={14} /> Active Projects
                      </span>
                      <strong style={{ fontSize: '12px', color: '#111827' }}>
                        {usageData?.usage?.projects?.current ?? 0} /{' '}
                        {usageData?.usage?.projects?.max === -1 ? '∞' : usageData?.usage?.projects?.max ?? 5}
                      </strong>
                    </div>
                    {usageData?.usage?.projects?.max !== -1 && (
                      <ProgressBar
                        now={Math.min(
                          100,
                          ((usageData?.usage?.projects?.current || 0) / (usageData?.usage?.projects?.max || 1)) * 100
                        )}
                        style={{ height: '5px', backgroundColor: '#E5E7EB' }}
                        variant={
                          ((usageData?.usage?.projects?.current || 0) / (usageData?.usage?.projects?.max || 1)) >= 0.9
                            ? 'danger'
                            : 'dark'
                        }
                      />
                    )}
                  </div>
                </Col>

                {/* Branches */}
                <Col sm={6} xs={12}>
                  <div style={{ backgroundColor: '#F9FAFB', padding: '12px 14px', borderRadius: '8px' }}>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span style={{ fontSize: '12px', color: '#4B5563', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FiGitBranch size={14} /> Branches
                      </span>
                      <strong style={{ fontSize: '12px', color: '#111827' }}>
                        {usageData?.usage?.branches?.current ?? 0} /{' '}
                        {usageData?.usage?.branches?.max === -1 ? '∞' : usageData?.usage?.branches?.max ?? 1}
                      </strong>
                    </div>
                    {usageData?.usage?.branches?.max !== -1 && (
                      <ProgressBar
                        now={Math.min(
                          100,
                          ((usageData?.usage?.branches?.current || 0) / (usageData?.usage?.branches?.max || 1)) * 100
                        )}
                        style={{ height: '5px', backgroundColor: '#E5E7EB' }}
                        variant="dark"
                      />
                    )}
                  </div>
                </Col>
              </Row>

              {/* Feature Entitlements Checklist */}
              <div className="mt-3 pt-3 border-top">
                <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#6B7280', letterSpacing: '0.05em' }}>
                  Enabled Feature Entitlements
                </span>
                <div className="d-flex flex-wrap gap-3 mt-2">
                  <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {usageData?.features?.whatsapp ? (
                      <FiCheck className="text-success" />
                    ) : (
                      <FiXCircle className="text-muted" />
                    )}
                    <span style={{ color: usageData?.features?.whatsapp ? '#111827' : '#9CA3AF' }}>
                      WhatsApp Messaging & OTP
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {usageData?.features?.reports ? (
                      <FiCheck className="text-success" />
                    ) : (
                      <FiXCircle className="text-muted" />
                    )}
                    <span style={{ color: usageData?.features?.reports ? '#111827' : '#9CA3AF' }}>
                      Reports & Excel Exports
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    {usageData?.features?.apiAccess ? (
                      <FiCheck className="text-success" />
                    ) : (
                      <FiXCircle className="text-muted" />
                    )}
                    <span style={{ color: usageData?.features?.apiAccess ? '#111827' : '#9CA3AF' }}>
                      API & Webhook Integrations
                    </span>
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* ─── Plan Switcher & Pricing Grid ─── */}
      <div className="mt-5 mb-4 text-center">
        <h4 style={{ fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', marginBottom: '8px' }}>
          Available Plans
        </h4>
        <p style={{ color: '#6B7280', fontSize: '13.5px', marginBottom: '20px' }}>
          Select the optimal tier for your agency size. Upgrade or switch at any time.
        </p>

        {/* Monthly / Yearly Toggle */}
        <div
          style={{
            display: 'inline-flex',
            backgroundColor: '#F3F4F6',
            borderRadius: '9999px',
            padding: '4px',
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            style={{
              border: 'none',
              borderRadius: '9999px',
              padding: '6px 18px',
              fontSize: '12.5px',
              fontWeight: billingCycle === 'monthly' ? 600 : 500,
              backgroundColor: billingCycle === 'monthly' ? '#FFFFFF' : 'transparent',
              color: billingCycle === 'monthly' ? '#111827' : '#6B7280',
              boxShadow: billingCycle === 'monthly' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('yearly')}
            style={{
              border: 'none',
              borderRadius: '9999px',
              padding: '6px 18px',
              fontSize: '12.5px',
              fontWeight: billingCycle === 'yearly' ? 600 : 500,
              backgroundColor: billingCycle === 'yearly' ? '#FFFFFF' : 'transparent',
              color: billingCycle === 'yearly' ? '#111827' : '#6B7280',
              boxShadow: billingCycle === 'yearly' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Annual
            <span
              style={{
                backgroundColor: '#ECFDF5',
                color: '#047857',
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '8px',
                fontWeight: 600,
              }}
            >
              Save 17%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <Row className="g-3 mb-5">
        {plans.map((plan) => {
          const currentPlanName = mySubscription?.planId?.planName || usageData?.plan
          const isCurrent = currentPlanName?.toLowerCase() === plan.planName?.toLowerCase()
          const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.price
          const isPopular = plan.slug === 'professional' || plan.planName === 'Professional'

          return (
            <Col lg={3} md={6} xs={12} key={plan._id}>
              <Card
                style={{
                  border: isPopular ? '2px solid #111827' : '1px solid rgba(0,0,0,0.08)',
                  borderRadius: '12px',
                  backgroundColor: '#FFFFFF',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  boxShadow: isPopular ? '0 8px 24px -4px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                {isPopular && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: '#111827',
                      color: '#FFFFFF',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      padding: '3px 12px',
                      borderRadius: '12px',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Most Popular
                  </div>
                )}

                <Card.Body className="p-4 d-flex flex-column justify-content-between">
                  <div>
                    <h5 style={{ fontWeight: 700, color: '#111827', fontSize: '18px', marginBottom: '4px' }}>
                      {plan.planName}
                    </h5>
                    <p style={{ fontSize: '12px', color: '#6B7280', minHeight: '36px', lineHeight: 1.4 }}>
                      {plan.description}
                    </p>

                    <div className="my-3">
                      <span style={{ fontSize: '28px', fontWeight: 800, color: '#111827' }}>
                        ₹{price.toLocaleString('en-IN')}
                      </span>
                      <span style={{ fontSize: '12px', color: '#6B7280' }}>
                        {price > 0 ? (billingCycle === 'yearly' ? ' / year' : ' / month') : ' forever'}
                      </span>
                    </div>

                    <div className="pt-3 border-top mb-4">
                      <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#6B7280', letterSpacing: '0.04em' }}>
                        What's included:
                      </span>
                      <ul style={{ listStyle: 'none', paddingLeft: 0, marginTop: '10px' }}>
                        {plan.features?.map((feat, idx) => (
                          <li
                            key={idx}
                            style={{
                              fontSize: '12.5px',
                              color: '#374151',
                              marginBottom: '8px',
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: '8px',
                              lineHeight: 1.4,
                            }}
                          >
                            <FiCheck size={14} className="text-success mt-0.5 flex-shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <Button
                    onClick={() => handleSelectPlan(plan)}
                    disabled={isCurrent || processingPlanId === plan._id || !isAdmin}
                    style={{
                      width: '100%',
                      backgroundColor: isCurrent ? '#F3F4F6' : isPopular ? '#111827' : '#FFFFFF',
                      borderColor: isCurrent ? '#E5E7EB' : '#111827',
                      color: isCurrent ? '#9CA3AF' : isPopular ? '#FFFFFF' : '#111827',
                      fontWeight: 600,
                      fontSize: '13px',
                      padding: '9px 16px',
                      borderRadius: '8px',
                      transition: 'all 0.15s ease',
                      boxShadow: isPopular && !isCurrent ? '0 2px 6px rgba(0,0,0,0.12)' : 'none',
                    }}
                  >
                    {processingPlanId === plan._id ? (
                      <Spinner size="sm" animation="border" />
                    ) : isCurrent ? (
                      'Current Plan'
                    ) : (
                      `Select ${plan.planName}`
                    )}
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          )
        })}
      </Row>

      {/* ─── Payment & Billing History Table ─── */}
      <div className="mt-5">
        <h5 style={{ fontWeight: 700, color: '#111827', letterSpacing: '-0.02em', marginBottom: '14px' }}>
          Payment & Billing History
        </h5>

        <div className="table-scroll-container">
          <table className="user-table table mb-0">
            <thead>
              <tr>
                <th>Date</th>
                <th>Order / Reference</th>
                <th>Payment ID</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {!mySubscription?.paymentHistory || mySubscription.paymentHistory.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-0 border-0">
                    <EmptyState
                      icon={FiCreditCard}
                      title="No payment history"
                      description="No payments or billing transactions recorded yet for this workspace."
                    />
                  </td>
                </tr>
              ) : (
                mySubscription.paymentHistory.map((item, index) => (
                  <tr key={index}>
                    <td>
                      {new Date(item.paidAt).toLocaleDateString('en-IN', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td>{item.orderId || '--'}</td>
                    <td>
                      <code style={{ fontSize: '11px', color: '#111827' }}>{item.transactionId || '--'}</code>
                    </td>
                    <td>
                      <strong>₹{(item.amount || 0).toLocaleString('en-IN')}</strong>
                    </td>
                    <td>
                      <span style={{ textTransform: 'uppercase', fontSize: '11px', color: '#4B5563' }}>
                        {item.method || 'Razorpay'}
                      </span>
                    </td>
                    <td>
                      <Badge
                        style={{
                          backgroundColor: item.status === 'success' ? '#ECFDF5' : '#FEF2F2',
                          color: item.status === 'success' ? '#047857' : '#B91C1C',
                          fontWeight: 600,
                          fontSize: '11px',
                          borderRadius: '12px',
                          padding: '3px 8px',
                        }}
                      >
                        {item.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Cancel Subscription Modal ─── */}
      <Modal show={showCancelModal} onHide={() => setShowCancelModal(false)} centered>
        <Modal.Header closeButton style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <Modal.Title style={{ fontSize: '16px', fontWeight: 600, color: '#111827' }}>
            Cancel Subscription
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-4">
          <p style={{ fontSize: '13.5px', color: '#374151', lineHeight: 1.5 }}>
            Are you sure you want to cancel your <strong>{currentPlan?.planName}</strong> subscription?
          </p>
          <div
            style={{
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '12.5px',
              color: '#92400E',
            }}
          >
            Your plan will remain active until the end of your current period on{' '}
            <strong>
              {mySubscription?.currentPeriodEnd
                ? new Date(mySubscription.currentPeriodEnd).toLocaleDateString()
                : 'renewal date'}
            </strong>
            . You will not be charged again.
          </div>
        </Modal.Body>
        <Modal.Footer style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <Button variant="light" onClick={() => setShowCancelModal(false)} style={{ fontSize: '13px' }}>
            Keep Subscription
          </Button>
          <Button
            variant="danger"
            onClick={handleCancelSubscription}
            disabled={cancelling}
            style={{ fontSize: '13px' }}
          >
            {cancelling ? <Spinner size="sm" animation="border" /> : 'Confirm Cancellation'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}

export default BillingPage
