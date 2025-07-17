<template>
  <a-modal
    v-model:open="modalVisible"
    :title="isEdit ? '编辑密室' : '新增密室'"
    width="900px"
    :confirm-loading="loading"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      layout="vertical"
      @finish="onFinish"
    >
      <a-row :gutter="16">
        <a-col :span="12">
          <a-form-item label="密室名称" name="name">
            <a-input v-model:value="formData.name" placeholder="请输入密室名称" />
          </a-form-item>
        </a-col>
        <a-col :span="12">
          <a-form-item label="恐怖等级" name="horror_level">
            <a-select v-model:value="formData.horror_level" placeholder="选择恐怖等级">
              <a-select-option value="非恐">非恐</a-select-option>
              <a-select-option value="微恐">微恐</a-select-option>
              <a-select-option value="中恐">中恐</a-select-option>
              <a-select-option value="重恐">重恐</a-select-option>
            </a-select>
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="最少人数" name="min_players">
            <a-input-number
              v-model:value="formData.min_players"
              :min="1"
              :max="20"
              style="width: 100%"
              placeholder="最少人数"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="最多人数" name="max_players">
            <a-input-number
              v-model:value="formData.max_players"
              :min="1"
              :max="20"
              style="width: 100%"
              placeholder="最多人数"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="游戏时长(分钟)" name="duration">
            <a-input-number
              v-model:value="formData.duration"
              :min="1"
              style="width: 100%"
              placeholder="游戏时长"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="8">
          <a-form-item label="NPC数量" name="npc_count">
            <a-input-number
              v-model:value="formData.npc_count"
              :min="0"
              style="width: 100%"
              placeholder="NPC数量"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="价格(Rp)" name="price">
            <a-input-number
              v-model:value="formData.price"
              :min="0"
              :precision="0"
              :formatter="value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
              :parser="value => value.replace(/\$\s?|(,*)/g, '')"
              style="width: 100%"
              placeholder="价格"
            />
          </a-form-item>
        </a-col>
        <a-col :span="8">
          <a-form-item label="状态" name="is_active">
            <a-switch
              v-model:checked="formData.is_active"
              checked-children="启用"
              un-checked-children="禁用"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-row :gutter="16">
        <a-col :span="24">
          <a-form-item label="支持语言" name="supported_languages">
            <a-select
              v-model:value="formData.supported_languages"
              mode="multiple"
              placeholder="选择支持的语言（默认印尼语）"
              :options="languageOptions"
              style="width: 100%"
            />
          </a-form-item>
        </a-col>
      </a-row>

      <a-form-item label="NPC角色" name="npc_roles">
        <div class="npc-roles-input">
          <a-tag
            v-for="(role, index) in formData.npc_roles"
            :key="index"
            closable
            @close="removeNpcRole(index)"
            style="margin-bottom: 8px"
          >
            {{ role }}
          </a-tag>
          <a-input
            v-if="npcRoleInputVisible"
            ref="npcRoleInputRef"
            v-model:value="npcRoleInputValue"
            type="text"
            size="small"
            style="width: 120px"
            @blur="handleNpcRoleInputConfirm"
            @keyup.enter="handleNpcRoleInputConfirm"
          />
          <a-tag
            v-else
            @click="showNpcRoleInput"
            style="background: #fff; border-style: dashed; cursor: pointer"
          >
            <PlusOutlined />
            添加角色
          </a-tag>
        </div>
      </a-form-item>

      <a-form-item label="密室简介" name="description">
        <a-textarea
          v-model:value="formData.description"
          :rows="4"
          placeholder="请输入密室简介"
        />
      </a-form-item>

      <a-form-item label="密室道具" name="props">
        <a-textarea
          v-model:value="formData.props"
          :rows="3"
          placeholder="请输入密室道具说明"
        />
      </a-form-item>

      <!-- 封面图片上传 -->
      <a-form-item label="封面图片">
        <a-form-item-rest>
          <div class="image-upload-container">
            <!-- 图片列表 -->
            <div class="image-list" v-if="formData.cover_images.length > 0" :key="imageListKey">
              <div 
                v-for="(image, index) in formData.cover_images" 
                :key="`image-${index}-${image}`"
                class="image-item"
                draggable="true"
                @dragstart="handleDragStart(index, $event)"
                @dragend="handleDragEnd"
                @dragover.prevent
                @dragenter="handleDragEnter"
                @dragleave="handleDragLeave"
                @drop="handleDrop(index, $event)"
              >
                <img 
                  :src="getImageUrl(image)" 
                  @error="handleImageError" 
                  @load="() => console.log('图片加载成功:', image)"
                />
                <div class="image-overlay">
                  <div class="image-actions">
                    <a-button
                      type="text"
                      size="small"
                      @click="previewImage(image)"
                    >
                      <EyeOutlined style="color: white" />
                    </a-button>
                    <a-button
                      type="text"
                      size="small"
                      @click="removeImage(index)"
                    >
                      <DeleteOutlined style="color: white" />
                    </a-button>
                  </div>
                  <div class="drag-handle">
                    <HolderOutlined style="color: white" />
                  </div>
                </div>
                <div class="image-order">{{ index + 1 }}</div>
              </div>
            </div>

            <!-- 上传按钮 -->
            <div class="upload-area" v-if="formData.cover_images.length < 15">
              <a-upload
                :file-list="[]"
                :multiple="true"
                :before-upload="beforeUpload"
                :show-upload-list="false"
                accept="image/*"
              >
                <a-button :loading="uploading">
                  <PlusOutlined />
                  上传图片
                </a-button>
              </a-upload>
              <div class="upload-tips">
                最多上传15张图片，单张不超过5MB<br>
                支持 JPG、PNG、GIF、WebP 格式
              </div>
            </div>

            <!-- 拖拽排序提示 -->
            <div class="sort-tip" v-if="formData.cover_images.length > 1">
              💡 可拖拽图片调整显示顺序
            </div>
          </div>
        </a-form-item-rest>
      </a-form-item>

      <!-- 门店关联配置 -->
      <a-form-item label="上架门店">
        <div class="store-config-container">
          <a-form-item-rest>
            <div class="store-config-header">
              <span>选择要上架的门店并设置价格</span>
              <a-button 
                type="link" 
                size="small" 
                @click="selectAllStores"
                v-if="availableStores.length > 0"
              >
                全选
              </a-button>
            </div>
            
            <div class="store-config-list" v-if="availableStores.length > 0">
              <div 
                v-for="store in availableStores" 
                :key="store.id"
                class="store-config-item"
              >
                <a-checkbox 
                  :checked="isStoreSelected(store.id)"
                  @change="(e) => toggleStore(store.id, e.target.checked)"
                >
                  <div class="store-info">
                    <span class="store-name">{{ store.name }}</span>
                    <span class="store-address">{{ store.address }}</span>
                  </div>
                </a-checkbox>
                
                <div class="store-price-input" v-if="isStoreSelected(store.id)">
                  <a-input-number
                    :value="getStorePrice(store.id)"
                    @change="(value) => updateStorePrice(store.id, value)"
                    placeholder="门店价格"
                    :min="0"
                    :precision="0"
                    :formatter="value => value ? new Intl.NumberFormat('id-ID').format(value) : ''"
                    :parser="value => value.replace(/\D/g, '')"
                    size="small"
                    style="width: 140px"
                  >
                    <template #addonBefore>Rp</template>
                  </a-input-number>
                </div>
              </div>
            </div>
            
            <div class="no-stores" v-else-if="!storesLoading">
              <a-empty description="暂无可用门店" />
            </div>
            
            <div class="stores-loading" v-if="storesLoading">
              <a-spin size="small" />
              <span style="margin-left: 8px;">加载门店列表...</span>
            </div>
          </a-form-item-rest>
        </div>
      </a-form-item>
    </a-form>

    <!-- 图片预览弹窗 -->
    <a-modal
      v-model:open="previewVisible"
      title="图片预览"
      :footer="null"
      centered
    >
      <img :src="previewImageUrl" style="width: 100%" />
    </a-modal>
  </a-modal>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import {
  PlusOutlined,
  LoadingOutlined,
  EyeOutlined,
  DeleteOutlined,
  HolderOutlined
} from '@ant-design/icons-vue'
import {
  createEscapeRoom,
  updateEscapeRoom,
  uploadEscapeRoomImages,
  deleteEscapeRoomImage,
  getCompanyStores,
  getEscapeRoomStoreConfigs,
  batchConfigureStores
} from '@/api/escapeRoom'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  escapeRoomData: {
    type: Object,
    default: null
  },
  isEdit: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'success'])

