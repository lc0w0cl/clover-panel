<script setup>
import HelloWorld from './components/HelloWorld.vue'
import ShortcutCard from './components/ShortcutCard.vue';
import {onBeforeUnmount, onMounted, ref} from "vue";
import ShortcutDialog from './components/ShortcutDialog.vue'; // 引入新增/编辑组件

const shortcuts = ref([
  { title: 'Google', icon: '/vite.svg', link: 'https://www.google.com' },
  { title: 'YouTube', icon: '/src/assets/vue.svg', link: 'https://www.youtube.com' },
  { title: 'GitHub', icon: '/vite.svg', link: 'https://www.github.com' },
  { title: 'Twitter', icon: '/src/assets/vue.svg', link: 'https://www.twitter.com' },
  // 继续添加更多快捷方式
])

// 控制对话框显示与隐藏
const showDialog = ref(false);
const isEdit = ref(false);
const selectedShortcutIndex = ref(null);
const initialData = ref({ title: '', icon: '', link: '' });

// 控制上下文菜单的显示与位置
const showContextMenu = ref(false);
const contextMenuStyle = ref({ top: '0px', left: '0px' });

// 用于存储正在编辑/新增的导航数据
const newShortcut = ref({
  title: '',
  icon: '',
  link: ''
});

const openAddDialog = () => {
  isEdit.value = false;
  initialData.value = { title: '', icon: '', link: '' };
  showDialog.value = true;
};

const openEditDialog = (index) => {
  isEdit.value = true;
  selectedShortcutIndex.value = index;
  initialData.value = { ...shortcuts.value[index] };
  showDialog.value = true;
};

const saveShortcut = (newData) => {
  if (isEdit.value && selectedShortcutIndex.value !== null) {
    shortcuts.value[selectedShortcutIndex.value] = { ...newData };
  } else {
    shortcuts.value.push({ ...newData });
  }
  showDialog.value = false;
};

const deleteShortcut = (index) => {
  shortcuts.value.splice(index, 1);
};

const cancelDialog = () => {
  showDialog.value = false;
};

// 添加点击事件监听器，点击页面的任何地方都可以关闭右键菜单
const closeContextMenu = () => {
  showContextMenu.value = false;
};

// 处理右键菜单
const handleContextMenu = (event, index) => {
  event.preventDefault(); // 阻止默认右键菜单
  selectedShortcutIndex.value = index; // 保存选中的索引
  showContextMenu.value = true; // 显示自定义菜单
  contextMenuStyle.value = {
    top: `${event.clientY}px`,
    left: `${event.clientX}px`
  };
};

// 点击页面任意位置时关闭右键菜单
const handleOutsideClick = (event) => {
  const menu = document.querySelector('.context-menu');
  if (menu && !menu.contains(event.target)) {
    showContextMenu.value = false;
  }
};

// 点击菜单项
const onMenuItemClick = (action) => {
  if (action === 'edit') {
    openEditDialog(selectedShortcutIndex.value);
  } else if (action === 'delete') {
    deleteShortcut(selectedShortcutIndex.value);
  }
  showContextMenu.value = false; // 隐藏菜单
};


// 添加全局点击事件监听
window.addEventListener('click', handleOutsideClick);

// // 在组件挂载时添加事件监听器，组件销毁时移除监听器
// onMounted(() => {
//   window.addEventListener('click', handleOutsideClick);
// });
//
// onBeforeUnmount(() => {
//   window.removeEventListener('click', handleOutsideClick);
// });

</script>

<template>

  <div @click="closeContextMenu">
    <!-- 现有的导航展示 -->
    <div class="shortcuts-container">
      <ShortcutCard
          v-for="(item, index) in shortcuts"
          :key="item.title"
          :title="item.title"
          :icon="item.icon"
          :link="item.link"
          @contextmenu="handleContextMenu($event, index)"
      />
      <!-- "+" 添加新导航按钮 -->
      <div class="shortcut-card add-card" @click="openAddDialog">
        <div class="plus-icon">+</div>
      </div>
    </div>

    <!-- 弹出的新增/编辑对话框组件 -->
    <ShortcutDialog
        :visible="showDialog"
        :isEdit="isEdit"
        :initialData="initialData"
        @save="saveShortcut"
        @cancel="cancelDialog"
    />

    <!-- 自定义右键菜单 -->
    <div v-if="showContextMenu" :style="contextMenuStyle" class="context-menu">
      <ul>
        <li @click="onMenuItemClick('edit')">编辑</li>
        <li @click="onMenuItemClick('delete')">删除</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.shortcuts-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
}

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
}

.shortcut-card:hover {
  transform: scale(1.05);
}

.add-card {
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f0f0f0;
  color: #42b883;
  font-size: 2em;
  font-weight: bold;
  cursor: pointer;
}

.plus-icon {
  font-size: 2em;
  user-select: none;
}

.context-menu {
  position: absolute;
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 5px;
  box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.context-menu ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.context-menu li {
  padding: 10px 20px;
  cursor: pointer;
  transition: background-color 0.2s;
  user-select: none; /* 禁用文本选择，防止出现光标 */
}

.context-menu li:focus {
  outline: none; /* 移除点击后可能出现的默认焦点样式 */
}

.context-menu li:hover {
  background-color: #f0f0f0;
}

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
