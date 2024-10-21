<template>
    <div>
        <el-tabs :tab-position="tabPosition"  class="demo-tabs">
            <el-tab-pane label="分组管理">
                <GroupSet/>
            </el-tab-pane>
            <el-tab-pane label="我的信息"></el-tab-pane>
            <el-tab-pane label="系统设置"></el-tab-pane>
        </el-tabs>
    </div>
</template>

<script setup lang="ts">
    import { ref } from 'vue'
    import type { TabsInstance } from 'element-plus'
    import GroupSet from './settings/GroupSet.vue'

    const tabPosition = ref<TabsInstance['tabPosition']>('left')
</script>
    

<style scoped>
.demo-tabs > .el-tabs__content {
  padding: 32px;
  color: #6b778c;
  font-size: 32px;
  font-weight: 600;
}

.el-tabs--right .el-tabs__content,
.el-tabs--left .el-tabs__content {
  height: 100%;
}
</style>

