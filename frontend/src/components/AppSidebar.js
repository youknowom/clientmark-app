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
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px' }}>
    <div style={{
      width: '28px', height: '28px',
      background: '#E05E3A',
      borderRadius: '7px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
        <path d="M12 2L2 7l10 5 10-5-10-5zm0 7L2 14l10 5 10-5-10-5z" />
      </svg>
    </div>
    <span style={{
      fontSize: '15px',
      fontWeight: '700',
      color: '#0F0F0F',
      letterSpacing: '-0.02em',
      fontFamily: 'Inter, sans-serif',
    }}>
      Clientmark
    </span>
  </div>
)

const AppSidebar = () => {
  const { siteSetting, setSiteSetting } = useContext(AuthContext)
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
        borderRight: '1px solid #E8E8E5',
        backgroundColor: '#FFFFFF',
      }}
    >
      <CSidebarHeader
        className="p-0 d-flex align-items-center justify-content-between"
        style={{
          borderBottom: '1px solid #F0F0ED',
          height: '57px',
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
