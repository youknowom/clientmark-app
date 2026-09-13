import { BASE_URL } from '../api/axiosClient'

// OG Clientmark Favicon as a direct SVG Data-URI (instant 0ms render, zero network requests, no caching issues)
export const OG_FAVICON_DATA_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64' width='64' height='64'%3E%3Crect width='64' height='64' rx='16' fill='%23E05E3A'/%3E%3Cpath d='M16 20h32M16 32h22M16 44h26' stroke='%23FFFFFF' stroke-width='5.5' stroke-linecap='round'/%3E%3Ccircle cx='48' cy='44' r='5' fill='%23FFFFFF'/%3E%3C/svg%3E"

export const DEFAULT_FAVICON_URL = OG_FAVICON_DATA_URI
export const STORAGE_KEY = 'cm_custom_favicon'
export const LEGACY_STORAGE_KEY = 'bh_favicon_url'

/**
 * Updates all favicon link tags in the document head.
 * @param {string} href
 */
export const updateHeadFavicon = (href) => {
  if (typeof document === 'undefined') return
  try {
    // 1. Remove old icon tags to force Chrome/Edge tab repaint
    const oldLinks = document.querySelectorAll("link[rel*='icon']")
    oldLinks.forEach((el) => el.parentNode && el.parentNode.removeChild(el))

    // 2. Determine MIME type
    let type = 'image/svg+xml'
    if (href.endsWith('.png')) {
      type = 'image/png'
    } else if (href.endsWith('.ico')) {
      type = 'image/x-icon'
    }

    // 3. Create fresh link
    const link = document.createElement('link')
    link.rel = 'icon'
    link.type = type
    link.href = href
    document.head.appendChild(link)

    const shortcutLink = document.createElement('link')
    shortcutLink.rel = 'shortcut icon'
    shortcutLink.type = type
    shortcutLink.href = href
    document.head.appendChild(shortcutLink)
  } catch (err) {
    console.error('Failed to update favicon:', err)
  }
}

/**
 * Reset favicon to the OG Clientmark default icon.
 * Always used on the public landing page.
 */
export const resetToDefaultFavicon = () => {
  updateHeadFavicon(OG_FAVICON_DATA_URI)
}

/**
 * Apply a buyer/tenant custom favicon or logo inside their dashboards.
 * @param {string} url
 */
export const applyTenantFavicon = (url) => {
  if (!url) {
    resetToDefaultFavicon()
    return
  }
  updateHeadFavicon(url)
  try {
    localStorage.setItem(STORAGE_KEY, url)
    localStorage.setItem(LEGACY_STORAGE_KEY, url)
  } catch (e) {}
}

/**
 * Synchronize browser tab favicon from site settings.
 *
 * Rules:
 * 1. Landing page (`/`) ALWAYS shows the OG Clientmark favicon.
 * 2. In-App / Dashboards:
 *    - If buyer uploaded custom `favicon`: use their favicon.
 *    - If buyer uploaded custom `mainLogo` (and no favicon): use their logo.
 *    - If neither: show default OG Clientmark icon.
 *
 * @param {Object} settings
 */
export const syncFaviconFromSettings = (settings = {}) => {
  if (typeof window === 'undefined') return

  const pathname = window.location.pathname.replace(/\/+$/, '') || '/'
  // On public landing page, ALWAYS enforce the OG Clientmark favicon
  if (pathname === '/') {
    resetToDefaultFavicon()
    return
  }

  // Inside app / dashboards: resolve buyer's custom logo/favicon
  let customUrl = null

  if (settings?.favicon) {
    const raw = settings.favicon
    customUrl = raw.startsWith('http') || raw.startsWith('data:') ? raw : `${BASE_URL}${raw}`
  } else if (settings?.mainLogo) {
    const raw = settings.mainLogo
    customUrl = raw.startsWith('http') || raw.startsWith('data:') ? raw : `${BASE_URL}${raw}`
  }

  if (customUrl) {
    applyTenantFavicon(customUrl)
  } else {
    resetToDefaultFavicon()
  }
}
