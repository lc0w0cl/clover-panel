<template>
  <div class="search-bar">
    <input
        type="text"
        v-model="query"
        placeholder="Search Google..."
        @keyup.enter="submitSearch"
    />
    <button @click="submitSearch">搜索</button>
  </div>
</template>

<script setup>
import { ref } from 'vue';

// 定义一个 ref 变量用于绑定搜索输入
const query = ref('');

// 提交搜索请求
const submitSearch = () => {
  if (query.value.trim() !== '') {
    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(query.value)}`;
    window.open(googleSearchUrl, '_blank');
  }
};
</script>

<style scoped>
.search-bar {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.search-bar input {
  padding: 10px;
  width: 300px;
  max-width: 100%;
  border: 1px solid #ccc;
  border-radius: 5px;
  margin-right: 10px;
  box-sizing: border-box;
}

.search-bar input:focus {
  outline: none; /* 去除默认的聚焦样式 */
}

.search-bar button {
  padding: 10px 20px;
  background-color: #42b883;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  user-select: none; /* 防止选中文本 */
}

.search-bar button:focus {
  outline: none; /* 去除聚焦样式 */
  box-shadow: none; /* 如果有阴影样式，去掉 */
}
</style>
