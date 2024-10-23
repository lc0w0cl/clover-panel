<template>
  <div class="user-info">
    <h2>修改密码</h2>
    <el-form :model="passwordForm" :rules="rules" ref="passwordFormRef" label-width="120px">
      <el-form-item label="当前密码" prop="currentPassword">
        <el-input v-model="passwordForm.currentPassword" type="password" show-password></el-input>
      </el-form-item>
      <el-form-item label="新密码" prop="newPassword">
        <el-input v-model="passwordForm.newPassword" type="password" show-password></el-input>
      </el-form-item>
      <el-form-item label="确认新密码" prop="confirmPassword">
        <el-input v-model="passwordForm.confirmPassword" type="password" show-password></el-input>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="submitForm">修改密码</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import { logout } from '../../utils/auth' // 假设您有一个 logout 函数在 auth.js 中

const router = useRouter()
const passwordFormRef = ref()
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
      try {
        const response = await axios.post('/api/change-password', {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
        if (response.data.success) {
          ElMessage.success('密码修改成功，即将退出登录')
          setTimeout(async () => {
            await logout() // 调用 logout 函数
            router.push('/login') // 跳转到登录页
          }, 2000) // 2秒后执行
        } else {
          ElMessage.error(response.data.message || '密码修改失败')
        }
      } catch (error: any) {
        console.error('Error changing password:', error)
        ElMessage.error(error.response?.data?.message || '密码修改失败，请稍后重试')
      }
    } else {
      console.log('error submit!')
      return false
    }
  })
}
</script>

<style scoped>
.user-info {
  max-width: 500px;
  margin: 0 auto;
}
</style>
