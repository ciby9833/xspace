<template>
  <div class="booking-container">
    <!-- 顶部选项卡 -->
    <div class="booking-tabs">
      <a-tabs v-model:activeKey="activeTab" size="large" @change="handleMainTabChange">
        <a-tab-pane key="booking" tab="项目预订">
          <!-- 项目类型选项卡 -->
          <a-tabs v-model:activeKey="activeItemType" size="default" @change="handleTabChange">
            <a-tab-pane key="all" tab="全部" />
            <a-tab-pane key="script" tab="剧本杀" />
            <a-tab-pane key="escape_room" tab="密室" />
          </a-tabs>
        </a-tab-pane>
        <a-tab-pane key="payment" tab="收款确认" :disabled="!bookingData">
          <!-- 收款确认内容 -->
        </a-tab-pane>
      </a-tabs>
    </div>

    <!-- 项目预订内容 -->
    <div v-show="activeTab === 'booking'" class="booking-content">
      <!-- 左侧筛选区域 -->
      <div class="booking-filters">
        <!-- 搜索框 -->
        <div class="filter-group search-group">
          <h4>搜索</h4>
          <a-input
            v-model:value="searchKeyword"
            placeholder="搜索剧本杀或密室名称..."
            allowClear
            @change="handleSearchChange"
            @pressEnter="handleSearchChange"
          >
            <template #prefix>
              <SearchOutlined />
            </template>
          </a-input>
        </div>

        <!-- 门店筛选 -->
        <div class="filter-group">
          <h4>门店筛选</h4>
          <a-select
            v-model:value="filters.store_id"
            placeholder="选择门店"
            allowClear
            @change="handleFilterChange"
            style="width: 100%"
          >
            <a-select-option 
              v-for="store in availableStores" 
              :key="store.id" 
              :value="store.id"
            >
              {{ store.name }}
              <span v-if="!store.is_active" style="color: #ff4d4f; margin-left: 4px;">(已停业)</span>
            </a-select-option>
          </a-select>
        </div>

        <h3>类型筛选</h3>
        
        <!-- 剧本杀类型筛选 -->
        <div v-if="activeItemType === 'all' || activeItemType === 'script'" class="filter-group">
          <h4>剧本类型</h4>
          <a-checkbox-group 
            v-model:value="filters.script_types" 
            @change="handleFilterChange"
          >
            <div v-for="type in categories.script_types" :key="type.type" class="filter-item">
              <a-checkbox :value="type.type">
                {{ type.type }} ({{ type.count }})
              </a-checkbox>
            </div>
          </a-checkbox-group>
        </div>

        <!-- 密室恐怖等级筛选 -->
        <div v-if="activeItemType === 'all' || activeItemType === 'escape_room'" class="filter-group">
          <h4>恐怖等级</h4>
          <a-checkbox-group 
            v-model:value="filters.horror_levels" 
            @change="handleFilterChange"
          >
            <div v-for="level in categories.escape_room_horror_levels" :key="level.horror_level" class="filter-item">
              <a-checkbox :value="level.horror_level">
                {{ level.horror_level }} ({{ level.count }})
              </a-checkbox>
            </div>
          </a-checkbox-group>
        </div>

        <!-- 人数筛选 -->
        <div class="filter-group">
          <h4>游戏人数</h4>
          <a-row :gutter="8">
            <a-col :span="12">
              <a-input-number 
                v-model:value="filters.min_players" 
                placeholder="最少"
                :min="1"
                size="small"
                @change="handleFilterChange"
              />
            </a-col>
            <a-col :span="12">
              <a-input-number 
                v-model:value="filters.max_players" 
                placeholder="最多"
                :min="1"
                size="small"
                @change="handleFilterChange"
              />
            </a-col>
          </a-row>
        </div>

        <!-- 价格筛选 -->
        <div class="filter-group">
          <h4>价格范围</h4>
          <a-row :gutter="8">
            <a-col :span="12">
              <a-input-number 
                v-model:value="filters.min_price" 
                placeholder="最低价"
                :min="0"
                size="small"
                @change="handleFilterChange"
              />
            </a-col>
            <a-col :span="12">
              <a-input-number 
                v-model:value="filters.max_price" 
                placeholder="最高价"
                :min="0"
                size="small"
                @change="handleFilterChange"
              />
            </a-col>
          </a-row>
        </div>

        <!-- 重置按钮 -->
        <div class="filter-actions">
          <a-button @click="resetFilters" size="small">重置筛选</a-button>
        </div>
      </div>

      <!-- 中间项目列表 -->
      <div class="booking-items">
        <a-spin :spinning="loading" tip="加载中...">
          <div v-if="filteredItems.length === 0" class="empty-state">
            <a-empty description="暂无可预订项目" />
          </div>
          
          <div v-else class="items-grid">
            <div 
              v-for="item in filteredItems" 
              :key="`${item.type}-${item.id}`"
              :class="[
                'item-card',
                { 'selected': selectedItem?.id === item.id && selectedItem?.type === item.type }
              ]"
              @click="selectItem(item)"
            >
              <!-- 项目封面 -->
              <div class="item-cover">
                <img 
                  v-if="item.cover_image" 
                  :src="getImageUrl(item.cover_image)" 
                  :alt="item.name"
                  @error="handleImageError"
                />
                <div v-else class="no-image">
                  <PictureOutlined />
                </div>
                
                <!-- 项目类型标签 -->
                <div class="item-type-badge">
                  {{ item.type === 'script' ? '剧本杀' : '密室' }}
                </div>
                
                <!-- 更多图片指示 -->
                <div v-if="item.images && item.images.length > 1" class="image-count">
                  <CameraOutlined />
                  {{ item.images.length }}张
                </div>
              </div>

              <!-- 项目信息 -->
              <div class="item-info">
                <h3 class="item-name">{{ item.name }}</h3>
                
                <div class="item-details">
                  <div class="detail-row">
                    <UserOutlined />
                    <span>{{ item.min_players }}-{{ item.max_players }}人</span>
                  </div>
                  
                  <div class="detail-row">
                    <ClockCircleOutlined />
                    <span>{{ item.duration }}分钟</span>
                  </div>
                  
                  <div v-if="item.type === 'script'" class="detail-row">
                    <TagOutlined />
                    <span>{{ item.category }} · {{ item.secondary_category }}</span>
                  </div>
                  
                  <div v-if="item.type === 'escape_room'" class="detail-row">
                    <FireOutlined />
                    <span>{{ item.category }}</span>
                  </div>
                  
                  <div v-if="item.npc_count > 0" class="detail-row">
                    <TeamOutlined />
                    <span>{{ item.npc_count }}个NPC</span>
                  </div>
                </div>

                <!-- 价格 -->
                <div class="item-price">
                  <span class="price-label">起</span>
                  <span class="price-value">Rp {{ formatPrice(item.price) }}</span>
                </div>

                <!-- 门店数量 -->
                <div class="store-count">
                  {{ item.store_count }}家门店可选
                </div>
              </div>
            </div>
          </div>
        </a-spin>
      </div>

      <!-- 遮罩层 (移动设备) -->
      <div 
        v-if="selectedItem" 
        class="detail-overlay"
        @click="closeDetail"
      ></div>

      <!-- 右侧详情区域 -->
      <div v-if="selectedItem" class="booking-detail">
        <div class="detail-content">
          <!-- 关闭按钮 -->
          <div class="detail-close">
            <a-button 
              type="text" 
              size="small" 
              @click="closeDetail"
              class="close-btn"
            >
              <template #icon>
                <CloseOutlined />
              </template>
            </a-button>
          </div>
          <!-- 项目详情 -->
          <div class="detail-header">
            <h2>{{ selectedItem.name }}</h2>
            <div class="item-tags">
              <a-tag :color="selectedItem.type === 'script' ? 'blue' : 'green'">
                {{ selectedItem.type === 'script' ? '剧本杀' : '密室' }}
              </a-tag>
              <a-tag v-if="selectedItem.difficulty">{{ selectedItem.difficulty }}</a-tag>
              <a-tag v-if="selectedItem.category">{{ selectedItem.category }}</a-tag>
            </div>
          </div>

          <!-- 图片预览 -->
          <div v-if="selectedItem.images && selectedItem.images.length > 0" class="detail-images">
            <div class="image-gallery">
              <img 
                v-for="(image, index) in selectedItem.images.slice(0, 3)" 
                :key="index"
                :src="getImageUrl(image)" 
                :alt="`${selectedItem.name} 图片 ${index + 1}`"
                @click="showImagePreview(selectedItem.images, index)"
                @error="handleImageError"
              />
              <div 
                v-if="selectedItem.images.length > 3" 
                class="more-images"
                @click="showImagePreview(selectedItem.images, 3)"
              >
                +{{ selectedItem.images.length - 3 }}
              </div>
            </div>
          </div>

          <!-- 项目描述 -->
          <div class="detail-description">
            <h4>项目介绍</h4>
            <p>{{ selectedItem.description || '暂无介绍' }}</p>
          </div>

          <!-- 项目属性 -->
          <div class="detail-attributes">
            <div class="attr-row">
              <span class="attr-label">游戏人数：</span>
              <span>{{ selectedItem.min_players }}-{{ selectedItem.max_players }}人</span>
            </div>
            <div class="attr-row">
              <span class="attr-label">游戏时长：</span>
              <span>{{ selectedItem.duration }}分钟</span>
            </div>
            <div v-if="selectedItem.npc_count > 0" class="attr-row">
              <span class="attr-label">NPC数量：</span>
              <span>{{ selectedItem.npc_count }}个</span>
            </div>
            <div v-if="selectedItem.props" class="attr-row">
              <span class="attr-label">游戏道具：</span>
              <span>{{ selectedItem.props }}</span>
            </div>
          </div>

          <a-divider />

          <!-- 门店选择和预订 -->
          <div class="booking-section">
            <a-spin :spinning="loadingDetail" tip="加载门店信息...">
              <div v-if="itemDetail && itemDetail.available_stores.length > 0">
                
                <!-- 步骤1：门店选择 (条件显示) -->
                <div v-if="needStoreSelection" class="booking-step store-selection" :class="{ 'collapsed': selectedStoreId && !storeSelectionExpanded, 'has-selection': selectedStoreId }">
                  <div class="step-header" @click="selectedStoreId ? toggleStoreSelection() : null">
                    <div class="step-number">1</div>
                    <h5>选择门店</h5>
                    <div v-if="selectedStoreId" class="selected-indicator">
                      <CheckOutlined />
                      <span>{{ getSelectedStoreName() }}</span>
                    </div>
                    <div class="collapse-icon" v-if="selectedStoreId">
                      <UpOutlined v-if="storeSelectionExpanded" />
                      <DownOutlined v-else />
                    </div>
                  </div>
                  <div class="step-content">
                    <a-radio-group 
                      v-model:value="selectedStoreId" 
                      @change="handleStoreChange"
                    >
                      <div 
                        v-for="store in itemDetail.available_stores" 
                        :key="store.store_id"
                        class="store-option"
                      >
                        <a-radio :value="store.store_id">
                          <div class="store-info">
                            <div class="store-name">
                              {{ store.store_name }}
                              <a-tag v-if="store.store_status === '已停业'" color="red" size="small">已停业</a-tag>
                            </div>
                            <div class="store-address">{{ store.store_address }}</div>
                            <div class="store-price">
                              Rp {{ formatPrice(store.store_price || selectedItem.price) }}
                            </div>
                          </div>
                        </a-radio>
                      </div>
                    </a-radio-group>
                  </div>
                </div>

                <!-- 自动选择门店提示 (条件显示) -->
                <div v-if="!needStoreSelection && itemDetail.auto_selected_store" class="booking-step auto-store-info">
                  <div class="step-header">
                    <div class="step-number">
                      <CheckOutlined />
                    </div>
                    <h5>已自动选择门店</h5>
                  </div>
                  <div class="step-content">
                    <div class="auto-store-card">
                      <div class="store-info">
                        <div class="store-name">
                          {{ itemDetail.auto_selected_store.store_name }}
                          <a-tag v-if="itemDetail.auto_selected_store.store_status === '已停业'" color="red" size="small">已停业</a-tag>
                        </div>
                        <div class="store-address">{{ itemDetail.auto_selected_store.store_address }}</div>
                        <div class="store-price">
                          Rp {{ formatPrice(itemDetail.auto_selected_store.store_price || selectedItem.price) }}
                        </div>
                      </div>
                      <div class="auto-reason">
                        <a-tag color="green" size="small">
                          {{ itemDetail.total_user_stores === 1 ? '您只有一个可用门店' : '该项目只在此门店上架' }}
                        </a-tag>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 步骤2：日期和时间选择 -->
                <div v-if="selectedStoreId" class="booking-step modern-time-selection">
                  <div class="step-header">
                    <div class="step-number">{{ needStoreSelection ? 2 : 1 }}</div>
                    <h5>选择日期和时间</h5>
                    <div v-if="selectedTimeRange.startTime && selectedTimeRange.endTime" class="selected-indicator">
                      <CheckOutlined />
                      <span>{{ formatSelectedTimeRange() }}</span>
                    </div>
                  </div>
                  <div class="step-content">
                    <!-- 🔧 如果门店已停业，显示提示信息 -->
                    <div v-if="isSelectedStoreClosed()" class="store-closed-notice">
                      <a-alert 
                        message="门店已停业" 
                        description="该门店已停业，无法进行预订。请选择其他门店。"
                        type="warning" 
                        show-icon 
                        size="small"
                      />
                    </div>
                    
                    <div v-else class="modern-calendar-container">
                      <!-- 日期范围选择和导航 -->
                      <div class="calendar-header">
                        <div class="date-range-selector">
                          <a-range-picker 
                            v-model:value="customDateRange"
                            size="small"
                            :disabled-date="disabledDate"
                            @change="handleCustomDateRangeChange"
                            placeholder="['开始日期', '结束日期']"
                          />
                        </div>
                        
                        <div class="view-controls">
                          <a-button 
                            type="text" 
                            size="small" 
                            @click="goToToday"
                          >
                            今天
                          </a-button>
                        </div>
                      </div>

                      <!-- 房间选择 -->
                      <div v-if="roomSchedule.length > 0" class="room-selector">
                        <label>选择房间：</label>
                        <a-select 
                          v-model:value="selectedRoomId" 
                          placeholder="请选择房间"
                          style="width: 200px"
                          @change="handleRoomChange"
                        >
                          <a-select-option 
                            v-for="room in roomSchedule" 
                            :key="room.room_id" 
                            :value="room.room_id"
                          >
                            {{ room.room_name }} ({{ room.capacity }}人)
                          </a-select-option>
                        </a-select>
                      </div>

                      <!-- 现代化时间网格 -->
                      <div v-if="selectedRoomId" class="time-grid-container">
                        <a-spin :spinning="loadingSchedule" tip="加载时间表...">
                          <div class="time-grid">
                            <!-- 时间轴标题 -->
                            <div class="time-grid-header" :style="{ gridTemplateColumns: `80px repeat(${weekDays.length}, 1fr)` }">
                              <div class="time-label-column"></div>
                              <div 
                                v-for="day in weekDays" 
                                :key="day.date"
                                class="day-column"
                                :class="{ 
                                  'today': isToday(day.date),
                                  'past': isPastDate(day.date)
                                }"
                              >
                                <div class="day-name">{{ day.dayName }}</div>
                                <div class="day-date">{{ day.dayNumber }}</div>
                              </div>
                            </div>

                            <!-- 时间网格主体 -->
                            <div class="time-grid-body">
                              <div 
                                v-for="hour in timeSlots" 
                                :key="hour"
                                class="time-row"
                                :style="{ gridTemplateColumns: `80px repeat(${weekDays.length}, 1fr)` }"
                              >
                                <div class="time-label">
                                  {{ formatHour(hour) }}
                                </div>
                                <div 
                                  v-for="day in weekDays" 
                                  :key="`${day.date}-${hour}`"
                                  class="time-cell"
                                  :class="getTimeCellClass(day.date, hour)"
                                  :data-date="day.date"
                                  :data-hour="hour"
                                  @click="handleTimeClick(day.date, hour)"
                                >
                                  <!-- 显示占用信息 -->
                                  <div 
                                    v-if="getOccupancyInfo(day.date, hour)" 
                                    class="occupancy-info"
                                    @click="showOccupancyDetail(day.date, hour)"
                                  >
                                    {{ getOccupancyInfo(day.date, hour).title }}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </a-spin>

                                                 <!-- 选择提示 -->
                         <div class="selection-hint">
                           <div class="hint-item">
                             <div class="color-indicator available"></div>
                             <span>可预订</span>
                           </div>
                           <div class="hint-item">
                             <div class="color-indicator occupied"></div>
                             <span>已占用</span>
                           </div>
                           <div class="hint-item">
                             <div class="color-indicator past"></div>
                             <span>已过时</span>
                           </div>
                           <div class="hint-item">
                             <div class="color-indicator start-selected"></div>
                             <span>开始时间</span>
                           </div>
                           <div class="hint-item">
                             <div class="color-indicator selected"></div>
                             <span>已选择</span>
                           </div>
                         </div>
                         

                      </div>

                      <!-- 加载房间时间表 -->
                      <div v-else>
                        <a-spin :spinning="loadingSchedule" tip="加载房间信息...">
                          <div v-if="roomSchedule.length === 0 && !loadingSchedule" class="no-rooms">
                            <a-empty 
                              description="该门店暂无可用房间，请选择其他门店。"
                              :image="false"
                              size="small"
                            />
                          </div>
                        </a-spin>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 步骤3：预订确认 -->
                <div v-if="selectedTimeRange.startTime && selectedTimeRange.endTime" class="booking-step booking-actions">
                  <div class="step-header">
                    <div class="step-number">{{ needStoreSelection ? 3 : 2 }}</div>
                    <h5>确认预订</h5>
                  </div>
                  <div class="step-content">
                    <div class="booking-summary">
                      <div class="summary-item">
                        <span>项目：</span>
                        <span>{{ selectedItem.name }}</span>
                      </div>
                      <div class="summary-item">
                        <span>门店：</span>
                        <span>{{ getSelectedStoreName() }}</span>
                      </div>
                      <div class="summary-item">
                        <span>房间：</span>
                        <span>{{ getSelectedRoomName() }}</span>
                      </div>
                      <div class="summary-item">
                        <span>时间：</span>
                        <span>{{ formatSelectedTimeRange() }}</span>
                      </div>
                      <div class="summary-item total-price">
                        <span>单价：</span>
                        <span>Rp {{ formatPrice(getSelectedStorePrice()) }}</span>
                      </div>
                    </div>
                    
                    <a-button 
                      type="primary" 
                      size="default" 
                      block
                      :loading="submitting"
                      @click="proceedToBooking"
                    >
                      立即预订
                    </a-button>
                  </div>
                </div>

              </div>
              
              <div v-else-if="itemDetail">
                <a-empty description="该项目暂无可选门店" />
              </div>
            </a-spin>
          </div>
        </div>
      </div>
    </div>

    <!-- 收款确认内容 -->
    <div v-show="activeTab === 'payment'" class="payment-content">
      <OrderPaymentConfirm 
        v-if="bookingData"
        :booking-data="bookingData"
        @cancel="handlePaymentCancel"
        @success="handlePaymentSuccess"
      />
    </div>

    <!-- 图片预览模态框 -->
    <a-modal
      v-model:open="imagePreviewVisible"
      title="图片预览"
      width="800px"
      :footer="null"
      centered
    >
      <div v-if="previewImages.length > 0" class="image-preview">
        <a-carousel v-model:current="currentPreviewIndex" arrows>
          <template #prevArrow>
            <div class="carousel-arrow prev-arrow">
              <LeftOutlined />
            </div>
          </template>
          <template #nextArrow>
            <div class="carousel-arrow next-arrow">
              <RightOutlined />
            </div>
          </template>
          
          <div v-for="(image, index) in previewImages" :key="index" class="preview-slide">
            <img :src="getImageUrl(image)" :alt="`预览图片 ${index + 1}`" />
          </div>
        </a-carousel>
        
        <div class="preview-counter">
          {{ currentPreviewIndex + 1 }} / {{ previewImages.length }}
        </div>
      </div>
    </a-modal>

    <!-- 自定义时间选择模态框 -->
    <a-modal
      v-model:open="customTimeVisible"
      title="自定义时间段"
      :confirm-loading="submitting"
      @ok="confirmCustomTime"
      @cancel="cancelCustomTime"
    >
      <div class="custom-time-form">
        <div class="form-item">
          <label>房间：</label>
          <span>{{ getRoomName(selectedRoomForCustom) }}</span>
        </div>
        <div class="form-item">
          <label>日期：</label>
          <span>{{ formatDate(selectedDate) }}</span>
        </div>
        <div class="form-item">
          <label>开始时间：</label>
          <a-time-picker
            v-model:value="customStartTime"
            format="HH:mm"
            placeholder="选择开始时间"
            :minute-step="15"
          />
        </div>
        <div class="form-item">
          <label>结束时间：</label>
          <a-time-picker
            v-model:value="customEndTime"
            format="HH:mm"
            placeholder="选择结束时间"
            :minute-step="15"
          />
        </div>
      </div>
    </a-modal>

    <!-- 占用详情模态框 -->
    <a-modal
      v-model:open="occupancyDetailVisible"
      title="时间段占用详情"
      :footer="null"
      width="600px"
    >
      <div v-if="occupancyDetail" class="occupancy-detail">
        <div class="detail-header">
          <h4>{{ getRoomName(occupancyDetail.room_id) }}</h4>
          <p>时间段：{{ occupancyDetail.time_slot }}</p>
        </div>
        
        <div class="conflicting-orders">
          <h5>冲突订单：</h5>
          <div 
            v-for="order in occupancyDetail.conflicting_orders" 
            :key="order.order_id"
            class="order-card"
          >
            <div class="order-info">
              <div class="order-header">
                <span class="order-type">{{ order.order_type }}</span>
                <span class="order-status" :class="order.status">{{ order.status }}</span>
              </div>
              <div class="order-details">
                <p><strong>客户：</strong>{{ order.customer_name }}</p>
                <p><strong>时间：</strong>{{ order.start_time }} - {{ order.end_time }}</p>
                <p v-if="order.script_name"><strong>剧本：</strong>{{ order.script_name }}</p>
                <p v-if="order.escape_room_name"><strong>密室：</strong>{{ order.escape_room_name }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import {
  PictureOutlined,
  CameraOutlined,
  UserOutlined,
  ClockCircleOutlined,
  TagOutlined,
  FireOutlined,
  TeamOutlined,
  LeftOutlined,
  RightOutlined,
  SearchOutlined,
  CloseOutlined,
  CheckOutlined,
  UpOutlined,
  DownOutlined
} from '@ant-design/icons-vue'
import { getBookingItems, getBookingItemDetail, getStoreRoomSchedule, preCheckBooking, checkCustomTimeSlot, getBookingStores } from '@/api/order'
import OrderPaymentConfirm from '@/components/order/OrderPaymentConfirm.vue'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const loadingDetail = ref(false)
const loadingSchedule = ref(false)
const submitting = ref(false)

// TAB相关
const activeTab = ref('booking')
const activeItemType = ref('all')
const bookingData = ref(null)

const allItems = ref([])
const categories = ref({
  script_types: [],
  escape_room_horror_levels: []
})
const availableStores = ref([])

// 搜索关键词
const searchKeyword = ref('')

const filters = reactive({
  store_id: null, // 门店筛选
  script_types: [],
  horror_levels: [],
  min_players: null,
  max_players: null,
  min_price: null,
  max_price: null
})

const selectedItem = ref(null)
const itemDetail = ref(null)
const selectedStoreId = ref(null)
const needStoreSelection = ref(true)

// 🆕 现代化时间选择相关状态
const selectedRoomId = ref(null)
const currentWeekStart = ref(dayjs().startOf('week'))
const selectedTimeRange = ref({
  date: null,
  startTime: null,
  endTime: null,
  roomId: null
})
// 🔧 改为点击式选择状态
const selectionState = ref('none') // 'none', 'selecting_start', 'selecting_end'
const tempStartTime = ref(null)
const tempStartDate = ref(null)
const roomSchedule = ref([])
const roomOccupancy = ref(new Map()) // 存储房间占用信息

// 🆕 日期范围选择
const customDateRange = ref([dayjs(), dayjs().add(6, 'day')]) // 自定义日期范围

// 兼容旧的状态
const selectedDate = ref(null)
const selectedTimeSlot = ref(null)

// 图片预览
const imagePreviewVisible = ref(false)
const previewImages = ref([])
const currentPreviewIndex = ref(0)

// 自定义时间选择
const customTimeVisible = ref(false)
const customStartTime = ref(null)
const customEndTime = ref(null)
const selectedRoomForCustom = ref(null)

// 占用详情显示
const occupancyDetailVisible = ref(false)
const occupancyDetail = ref(null)

// 门店选择折叠状态
const storeSelectionExpanded = ref(true)
const toggleStoreSelection = () => {
  storeSelectionExpanded.value = !storeSelectionExpanded.value
}

// 🔧 修复：不在前端过滤，直接使用后端返回的数据
const filteredItems = computed(() => {
  // 后端已经根据筛选条件返回了正确的数据，前端不需要再次过滤
  return allItems.value
})

// 🆕 现代化时间选择计算属性
const weekDays = computed(() => {
  const days = []
  const today = dayjs().startOf('day')
  
  // 使用自定义日期范围
  if (customDateRange.value && customDateRange.value.length === 2) {
    const startDate = customDateRange.value[0]
    const endDate = customDateRange.value[1]
    const daysDiff = endDate.diff(startDate, 'day') + 1
    
    for (let i = 0; i < daysDiff; i++) {
      const date = startDate.add(i, 'day')
      
      // 🔧 只显示今天和以后的日期
      if (date.isBefore(today)) {
        continue
      }
      
      days.push({
        date: date.format('YYYY-MM-DD'),
        dayName: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.day()],
        dayNumber: date.format('DD'),
        dayjs: date
      })
    }
  }
  
  return days
})

