<template>
  <div class="system-settings-container">
    <h2>系统设置</h2>
    <el-form :model="settingsForm" label-position="top">
      <el-form-item label="主题">
        <el-select v-model="settingsForm.theme" placeholder="请选择主题">
          <el-option label="浅色" value="light"></el-option>
          <el-option label="深色" value="dark"></el-option>
          <el-option label="跟随系统" value="system"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="语言">
        <el-select v-model="settingsForm.language" placeholder="请选择语言">
          <el-option label="中文" value="zh"></el-option>
          <el-option label="English" value="en"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="自动更新">
        <el-switch v-model="settingsForm.autoUpdate"></el-switch>
      </el-form-item>
      <el-form-item label="通知设置">
        <el-checkbox-group v-model="settingsForm.notifications">
          <el-checkbox label="email">邮件通知</el-checkbox>
          <el-checkbox label="push">推送通知</el-checkbox>
        </el-checkbox-group>
      </el-form-item>
      <!-- 新增搜索引擎设置 -->
      <el-form-item label="默认搜索引擎">
        <el-select v-model="settingsForm.searchEngine" placeholder="请选择搜索引擎">
          <el-option label="Google" value="google"></el-option>
          <el-option label="Bing" value="bing"></el-option>
          <el-option label="百度" value="baidu"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="saveSettings" :loading="isSaving">保存设置</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'

const settingsForm = reactive({
  theme: 'light',
  language: 'zh',
  autoUpdate: true,
  notifications: ['email'],
  searchEngine: 'google' // 新增搜索引擎设置
})

const isSaving = ref(false)

const saveSettings = async () => {
  isSaving.value = true
  try {
    // 这里应该是保存设置到后端的逻辑
    await new Promise(resolve => setTimeout(resolve, 1000)) // 模拟异步操作
    // 保存成功后,更新本地存储
    localStorage.setItem('searchEngine', settingsForm.searchEngine)
    ElMessage.success('设置保存成功')
  } catch (error) {
    console.error('保存设置失败:', error)
    ElMessage.error('保存设置失败,请稍后重试')
  } finally {
    isSaving.value = false
  }
}
</script>

<style scoped>
.system-settings-container {
  padding: 20px;
  background-color: #f5f7fa;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

h2 {
  margin-bottom: 24px;
  color: #333;
  font-size: 24px;
  text-align: center;
}

.el-form {
  width: 100%;
  max-width: 400px;
  margin: 0 auto;
}

:deep(.el-form-item__label) {
  font-weight: 600;
  color: #606266;
}

:deep(.el-input__wrapper),
:deep(.el-select .el-input__wrapper) {
  background-color: #ffffff;
  box-shadow: 0 0 0 1px #dcdfe6 inset;
  transition: all 0.3s;
}

:deep(.el-input__wrapper:hover),
:deep(.el-select .el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #409eff inset;
}

:deep(.el-button) {
  width: 100%;
  height: 40px;
  font-size: 16px;
  font-weight: 600;
  margin-top: 16px;
}

:deep(.el-form-item) {
  margin-bottom: 24px;
}

:deep(.el-checkbox-group) {
  display: flex;
  flex-direction: column;
}

:deep(.el-checkbox) {
  margin-left: 0;
  margin-bottom: 10px;
}
</style>
