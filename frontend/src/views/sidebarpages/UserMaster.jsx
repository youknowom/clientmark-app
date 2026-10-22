import React, { useContext } from 'react'
import { GitBranch, Users, ShieldCheck } from 'lucide-react'
import { Helmet } from 'react-helmet'
import { AuthContext } from '../../AuthContext'
import { hasPermission } from '../../helpers/hasPermission'
import PageHeader from '../../components/mycomponent/PageHeader'
import PageMenus from '../../components/mycomponent/PageMenus'

function UserMaster() {
  const { userData } = useContext(AuthContext)
  const pageHeaderData = {
    title: 'User Master',
    disc: 'User Administration including Branches, Staff Accounts, and Granular RBAC Permissions',
  }

  const menus = [
    {
      icon: <GitBranch size={24} color="var(--cm-brand-500)" />,
      label: 'Branches',
      link: '/all-branch',
      bg: 'var(--cm-brand-50)',
      permission: 'view:branch',
    },
    {
      icon: <Users size={24} color="var(--cm-success-600)" />,
      label: 'Staff Users',
      link: '/all-user',
      bg: 'var(--cm-success-50)',
      permission: 'view:user',
    },
    {
      icon: <ShieldCheck size={24} color="var(--cm-indigo-600, #4F46E5)" />,
      label: 'Roles & Permissions',
      link: '/all-role',
      bg: 'rgba(99, 102, 241, 0.1)',
      permission: 'view:role',
    },
  ]

  const filterMenus = menus.filter((menu) => hasPermission(userData, menu.permission))

  return (
    <div>
      <Helmet>
        <title>Users — Clientmark</title>
      </Helmet>
      <PageHeader pageHeaderData={pageHeaderData} />
      <PageMenus menus={filterMenus} />
    </div>
  )
}

export default UserMaster
