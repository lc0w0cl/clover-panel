<template>
  <div class="shortcut-card" @click="goToLink">
    <img :src="icon" alt="icon" class="icon" />
    <div class="title">{{ title }}</div>
  </div>
</template>

<script>
export default {
  props: {
    title: String,
    icon: String,
    link: String,
  },
  methods: {
    goToLink() {
      window.open(this.link, '_blank');
    },
  },
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
