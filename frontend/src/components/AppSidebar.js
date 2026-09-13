import React, { useContext, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'

import { CCloseButton, CSidebar, CSidebarBrand, CSidebarHeader } from '@coreui/react'

import { AppSidebarNav } from './AppSidebarNav'

import logoOne from '../assets/images/bh_login_logo.jpg'

// sidebar nav config
import navigation from '../_nav'
import useNavItems from '../_nav'
import { right } from '@popperjs/core'
import apiClient, { BASE_URL } from '../api/axiosClient'
import { AuthContext } from '../AuthContext'
import { socket } from '../socket/socket'

const AppSidebar = () => {
  const { siteSetting, setSiteSetting } = useContext(AuthContext)
  const dispatch = useDispatch()
  const unfoldable = useSelector((state) => state.sidebarUnfoldable)
  const sidebarShow = useSelector((state) => state.sidebarShow)
  const filteredNavItems = useNavItems()

  let mainLogo = siteSetting?.mainLogo ? `${BASE_URL}${siteSetting?.mainLogo}` : logoOne

  //get site setting
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

      // Update browser tab favicon dynamically
      if (respData?.favicon) {
        const faviconUrl = `${BASE_URL}${respData.favicon}`
        let link = document.querySelector("link[rel='shortcut icon']")
        if (!link) {
          link = document.createElement('link')
          link.rel = 'shortcut icon'
          document.head.appendChild(link)
        }
        link.href = faviconUrl
        localStorage.setItem('bh_favicon_url', faviconUrl)
      }
    } catch (error) {
      console.error('Failed to load site setting in sidebar:', error)
    } finally {
    }
  }

  useEffect(() => {
    getSiteSetting()
  }, [])

  useEffect(() => {
    if (!socket) return

    const events = ['updateSiteSetting']

    events.forEach((event) => socket.on(event, getSiteSetting))

    return () => events.forEach((event) => socket.off(event, getSiteSetting))
  }, [socket])

  return (
    <CSidebar
      className="border-end-0"
      colorScheme="light"
      position="fixed"
      unfoldable={unfoldable}
      visible={sidebarShow}
      onVisibleChange={(visible) => {
        dispatch({ type: 'set', sidebarShow: visible })
      }}
      style={{
        borderRight: '1px solid #ccc',
      }}
    >
      <CSidebarHeader
        className="p-0 d-flex align-items-center justify-content-between"
        style={{
          boxShadow: 'rgba(0, 0, 0, 0.1) 0px 2px 2px',
          overflow: 'hidden',
          backgroundColor: '#ffffffff', // matches sidebar background
        }}
      >
        <CSidebarBrand to="/" className="m-0 p-0 d-flex align-items-center">
          <img
            src={mainLogo}
            alt="MyNGO"
            className="sidebar-brand-full"
            style={{
              objectFit: 'contain',
              width: '100%',
              height: '60px',
              display: 'block',
              backgroundColor: '#ffffffff', // optional, to blend with sidebar
              padding: '4px', // optional, adds breathing space
              marginLeft: '20px',
            }}
          />
        </CSidebarBrand>

        <CCloseButton
          className="d-lg-none text-light me-2"
          dark
          onClick={() => dispatch({ type: 'set', sidebarShow: false })}
        />
      </CSidebarHeader>

      {/* <AppSidebarNav items={navigation} /> */}
      <AppSidebarNav items={filteredNavItems} />
    </CSidebar>
  )
}

export default React.memo(AppSidebar)