// 响应式数据
const formRef = ref()
const loading = ref(false)
const uploading = ref(false)
const imageListKey = ref(0) // 用于强制重新渲染图片列表

// 拖拽排序相关状态
const dragStartIndex = ref(-1)

// NPC角色输入
const npcRoleInputVisible = ref(false)
const npcRoleInputValue = ref('')
const npcRoleInputRef = ref()

// 图片预览
const previewVisible = ref(false)
const previewImageUrl = ref('')

// 门店关联相关状态
const availableStores = ref([])
const storesLoading = ref(false)
const storeConfigs = ref([]) // 门店配置数组

// 计算属性
const modalVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

// 表单数据
const formData = reactive({
  name: '',
  horror_level: '',
  min_players: 1,
  max_players: 6,
  duration: 60,
  npc_count: 0,
  price: null,
  npc_roles: [],
  description: '',
  props: '',
  cover_images: [],
  supported_languages: ['IND'], // 默认印尼语
  is_active: true
})

// 语言选项
const languageOptions = [
  { value: 'IND', label: '印尼语' },
  { value: 'CN', label: '中文' },
  { value: 'EN', label: '英文' }
]

// 表单验证规则
const rules = {
  name: [
    { required: true, message: '请输入密室名称', trigger: 'blur' }
  ],
  horror_level: [
    { required: true, message: '请选择恐怖等级', trigger: 'change' }
  ],
  min_players: [
    { required: true, message: '请输入最少人数', trigger: 'blur' },
    { type: 'number', min: 1, max: 20, message: '人数应在1-20之间', trigger: 'blur' }
  ],
  max_players: [
    { required: true, message: '请输入最多人数', trigger: 'blur' },
    { type: 'number', min: 1, max: 20, message: '人数应在1-20之间', trigger: 'blur' }
  ],
  duration: [
    { required: true, message: '请输入游戏时长', trigger: 'blur' },
    { type: 'number', min: 1, message: '时长必须大于0', trigger: 'blur' }
  ]
}

