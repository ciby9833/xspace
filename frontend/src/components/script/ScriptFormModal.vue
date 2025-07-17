<template>
  <a-modal
    v-model:open="modalVisible"
    :title="isEdit ? '编辑剧本' : '新增剧本'"
    width="900px"
    :confirm-loading="loading"
    @ok="handleSubmit"
    @cancel="handleCancel"
  >
    <a-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      :label-col="{ span: 6 }"
      :wrapper-col="{ span: 18 }"
      layout="horizontal"
    >
      <a-row :gutter="24">
        <!-- 左栏：基本信息 -->
        <a-col :span="12">
          <div class="form-section">
            <h3 class="section-title">基本信息</h3>
            
            <a-form-item label="剧本名称" name="name">
              <a-input 
                v-model:value="formData.name" 
                placeholder="请输入剧本名称"
                maxlength="100"
              />
            </a-form-item>

            <a-form-item label="剧本类型" name="type">
              <a-select 
                v-model:value="formData.type" 
                placeholder="请选择剧本类型"
              >
                <a-select-option value="欢乐">欢乐</a-select-option>
                <a-select-option value="惊悚">惊悚</a-select-option>
                <a-select-option value="推理">推理</a-select-option>
                <a-select-option value="恐怖">恐怖</a-select-option>
                <a-select-option value="情感">情感</a-select-option>
                <a-select-option value="策略">策略</a-select-option>
                <a-select-option value="血染钟楼">血染钟楼</a-select-option>
                <a-select-option value="桌游">桌游</a-select-option>
              </a-select>
            </a-form-item>

            <a-form-item label="剧本背景" name="background">
              <a-select 
                v-model:value="formData.background" 
                placeholder="请选择剧本背景"
                allow-clear
              >
                <a-select-option value="现代">现代</a-select-option>
                <a-select-option value="中国古代">中国古代</a-select-option>
                <a-select-option value="欧式">欧式</a-select-option>
                <a-select-option value="日式">日式</a-select-option>
                <a-select-option value="架空">架空</a-select-option>
              </a-select>
            </a-form-item>

            <a-form-item label="难度等级" name="difficulty">
              <a-select 
                v-model:value="formData.difficulty" 
                placeholder="请选择难度等级"
              >
                <a-select-option value="新手">新手</a-select-option>
                <a-select-option value="进阶">进阶</a-select-option>
                <a-select-option value="硬核">硬核</a-select-option>
              </a-select>
            </a-form-item>

            <a-form-item label="建议价格" name="price">
              <a-input-number
                v-model:value="formData.price"
                placeholder="建议价格"
                :min="0"
                :precision="0"
                :formatter="value => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
                :parser="value => value.replace(/Rp\s?|(,*)/g, '')"
                style="width: 100%"
              >
                <template #addonAfter>IDR</template>
              </a-input-number>
            </a-form-item>

            <a-form-item label="状态" name="is_active">
              <a-switch 
                v-model:checked="formData.is_active"
                checked-children="启用"
                un-checked-children="禁用"
              />
            </a-form-item>

            <a-form-item label="支持语言" name="supported_languages">
              <a-select
                v-model:value="formData.supported_languages"
                mode="multiple"
                placeholder="选择支持的语言（默认印尼语）"
                :options="languageOptions"
                style="width: 100%"
              />
            </a-form-item>
          </div>
        </a-col>

        <!-- 右栏：游戏设置 -->
        <a-col :span="12">
          <div class="form-section">
            <h3 class="section-title">游戏设置</h3>
            
            <a-form-item label="最少人数" name="min_players">
              <a-input-number
                v-model:value="formData.min_players"
                placeholder="最少人数"
                :min="1"
                :max="20"
                style="width: 100%"
              />
            </a-form-item>

            <a-form-item label="最多人数" name="max_players">
              <a-input-number
                v-model:value="formData.max_players"
                placeholder="最多人数"
                :min="formData.min_players || 1"
                :max="20"
                style="width: 100%"
              />
            </a-form-item>

            <a-form-item label="游戏时长" name="duration">
              <a-input-number
                v-model:value="formData.duration"
                placeholder="游戏时长"
                :min="30"
                :max="600"
                :step="15"
                style="width: 100%"
              >
                <template #addonAfter>分钟</template>
              </a-input-number>
            </a-form-item>

            <a-form-item label="标签" name="tags">
              <a-select
                v-model:value="formData.tags"
                mode="tags"
                placeholder="添加标签，回车确认"
                :max-tag-count="8"
                style="width: 100%"
              >
                <a-select-option value="新手友好">新手友好</a-select-option>
                <a-select-option value="烧脑">烧脑</a-select-option>
                <a-select-option value="热门">热门</a-select-option>
                <a-select-option value="经典">经典</a-select-option>
                <a-select-option value="团建">团建</a-select-option>
              </a-select>
            </a-form-item>
          </div>
        </a-col>
      </a-row>

      <!-- 🆕 图片上传区域 -->
      <a-row>
        <a-col :span="24">
          <a-form-item 
            label="剧本图片" 
            :label-col="{ span: 3 }"
            :wrapper-col="{ span: 21 }"
          >
            <a-form-item-rest>
              <div class="image-upload-container">
                <!-- 图片列表 -->
                <div 
                  class="image-list" 
                  v-if="formData.images.length > 0" 
                  :key="imageListKey"
                >
                  <div 
                    v-for="(image, index) in formData.images" 
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
                      <a-button 
                        type="text" 
                        size="small" 
                        danger
                        @click="removeImage(index)"
                      >
                        <DeleteOutlined />
                      </a-button>
                    </div>
                    <div class="image-order">{{ index + 1 }}</div>
                    <div class="drag-handle">⋮⋮</div>
                  </div>
                </div>

                <!-- 上传按钮 -->
                <div 
                  class="upload-area"
                  v-if="formData.images.length < 10"
                >
                  <a-upload
                    :file-list="[]"
                    :multiple="true"
                    :before-upload="beforeUpload"
                    :show-upload-list="false"
                    accept="image/*"
                  >
                    <a-button :loading="uploadLoading">
                      <PlusOutlined />
                      上传图片
                    </a-button>
                  </a-upload>
                  <div class="upload-tips">
                    最多上传10张图片，单张不超过5MB<br>
                    支持 JPG、PNG、GIF、WebP 格式
                  </div>
                </div>

                <!-- 拖拽排序提示 -->
                <div class="sort-tip" v-if="formData.images.length > 1">
                  💡 可拖拽图片调整显示顺序
                </div>
              </div>
            </a-form-item-rest>
          </a-form-item>
        </a-col>
      </a-row>

      <!-- 全宽字段 -->
      <a-row>
        <a-col :span="24">
          <a-form-item 
            label="剧本描述" 
            name="description"
            :label-col="{ span: 3 }"
            :wrapper-col="{ span: 21 }"
          >
            <a-textarea
              v-model:value="formData.description"
              placeholder="请输入剧本描述"
              :rows="4"
              maxlength="500"
              show-count
            />
          </a-form-item>

          <a-form-item 
            label="剧本道具" 
            name="props"
            :label-col="{ span: 3 }"
            :wrapper-col="{ span: 21 }"
          >
            <a-textarea
              v-model:value="formData.props"
              placeholder="请输入剧本道具说明（如特殊道具、材料要求等）"
              :rows="3"
              maxlength="300"
              show-count
            />
          </a-form-item>

          <!-- 🆕 门店关联配置 -->
          <a-form-item 
            label="上架门店" 
            :label-col="{ span: 3 }"
            :wrapper-col="{ span: 21 }"
          >
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
        </a-col>
      </a-row>
    </a-form>
  </a-modal>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import { 
  PlusOutlined, 
  DeleteOutlined 
} from '@ant-design/icons-vue'
import { 
  createScript, 
  updateScript,
  uploadScriptImages,
  getCompanyStores,
  batchConfigureStores,
  getScriptStoreConfigs
} from '@/api/script'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  scriptData: {
    type: Object,
    default: null
  },
  isEdit: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:visible', 'success'])

