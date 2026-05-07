import { JWTUtil, getJWTUtil } from '../utils/jwt'
import type { Algorithm } from 'jsonwebtoken'
import { UserClaims } from '../types/rbac'

interface JWTServiceOptions {
  secret: string
  expiresIn?: string | number
  algorithm?: Algorithm
}

export class JWTService {
  private jwtUtil: JWTUtil

  constructor(options: JWTServiceOptions) {
    this.jwtUtil = getJWTUtil({
      secret: options.secret,
      expiresIn: options.expiresIn,
      algorithm: options.algorithm
    })
  }

  /**
   * 生成访问令牌
   */
  generateAccessToken(user: UserClaims): string {
    return this.jwtUtil.generateToken({
      id: user.id,
      name: user.name || '',
      email: user.user?.email || '',
      roles: user.roles,
      permissions: user.permissions
    })
  }

  /**
   * 生成刷新令牌
   */
  generateRefreshToken(user: UserClaims): string {
    return this.jwtUtil.generateToken({
      id: user.id,
      name: user.name || '',
      roles: user.roles,
      type: 'refresh'
    }, {
      expiresIn: '7d' // 刷新令牌有效期更长
    })
  }

  /**
   * 验证令牌
   */
  verifyToken(token: string): UserClaims | null {
    const decoded = this.jwtUtil.verifyToken(token)
    if (!decoded) return null

    return {
      id: decoded.id,
      name: decoded.name || '',
      roles: decoded.roles || [],
      permissions: decoded.permissions || [],
      user: {
        id: decoded.id,
        name: decoded.name || '',
        username: decoded.name || decoded.id,
        email: decoded.email || '',
        roles: decoded.roles || []
      }
    }
  }

  /**
   * 解码令牌
   */
  decodeToken(token: string): UserClaims | null {
    const decoded = this.jwtUtil.decodeToken(token)
    if (!decoded) return null

    return {
      id: decoded.id,
      name: decoded.name || '',
      roles: decoded.roles || [],
      permissions: decoded.permissions || [],
      user: {
        id: decoded.id,
        name: decoded.name || '',
        username: decoded.name || decoded.id,
        email: decoded.email || '',
        roles: decoded.roles || []
      }
    }
  }
}

// 创建默认实例
let jwtService: JWTService

export function getJWTService(options?: JWTServiceOptions): JWTService {
  if (!jwtService) {
    if (!options) {
      throw new Error('JWT service options must be provided')
    }
    jwtService = new JWTService(options)
  }
  return jwtService
}

export default getJWTService
