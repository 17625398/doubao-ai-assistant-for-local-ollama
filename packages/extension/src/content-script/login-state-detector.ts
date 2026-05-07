/**
 * 登录状态检测器
 * 检测当前页面的登录状态
 */

export interface LoginStateIndicators {
  hasLogoutButton: boolean;
  hasUserAvatar: boolean;
  hasUsername: boolean;
  hasUserMenu: boolean;
  noLoginForm: boolean;
  hasSessionCookie: boolean;
}

export interface LoginState {
  isLoggedIn: boolean;
  confidence: 'high' | 'medium' | 'low';
  indicators: LoginStateIndicators;
  username?: string;
  userId?: string;
  avatarUrl?: string;
}

/**
 * 检测登录状态
 */
export function detectLoginState(): LoginState {
  const indicators = detectIndicators();
  
  // 计算置信度
  const score = calculateScore(indicators);
  let confidence: 'high' | 'medium' | 'low';
  
  if (score >= 3) {
    confidence = 'high';
  } else if (score >= 2) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }
  
  // 判断是否已登录
  const isLoggedIn = score >= 2 || (indicators.hasLogoutButton && indicators.noLoginForm);
  
  // 提取用户信息
  const userInfo = extractUserInfo();
  
  return {
    isLoggedIn,
    confidence,
    indicators,
    ...userInfo,
  };
}

/**
 * 检测登录标志
 */
function detectIndicators(): LoginStateIndicators {
  return {
    // 检测登出按钮
    hasLogoutButton: detectLogoutButton(),
    
    // 检测用户头像
    hasUserAvatar: detectUserAvatar(),
    
    // 检测用户名
    hasUsername: detectUsername(),
    
    // 检测用户菜单
    hasUserMenu: detectUserMenu(),
    
    // 检测是否没有登录表单（反向指标）
    noLoginForm: !detectLoginForm(),
    
    // 检测是否有会话 Cookie
    hasSessionCookie: detectSessionCookie(),
  };
}

/**
 * 检测登出按钮
 */
function detectLogoutButton(): boolean {
  const logoutSelectors = [
    'a[href*="logout"]',
    'a[href*="signout"]',
    'a[href*="exit"]',
    'button[class*="logout"]',
    'button[class*="signout"]',
    '[class*="logout"]',
    '[class*="signout"]',
    '[data-testid*="logout"]',
    '[aria-label*="logout" i]',
    '[aria-label*="退出" i]',
    '[title*="logout" i]',
    '[title*="退出" i]',
  ];
  
  for (const selector of logoutSelectors) {
    if (document.querySelector(selector)) {
      return true;
    }
  }
  
  // 检测文本内容
  const bodyText = document.body?.innerText || '';
  const logoutTexts = ['退出登录', '注销', '登出', 'logout', 'sign out', 'exit'];
  
  for (const text of logoutTexts) {
    if (bodyText.toLowerCase().includes(text.toLowerCase())) {
      // 检查是否是在按钮或链接中
      const elements = document.querySelectorAll('a, button, [role="button"]');
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        if (el.textContent?.toLowerCase().includes(text.toLowerCase())) {
          return true;
        }
      }
    }
  }
  
  return false;
}

/**
 * 检测用户头像
 */