// 工具函数 - 先定义所有函数
const parseJsonField = (field) => {
  if (!field) return []
  if (Array.isArray(field)) return field
  try {
    return JSON.parse(field)
  } catch (e) {
    return []
  }
}

const resetForm = () => {
  Object.keys(formData).forEach(key => {
    if (key === 'cover_images' || key === 'npc_roles') {
      formData[key] = []
    } else if (key === 'supported_languages') {
      formData[key] = ['IND'] // 默认印尼语
    } else if (key === 'min_players') {
      formData[key] = 1
    } else if (key === 'max_players') {
      formData[key] = 6
    } else if (key === 'duration') {
      formData[key] = 60
    } else if (key === 'npc_count') {
      formData[key] = 0
    } else if (key === 'is_active') {
      formData[key] = true
    } else {
      formData[key] = key === 'price' ? null : ''
    }
  })
  
  storeConfigs.value = [] // 重置门店配置
  
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

const initForm = () => {
  if (props.isEdit && props.escapeRoomData) {
    const data = props.escapeRoomData
    Object.keys(formData).forEach(key => {
      if (key === 'cover_images') {
        formData[key] = parseJsonField(data[key]) || []
      } else if (key === 'npc_roles') {
        formData[key] = parseJsonField(data[key]) || []
      } else if (data[key] !== undefined) {
        formData[key] = data[key]
      }
    })
  }
}

// 获取门店列表
const fetchStores = async () => {
  try {
    storesLoading.value = true
    const response = await getCompanyStores()
    availableStores.value = response.data || []
  } catch (error) {
    console.error('获取门店列表失败:', error)
    message.error('获取门店列表失败')
  } finally {
    storesLoading.value = false
  }
}

// 获取密室门店配置
const fetchEscapeRoomStoreConfigs = async (escapeRoomId) => {
  if (!escapeRoomId) return
  
  try {
    console.log('开始获取密室门店配置:', escapeRoomId)
    const response = await getEscapeRoomStoreConfigs(escapeRoomId)
    const configs = response.data || []
    console.log('获取到的门店配置:', configs)
    
    // 转换为内部格式
    storeConfigs.value = configs.map(config => ({
      store_id: config.store_id,
      store_price: config.store_price,
      is_available: config.is_available !== false
    }))
    
    console.log('转换后的门店配置:', storeConfigs.value)
  } catch (error) {
    console.error('获取密室门店配置失败:', error)
    storeConfigs.value = []
  }
}

// 检查门店是否被选中
const isStoreSelected = (storeId) => {
  return storeConfigs.value.some(config => config.store_id === storeId)
}

// 获取门店价格
const getStorePrice = (storeId) => {
  const config = storeConfigs.value.find(config => config.store_id === storeId)
  return config ? config.store_price : null
}

// 切换门店选择
const toggleStore = (storeId, checked) => {
  if (checked) {
    // 添加门店配置
    if (!isStoreSelected(storeId)) {
      storeConfigs.value.push({
        store_id: storeId,
        store_price: formData.price || null, // 使用密室默认价格
        is_available: true
      })
    }
  } else {
    // 移除门店配置
    storeConfigs.value = storeConfigs.value.filter(config => config.store_id !== storeId)
  }
}

// 更新门店价格
const updateStorePrice = (storeId, price) => {
  const config = storeConfigs.value.find(config => config.store_id === storeId)
  if (config) {
    config.store_price = price
  }
}

// 全选门店
const selectAllStores = () => {
  availableStores.value.forEach(store => {
    if (!isStoreSelected(store.id)) {
      storeConfigs.value.push({
        store_id: store.id,
        store_price: formData.price || null,
        is_available: true
      })
    }
  })
}

// 监听器 - 在函数定义之后
watch(() => props.visible, (newVal) => {
  if (newVal) {
    fetchStores()
    initForm()
    if (props.isEdit && props.escapeRoomData?.id) {
      fetchEscapeRoomStoreConfigs(props.escapeRoomData.id)
    }
  } else {
    resetForm()
  }
}, { immediate: true })

watch(() => props.escapeRoomData, (newData) => {
  if (newData && props.visible) {
    initForm()
    if (props.isEdit && newData.id) {
      fetchEscapeRoomStoreConfigs(newData.id)
    }
  }
}, { deep: true })

// NPC角色管理
const showNpcRoleInput = () => {
  npcRoleInputVisible.value = true
  nextTick(() => {
    npcRoleInputRef.value?.focus()
  })
}

const handleNpcRoleInputConfirm = () => {
  const inputValue = npcRoleInputValue.value.trim()
  if (inputValue && !formData.npc_roles.includes(inputValue)) {
    formData.npc_roles.push(inputValue)
  }
  npcRoleInputVisible.value = false
  npcRoleInputValue.value = ''
}

const removeNpcRole = (index) => {
  formData.npc_roles.splice(index, 1)
}

// 图片处理
const getImageUrl = (imageUrl) => {
  if (!imageUrl) return ''
  if (imageUrl.startsWith('http')) return imageUrl
  return `http://localhost:3000${imageUrl}`
}

const handleImageError = (e) => {
  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0yMS4zMzMzIDIxLjMzMzNIMTZWNDIuNjY2N0g0OFYyMS4zMzMzSDQyLjY2NjdMMzggMTZIMjZMMjEuMzMzMyAyMS4zMzMzWiIgZmlsbD0iI0NDQ0NDQyIvPgo8cGF0aCBkPSJNMzIgMzcuMzMzM0MzNS42ODEzIDM3LjMzMzMgMzguNjY2NyAzNC4zNDc5IDM4LjY2NjcgMzFDMzguNjY2NyAyNy42NTIxIDM1LjY4MTMgMjQuNjY2NyAzMiAyNC42NjY3QzI4LjMxODcgMjQuNjY2NyAyNS4zMzMzIDI3LjY1MjEgMjUuMzMzMyAzMUMyNS4zMzMzIDM0LjM0NzkgMjguMzE4NyAzNy4zMzMzIDMyIDM3LjMzMzNaIiBmaWxsPSIjQ0NDQ0NDIi8+Cjwvc3ZnPgo='
}

const previewImage = (imageUrl) => {
  previewImageUrl.value = getImageUrl(imageUrl)
  previewVisible.value = true
}

const removeImage = async (index) => {
  const imageUrl = formData.cover_images[index]
  
  if (props.isEdit && props.escapeRoomData?.id) {
    try {
      await deleteEscapeRoomImage(props.escapeRoomData.id, imageUrl)
      message.success('图片删除成功')
    } catch (error) {
      message.error('图片删除失败')
      return
    }
  }
  
  formData.cover_images.splice(index, 1)
  imageListKey.value++ // 强制重新渲染
  message.success('移除图片成功')
}

// 拖拽排序功能
const handleDragStart = (index, event) => {
  dragStartIndex.value = index
  event.target.classList.add('dragging')
  event.dataTransfer.effectAllowed = 'move'
}

const handleDragEnd = (event) => {
  event.target.classList.remove('dragging')
  dragStartIndex.value = -1
}

const handleDragEnter = (event) => {
  event.preventDefault()
  event.target.closest('.image-item')?.classList.add('drag-over')
}

const handleDragLeave = (event) => {
  event.target.closest('.image-item')?.classList.remove('drag-over')
}

const handleDrop = (dropIndex, event) => {
  event.preventDefault()
  event.target.closest('.image-item')?.classList.remove('drag-over')
  
  if (dragStartIndex.value === -1 || dragStartIndex.value === dropIndex) {
    return
  }
  
  const draggedImage = formData.cover_images[dragStartIndex.value]
  
  // 移除拖拽的图片
  formData.cover_images.splice(dragStartIndex.value, 1)
  
  // 在新位置插入图片
  const insertIndex = dragStartIndex.value < dropIndex ? dropIndex - 1 : dropIndex
  formData.cover_images.splice(insertIndex, 0, draggedImage)
  
  // 重置拖拽状态
  dragStartIndex.value = -1
  
  // 强制重新渲染
  imageListKey.value++
  
  message.success('图片顺序调整成功')
}

// 图片上传前处理 - 与剧本保持一致的实现
const beforeUpload = async (file) => {
  console.log('beforeUpload 检查文件:', {
    name: file.name,
    type: file.type,
    size: file.size,
    currentImageCount: formData.cover_images.length
  })
  
  // 检查文件类型
  const isImage = file.type.startsWith('image/')
  if (!isImage) {
    console.log('文件类型检查失败:', file.type)
    message.error('只能上传图片文件!')
    return false
  }
  
  // 检查文件大小
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isLt5M) {
    console.log('文件大小检查失败:', file.size / 1024 / 1024, 'MB')
    message.error('图片大小不能超过5MB!')
    return false
  }
  
  // 检查图片数量
  if (formData.cover_images.length >= 15) {
    console.log('图片数量检查失败:', formData.cover_images.length)
    message.error('最多只能上传15张图片!')
    return false
  }
  
  try {
    uploading.value = true
    
    // 创建FormData
    const formDataUpload = new FormData()
    formDataUpload.append('images', file)
    
    console.log('开始上传图片:', file.name)
    
    // 上传图片
    const response = await uploadEscapeRoomImages(formDataUpload)
    console.log('上传响应:', response)
    
    if (response.data && response.data.images) {
      // 添加到图片数组
      formData.cover_images.push(...response.data.images)
      console.log('图片上传成功，当前图片数组:', formData.cover_images)
      // 强制重新渲染图片列表
      imageListKey.value++
      message.success(`成功上传 ${response.data.count} 张图片`)
    } else {
      console.error('图片上传响应格式异常:', response)
      message.error('图片上传失败：响应格式异常')
    }
  } catch (error) {
    console.error('图片上传失败:', error)
    let errorMessage = '图片上传失败'
    if (error.response?.data?.error) {
      errorMessage += `: ${error.response.data.error}`
    } else if (error.message) {
      errorMessage += `: ${error.message}`
    }
    message.error(errorMessage)
  } finally {
    uploading.value = false
  }
  
  return false // 阻止默认上传行为
}

