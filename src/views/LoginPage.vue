<template>
  <div class="login-container">
    <div class="login-box">
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
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { login } from '../utils/auth';

const username = ref('');
const password = ref('');
const errorMessage = ref('');
const isLoading = ref(false);
const router = useRouter();

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
  background-image: url('/src/assets/background-login.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  box-sizing: border-box;
  overflow-x: hidden;
}

.login-box {
  width: 350px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  border: 1px solid rgba(255, 255, 255, 0.18);
}

.logo-container {
  text-align: center;
  margin-bottom: 30px;
}

.logo {
  width: 100px; /* 调整大小以适应您的Logo */
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
