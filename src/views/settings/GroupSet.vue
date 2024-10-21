<template>
    <div class="group-set-container">
        <div class="add-group-form">
            <el-input v-model="newGroupName" placeholder="输入新分组名称" class="group-input" />
            <el-button 
                type="primary" 
                @click="addGroup" 
                :disabled="!newGroupName.trim()"
                :loading="isAddingGroup"
            >
                添加分组
            </el-button>
        </div>
        <VueDraggable
            ref="el"
            v-model="list"
            :animation="150"
            ghostClass="ghost"
            class="group-list"
            @end="onDragEnd"
        >
            <div
                v-for="item in list"
                :key="item.id"
                class="item-set"
            >
                <span>{{ item.name }}</span>
                <div>
                    <el-button type="primary" :icon="Edit" @click="editItem(item)" class="edit-btn"/>
                    <el-button type="danger" :icon="Delete" @click="removeItem(item.id)" class="delete-btn"/>
                </div>
            </div>
        </VueDraggable>

        <!-- 编辑对话框 -->
        <el-dialog v-model="editDialogVisible" title="编辑分组" width="30%">
            <el-input v-model="editingGroup.name" placeholder="分组名称" />
            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="editDialogVisible = false">取消</el-button>
                    <el-button type="primary" @click="updateGroup" :loading="isUpdatingGroup">
                        确认
                    </el-button>
                </span>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Delete, Edit } from '@element-plus/icons-vue'
import { VueDraggable } from 'vue-draggable-plus'
import axios from 'axios'
import { GroupItem } from '@/model/groupItem'

const list = ref<GroupItem[]>([])
const newGroupName = ref('')
const isAddingGroup = ref(false)
const editDialogVisible = ref(false)
const editingGroup = ref<GroupItem>({ id: 0, name: '', sort: 0 })
const isUpdatingGroup = ref(false)

const fetchGroups = async () => {
    try {
        const response = await axios.get<{ data: GroupItem[] }>('/api/groups')
        list.value = response.data.data
    } catch (error) {
        console.error('获取分组失败:', error)
    }
}

const addGroup = async () => {
    if (!newGroupName.value.trim()) return
    isAddingGroup.value = true
    try {
        await axios.post<{ data: { id: number } }>('/api/groups', {
            name: newGroupName.value,
            sort: list.value.length
        })
        newGroupName.value = ''
        await fetchGroups()
    } catch (error) {
        console.error('添加分组失败:', error)
    } finally {
        isAddingGroup.value = false
    }
}

const removeItem = async (id: number) => {
    try {
        await axios.delete(`/api/groups/${id}`)
        await fetchGroups()
    } catch (error) {
        console.error('删除分组失败:', error)
    }
}

const onDragEnd = async () => {
    const updates = list.value.map((item, index) => ({
        id: item.id,
        name: item.name,
        sort: index
    }))
    
    try {
        await Promise.all(updates.map(update => 
            axios.put(`/api/groups/${update.id}`, { name: update.name, sort: update.sort })
        ))
    } catch (error) {
        console.error('更新分组顺序失败:', error)
    }
}

const editItem = (item: GroupItem) => {
    editingGroup.value = { ...item }
    editDialogVisible.value = true
}

const updateGroup = async () => {
    if (!editingGroup.value.name.trim()) return
    isUpdatingGroup.value = true
    try {
        await axios.put(`/api/groups/${editingGroup.value.id}`, {
            name: editingGroup.value.name,
            sort: editingGroup.value.sort
        })
        editDialogVisible.value = false
        await fetchGroups()
    } catch (error) {
        console.error('更新分组失败:', error)
    } finally {
        isUpdatingGroup.value = false
    }
}

onMounted(fetchGroups)
</script>

<style scoped>
.group-set-container {
    padding: 20px;
    background-color: #f5f7fa;
    border-radius: 8px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.add-group-form {
    display: flex;
    margin-bottom: 20px;
    gap: 10px;
}

.group-input {
    flex-grow: 1;
}

.group-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 400px;
    overflow-y: auto;
}

.item-set {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 15px;
    background-color: #ffffff;
    border-radius: 4px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease;
}

.item-set:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.edit-btn,
.delete-btn {
    padding: 6px;
    font-size: 14px;
}

.ghost {
    opacity: 0.5;
    background: #c8ebfb;
}

.dialog-footer button:first-child {
    margin-right: 10px;
}
</style>
