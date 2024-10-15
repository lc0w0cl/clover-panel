import { createRouter, createWebHistory, RouteLocationNormalized, NavigationGuardNext } from 'vue-router';
import MainPage from '../components/MainPage.vue';
import LoginPage from '../components/LoginPage.vue';

const routes = [
  {
    path: '/',
    name: 'Login',
    component: LoginPage
  },
  {
    path: '/home',
    name: 'Home',
    component: MainPage,
    meta: { requiresAuth: true }  // 添加元数据标记需要验证
  },
  // 你可以在这里添加更多的路由规则
];

const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_BASE_URL),
  routes
});

// 全局前置守卫
router.beforeEach((to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => {
  // 检查路由是否需要认证
  if (to.matched.some(record => record.meta.requiresAuth)) {
    // 这里应该添加您的登录状态检查逻辑，例如检查本地存储或 Vuex 状态
    if (!isLoggedIn()) {
      // 如果用户未登录，重定向到登录页面
      next({ name: 'Login' });
    } else {
      // 如果用户已登录，正常导航到目标路由
      next();
    }
  } else {
    // 如果路由不需要认证，正常导航
    next();
  }
});

function isLoggedIn() {
  // 这里应该实现检查用户是否已登录的逻辑
  // 例如检查 localStorage 或 Vuex 状态
  // 这里只是一个示例
  return localStorage.getItem('userLoggedIn') === 'true';
}

export default router;
