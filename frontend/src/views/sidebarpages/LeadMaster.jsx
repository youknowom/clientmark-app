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

function LeadMaster() {
  const { userData } = useContext(AuthContext)
  const pageHeaderData = {
    // imgPath: userImg,
    title: 'Lead Master',
    disc: 'Lead Management including Registration, Listing, and Reporting',
    className: 'p-2',
  }

  const menus = [
    {
      icon: <FiFilePlus size={30} className="text-success" />,
      label: 'Add Lead',
      link: '/add-lead',
      bg: 'rgba(212, 237, 218, 0.6)',
      permission:'add:lead'
    },
    {
      icon: <HiOutlineClipboardDocumentList size={30} className="text-success" />,
      label: 'All Lead',
      link: '/all-lead',
      bg: 'rgba(212, 237, 218, 0.6)',
      permission:'view:lead'
    },
  ]

  const filterMenus = menus.filter((menu) => hasPermission(userData, menu.permission))

  useEffect(() => {
     clearListState('ALL_PROJECT')
   }, [])

  return (
    <Container className="p-0 pb-4 container-lg mt-2">
      <Helmet>
        <title>Lead Management — Clientmark</title>
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

export default LeadMaster
