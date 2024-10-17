<script setup lang="ts">
import ShortcutCard from './ShortcutCard.vue';
import { onBeforeUnmount, onMounted, reactive, ref, computed } from "vue"; // 合并导入
import SearchBar from './SearchBar.vue'; // 引入 SearchBar 组件
import ContextMenu from "./ContextMenu.vue";
import { ShortcutGroup } from '../model/shortcutGroup';
import axios from 'axios'; // 引入axios
import { VueDraggable,DraggableEvent } from 'vue-draggable-plus'

// 添加网络模式状态
const isInternalNetwork = ref(false);

// 切换网络模式的函数
const toggleNetworkMode = () => {
  isInternalNetwork.value = !isInternalNetwork.value;
};

const shortcutsGroup = ref<ShortcutGroup[]>([]); // 初始化为空数组

// 使用axios获取数据并优化数据处理
const fetchShortcuts = async () => {
  try {
    const response = await axios.get('/api/shortcuts');
    const data = response.data;
    if (data.message === "success") {
      const groupsMap = new Map();
      data.data.forEach((item) => {
        if (!groupsMap.has(item.groupName)) {
          groupsMap.set(item.groupName, {
            groupName: item.groupName,
            order: item.orderNum,
            shortcuts: []
          });
        }
        groupsMap.get(item.groupName).shortcuts.push({
          id: item.id,
          title: item.title,
          icon: item.icon,
          internalNetwork: item.internalNetwork,
          privateNetwork: item.privateNetwork,
          orderNum: item.orderNum  // 确保orderNum也被包括在内
        });
      });

      // 对每个组的shortcuts按orderNum排序
      groupsMap.forEach((group) => {
        group.shortcuts.sort((a, b) => a.orderNum - b.orderNum);
      });

      // 将Map转换为数组
      shortcutsGroup.value = Array.from(groupsMap.values());
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


interface RuleForm {
  title: string
  internalNetwork: string
  privateNetwork: string
  icon: string
}

const ruleFormRef = ref<FormInstance>()

const form = reactive<RuleForm>({
  title: '',
  internalNetwork: '',
  privateNetwork: '',
  icon: ''
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
    groupName: shortcutsGroup.value[selectedGroupShortcutIndex.value].groupName,
    orderNum: shortcutsGroup.value[selectedGroupShortcutIndex.value].order,
    title: form.title,
    icon: form.icon,
    internalNetwork: form.internalNetwork,
    privateNetwork: form.privateNetwork
  };

  try {
    if (isEdit.value && selectedShortcutIndex.value !== null) {
      const id = shortcutsGroup.value[selectedGroupShortcutIndex.value].shortcuts[selectedShortcutIndex.value].id;
      // 使用axios进行PUT请求
      const response = await axios.put(`/api/shortcuts/${id}`, shortcutData);
      console.log('Update response:', response.data);
      shortcutsGroup.value[selectedGroupShortcutIndex.value].shortcuts[selectedShortcutIndex.value] = {...form};
    } else {
      // 使用axios进行POST请求
      const response = await axios.post('/api/shortcuts', shortcutData);
      console.log('Create response:', response.data);
      shortcutsGroup.value[selectedGroupShortcutIndex.value].shortcuts.push({...form, id: response.data.data.id});
    }
  } catch (error) {
    console.error('Error saving shortcut:', error);
  }

  dialogFormVisible.value = false;
  resetForm();
};

// 重置表单内容
const resetForm = () => {
  form.title = '';
  form.internalNetwork = '';
  form.privateNetwork = '';
  form.icon = '';
  // Reset form validation state
  if (ruleFormRef.value) {
    ruleFormRef.value.clearValidate();
  }
};

const deleteShortcut = (groupIndex: number,index: number) => {
  shortcutsGroup.value[groupIndex].shortcuts.splice(index, 1);
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
  Object.assign(form,selectedItem.value)
  console.log('Edit:', selectedItem.value);
};

const removeItem = async () => {
  const groupIndex = selectedGroupShortcutIndex.value;
  const index = selectedShortcutIndex.value;
  const shortcutId = shortcutsGroup.value[groupIndex].shortcuts[index].id;

  try {
    const response = await axios.delete(`/api/shortcuts/${shortcutId}`);
    console.log('Remove response:', response.data);
    // 从本地状态中删除快捷方式
    deleteShortcut(groupIndex, index);
  } catch (error) {
    console.error('Error removing shortcut:', error);
  }
};

const hideContextMenu = () => {
  contextMenuVisible.value = false;
};



const dragCompleted = async(groupName: string) =>{
  // 给数据排序
  const group = shortcutsGroup.value.find(g => g.groupName === groupName);
  // 给组内的顺序编号
  
  if (group) {
    // 重新给组内的元素按顺序编号
    group.shortcuts.forEach((shortcut: { orderNum: any; }, index: number) => {
      shortcut.orderNum = index + 1;  // 从1开始编号
    });
    console.log('重新编号后的组:', group.shortcuts);

    // 更新数据库中的数据
    try {
      const response = await axios.put(`/api/shortcuts/group/${groupName}`, {
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

// 在组件挂载时添加事件监听器，组件销毁时移除监听器
onMounted(() => {
  fetchShortcuts();
  window.addEventListener('click', handleOutsideClick as EventListener);
});

onBeforeUnmount(() => {
  window.removeEventListener('click', handleOutsideClick as EventListener);
});

const getCssVarName = (type: string) => {
  return `--el-box-shadow${type ? '-' : ''}${type}`
}
const type = 'dark'
</script>

<template>
  <div>
    <!-- 添加网络模式切换按钮 -->
    <el-button
        class="network-mode-toggle"
        @click="toggleNetworkMode"
        :type="isInternalNetwork ? 'success' : 'primary'"
    >
      {{ isInternalNetwork ? '内网模式' : '外网模式' }}
    </el-button>

    <!-- 使用 SearchBar 组件 -->
    <SearchBar/>

    <!-- 现有的导航展示 -->
    <div
        :style="{
         boxShadow: `var(${getCssVarName(type)})`,textAlign: `left`,borderRadius: `20px`,padding: `40px`
        }" >


        <div v-for="(itemGroup,groupIndex) in shortcutsGroup" :key="itemGroup.groupName">
          <span>{{itemGroup.groupName}}</span>
   
          <div class="shortcuts-container">
            <VueDraggable ref="el" v-model="itemGroup.shortcuts" style="display: flex;" @update="dragCompleted(itemGroup.groupName)">
              <ShortcutCard
                v-for="(item, index) in itemGroup.shortcuts"
                :key="item.title"
                :title="item.title"
                :icon="item.icon"
                :link="isInternalNetwork ? item.privateNetwork : item.internalNetwork"
                @contextmenu.prevent="showContextMenu($event, item,groupIndex,index)"
                 />
            </VueDraggable>
            <!-- "+" 添加新导航按钮 -->
            <div class="shortcut-card add-card" @click="dialogFormVisible=true;selectedGroupShortcutIndex=groupIndex;isEdit=false">
              <div class="plus-icon">+</div>
            </div>
          </div>
        </div>
    </div>



    
    <!--    新增/编辑导航栏-->
    <el-dialog v-model="dialogFormVisible" :title="dialogTitle" width="500" @close="resetForm">
      <el-form :model="form" ref="ruleFormRef" :rules="rules" class="demo-ruleForm">
        <el-form-item label="" prop="title">
          <span>名称</span>
          <el-input v-model="form.title" autocomplete="off" />
        </el-form-item>
        <el-form-item label="">
          <span>图标</span>
          <el-input v-model="form.icon" autocomplete="off" />
        </el-form-item>
        <el-form-item label="" prop="internalNetwork">
          <span>公网地址</span>
          <el-input v-model="form.internalNetwork" autocomplete="off" />
        </el-form-item>
        <el-form-item label="">
          <span>内网地址</span>
          <el-input v-model="form.privateNetwork" autocomplete="off"  style=""/>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button type="primary" @click="submitForm(ruleFormRef)">
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
  /* //justify-content: center; */
}

.add-card {
  display: flex;
  justify-content: center;
  align-items: center;
  /* //background-color: #f0f0f0; */
  color: #42b883;
  font-size: 2em;
  font-weight: bold;
  cursor: pointer;
}

.plus-icon {
  font-size: 2em;
  user-select: none;
}

.network-mode-toggle {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
}

</style>
