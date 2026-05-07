export type Permission = string

export interface PermissionItem {
  id: string
  name: string
  description?: string
  type: 'menu' | 'api' | 'button'
  parentId?: string
  path?: string
  method?: string
  component?: string
  icon?: string
  order?: number
  isActive?: boolean
}

export interface Role {
  id: string
  name: string
  description?: string
  permissions: Permission[]
  menuIds?: string[]
}

export interface User {
  id: string
  name: string
  username: string
  email?: string
  roles: string[]
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface UserClaims {
  id: string
  name?: string
  roles: string[]
  permissions?: Permission[]
  denied?: Permission[]
  user?: User
}

export interface PermissionCheckOptions {
  anyOf?: Permission[]
  allOf?: Permission[]
  requireAll?: boolean
}

export interface PermissionCheckResult {
  allowed: boolean
  missing?: Permission[]
  reason?: string
  details?: any
}

export interface MenuItem {
  id: string
  name: string
  path: string
  component?: string
  icon?: string
  order?: number
  children?: MenuItem[]
  isActive?: boolean
  permission?: string
}

export interface RBACState {
  users: User[]
  roles: Role[]
  permissions: PermissionItem[]
  menus: MenuItem[]
  currentUser: UserClaims | null
}
