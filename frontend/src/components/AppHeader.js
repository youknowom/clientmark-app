import React, { useState, useContext } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import Cookies from 'js-cookie'
import {
  Menu as MenuIcon,
  ArrowLeft,
  User,
  CreditCard,
  LogOut,
  ChevronDown,
  Plus,
  Compass,
} from 'lucide-react'
import { AuthContext } from '../AuthContext'
import NotificationPanel from '../views/sidebarpages/NotificationsPanel'
import SetupGuide from './SetupGuide'
import OnboardingWizard from './OnboardingWizard'
import { Menu, MenuItem, MenuSeparator } from './ui/Menu'
import { ThemeToggle } from './ui/ThemeToggle'
import { Button } from './ui/Button'
import { cn } from '../lib/utils'

export const AppHeader = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { userData } = useContext(AuthContext)
  const dispatch = useDispatch()
  const sidebarShow = useSelector((state) => state.sidebarShow)

  const [showSetupDrawer, setShowSetupDrawer] = useState(false)
  const [showWizard, setShowWizard] = useState(false)

  const handleLogout = () => {
    Cookies.remove('token')
    localStorage.clear()
    navigate('/login')
  }

  const userInitial = userData?.fullName?.charAt(0)?.toUpperCase() || 'U'
  const userRole = userData?.roleId?.roleName || 'Team Member'

  return (
    <>
      <header
        className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border/80 bg-card/80 backdrop-blur-md px-4 sm:px-6 transition-colors"
        role="banner"
      >
        {/* ── Left Actions ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-2.5">
          {/* Sidebar Toggle Button */}
          <button
            type="button"
            onClick={() => dispatch({ type: 'set', sidebarShow: !sidebarShow })}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/80 bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shadow-xs"
            aria-label="Toggle Navigation Sidebar"
          >
            <MenuIcon size={18} />
          </button>

          {/* Back Button (shown on sub-pages) */}
          {location.pathname !== '/dashboard' && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/80 bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shadow-xs"
              aria-label="Go Back"
              title="Go Back"
            >
              <ArrowLeft size={16} />
            </button>
          )}
        </div>

        {/* ── Right Actions ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          {/* Quick Action: New Lead */}
          <Link to="/add-lead" className="hidden md:inline-flex no-underline">
            <Button size="sm" pill leftIcon={<Plus size={14} />}>
              New Lead
            </Button>
          </Link>

          {/* HubSpot-style Setup Guide Button */}
          <button
            type="button"
            onClick={() => setShowSetupDrawer(true)}
            title="Open Setup Guide"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/80 bg-background hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors shadow-xs cursor-pointer"
          >
            <Compass size={14} className="text-primary" />
            <span className="hidden sm:inline">Setup Guide</span>
          </button>

          {/* Real-Time Notifications Panel */}
          <NotificationPanel />

          {/* Theme Toggle (Light / Dark) */}
          <ThemeToggle size="sm" />

          {/* User Profile Menu */}
          <Menu
            align="end"
            trigger={
              <button
                type="button"
                className="inline-flex items-center gap-2 py-1 pl-1.5 pr-2.5 rounded-full border border-border/80 bg-background hover:bg-muted/80 text-foreground transition-colors cursor-pointer shadow-xs focus:outline-none"
                aria-label="User profile menu"
              >
                {/* User Avatar Circle */}
                <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center flex-shrink-0 shadow-xs">
                  {userInitial}
                </div>

                <div className="hidden sm:flex flex-col items-start leading-tight">
                  <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                    {userData?.fullName || 'User'}
                  </span>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {userRole}
                  </span>
                </div>

                <ChevronDown size={13} className="text-muted-foreground ml-0.5" />
              </button>
            }
          >
            {/* Header info inside dropdown */}
            <div className="px-3 py-2 border-b border-border/50">
              <div className="text-xs font-bold text-foreground">
                {userData?.fullName || 'My Account'}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {userData?.email || ''}
              </div>
            </div>

            <MenuItem
              icon={<User size={14} className="text-muted-foreground" />}
              onClick={() => navigate('/user-profile')}
            >
              Update Profile
            </MenuItem>

            <MenuItem
              icon={<CreditCard size={14} className="text-muted-foreground" />}
              onClick={() => navigate('/billing')}
            >
              Billing & Subscriptions
            </MenuItem>

            <MenuSeparator />

            <MenuItem
              danger
              icon={<LogOut size={14} />}
              onClick={handleLogout}
            >
              Sign out
            </MenuItem>
          </Menu>
        </div>
      </header>

      {/* Setup Guide Drawer */}
      <SetupGuide
        isOpen={showSetupDrawer}
        onClose={() => setShowSetupDrawer(false)}
        onOpenWizard={() => {
          setShowSetupDrawer(false)
          setShowWizard(true)
        }}
      />

      {/* Onboarding Wizard Modal */}
      <OnboardingWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onComplete={() => setShowWizard(false)}
      />
    </>
  )
}

export default React.memo(AppHeader)
