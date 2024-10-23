<template>
  <div class="user-info-container">
    <h2>修改密码</h2>
    <el-form :model="passwordForm" :rules="rules" ref="passwordFormRef" label-position="top">
      <el-form-item label="当前密码" prop="currentPassword">
        <el-input v-model="passwordForm.currentPassword" type="password" show-password placeholder="请输入当前密码"></el-input>
      </el-form-item>
      <el-form-item label="新密码" prop="newPassword">
        <el-input v-model="passwordForm.newPassword" type="password" show-password placeholder="请输入新密码"></el-input>
      </el-form-item>
      <el-form-item label="确认新密码" prop="confirmPassword">
        <el-input v-model="passwordForm.confirmPassword" type="password" show-password placeholder="请再次输入新密码"></el-input>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="submitForm" :loading="isSubmitting">修改密码</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { logout } from '../../utils/auth'

const router = useRouter()
const passwordFormRef = ref()
const isSubmitting = ref(false)
const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const validatePass = (_rule: any, value: string, callback: any) => {
  if (value === '') {
    callback(new Error('请输入密码'))
  } else {
    if (passwordForm.confirmPassword !== '') {
      if (passwordFormRef.value) {
        passwordFormRef.value.validateField('confirmPassword')
      }
    }
    callback()
  }
}

const validatePass2 = (_rule: any, value: string, callback: any) => {
  if (value === '') {
    callback(new Error('请再次输入密码'))
  } else if (value !== passwordForm.newPassword) {
    callback(new Error('两次输入密码不一致!'))
  } else {
    callback()
  }
}

const rules = {
  currentPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [{ validator: validatePass, trigger: 'blur' }],
  confirmPassword: [{ validator: validatePass2, trigger: 'blur' }]
}

const submitForm = async () => {
  if (!passwordFormRef.value) return
  
  await passwordFormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      isSubmitting.value = true
      try {
        const response = await axios.post('/api/change-password', {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
        if (response.data.success) {
          ElMessage.success('密码修改成功，即将退出登录')
          setTimeout(async () => {
            await logout()
            router.push('/login')
          }, 2000)
        } else {
          ElMessage.error(response.data.message || '密码修改失败')
        }
      } catch (error: any) {
        console.error('Error changing password:', error)
        ElMessage.error(error.response?.data?.message || '密码修改失败，请稍后重试')
      } finally {
        isSubmitting.value = false
      }
    } else {
      console.log('error submit!')
      return false
    }
  })
}
</script>

<style scoped>
.user-info-container {
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

:deep(.el-input__wrapper) {
  background-color: #ffffff;
  box-shadow: 0 0 0 1px #dcdfe6 inset;
  transition: all 0.3s;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #409eff inset;
}

:deep(.el-input__inner) {
  height: 40px;
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
</style>
