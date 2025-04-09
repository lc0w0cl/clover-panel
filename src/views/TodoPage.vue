<script setup lang="ts">
import TodoList from '../components/TodoList.vue';
</script>

<template>
  <div class="todo-page-container">
    <TodoList />
  </div>
</template>

<style scoped>
.todo-page-container {
  flex: 1;
  width: 100%;
  height: 100%;
  display: flex;
  padding: 20px;
}
</style> 