<script setup lang="ts">

import {onBeforeUnmount, onMounted, reactive, ref, computed} from "vue"; // 合并导入
import SearchBar from './SearchBar.vue'; // 引入 SearchBar 组件
import ContextMenu from "./ContextMenu.vue";
import {ShortcutGroup} from '../model/shortcutGroup';
import axios from 'axios'; // 引入axios

import type {FormInstance, FormRules} from 'element-plus'
import { Warning, Menu, List } from '@element-plus/icons-vue'
import { GroupItem } from '@/model/groupItem';  // 确保导入 GroupItem

// 添加网络模式状态
const isInternalNetwork = ref(localStorage.getItem('networkMode') === 'internal')

const fileInputRef = ref()

// 切换网络模式的函数
const toggleNetworkMode = () => {
  localStorage.setItem('networkMode', isInternalNetwork.value ? 'internal' : 'external')
}

const shortcutsGroup = ref<ShortcutGroup[]>([]);
const groups = ref<GroupItem[]>([]);

// 获取分组数据
const fetchGroups = async () => {
  try {
    const response = await axios.get<{ data: GroupItem[] }>('/api/groups');
    groups.value = response.data.data;
  } catch (error) {
    console.error('Error fetching groups:', error);
  }
};

// 获取快捷方式数据
const fetchShortcuts = async () => {
  try {
    const response = await axios.get('/api/shortcuts');
    const data = response.data;
    if (data.message === "success") {
      const groupsMap = new Map();
      
      // 首先,为每个已知的分组创建一个空的快捷方式数组
      groups.value.forEach(group => {
        groupsMap.set(group.id, {
          groupName: group.name,
          id: group.id,
          order: group.sort,
          shortcuts: []
        });
      });

      // 然后,将快捷方式添加到相应的分组中
      data.data.forEach((item: any) => {
        if (groupsMap.has(item.groupId)) {
          groupsMap.get(item.groupId).shortcuts.push({
            id: item.id,
            groupId: item.groupId,
            title: item.title,
            icon: item.icon,
            internalNetwork: item.internalNetwork,
            privateNetwork: item.privateNetwork,
            orderNum: item.orderNum
          });
        }
      });

      // 对每个组的shortcuts按orderNum排序
      groupsMap.forEach((group) => {
        group.shortcuts.sort((a: any, b: any) => a.orderNum - b.orderNum);
      });

      // 将Map转换为数组,并按照groups的顺序排序
      shortcutsGroup.value = groups.value
        .map(group => groupsMap.get(group.id))
        .filter(group => group !== undefined);
    }
  } catch (error) {
    console.error('Error fetching shortcuts:', error);
  }
};

// 控制对话框显示与隐藏
const isEdit = ref(false);
const selectedShortcutIndex = ref<number>(-1);
const selectedGroupShortcutIndex = ref<number>(-1);

const dialogFormVisible = ref(false)
const dialogTitle = computed(() => (isEdit.value ? '编辑导航' : '新建导航'));
// 上传了新的logo，如果上传了新的logo，没有保存则需要删除
let upload_new_logo = ref(false);

interface RuleForm {
  id: string; // 添加 id 属性
  title: string
  internalNetwork: string
  privateNetwork: string
  icon: string,
  orderNum: number
}

const ruleFormRef = ref<FormInstance>()

const form = reactive<RuleForm>({
  id: '',
  title: '',
  internalNetwork: '',
  privateNetwork: '',
  icon: '',
  orderNum: 99 // 确保包含 orderNum 属性
})

const rules = reactive<FormRules<RuleForm>>({
  title: [
    {required: true, message: '请输入导航名称', trigger: 'blur'}
  ],
  internalNetwork: [{required: true, message: '请输入公网链接', trigger: 'blur'}]
})

// 控制上下文菜单的显示与位置
const contextMenuVisible = ref(false);
const contextMenuPosition = ref({x: 0, y: 0});
const selectedItem = ref(null);


