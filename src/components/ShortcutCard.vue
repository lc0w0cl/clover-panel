<template>
  <div class="shortcut-card" @click="handleClick(link)">
    <img :src="icon" :alt="title" class="shortcut-icon">
    <span class="shortcut-title">{{ title }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps({
  title: String,
  icon: String,
  link: String
});

const handleClick = (link: string) => {
  if (link) {
    window.open(link, '_blank');
  }
};
</script>

<style scoped>
.shortcut-card {
  width: 100px;
  height: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 10px;
  cursor: pointer;
  border: 1px solid #ccc;
  border-radius: 10px;
  transition: transform 0.2s;
  user-select: none; /* 禁止文本选择 */
}

.shortcut-card:hover {
  transform: scale(1.05);
}

.icon {
  width: 50px;
  height: 50px;
  pointer-events: none; /* 确保图片不会触发任何事件 */
}

.title {
  margin-top: 5px;
  font-weight: bold;
}
</style>
