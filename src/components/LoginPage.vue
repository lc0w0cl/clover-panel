<template>
  <div class="login-container">
    <h1>CLOVER</h1>
      <el-input
      v-model="username"
      style="width: 240px"
      placeholder="用户名"
    />
    <div style="margin: 20px 0" />
      <el-input
      v-model="password"
      style="width: 240px"
      type="password"
      placeholder="密码"
      show-password
      @keyup.enter="login"
    />
    <div style="margin: 20px 0" />
    <el-button type="primary" @click="login" :disabled="isLoading">登录</el-button>
    <p v-if="errorMessage">{{ errorMessage }}</p>
  </div>
</template>

<script>
import axios from 'axios';
import { mapActions } from 'vuex';

export default {
  data() {
    return {
      username: '',
      password: '',
      errorMessage: '',
      isLoading: false
    };
  },
  methods: {
    ...mapActions(['loginUser']),
    async login() {
      this.isLoading = true;
      this.errorMessage = '';
      try {
        const response = await axios.post('/api/login', {
          username: this.username,
          password: this.password
        });
        console.log('Login response:', response.data);
        if (response.data.message === 'Login successful') {
          // 使用Vuex action来设置认证状态
          this.loginUser();
          this.$router.push('/home');
        } else {
          this.errorMessage = '登录失败，请检查用户名和密码。';
        }
      } catch (error) {
        console.error('Login error:', error);
        this.errorMessage = '登录过程中发生错误。';
      } finally {
        this.isLoading = false;
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