const saveShortcut = async () => {
  const shortcutData = {
    groupId: groups.value[selectedGroupShortcutIndex.value].id,
    orderNum: shortcutsGroup.value[selectedGroupShortcutIndex.value].shortcuts.length + 1, // 确保 orderNum 是最后一个
    title: form.title,
    icon: form.icon,
    internalNetwork: form.internalNetwork,
    privateNetwork: form.privateNetwork
  };

  try {
    if (isEdit.value && selectedShortcutIndex.value !== null) {
      const id = shortcutsGroup.value[selectedGroupShortcutIndex.value].shortcuts[selectedShortcutIndex.value].id;
      const response = await axios.put(`/api/shortcuts/${id}`, shortcutData);
      console.log('Update response:', response.data);
    } else {
      const response = await axios.post('/api/shortcuts', shortcutData);
      console.log('Create response:', response.data);
    }
    
    // 保存成功后,重新获取shortcuts数据
    await fetchShortcuts();
  } catch (error) {
    console.error('Error saving shortcut:', error);
  }

  dialogFormVisible.value = false;
  resetForm(true);
};

// 重置表单内容
const resetForm = (save_success:boolean) => {

  if(upload_new_logo.value && !save_success){
    //删除文件
    deleteLogo()
    upload_new_logo.value = false
  }
  form.id = '';
  form.title = '';
  form.internalNetwork = '';
  form.privateNetwork = '';
  form.icon = '';
  // Reset form validation state
  if (ruleFormRef.value) {
    ruleFormRef.value.clearValidate();
  }
};

const submitForm = async (formEl: FormInstance | undefined) => {
  if (!formEl) return
  await formEl.validate((valid: any, fields: any) => {
    if (valid) {
      console.log('submit!')
      saveShortcut()
    } else {
      console.log('error submit!', fields)
    }
  })
}

// 点击页面任意位置时关闭右键菜单
const handleOutsideClick = (event: { target: Node | null; }) => {
  const menu = document.querySelector('.context-menu');
  if (menu && !menu.contains(event.target)) {
    hideContextMenu();
  }
};



// ContextMenu右击事件监听回调
const editItem = () => {
  // 在这里添加编辑逻辑，比如打开编辑弹窗
  isEdit.value = true;
  dialogFormVisible.value = true;
  Object.assign(form, selectedItem.value)
  console.log('Edit:', selectedItem.value);
};

const removeItem = async () => {
  const groupIndex = selectedGroupShortcutIndex.value;
  const index = selectedShortcutIndex.value;
  const shortcutId = shortcutsGroup.value[groupIndex].shortcuts[index].id;

  try {
    const response = await axios.delete(`/api/shortcuts/${shortcutId}`);
    console.log('Remove response:', response.data);
    // 删除成功后,重新获取shortcuts数据
    await fetchShortcuts();
  } catch (error) {
    console.error('Error removing shortcut:', error);
  }
};

const hideContextMenu = () => {
  contextMenuVisible.value = false;
};


const triggerFileUpload = () => {
  // 触文选择
  if (fileInputRef) {
    fileInputRef.value.click();
  }
};


const handleFileChange = async (event: any) => {
  const file = event.target.files[0];
  if (file) {
    // 创建 FormData 对象
    const formData = new FormData();
    formData.append('file', file);

    try {
      // 使用 axios 上传文件
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      console.log('文件上传成功:', response.data);
      // 更新 form.icon 为上传后的文件路径
      form.icon = response.data.filepath;
      upload_new_logo.value = true;
    } catch (error) {
      console.error('文件上传失败:', error);
    }
  }

};


const fetchLogo = async () => {
  if (form.internalNetwork == undefined || form.internalNetwork == '') {
    return;
  }
  const response = await axios.get('/api/fetch-logo', {
    params: {url: form.internalNetwork}
  });
  console.log('抓取logo成功:', response.data);
  form.icon = response.data.path;
  upload_new_logo.value = true;
};

const deleteLogo = async () => {
  if (upload_new_logo.value) {
    try {
      const response = await axios.delete('/api/delete-logo', {
        params: { filename: form.icon } // 换为实际的文件路径
      });
      console.log('件删功:', response.data);
      // ElMessage.success('文件删除成功');
    } catch (error) {
      console.error('删除文件失败:', error);
      // ElMessage.error('删除文件失败');
    }
  }
};

const searchBarRef = ref<InstanceType<typeof SearchBar> | null>(null);

// 添加 isLoading 的定义
const isLoading = ref(true);

// 在组件挂载时,先获取分组,然后获取快捷方式
onMounted(async () => {
  isLoading.value = true;
  try {
    await fetchGroups();
    await fetchShortcuts();
  } catch (error) {
    console.error('Error loading data:', error);
  } finally {
    isLoading.value = false;
  }
  window.addEventListener('click', handleOutsideClick as EventListener);
  
  // 在下一个 tick 中聚焦搜索框
  setTimeout(() => {
    searchBarRef.value?.focus();
  }, 0);
  document.addEventListener('click', handleClickOutside)
});

