<template>
  <a-modal
    v-model:open="modalVisible"
    title="批量录入房间"
    :confirm-loading="loading"
    @ok="handleSubmit"
    @cancel="handleCancel"
    width="900px"
    :mask-closable="false"
  >
    <div class="batch-create-content">
      <!-- 操作说明 -->
      <a-alert
        message="批量录入说明"
        description="您可以通过表格快速录入多个房间信息，也可以导入Excel文件进行批量创建。"
        type="info"
        show-icon
        style="margin-bottom: 16px"
      />

      <!-- 工具栏 -->
      <div class="toolbar">
        <a-space>
          <a-button @click="addRow" type="primary" ghost>
            <PlusOutlined />
            添加行
          </a-button>
          <a-button @click="clearAll">
            <ClearOutlined />
            清空所有
          </a-button>
          <a-upload
            :before-upload="handleFileUpload"
            accept=".xlsx,.xls"
            :show-upload-list="false"
          >
            <a-button>
              <UploadOutlined />
              导入Excel
            </a-button>
          </a-upload>
          <a-button @click="downloadTemplate">
            <DownloadOutlined />
            下载模板
          </a-button>
        </a-space>
      </div>

      <!-- 门店选择（如果没有指定门店） -->
      <div v-if="!storeId" class="store-selector">
        <a-form-item label="默认门店" style="margin-bottom: 16px">
          <a-select
            v-model:value="defaultStoreId"
            placeholder="选择默认门店（可为每行单独设置）"
            allow-clear
            style="width: 300px"
          >
            <a-select-option 
              v-for="store in availableStores" 
              :key="store.id" 
              :value="store.id"
            >
              {{ store.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
      </div>

      <!-- 批量录入表格 -->
      <div class="batch-table">
        <a-table
          :columns="columns"
          :data-source="roomList"
          :pagination="false"
          size="small"
          bordered
          :scroll="{ x: 1200, y: 400 }"
        >
          <template #bodyCell="{ column, record, index }">
            <!-- 序号 -->
            <template v-if="column.key === 'index'">
              {{ index + 1 }}
            </template>

            <!-- 门店选择 -->
            <template v-else-if="column.key === 'store_id'">
              <a-select
                v-model:value="record.store_id"
                placeholder="选择门店"
                size="small"
                style="width: 120px"
                :class="{ 'error-field': record.errors?.store_id }"
              >
                <a-select-option 
                  v-for="store in availableStores" 
                  :key="store.id" 
                  :value="store.id"
                >
                  {{ store.name }}
                </a-select-option>
              </a-select>
            </template>

            <!-- 房间名称 -->
            <template v-else-if="column.key === 'name'">
              <a-input
                v-model:value="record.name"
                placeholder="房间名称"
                size="small"
                :class="{ 'error-field': record.errors?.name }"
              />
            </template>

            <!-- 房间类型 -->
            <template v-else-if="column.key === 'room_type'">
              <a-select
                v-model:value="record.room_type"
                placeholder="类型"
                size="small"
                style="width: 80px"
                :class="{ 'error-field': record.errors?.room_type }"
              >
                <a-select-option value="剧本杀">剧本杀</a-select-option>
                <a-select-option value="密室">密室</a-select-option>
                <a-select-option value="混合">混合</a-select-option>
              </a-select>
            </template>

            <!-- 容量 -->
            <template v-else-if="column.key === 'capacity'">
              <a-input-number
                v-model:value="record.capacity"
                :min="1"
                :max="50"
                size="small"
                style="width: 70px"
                :class="{ 'error-field': record.errors?.capacity }"
              />
            </template>

            <!-- 描述 -->
            <template v-else-if="column.key === 'description'">
              <a-input
                v-model:value="record.description"
                placeholder="房间描述"
                size="small"
              />
            </template>

            <!-- 设备 -->
            <template v-else-if="column.key === 'equipment'">
              <a-input
                v-model:value="record.equipment"
                placeholder="设备信息"
                size="small"
              />
            </template>

            <!-- 操作 -->
            <template v-else-if="column.key === 'action'">
              <a-button
                type="link"
                size="small"
                danger
                @click="removeRow(index)"
              >
                删除
              </a-button>
            </template>
          </template>
        </a-table>
      </div>

      <!-- 验证结果 -->
      <div v-if="validationErrors.length > 0" class="validation-errors">
        <a-alert
          message="数据验证失败"
          type="error"
          show-icon
          style="margin-top: 16px"
        >
          <template #description>
            <ul>
              <li v-for="error in validationErrors" :key="error">{{ error }}</li>
            </ul>
          </template>
        </a-alert>
      </div>
    </div>
  </a-modal>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  PlusOutlined,
  ClearOutlined,
  UploadOutlined,
  DownloadOutlined
} from '@ant-design/icons-vue'
import { roomAPI } from '@/api/room'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  storeId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['update:visible', 'success'])

// 响应式数据
const loading = ref(false)
const availableStores = ref([])
const roomList = ref([])
const defaultStoreId = ref(null)
const validationErrors = ref([])

// 弹窗显示状态
const modalVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 表格列配置
const columns = computed(() => {
  const baseColumns = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      fixed: 'left'
    },
    {
      title: '房间名称',
      key: 'name',
      width: 150,
      fixed: 'left'
    },
    {
      title: '房间类型',
      key: 'room_type',
      width: 100
    },
    {
      title: '容量',
      key: 'capacity',
      width: 80
    },
    {
      title: '描述',
      key: 'description',
      width: 200
    },
    {
      title: '设备',
      key: 'equipment',
      width: 150
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right'
    }
  ]

  // 如果没有指定门店，添加门店选择列
  if (!props.storeId) {
    baseColumns.splice(1, 0, {
      title: '所属门店',
      key: 'store_id',
      width: 130,
      fixed: 'left'
    })
  }

  return baseColumns
})

