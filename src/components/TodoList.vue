<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { ElMessage } from 'element-plus'
import { Delete, Plus } from '@element-plus/icons-vue'

interface Todo {
  id: string
  content: string
  completed: boolean
  createTime: string
  updateTime: string
  color?: string
  rotation?: number
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
const showAddForm = ref(false)

// 贴纸颜色组
const noteColors = [
  '#ffcc80', // 橙色
  '#fff59d', // 黄色
  '#a5d6a7', // 绿色
  '#90caf9', // 蓝色
  '#f48fb1', // 粉色
  '#ce93d8', // 紫色
  '#b0bec5'  // 灰色
]

// 为每个待办事项分配一个随机颜色和旋转角度
const getRandomColor = () => noteColors[Math.floor(Math.random() * noteColors.length)]
const getRandomRotation = () => Math.random() * 6 - 3 // -3到3度之间的随机角度

// 获取所有待办事项
const fetchTodos = async () => {
  try {
    isLoading.value = true
    const response = await axios.get('/api/todos')
    todos.value = response.data.data.map((todo: TodoResponse) => ({
      ...todo,
      id: todo.id.toString(), // 转换为字符串以配Todo接口
      completed: Boolean(todo.completed),
      color: getRandomColor(),
      rotation: getRandomRotation()
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
        updateTime: new Date().toISOString(),
        color: getRandomColor(),
        rotation: getRandomRotation()
      }
      todos.value.unshift(newTodoItem)
      newTodo.value = ''
      showAddForm.value = false
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
      // 直接从本地列表中移除该项
      const index = todos.value.findIndex(todo => todo.id === id)
      if (index !== -1) {
        todos.value.splice(index, 1)
      }
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
    <div class="todo-header">
      <h2>我的待办</h2>
      <el-button 
        v-if="!showAddForm" 
        class="add-note-button" 
        @click="showAddForm = true"
      >
        <el-icon><Plus /></el-icon>添加事项
      </el-button>
    </div>
    
    <div v-if="showAddForm" class="add-note-form">
      <div class="sticky-note new-note">
        <textarea 
          v-model="newTodo" 
          placeholder="写点什么..." 
          @keyup.enter="addTodo"
          ref="newNoteInput"
          autofocus
        ></textarea>
        <div class="note-actions">
          <el-button class="save-button" @click="addTodo">保存</el-button>
          <el-button @click="showAddForm = false">取消</el-button>
        </div>
      </div>
    </div>

    <div class="todo-list" v-loading="isLoading">
      <div v-if="todos.length === 0 && !showAddForm" class="empty-notes">
        <p>暂无待办事项</p>
        <el-button class="add-first-note" @click="showAddForm = true">
          <el-icon><Plus /></el-icon>添加第一个事项
        </el-button>
      </div>
      
      <div class="sticky-notes-container">
        <div
          v-for="todo in todos"
          :key="todo.id"
          class="sticky-note"
          :class="{ 'completed': todo.completed }"
          :style="{
            backgroundColor: todo.color,
            transform: `rotate(${todo.rotation}deg)`
          }"
        >
          <div class="note-content">
            <el-checkbox
              v-model="todo.completed"
              @change="toggleTodo(todo)"
            />
            <span class="todo-text">{{ todo.content }}</span>
          </div>
          <div class="note-footer">
            <el-button
              class="delete-button"
              @click="deleteTodo(todo.id)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.todo-container {
  width: 100%;
  height: 100%;
  padding: 20px;
  background: rgba(244, 244, 244, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 20px;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #333;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  max-height: 100%; /* 确保不超出父容器高度 */
}

.todo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

h2 {
  margin: 0;
  font-size: 1.4em;
  color: white;
  font-weight: 600;
}

.add-note-button {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  border-radius: 20px;
  padding: 8px 16px;
  transition: all 0.3s ease;
}

.add-note-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.todo-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 10px;
  max-height: calc(100% - 60px); /* 留出顶部标题和添加按钮的空间 */
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

.sticky-notes-container {
  display: flex;
  flex-wrap: wrap;
  gap: 30px;
  align-content: flex-start;
  padding: 10px;
}

.sticky-note {
  min-width: 180px;
  padding: 15px;
  border-radius: 4px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  min-height: 120px;
  position: relative;
  margin-bottom: 10px;
}

@media (max-width: 1200px) {
  .sticky-note {
    width: calc(50% - 30px);
  }
}

@media (max-width: 768px) {
  .sticky-note {
    width: 100%;
  }
}

.sticky-note::before {
  content: '';
  position: absolute;
  width: 40px;
  height: 8px;
  background: rgba(0, 0, 0, 0.1);
  top: -4px;
  left: calc(50% - 20px);
  border-radius: 4px;
}

.sticky-note:hover {
  transform: translateY(-5px) rotate(0) !important;
  box-shadow: 0 12px 20px rgba(0, 0, 0, 0.2);
  z-index: 10;
}

.note-content {
  flex: 1;
  display: flex;
  align-items: flex-start;
  margin-bottom: 10px;
}

.todo-text {
  margin-left: 10px;
  font-size: 16px;
  line-height: 1.6;
  color: #333;
  white-space: pre-wrap;
  word-break: break-word;
}

.note-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: auto;
}

.completed {
  opacity: 0.7;
}

.completed .todo-text {
  text-decoration: line-through;
  color: #888;
}

.delete-button {
  padding: 4px 8px;
  background: transparent;
  border: none;
  color: #888;
  transition: all 0.3s ease;
  border-radius: 4px;
}

.delete-button:hover {
  background: rgba(0, 0, 0, 0.05);
  color: #333;
}

.empty-notes {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
}

.empty-notes p {
  color: rgba(255, 255, 255, 0.7);
  font-size: 16px;
  margin-bottom: 20px;
}

.add-first-note {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 20px;
}

.add-first-note:hover {
  background: rgba(255, 255, 255, 0.3);
}

.add-note-form {
  margin-bottom: 30px;
}

.new-note {
  background-color: #fff59d;
  margin-bottom: 30px;
}

.new-note textarea {
  width: 100%;
  border: none;
  background: transparent;
  resize: none;
  font-size: 16px;
  line-height: 1.6;
  min-height: 100px;
  font-family: inherit;
  color: #333;
  outline: none;
  padding: 0;
  margin-bottom: 10px;
}

.note-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.save-button {
  background-color: rgba(0, 0, 0, 0.1);
  color: #333;
  border: none;
}

.save-button:hover {
  background-color: rgba(0, 0, 0, 0.2);
}

:deep(.el-checkbox__inner) {
  background-color: rgba(255, 255, 255, 0.5);
  border-color: rgba(0, 0, 0, 0.2);
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: #409EFF;
}

:deep(.el-checkbox__inner::after) {
  border-color: #fff;
}
</style> 