// 表单提交
const handleSubmit = () => {
  if (formRef.value) {
    formRef.value.validate().then(() => {
      onFinish()
    }).catch(error => {
      console.error('表单验证失败:', error)
    })
  }
}

const onFinish = async () => {
  // 验证人数设置
  if (formData.max_players < formData.min_players) {
    message.error('最多人数不能小于最少人数')
    return
  }
  
  loading.value = true
  
  try {
    const submitData = {
      ...formData,
      cover_images: JSON.stringify(formData.cover_images),
      npc_roles: JSON.stringify(formData.npc_roles),
      supported_languages: JSON.stringify(formData.supported_languages)
    }
    
    let escapeRoomId
    if (props.isEdit) {
      const result = await updateEscapeRoom(props.escapeRoomData.id, submitData)
      escapeRoomId = props.escapeRoomData.id
      message.success('密室更新成功')
    } else {
      const result = await createEscapeRoom(submitData)
      escapeRoomId = result.data?.id || result.id
      message.success('密室创建成功')
    }
    
    // 保存门店配置 - 无论是否有配置都要调用，以清理旧配置
    if (escapeRoomId) {
      try {
        console.log('保存门店配置:', storeConfigs.value)
        await batchConfigureStores(escapeRoomId, storeConfigs.value)
        console.log('门店配置保存成功')
        if (storeConfigs.value.length > 0) {
          message.success(`密室保存成功，已配置 ${storeConfigs.value.length} 个门店`)
        }
      } catch (error) {
        console.error('门店配置保存失败:', error)
        message.warning('密室保存成功，但门店配置保存失败')
      }
    }
    
    emit('success')
    modalVisible.value = false
  } catch (error) {
    console.error('提交失败:', error)
    message.error(props.isEdit ? '密室更新失败' : '密室创建失败')
  } finally {
    loading.value = false
  }
}

