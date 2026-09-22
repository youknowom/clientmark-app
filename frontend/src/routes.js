import React from 'react'

//====DASHBOARD====//
const Dashboard = React.lazy(() => import('./views/sidebarpages/Dashboard'))
const AdminDashboard = React.lazy(() => import('./views/sidebarpages/AdminDashboard'))

//====LEADS====//
const LeadMaster = React.lazy(() => import('./views/sidebarpages/LeadMaster'))
const AddLead = React.lazy(() => import('./views/sidebarpages/AddLead'))
const AllLead = React.lazy(() => import('./views/sidebarpages/AllLead'))
const LeadTab = React.lazy(() => import('./views/sidebarpages/LeadTab'))

//===PROJECT===//
const ProjectMaster = React.lazy(() => import('./views/sidebarpages/ProjectMaster'))
const AddProject = React.lazy(() => import('./views/sidebarpages/AddProject'))
const AllProject = React.lazy(() => import('./views/sidebarpages/AllProject'))
const ProjectDetails = React.lazy(() => import('./views/sidebarpages/ProjectDetails'))
const ProjectPreview = React.lazy(() => import('./views/sidebarpages/ProjectPreview'))

//====USER====//
const UserMaster = React.lazy(() => import('./views/sidebarpages/UserMaster'))
const AllBranch = React.lazy(() => import('./views/sidebarpages/AllBranch'))
const RolePermission = React.lazy(() => import('./views/sidebarpages/RolePermission'))
const AllUser = React.lazy(() => import('./views/sidebarpages/AllUser'))
const AddUser = React.lazy(() => import('./views/sidebarpages/AddUser'))
const UserProfile = React.lazy(() => import('./views/sidebarpages/UserProfile'))

//====SETTING====//
const SettingMaster = React.lazy(() => import('./views/sidebarpages/SettingMaster'))
const ThemeSetting = React.lazy(() => import('./views/sidebarpages/ThemeSetting'))
const SiteSetting = React.lazy(() => import('./views/sidebarpages/SiteSetting'))
const WhatsappSetting = React.lazy(() => import('./views/sidebarpages/WhatsappSetting'))
const WhatsappchatRecord = React.lazy(() => import('./views/sidebarpages/WhatsappchatRecord'))
const BillingPage = React.lazy(() => import('./views/sidebarpages/BillingPage'))

//====REPORT====//
const ReportMaster = React.lazy(() => import('./views/sidebarpages/ReportMaster'))
const TelecallerLeadReport = React.lazy(() => import('./views/sidebarpages/TelecallerLeadReport'))
const BdeLeadReport = React.lazy(() => import('./views/sidebarpages/BdeLeadReport'))
const LeadStatusReport = React.lazy(() => import('./views/sidebarpages/LeadStatusReport'))
const ProjectStatusReport = React.lazy(() => import('./views/sidebarpages/ProjectStatusReport'))

const routes = [
  //DASHBOARD
  {
    path: '/dashboard',
    name: 'Dashboard',
    element: Dashboard,
    permission: 'view:dashboard-master',
  },
  {
    path: '/admin-dashboard',
    name: 'Admin Dashboard',
    element: AdminDashboard,
    permission: 'view:dashboard-master',
  },

  //LEADS
  {
    path: '/lead-master',
    name: 'Lead Master',
    element: LeadMaster,
    permission: 'view:lead-master',
  },
  {
    path: '/add-lead',
    name: 'Add Lead',
    element: AddLead,
    permission: 'add:lead',
  },
  {
    path: '/all-lead',
    name: 'All Lead',
    element: AllLead,
    permission: 'view:lead',
  },
  {
    path: '/lead-tab',
    name: 'Lead Tab',
    element: LeadTab,
    permission: 'view:lead-master',
  },
  //PROJECT
  {
    path: '/project-master',
    name: 'Project Master',
    element: ProjectMaster,
    permission: 'view:project-master',
  },
  {
    path: '/add-project',
    name: 'Add Project',
    element: AddProject,
    permission: 'add:project',
  },
  {
    path: '/project-details',
    name: 'Project Details',
    element: ProjectDetails,
    permission: 'view:project-master',
  },
  {
    path: '/project-preview/:projectId',
    name: 'Project Preview',
    element: ProjectPreview,
    // No permission required for preview, or set as needed
  },
  {
    path: '/all-project',
    name: 'All Project',
    element: AllProject,
    permission: 'view:project',
  },

  //USER
  {
    path: '/user-master',
    name: 'User Master',
    element: UserMaster,
    permission: 'view:user-master',
  },
  { path: '/all-branch', name: 'All Branch', element: AllBranch, permission: 'view:branch' },

  {
    path: '/all-role',
    name: 'Role & Permission',
    element: RolePermission,
    permission: 'view:role',
  },
  {
    path: '/all-user',
    name: 'All Users',
    element: AllUser,
    permission: 'view:user',
  },
  { path: '/add-user', name: 'Add User', element: AddUser, permission: 'add:user' },
  { path: '/user-profile', name: 'User Profile', element: UserProfile, permission: 'view:profile' },

  //SETTING
  {
    path: '/setting-master',
    name: 'Setting Master',
    element: SettingMaster,
    permission: 'view:setting-master',
  },
  {
    path: '/theme-setting',
    name: 'Theme Setting',
    element: ThemeSetting,
    permission: 'view:theme-setting',
  },
  {
    path: '/site-setting',
    name: 'Site Setting',
    element: SiteSetting,
    permission: 'view:site-setting',
  },

  {
    path: '/whatsapp-setting',
    name: 'WhatsApp Setting',
    element: WhatsappSetting,
    permission: 'view:whatsapp-setting',
  },


  //REPORT
  {
    path: '/report-master',
    name: 'Report Master',
    element: ReportMaster,
    permission: 'view:report-master',
  },
  {
    path: '/telecaller-lead-report',
    name: 'Telecaller Lead Report',
    element: TelecallerLeadReport,
    permission: 'view:telecaller-lead-report',
  },
  {
    path: '/bde-lead-report',
    name: 'BDE Lead Report',
    element: BdeLeadReport,
    permission: 'view:bde-lead-report',
  },
  {
    path: '/lead-status-report',
    name: 'Lead Status Report',
    element: LeadStatusReport,
    permission: 'view:lead-status-report',
  },
  {
    path: '/project-status-report',
    name: 'Project Status Report',
    element: ProjectStatusReport,
    permission: 'view:project-status-report',
  },
  {
    path: '/whatsapp-chat-record',
    name: 'Whatsapp chat log',
    element: WhatsappchatRecord,
    permission: 'view:whatsapp-chat-record',
  },
  {
    path: '/billing',
    name: 'Subscription & Billing',
    element: BillingPage,
  },
]

export default routes
