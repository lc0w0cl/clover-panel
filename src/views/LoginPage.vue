<template>
  <div class="login-container">
    <div class="login-box" :class="{ 'fade-in': !isLoading }">
      <div class="logo-container">
        <img src="/src/assets/login.svg" alt="CLOVER Logo" class="logo">
      </div>
      <el-input
        v-model="username"
        placeholder="用户名"
      />
      <div style="margin: 20px 0" />
      <el-input
        v-model="password"
        type="password"
        placeholder="密码"
        show-password
        @keyup.enter="handleLogin"
      />
      <div style="margin: 20px 0" />
      <el-button type="primary" @click="handleLogin" :loading="isLoading">登录</el-button>
      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { login } from '../utils/auth';

const username = ref('');
const password = ref('');
const errorMessage = ref('');
const isLoading = ref(true);
const router = useRouter();

onMounted(() => {
  // 模拟加载过程
  setTimeout(() => {
    isLoading.value = false;
  }, 500);
});

const handleLogin = async () => {
  isLoading.value = true;
  errorMessage.value = '';
  try {
    const result = await login(username.value, password.value);
    if (result.success) {
      console.log('登录成功，正在跳转...');
      router.push('/home');
    } else {
      errorMessage.value = result.message;
    }
  } catch (error) {
    console.error('Login error:', error);
    errorMessage.value = '登录过程中发生错误。';
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  min-width: 100vw;
  background: linear-gradient(45deg, #1a2a6c, #b21f1f, #fdbb2d);
  background-size: 400% 400%;
  animation: gradientBG 15s ease infinite;
  box-sizing: border-box;
  overflow-x: hidden;
  position: relative;
}

.login-container::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: url('/src/assets/background-login.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 0;
  transition: opacity 1s ease-in-out;
}

.login-container.bg-loaded::after {
  opacity: 1;
}

@keyframes gradientBG {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

.login-box {
  width: 350px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  border: 1px solid rgba(255, 255, 255, 0.18);
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.fade-in {
  opacity: 1;
  transform: translateY(0);
}

.logo-container {
  text-align: center;
  margin-bottom: 30px;
}

.logo {
  width: 100px;
  height: auto;
}

.el-input {
  margin-bottom: 20px;
}

.el-input :deep(.el-input__wrapper) {
  background-color: rgba(255, 255, 255, 0.2);
  box-shadow: none;
}

.el-input :deep(.el-input__inner) {
  color: #ffffff;
}

.el-input :deep(.el-input__inner::placeholder) {
  color: rgba(255, 255, 255, 0.7);
}

.el-button {
  width: 100%;
  background-color: rgba(76, 175, 80, 0.8);
  border: none;
}

.el-button:hover {
  background-color: rgba(76, 175, 80, 1);
}

.error-message {
  color: #ff6b6b;
  text-align: center;
  margin-top: 20px;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
}
</style>
