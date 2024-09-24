<template>
  <div v-if="visible" class="dialog-overlay">
    <div class="dialog">
      <h3>{{ isEdit ? '编辑导航' : '添加新导航' }}</h3>
      <input v-model="formData.title" placeholder="标题" />
      <input v-model="formData.icon" placeholder="图标路径" />
      <input v-model="formData.link" placeholder="链接" />
      <div class="dialog-actions">
        <button @click="save">保存</button>
        <button @click="cancel">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

// Props from parent to control visibility and initial data
const props = defineProps({
  visible: Boolean, // 控制对话框是否显示
  isEdit: Boolean,  // 判断是编辑还是新增模式
  initialData: {
    type: Object,
    default: () => ({ title: '', icon: '', link: '' })
  }
});

const emit = defineEmits(['save', 'cancel']); // Emit events to parent

const formData = ref({ ...props.initialData });

// 当初始数据改变时更新表单数据（主要用于编辑模式）
watch(() => props.initialData, (newData) => {
  formData.value = { ...newData };
});

// 保存数据，向父组件传递保存事件并关闭对话框
const save = () => {
  emit('save', formData.value);
};

// 取消并关闭对话框
const cancel = () => {
  emit('cancel');
};
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
}

.dialog {
  background: white;
  padding: 20px;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  width: 300px;
}

.dialog input {
  margin: 10px 0;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 5px;
  width: 100%;
}

.dialog-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
}

.dialog-actions button {
  padding: 8px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.dialog-actions button:first-child {
  background-color: #42b883;
  color: white;
}

.dialog-actions button:last-child {
  background-color: #ccc;
}
</style>
