import React, { useContext } from 'react'
import { Col, Container, Row } from 'react-bootstrap'
import { CgWebsite } from 'react-icons/cg'
import { IoColorPaletteOutline } from 'react-icons/io5'
import { FaWhatsapp, FaUserShield } from 'react-icons/fa6'

import { Helmet } from 'react-helmet'

const PageHeader = React.lazy(() => import('../../components/mycomponent/PageHeader'))
const PageMenus = React.lazy(() => import('../../components/mycomponent/PageMenus'))

import { AuthContext } from '../../AuthContext'
import { hasPermission } from '../../helpers/hasPermission'
import '../sidebarCSS/comStyle.css'

function SettingMaster() {
  const { userData } = useContext(AuthContext)
  const pageHeaderData = {
    title: 'Setting Master',
    disc: 'User Management including Registration, Listing, and Reporting',
    className: 'p-2',
  }

  const menus = [
    {
      icon: <IoColorPaletteOutline size={30} className="text-success" />,
      label: 'Theme Setting',
      link: '/theme-setting',
      bg: 'rgba(212, 237, 218, 0.6)',
      permission: 'view:theme-setting',
    },

    {
      icon: <CgWebsite size={30} className="text-success" />,
      label: 'Site Setting',
      link: '/site-setting',
      bg: 'rgba(207, 226, 243, 0.6)',
      permission: 'view:site-setting',
    },
    {
      icon: <FaWhatsapp size={30} className="text-success" />,
      label: 'WhatsApp Setting',
      link: '/whatsapp-setting',
      bg: 'rgba(207, 226, 243, 0.6)',
      permission: 'view:whatsapp-setting',
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
        <title>BH - Site Setting</title>
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

export default SettingMaster
