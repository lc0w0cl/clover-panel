<template>
  <div class="login-container">
    <h1>请输入密码</h1>
    <input type="text" v-model="username" placeholder="用户名">
    <input type="password" v-model="password" placeholder="密码" @keyup.enter="login">
    <button @click="login">登录</button>
    <p v-if="errorMessage">{{ errorMessage }}</p>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      username: '',
      password: '',
      errorMessage: ''
    };
  },
  methods: {
    async login() {
      try {
        const response = await axios.post('/api/login', {
          username: this.username,
          password: this.password
        });
        console.log('Login response:', response.data);
        if (response.data.message === 'Login successful') {
          // 处理登录成功的情况，例如跳转到主页或显示登录成功消息
          this.$router.push('/home');
        } else {
          // 显示错误消息
          this.errorMessage = '登录失败，请检查用户名和密码。';
        }
      } catch (error) {
        console.error('Login error:', error);
        this.errorMessage = '登录过程中发生错误。';
      }
    }
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
}
</style>
