import { Permission, PermissionCheckOptions, PermissionCheckResult, Role, UserClaims, MenuItem, PermissionItem } from '../types/rbac'

export function expandPermissions(claims: UserClaims, roleMap?: Map<string, Role>): Set<Permission> {
  const perms = new Set<Permission>()
  
  // Add user-specific permissions
  for (const p of claims.permissions ?? []) perms.add(p)
  
  // Add permissions from roles
  for (const roleName of claims.roles) {
    const role = roleMap?.get(roleName)
    if (role) {
      for (const p of role.permissions) perms.add(p)
    }
  }
  
  return perms
}

export function hasPermission(
  claims: UserClaims | null | undefined,
  perm: Permission,
  roleMap?: Map<string, Role>
): boolean {
  if (!claims) return false
  if (claims.denied?.includes(perm)) return false
  if (claims.permissions?.includes('*')) return true
  const perms = expandPermissions(claims, roleMap)
  return perms.has('*') || perms.has(perm)
}

export function checkPermissions(
  claims: UserClaims | null | undefined,
  options: PermissionCheckOptions,
  roleMap?: Map<string, Role>
): PermissionCheckResult {
  if (!claims) return { allowed: false, reason: 'unauthenticated' }
  if (claims.permissions?.includes('*')) return { allowed: true }
  const perms = expandPermissions(claims, roleMap)
  if (perms.has('*')) return { allowed: true }

  const missing: Permission[] = []
  
  if (options.allOf && options.allOf.length > 0) {
    const allOfMissing = options.allOf.filter((p) => !perms.has(p))
    if (allOfMissing.length > 0) {
      missing.push(...allOfMissing)
    }
  }
  
  if (options.anyOf && options.anyOf.length > 0) {
    const hasAny = options.anyOf.some((p) => perms.has(p))
    if (!hasAny) {
      missing.push(...options.anyOf)
    }
  }
  
  if (missing.length > 0) {
    return {
      allowed: false,
      missing,
      reason: options.allOf && options.allOf.length > 0 ? 'missing_all_of' : 'missing_any_of',
      details: {
        required: options.allOf || options.anyOf,
        available: Array.from(perms)
      }
    }
  }
  
  return { allowed: true }
}

export function filterMenusByPermission(menus: MenuItem[], claims: UserClaims | null, roleMap?: Map<string, Role>): MenuItem[] {
  if (!claims) return []
  if (claims.permissions?.includes('*')) return menus
  
  const perms = expandPermissions(claims, roleMap)
  if (perms.has('*')) return menus
  
  function filterMenu(menu: MenuItem): MenuItem | null {
    // Check if menu has permission requirement
    if (menu.permission && !perms.has(menu.permission)) {
      return null
    }
    
    // Filter children
    if (menu.children && menu.children.length > 0) {
      const filteredChildren = menu.children
        .map(filterMenu)
        .filter((child): child is MenuItem => child !== null)
      
      if (filteredChildren.length === 0) {
        // If no children have permission, exclude this menu
        return null
      }
      
      return { ...menu, children: filteredChildren }
    }
    
    return menu
  }
  
  return menus.map(filterMenu).filter((menu): menu is MenuItem => menu !== null)
}

export function getRolePermissions(roleId: string, roleMap: Map<string, Role>): Permission[] {
  const role = roleMap.get(roleId)
  return role?.permissions || []
}

export function createRoleMap(roles: Role[]): Map<string, Role> {
  const map = new Map<string, Role>()
  for (const role of roles) {
    map.set(role.id, role)
  }
  return map
}

export function validatePermission(permission: string): boolean {
  // Basic permission format validation
  if (!permission || typeof permission !== 'string') return false
  // Permission should follow format: resource:action or *
  if (permission === '*') return true
  return /^[a-zA-Z0-9_:]+$/.test(permission)
}

export function parsePermission(permission: string): { resource: string; action: string } | null {
  if (permission === '*') return null
  const parts = permission.split(':')
  if (parts.length !== 2) return null
  return { resource: parts[0], action: parts[1] }
}
