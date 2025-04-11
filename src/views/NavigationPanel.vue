<script setup lang="ts">
import ShortcutCard from './ShortcutCard.vue';
import {onBeforeUnmount, onMounted, reactive, ref, computed} from "vue";
import {ShortcutGroup} from '../model/shortcutGroup';
import axios from 'axios';
import {VueDraggable} from 'vue-draggable-plus'
import type {FormInstance, FormRules} from 'element-plus'
import { Delete, Warning } from '@element-plus/icons-vue'
import { GroupItem } from '@/model/groupItem';
import ContextMenu from './ContextMenu.vue';

// 添加网络模式状态
const isInternalNetwork = ref(localStorage.getItem('networkMode') === 'internal')

const fileInputRef = ref()


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
  id: string;
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
  orderNum: 99
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
    orderNum: shortcutsGroup.value[selectedGroupShortcutIndex.value].shortcuts.length + 1,
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
  event.preventDefault();
  contextMenuVisible.value = true;
  
  // 增加水平和垂直偏移量
  contextMenuPosition.value = {
    x: event.pageX - 350, // 向左偏移350px
    y: event.pageY - 80   // 向上偏移80px
  };
  
  selectedItem.value = item;
  selectedShortcutIndex.value = index;
  selectedGroupShortcutIndex.value = groupIndex;
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

const dragEnd = async () => {
  // 创建一个数组来存储所有需要更新的快捷方式
  const updatedShortcuts: any[] = [];

  // 遍历每个分组，更新其快捷方式的 orderNum 和 groupId
  shortcutsGroup.value.forEach((group:ShortcutGroup) => {
    group.shortcuts.forEach((shortcut, index) => {
      updatedShortcuts.push({
        ...shortcut,
        orderNum: index + 1, // 更新 orderNum
        groupId: group.id // 更新 groupId
      });
    });
  });

  // 将所有更新后的快捷方式发送到服务器进行批量更新
  try {
    const response = await axios.put('/api/shortcuts/batch-update', {
      shortcuts: updatedShortcuts,
    });
    console.log(response)
    ElMessage.success('更新成功');
  } catch (error) {
    ElMessage.error('更新失败');
  }
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
  if (upload_new_logo.value && form.icon) {
    try {
      // 直接将图标URL发送到后端处理删除
      const response = await axios.delete('/api/delete-logo', {
        params: { filename: form.icon }
      });
      console.log('文件删除成功:', response.data);
    } catch (error) {
      console.error('删除文件失败:', error);
    }
  }
};

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
  document.addEventListener('click', handleClickOutside)
});

onBeforeUnmount(() => {
  window.removeEventListener('click', handleOutsideClick as EventListener);
  document.removeEventListener('click', handleClickOutside)
  localStorage.setItem('networkMode', isInternalNetwork.value ? 'internal' : 'external')
});

// 分组拖拽完成后的处理函数
const onGroupDragEnd = async () => {
  // 更新分组顺序
  shortcutsGroup.value.forEach((group, index) => {
    group.order = index + 1;
  });

  try {
    const response = await axios.put('/api/groups/order', {
      groups: shortcutsGroup.value.map(group => ({
        id: groups.value.find(g => g.name === group.groupName)?.id,
        order: group.order
      }))
    });
    console.log('分组顺序更新成功:', response.data);
  } catch (error) {
    console.error('分组顺序更新失败:', error);
  }
};

const editingGroupId = ref<number | null>(null)
const editingGroupName = ref('')

// 修改编辑分组的方法
const editGroup = (group: GroupItem, event: Event) => {
  event.stopPropagation() // 阻止事件冒泡
  editingGroupId.value = group.id
  editingGroupName.value = group.name
}

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

// 添加确认删的方法
const confirmDeleteGroup = (group: GroupItem, event: Event) => {
  event.stopPropagation()
  deletingGroupId.value = group.id
  deleteGroupVisible.value = true
}
</script>

