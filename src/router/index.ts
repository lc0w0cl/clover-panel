import { createRouter, createWebHistory } from 'vue-router';
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
    component: MainPage
  },
  // 你可以在这里添加更多的路由规则
];

const router = createRouter({
  history: createWebHistory(import.meta.env.VITE_BASE_URL),
  routes
});

export default router;
