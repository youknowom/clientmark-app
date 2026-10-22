import React, { useContext, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { NavLink, Link } from 'react-router-dom'
import { X } from 'lucide-react'
import apiClient, { BASE_URL } from '../api/axiosClient'
import { AuthContext } from '../AuthContext'
import { socket } from '../socket/socket'
import useNavItems from '../_nav'
import { syncFaviconFromSettings } from '../helpers/dynamicFavicon'
import { ClientmarkLogo } from './brand/ClientmarkLogo'
import { cn } from '../lib/utils'

export const AppSidebar = () => {
  const { siteSetting, setSiteSetting } = useContext(AuthContext)
  const dispatch = useDispatch()
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const navItems = useNavItems()

  const mainLogoUrl = siteSetting?.mainLogo ? `${BASE_URL}${siteSetting.mainLogo}` : null

  const getSiteSetting = async () => {
    try {
      const response = await apiClient.get('/software-setting/get-site-setting')
      const respData = response?.data?.data
      setSiteSetting({
        logoWidth: respData?.logoWidth,
        logoHeight: respData?.logoHeight,
        projectName: respData?.projectName,
        mainLogo: respData?.mainLogo,
        favicon: respData?.favicon,
      })
      syncFaviconFromSettings(respData)
    } catch (error) {
      console.error('Failed to load site setting:', error)
    }
  }

  useEffect(() => {
    getSiteSetting()
  }, [])

  useEffect(() => {
    if (!socket) return
    const handleUpdate = () => {
      getSiteSetting()
    }
    socket.on('site-setting:updated', handleUpdate)
    return () => socket.off('site-setting:updated', handleUpdate)
  }, [socket])

  const closeSidebar = () => {
    dispatch({ type: 'set', sidebarShow: false })
  }

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity lg:hidden',
          sidebarShow ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      {/* Main Sidebar Shell */}
      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-40 w-64 flex flex-col bg-card border-r border-border/80 shadow-sm transition-transform duration-200 ease-in-out',
          sidebarShow ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        aria-label="Application Sidebar"
      >
        {/* Header / Brand Logo */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-border/60 bg-card/60 backdrop-blur-sm flex-shrink-0">
          <Link
            to="/dashboard"
            className="flex items-center gap-2.5 overflow-hidden no-underline focus:outline-none"
          >
            {mainLogoUrl ? (
              <img
                src={mainLogoUrl}
                alt={siteSetting?.projectName || 'Clientmark'}
                className="h-8 max-w-[160px] object-contain block"
              />
            ) : (
              <ClientmarkLogo size={28} />
            )}
          </Link>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={closeSidebar}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden transition-colors"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items List */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
          <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Platform Menu
          </div>
          {navItems.map((item, index) => (
            <NavLink
              key={item.to || index}
              to={item.to}
              onClick={() => {
                if (window.innerWidth <= 991) {
                  closeSidebar()
                }
              }}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 no-underline',
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold shadow-xs'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex items-center justify-center transition-colors',
                      isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                    )}
                  >
                    {item.icon}
                  </span>
                  <span className="truncate">{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer info badge */}
        <div className="p-3.5 border-t border-border/60 bg-muted/20">
          <div className="flex items-center justify-between px-2 py-1 text-xs text-muted-foreground">
            <span>Workspace CRM</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
              v2.4
            </span>
          </div>
        </div>
      </aside>
    </>
  )
}

export default React.memo(AppSidebar)
