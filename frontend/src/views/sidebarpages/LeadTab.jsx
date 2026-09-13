import React, { useState, useEffect, Suspense, useContext } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Container, Button, Spinner, Card } from 'react-bootstrap'
import { GrDocumentUpdate, GrDocumentPerformance } from 'react-icons/gr'
import { RiCustomerService2Fill } from 'react-icons/ri'
import { FiFileText } from 'react-icons/fi'
import { AuthContext } from '../../AuthContext'

const AddLead = React.lazy(() => import('../sidebarpages/AddLead'))
const AssignAndProgress = React.lazy(() => import('../sidebarpages/AssignAndProgress'))

import '../sidebarCSS/leadTab.css'

const LeadTab = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { userData } = useContext(AuthContext)
  const params = new URLSearchParams(location.search)
  const queryTab = params.get('tab') || 'addLead'

  const [editData, setEditData] = useState(() => {
    const fromState = location.state?.user
    const fromSession = sessionStorage.getItem('editData')
    return fromState || (fromSession ? JSON.parse(fromSession) : null)
  })

  const comeFrom = location.state?.comeFrom || sessionStorage.getItem('comeFrom')
  const [activeTab, setActiveTab] = useState(queryTab)

  const tabs = [
    {
      key: 'addLead',
      label: 'Update',
      icon: <FiFileText />,
    },
    {
      key: 'progress',
      label: 'Progress',
      icon: <GrDocumentPerformance />,
    },
  ]

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'addLead':
        return <AddLead editData={editData} setEditData={setEditData} />
      case 'progress':
        return <AssignAndProgress leadId={editData._id} />
      default:
        return <AddLead />
    }
  }

  useEffect(() => {
    if (editData) sessionStorage.setItem('editData', JSON.stringify(editData))
    if (comeFrom) sessionStorage.setItem('comeFrom', comeFrom)
  }, [editData, comeFrom])

  useEffect(() => {
    navigate(`?tab=${activeTab}`, { replace: true })
  }, [activeTab])

  return (
    <Container className="mt-4 container-lg p-0">
      <Card className="d-flex justify-content-start align-items-center flex-nowrap tab-container p-0 tabCol py-1">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            variant="light"
            className={`tab-button ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <div className="tab-icon">{tab.icon}</div>
            <div className="tab-label">{tab.label}</div>
          </Button>
        ))}
      </Card>

      <div className="tab-content-area mt-4">
        <Suspense
          fallback={
            <div className="text-center my-4">
              <Spinner animation="border" variant="primary" />
            </div>
          }
        >
          {renderActiveTab()}
        </Suspense>
      </div>
    </Container>
  )
}

export default LeadTab
