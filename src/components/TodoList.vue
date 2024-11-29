<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'

interface Todo {
  id: string
  content: string
  completed: boolean
  createTime: string
  updateTime: string
}

// 添加后端返回的todo数据接口
interface TodoResponse {
  id: number
  content: string
  completed: number // 数据库中是0/1
  createTime: string
  updateTime: string
}

const todos = ref<Todo[]>([])
const newTodo = ref('')
const isLoading = ref(false)

// 获取所有待办事项
const fetchTodos = async () => {
  try {
    isLoading.value = true
    const response = await axios.get('/api/todos')
    todos.value = response.data.data.map((todo: TodoResponse) => ({
      ...todo,
      id: todo.id.toString(), // 转换为字符串以配Todo接口
      completed: Boolean(todo.completed)
    }))
  } catch (error) {
    ElMessage.error('获取待办事项失败')
  } finally {
    isLoading.value = false
  }
}

// 添加待办事项
const addTodo = async () => {
  if (!newTodo.value.trim()) return
  
  try {
    const response = await axios.post('/api/todos', {
      content: newTodo.value
    })
    if (response.data.message === 'success') {
      const newTodoItem = {
        id: response.data.data.id,
        content: newTodo.value,
        completed: false,
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString()
      }
      todos.value.unshift(newTodoItem)
      newTodo.value = ''
    }
  } catch (error) {
    ElMessage.error('添加待办事项失败')
  }
}

// 删除待办事项
const deleteTodo = async (id: string) => {
  try {
    const response = await axios.delete(`/api/todos/${id}`)
    if (response.data.message === 'success') {
      await fetchTodos()
    }
  } catch (error) {
    ElMessage.error('删除待办事项失败')
  }
}

// 更新待办事项状态
const toggleTodo = async (todo: Todo) => {
  try {
    const response = await axios.put(`/api/todos/${todo.id}`, {
      completed: todo.completed
    })
    if (response.data.message === 'success') {
      // 从列表中移除该项
      const todoIndex = todos.value.findIndex(t => t.id === todo.id)
      if (todoIndex !== -1) {
        const updatedTodo = {
          ...todos.value[todoIndex],
          completed: todo.completed,
          updateTime: new Date().toISOString()
        }
        todos.value.splice(todoIndex, 1) // 移除原项

        // 根据完成状态决定插入位置
        if (todo.completed) {
          // 如果是标记为完成，添加到已完成项的最前面
          const firstCompletedIndex = todos.value.findIndex(t => t.completed)
          if (firstCompletedIndex === -1) {
            // 如果没有已完成项，添加到末尾
            todos.value.push(updatedTodo)
          } else {
            // 插入到第一个已完成项的位置
            todos.value.splice(firstCompletedIndex, 0, updatedTodo)
          }
        } else {
          // 如果是标记为未完成，添加到未完成项的最前面
          todos.value.unshift(updatedTodo)
        }
      }
    }
  } catch (error) {
    todo.completed = !todo.completed
    ElMessage.error('更新待办事项失败')
  }
}

onMounted(() => {
  fetchTodos()
})
</script>

<template>
  <div class="todo-container">
    <h2>待办事项</h2>
    
    <div class="add-todo">
      <el-input
        v-model="newTodo"
        placeholder="添加新的待办事项"
        @keyup.enter="addTodo"
      >
        <template #append>
          <el-button @click="addTodo">添加</el-button>
        </template>
      </el-input>
    </div>

    <div class="todo-list" v-loading="isLoading">
      <div v-if="todos.length === 0" class="empty-text">
        暂无待办事项
      </div>
      
      <div
        v-for="todo in todos"
        :key="todo.id"
        class="todo-item"
        :class="{ 'completed': todo.completed }"
      >
        <el-checkbox
          v-model="todo.completed"
          @change="toggleTodo(todo)"
        />
        <span class="todo-content">{{ todo.content }}</span>
        <el-button
          type="danger"
          :icon="Delete"
          class="delete-button"
          @click="deleteTodo(todo.id)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.todo-container {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  border: 1px solid rgba(255, 255, 255, 0.18);
  width: 300px;
  color: white;
  height: calc(100vh - 160px);
  display: flex;
  flex-direction: column;
}

h2 {
  margin: 0 0 20px 0;
  font-size: 1.2em;
  flex-shrink: 0;
}

.add-todo {
  margin-bottom: 20px;
  flex-shrink: 0;
}

.todo-list {
  flex-grow: 1;
  overflow-y: auto;
  padding-right: 4px;
}

.todo-list::-webkit-scrollbar {
  width: 6px;
}

.todo-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.todo-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.todo-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.todo-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 8px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;
}

.todo-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.todo-content {
  flex: 1;
  margin: 0 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.completed .todo-content {
  text-decoration: line-through;
  opacity: 0.6;
}

.empty-text {
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  padding: 20px 0;
}

:deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.1);
  box-shadow: none;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

:deep(.el-input__inner) {
  color: white;
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: #409EFF;
  border-color: #409EFF;
}

.delete-button {
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  background-color: rgba(255, 77, 79, 0.1);
  border-color: transparent;
}

.delete-button:hover {
  background-color: rgba(255, 77, 79, 0.2);
  transform: scale(1.05);
}

.delete-button :deep(.el-icon) {
  font-size: 14px;
  color: rgba(255, 77, 79, 0.9);
}

.delete-button:hover :deep(.el-icon) {
  color: #ff4d4f;
}
</style> 