const timeSlots = computed(() => {
  // 生成9:00-23:00的时间段，每30分钟一个
  const slots = []
  for (let hour = 9; hour <= 23; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 23 && minute > 0) break // 23:00是最后一个时间段
      slots.push(hour + minute / 60)
    }
  }
  return slots
})

const currentUserTime = computed(() => {
  return dayjs()
})

// 生命周期
onMounted(() => {
  loadBookingItems()
  loadAvailableStores()
})

// 监听选中项目变化
watch(selectedItem, (newItem) => {
  if (newItem) {
    loadItemDetail(newItem.type, newItem.id)
  } else {
    resetBookingState()
  }
})

// 监听门店选择变化
watch(selectedStoreId, () => {
  selectedDate.value = null
  selectedTimeSlot.value = null
  roomSchedule.value = []
  
  // 🆕 重置现代化时间选择状态
  selectedRoomId.value = null
  selectedTimeRange.value = {
    date: null,
    startTime: null,
    endTime: null,
    roomId: null
  }
  selectionState.value = 'none'
  tempStartTime.value = null
  tempStartDate.value = null
  roomOccupancy.value.clear()
  
  // 🆕 当选择门店后，自动折叠门店选择区域
  if (selectedStoreId.value) {
    storeSelectionExpanded.value = false
    // 加载房间列表
    loadRoomList()
  }
})

