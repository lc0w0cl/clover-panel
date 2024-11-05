<template>
  <div class="rain-container">
    <div class="login-box">
      <h2>登录</h2>
      <el-form 
        ref="loginFormRef"
        :model="loginForm"
        :rules="rules"
        class="login-form"
      >
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="用户名"
            prefix-icon="User"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="密码"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        <el-form-item>
          <el-button 
            type="primary" 
            class="login-button"
            :loading="loading"
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { Rain } from '../components/RainEffect';
import type { FormInstance, FormRules } from 'element-plus';
import { User, Lock } from '@element-plus/icons-vue';
import axios from 'axios';

const router = useRouter();
let rainEffect: Rain | null = null;
const loading = ref(false);

const loginForm = ref({
  username: '',
  password: ''
});

const rules = ref<FormRules>({
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
  ]
});

const loginFormRef = ref<FormInstance>();

onMounted(() => {
  const args = {
    rainDropCount: 500,
    rainColor: 'rgba(150,180,255,0.8)',
    backgroundColor: 'rgba(10,10,10,0.5)'
  };

  rainEffect = new Rain(args);
  window.addEventListener('resize', handleResize);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  if (rainEffect) {
    rainEffect.cleanup();
  }
});

const handleResize = () => {
  if (rainEffect) {
    rainEffect.resize();
  }
};

const handleLogin = async () => {
  if (!loginFormRef.value) return;
  
  await loginFormRef.value.validate(async (valid) => {
    if (valid) {
      loading.value = true;
      try {
        const response = await axios.post('/api/login', {
          username: loginForm.value.username,
          password: loginForm.value.password
        });
        
        if (response.data.success) {
          // 存储token或其他认证信息
          localStorage.setItem('token', response.data.token);
          router.push('/home');
        }
      } catch (error) {
        console.error('Login failed:', error);
      } finally {
        loading.value = false;
      }
    }
  });
};
</script>

<style scoped>
.rain-container {
  width: 100vw;
  height: 100vh;
  background: transparent;
  position: fixed;
  top: 0;
  left: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1;
}

.login-box {
  position: relative;
  z-index: 2;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: 15px;
  padding: 30px;
  width: 350px;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.08);
  
  opacity: 0;
  animation: fadeIn 0.8s ease-out forwards;
  animation-delay: 0.3s;
}

.login-box h2 {
  color: rgba(255, 255, 255, 0.9);
  text-align: center;
  margin-bottom: 30px;
  font-weight: 500;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  
  opacity: 0;
  animation: fadeIn 0.8s ease-out forwards;
  animation-delay: 0.5s;
}

.login-form {
  width: 100%;
}

:deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.05) !important;
  box-shadow: none !important;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

:deep(.el-input__inner) {
  color: rgba(255, 255, 255, 0.9) !important;
  font-weight: 500;
}

:deep(.el-input__inner::placeholder) {
  color: rgba(255, 255, 255, 0.5) !important;
}

:deep(.el-input__prefix-inner) {
  color: rgba(255, 255, 255, 0.6);
}

.login-button {
  width: 100%;
  height: 40px;
  background: linear-gradient(45deg, #2196F3, #00BCD4);
  border: none;
  font-weight: 500;
  letter-spacing: 1px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  
  opacity: 0;
  animation: fadeIn 0.8s ease-out forwards;
  animation-delay: 1.3s;
}

.login-button:hover {
  background: linear-gradient(45deg, #1976D2, #00ACC1);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.login-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

:deep(.el-form-item__error) {
  color: #ff6b6b;
  font-weight: 500;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.3);
}

:deep(.el-form-item) {
  margin-bottom: 25px;
  
  opacity: 0;
  animation: fadeIn 0.8s ease-out forwards;
}

:deep(.el-form-item:nth-child(1)) {
  animation-delay: 0.7s;
}

:deep(.el-form-item:nth-child(2)) {
  animation-delay: 0.9s;
}

:deep(.el-form-item:nth-child(3)) {
  animation-delay: 1.1s;
}

:deep(.el-input__wrapper.is-focus) {
  background: rgba(255, 255, 255, 0.08) !important;
  border-color: rgba(255, 255, 255, 0.15) !important;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.03) !important;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes blurIn {
  from {
    backdrop-filter: blur(0px);
    -webkit-backdrop-filter: blur(0px);
  }
  to {
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }
}

.rain-container::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.1);
  opacity: 0;
  animation: fadeIn 1s ease-out forwards;
  z-index: 1;
}
</style> 