<script setup>
import ShortcutCard from './components/ShortcutCard.vue';
import {onBeforeUnmount, onMounted, reactive, ref} from "vue";
import ShortcutDialog from './components/ShortcutDialog.vue'; // 引入新增/编辑组件
import SearchBar from './components/SearchBar.vue'; //引入 SearchBar 组件
import ContextMenu from "./components/ContextMenu.vue";
import {computed} from "vue";


const shortcutsGroup = ref([
  {groupName: '吴彦祖',order:1,shortcuts:[
      {title: 'Google', icon: '/vite.svg', internalNetwork: 'https://www.google.com',privateNetwork: ''},
      {title: 'YouTube', icon: '/src/assets/vue.svg', internalNetwork: 'https://www.youtube.com',privateNetwork: ''},
      {title: 'GitHub', icon: '/vite.svg', internalNetwork: 'https://www.github.com',privateNetwork: ''},
      {title: 'Twitter', icon: '/src/assets/vue.svg', internalNetwork: 'https://www.twitter.com',privateNetwork: ''},
      {title: 'Twitter', icon: '/src/assets/vue.svg', internalNetwork: 'https://www.twitter.com',privateNetwork: ''},
      {title: 'Twitter', icon: '/src/assets/vue.svg', internalNetwork: 'https://www.twitter.com',privateNetwork: ''},
      {title: 'Twitter', icon: '/src/assets/vue.svg', internalNetwork: 'https://www.twitter.com',privateNetwork: ''},
      {title: 'Twitter', icon: '/src/assets/vue.svg', internalNetwork: 'https://www.twitter.com',privateNetwork: ''},
      {title: 'Twitter', icon: '/src/assets/vue.svg', internalNetwork: 'https://www.twitter.com',privateNetwork: ''},
      {title: 'Twitter', icon: '/src/assets/vue.svg', internalNetwork: 'https://www.twitter.com',privateNetwork: ''},
      {title: 'Twitter', icon: '/src/assets/vue.svg', internalNetwork: 'https://www.twitter.com',privateNetwork: ''},
      {title: 'Twitter', icon: '/src/assets/vue.svg', internalNetwork: 'https://www.twitter.com',privateNetwork: ''},
      {title: 'Twitter', icon: '/src/assets/vue.svg', internalNetwork: 'https://www.twitter.com',privateNetwork: ''},
      {title: 'Twitter', icon: '/src/assets/vue.svg', internalNetwork: 'https://www.twitter.com',privateNetwork: ''},
      {title: 'Twitter', icon: '/src/assets/vue.svg', internalNetwork: 'https://www.twitter.com',privateNetwork: ''},
      // 继续添加更多快捷方式
    ]},
  {groupName: '如来佛祖',order: 2,shortcuts:[
      {title: 'Google', icon: '/vite.svg', internalNetwork: 'https://www.google.com',privateNetwork: ''},
      {title: 'YouTube', icon: '/src/assets/vue.svg', internalNetwork: 'https://www.youtube.com',privateNetwork: ''},
      {title: 'GitHub', icon: '/vite.svg', internalNetwork: 'https://www.github.com',privateNetwork: ''},
      {title: 'Twitter', icon: '/src/assets/vue.svg', internalNetwork: 'https://www.twitter.com',privateNetwork: ''},
      {title: 'Twitter', icon: '/src/assets/vue.svg', internalNetwork: 'https://www.twitter.com',privateNetwork: ''},
      {title: 'Twitter', icon: '/src/assets/vue.svg', internalNetwork: 'https://www.twitter.com',privateNetwork: ''},
      {title: 'Twitter', icon: '/src/assets/vue.svg', internalNetwork: 'https://www.twitter.com',privateNetwork: ''},
      {title: 'Twitter', icon: '/src/assets/vue.svg', internalNetwork: 'https://www.twitter.com',privateNetwork: ''},
      {title: 'Twitter', icon: '/src/assets/vue.svg', internalNetwork: 'https://www.twitter.com',privateNetwork: ''},
      {title: 'Twitter', icon: '/src/assets/vue.svg', internalNetwork: 'https://www.twitter.com',privateNetwork: ''},
      {title: 'Twitter', icon: '/src/assets/vue.svg', internalNetwork: 'https://www.twitter.com',privateNetwork: ''},
      {title: 'Twitter', icon: '/src/assets/vue.svg', internalNetwork: 'https://www.twitter.com',privateNetwork: ''},
      {title: 'Twitter', icon: '/src/assets/vue.svg', internalNetwork: 'https://www.twitter.com',privateNetwork: ''},
      {title: 'Twitter', icon: '/src/assets/vue.svg', internalNetwork: 'https://www.twitter.com',privateNetwork: ''},
      {title: 'Twitter', icon: '/src/assets/vue.svg', internalNetwork: 'https://www.twitter.com',privateNetwork: ''},
      // 继续添加更多快捷方式
    ] }
])