// 监听房间选择变化
watch(selectedRoomId, () => {
  if (selectedRoomId.value) {
    loadRoomOccupancy()
  }
})



// 监听日期变化（兼容旧逻辑）
watch(selectedDate, (newDate) => {
  if (newDate && selectedStoreId.value) {
    loadRoomSchedule()
  }
  selectedTimeSlot.value = null
})

// 方法
const loadBookingItems = async () => {
  try {
    loading.value = true
    
    // 🔧 构建完整的筛选参数
    const params = {
      item_type: activeItemType.value,
      keyword: searchKeyword.value || undefined,
      store_id: filters.store_id || undefined,
      // 🆕 添加人数筛选
      min_players: filters.min_players || undefined,
      max_players: filters.max_players || undefined,
      // 🆕 添加价格筛选
      min_price: filters.min_price || undefined,
      max_price: filters.max_price || undefined,
      // 🆕 添加剧本类型筛选
      script_types: filters.script_types.length > 0 ? filters.script_types : undefined,
      // 🆕 添加恐怖等级筛选
      horror_levels: filters.horror_levels.length > 0 ? filters.horror_levels : undefined
    }
    
    // 移除undefined值
    Object.keys(params).forEach(key => {
      if (params[key] === undefined) {
        delete params[key]
      }
    })
    
    console.log('📋 加载预订项目:', params)
    const response = await getBookingItems(params)
    console.log('📋 预订项目响应:', response)
    
    allItems.value = response.data?.items || []
    categories.value = response.data?.categories || {}
    
    console.log('📋 项目数据:', {
      items: allItems.value.length,
      categories: categories.value
    })
  } catch (error) {
    console.error('加载预订项目失败:', error)
    message.error('加载预订项目失败')
  } finally {
    loading.value = false
  }
}

