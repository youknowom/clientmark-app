import React, { useContext } from 'react'
import { Col, Container, Row } from 'react-bootstrap'
import { PiUsersThree } from 'react-icons/pi'
import { PiGitBranchBold } from 'react-icons/pi'
import { FaUserShield } from 'react-icons/fa6'

import { Helmet } from 'react-helmet'

const PageHeader = React.lazy(() => import('../../components/mycomponent/PageHeader'))
const PageMenus = React.lazy(() => import('../../components/mycomponent/PageMenus'))

import { AuthContext } from '../../AuthContext'
import { hasPermission } from '../../helpers/hasPermission'
import '../sidebarCSS/comStyle.css'

function UserMaster() {
  const { userData } = useContext(AuthContext)
  const pageHeaderData = {
    // imgPath: userImg,
    title: 'User Master',
    disc: 'User Management including Registration, Listing, and Reporting',
    className: 'p-2',
  }

  const menus = [
    {
      icon: <PiGitBranchBold size={30} className="text-success" />,
      label: 'Branch',
      link: '/all-branch',
      bg: 'rgba(212, 237, 218, 0.6)',
      permission: 'view:branch',
    },

    {
      icon: <PiUsersThree size={30} className="text-success" />,
      label: 'User Management',
      link: '/all-user',
      bg: 'rgba(212, 237, 218, 0.6)',
      permission: 'view:user',
    },
    {
      icon: <FaUserShield size={30} className="text-success" />,
      label: 'Role & Permission',
      link: '/all-role',
      bg: 'rgba(220, 220, 255, 0.6)',
      permission: 'view:role',
    },
  ]

  const filterMenus = menus.filter((menu) => hasPermission(userData, menu.permission))

  return (
    <Container className="p-0 pb-4 container-lg mt-2">
      <Helmet>
        <title>Users — Clientmark</title>
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

export default UserMaster
