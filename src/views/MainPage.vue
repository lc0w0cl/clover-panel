<script setup lang="ts">
import ShortcutCard from './ShortcutCard.vue';
import {onBeforeUnmount, onMounted, reactive, ref, computed} from "vue"; // 合并导入
import SearchBar from './SearchBar.vue'; // 引入 SearchBar 组件
import ContextMenu from "./ContextMenu.vue";
import SettingPage from "./SettingPage.vue";
import {ShortcutGroup} from '../model/shortcutGroup';
import axios from 'axios'; // 引入axios
import {VueDraggable} from 'vue-draggable-plus'
import type {FormInstance, FormRules} from 'element-plus'
import {Setting} from '@element-plus/icons-vue'
import { GroupItem } from '@/model/groupItem';  // 确保导入 GroupItem

// 添加网络模式状态
const isInternalNetwork = ref(false);

const fileInputRef = ref()

// 切换网络模式的函数
const toggleNetworkMode = () => {
  isInternalNetwork.value = !isInternalNetwork.value;
};

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
          order: group.sort,
          shortcuts: []
        });
      });

      // 然后,将快捷方式添加到相应的分组中
      data.data.forEach((item: any) => {
        if (groupsMap.has(item.groupId)) {
          groupsMap.get(item.groupId).shortcuts.push({
            id: item.id,
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

const settingPageVisible = ref(false)

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
    orderNum: shortcutsGroup.value[selectedGroupShortcutIndex.value].order,
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

// 打开右击菜单
const showContextMenu = (event: MouseEvent, item: any, groupIndex: number, index: number) => {
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


const dragCompleted = async (groupId: number) => {
  const group = shortcutsGroup.value.find(g => g.groupName === groups.value.find(group => group.id === groupId)?.name);

  if (group) {
    group.shortcuts.forEach((shortcut: { orderNum: any; }, index: number) => {
      shortcut.orderNum = index + 1;
    });
    console.log('重新编号后的组:', group.shortcuts);

    try {
      const response = await axios.put(`/api/shortcuts/group/${groupId}`, {
        shortcuts: group.shortcuts
      });
      console.log('数据库更新成功:', response.data);
    } catch (error) {
      console.error('数据库更新失败:', error);
    }
  } else {
    console.log('没有找到匹配的组');
  }
}


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
        params: { filename: form.icon } // 替换为实际的文件路径
      });
      console.log('件删���成功:', response.data);
      // ElMessage.success('文件删除成功');
    } catch (error) {
      console.error('删除文件失败:', error);
      // ElMessage.error('删除文件失败');
    }
  }
};

const searchBarRef = ref<InstanceType<typeof SearchBar> | null>(null);

// 在组件挂载时,先获取分组,然后获取快捷方式
onMounted(async () => {
  await fetchGroups();
  await fetchShortcuts();
  window.addEventListener('click', handleOutsideClick as EventListener);
  
  // 在下一个 tick 中聚焦搜索框
  setTimeout(() => {
    searchBarRef.value?.focus();
  }, 0);
});

onBeforeUnmount(() => {
  window.removeEventListener('click', handleOutsideClick as EventListener);
});

</script>

<template>
  <div class="main-container">
    <!-- 网络模式切换按钮 -->
    <el-button
      class="network-mode-toggle custom-button"
      @click="toggleNetworkMode"
      :class="{ 'internal-network': isInternalNetwork }"
    >
      {{ isInternalNetwork ? '内网模式' : '外网模式' }}
    </el-button>
    
    <!-- 设置按钮 -->
    <el-button
      class="setting-toggle custom-button"
      @click="settingPageVisible=true"
    >
      <el-icon><Setting /></el-icon>
    </el-button>

    <!-- 添加一个包装器来调整 SearchBar 位置 -->
    <div class="search-bar-wrapper">
      <SearchBar ref="searchBarRef"/>
    </div>

    <!-- 现有的导航展示 -->
    <div class="navigation-display">
      <div v-for="(itemGroup, groupIndex) in shortcutsGroup" :key="itemGroup.groupName">
        <div class="group-header">
          <div class="group-title-container">
            <span class="group-title">{{ itemGroup.groupName }}</span>
            <div 
              class="add-icon" 
              @click="dialogFormVisible=true;selectedGroupShortcutIndex=groupIndex;isEdit=false"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 2V14" stroke="white" stroke-width="3.5" stroke-linecap="round"/>
                <path d="M2 8H14" stroke="white" stroke-width="3.5" stroke-linecap="round"/>
              </svg>
            </div>
          </div>
        </div>

        <div class="shortcuts-container">
          <VueDraggable ref="el" v-model="itemGroup.shortcuts" style="display: flex;"
                        @update="dragCompleted(groups[groupIndex].id)">
            <ShortcutCard
                v-for="(item, index) in itemGroup.shortcuts"
                :key="item.title"
                :title="item.title"
                :icon="item.icon"
                :link="isInternalNetwork ? item.privateNetwork : item.internalNetwork"
                @contextmenu.prevent="showContextMenu($event, item,groupIndex,index)"
            />
          </VueDraggable>
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

  </div>



  <el-dialog v-model="settingPageVisible" title="系统设置" width="800">
    <SettingPage/>
  </el-dialog>


  
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
  padding: 20px;
  box-sizing: border-box;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.search-bar-wrapper {
  margin-top: 60px; /* 调整这个值来改变搜索框距离顶部的距离 */
  width: 100%;
  max-width: 600px; /* 可以根据需要调整最大宽度 */
}

.navigation-display {
  margin-top: 30px; /* 给导显示区域添加一些上边距 */
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  border: 1px solid rgba(255, 255, 255, 0.18);
  width: 100%;
  max-width: 1200px; /* 或者您认为合适的最大宽度 */
  margin: 0 auto;
}

.shortcuts-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 15px;
  margin-bottom: 30px;
}

