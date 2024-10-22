import { createRouter, createWebHistory } from 'vue-router';
import LoginPage from '../views/LoginPage.vue';
import MainPage from '../views/MainPage.vue';

const routes = [
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

export default router;
