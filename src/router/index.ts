import { createRouter, createWebHistory } from 'vue-router';
import MainPage from '../components/MainPage.vue';

const routes = [
  {
    path: '/',
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
