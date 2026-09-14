import React, { useContext, useEffect } from 'react'
import { Col, Container, Row } from 'react-bootstrap'
import { Helmet } from 'react-helmet'
import { MdOutlineLeaderboard } from 'react-icons/md'
import { TbStatusChange } from 'react-icons/tb'
import { RiProjectorLine } from "react-icons/ri";

const PageHeader = React.lazy(() => import('../../components/mycomponent/PageHeader'))
const PageMenus = React.lazy(() => import('../../components/mycomponent/PageMenus'))

import { AuthContext } from '../../AuthContext'
import { hasPermission } from '../../helpers/hasPermission'
import { HiOutlineClipboardDocumentList } from 'react-icons/hi2'
import { clearListState } from '../../helpers/listStateStorage'
import { FaWhatsapp } from 'react-icons/fa'

function ReportMaster() {
  const { userData } = useContext(AuthContext)
  const pageHeaderData = {
    // imgPath: userImg,
    title: 'Report Master',
    disc: 'Lead Management including Registration, Listing, and Reporting',
    className: 'p-2',
  }

  const menus = [
    {
      icon: <HiOutlineClipboardDocumentList size={30} className="text-success" />,
      label: 'Telecaller Lead Report',
      link: '/telecaller-lead-report',
      bg: 'rgba(212, 237, 218, 0.6)',
      permission: 'view:telecaller-lead-report',
    },
    {
      icon: <MdOutlineLeaderboard size={30} className="text-info" />,
      label: 'BDE Lead Report',
      link: '/bde-lead-report',
      bg: 'rgba(212, 237, 218, 0.6)',
      permission: 'view:bde-lead-report',
    },
    {
      icon: <TbStatusChange size={30} className="text-info" />,
      label: 'Lead Status Report',
      link: '/lead-status-report',
      bg: 'rgba(212, 237, 218, 0.6)',
      permission: 'view:lead-status-report',
    },
    {
      icon: <RiProjectorLine size={30} className="text-success" />,
      label: 'Project Status Report',
      link: '/project-status-report',
      bg: 'rgba(212, 237, 218, 0.6)',
      permission: 'view:project-status-report',
    },
    {
      icon: <FaWhatsapp size={30} className="text-success" />,
      label: 'WhatsApp Chat Logs',
      link: '/whatsapp-chat-record',
      bg: 'rgba(207, 226, 243, 0.6)',
      permission: 'view:whatsapp-chat-record',
    },
  ]

  const filterMenus = menus.filter((menu) => hasPermission(userData, menu.permission))

  useEffect(() => {
    clearListState('ALL_TICKET_LIST')
    clearListState('BDE_LEAD_REPORT_LIST')
    clearListState('TC_LEAD_REPORT_LIST')
    clearListState('LEAD_STATUS_REPORT_LIST')
  }, [])

  return (
    <Container className="p-0 pb-4 container-lg mt-2">
      <Helmet>
        <title>Reports — Clientmark</title>
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

export default ReportMaster
