// auth/index.ts - 认证管理模块

export function isAuthenticated(): boolean {
    return localStorage.getItem('isAuthenticated') === 'true';
  }
  
  export function login() {
    localStorage.setItem('isAuthenticated', 'true');
  }
  
  export function logout() {
    localStorage.setItem('isAuthenticated', 'false');
  }