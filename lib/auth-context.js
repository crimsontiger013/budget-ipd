'use client'

import { createContext, useContext } from 'react'

const UserContext = createContext(null)

export function UserProvider({ user, profile, permissions, children }) {
  const isAdmin = profile?.role === 'admin'

  // Build a map of BU permissions for quick lookup
  const buPermissions = {}
  if (permissions) {
    permissions.forEach((p) => {
      const buName = p.business_units?.name
      if (buName) {
        buPermissions[buName] = p.access_level
      }
    })
  }

  const canViewBU = (buName) => {
    return isAdmin || buName in buPermissions
  }

  const canEditBU = (buName) => {
    return isAdmin || buPermissions[buName] === 'write'
  }

  return (
    <UserContext.Provider
      value={{ user, profile, permissions, isAdmin, buPermissions, canViewBU, canEditBU }}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