const formRef = ref()
const loading = ref(false)
const uploadLoading = ref(false)
const imageListKey = ref(0) // 用于强制重新渲染图片列表

// 🆕 拖拽排序相关状态
const dragStartIndex = ref(-1)

// 🆕 门店关联相关状态
const availableStores = ref([])
const storesLoading = ref(false)
const storeConfigs = ref([]) // 门店配置数组

// 弹窗可见性
const modalVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val)
})

// 表单数据
const formData = reactive({
  name: '',
  type: '',
  background: '',
  description: '',
  min_players: 1,
  max_players: 6,
  duration: 120,
  difficulty: '进阶',
  price: null,
  images: [], // 🆕 图片数组
  tags: [],
  props: '',
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
const formRules = {
  name: [
    { required: true, message: '请输入剧本名称', trigger: 'blur' },
    { min: 2, max: 100, message: '剧本名称长度为2-100个字符', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择剧本类型', trigger: 'change' }
  ],
  min_players: [
    { required: true, message: '请输入最少人数', trigger: 'blur' },
    { type: 'number', min: 1, max: 20, message: '最少人数应在1-20之间', trigger: 'blur' }
  ],
  max_players: [
    { required: true, message: '请输入最多人数', trigger: 'blur' },
    { type: 'number', min: 1, max: 20, message: '最多人数应在1-20之间', trigger: 'blur' },
    {
      validator: (rule, value) => {
        if (value < formData.min_players) {
          return Promise.reject('最多人数不能少于最少人数')
        }
        return Promise.resolve()
      },
      trigger: 'blur'
    }
  ],
  duration: [
    { required: true, message: '请输入游戏时长', trigger: 'blur' },
    { type: 'number', min: 30, max: 600, message: '游戏时长应在30-600分钟之间', trigger: 'blur' }
  ],
  difficulty: [
    { required: true, message: '请选择难度等级', trigger: 'change' }
  ]
}

// 🆕 图片上传前处理
const beforeUpload = async (file) => {
  // 检查文件类型
  const isImage = file.type.startsWith('image/')
  if (!isImage) {
    message.error('只能上传图片文件！')
    return false
  }

  // 检查文件大小
  const isLt5M = file.size / 1024 / 1024 < 5
  if (!isLt5M) {
    message.error('图片大小不能超过5MB！')
    return false
  }

  // 检查图片数量
  if (formData.images.length >= 10) {
    message.error('最多只能上传10张图片！')
    return false
  }

  try {
    uploadLoading.value = true
    
    // 创建FormData
    const formDataUpload = new FormData()
    formDataUpload.append('images', file)

    // 上传图片
    const response = await uploadScriptImages(formDataUpload)
    
    if (response.data && response.data.images) {
      // 添加到图片数组
      formData.images.push(...response.data.images)
      console.log('图片上传成功，当前图片数组:', formData.images)
      // 强制重新渲染图片列表
      imageListKey.value++
      message.success(`成功上传 ${response.data.count} 张图片`)
    } else {
      console.error('图片上传响应格式异常:', response)
      message.error('图片上传失败：响应格式异常')
    }
  } catch (error) {
    console.error('图片上传失败:', error)
    message.error('图片上传失败')
  } finally {
    uploadLoading.value = false
  }

  return false // 阻止默认上传行为
}

// 🆕 移除图片
const removeImage = (index) => {
  formData.images.splice(index, 1)
  imageListKey.value++ // 强制重新渲染
  message.success('移除图片成功')
}

// 🆕 拖拽开始
const handleDragStart = (index, event) => {
  dragStartIndex.value = index
  event.target.classList.add('dragging')
  event.dataTransfer.effectAllowed = 'move'
}

// 🆕 拖拽结束
const handleDragEnd = (event) => {
  event.target.classList.remove('dragging')
  dragStartIndex.value = -1
}

// 🆕 拖拽进入
const handleDragEnter = (event) => {
  event.preventDefault()
  event.target.closest('.image-item')?.classList.add('drag-over')
}

// 🆕 拖拽离开
const handleDragLeave = (event) => {
  event.target.closest('.image-item')?.classList.remove('drag-over')
}

// 🆕 拖拽放置
const handleDrop = (dropIndex, event) => {
  event.preventDefault()
  event.target.closest('.image-item')?.classList.remove('drag-over')
  
  if (dragStartIndex.value === -1 || dragStartIndex.value === dropIndex) {
    return
  }
  
  const draggedImage = formData.images[dragStartIndex.value]
  
  // 移除拖拽的图片
  formData.images.splice(dragStartIndex.value, 1)
  
  // 在新位置插入图片
  const insertIndex = dragStartIndex.value < dropIndex ? dropIndex - 1 : dropIndex
  formData.images.splice(insertIndex, 0, draggedImage)
  
  // 重置拖拽状态
  dragStartIndex.value = -1
  
  // 强制重新渲染
  imageListKey.value++
  
  message.success('图片顺序调整成功')
}

// 🆕 获取图片URL
const getImageUrl = (imageUrl) => {
  if (!imageUrl) return ''
  if (imageUrl.startsWith('http')) return imageUrl
  
  // 🆕 直接返回相对路径，让vite代理处理
  return imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`
}

// 🆕 图片加载错误处理
const handleImageError = (e) => {
  console.error('图片加载失败:', e.target.src)
  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0yMS4zMzMzIDIxLjMzMzNIMTZWNDIuNjY2N0g0OFYyMS4zMzMzSDQyLjY2NjdMMzggMTZIMjZMMjEuMzMzMyAyMS4zMzMzWiIgZmlsbD0iI0NDQ0NDQyIvPgo8cGF0aCBkPSJNMzIgMzcuMzMzM0MzNS42ODEzIDM3LjMzMzMgMzguNjY2NyAzNC4zNDc5IDM4LjY2NjcgMzFDMzguNjY2NyAyNy42NTIxIDM1LjY4MTMgMjQuNjY2NyAzMiAyNC42NjY3QzI4LjMxODcgMjQuNjY2NyAyNS4zMzMzIDI3LjY1MjEgMjUuMzMzMyAzMUMyNS4zMzMzIDM0LjM0NzkgMjguMzE4NyAzNy4zMzMzIDMyIDM3LjMzMzNaIiBmaWxsPSIjQ0NDQ0NDIi8+Cjwvc3ZnPgo='
}

// 🆕 获取门店列表
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

// 🆕 获取剧本门店配置
const fetchScriptStoreConfigs = async (scriptId) => {
  if (!scriptId) return
  
  try {
    console.log('开始获取剧本门店配置:', scriptId)
    const response = await getScriptStoreConfigs(scriptId)
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
    console.error('获取剧本门店配置失败:', error)
    storeConfigs.value = []
  }
}

// 🆕 检查门店是否被选中
const isStoreSelected = (storeId) => {
  return storeConfigs.value.some(config => config.store_id === storeId)
}

// 🆕 获取门店价格
const getStorePrice = (storeId) => {
  const config = storeConfigs.value.find(config => config.store_id === storeId)
  return config ? config.store_price : null
}

// 🆕 切换门店选择
const toggleStore = (storeId, checked) => {
  if (checked) {
    // 添加门店配置
    if (!isStoreSelected(storeId)) {
      storeConfigs.value.push({
        store_id: storeId,
        store_price: formData.price || null, // 使用剧本默认价格
        is_available: true
      })
    }
  } else {
    // 移除门店配置
    storeConfigs.value = storeConfigs.value.filter(config => config.store_id !== storeId)
  }
}

// 🆕 更新门店价格
const updateStorePrice = (storeId, price) => {
  const config = storeConfigs.value.find(config => config.store_id === storeId)
  if (config) {
    config.store_price = price
  }
}

// 🆕 全选门店
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

// 重置表单
const resetForm = () => {
  console.log('重置表单')
  Object.assign(formData, {
    name: '',
    type: '',
    background: '',
    description: '',
    min_players: 1,
    max_players: 6,
    duration: 120,
    difficulty: '进阶',
    price: null,
    images: [],
    tags: [],
    props: '',
    supported_languages: ['IND'], // 默认印尼语
    is_active: true
  })
  storeConfigs.value = [] // 🆕 重置门店配置
  imageListKey.value++ // 强制重新渲染图片列表
  formRef.value?.resetFields()
}

// 监听编辑数据变化
watch(() => props.scriptData, async (newData, oldData) => {
  console.log('scriptData 变化:', { newData, oldData, isEdit: props.isEdit })
  
  if (newData && props.isEdit) {
    console.log('编辑模式，接收到剧本数据:', newData)
    
    Object.keys(formData).forEach(key => {
      if (newData[key] !== undefined) {
        if (key === 'tags') {
          // 处理tags字段
          formData[key] = Array.isArray(newData[key]) ? newData[key] : 
                         (typeof newData[key] === 'string' ? JSON.parse(newData[key] || '[]') : [])
        } else if (key === 'images') {
          // 🆕 处理images字段
          formData[key] = Array.isArray(newData[key]) ? newData[key] : 
                         (typeof newData[key] === 'string' ? JSON.parse(newData[key] || '[]') : [])
        } else if (key === 'supported_languages') {
          // 处理supported_languages字段
          formData[key] = Array.isArray(newData[key]) ? newData[key] : 
                         (typeof newData[key] === 'string' ? JSON.parse(newData[key] || '["IND"]') : ['IND'])
        } else {
          formData[key] = newData[key]
        }
      }
    })
    
    // 🆕 加载剧本的门店配置 - 确保在门店列表加载完成后执行
    if (newData.id) {
      // 等待门店列表加载完成
      if (availableStores.value.length === 0 && !storesLoading.value) {
        await fetchStores()
      }
      await fetchScriptStoreConfigs(newData.id)
    }
  }
}, { immediate: false }) // 🆕 改为 false，避免初始化时执行

// 🆕 监听弹窗显示状态和编辑模式
watch([() => props.visible, () => props.isEdit], ([visible, isEdit], [oldVisible, oldIsEdit]) => {
  console.log('弹窗状态变化:', { visible, isEdit, oldVisible, oldIsEdit })
  
  if (visible) {
    console.log('弹窗显示，编辑模式:', isEdit)
    fetchStores()
    
    // 如果是新增模式，或者从编辑模式切换到新增模式，重置表单
    if (!isEdit) {
      console.log('新增模式，重置表单')
      // 使用 nextTick 确保在 DOM 更新后重置
      nextTick(() => {
        resetForm()
      })
    }
  }
}, { immediate: true })

// 🆕 监听 isEdit 变化，确保模式切换时正确处理
watch(() => props.isEdit, (isEdit, oldIsEdit) => {
  console.log('编辑模式变化:', { isEdit, oldIsEdit, visible: props.visible })
  
  // 如果弹窗已经显示，且从编辑模式切换到新增模式
  if (props.visible && !isEdit && oldIsEdit !== undefined) {
    console.log('从编辑模式切换到新增模式，重置表单')
    nextTick(() => {
      resetForm()
    })
  }
})

// 处理提交
const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    loading.value = true

    const submitData = {
      ...formData,
      tags: formData.tags.length > 0 ? formData.tags : null,
      images: formData.images.length > 0 ? formData.images : [], // 🆕 确保传递图片数组
      supported_languages: formData.supported_languages.length > 0 ? formData.supported_languages : ['IND'] // 默认印尼语
    }

    let scriptId
    if (props.isEdit) {
      const result = await updateScript(props.scriptData.id, submitData)
      scriptId = props.scriptData.id
      message.success('编辑剧本成功')
    } else {
      const result = await createScript(submitData)
      scriptId = result.data?.id || result.id
      message.success('创建剧本成功')
    }

    // 🆕 保存门店配置 - 无论是否有配置都要调用，以清理旧配置
    if (scriptId) {
      try {
        console.log('保存门店配置:', storeConfigs.value)
        await batchConfigureStores(scriptId, storeConfigs.value)
        console.log('门店配置保存成功')
        if (storeConfigs.value.length > 0) {
          message.success(`剧本保存成功，已配置 ${storeConfigs.value.length} 个门店`)
        }
      } catch (error) {
        console.error('门店配置保存失败:', error)
        message.warning('剧本保存成功，但门店配置保存失败')
      }
    }

    emit('success')
    modalVisible.value = false
    resetForm()
  } catch (error) {
    console.error('提交失败:', error)
    if (error.errorFields) {
      message.error('请检查表单信息')
    } else {
      message.error(props.isEdit ? '编辑剧本失败' : '创建剧本失败')
    }
  } finally {
    loading.value = false
  }
}

// 处理取消
const handleCancel = () => {
  resetForm()
  modalVisible.value = false
}
</script>

<style scoped>
.form-section {
  padding: 0 12px;
}

.section-title {
  margin: 0 0 24px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

/* 🆕 图片上传相关样式 */
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
  width: 100px;
  height: 100px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #d9d9d9;
  background: #fff;
  cursor: move;
  transition: all 0.3s;
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
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.image-item:hover .image-overlay {
  opacity: 1;
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
  top: 4px;
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

:deep(.ant-form-item) {
  margin-bottom: 16px;
}

:deep(.ant-input-number) {
  width: 100%;
}

/* 🆕 门店配置样式 */
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
</style> 