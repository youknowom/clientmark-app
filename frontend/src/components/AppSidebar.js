import React, { useContext, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { CCloseButton, CSidebar, CSidebarBrand, CSidebarHeader } from '@coreui/react'
import { AppSidebarNav } from './AppSidebarNav'
import apiClient, { BASE_URL } from '../api/axiosClient'
import { AuthContext } from '../AuthContext'
import { socket } from '../socket/socket'
import useNavItems from '../_nav'
import { syncFaviconFromSettings } from '../helpers/dynamicFavicon'

// ─── Fallback brand mark when no custom logo is set ───────────────────────────
const ClientmarkBrand = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 18px' }}>
    <div style={{
      width: '30px', height: '30px',
      background: '#E05E3A',
      borderRadius: '8px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg width="18" height="18" viewBox="0 0 32 32" fill="none">
        <path d="M8 10h16M8 16h11M8 22h14" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="24" cy="22" r="2.8" fill="#E05E3A" stroke="white" strokeWidth="1.6" />
      </svg>
    </div>
    <span style={{
      fontSize: '16px',
      fontWeight: '700',
      color: '#111827',
      letterSpacing: '-0.025em',
      fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
    }}>
      Clientmark
    </span>
  </div>
)

const AppSidebar = () => {
  const { siteSetting, setSiteSetting, userData } = useContext(AuthContext)
  const dispatch = useDispatch()
  const unfoldable = useSelector((state) => state.sidebarUnfoldable)
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const filteredNavItems = useNavItems()

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
      // Dynamically sync browser tab favicon with buyer/tenant's favicon or logo
      syncFaviconFromSettings(respData)
    } catch (error) {
      console.error('Failed to load site setting:', error)
    }
  }

  useEffect(() => {
    getSiteSetting()
  }, [])

  const currentTenantId = userData?.tenantId?._id || userData?.tenantId

  useEffect(() => {
    if (!socket) return
    const handleUpdate = (payload) => {
      if (payload?.tenantId && currentTenantId && payload.tenantId !== currentTenantId.toString()) {
        return
      }
      getSiteSetting()
    }
    socket.on('updateSiteSetting', handleUpdate)
    return () => socket.off('updateSiteSetting', handleUpdate)
  }, [socket, currentTenantId])

  return (
    <CSidebar
      className="border-end-0"
      colorScheme="light"
      position="fixed"
      unfoldable={unfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible) => dispatch({ type: 'set', sidebarShow: visible })}
      style={{
        borderRight: '1px solid rgba(0, 0, 0, 0.08)',
        backgroundColor: '#FFFFFF',
      }}
    >
      <CSidebarHeader
        className="p-0 d-flex align-items-center justify-content-between"
        style={{
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
          height: '56px',
          backgroundColor: '#FFFFFF',
        }}
      >
        <CSidebarBrand to="/" className="m-0 p-0 d-flex align-items-center" style={{ flex: 1 }}>
          {mainLogoUrl ? (
            <img
              src={mainLogoUrl}
              alt="Clientmark"
              style={{
                objectFit: 'contain',
                height: '40px',
                maxWidth: '160px',
                display: 'block',
                marginLeft: '16px',
              }}
            />
          ) : (
            <ClientmarkBrand />
          )}
        </CSidebarBrand>

        <CCloseButton
          className="d-lg-none me-2"
          dark
          onClick={() => dispatch({ type: 'set', sidebarShow: false })}
          aria-label="Close sidebar"
        />
      </CSidebarHeader>

      <AppSidebarNav items={filteredNavItems} />
    </CSidebar>
  )
}

export default React.memo(AppSidebar)
