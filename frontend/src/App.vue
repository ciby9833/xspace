<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

// 应用启动时初始化认证状态
onMounted(() => {
  console.log('🔄 初始化认证状态')
  authStore.initAuth()
})
</script>

<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100vh;
}

html, body {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  height: 100%;
}

* {
  box-sizing: border-box;
}

/* 确保所有组件都能正确处理滚动 */
.ant-layout {
  height: 100%;
}

/* 自定义滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Firefox滚动条样式 */
* {
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 #f1f1f1;
}
</style> 