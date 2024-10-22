import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { isAuthenticated } from './utils/auth'

router.beforeEach((to, _from, next) => {
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!isAuthenticated()) {
      next('/login')
    } else {
      next()
    }
  } else {
    next()
  }
})

createApp(App).use(router).mount('#app');
