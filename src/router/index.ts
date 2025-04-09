import { createRouter, createWebHistory } from 'vue-router';
import { isAuthenticated } from '../utils/auth';
import RainLoginPage from '../views/RainLoginPage.vue';
import MainPage from '../views/MainPage.vue';
import NavigationPanel from '../views/NavigationPanel.vue';
import TodoPage from '../views/TodoPage.vue';

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
    component: RainLoginPage
  },
  {
    path: '/home',
    name: 'Home',
    component: MainPage,
    meta: { requiresAuth: true },
    redirect: { name: 'Navigation' },
    children: [
      {
        path: 'navigation',
        name: 'Navigation',
        component: NavigationPanel,
        meta: { requiresAuth: true }
      },
      {
        path: 'todo',
        name: 'Todo',
        component: TodoPage,
        meta: { requiresAuth: true }
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
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
