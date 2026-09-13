export const hasPermission = (user, permission) => {
  if (!user) return false
  if (!user.roleId) return false
  return user.roleId.permissions?.includes(permission)
}