const loadAvailableStores = async () => {
  try {
    console.log('🏪 加载可选门店...')
    const response = await getBookingStores()
    console.log('🏪 门店响应:', response)
    
    availableStores.value = response.data || []
    
    console.log('🏪 门店数据:', {
      stores: availableStores.value.length
    })
  } catch (error) {
    console.error('加载门店列表失败:', error)
    message.error('加载门店列表失败')
  }
}

const loadItemDetail = async (itemType, itemId) => {
  try {
    loadingDetail.value = true
    console.log('🎯 加载项目详情:', { itemType, itemId })
    
    const response = await getBookingItemDetail(itemType, itemId)
    console.log('🎯 项目详情响应:', response)
    
    itemDetail.value = response.data
    console.log('🎯 项目详情数据:', itemDetail.value)
    
    // 🆕 处理门店选择逻辑
    if (itemDetail.value) {
      needStoreSelection.value = itemDetail.value.need_store_selection
      
      // 如果不需要门店选择，自动选择门店
      if (!needStoreSelection.value && itemDetail.value.auto_selected_store) {
        selectedStoreId.value = itemDetail.value.auto_selected_store.store_id
        console.log('🏪 自动选择门店:', {
          storeId: selectedStoreId.value,
          storeName: itemDetail.value.auto_selected_store.store_name,
          reason: itemDetail.value.total_user_stores === 1 ? '用户只有一个门店' : '项目只在一个门店上架'
        })
      } else {
        // 需要手动选择门店时，只重置门店相关状态，不调用resetBookingState避免循环
        if (selectedStoreId.value !== null) {
          selectedStoreId.value = null
        }
        storeSelectionExpanded.value = true
      }
    }
    
    // 🔧 单独重置其他状态，避免重复设置selectedStoreId导致循环
    selectedDate.value = null
    selectedTimeSlot.value = null
    roomSchedule.value = []
    
    // 🆕 重置现代化时间选择状态
    selectedRoomId.value = null
    selectedTimeRange.value = {
      date: null,
      startTime: null,
      endTime: null,
      roomId: null
    }
    selectionState.value = 'none'
    tempStartTime.value = null
    tempStartDate.value = null
    roomOccupancy.value.clear()
    
  } catch (error) {
    console.error('加载项目详情失败:', error)
    message.error('加载项目详情失败')
  } finally {
    loadingDetail.value = false
  }
}

// 🆕 加载房间列表
const loadRoomList = async () => {
  if (!selectedStoreId.value || !selectedItem.value) return
  
  try {
    loadingSchedule.value = true
    const today = dayjs().format('YYYY-MM-DD')
    const params = {
      date: today,
      item_type: selectedItem.value.type,
      item_id: selectedItem.value.id
    }
    
    console.log('🏠 加载房间列表:', {
      storeId: selectedStoreId.value,
      params: params
    })
    
    const response = await getStoreRoomSchedule(selectedStoreId.value, params)
    console.log('📅 房间列表响应:', response)
    
    roomSchedule.value = response.data?.rooms || []
    console.log('🏠 房间列表数据:', roomSchedule.value)
    
    // 如果只有一个房间，自动选择
    if (roomSchedule.value.length === 1) {
      selectedRoomId.value = roomSchedule.value[0].room_id
    }
  } catch (error) {
    console.error('加载房间列表失败:', error)
    message.error('加载房间列表失败')
  } finally {
    loadingSchedule.value = false
  }
}

const loadRoomSchedule = async () => {
  // 确保有选中的项目才加载房间时间表
  if (!selectedItem.value) {
    console.log('🏠 未选择项目，无法加载房间时间表')
    return
  }
  
  try {
    loadingSchedule.value = true
    const params = {
      date: selectedDate.value.format('YYYY-MM-DD'),
      item_type: selectedItem.value.type,
      item_id: selectedItem.value.id
    }
    
    console.log('🏠 加载房间时间表:', {
      storeId: selectedStoreId.value,
      params: params
    })
    
    const response = await getStoreRoomSchedule(selectedStoreId.value, params)
    console.log('📅 房间时间表响应:', response)
    
    // 修复：response.data 就是包含 rooms 的对象
    roomSchedule.value = response.data?.rooms || []
    console.log('🕐 房间时间表数据:', roomSchedule.value)
  } catch (error) {
    console.error('加载房间时间表失败:', error)
    message.error('加载房间时间表失败')
  } finally {
    loadingSchedule.value = false
  }
}

const handleTabChange = (key) => {
  activeItemType.value = key
  // 切换类型时重置搜索和筛选
  searchKeyword.value = ''
  resetFilters()
}

const handleFilterChange = () => {
  // 门店筛选变化时重新加载数据
  loadBookingItems()
}

const handleSearchChange = () => {
  // 搜索时重新加载数据
  loadBookingItems()
}

const resetFilters = () => {
  // 重置搜索关键词
  searchKeyword.value = ''
  
  // 重置筛选条件
  Object.keys(filters).forEach(key => {
    if (Array.isArray(filters[key])) {
      filters[key] = []
    } else {
      filters[key] = null
    }
  })
  
  // 重新加载数据
  loadBookingItems()
}

const selectItem = (item) => {
  selectedItem.value = item
}

const closeDetail = () => {
  selectedItem.value = null
  needStoreSelection.value = true
  selectedStoreId.value = null
  selectedDate.value = null
  selectedTimeSlot.value = null
  roomSchedule.value = []
  storeSelectionExpanded.value = true
}

const resetBookingState = () => {
  // 🆕 只有在需要门店选择时才重置门店ID
  if (needStoreSelection.value) {
    selectedStoreId.value = null
    storeSelectionExpanded.value = true
  }
  selectedDate.value = null
  selectedTimeSlot.value = null
  roomSchedule.value = []
}

const handleStoreChange = () => {
  // 监听器会自动处理重置
}

const handleDateChange = () => {
  // 监听器会自动处理加载时间表
}

const selectTimeSlot = (roomId, slot) => {
  // 如果是自定义时间段
  if (slot.slot_type === 'custom') {
    selectedRoomForCustom.value = roomId
    customTimeVisible.value = true
    return
  }
  
  // 如果时间段被占用，显示占用详情
  if (!slot.is_available && slot.conflicting_orders && slot.conflicting_orders.length > 0) {
    occupancyDetail.value = {
      room_id: roomId,
      time_slot: `${slot.start_time} - ${slot.end_time}`,
      conflicting_orders: slot.conflicting_orders
    }
    occupancyDetailVisible.value = true
    return
  }
  
  // 如果时间段可用，选择该时间段
  if (slot.is_available) {
    selectedTimeSlot.value = {
      ...slot,
      room_id: roomId
    }
    

  }
}

const isSlotSelected = (roomId, slot) => {
  return selectedTimeSlot.value?.room_id === roomId && 
         selectedTimeSlot.value?.start_time === slot.start_time
}

