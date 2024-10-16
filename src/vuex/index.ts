// Vuex store
import { createStore } from 'vuex';

export default createStore({
  state: {
    isAuthenticated: false,
  },
  mutations: {
    setAuthentication(state, status) {
      state.isAuthenticated = status;
    },
  },
  actions: {
    loginUser({ commit }) {
      // 执行登录逻辑，例如API请求
      // 成功后设置认证状态
      commit('setAuthentication', true);
    },
    logout({ commit }) {
      // 执行登出逻辑
      commit('setAuthentication', false);
    },
  },
});
