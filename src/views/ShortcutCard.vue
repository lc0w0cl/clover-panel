<template>
  <div class="shortcut-card" @click="openLink">
    <div class="icon-wrapper">
      <div v-if="!imageLoaded && !loadError" class="icon-placeholder"></div>
      <div v-if="loadError" class="icon-error" title="图标加载失败">!</div>
      <img 
        :src="icon" 
        :alt="title" 
        class="icon" 
        :class="{ 'icon-loaded': imageLoaded }"
        @load="onImageLoad"
        @error="onImageError"
      >
    </div>
    <div class="title">{{ title }}</div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, ref } from 'vue';

const props = defineProps({
  title: String,
  icon: String,
  link: String
});

const imageLoaded = ref(false);
const loadError = ref(false);

const onImageLoad = () => {
  imageLoaded.value = true;
  loadError.value = false;
};

const onImageError = () => {
  loadError.value = true;
  imageLoaded.value = false;
  console.error(`无法加载图标: ${props.icon}`);
};

const openLink = () => {
  if (props.link) {
    window.open(props.link, '_blank');
  }
};
</script>

<style scoped>
.shortcut-card {
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 190px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  padding: 12px 16px;
  border-radius: 10px;
  margin: 4px;
  box-sizing: border-box;
}

.icon-wrapper {
  position: relative;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}

.icon-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #f0f0f0;
  border-radius: 15px;
}

.icon-error {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #ff5252;
  color: white;
  font-weight: bold;
  font-size: 24px;
  border-radius: 15px;
}

.icon {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.icon-loaded {
  opacity: 1;
}

.title {
  margin-left: 12px;
  font-size: 14px;
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  max-width: calc(100% - 52px); /* 40px图标宽度 + 12px左边距 */
}

.shortcut-card:hover {
  transform: scale(1.05);
  background-color: rgba(255, 255, 255, 0.1);
}

.shortcut-card:hover .icon {
  transform: scale(1.15);
}

.shortcut-card:hover .title {
  font-weight: bold;
}
</style>