const proceedToBooking = async () => {
  try {
    submitting.value = true
    
    // 🔧 检查是否有有效的时间选择
    if (!selectedTimeRange.value.date || !selectedTimeRange.value.startTime || !selectedTimeRange.value.endTime || !selectedTimeRange.value.roomId) {
      message.error('请先选择完整的时间段')
      return
    }
    
    // 预检查
    const checkData = {
      store_id: selectedStoreId.value,
      room_id: selectedTimeRange.value.roomId,
      item_type: selectedItem.value.type,
      item_id: selectedItem.value.id,
      date: selectedTimeRange.value.date,
      start_time: formatHour(selectedTimeRange.value.startTime),
      end_time: formatHour(selectedTimeRange.value.endTime)
    }
    
    const checkResponse = await preCheckBooking(checkData)
    
    if (!checkResponse.data.is_available) {
      message.error(checkResponse.data.message || '选择的时间段不可用')
      return
    }
    
    // 准备预订数据，切换到收款确认TAB
    bookingData.value = {
      // 项目信息
      item_type: selectedItem.value.type,
      item_id: selectedItem.value.id,
      item_name: selectedItem.value.name,
      
      // 门店和房间信息
      store_id: selectedStoreId.value,
      store_name: getSelectedStoreName(),
      room_id: selectedTimeRange.value.roomId,
      room_name: getSelectedRoomName(),
      
      // 时间信息
      date: selectedTimeRange.value.date,
      start_time: formatHour(selectedTimeRange.value.startTime),
      end_time: formatHour(selectedTimeRange.value.endTime),
      
      // 价格信息
      store_price: getSelectedStorePrice()
    }
    
    // 切换到收款确认TAB
    activeTab.value = 'payment'
    
  } catch (error) {
    console.error('预检查失败:', error)
    message.error('预检查失败，请重试')
  } finally {
    submitting.value = false
  }
}

// TAB切换方法
const handleMainTabChange = (key) => {
  activeTab.value = key
}

// 辅助方法
const getImageUrl = (imageUrl) => {
  if (!imageUrl) return ''
  if (imageUrl.startsWith('http')) {
    return imageUrl
  }
  return `http://localhost:3000${imageUrl}`
}

const handleImageError = (e) => {
  // 使用内联SVG作为占位符，避免404错误
  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDIwMCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMTUwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik03NSA2MEw5MCA0NUwxMTUgNzBMMTM1IDUwTDE2NSA4MEwxNjUgMTIwSDM1VjgwTDU1IDYwTDc1IDYwWiIgZmlsbD0iI0QwRDBEMCIvPgo8Y2lyY2xlIGN4PSI2MCIgY3k9IjUwIiByPSIxMCIgZmlsbD0iI0QwRDBEMCIvPgo8dGV4dCB4PSIxMDAiIHk9IjkwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5OTk5IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTIiPuaXoOWbvueJhzwvdGV4dD4KPHN2Zz4='
}

const formatPrice = (price) => {
  return new Intl.NumberFormat('id-ID').format(price || 0)
}

const formatDate = (date) => {
  const dayObj = dayjs(date)
  const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const weekday = weekdays[dayObj.day()]
  return `${dayObj.format('YYYY-MM-DD')} ${weekday}`
}

const disabledDate = (current) => {
  // 禁用今天之前的日期
  return current && current < dayjs().startOf('day')
}

const showImagePreview = (images, startIndex = 0) => {
  previewImages.value = images
  currentPreviewIndex.value = startIndex
  imagePreviewVisible.value = true
}

const getSelectedStoreName = () => {
  if (!itemDetail.value || !selectedStoreId.value) return ''
  const store = itemDetail.value.available_stores.find(s => s.store_id === selectedStoreId.value)
  return store?.store_name || ''
}

const getSelectedRoomName = () => {
  // 优先使用新的房间选择
  const roomId = selectedRoomId.value || selectedTimeSlot.value?.room_id
  if (!roomId) return ''
  
  const room = roomSchedule.value.find(r => r.room_id === roomId)
  return room?.room_name || ''
}

const getSelectedStorePrice = () => {
  if (!itemDetail.value || !selectedStoreId.value) return selectedItem.value?.price || 0
  const store = itemDetail.value.available_stores.find(s => s.store_id === selectedStoreId.value)
  return store?.store_price || selectedItem.value?.price || 0
}

// 🆕 自定义时间相关方法
const confirmCustomTime = async () => {
  if (!customStartTime.value || !customEndTime.value) {
    message.error('请选择开始和结束时间')
    return
  }
  
  if (customStartTime.value >= customEndTime.value) {
    message.error('结束时间必须晚于开始时间')
    return
  }
  
  try {
    submitting.value = true
    
    const params = {
      date: selectedDate.value.format('YYYY-MM-DD'),
      start_time: customStartTime.value.format('HH:mm'),
      end_time: customEndTime.value.format('HH:mm')
    }
    
    console.log('🕐 检查自定义时间段:', {
      storeId: selectedStoreId.value,
      roomId: selectedRoomForCustom.value,
      params: params
    })
    
    const response = await checkCustomTimeSlot(
      selectedStoreId.value,
      selectedRoomForCustom.value,
      params
    )
    
    console.log('🕐 自定义时间段响应:', response)
    
    if (response.data.is_available) {
      // 时间段可用，设置为选中状态
      selectedTimeSlot.value = {
        start_time: params.start_time,
        end_time: params.end_time,
        is_available: true,
        slot_type: 'custom',
        room_id: selectedRoomForCustom.value
      }
      customTimeVisible.value = false
      message.success('自定义时间段可用')
    } else {
      // 时间段被占用，显示冲突详情
      occupancyDetail.value = {
        room_id: selectedRoomForCustom.value,
        time_slot: `${params.start_time} - ${params.end_time}`,
        conflicting_orders: response.data.conflict_details || []
      }
      occupancyDetailVisible.value = true
      customTimeVisible.value = false
    }
  } catch (error) {
    console.error('检查自定义时间段失败:', error)
    message.error('检查时间段失败，请重试')
  } finally {
    submitting.value = false
  }
}

const cancelCustomTime = () => {
  customTimeVisible.value = false
  customStartTime.value = null
  customEndTime.value = null
  selectedRoomForCustom.value = null
}

const getRoomName = (roomId) => {
  const room = roomSchedule.value.find(r => r.room_id === roomId)
  return room?.room_name || '未知房间'
}

const showRoomImages = (room) => {
  if (room.images && room.images.length > 0) {
    showImagePreview(room.images, 0)
  } else if (room.cover_image) {
    showImagePreview([room.cover_image], 0)
  }
}

// 🔧 判断选中的门店是否已关闭
const isSelectedStoreClosed = () => {
  if (!selectedStoreId.value || !itemDetail.value) return false
  
  // 检查自动选择的门店
  if (itemDetail.value.auto_selected_store) {
    return itemDetail.value.auto_selected_store.store_status === '已停业'
  }
  
  // 检查可选门店列表中的门店
  const selectedStore = itemDetail.value.available_stores.find(
    store => store.store_id === selectedStoreId.value
  )
  return selectedStore?.store_status === '已停业'
}

// 🆕 现代化时间选择方法
const formatWeekRange = () => {
  if (customDateRange.value && customDateRange.value.length === 2) {
    const start = customDateRange.value[0]
    const end = customDateRange.value[1]
    return `${start.format('M月D日')} - ${end.format('M月D日, YYYY')}`
  }
  return ''
}

const formatSelectedTimeRange = () => {
  if (!selectedTimeRange.value.date || !selectedTimeRange.value.startTime || !selectedTimeRange.value.endTime) {
    return ''
  }
  
  const date = dayjs(selectedTimeRange.value.date).format('M月D日')
  const startTime = formatHour(selectedTimeRange.value.startTime)
  const endTime = formatHour(selectedTimeRange.value.endTime)
  
  return `${date} ${startTime} - ${endTime}`
}

const formatHour = (hour) => {
  const h = Math.floor(hour)
  const m = (hour % 1) * 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}



const goToToday = () => {
  customDateRange.value = [dayjs(), dayjs().add(6, 'day')]
  loadRoomOccupancy()
}

const isToday = (date) => {
  return dayjs(date).isSame(dayjs(), 'day')
}

const isPastDate = (date) => {
  return dayjs(date).isBefore(dayjs(), 'day')
}

const isPastTime = (date, hour) => {
  const timePoint = dayjs(date).hour(Math.floor(hour)).minute((hour % 1) * 60)
  return timePoint.isBefore(currentUserTime.value)
}

const handleRoomChange = () => {
  // 🔧 重置所有选择状态
  resetTimeSelection()
  loadRoomOccupancy()
}

const getTimeCellClass = (date, hour) => {
  const classes = []
  
  // 检查是否是过去时间
  if (isPastTime(date, hour)) {
    classes.push('past')
  }
  
  // 检查是否被占用
  const occupancy = getOccupancyInfo(date, hour)
  if (occupancy) {
    classes.push('occupied')
  } else if (!isPastTime(date, hour)) {
    classes.push('available')
  }
  
  // 检查是否在最终选择范围内
  if (isInSelectedRange(date, hour)) {
    classes.push('selected')
  }
  
  // 🔧 检查是否是临时选择的开始时间
  if (isStartTimeSelected(date, hour)) {
    classes.push('start-selected')
  }
  
  return classes
}