.group-header {
  margin-bottom: 15px;
}

.group-title-container {
  display: inline-flex;
  align-items: center;
}

.group-title {
  font-size: 1.2em;
  font-weight: bold;
  color: #ffffff;
  margin-right: 10px; /* 为 "+" 号留出空间 */
}

.add-icon {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.group-title-container:hover .add-icon {
  opacity: 1;
}

.add-icon:hover svg path {
  stroke: #e6e6e6;
}

.custom-button {
  position: fixed;
  top: 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: white;
  font-weight: bold;
  transition: all 0.3s ease;
  z-index: 1000;
}

.custom-button:hover {
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
}

.network-mode-toggle {
  right: 80px;
}

.network-mode-toggle.internal-network {
  background: rgba(76, 175, 80, 0.2);
}

.network-mode-toggle.internal-network:hover {
  background: rgba(76, 175, 80, 0.3);
}

.setting-toggle {
  right: 20px;
  padding: 10px;
}

.setting-toggle .el-icon {
  font-size: 1.2em;
}

.custom-dialog {
  border-radius: 20px;
  overflow: hidden;
}

:deep(.el-dialog) {
  border-radius: 20px;
  overflow: hidden;
}

:deep(.el-dialog__header) {
  padding: 15px;
}

:deep(.el-dialog__body) {
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

:deep(.el-dialog__footer) {
  background-color: rgba(245, 247, 250, 0.8);
}

.address-row {
  display: flex;
  gap: 20px;
}

.address-item {
  flex: 1;
}

:deep(.el-form-item__content) {
  width: 100%;
}

:deep(.el-input-group__append) {
  background-color: #409EFF;
  border-color: #409EFF;
  color: white;
}

:deep(.el-input-group__append .el-button) {
  color: white;
  border: none;
  background-color: transparent;
}

:deep(.el-input-group__append .el-button:hover) {
  color: #ecf5ff;
}

:deep(.el-dialog__title) {
  font-size: 16px;
  /* font-weight: bold; */
}

:deep(.el-form-item__label) {
  font-weight: normal;
}

:deep(.el-input__inner) {
  font-size: 14px;
}

:deep(.el-button) {
  font-size: 14px;
}

.dialog-footer {
  text-align: right;
}

.dialog-footer .el-button + .el-button {
  margin-left: 10px;
}

.form-row {
  display: flex;
  gap: 20px;
  align-items: flex-start; /* 确保顶部对齐 */
}

.form-left {
  flex: 1;
}

.form-right {
  width: 120px;
}

.logo-preview {
  height: 100%;
}

.logo-preview :deep(.el-form-item__label) {
  height: 0;
  padding: 0;
  overflow: hidden;
}

.preview-image {
  width: 100%;
  height: 120px;
  object-fit: contain;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.no-image {
  width: 100%;
  height: 120px;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid #dcdfe6;
  border-radius: 15px;
  color: #909399;
  font-size: 14px;
}
</style>




























