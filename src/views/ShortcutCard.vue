<template>
  <div class="shortcut-card" @click="openLink">
    <div class="icon-wrapper">
      <img :src="icon" :alt="title" class="icon">
    </div>
    <div class="title">{{ title }}</div>
  </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue';

const props = defineProps({
  title: String,
  icon: String,
  link: String
});

const openLink = () => {
  if (props.link) {
    window.open(props.link, '_blank');
  }
};
</script>

<style scoped>
.shortcut-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  padding: 10px;
  border-radius: 10px;
}

.icon-wrapper {
  width: 64px;
  height: 64px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 15px;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.title {
  margin-top: 8px;
  font-size: 12px;
  text-align: center;
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.shortcut-card:hover {
  transform: scale(1.15) translateY(-10px);
}

.shortcut-card:hover .icon-wrapper {
  box-shadow: 0 15px 30px rgba(0, 0, 0, 0.3);
}

.shortcut-card:hover .icon {
  transform: scale(1.15);
}

.shortcut-card:hover .title {
  font-weight: bold;
  transform: scale(1.1);
}
</style>
