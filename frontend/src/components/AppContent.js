import React from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { CContainer } from '@coreui/react'
import { AnimatePresence } from 'framer-motion'

import ProtectedRoute from '../ProtectedRoute'
import PermissionRoute from '../PermissionRoute'
import routes from '../routes'
import PageWrapper from './mycomponent/PageWrapper'

const AppContent = () => {
  const location = useLocation()

  return (
    <CContainer className="px-3 px-sm-4" lg>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          {routes.map((route, idx) => {
            return (
              route.element && (
                <Route
                  key={idx}
                  path={route.path}
                  element={
                    <ProtectedRoute>
                      <PermissionRoute permission={route.permission}>
                        <PageWrapper>
                          <route.element />
                        </PageWrapper>
                      </PermissionRoute>
                    </ProtectedRoute>
                  }
                />
              )
            )
          })}
          <Route path="/" element={<Navigate to="dashboard" replace />} />
        </Routes>
      </AnimatePresence>
    </CContainer>
  )
}

export default React.memo(AppContent)