<template>
  <div class="navigation-display">
    <VueDraggable v-model="shortcutsGroup" @end="onGroupDragEnd">
      <div v-for="(itemGroup, groupIndex) in shortcutsGroup" :key="itemGroup.groupName">
        <div class="group-header">
          <div class="group-title-container">
            <span 
              v-if="editingGroupId !== groups[groupIndex].id" 
              class="group-title"
            >
              {{ itemGroup.groupName }}
            </span>
            <el-input
              v-else
              v-model="editingGroupName"
              class="editing-group-name"
              size="small"
              @keyup.enter="saveGroupName(groups[groupIndex])"
              @click.stop
            />
            <div class="group-actions">
              <div 
                class="delete-icon"
                @click="confirmDeleteGroup(groups[groupIndex], $event)"
              >
                <el-icon><Delete /></el-icon>
              </div>
              <div 
                class="edit-icon"
                @click="editGroup(groups[groupIndex], $event)"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 7L17 4L4 17L3 21L7 20L20 7Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
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
        </div>

        <div class="shortcuts-container">
          <VueDraggable ref="el" v-model="itemGroup.shortcuts" class="drag"
                        group="shortcut" @end="dragEnd">
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
    </VueDraggable>
    
    <!-- 添加新建分组的悬浮按钮 -->
    <div class="add-group-hover-area">
      <div class="add-group-button" @click="addGroupDialogVisible = true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 5V19" stroke="white" stroke-width="2" stroke-linecap="round"/>
          <path d="M5 12H19" stroke="white" stroke-width="2" stroke-linecap="round"/>
        </svg>
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
</template>

<style scoped>
.navigation-display {
  padding: 30px;
  flex: 1;
  overflow-y: auto;
  width: 100%;
  height: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

.navigation-display::-webkit-scrollbar {
  width: 6px;
}

.navigation-display::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.navigation-display::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.navigation-display::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
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
  align-items: flex-start;
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

.drag{
  display: flex;
  flex-wrap: wrap;
}

.group-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.3s ease;
  margin-left: 4px;
  position: relative;
}

.group-title-container:hover .group-actions {
  opacity: 1;
}

.edit-icon {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.edit-icon:hover svg path {
  stroke: #e6e6e6;
}

.edit-icon:hover {
  transform: scale(1.1);
}

.edit-icon .el-icon {
  font-size: 14px;
  transition: transform 0.3s ease;
}

.edit-icon svg {
  transition: transform 0.3s ease;
}

.add-icon {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.add-icon:hover svg path {
  stroke: #e6e6e6;
}

.add-icon:hover {
  transform: scale(1.1);
}

.add-icon .el-icon {
  font-size: 14px;
  transition: transform 0.3s ease;
}

.add-icon svg {
  transition: transform 0.3s ease;
}

.delete-icon {
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  opacity: 0;
  transform: translateX(-10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  color: #ff4d4f;
}

.delete-icon:hover {
  transform: scale(1.1);
}

.delete-icon .el-icon {
  font-size: 14px;
  transition: transform 0.3s ease;
}

.delete-icon svg {
  transition: transform 0.3s ease;
}

.delete-confirm-content {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 0;
}

.warning-icon {
  font-size: 24px;
}

.delete-confirm-content p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.editing-group-name {
  width: 120px;
  margin-right: 4px;
}

.editing-group-name :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.1);
  box-shadow: none;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 0 8px;
}

.editing-group-name :deep(.el-input__inner) {
  color: white;
  height: 24px;
  line-height: 24px;
  font-size: 1.2em;
}

.group-title {
  font-size: 1.2em;
  font-weight: bold;
  color: #ffffff;
  margin-right: 4px;
  min-width: 60px;
  display: inline-block;
}

.add-group-hover-area {
  width: 100%;
  height: 60px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 10px;
  position: relative;
}

.add-group-button {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  opacity: 0;
  transform: translateY(10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.add-group-hover-area:hover .add-group-button {
  opacity: 1;
  transform: translateY(0);
}

.add-group-button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.add-group-button svg {
  transition: transform 0.3s ease;
}

.add-group-button:hover svg {
  transform: rotate(180deg);
}

.delete-icon:hover .el-icon,
.edit-icon:hover svg,
.add-icon:hover svg {
  transform: scale(1.1) translateX(0) !important; /* 只保留缩放效果 */
}

.edit-icon svg path,
.add-icon svg path {
  stroke: white;
  transition: stroke 0.2s ease;
}

.edit-icon:hover svg path,
.add-icon:hover svg path {
  stroke: #e6e6e6;
}

.group-title-container:hover .delete-icon {
  opacity: 1;
  transform: translateX(0);
  transition-delay: 0s;
}

.group-title-container:hover .edit-icon {
  opacity: 1;
  transform: translateX(0);
  transition-delay: 0.05s;
}

.group-title-container:hover .add-icon {
  opacity: 1;
  transform: translateX(0);
  transition-delay: 0.1s;
}

.delete-icon .el-icon,
.edit-icon svg,
.add-icon svg {
  transition: all 0.3s ease;
}
</style> 