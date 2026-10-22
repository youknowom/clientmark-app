import React, { useContext } from 'react'
import { CreditCard, Palette, Globe, MessageSquare, ShieldCheck } from 'lucide-react'
import { Helmet } from 'react-helmet'
import { AuthContext } from '../../AuthContext'
import { hasPermission } from '../../helpers/hasPermission'
import PageHeader from '../../components/mycomponent/PageHeader'
import PageMenus from '../../components/mycomponent/PageMenus'

function SettingMaster() {
  const { userData } = useContext(AuthContext)
  const pageHeaderData = {
    title: 'Setting Master',
    disc: 'Workspace Preferences, White-Label Branding, WhatsApp Credentials, and Billing',
  }

  const menus = [
    {
      icon: <CreditCard size={24} color="var(--cm-brand-500)" />,
      label: 'Subscription & Billing',
      link: '/billing',
      bg: 'var(--cm-brand-50)',
    },
    {
      icon: <Palette size={24} color="var(--cm-indigo-600, #4F46E5)" />,
      label: 'Theme & Brand Colors',
      link: '/theme-setting',
      bg: 'rgba(99, 102, 241, 0.1)',
      permission: 'view:theme-setting',
    },
    {
      icon: <Globe size={24} color="var(--cm-cyan-500, #06B6D4)" />,
      label: 'Site & Domain Config',
      link: '/site-setting',
      bg: 'rgba(6, 182, 212, 0.1)',
      permission: 'view:site-setting',
    },
    {
      icon: <MessageSquare size={24} color="#16A34A" />,
      label: 'WhatsApp Integration',
      link: '/whatsapp-setting',
      bg: 'rgba(22, 163, 74, 0.1)',
      permission: 'view:whatsapp-setting',
    },
    {
      icon: <ShieldCheck size={24} color="var(--cm-warning-600)" />,
      label: 'Roles & Permissions',
      link: '/all-role',
      bg: 'var(--cm-warning-50)',
      permission: 'view:role',
    },
  ]

  const filterMenus = menus.filter(
    (menu) => !menu.permission || hasPermission(userData, menu.permission)
  )

  return (
    <div>
      <Helmet>
        <title>Settings — Clientmark</title>
      </Helmet>
      <PageHeader pageHeaderData={pageHeaderData} />
      <PageMenus menus={filterMenus} />
    </div>
  )
}

export default SettingMaster
