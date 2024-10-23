<template>
  <div class="setting-page">
    <el-tabs :tab-position="tabPosition" class="setting-tabs">
      <el-tab-pane>
        <template #label>
          <span class="custom-tabs-label">
            <el-icon><Folder /></el-icon>
            <span>分组管理</span>
          </span>
        </template>
        <GroupSet />
      </el-tab-pane>
      <el-tab-pane>
        <template #label>
          <span class="custom-tabs-label">
            <el-icon><User /></el-icon>
            <span>我的信息</span>
          </span>
        </template>
        <UserInfo />
      </el-tab-pane>
      <el-tab-pane>
        <template #label>
          <span class="custom-tabs-label">
            <el-icon><Setting /></el-icon>
            <span>系统设置</span>
          </span>
        </template>
        <SystemSettings />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { TabsInstance } from 'element-plus'
import { Folder, User, Setting } from '@element-plus/icons-vue'
import GroupSet from './settings/GroupSet.vue'
import UserInfo from './settings/UserInfo.vue'
import SystemSettings from './settings/SystemSettings.vue'

const tabPosition = ref<TabsInstance['tabPosition']>('left')
</script>

<style scoped>
.setting-page {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #333333;
  display: flex;
  height: 70vh; /* 从 80vh 减少到 70vh */
  max-height: 600px; /* 添加最大高度限制 */
}

.setting-tabs {
  height: 100%;
  width: 100%;
}

:deep(.el-tabs) {
  height: 100%;
}

:deep(.el-tabs__header) {
  margin-right: 20px;
}

:deep(.el-tabs__nav) {
  background-color: rgba(255, 255, 255, 0.5);
  border-radius: 10px;
  padding: 10px 0;
}

:deep(.el-tabs__item) {
  color: #666666;
  height: 36px; /* 从 40px 减少到 36px */
  line-height: 36px; /* 从 40px 减少到 36px */
  text-align: left;
  padding: 0 20px;
  margin: 4px 0; /* 从 5px 减少到 4px */
  transition: all 0.3s ease;
}

:deep(.el-tabs__item:hover) {
  background-color: rgba(64, 158, 255, 0.1);
}

:deep(.el-tabs__item.is-active) {
  color: #409EFF;
  background-color: rgba(64, 158, 255, 0.2);
  border-radius: 5px;
  font-weight: bold;
}

:deep(.el-tabs__active-bar) {
  display: none;
}

:deep(.el-tabs__nav-wrap::after) {
  display: none;
}

:deep(.el-tabs__content) {
  padding-left: 20px;
  height: 100%;
  overflow-y: auto;
}

.custom-tabs-label {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  height: 100%;
}

.custom-tabs-label .el-icon {
  margin-right: 8px;
}

/* 其他样式保持不变 */
</style>
