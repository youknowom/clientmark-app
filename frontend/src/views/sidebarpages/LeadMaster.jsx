import React, { useContext, useEffect } from 'react'
import { PlusCircle, ClipboardList } from 'lucide-react'
import { Helmet } from 'react-helmet'
import { AuthContext } from '../../AuthContext'
import { hasPermission } from '../../helpers/hasPermission'
import { clearListState } from '../../helpers/listStateStorage'
import PageHeader from '../../components/mycomponent/PageHeader'
import PageMenus from '../../components/mycomponent/PageMenus'

function LeadMaster() {
  const { userData } = useContext(AuthContext)
  const pageHeaderData = {
    title: 'Lead Master',
    disc: 'Lead Management including Intake, Kanban Staging, Assignment, and WhatsApp Logs',
  }

  const menus = [
    {
      icon: <PlusCircle size={24} color="var(--cm-brand-500)" />,
      label: 'Add Lead',
      link: '/add-lead',
      bg: 'var(--cm-brand-50)',
      permission: 'add:lead',
    },
    {
      icon: <ClipboardList size={24} color="var(--cm-success-600)" />,
      label: 'All Leads',
      link: '/all-lead',
      bg: 'var(--cm-success-50)',
      permission: 'view:lead',
    },
  ]

  const filterMenus = menus.filter((menu) => hasPermission(userData, menu.permission))

  useEffect(() => {
    clearListState('ALL_PROJECT')
  }, [])

  return (
    <div>
      <Helmet>
        <title>Lead Management — Clientmark</title>
      </Helmet>
      <PageHeader pageHeaderData={pageHeaderData} />
      <PageMenus menus={filterMenus} />
    </div>
  )
}

export default LeadMaster
