<script setup lang="ts">
import ShortcutCard from './components/ShortcutCard.vue';
import { onBeforeUnmount, onMounted, reactive, ref, computed } from "vue"; // 合并导入
import SearchBar from './components/SearchBar.vue'; // 引入 SearchBar 组件
import ContextMenu from "./components/ContextMenu.vue";

// 添加网络模式状态
const isInternalNetwork = ref(false);

// 切换网络模式的函数
const toggleNetworkMode = () => {
  isInternalNetwork.value = !isInternalNetwork.value;
};

const shortcutsGroup = ref([]); // 初始化为空数组

// 从 API 获取数据
const fetchShortcuts = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/shortcuts');
    const data = await response.json();
    if (data.message === "success") {
      const groupedData = data.data.reduce((acc, item) => {
        let group = acc.find(g => g.groupName === item.groupName);
        if (!group) {
          group = { groupName: item.groupName, order: item.orderNum, shortcuts: [] };
          acc.push(group);
        }
        group.shortcuts.push({
          id: item.id,  // 确保这里获取并保存了 ID
          title: item.title,
          icon: item.icon,
          internalNetwork: item.internalNetwork,
          privateNetwork: item.privateNetwork
        });
        return acc;
      }, []);
      shortcutsGroup.value = groupedData;
    }
  } catch (error) {
    console.error('Error fetching shortcuts:', error);
  }
};

// 控制对话框显示与隐藏
const isEdit = ref(false);
const selectedShortcutIndex = ref(null);
const selectedGroupShortcutIndex = ref(null);

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
      const response = await fetch(`http://localhost:3000/api/shortcuts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(shortcutData)
      });
      const data = await response.json();
      console.log('Update response:', data); // 输出服务器响应
      shortcutsGroup.value[selectedGroupShortcutIndex.value].shortcuts[selectedShortcutIndex.value] = {...form};
    } else {
      const response = await fetch('http://localhost:3000/api/shortcuts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(shortcutData)
      });
      const data = await response.json();
      console.log('Create response:', data); // 输出服务器响应
      shortcutsGroup.value[selectedGroupShortcutIndex.value].shortcuts.push({...form, id: data.data.id});
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
const deleteShortcut = (groupIndex,index) => {
  shortcutsGroup.value[groupIndex].shortcuts.splice(index, 1);
};

const submitForm = async (formEl: FormInstance | undefined) => {
  if (!formEl) return
  await formEl.validate((valid, fields) => {
    if (valid) {
      console.log('submit!')
      saveShortcut()
    } else {
      console.log('error submit!', fields)
    }
  })
}

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
  fetchShortcuts();
  window.addEventListener('click', handleOutsideClick);
});

onBeforeUnmount(() => {
  window.removeEventListener('click', handleOutsideClick);
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
         boxShadow: `var(${getCssVarName(type)})`,
        }">
      <div style="margin: 40px">
        <div v-for="(itemGroup,groupIndex) in shortcutsGroup" :key="itemGroup.groupName">
          {{itemGroup.groupName}}
          <div class="shortcuts-container">
            <ShortcutCard
                v-for="(item, index) in itemGroup.shortcuts"
                :key="item.title"
                :title="item.title"
                :icon="item.icon"
                :link="isInternalNetwork ? item.privateNetwork : item.internalNetwork"
                @contextmenu.prevent="showContextMenu($event, item,groupIndex,index)"
            />
            <!-- "+" 添加新导航按钮 -->
            <div class="shortcut-card add-card" @click="dialogFormVisible=true;selectedGroupShortcutIndex=groupIndex;isEdit=false">
              <div class="plus-icon">+</div>
            </div>
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

.network-mode-toggle {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
}

</style>
