import React, { useContext, useEffect } from 'react'
import { Col, Container, Row } from 'react-bootstrap'
import { FiFilePlus } from 'react-icons/fi'
import { Helmet } from 'react-helmet'

const PageHeader = React.lazy(() => import('../../components/mycomponent/PageHeader'))
const PageMenus = React.lazy(() => import('../../components/mycomponent/PageMenus'))

import { AuthContext } from '../../AuthContext'
import { hasPermission } from '../../helpers/hasPermission'
import { HiOutlineClipboardDocumentList } from 'react-icons/hi2'
import { clearListState } from '../../helpers/listStateStorage'
// import '../sidebarCSS/comStyle.css'

function ProjectMaster() {
  const { userData } = useContext(AuthContext)
  const pageHeaderData = {
    // imgPath: userImg,
    title: 'Project Master',
    disc: 'Project Management including Registration, Listing, and Reporting',
    className: 'p-2',
  }

  const menus = [
    {
      icon: <FiFilePlus size={30} className="text-success" />,
      label: 'Add Project',
      link: '/add-project',
      bg: 'rgba(212, 237, 218, 0.6)',
      permission: 'add:project',
    },
    {
      icon: <HiOutlineClipboardDocumentList size={30} className="text-success" />,
      label: 'All Project',
      link: '/all-project',
      bg: 'rgba(212, 237, 218, 0.6)',
      permission: 'view:project',
    },
  ]

  const filterMenus = menus.filter((menu) => hasPermission(userData, menu.permission))

  useEffect(() => {
    clearListState('ALL_PROJECT')
  }, [])

  return (
    <Container className="p-0 pb-4 container-lg mt-2">
      <Helmet>
        <title>Project Management — Clientmark</title>
      </Helmet>
      <Row>
        <Col>
          <PageHeader pageHeaderData={pageHeaderData} />
        </Col>
      </Row>
      <Row>
        <Col>
          {/* <h6 className="mt-2">Menus</h6> */}
          <PageMenus menus={filterMenus} />
        </Col>
      </Row>
    </Container>
  )
}

export default ProjectMaster
