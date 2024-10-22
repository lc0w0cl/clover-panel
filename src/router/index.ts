import { createRouter, createWebHistory } from 'vue-router';
import LoginPage from '../views/LoginPage.vue';
import MainPage from '../views/MainPage.vue';
import { isAuthenticated } from '../utils/auth';

const routes = [
  {
    path: '/',
    name: 'Root',
    redirect: () => {
      return isAuthenticated() ? { name: 'Home' } : { name: 'Login' };
    }
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginPage
  },
  {
    path: '/home',
    name: 'Home',
    component: MainPage,
    meta: { requiresAuth: true }
  },
  // 你可以在这里添加更多的路由规则
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, _from, next) => {
  if (to.meta.requiresAuth) {
    if (!isAuthenticated()) {
      next({ name: 'Login' });
    } else {
      next();
    }
  } else {
    next();
  }
});

export default router;