onBeforeUnmount(() => {
  window.removeEventListener('click', handleOutsideClick as EventListener);
  document.removeEventListener('click', handleClickOutside)
  localStorage.setItem('networkMode', isInternalNetwork.value ? 'internal' : 'external')
});


const editingGroupId = ref<number | null>(null)
const editingGroupName = ref('')

// 修改编辑分组的方法

// 添加保存分组名称的方法
const saveGroupName = async (group: GroupItem) => {
  if (!editingGroupId.value) return
  
  try {
    const response = await axios.put(`/api/groups/${group.id}`, {
      name: editingGroupName.value
    })
    if (response.data.message === 'success') {
      // 更新本地数据
      const groupToUpdate = groups.value.find(g => g.id === group.id)
      if (groupToUpdate) {
        groupToUpdate.name = editingGroupName.value
      }
      // 重新获取数据
      await fetchGroups()
      await fetchShortcuts()
    }
  } catch (error) {
    console.error('Error updating group name:', error)
  } finally {
    editingGroupId.value = null
  }
}

// 添加点击外部保存的处理函数
const handleClickOutside = (event: MouseEvent) => {
  if (editingGroupId.value !== null) {
    const editInput = document.querySelector('.editing-group-name')
    if (editInput && !editInput.contains(event.target as Node)) {
      const group = groups.value.find(g => g.id === editingGroupId.value)
      if (group) {
        saveGroupName(group)
      }
    }
  }
}

const addGroupDialogVisible = ref(false)
const newGroupName = ref('')

// 添加新建分组的方法
const createNewGroup = async () => {
  if (!newGroupName.value.trim()) return
  
  try {
    const response = await axios.post('/api/groups', {
      name: newGroupName.value,
      sort: groups.value.length + 1 // 新分组放到最后
    })
    
    if (response.data.message === 'success') {
      // 重新获取数据
      await fetchGroups()
      await fetchShortcuts()
      newGroupName.value = ''
      addGroupDialogVisible.value = false
    }
  } catch (error) {
    console.error('Error creating group:', error)
  }
}

const deleteGroupVisible = ref(false)
const deletingGroupId = ref<number | null>(null)
const isDeleting = ref(false)

// 添加删除分组的方法
const deleteGroup = async (groupId: number) => {
  if (!groupId) return
  
  try {
    isDeleting.value = true
    const response = await axios.delete(`/api/groups/${groupId}`)
    if (response.data.message === 'success') {
      // 重新获取数据
      await fetchGroups()
      await fetchShortcuts()
    }
  } catch (error) {
    console.error('Error deleting group:', error)
  } finally {
    isDeleting.value = false
    deleteGroupVisible.value = false
    deletingGroupId.value = null
  }
}



</script>

