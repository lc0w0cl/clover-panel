<template>
  <div class="search-container">
    <div class="search-bar">
      <div class="search-icon">
        <svg focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path>
        </svg>
      </div>
      <input
          ref="inputRef"
          type="text"
          v-model="query"
          :placeholder="searchPlaceholder"
          @keyup.enter="submitSearch"
          @focus="isFocused = true"
          @blur="isFocused = false"
      />
      <div class="search-engine-logo">
        <img :src="searchEngineLogo" :alt="searchEngine + ' Logo'" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

const query = ref('');
const isFocused = ref(false);
const searchEngine = ref('google');
const inputRef = ref(null);

onMounted(() => {
  const savedEngine = localStorage.getItem('searchEngine');
  if (savedEngine) {
    searchEngine.value = savedEngine;
  }
});

const searchEngineLogo = computed(() => {
  const isProd = import.meta.env.PROD;
  const basePath = isProd ? '/logo/' : '/assets/logo/';
  
  switch (searchEngine.value) {
    case 'google':
      return `${basePath}谷歌.svg`;
    case 'bing':
      return `${basePath}必应.svg`;
    case 'baidu':
      return `${basePath}baidu.svg`;
    default:
      return `${basePath}谷歌.svg`;
  }
});

const searchPlaceholder = computed(() => {
  switch (searchEngine.value) {
    case 'google':
      return '搜索 Google 或输入网址';
    case 'bing':
      return '必应搜索';
    case 'baidu':
      return '百度一下,你就知道';
    default:
      return '搜索或输入网址';
  }
});

const submitSearch = () => {
  if (query.value.trim() !== '') {
    let searchUrl;
    switch (searchEngine.value) {
      case 'google':
        searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query.value)}`;
        break;
      case 'bing':
        searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query.value)}`;
        break;
      case 'baidu':
        searchUrl = `https://www.baidu.com/s?wd=${encodeURIComponent(query.value)}`;
        break;
      default:
        searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query.value)}`;
    }
    window.open(searchUrl, '_blank');
  }
};

// 添加 focus 方法
const focus = () => {
  inputRef.value?.focus();
};

// 暴露 focus 方法
defineExpose({ focus });
</script>

<style scoped>
.search-container {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.search-bar {
  display: flex;
  align-items: center;
  width: 584px;
  max-width: 90%;
  height: 44px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 24px;
  padding: 5px 8px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  transition: box-shadow 0.3s, border-color 0.3s;
}

.search-bar:hover, .search-bar:focus-within {
  box-shadow: 0 1px 6px rgba(32,33,36,.28);
  border-color: rgba(255, 255, 255, 0.3);
}

.search-icon {
  padding: 0 13px;
  height: 20px;
  width: 20px;
  color: rgba(255, 255, 255, 0.7);
}

.search-bar input {
  flex: 1;
  height: 34px;
  background-color: transparent;
  border: none;
  margin: 0;
  padding: 0;
  color: rgba(255, 255, 255, 0.87);
  word-wrap: break-word;
  outline: none;
  font-size: 16px;
}

.search-bar input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.search-engine-logo {
  display: flex;
  align-items: center;
  padding: 0 8px;
  cursor: pointer;
}

.search-engine-logo img {
  height: 24px;
  width: auto;
}
</style>