// 方法
const loadAvailableStores = async () => {
  if (props.storeId) return
  
  try {
    const response = await roomAPI.getAvailableStores()
    availableStores.value = response.data || []
  } catch (error) {
    console.error('获取可选门店列表失败:', error)
  }
}

const createEmptyRow = () => ({
  store_id: props.storeId || defaultStoreId.value || null,
  name: '',
  room_type: '',
  capacity: 1,
  description: '',
  equipment: '',
  errors: {}
})

const addRow = () => {
  roomList.value.push(createEmptyRow())
}

const removeRow = (index) => {
  roomList.value.splice(index, 1)
}

const clearAll = () => {
  roomList.value = []
  validationErrors.value = []
}

const initializeRows = () => {
  if (roomList.value.length === 0) {
    // 初始化3行
    for (let i = 0; i < 3; i++) {
      addRow()
    }
  }
}

const validateData = () => {
  validationErrors.value = []
  let hasError = false

  roomList.value.forEach((room, index) => {
    room.errors = {}

    // 验证门店
    if (!room.store_id) {
      room.errors.store_id = true
      validationErrors.value.push(`第${index + 1}行：请选择门店`)
      hasError = true
    }

    // 验证房间名称
    if (!room.name || room.name.trim() === '') {
      room.errors.name = true
      validationErrors.value.push(`第${index + 1}行：请输入房间名称`)
      hasError = true
    }

    // 验证房间类型
    if (!room.room_type) {
      room.errors.room_type = true
      validationErrors.value.push(`第${index + 1}行：请选择房间类型`)
      hasError = true
    }

    // 验证容量
    if (!room.capacity || room.capacity < 1 || room.capacity > 50) {
      room.errors.capacity = true
      validationErrors.value.push(`第${index + 1}行：房间容量应在1-50之间`)
      hasError = true
    }
  })

  return !hasError
}

const handleSubmit = async () => {
  if (roomList.value.length === 0) {
    message.warning('请至少添加一个房间')
    return
  }

  if (!validateData()) {
    return
  }

  try {
    loading.value = true
    
    // 准备提交数据
    const submitData = roomList.value.map(room => ({
      store_id: room.store_id,
      name: room.name.trim(),
      room_type: room.room_type,
      capacity: room.capacity,
      description: room.description?.trim() || '',
      equipment: room.equipment?.trim() || ''
    }))

    await roomAPI.batchCreateRooms({ rooms: submitData })
    message.success(`成功创建 ${submitData.length} 个房间`)
    emit('success')
  } catch (error) {
    message.error('批量创建失败：' + (error.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  modalVisible.value = false
  clearAll()
}

const downloadTemplate = () => {
  // 创建模板数据
  const templateData = [
    ['门店名称', '房间名称', '房间类型', '容量', '描述', '设备'],
    ['示例门店', '房间A', '剧本杀', 6, '适合6人游戏的房间', '投影仪、音响'],
    ['示例门店', '房间B', '密室', 4, '适合4人游戏的房间', '道具、机关']
  ]

  // 创建CSV内容
  const csvContent = templateData.map(row => row.join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', '房间批量导入模板.csv')
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

const handleFileUpload = (file) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const text = e.target.result
      const lines = text.split('\n')
      const headers = lines[0].split(',')
      
      const importedRooms = []
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',')
          const room = {
            store_id: findStoreIdByName(values[0]) || props.storeId || defaultStoreId.value || null,
            name: values[1] || '',
            room_type: values[2] || '',
            capacity: parseInt(values[3]) || 1,
            description: values[4] || '',
            equipment: values[5] || '',
            errors: {}
          }
          importedRooms.push(room)
        }
      }

      roomList.value = importedRooms
      message.success(`成功导入 ${importedRooms.length} 条记录`)
    } catch (error) {
      message.error('文件解析失败：' + error.message)
    }
  }
  reader.readAsText(file, 'UTF-8')
  return false // 阻止默认上传行为
}

const findStoreIdByName = (storeName) => {
  if (!storeName) return null
  const store = availableStores.value.find(s => s.name === storeName)
  return store ? store.id : null
}

// 监听默认门店变化
watch(defaultStoreId, (newStoreId) => {
  roomList.value.forEach(room => {
    if (!room.store_id) {
      room.store_id = newStoreId
    }
  })
})

// 监听弹窗显示状态
watch(() => props.visible, (visible) => {
  if (visible) {
    loadAvailableStores()
    initializeRows()
  }
})

// 生命周期
onMounted(() => {
  loadAvailableStores()
})
</script>

<style scoped>
.batch-create-content {
  max-height: 70vh;
  overflow-y: auto;
}

.toolbar {
  margin-bottom: 16px;
  padding: 12px;
  background: #fafafa;
  border-radius: 6px;
}

.store-selector {
  margin-bottom: 16px;
}

.batch-table {
  border: 1px solid #d9d9d9;
  border-radius: 6px;
}

.error-field {
  border-color: #ff4d4f !important;
}

.validation-errors ul {
  margin: 0;
  padding-left: 20px;
}

.validation-errors li {
  margin-bottom: 4px;
}

:deep(.ant-table-tbody > tr > td) {
  padding: 4px 8px;
}

:deep(.ant-input-number) {
  width: 100%;
}
</style> 