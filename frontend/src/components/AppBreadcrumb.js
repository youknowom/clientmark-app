import React from 'react'
import { useLocation, Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import routes from '../routes'

export const AppBreadcrumb = () => {
  const currentLocation = useLocation().pathname

  const getRouteName = (pathname, routes) => {
    const currentRoute = routes.find((route) => route.path === pathname)
    return currentRoute ? currentRoute.name : false
  }

  const getBreadcrumbs = (location) => {
    const breadcrumbs = []
    location.split('/').reduce((prev, curr, index, array) => {
      const currentPathname = `${prev}/${curr}`
      const routeName = getRouteName(currentPathname, routes)
      if (routeName) {
        breadcrumbs.push({
          pathname: currentPathname,
          name: routeName,
          active: index + 1 === array.length,
        })
      }
      return currentPathname
    }, '')
    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs(currentLocation)

  if (breadcrumbs.length === 0) return null

  return (
    <nav aria-label="breadcrumb" style={{ margin: '8px 0 16px' }}>
      <ol className="cm-breadcrumb-list">
        <li className="cm-breadcrumb-item">
          <Link to="/dashboard">Home</Link>
        </li>
        {breadcrumbs.map((breadcrumb, index) => (
          <React.Fragment key={index}>
            <ChevronRight size={12} color="var(--cm-text-muted)" />
            <li
              className={`cm-breadcrumb-item ${breadcrumb.active ? 'active' : ''}`}
            >
              {breadcrumb.active ? (
                <span>{breadcrumb.name}</span>
              ) : (
                <Link to={breadcrumb.pathname}>{breadcrumb.name}</Link>
              )}
            </li>
          </React.Fragment>
        ))}
      </ol>
    </nav>
  )
}

export default React.memo(AppBreadcrumb)
