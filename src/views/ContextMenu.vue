<template>
  <div
      v-if="visible"
      class="context-menu"
      :style="{ top: `${position.y}px`, left: `${position.x}px` }"
  >
    <ul>
      <li @click="edit">编辑</li>
      <li @click="remove">删除</li>
    </ul>
  </div>
</template>

<script setup>

defineProps({
  visible: {
    type: Boolean,
    required: true,
  },
  position: {
    type: Object,
    required: true,
  }

});

const emit = defineEmits(['hideMenu','edit','remove'])

const hideMenu = () => {
  emit('hideMenu');
};

const edit = () => {
  hideMenu();
  emit('edit'); // 调用传入的编辑函数
};

const remove = () => {
  hideMenu();
  emit('remove') // 调用传入的删除函数
};
</script>

<style scoped>
.context-menu {
  position: fixed;
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 5px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  z-index: 1000;
}

.context-menu ul {
  list-style-type: none;
  padding: 10px 0;
  margin: 0;
}

.context-menu li {
  padding: 10px 20px;
  cursor: pointer;
  transition: background-color 0.2s;
  user-select: none;
  color: #1a1a1a;
}

.context-menu li:hover {
  background-color: #f0f0f0;
}
</style>
