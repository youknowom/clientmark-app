import React, { useContext, useEffect } from 'react'
import { PhoneCall, Award, TrendingUp, FolderCheck, MessageSquare } from 'lucide-react'
import { Helmet } from 'react-helmet'
import { AuthContext } from '../../AuthContext'
import { hasPermission } from '../../helpers/hasPermission'
import { clearListState } from '../../helpers/listStateStorage'
import PageHeader from '../../components/mycomponent/PageHeader'
import PageMenus from '../../components/mycomponent/PageMenus'

function ReportMaster() {
  const { userData } = useContext(AuthContext)
  const pageHeaderData = {
    title: 'Report Master',
    disc: 'Executive and Operational Analytics: Telecaller Metrics, BDE Velocity, Pipeline Conversions, and Delivery Status',
  }

  const menus = [
    {
      icon: <PhoneCall size={24} color="var(--cm-brand-500)" />,
      label: 'Telecaller Lead Report',
      link: '/telecaller-lead-report',
      bg: 'var(--cm-brand-50)',
      permission: 'view:telecaller-lead-report',
    },
    {
      icon: <Award size={24} color="var(--cm-indigo-600, #4F46E5)" />,
      label: 'BDE Performance Report',
      link: '/bde-lead-report',
      bg: 'rgba(99, 102, 241, 0.1)',
      permission: 'view:bde-lead-report',
    },
    {
      icon: <TrendingUp size={24} color="var(--cm-success-600)" />,
      label: 'Lead Conversion Report',
      link: '/lead-status-report',
      bg: 'var(--cm-success-50)',
      permission: 'view:lead-status-report',
    },
    {
      icon: <FolderCheck size={24} color="var(--cm-cyan-500, #06B6D4)" />,
      label: 'Project Delivery Report',
      link: '/project-status-report',
      bg: 'rgba(6, 182, 212, 0.1)',
      permission: 'view:project-status-report',
    },
    {
      icon: <MessageSquare size={24} color="#16A34A" />,
      label: 'WhatsApp Chat Logs',
      link: '/whatsapp-chat-record',
      bg: 'rgba(22, 163, 74, 0.1)',
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
    <div>
      <Helmet>
        <title>Reports — Clientmark</title>
      </Helmet>
      <PageHeader pageHeaderData={pageHeaderData} />
      <PageMenus menus={filterMenus} />
    </div>
  )
}

export default ReportMaster