const isInSelectedRange = (date, hour) => {
  if (!selectedTimeRange.value.date || !selectedTimeRange.value.startTime || !selectedTimeRange.value.endTime) {
    return false
  }
  
  if (selectedTimeRange.value.date !== date) {
    return false
  }
  
  // 🔧 包含结束时间格子，但不包含下一个时间格
  return hour >= selectedTimeRange.value.startTime && hour <= selectedTimeRange.value.endTime
}

// 🔧 更新选择状态判断
const isStartTimeSelected = (date, hour) => {
  return selectionState.value === 'selecting_end' && 
         tempStartDate.value === date && 
         tempStartTime.value === hour
}

// 🔧 新的点击式时间选择逻辑
const handleTimeClick = (date, hour) => {
  // 不能选择过去的时间
  if (isPastTime(date, hour)) {
    message.warning('不能选择过去的时间')
    return
  }
  
  // 不能选择已占用的时间
  if (getOccupancyInfo(date, hour)) {
    message.warning('该时间段已被占用')
    return
  }
  
  if (selectionState.value === 'none') {
    // 第一次点击：设置开始时间
    tempStartTime.value = hour
    tempStartDate.value = date
    selectionState.value = 'selecting_end'
    
    // 清除之前的选择
    selectedTimeRange.value = {
      date: null,
      startTime: null,
      endTime: null,
      roomId: selectedRoomId.value
    }
    
    message.info('已选择开始时间，请选择结束时间')
    
  } else if (selectionState.value === 'selecting_end') {
    // 第二次点击：设置结束时间
    
    // 必须在同一天
    if (tempStartDate.value !== date) {
      message.warning('开始时间和结束时间必须在同一天')
      return
    }
    
    // 🔧 如果选择的结束时间早于或等于开始时间，则将此时间作为新的开始时间
    if (hour <= tempStartTime.value) {
      tempStartTime.value = hour
      tempStartDate.value = date
      message.info('已重新选择开始时间，请选择结束时间')
      return
    }
    
    const startHour = tempStartTime.value
    const endHour = hour // 🔧 精确到用户选择的时间格，不自动加0.5
    
    // 检查选择范围内是否有占用的时间段
    const hasOccupied = timeSlots.value.some(checkHour => {
      return checkHour >= startHour && checkHour < endHour && getOccupancyInfo(date, checkHour)
    })
    
    if (hasOccupied) {
      message.warning('选择的时间范围内包含已占用的时间段，请重新选择')
      // 重置选择状态
      selectionState.value = 'none'
      tempStartTime.value = null
      tempStartDate.value = null
      return
    }
    
    // 🔧 检查是否至少选择了30分钟（一个时间格）
    if (endHour - startHour < 0.5) {
      message.warning('至少需要选择30分钟')
      return
    }
    
    // 设置选择结果
    selectedTimeRange.value = {
      date: date,
      startTime: startHour,
      endTime: endHour,
      roomId: selectedRoomId.value
    }
    
    // 更新兼容状态
    selectedDate.value = dayjs(date)
    selectedTimeSlot.value = {
      start_time: formatHour(startHour),
      end_time: formatHour(endHour),
      room_id: selectedRoomId.value,
      is_available: true
    }
    
    // 重置选择状态
    selectionState.value = 'none'
    tempStartTime.value = null
    tempStartDate.value = null
    
    message.success('时间选择完成')
  }
}

const getOccupancyInfo = (date, hour) => {
  const key = `${selectedRoomId.value}-${date}`
  const dayOccupancy = roomOccupancy.value.get(key)
  
  if (!dayOccupancy) return null
  
  return dayOccupancy.find(occupancy => {
    const startHour = parseFloat(occupancy.start_hour)
    const endHour = parseFloat(occupancy.end_hour)
    return hour >= startHour && hour < endHour
  })
}

const showOccupancyDetail = (date, hour) => {
  const occupancy = getOccupancyInfo(date, hour)
  if (!occupancy) return
  
  occupancyDetail.value = {
    room_id: selectedRoomId.value,
    time_slot: `${formatHour(occupancy.start_hour)} - ${formatHour(occupancy.end_hour)}`,
    conflicting_orders: occupancy.orders || []
  }
  occupancyDetailVisible.value = true
}

const loadRoomOccupancy = async () => {
  if (!selectedRoomId.value || !selectedStoreId.value) return
  
  try {
    loadingSchedule.value = true
    roomOccupancy.value.clear()
    
    // 为当前日期范围的每一天加载占用信息
    for (const day of weekDays.value) {
      const response = await getStoreRoomSchedule(selectedStoreId.value, {
        date: day.date,
        item_type: selectedItem.value?.type,
        item_id: selectedItem.value?.id
      })
      
      const roomData = response.data?.rooms?.find(r => r.room_id === selectedRoomId.value)
      if (roomData && roomData.current_orders) {
        const key = `${selectedRoomId.value}-${day.date}`
        const occupancies = roomData.current_orders.map(order => ({
          start_hour: timeStringToHour(order.start_time),
          end_hour: timeStringToHour(order.end_time),
          title: order.customer_name || order.order_type,
          orders: [order]
        }))
        roomOccupancy.value.set(key, occupancies)
      }
    }
  } catch (error) {
    console.error('加载房间占用信息失败:', error)
    message.error('加载房间占用信息失败')
  } finally {
    loadingSchedule.value = false
  }
}

const timeStringToHour = (timeString) => {
  const [hours, minutes] = timeString.split(':').map(Number)
  return hours + minutes / 60
}

// 🆕 取消时间选择
const cancelTimeSelection = () => {
  selectionState.value = 'none'
  tempStartTime.value = null
  tempStartDate.value = null
  message.info('已取消时间选择')
}



const handleCustomDateRangeChange = (dates) => {
  if (dates && dates.length === 2) {
    const daysDiff = dates[1].diff(dates[0], 'day') + 1
    if (daysDiff > 7) {
      message.warning('最多只能选择7天')
      customDateRange.value = [dates[0], dates[0].add(6, 'day')]
    }
  }
  // 重置时间选择状态
  resetTimeSelection()
  // 重新加载房间占用信息
  if (selectedRoomId.value) {
    loadRoomOccupancy()
  }
}

const resetTimeSelection = () => {
  selectedTimeRange.value = {
    date: null,
    startTime: null,
    endTime: null,
    roomId: selectedRoomId.value
  }
  selectionState.value = 'none'
  tempStartTime.value = null
  tempStartDate.value = null
}

// 收款确认相关方法
const handlePaymentCancel = () => {
  // 返回到预订TAB
  activeTab.value = 'booking'
}

const handlePaymentSuccess = (orderData) => {
  // 订单创建成功，可以跳转到订单页面或显示成功信息
  message.success('订单创建成功！')
  
  // 重置所有状态
  resetAllState()
  
  // 可以选择跳转到订单管理页面
  // router.push({ name: 'OrderView' })
}

const resetAllState = () => {
  // 重置所有预订状态
  selectedItem.value = null
  itemDetail.value = null
  selectedStoreId.value = null
  selectedDate.value = null
  selectedTimeSlot.value = null
  roomSchedule.value = []
  bookingData.value = null
  storeSelectionExpanded.value = true
  needStoreSelection.value = true
  
  // 切换回预订TAB
  activeTab.value = 'booking'
}
</script>