// 控制对话框显示与隐藏
const showDialog = ref(false);
const isEdit = ref(false);
const selectedShortcutIndex = ref(null);
const selectedGroupShortcutIndex = ref(null);
const initialData = ref({title: '', icon: '', link: ''});

const dialogFormVisible = ref(false)
const dialogTitle = computed(() => (isEdit.value ? '编辑导航' : '新建导航'));

const form = reactive({
  title: '',
  internalNetwork: '',
  privateNetwork: '',
  icon: ''
})

// 控制上下文菜单的显示与位置
const contextMenuVisible = ref(false);
const contextMenuPosition = ref({x: 0, y: 0});
const selectedItem = ref(null);


const saveShortcut = () => {
  if (isEdit.value && selectedShortcutIndex.value !== null) {
    shortcutsGroup.value[selectedGroupShortcutIndex.value].shortcuts[selectedShortcutIndex.value] = {...form};
  } else {
    shortcutsGroup.value[selectedGroupShortcutIndex.value].shortcuts.push({...form})
  }
  dialogFormVisible.value = false;

  //清理form对象
  resetForm()
};

// 重置表单内容
const resetForm = () => {
  form.title = '';
  form.internalNetwork = '';
  form.privateNetwork = '';
  form.icon = '';
};
const deleteShortcut = (groupIndex,index) => {
  shortcutsGroup.value[groupIndex].shortcuts.splice(index, 1);
};


// 点击页面任意位置时关闭右键菜单
const handleOutsideClick = (event) => {
  const menu = document.querySelector('.context-menu');
  if (menu && !menu.contains(event.target)) {
    hideContextMenu();
  }
};

// 打开右击菜单
const showContextMenu = (event, item, groupIndex,index) => {
  contextMenuVisible.value = true;
  contextMenuPosition.value = {x: event.clientX, y: event.clientY};
  selectedItem.value = item;
  selectedShortcutIndex.value = index;
  selectedGroupShortcutIndex.value = groupIndex
};


// ContextMenu右击事件监听回调
const editItem = () => {
  // 在这里添加编辑逻辑，比如打开编辑弹窗
  isEdit.value = true;
  dialogFormVisible.value = true;
  Object.assign(form,selectedItem.value)
  console.log('Edit:', selectedItem.value);
};

const removeItem = () => {
  // 在这里添加删除逻辑
  deleteShortcut(selectedGroupShortcutIndex.value,selectedShortcutIndex.value);
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
    <div v-for="(itemGroup,groupIndex) in shortcutsGroup" :key="itemGroup.groupName">
      {{itemGroup.groupName}}
      <div class="shortcuts-container">
        <ShortcutCard
            v-for="(item, index) in itemGroup.shortcuts"
            :key="item.title"
            :title="item.title"
            :icon="item.icon"
            :link="item.link"
            @contextmenu.prevent="showContextMenu($event, item,groupIndex,index)"
        />
        <!-- "+" 添加新导航按钮 -->
        <div class="shortcut-card add-card" @click="dialogFormVisible=true;selectedGroupShortcutIndex=groupIndex;isEdit=false">
          <div class="plus-icon">+</div>
        </div>
      </div>
    </div>

    <!-- 弹出的新增/编辑对话框组件 -->
    <ShortcutDialog
        :visible="showDialog"
        :isEdit="isEdit"
        :initialData="initialData"
        @save="saveShortcut"
        @cancel="resetForm"
    />

<!--    新增/编辑导航栏-->
    <el-dialog v-model="dialogFormVisible" :title="dialogTitle" width="500" >
      <el-form :model="form">
        <el-form-item label="" >
          <span>名称</span>
          <el-input v-model="form.title" autocomplete="off" />
        </el-form-item>
        <el-form-item label="">
          <span>图标</span>
          <el-input v-model="form.icon" autocomplete="off" />
        </el-form-item>
        <el-form-item label="">
          <span>公网地址</span>
          <el-input v-model="form.internalNetwork" autocomplete="off" />
        </el-form-item>
        <el-form-item label="">
          <span>内网地址</span>
          <el-input v-model="form.privateNetwork" autocomplete="off" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="saveShortcut">
            保存
          </el-button>
        </div>
      </template>
    </el-dialog>

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
  //justify-content: center;
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

</style>
