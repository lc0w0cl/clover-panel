<template>
  <div class="search-container">
    <div class="search-bar">
      <div class="search-icon">
        <svg focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path>
        </svg>
      </div>
      <input
          type="text"
          v-model="query"
          placeholder="搜索 Google 或输入网址"
          @keyup.enter="submitSearch"
          @focus="isFocused = true"
          @blur="isFocused = false"
      />
      <div class="google-logo">
        <img src="/src/assets/logo/谷歌.svg" alt="Google Logo" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const query = ref('');
const isFocused = ref(false);

const submitSearch = () => {
  if (query.value.trim() !== '') {
    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(query.value)}`;
    window.open(googleSearchUrl, '_blank');
  }
};
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
  border: 1px solid #dfe1e5;
  border-radius: 24px;
  padding: 5px 8px;
  background-color: #fff;
  box-shadow: none;
  transition: box-shadow 0.3s;
}

.search-bar:hover, .search-bar:focus-within {
  box-shadow: 0 1px 6px rgba(32,33,36,.28);
  border-color: rgba(223,225,229,0);
}

.search-icon {
  padding: 0 13px;
  height: 20px;
  width: 20px;
  color: #9aa0a6;
}

.search-bar input {
  flex: 1;
  height: 34px;
  background-color: transparent;
  border: none;
  margin: 0;
  padding: 0;
  color: rgba(0,0,0,.87);
  word-wrap: break-word;
  outline: none;
  font-size: 16px;
}

.google-logo {
  display: flex;
  align-items: center;
  padding: 0 8px;
  cursor: pointer;
}

.google-logo img {
  height: 24px;
  width: auto;
}
</style>