function detectUserAvatar(): boolean {
  const avatarSelectors = [
    'img[class*="avatar"]',
    'img[class*="user-avatar"]',
    '.avatar img',
    '.user-avatar',
    '[class*="avatar"] img',
    'img[src*="avatar"]',
    'img[src*="user"]',
    '[data-testid*="avatar"]',
    '[class*="profile-image"]',
    '[class*="user-pic"]',
  ];
  
  for (const selector of avatarSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      // 检查是否是可见的
      const style = window.getComputedStyle(element);
      if (style.display !== 'none' && style.visibility !== 'hidden') {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * 检测用户名
 */
function detectUsername(): boolean {
  const usernameSelectors = [
    '.username',
    '.user-name',
    '[class*="username"]',
    '[class*="user-name"]',
    '[class*="display-name"]',
    '[data-testid*="username"]',
    '[data-testid*="user-name"]',
    '.profile-name',
    '.account-name',
  ];
  
  for (const selector of usernameSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent?.trim()) {
      return true;
    }
  }
  
  return false;
}

/**
 * 检测用户菜单
 */
function detectUserMenu(): boolean {
  const menuSelectors = [
    '[class*="user-menu"]',
    '[class*="account-menu"]',
    '[class*="profile-menu"]',
    '[data-testid*="user-menu"]',
    '[aria-label*="user menu" i]',
    '[aria-label*="用户菜单" i]',
  ];
  
  for (const selector of menuSelectors) {
    if (document.querySelector(selector)) {
      return true;
    }
  }
  
  return false;
}

/**
 * 检测登录表单
 */
function detectLoginForm(): boolean {
  // 检测密码输入框
  const passwordInput = document.querySelector('input[type="password"]');
  if (passwordInput) {
    return true;
  }
  
  // 检测登录相关的表单
  const loginFormSelectors = [
    'form[action*="login"]',
    'form[action*="signin"]',
    'form[class*="login"]',
    'form[class*="signin"]',
    '[class*="login-form"]',
    '[class*="signin-form"]',
  ];
  
  for (const selector of loginFormSelectors) {
    if (document.querySelector(selector)) {
      return true;
    }
  }
  
  // 检测登录按钮
  const loginButtonSelectors = [
    'button[type="submit"]',
    'input[type="submit"]',
  ];
  
  for (let i = 0; i < loginButtonSelectors.length; i++) {
    const selector = loginButtonSelectors[i];
    const button = document.querySelector(selector) as HTMLButtonElement | HTMLInputElement | null;
    if (button) {
      const text = button.textContent || (button as HTMLInputElement).value || '';
      const loginTexts = ['登录', '登陆', 'login', 'sign in', 'submit'];
      for (let j = 0; j < loginTexts.length; j++) {
        const loginText = loginTexts[j];
        if (text.toLowerCase().includes(loginText.toLowerCase())) {
          return true;
        }
      }
    }
  }
  
  return false;
}

/**
 * 检测会话 Cookie
 */
function detectSessionCookie(): boolean {
  const cookies = document.cookie;
  const sessionPatterns = [
    /session/i,
    /sess/i,
    /token/i,
    /auth/i,
    /login/i,
    /user/i,
    /uid/i,
    /sid/i,
  ];
  
  for (const pattern of sessionPatterns) {
    if (pattern.test(cookies)) {
      return true;
    }
  }
  
  return false;
}

/**
 * 提取用户信息
 */
function extractUserInfo(): { username?: string; userId?: string; avatarUrl?: string } {
  const result: { username?: string; userId?: string; avatarUrl?: string } = {};
  
  // 提取用户名
  const usernameSelectors = [
    '.username',
    '.user-name',
    '[class*="username"]',
    '[class*="user-name"]',
    '[class*="display-name"]',
    '[data-testid*="username"]',
    '.profile-name',
    '.account-name',
  ];
  
  for (const selector of usernameSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      const text = element.textContent?.trim();
      if (text && text.length > 0 && text.length < 50) {
        result.username = text;
        break;
      }
    }
  }
  
  // 提取头像 URL
  const avatarSelectors = [
    'img[class*="avatar"]',
    'img[class*="user-avatar"]',
    '.avatar img',
    '.user-avatar',
    '[class*="avatar"] img',
  ];
  
  for (const selector of avatarSelectors) {
    const element = document.querySelector(selector) as HTMLImageElement;
    if (element && element.src) {
      result.avatarUrl = element.src;
      break;
    }
  }
  
  // 尝试从 Cookie 或 localStorage 提取 userId
  try {
    const cookies = document.cookie;
    const userIdMatch = cookies.match(/user[id_]*=([^;]+)/i) || 
                       cookies.match(/uid=([^;]+)/i);
    if (userIdMatch) {
      result.userId = userIdMatch[1];
    }
  } catch {
    // 忽略错误
  }
  
  return result;
}

/**
 * 计算登录置信度分数
 */
function calculateScore(indicators: LoginStateIndicators): number {
  let score = 0;
  
  if (indicators.hasLogoutButton) score += 2;
  if (indicators.hasUserAvatar) score += 1;
  if (indicators.hasUsername) score += 1;
  if (indicators.hasUserMenu) score += 1;
  if (indicators.noLoginForm) score += 1;
  if (indicators.hasSessionCookie) score += 0.5;
  
  return score;
}

/**
 * 获取详细的登录状态报告
 */
export function getDetailedLoginReport(): {
  state: LoginState;
  url: string;
  timestamp: string;
  cookies: string;
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
} {
  const state = detectLoginState();
  
  // 提取 localStorage
  const localStorageData: Record<string, string> = {};
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key) {
        localStorageData[key] = window.localStorage.getItem(key) || '';
      }
    }
  } catch {
    // 忽略错误
  }

  // 提取 sessionStorage
  const sessionStorageData: Record<string, string> = {};
  try {
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (key) {
        sessionStorageData[key] = window.sessionStorage.getItem(key) || '';
      }
    }
  } catch {
    // 忽略错误
  }
  
  return {
    state,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    cookies: document.cookie,
    localStorage,
    sessionStorage,
  };
}