<style scoped>
.booking-container {
  padding: 0;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.booking-tabs {
  background: white;
  padding: 0 24px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.booking-content {
  display: flex;
  height: calc(100vh - 65px);
  flex: 1;
  overflow: hidden;
}

/* 左侧筛选区域 */
.booking-filters {
  width: 280px;
  background: white;
  border-right: 1px solid #f0f0f0;
  padding: 24px;
  overflow-y: auto;
  flex-shrink: 0;
}

.booking-filters h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
}

.filter-group {
  margin-bottom: 24px;
}

.filter-group h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.search-group {
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 20px;
  margin-bottom: 20px;
}

.search-group .ant-input-affix-wrapper {
  border-radius: 6px;
}

.filter-item {
  margin-bottom: 8px;
}

.filter-actions {
  margin-top: 24px;
}

/* 中间项目列表 */
.booking-items {
  flex: 1;
  background: #fafafa;
  padding: 24px;
  overflow-y: auto;
  transition: all 0.3s ease;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.item-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.item-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.item-card.selected {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.item-cover {
  position: relative;
  height: 180px;
  overflow: hidden;
}

.item-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.no-image {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  color: #bfbfbf;
  font-size: 24px;
}

.item-type-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.image-count {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.item-info {
  padding: 16px;
}

.item-name {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
}

.item-details {
  margin-bottom: 12px;
}

.detail-row {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
  font-size: 13px;
  color: #666;
}

.detail-row .anticon {
  margin-right: 6px;
  color: #999;
}

.item-price {
  display: flex;
  align-items: baseline;
  margin-bottom: 8px;
}

.price-label {
  font-size: 12px;
  color: #999;
  margin-right: 4px;
}

.price-value {
  font-size: 18px;
  font-weight: 600;
  color: #f50;
}

.store-count {
  font-size: 12px;
  color: #999;
}

/* 遮罩层 */
.detail-overlay {
  display: none;
}

/* 右侧详情区域 */
.booking-detail {
  width: 480px;
  background: white;
  border-left: 1px solid #f0f0f0;
  overflow-y: auto;
  position: relative;
  animation: slideInRight 0.3s ease-out;
  flex-shrink: 0;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.detail-close {
  position: sticky;
  top: 0;
  right: 0;
  z-index: 10;
  background: white;
  padding: 12px 16px 0 0;
  display: flex;
  justify-content: flex-end;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 16px;
}

.close-btn {
  color: #666;
  font-size: 16px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: #f5f5f5;
  color: #333;
}

.detail-content {
  padding: 0 24px 24px 24px;
}

.detail-header h2 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
}

.item-tags {
  margin-bottom: 16px;
}

.detail-images {
  margin-bottom: 20px;
}

.image-gallery {
  display: flex;
  gap: 8px;
}

.image-gallery img {
  width: 80px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
}

.more-images {
  width: 80px;
  height: 60px;
  background: #f5f5f5;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #666;
  cursor: pointer;
}

.detail-description {
  margin-bottom: 20px;
}

.detail-description h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
}

.detail-description p {
  margin: 0;
  font-size: 13px;
  color: #666;
  line-height: 1.5;
}

.detail-attributes {
  margin-bottom: 20px;
}

.attr-row {
  display: flex;
  margin-bottom: 8px;
  font-size: 13px;
}

.attr-label {
  width: 80px;
  color: #666;
  flex-shrink: 0;
}

/* 步骤式预订样式 */
.booking-step {
  margin-bottom: 16px;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  overflow: hidden;
  background: white;
  transition: all 0.3s ease;
}

.booking-step:hover {
  border-color: #d9d9d9;
}

.step-header {
  display: flex;
  align-items: center;
  padding: 14px 20px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
  cursor: default;
  min-height: 48px;
}

.store-selection .step-header {
  cursor: default;
}

.store-selection.has-selection .step-header {
  cursor: pointer;
}

.step-number {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: #1890ff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  margin-right: 10px;
  flex-shrink: 0;
}

.step-header h5 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  flex: 1;
}

.selected-indicator {
  display: flex;
  align-items: center;
  color: #52c41a;
  font-size: 12px;
  margin-left: auto;
  margin-right: 8px;
}

.selected-indicator .anticon {
  margin-right: 4px;
  font-size: 12px;
}

.selected-indicator span {
  font-weight: 500;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.collapse-icon {
  color: #666;
  font-size: 12px;
  transition: transform 0.3s ease;
}

.step-content {
  padding: 18px 20px;
  transition: all 0.3s ease;
}

.booking-step.collapsed .step-content {
  padding: 0;
  max-height: 0;
  overflow: hidden;
}

.booking-step.collapsed .step-header {
  border-bottom: none;
}

.room-filter-info {
  margin-left: auto;
}

.store-selection .step-content {
  padding: 14px;
}

/* 自动选择门店样式 */
.auto-store-info .step-number {
  background: #52c41a;
}

.auto-store-info .step-content {
  padding: 14px;
}

.auto-store-card {
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 4px;
  padding: 12px;
}

.auto-store-card .store-info {
  margin-left: 0;
  margin-bottom: 8px;
}

.auto-reason {
  display: flex;
  justify-content: flex-end;
}

.store-option {
  padding: 14px;
  margin-bottom: 12px;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  transition: all 0.3s ease;
}

.store-option:hover {
  border-color: #d9d9d9;
  background: #fafafa;
}

.store-option .ant-radio-wrapper {
  width: 100%;
}

.store-info {
  margin-left: 20px;
}

.store-name {
  font-weight: 500;
  margin-bottom: 3px;
  font-size: 14px;
}

.store-address {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
  line-height: 1.3;
}

.store-price {
  font-size: 14px;
  color: #f50;
  font-weight: 600;
}

.room-filter-info {
  display: flex;
  align-items: center;
}

.filter-tag {
  padding: 2px 6px;
  background: #f0f7ff;
  color: #1890ff;
  border: 1px solid #d6e4ff;
  border-radius: 3px;
  font-size: 11px;
  font-weight: 500;
}

.room-schedule {
  margin-bottom: 16px;
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.room-info {
  flex: 1;
}

.room-image {
  width: 50px;
  height: 38px;
  border-radius: 3px;
  overflow: hidden;
  margin-left: 10px;
}

.room-image {
  position: relative;
}

.room-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
  transition: opacity 0.3s ease;
}

.room-image img:hover {
  opacity: 0.8;
}

.room-image-count {
  position: absolute;
  bottom: 1px;
  right: 1px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 1px 3px;
  border-radius: 2px;
  font-size: 9px;
  display: flex;
  align-items: center;
  gap: 1px;
}

.room-header h6 {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
}

.room-capacity {
  font-size: 11px;
  color: #666;
}

.room-status {
  font-size: 11px;
  color: #52c41a;
  margin-left: 6px;
}

.debug-info {
  margin-bottom: 12px;
}

.no-time-slots {
  padding: 12px;
  text-align: center;
  background: #fafafa;
  border-radius: 3px;
  margin-top: 6px;
}

.time-slots {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-top: 8px;
}

.time-slot {
  padding: 12px 10px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 60px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.time-slot.available {
  background: white;
  border-color: #52c41a;
  color: #52c41a;
}

.time-slot.available:hover {
  background: #f6ffed;
}

.time-slot.selected {
  background: #1890ff;
  border-color: #1890ff;
  color: white;
}

.time-slot.occupied {
  background: #fff2f0;
  border-color: #ffccc7;
  color: #ff4d4f;
  cursor: pointer;
}

.time-slot.occupied:hover {
  background: #fff1f0;
  border-color: #ff7875;
}

.time-slot.custom {
  background: #f6ffed;
  border-color: #b7eb8f;
  color: #52c41a;
  cursor: pointer;
}

.time-slot.custom:hover {
  background: #f6ffed;
  border-color: #73d13d;
}

.slot-time {
  font-size: 11px;
  font-weight: 500;
}

.slot-status {
  font-size: 10px;
  margin-top: 1px;
}

.booking-summary {
  background: #f8f9fa;
  padding: 18px;
  border-radius: 6px;
  margin-bottom: 18px;
  border: 1px solid #e9ecef;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
  line-height: 1.4;
}

.summary-item span:first-child {
  color: #666;
  font-weight: 500;
}

.summary-item span:last-child {
  color: #333;
  font-weight: 500;
  text-align: right;
  flex: 1;
  margin-left: 12px;
}

.summary-item.total-price {
  font-size: 18px;
  font-weight: 600;
  color: #f50;
  border-top: 1px solid #e8e8e8;
  padding-top: 12px;
  margin-top: 12px;
}

.summary-item.total-price span:first-child {
  color: #333;
}

.summary-item.total-price span:last-child {
  color: #f50;
}

/* 图片预览 */
.image-preview {
  position: relative;
}

.preview-slide img {
  width: 100%;
  height: 400px;
  object-fit: contain;
}

.carousel-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.5);
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 1;
}

.prev-arrow {
  left: 10px;
}

.next-arrow {
  right: 10px;
}

.preview-counter {
  text-align: center;
  margin-top: 16px;
  color: #666;
}

/* 自定义时间选择 */
.custom-time-form {
  padding: 16px 0;
}

.custom-time-form .form-item {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.custom-time-form .form-item label {
  width: 80px;
  font-weight: 500;
  color: #333;
}

/* 占用详情 */
.occupancy-detail {
  padding: 16px 0;
}

.detail-header h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
}

.detail-header p {
  margin: 0 0 16px 0;
  color: #666;
}

.conflicting-orders h5 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
}

.order-card {
  background: #fafafa;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.order-type {
  background: #1890ff;
  color: white;
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
}

.order-status {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 500;
}

.order-status.confirmed {
  background: #f6ffed;
  color: #52c41a;
}

.order-status.pending {
  background: #fff7e6;
  color: #fa8c16;
}

.order-details p {
  margin: 4px 0;
  font-size: 13px;
  color: #333;
}

/* 响应式设计 */
@media (max-width: 1400px) {
  .booking-detail {
    width: 420px;
  }
}

@media (max-width: 1200px) {
  .booking-detail {
    width: 380px;
  }
}

/* iPad 设备优化 */
@media (max-width: 1024px) {
  .booking-content {
    position: relative;
  }
  
  .booking-filters {
    width: 280px;
    padding: 20px;
  }
  
  .booking-items {
    flex: 1;
    padding: 20px;
  }
  
  .booking-detail {
    position: fixed;
    top: 65px;
    right: 0;
    width: 100%;
    max-width: 500px;
    height: calc(100vh - 65px);
    z-index: 1000;
    box-shadow: -4px 0 12px rgba(0, 0, 0, 0.15);
    border-left: 1px solid #e0e0e0;
  }
  
  .detail-close {
    background: #fafafa;
    border-bottom: 1px solid #e0e0e0;
    padding: 16px 20px 12px 0;
  }
  
  .close-btn {
    width: 36px;
    height: 36px;
    font-size: 18px;
  }
  
  .items-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
  }
  
  .item-card {
    min-height: 320px;
  }
  
  /* 步骤式预订在iPad上的优化 */
  .booking-step {
    margin-bottom: 16px;
  }
  
  .step-header {
    padding: 14px 20px;
  }
  
  .step-number {
    width: 26px;
    height: 26px;
    font-size: 13px;
  }
  
  .step-content {
    padding: 18px 20px;
  }
  
  .store-option {
    padding: 14px;
    margin-bottom: 12px;
  }
  
  .time-slots {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
  }
  
  .time-slot {
    padding: 12px 10px;
    min-height: 60px;
  }
  
  .booking-summary {
    padding: 18px;
    margin-bottom: 18px;
  }
  
  .summary-item {
    margin-bottom: 12px;
    font-size: 14px;
  }
  
  .summary-item.total-price {
    font-size: 18px;
    padding-top: 12px;
    margin-top: 12px;
  }
}

