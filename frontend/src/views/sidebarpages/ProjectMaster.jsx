import React, { useContext, useEffect } from 'react'
import { FolderPlus, FolderKanban } from 'lucide-react'
import { Helmet } from 'react-helmet'
import { AuthContext } from '../../AuthContext'
import { hasPermission } from '../../helpers/hasPermission'
import { clearListState } from '../../helpers/listStateStorage'
import PageHeader from '../../components/mycomponent/PageHeader'
import PageMenus from '../../components/mycomponent/PageMenus'

function ProjectMaster() {
  const { userData } = useContext(AuthContext)
  const pageHeaderData = {
    title: 'Project Master',
    disc: 'Project Delivery Management including Milestones, Tasks, Timelines, and Client Handover Portals',
  }

  const menus = [
    {
      icon: <FolderPlus size={24} color="var(--cm-brand-500)" />,
      label: 'Add Project',
      link: '/add-project',
      bg: 'var(--cm-brand-50)',
      permission: 'add:project',
    },
    {
      icon: <FolderKanban size={24} color="var(--cm-indigo-600, #4F46E5)" />,
      label: 'All Projects',
      link: '/all-project',
      bg: 'rgba(99, 102, 241, 0.1)',
      permission: 'view:project',
    },
  ]

  const filterMenus = menus.filter((menu) => hasPermission(userData, menu.permission))

  useEffect(() => {
    clearListState('ALL_PROJECT')
  }, [])

  return (
    <div>
      <Helmet>
        <title>Project Management — Clientmark</title>
      </Helmet>
      <PageHeader pageHeaderData={pageHeaderData} />
      <PageMenus menus={filterMenus} />
    </div>
  )
}

export default ProjectMaster