const handleCancel = () => {
  modalVisible.value = false
}
</script>

<style scoped>
.npc-roles-input {
  min-height: 32px;
}

.image-upload-container {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  padding: 16px;
  background: #fafafa;
}

.image-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.image-item {
  position: relative;
  width: 104px;
  height: 104px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #d9d9d9;
  cursor: move;
  transition: all 0.3s;
  background: #fff;
}

.image-item:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
}

.image-item.dragging {
  opacity: 0.5;
  transform: scale(0.95);
}

.image-item.drag-over {
  border-color: #52c41a;
  box-shadow: 0 0 0 2px rgba(82, 196, 26, 0.2);
}

.image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.image-item:hover .image-overlay {
  opacity: 1;
}

.image-actions {
  display: flex;
  gap: 8px;
}

.image-order {
  position: absolute;
  top: 4px;
  left: 4px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  pointer-events: none;
}

.drag-handle {
  position: absolute;
  bottom: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 4px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  cursor: move;
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}

.image-item:hover .drag-handle {
  opacity: 1;
  pointer-events: auto;
}

.upload-area {
  text-align: center;
  padding: 20px;
}

.upload-tips {
  margin-top: 8px;
  color: #666;
  font-size: 12px;
  line-height: 1.4;
}

.sort-tip {
  text-align: center;
  color: #1890ff;
  font-size: 12px;
  margin-top: 8px;
}

/* 门店配置样式 */
.store-config-container {
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  padding: 16px;
  background: #fafafa;
}

.store-config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-weight: 500;
}

.store-config-list {
  max-height: 300px;
  overflow-y: auto;
}

.store-config-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.store-config-item:last-child {
  border-bottom: none;
}

.store-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.store-name {
  font-weight: 500;
  color: #333;
}

.store-address {
  font-size: 12px;
  color: #666;
}

.store-price-input {
  margin-left: 16px;
}

.no-stores {
  text-align: center;
  padding: 40px 0;
}

.stores-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 0;
  color: #666;
}

:deep(.ant-upload-select-picture-card) {
  width: 104px;
  height: 104px;
  margin: 0;
}

:deep(.ant-upload-select-picture-card .ant-upload) {
  padding: 8px;
}
</style> 