<template>
  <div class="main-container">
    <SearchBar />
    <div class="content-container">
      <!-- 侧边菜单栏 -->
      <div class="side-menu">
        <router-link 
          to="/home/navigation" 
          class="menu-item"
          active-class="active"
        >
          <el-icon><Menu /></el-icon>
          <span>导航面板</span>
        </router-link>
        <router-link 
          to="/home/todo" 
          class="menu-item"
          active-class="active"
        >
          <el-icon><List /></el-icon>
          <span>待办事项</span>
        </router-link>
      </div>
      
      <!-- 路由视图，显示子路由内容 -->
      <div class="main-content">
        <router-view></router-view>
      </div>
    </div>
  </div>

  <!--    新增/编辑导航栏-->
  <el-dialog 
    v-model="dialogFormVisible" 
    :title="dialogTitle" 
    width="600" 
    @close="resetForm"
    custom-class="custom-dialog"
  >
    <el-form :model="form" ref="ruleFormRef" :rules="rules" class="demo-ruleForm" label-position="top">
      <div class="form-row">
        <div class="form-left">
          <el-form-item label="名称" prop="title">
            <el-input v-model="form.title" autocomplete="off"/>
          </el-form-item>
          <el-form-item label="图标">
            <el-input v-model="form.icon" autocomplete="off">
              <template #append>
                <el-button @click="triggerFileUpload">上传图标</el-button>
              </template>
            </el-input>
            <input type="file" ref="fileInputRef" @change="handleFileChange" style="display: none;"/>
          </el-form-item>
        </div>
        <div class="form-right">
          <el-form-item label=" " class="logo-preview">
            <img :src="form.icon" v-if="form.icon" alt="Logo预览" class="preview-image">
            <div v-else class="no-image"></div>
          </el-form-item>
        </div>
      </div>
      <div class="address-row">
        <el-form-item label="公网地址" prop="internalNetwork" class="address-item">
          <el-input v-model="form.internalNetwork" autocomplete="off">
            <template #append>
              <el-button @click="fetchLogo">获取图标</el-button>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="内网地址" class="address-item">
          <el-input v-model="form.privateNetwork" autocomplete="off"/>
        </el-form-item>
      </div>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="dialogFormVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm(ruleFormRef)">保存</el-button>
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

  <!-- 添加新建组的对话框 -->
  <el-dialog
    v-model="addGroupDialogVisible"
    title="新建分组"
    width="400px"
    custom-class="custom-dialog"
  >
    <el-form>
      <el-form-item label="分组名称">
        <el-input 
          v-model="newGroupName" 
          placeholder="请输入分组名称"
          @keyup.enter="createNewGroup"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="addGroupDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="createNewGroup">确定</el-button>
      </div>
    </template>
  </el-dialog>

  <!-- 添加删除确认对话框 -->
  <el-dialog
    v-model="deleteGroupVisible"
    title="删除分组"
    width="400px"
    custom-class="custom-dialog"
  >
    <div class="delete-confirm-content">
      <el-icon class="warning-icon" color="#ff4d4f"><Warning /></el-icon>
      <p>确定要删除该分组吗？删除后该分组下的所有航也将被删除！</p>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="deleteGroupVisible = false">取消</el-button>
        <el-button 
          type="danger" 
          @click="deletingGroupId !== null && deleteGroup(deletingGroupId)"
          :loading="isDeleting"
        >
          {{ isDeleting ? '正在删除...' : '确定删除' }}
        </el-button>
      </div>
    </template>
  </el-dialog>

  <!-- 添加网络模式切换按钮 -->
  <div class="network-mode-switch">
    <el-switch
      v-model="isInternalNetwork"
      active-text="内网"
      inactive-text="公网"
      @change="toggleNetworkMode"
    />
  </div>

</template>

<style scoped>
.main-container {
  min-height: 100vh;
  min-width: 100vw;
  background-image: url('/src/assets/background.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  background-attachment: fixed;
  animation: fadeIn 1s ease-in-out;
  padding: 20px;
  box-sizing: border-box;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100vh; /* 确保容器占满整个视口高度 */
}

.content-container {
  display: flex;
  gap: 20px;
  width: 100%;
  max-width: 1600px;
  margin-top: 20px;
  height: calc(100vh - 100px); /* 调整为较小的高度值，减去SearchBar和padding的高度 */
  max-height: calc(100vh - 100px); /* 添加最大高度限制 */
  overflow: hidden; /* 防止内容溢出 */
}

/* 侧边菜单样式 */
.side-menu {
  width: 200px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 20px 0;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  border: 1px solid rgba(255, 255, 255, 0.18);
  display: flex;
  flex-direction: column;
  overflow-y: auto; /* 添加滚动条，以防内容过多 */
  max-height: 100%; /* 确保不超出父容器高度 */
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 15px 20px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.1);
}

.menu-item.active {
  background: rgba(255, 255, 255, 0.2);
  border-left: 3px solid white;
}

.menu-item .el-icon {
  margin-right: 10px;
  font-size: 18px;
}

/* 主内容区样式 */
.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  height: 100%; /* 确保内容区域占满整个高度 */
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 20px;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  border: 1px solid rgba(255, 255, 255, 0.18);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.network-mode-switch {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 100;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  padding: 8px 12px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.18);
}

:deep(.el-switch__label) {
  color: white;
}

:deep(.el-switch.is-checked .el-switch__core) {
  background-color: rgba(64, 158, 255, 0.8);
  border-color: transparent;
}

:deep(.el-switch__core) {
  background-color: rgba(255, 255, 255, 0.2);
  border-color: transparent;
}

:deep(.el-switch:hover:not(.is-disabled) .el-switch__core) {
  background-color: rgba(64, 158, 255, 0.9);
}

/* 修改SearchBar组件的上边距 */
:deep(.search-bar-container) {
  margin-top: 10px;
}
</style>

































