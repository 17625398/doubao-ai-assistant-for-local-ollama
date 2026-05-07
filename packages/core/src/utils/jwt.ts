import jwt, { Algorithm } from 'jsonwebtoken'

interface JWTOptions {
  secret: string
  expiresIn?: string | number
  algorithm?: Algorithm
}

interface JWTPayload {
  id: string
  name: string
  email?: string
  roles: string[]
  [key: string]: any
}

export class JWTUtil {
  private options: JWTOptions

  constructor(options: JWTOptions) {
    this.options = {
      secret: options.secret,
      expiresIn: options.expiresIn || '1h',
      algorithm: options.algorithm || 'HS256'
    }
  }

  /**
   * 生成 JWT token
   */
  generateToken(payload: JWTPayload, options?: Partial<JWTOptions>): string {
    const signOptions: any = {
      algorithm: (options?.algorithm ?? this.options.algorithm) as Algorithm
    }
    
    const exp = options?.expiresIn ?? this.options.expiresIn
    if (exp) {
      ;(signOptions as any).expiresIn = exp
    }
    
    return jwt.sign(payload, this.options.secret, signOptions)
  }

  /**
   * 验证 JWT token
   */
  verifyToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.verify(token, this.options.secret, {
        algorithms: [this.options.algorithm as Algorithm]
      })
      return decoded as JWTPayload
    } catch (error) {
      console.error('JWT verification failed:', error)
      return null
    }
  }

  /**
   * 解码 JWT token（不验证签名）
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      const decoded = jwt.decode(token)
      return decoded as JWTPayload
    } catch (error) {
      console.error('JWT decoding failed:', error)
      return null
    }
  }
}

// 创建默认实例
let jwtUtil: JWTUtil

export function getJWTUtil(options?: JWTOptions): JWTUtil {
  if (!jwtUtil) {
    if (!options) {
      throw new Error('JWT options must be provided')
    }
    jwtUtil = new JWTUtil(options)
  }
  return jwtUtil
}

export default getJWTUtil