@media (max-width: 768px) {
  .booking-container {
    height: 100vh;
    overflow: hidden;
  }
  
  .booking-content {
    flex-direction: column;
    height: calc(100vh - 65px);
    overflow: hidden;
  }
  
  .booking-filters {
    width: 100%;
    padding: 16px;
    border-right: none;
    border-bottom: 1px solid #f0f0f0;
    flex-shrink: 0;
    max-height: 40vh;
    overflow-y: auto;
  }
  
  .booking-items {
    padding: 16px;
    flex: 1;
    overflow-y: auto;
  }
  
  .detail-overlay {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    animation: fadeIn 0.3s ease-out;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  .booking-detail {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    max-width: none;
    height: 100vh;
    z-index: 1001;
    box-shadow: none;
    border-left: none;
    overflow-y: auto;
  }
  
  .detail-close {
    padding: 16px 16px 12px 0;
  }
  
  .items-grid {
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 16px;
  }
  
  .item-card {
    min-height: 300px;
  }
  
  .item-cover {
    height: 160px;
  }
  
  /* 移动设备上的步骤优化 */
  .step-header {
    padding: 12px 16px;
  }
  
  .step-number {
    width: 24px;
    height: 24px;
    font-size: 12px;
  }
  
  .step-content {
    padding: 16px;
  }
  
  .time-slots {
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
    gap: 10px;
  }
  
  .time-slot {
    padding: 10px 6px;
    min-height: 50px;
    font-size: 12px;
  }
  
  .room-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .room-image {
    width: 100%;
    height: 100px;
    margin-left: 0;
  }
}

/* 触摸设备优化 */
@media (hover: none) {
  .item-card:hover {
    transform: none;
    box-shadow: none;
  }
  
  .item-card:active {
    transform: scale(0.98);
  }
  
  .time-slot:hover {
    background: inherit;
    border-color: inherit;
  }
  
  .time-slot:active {
    transform: scale(0.95);
  }
  
  .store-option:hover {
    border-color: #f0f0f0;
    background: white;
  }
  
  .store-option:active {
    background: #fafafa;
  }
}

/* 门店关闭提示 */
.store-closed-notice {
  margin-bottom: 16px;
}

/* 🆕 现代化时间选择样式 */
.modern-time-selection {
  width: 100%;
}

.modern-calendar-container {
  width: 100%;
  min-height: 400px;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

.date-range-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.custom-date-range {
  margin-left: 8px;
}

.date-navigation {
  display: flex;
  align-items: center;
  gap: 12px;
}

.current-week {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  min-width: 200px;
  text-align: center;
}

.view-controls {
  display: flex;
  gap: 8px;
}

.room-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.room-selector label {
  font-weight: 500;
  color: #333;
  white-space: nowrap;
}

.time-grid-container {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.time-grid {
  width: 100%;
  user-select: none;
}

.time-grid-header {
  display: grid;
  background: #fafafa;
  border-bottom: 2px solid #e8e8e8;
}

.time-label-column {
  padding: 12px 8px;
  border-right: 1px solid #e8e8e8;
}

.day-column {
  padding: 12px 8px;
  text-align: center;
  border-right: 1px solid #e8e8e8;
  transition: background-color 0.2s ease;
}

.day-column:last-child {
  border-right: none;
}

.day-column.today {
  background: #e6f7ff;
  color: #1890ff;
  font-weight: 600;
}

.day-column.past {
  background: #f5f5f5;
  color: #bfbfbf;
}

.day-name {
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 2px;
}

.day-date {
  font-size: 14px;
  font-weight: 600;
}

.time-grid-body {
  max-height: 400px;
  overflow-y: auto;
}

.time-row {
  display: grid;
  border-bottom: 1px solid #f0f0f0;
}

.time-row:last-child {
  border-bottom: none;
}

.time-label {
  padding: 8px;
  font-size: 12px;
  color: #666;
  text-align: center;
  border-right: 1px solid #f0f0f0;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
}

.time-cell {
  min-height: 30px;
  border-right: 1px solid #f0f0f0;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.time-cell:last-child {
  border-right: none;
}

.time-cell.available {
  background: #f6ffed;
  border-color: #d9f7be;
}

.time-cell.available:hover {
  background: #d9f7be;
  border-color: #95de64;
}

.time-cell.occupied {
  background: #fff2f0;
  border-color: #ffccc7;
  cursor: pointer;
}

.time-cell.occupied:hover {
  background: #fff1f0;
  border-color: #ff7875;
}

.time-cell.past {
  background: #f5f5f5;
  color: #bfbfbf;
  cursor: not-allowed;
}

.time-cell.selected {
  background: #1890ff !important;
  color: white;
  border: 2px solid #1890ff !important;
  box-shadow: 0 0 0 1px #1890ff;
}

.time-cell.start-selected {
  background: #fff7e6 !important;
  border: 2px solid #ffa940 !important;
  color: #fa8c16;
  position: relative;
  box-shadow: 0 0 0 1px #ffa940;
}

.time-cell.start-selected::after {
  content: '开始';
  position: absolute;
  top: 2px;
  left: 2px;
  font-size: 8px;
  background: #fa8c16;
  color: white;
  padding: 1px 3px;
  border-radius: 2px;
  line-height: 1;
  z-index: 1;
}

.occupancy-info {
  position: absolute;
  top: 2px;
  left: 2px;
  right: 2px;
  bottom: 2px;
  background: rgba(255, 77, 79, 0.1);
  border: 1px solid #ff4d4f;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #ff4d4f;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 1px 2px;
}

.selection-hint {
  display: flex;
  gap: 16px;
  padding: 12px 16px;
  background: #fafafa;
  border-top: 1px solid #f0f0f0;
  font-size: 12px;
}

.hint-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.color-indicator {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  border: 1px solid #d9d9d9;
}

.color-indicator.available {
  background: #f6ffed;
  border-color: #d9f7be;
}

.color-indicator.occupied {
  background: #fff2f0;
  border-color: #ffccc7;
}

.color-indicator.past {
  background: #f5f5f5;
  border-color: #d9d9d9;
}

.color-indicator.start-selected {
  background: #fff7e6;
  border-color: #ffa940;
}

.color-indicator.selected {
  background: #1890ff;
  border-color: #1890ff;
}

.no-rooms {
  padding: 40px 20px;
  text-align: center;
}



/* 响应式优化 */
@media (max-width: 1400px) {
  .booking-detail {
    width: 520px; /* 增加宽度以适应时间网格 */
  }
  
  .time-label-column,
  .time-label {
    padding: 8px 4px;
  }
  
  .day-column {
    padding: 8px 4px;
  }
}

@media (max-width: 1200px) {
  .booking-detail {
    width: 480px;
  }
  
  .day-name {
    font-size: 10px;
  }
  
  .day-date {
    font-size: 12px;
  }
  
  .time-label {
    font-size: 10px;
    padding: 6px 2px;
  }
  
  .time-cell {
    min-height: 25px;
  }
}

@media (max-width: 1024px) {
  .booking-detail {
    width: 100%;
    max-width: 600px;
  }
  
  .modern-calendar-container {
    overflow-x: auto;
  }
  
  .time-grid {
    min-width: 500px;
  }
}

@media (max-width: 768px) {
  .calendar-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .date-range-selector {
    justify-content: center;
  }
  
  .view-controls {
    justify-content: center;
  }
  
  .room-selector {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .room-selector .ant-select {
    width: 100% !important;
  }
  
  .time-grid {
    min-width: 400px;
  }
  
  .day-name {
    font-size: 9px;
  }
  
  .day-date {
    font-size: 11px;
  }
  
  .time-label {
    font-size: 9px;
    padding: 4px 1px;
  }
  
  .time-cell {
    min-height: 20px;
  }
  
  .occupancy-info {
    font-size: 8px;
  }
  
  .selection-hint {
    flex-wrap: wrap;
    gap: 8px;
    font-size: 11px;
  }
}

/* 收款确认内容 */
.payment-content {
  height: calc(100vh - 120px);
  overflow: hidden;
}
</style> 