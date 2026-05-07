import { Role, User, UserClaims, PermissionItem, MenuItem, RBACState } from '../types/rbac'
import { createRoleMap, expandPermissions } from '../utils/rbac'

export class RBACService {
  private state: RBACState
  private roleMap: Map<string, Role>

  constructor(initialState?: Partial<RBACState>) {
    this.state = {
      users: initialState?.users || [],
      roles: initialState?.roles || [],
      permissions: initialState?.permissions || [],
      menus: initialState?.menus || [],
      currentUser: initialState?.currentUser || null
    }
    this.roleMap = createRoleMap(this.state.roles)
  }

  // Getters
  getUsers(): User[] {
    return this.state.users
  }

  getRoles(): Role[] {
    return this.state.roles
  }

  getPermissions(): PermissionItem[] {
    return this.state.permissions
  }

  getMenus(): MenuItem[] {
    return this.state.menus
  }

  getCurrentUser(): UserClaims | null {
    return this.state.currentUser
  }

  getRoleMap(): Map<string, Role> {
    return this.roleMap
  }

  // User management
  addUser(user: User): void {
    this.state.users.push(user)
  }

  updateUser(userId: string, updates: Partial<User>): void {
    const index = this.state.users.findIndex(u => u.id === userId)
    if (index !== -1) {
      this.state.users[index] = { ...this.state.users[index], ...updates }
    }
  }

  deleteUser(userId: string): void {
    this.state.users = this.state.users.filter(u => u.id !== userId)
  }

  getUserById(userId: string): User | undefined {
    return this.state.users.find(u => u.id === userId)
  }

  // Role management
  addRole(role: Role): void {
    this.state.roles.push(role)
    this.roleMap.set(role.id, role)
  }

  updateRole(roleId: string, updates: Partial<Role>): void {
    const index = this.state.roles.findIndex(r => r.id === roleId)
    if (index !== -1) {
      this.state.roles[index] = { ...this.state.roles[index], ...updates }
      this.roleMap.set(roleId, this.state.roles[index])
    }
  }

  deleteRole(roleId: string): void {
    this.state.roles = this.state.roles.filter(r => r.id !== roleId)
    this.roleMap.delete(roleId)
  }

  getRoleById(roleId: string): Role | undefined {
    return this.roleMap.get(roleId)
  }

  // Permission management
  addPermission(permission: PermissionItem): void {
    this.state.permissions.push(permission)
  }

  updatePermission(permissionId: string, updates: Partial<PermissionItem>): void {
    const index = this.state.permissions.findIndex(p => p.id === permissionId)
    if (index !== -1) {
      this.state.permissions[index] = { ...this.state.permissions[index], ...updates }
    }
  }

  deletePermission(permissionId: string): void {
    this.state.permissions = this.state.permissions.filter(p => p.id !== permissionId)
  }

  getPermissionById(permissionId: string): PermissionItem | undefined {
    return this.state.permissions.find(p => p.id === permissionId)
  }

  // Menu management
  addMenu(menu: MenuItem): void {
    this.state.menus.push(menu)
  }

  updateMenu(menuId: string, updates: Partial<MenuItem>): void {
    const updateMenuRecursive = (menus: MenuItem[]): boolean => {
      for (let i = 0; i < menus.length; i++) {
        if (menus[i].id === menuId) {
          menus[i] = { ...menus[i], ...updates }
          return true
        }
        const children = menus[i].children
        if (children && children.length > 0) {
          if (updateMenuRecursive(children)) {
            return true
          }
        }
      }
      return false
    }
    updateMenuRecursive(this.state.menus)
  }

  deleteMenu(menuId: string): void {
    const deleteMenuRecursive = (menus: MenuItem[]): MenuItem[] => {
      return menus.filter(menu => {
        if (menu.id === menuId) {
          return false
        }
        const children = menu.children
        if (children && children.length > 0) {
          menu.children = deleteMenuRecursive(children)
        }
        return true
      })
    }
    this.state.menus = deleteMenuRecursive(this.state.menus)
  }

  getMenuById(menuId: string): MenuItem | undefined {
    const findMenuRecursive = (menus: MenuItem[]): MenuItem | undefined => {
      for (const menu of menus) {
        if (menu.id === menuId) {
          return menu
        }
        const children = menu.children
        if (children && children.length > 0) {
          const found = findMenuRecursive(children)
          if (found) {
            return found
          }
        }
      }
      return undefined
    }
    return findMenuRecursive(this.state.menus)
  }

  // User claims management
  setCurrentUser(claims: UserClaims | null): void {
    this.state.currentUser = claims
  }

  getUserClaims(userId: string): UserClaims | null {
    const user = this.getUserById(userId)
    if (!user) return null
    
    const permissions = new Set<string>()
    for (const roleId of user.roles) {
      const role = this.roleMap.get(roleId)
      if (role) {
        for (const perm of role.permissions) {
          permissions.add(perm)
        }
      }
    }

    return {
      id: user.id,
      name: user.name,
      roles: user.roles,
      permissions: Array.from(permissions),
      user: user
    }
  }

  // Authorization
  checkUserPermission(userId: string, permission: string): boolean {
    const claims = this.getUserClaims(userId)
    if (!claims) return false
    
    const perms = expandPermissions(claims, this.roleMap)
    return perms.has('*') || perms.has(permission)
  }

  // Export/Import
  exportState(): RBACState {
    return JSON.parse(JSON.stringify(this.state))
  }

  importState(state: RBACState): void {
    this.state = JSON.parse(JSON.stringify(state))
    this.roleMap = createRoleMap(this.state.roles)
  }

  // Reset
  reset(): void {
    this.state = {
      users: [],
      roles: [],
      permissions: [],
      menus: [],
      currentUser: null
    }
    this.roleMap = new Map()
  }
}

// Create singleton instance
let rbacService: RBACService

export function getRBACService(initialState?: Partial<RBACState>): RBACService {
  if (!rbacService) {
    rbacService = new RBACService(initialState)
  }
  return rbacService
}

export default getRBACService()
