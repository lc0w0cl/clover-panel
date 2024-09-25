<script setup>
import ShortcutCard from './components/ShortcutCard.vue';
import {onBeforeUnmount, onMounted, ref} from "vue";
import ShortcutDialog from './components/ShortcutDialog.vue'; // 引入新增/编辑组件
import SearchBar from './components/SearchBar.vue'; //引入 SearchBar 组件
import ContextMenu from "./components/ContextMenu.vue";


const shortcuts = ref([
  {title: 'Google', icon: '/vite.svg', link: 'https://www.google.com'},
  {title: 'YouTube', icon: '/src/assets/vue.svg', link: 'https://www.youtube.com'},
  {title: 'GitHub', icon: '/vite.svg', link: 'https://www.github.com'},
  {title: 'Twitter', icon: '/src/assets/vue.svg', link: 'https://www.twitter.com'},
  // 继续添加更多快捷方式
])

// 控制对话框显示与隐藏
const showDialog = ref(false);
const isEdit = ref(false);
const selectedShortcutIndex = ref(null);
const initialData = ref({title: '', icon: '', link: ''});

// 控制上下文菜单的显示与位置
const contextMenuVisible = ref(false);
const contextMenuPosition = ref({x: 0, y: 0});
const selectedItem = ref(null);

// 搜索框输入内容
const searchQuery = ref('');

// 提交搜索表单
const submitSearch = () => {
  if (searchQuery.value.trim() !== '') {
    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery.value)}`;
    window.open(googleSearchUrl, '_blank');
  }
};


const openAddDialog = () => {
  isEdit.value = false;
  initialData.value = {title: '', icon: '', link: ''};
  showDialog.value = true;
};

const openEditDialog = (index) => {
  isEdit.value = true;
  selectedShortcutIndex.value = index;
  initialData.value = {...shortcuts.value[index]};
  showDialog.value = true;
};

const saveShortcut = (newData) => {
  if (isEdit.value && selectedShortcutIndex.value !== null) {
    shortcuts.value[selectedShortcutIndex.value] = {...newData};
  } else {
    shortcuts.value.push({...newData});
  }
  showDialog.value = false;
};

const deleteShortcut = (index) => {
  shortcuts.value.splice(index, 1);
};

const cancelDialog = () => {
  showDialog.value = false;
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


// 打开右击菜单
const showContextMenu = (event, item, index) => {
  contextMenuVisible.value = true;
  contextMenuPosition.value = {x: event.clientX, y: event.clientY};
  selectedItem.value = item;
  selectedShortcutIndex.value = index;
};


// ContextMenu右击事件监听回调
const editItem = () => {
  // 在这里添加编辑逻辑，比如打开编辑弹窗
  openEditDialog(selectedShortcutIndex.value);
  console.log('Edit:', selectedItem.value);
};

const removeItem = () => {
  // 在这里添加删除逻辑
  deleteShortcut(selectedShortcutIndex.value);
  console.log('Remove:', selectedItem.value);
};

const hideContextMenu = () => {
  contextMenuVisible.value = false;
};


// 在组件挂载时添加事件监听器，组件销毁时移除监听器
onMounted(() => {
  window.addEventListener('click', handleOutsideClick);
});

onBeforeUnmount(() => {
  window.removeEventListener('click', handleOutsideClick);
});

</script>

<template>

  <div>
    <!-- 使用 SearchBar 组件 -->
    <SearchBar/>

    <!-- 现有的导航展示 -->
    <div class="shortcuts-container">
      <ShortcutCard
          v-for="(item, index) in shortcuts"
          :key="item.title"
          :title="item.title"
          :icon="item.icon"
          :link="item.link"
          @contextmenu.prevent="showContextMenu($event, item,index)"
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

    <!--    右击菜单-->
    <ContextMenu
        :visible="contextMenuVisible"
        :position="contextMenuPosition"
        @edit="editItem"
        @remove="removeItem"
        @hideMenu="hideContextMenu"
    />

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
  //background-color: #f0f0f0;
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

</style>
