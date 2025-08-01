<template>
  <div class="order-container">
    <div class="header-actions">
      <h2>订单管理</h2>
      <div class="actions">
        <a-button 
          type="primary" 
          @click="showCreateModal"
          v-if="hasManagePermission"
        >
          <PlusOutlined />
          新增订单
        </a-button>
        <a-button 
          type="default" 
          @click="showStatsModal"
        >
          <BarChartOutlined />
          统计报表
        </a-button>
        <a-button 
          type="default" 
          @click="exportOrders"
          :loading="exportLoading"
        >
          <DownloadOutlined />
          导出订单
        </a-button>
      </div>
    </div>

    <!-- 筛选区域 -->
    <a-card class="filter-card">
      <a-form layout="inline" :model="filterForm" @finish="handleFilter">
        <a-form-item label="门店">
          <a-select 
            v-model:value="filterForm.store_id" 
            placeholder="选择门店" 
            style="width: 150px"
            allow-clear
          >
            <a-select-option 
              v-for="store in storeList" 
              :key="store.id" 
              :value="store.id"
            >
              {{ store.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item label="订单类型">
          <a-select 
            v-model:value="filterForm.order_type" 
            placeholder="选择类型" 
            style="width: 120px"
            allow-clear
          >
            <a-select-option value="剧本杀">剧本杀</a-select-option>
            <a-select-option value="密室">密室</a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item label="订单状态">
          <a-select 
            v-model:value="filterForm.status" 
            placeholder="选择状态" 
            style="width: 120px"
            allow-clear
          >
            <a-select-option value="pending">待确认</a-select-option>
            <a-select-option value="confirmed">已确认</a-select-option>
            <a-select-option value="in_progress">进行中</a-select-option>
            <a-select-option value="completed">已完成</a-select-option>
            <a-select-option value="cancelled">已取消</a-select-option>
            <a-select-option value="refunded">已退款</a-select-option>
            <a-select-option value="partially_refunded">部分退款</a-select-option>
            <a-select-option value="no_show">未到场</a-select-option>
            <a-select-option value="rescheduled">已改期</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="支付状态">
          <a-select 
            v-model:value="filterForm.payment_status" 
            placeholder="支付状态" 
            style="width: 120px"
            allow-clear
          >
            <a-select-option value="FULL">已付全款</a-select-option>
            <a-select-option value="DP">已付定金</a-select-option>
            <a-select-option value="Not Yet">未付款</a-select-option>
            <a-select-option value="Free">免费</a-select-option>
          </a-select>
        </a-form-item>

        <!-- 🆕 多笔付款筛选 -->
        <a-form-item label="付款模式">
          <a-select 
            v-model:value="filterForm.payment_mode" 
            placeholder="付款模式" 
            style="width: 120px"
            allow-clear
          >
            <a-select-option value="single">单笔付款</a-select-option>
            <a-select-option value="multi">多笔付款</a-select-option>
          </a-select>
        </a-form-item>

        <!-- 🆕 折扣定价筛选 -->
        <a-form-item label="折扣定价">
          <a-select 
            v-model:value="filterForm.has_role_discount" 
            placeholder="折扣" 
            style="width: 120px"
            allow-clear
          >
            <a-select-option value="true">有折扣</a-select-option>
            <a-select-option value="false">无折扣</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="客户信息">
          <a-input 
            v-model:value="filterForm.customer_search"
            placeholder="姓名或电话"
            style="width: 150px"
            allow-clear
          />
        </a-form-item>

        <a-form-item label="日期范围">
          <a-range-picker
            v-model:value="filterForm.dateRange"
            format="YYYY-MM-DD"
            style="width: 220px"
          />
        </a-form-item>

        <a-form-item>
          <a-button type="primary" html-type="submit">
            <SearchOutlined />
            查询
          </a-button>
          <a-button @click="resetFilter" style="margin-left: 8px">
            重置
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 数据表格 -->
    <a-card>
      <a-table
        :columns="columns"
        :data-source="orderList"
        :loading="loading"
        row-key="id"
        :scroll="{ x: 1900 }"
        :pagination="{ 
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          showSizeChanger: true, 
          showQuickJumper: true,
          showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
          pageSizeOptions: ['10', '20', '50', '100']
        }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'order_info'">
            <div class="order-info">
              <div class="order-header">
                <span class="order-id">{{ record.id.substring(0, 8) }}</span>
                <a-tag :color="getOrderTypeColor(record.order_type)" size="small">
                  {{ record.order_type }}
                </a-tag>
              </div>
              <div class="order-details">
                <div class="order-date">{{ formatDate(record.order_date) }} {{ record.weekday }}</div>
                <div class="order-time">{{ record.start_time }} - {{ record.end_time }}</div>
                <div v-if="record.script_name" class="order-subject">剧本：{{ record.script_name }}</div>
                <div v-if="record.escape_room_name" class="order-subject">密室：{{ record.escape_room_name }}</div>
              </div>
            </div>
          </template>

          <template v-else-if="column.key === 'customer_info'">
            <div class="customer-info">
              <div class="customer-name">{{ record.customer_name }}</div>
              <div class="customer-phone">{{ record.customer_phone || '未提供' }}</div>
              <div class="player-count">
                {{ record.player_count }}人
                <a-tag v-if="record.internal_support" size="small" color="orange">内部补位</a-tag>
              </div>
            </div>
          </template>

          <template v-else-if="column.key === 'store_room_info'">
            <div class="store-room-info">
              <div class="store-name">{{ record.store_name || '未知门店' }}</div>
              <div class="room-name">{{ record.room_name || '未分配房间' }}</div>
              <div class="language-booking">
                <a-tag size="small" color="blue">{{ getDisplayLanguages(record) }}</a-tag>
                <a-tag size="small" color="green">{{ record.booking_type }}</a-tag>
              </div>
            </div>
          </template>

          <template v-else-if="column.key === 'payment_proof'">
            <div class="payment-proof">
              <div v-if="record.images && record.images.length > 0" class="proof-images">
                <div class="image-count">{{ record.images.length }}张凭证</div>
                <div class="proof-thumbnails">
                  <img 
                    v-for="(image, index) in record.images.slice(0, 3)" 
                    :key="index"
                    :src="image.image_url" 
                    :alt="image.image_name"
                    class="proof-thumbnail"
                    @click="previewPaymentProof(record.images, index)"
                  />
                  <div v-if="record.images.length > 3" class="more-indicator">
                    +{{ record.images.length - 3 }}
                  </div>
                </div>
              </div>
              <div v-else class="no-proof">
                <span>无凭证</span>
              </div>
            </div>
          </template>

          <template v-else-if="column.key === 'game_host'">
            <div class="game-host">
              <div v-if="record.game_host_name" class="host-name">
                {{ record.game_host_name }}
              </div>
              <div v-if="record.escape_room_npc_roles && record.escape_room_npc_roles.length > 0" class="npc-info">
                <a-tag size="small" color="purple">{{ record.escape_room_npc_roles.length }}个NPC</a-tag>
              </div>
              <div v-if="record.escape_room_npc_roles && record.escape_room_npc_roles.length > 0" class="npc-roles-compact">
                <div class="npc-roles-text">{{ record.escape_room_npc_roles.slice(0, 2).join(', ') }}{{ record.escape_room_npc_roles.length > 2 ? '...' : '' }}</div>
              </div>
              <div v-if="!record.game_host_name && (!record.escape_room_npc_roles || record.escape_room_npc_roles.length === 0)" class="no-host">
                <span>未分配</span>
              </div>
            </div>
          </template>

          <template v-else-if="column.key === 'pic_info'">
            <div class="pic-info">
              <div v-if="record.pic_name" class="pic-name">
                {{ record.pic_name }}
              </div>
              <div v-if="record.pic_payment" class="pic-payment">
                <a-tag size="small" color="orange">{{ record.pic_payment }}</a-tag>
              </div>
              <div v-if="!record.pic_name && !record.pic_payment" class="no-pic">
                <span>未分配</span>
              </div>
            </div>
          </template>

          <template v-else-if="column.key === 'payment_info'">
            <div class="payment-info">
              <div class="payment-amount">
                <span v-if="record.is_free" class="free-order">免费</span>
                <span v-else class="amount">Rp {{ formatPrice(record.total_amount) }}</span>
              </div>
              
              <!-- 🆕 多笔付款信息显示 -->
              <div v-if="record.enable_multi_payment" class="multi-payment-info">
                <a-tag color="cyan" size="small">多笔付款</a-tag>
                <div class="payment-progress">
                  <span class="progress-text">{{ record.payment_split_count || 1 }}笔</span>
                  <span v-if="record.payment_completion_percentage !== undefined" class="completion-rate">
                    {{ record.payment_completion_percentage }}%
                  </span>
                </div>
              </div>
              
              <!-- 🆕 折扣定价信息显示 -->
              <div v-if="record.total_players_with_discount > 0" class="role-discount-info">
                <a-tag color="orange" size="small">
                  {{ record.total_players_with_discount }}人享折扣
                </a-tag>
                <div v-if="record.total_discount_percentage > 0" class="discount-rate">
                  平均{{ record.total_discount_percentage }}%
                </div>
              </div>
              
              <div v-if="!record.is_free && record.payment_status === 'DP'" class="payment-details">
                <div class="prepaid-info">预付: Rp {{ formatPrice(record.prepaid_amount || 0) }}</div>
                <div class="remaining-info">剩余: Rp {{ formatPrice(record.remaining_amount || 0) }}</div>
              </div>
              <a-tag :color="getPaymentStatusColor(record.payment_status)" size="small">
                {{ getPaymentStatusText(record.payment_status) }}
              </a-tag>
            </div>
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag :color="getStatusColor(record.status)">
              {{ getStatusText(record.status) }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'create_info'">
            <div class="create-info">
              <div class="create-time">{{ formatDateTime(record.created_at) }}</div>
              <div class="create-by">{{ record.created_by_name || '系统' }}</div>
              <div v-if="record.updated_at && record.updated_at !== record.created_at" class="update-info">
                <small>更新: {{ formatDateTime(record.updated_at) }}</small>
              </div>
            </div>
          </template>

          <template v-else-if="column.key === 'action'">
            <div class="action-buttons">
              <a-button 
                type="link" 
                size="small" 
                @click="viewOrder(record)"
              >
                查看
              </a-button>
              
              <!-- 🆕 支付明细按钮 -->
              <a-button 
                type="link" 
                size="small" 
                @click="viewPaymentDetails(record)"
                v-if="record.enable_multi_payment"
              >
                支付明细
              </a-button>
              
              <a-button 
                type="link" 
                size="small" 
                @click="editOrder(record)"
                v-if="hasManagePermission"
              >
                编辑
              </a-button>
              
              <!-- 🆕 状态管理按钮 -->
              <a-dropdown v-if="hasManagePermission">
                <a-button type="link" size="small">
                  状态 <DownOutlined />
                </a-button>
                <template #overlay>
                  <a-menu @click="({ key }) => handleStatusChange(record, key)">
                    <a-menu-item key="confirmed" v-if="record.status === 'pending'">
                      <CheckCircleOutlined /> 确认订单
                    </a-menu-item>
                    <a-menu-item key="in_progress" v-if="record.status === 'confirmed'">
                      <PlayCircleOutlined /> 开始游戏
                    </a-menu-item>
                    <a-menu-item key="completed" v-if="record.status === 'in_progress'">
                      <CheckOutlined /> 完成游戏
                    </a-menu-item>
                    <a-menu-divider v-if="['pending', 'confirmed'].includes(record.status)" />
                    <a-menu-item key="cancelled" v-if="['pending', 'confirmed'].includes(record.status)" class="danger-item">
                      <CloseCircleOutlined /> 取消订单
                    </a-menu-item>
                    <a-menu-item key="refunded" v-if="['completed', 'cancelled'].includes(record.status)" class="danger-item">
                      <DollarOutlined /> 申请退款
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
              
              <a-button 
                type="link" 
                size="small" 
                @click="deleteOrder(record)"
                danger
                v-if="hasManagePermission"
              >
                删除
              </a-button>
            </div>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 创建/编辑订单模态框 -->
    <OrderFormModal 
      v-model:visible="formModalVisible"
      :form-data="formData"
      :is-edit="isEdit"
      @submit="handleFormSubmit"
    />

    <!-- 订单详情模态框 -->
    <a-modal
      v-model:open="detailModalVisible"
      title="订单详情"
      width="1000px"
      :footer="null"
    >
      <div v-if="selectedOrder" class="order-detail">
        <a-descriptions :column="2" bordered>
          <!-- 基础信息 -->
          <a-descriptions-item label="订单编号" :span="2">{{ selectedOrder.id }}</a-descriptions-item>
          <a-descriptions-item label="订单类型">{{ selectedOrder.order_type }}</a-descriptions-item>
          <a-descriptions-item label="订单状态">
            <a-tag :color="getStatusColor(selectedOrder.status)">
              {{ getStatusText(selectedOrder.status) }}
            </a-tag>
          </a-descriptions-item>
          
          <!-- 客户信息 -->
          <a-descriptions-item label="客户姓名">{{ selectedOrder.customer_name }}</a-descriptions-item>
          <a-descriptions-item label="客户电话">{{ selectedOrder.customer_phone || '未提供' }}</a-descriptions-item>
          <a-descriptions-item label="玩家人数">{{ selectedOrder.player_count }}人</a-descriptions-item>
          <a-descriptions-item label="支持语言">{{ getDisplayLanguages(selectedOrder) }}</a-descriptions-item>
          
          <!-- 门店房间信息 -->
          <a-descriptions-item label="门店">{{ selectedOrder.store_name }}</a-descriptions-item>
          <a-descriptions-item label="房间">{{ selectedOrder.room_name }}</a-descriptions-item>
          
          <!-- 时间信息 -->
          <a-descriptions-item label="订单日期">{{ formatDate(selectedOrder.order_date) }} {{ selectedOrder.weekday }}</a-descriptions-item>
          <a-descriptions-item label="时间段">{{ selectedOrder.start_time }} - {{ selectedOrder.end_time }}</a-descriptions-item>
          
          <!-- 项目信息 -->
          <a-descriptions-item v-if="selectedOrder.script_name" label="剧本" :span="2">{{ selectedOrder.script_name }}</a-descriptions-item>
          <a-descriptions-item v-if="selectedOrder.escape_room_name" label="密室主题" :span="2">{{ selectedOrder.escape_room_name }}</a-descriptions-item>
          
          <!-- 密室专用字段 -->
          <template v-if="selectedOrder.order_type === '密室'">
            <a-descriptions-item label="拼团">{{ selectedOrder.is_group_booking ? '是' : '否' }}</a-descriptions-item>
            <a-descriptions-item label="包含拍照">{{ selectedOrder.include_photos ? '是' : '否' }}</a-descriptions-item>
            <a-descriptions-item label="包含监控" :span="2">{{ selectedOrder.include_cctv ? '是' : '否' }}</a-descriptions-item>
          </template>
          
          <!-- 工作人员信息 -->
          <template v-if="selectedOrder.game_host_name || selectedOrder.npc_name || selectedOrder.pic_name || selectedOrder.pic_payment || (selectedOrder.escape_room_npc_roles && selectedOrder.escape_room_npc_roles.length > 0)">
            <a-descriptions-item v-if="selectedOrder.game_host_name" label="Game Host">{{ selectedOrder.game_host_name }}</a-descriptions-item>
            <a-descriptions-item v-if="selectedOrder.npc_name" label="NPC">{{ selectedOrder.npc_name }}</a-descriptions-item>
            <a-descriptions-item v-if="selectedOrder.escape_room_npc_roles && selectedOrder.escape_room_npc_roles.length > 0" label="NPC数量">{{ selectedOrder.escape_room_npc_roles.length }}个</a-descriptions-item>
            <a-descriptions-item v-if="selectedOrder.escape_room_npc_roles && selectedOrder.escape_room_npc_roles.length > 0" label="NPC角色" :span="2">
              <div class="npc-roles">
                <a-tag 
                  v-for="role in selectedOrder.escape_room_npc_roles" 
                  :key="role"
                  color="purple"
                  size="small"
                  style="margin-right: 4px; margin-bottom: 4px;"
                >
                  {{ role }}
                </a-tag>
              </div>
            </a-descriptions-item>
            <a-descriptions-item v-if="selectedOrder.pic_name" label="PIC负责人">{{ selectedOrder.pic_name }}</a-descriptions-item>
            <a-descriptions-item v-if="selectedOrder.pic_payment" label="PIC Payment" :span="selectedOrder.pic_name ? 1 : 2">{{ selectedOrder.pic_payment }}</a-descriptions-item>
          </template>
          
          <!-- 预订信息 -->
          <a-descriptions-item label="预订类型">{{ selectedOrder.booking_type }}</a-descriptions-item>
          <a-descriptions-item label="内部补位">{{ selectedOrder.internal_support ? '是' : '否' }}</a-descriptions-item>
          
          <!-- 支付信息 -->
          <a-descriptions-item label="支付状态">
            <a-tag :color="getPaymentStatusColor(selectedOrder.payment_status)">
              {{ getPaymentStatusText(selectedOrder.payment_status) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="单价" v-if="!selectedOrder.is_free && selectedOrder.unit_price">
            Rp {{ formatPrice(selectedOrder.unit_price) }}
          </a-descriptions-item>
          <a-descriptions-item label="订单金额">
            <span v-if="selectedOrder.is_free" class="free-order">免费</span>
            <span v-else class="amount">Rp {{ formatPrice(selectedOrder.total_amount) }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="预付金额" v-if="!selectedOrder.is_free && selectedOrder.prepaid_amount > 0">
            Rp {{ formatPrice(selectedOrder.prepaid_amount) }}
          </a-descriptions-item>
          <a-descriptions-item label="剩余应付金额" v-if="!selectedOrder.is_free && selectedOrder.remaining_amount > 0">
            Rp {{ formatPrice(selectedOrder.remaining_amount) }}
          </a-descriptions-item>
          <a-descriptions-item v-if="selectedOrder.payment_method" label="付款方式" :span="selectedOrder.payment_date ? 1 : 2">{{ selectedOrder.payment_method }}</a-descriptions-item>
          <a-descriptions-item v-if="selectedOrder.payment_date" label="付款日期">{{ formatDate(selectedOrder.payment_date) }}</a-descriptions-item>
          
          <!-- 🆕 折扣信息 -->
          <a-descriptions-item 
            v-if="selectedOrder.selected_role_templates && selectedOrder.selected_role_templates.length > 0" 
            label="折扣信息" 
            :span="2"
          >
            <div class="role-templates-display">
              <a-tag 
                v-for="(template, index) in selectedOrder.selected_role_templates" 
                :key="index"
                color="blue"
                class="role-template-tag"
              >
                {{ template.role_name }} x{{ template.player_count }} 
                <span class="discount-info">{{ template.discount_info }}</span>
              </a-tag>
            </div>
          </a-descriptions-item>
          
          <!-- 🆕 多笔付款统计信息 -->
          <a-descriptions-item 
            v-if="selectedOrder.enable_multi_payment" 
            label="多笔付款统计" 
            :span="2"
          >
            <div class="multi-payment-stats">
              <a-row :gutter="16">
                <a-col :span="6">
                  <a-statistic title="付款笔数" :value="selectedOrder.payment_split_count || 1" />
                </a-col>
                <a-col :span="6">
                  <a-statistic title="完成度" :value="selectedOrder.payment_completion_percentage || 0" suffix="%" />
                </a-col>
                <a-col :span="6">
                  <a-statistic title="已收金额" :value="selectedOrder.total_paid_amount || 0" :formatter="(value) => `Rp ${formatPrice(value)}`" />
                </a-col>
                <a-col :span="6">
                  <a-statistic title="待收金额" :value="selectedOrder.total_pending_amount || 0" :formatter="(value) => `Rp ${formatPrice(value)}`" />
                </a-col>
              </a-row>
            </div>
          </a-descriptions-item>
          
          <!-- 🆕 价格明细统计 -->
          <a-descriptions-item 
            v-if="selectedOrder.total_original_amount && selectedOrder.total_original_amount > 0" 
            label="价格明细" 
            :span="2"
          >
            <div class="price-breakdown">
              <a-row :gutter="16">
                <a-col :span="8">
                  <div class="price-item">
                    <span class="price-label">原价总计:</span>
                    <span class="price-value">Rp {{ formatPrice(selectedOrder.total_original_amount) }}</span>
                  </div>
                </a-col>
                <a-col :span="8" v-if="selectedOrder.total_discount_amount > 0">
                  <div class="price-item discount">
                    <span class="price-label">折扣总计:</span>
                    <span class="price-value">-Rp {{ formatPrice(selectedOrder.total_discount_amount) }}</span>
                  </div>
                </a-col>
                <a-col :span="8">
                  <div class="price-item final">
                    <span class="price-label">应收总计:</span>
                    <span class="price-value">Rp {{ formatPrice(selectedOrder.total_final_amount || selectedOrder.total_amount) }}</span>
                  </div>
                </a-col>
              </a-row>
              <div v-if="selectedOrder.total_players_with_discount > 0 || selectedOrder.total_players_without_discount > 0" class="player-stats">
                <a-tag color="orange">{{ selectedOrder.total_players_with_discount || 0 }}人享折扣</a-tag>
                <a-tag color="blue">{{ selectedOrder.total_players_without_discount || 0 }}人标准价</a-tag>
                <a-tag v-if="selectedOrder.total_discount_percentage > 0" color="green">平均折扣{{ selectedOrder.total_discount_percentage }}%</a-tag>
              </div>
            </div>
          </a-descriptions-item>
          
          <!-- 优惠信息 -->
          <template v-if="selectedOrder.promo_code || selectedOrder.promo_quantity || selectedOrder.promo_discount">
            <a-descriptions-item v-if="selectedOrder.promo_code" label="优惠码" :span="selectedOrder.promo_quantity ? 1 : 2">{{ selectedOrder.promo_code }}</a-descriptions-item>
            <a-descriptions-item v-if="selectedOrder.promo_quantity" label="优惠数量">{{ selectedOrder.promo_quantity }}</a-descriptions-item>
            <a-descriptions-item v-if="selectedOrder.promo_discount" label="优惠折扣" :span="2">Rp {{ formatPrice(selectedOrder.promo_discount) }}</a-descriptions-item>
          </template>
          
          <!-- 备注 -->
          <a-descriptions-item v-if="selectedOrder.notes" label="备注" :span="2">{{ selectedOrder.notes }}</a-descriptions-item>
          
          <!-- 创建更新信息 -->
          <a-descriptions-item label="创建时间">{{ formatDateTime(selectedOrder.created_at) }}</a-descriptions-item>
          <a-descriptions-item label="创建人">{{ selectedOrder.created_by_name || '系统' }}</a-descriptions-item>
          <a-descriptions-item v-if="selectedOrder.updated_at && selectedOrder.updated_at !== selectedOrder.created_at" label="更新时间" :span="selectedOrder.updated_by_name ? 1 : 2">{{ formatDateTime(selectedOrder.updated_at) }}</a-descriptions-item>
          <a-descriptions-item v-if="selectedOrder.updated_by_name" label="更新人">{{ selectedOrder.updated_by_name }}</a-descriptions-item>
          
          <!-- 图片信息 -->
          <a-descriptions-item v-if="selectedOrder.images && selectedOrder.images.length > 0" label="付款凭证" :span="2">
            <div class="order-images">
              <img 
                v-for="(image, index) in selectedOrder.images" 
                :key="index"
                :src="image.image_url" 
                :alt="image.image_name"
                class="order-image"
                @click="previewImage(image.image_url)"
              />
            </div>
          </a-descriptions-item>
        </a-descriptions>
      </div>
    </a-modal>

    <!-- 图片预览模态框 -->
    <a-modal
      v-model:open="previewVisible"
      :footer="null"
      width="80%"
      :style="{ maxWidth: '800px' }"
    >
      <img :src="previewImageUrl" style="width: 100%" />
    </a-modal>

    <!-- 付款凭证预览模态框 -->
    <a-modal
      v-model:open="proofPreviewVisible"
      title="付款凭证"
      :footer="null"
      width="90%"
      :style="{ maxWidth: '1000px' }"
    >
      <div v-if="previewProofImages.length > 0" class="proof-preview-container">
        <div class="proof-preview-main">
          <img 
            :src="previewProofImages[currentProofIndex].image_url" 
            :alt="previewProofImages[currentProofIndex].image_name"
            class="proof-preview-image"
          />
        </div>
        <div v-if="previewProofImages.length > 1" class="proof-preview-nav">
          <a-button 
            @click="prevProofImage" 
            :disabled="currentProofIndex === 0"
            type="text"
          >
            上一张
          </a-button>
          <span class="proof-nav-info">
            {{ currentProofIndex + 1 }} / {{ previewProofImages.length }}
          </span>
          <a-button 
            @click="nextProofImage" 
            :disabled="currentProofIndex === previewProofImages.length - 1"
            type="text"
          >
            下一张
          </a-button>
        </div>
        <div v-if="previewProofImages.length > 1" class="proof-preview-thumbnails">
          <img 
            v-for="(image, index) in previewProofImages" 
            :key="index"
            :src="image.image_url" 
            :alt="image.image_name"
            class="proof-preview-thumb"
            :class="{ active: index === currentProofIndex }"
            @click="currentProofIndex = index"
          />
        </div>
      </div>
    </a-modal>

    <!-- 🆕 支付明细模态框 -->
    <a-modal
      v-model:open="paymentDetailsModalVisible"
      title="支付明细"
      width="1200px"
      :footer="null"
    >
      <div v-if="paymentDetailsData.order" class="payment-details-container">
        <!-- 订单基本信息 -->
        <div class="payment-header">
          <h3>订单信息</h3>
          <a-descriptions :column="3" size="small" bordered>
            <a-descriptions-item label="订单编号">{{ paymentDetailsData.order.id.substring(0, 8) }}</a-descriptions-item>
            <a-descriptions-item label="客户姓名">{{ paymentDetailsData.order.customer_name }}</a-descriptions-item>
            <a-descriptions-item label="玩家人数">{{ paymentDetailsData.order.player_count }}人</a-descriptions-item>
            <a-descriptions-item label="订单日期">{{ formatDate(paymentDetailsData.order.order_date) }}</a-descriptions-item>
            <a-descriptions-item label="时间段">{{ paymentDetailsData.order.start_time }} - {{ paymentDetailsData.order.end_time }}</a-descriptions-item>
            <a-descriptions-item label="总金额">Rp {{ formatPrice(paymentDetailsData.order.total_amount) }}</a-descriptions-item>
          </a-descriptions>
        </div>

        <!-- 玩家明细 -->
        <div class="payment-section">
          <h3>玩家明细</h3>
          <a-table
            :data-source="paymentDetailsData.players"
            :columns="playerColumns"
            :pagination="false"
            size="small"
            row-key="id"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'role_info'">
                <div>
                  <div class="role-name">{{ record.selected_role_name }}</div>
                  <div v-if="record.discount_type !== 'none'" class="discount-info">
                    <a-tag color="orange" size="small">
                      {{ record.discount_type === 'percentage' ? `${record.discount_percentage}%折扣` : 
                          record.discount_type === 'fixed' ? `减免Rp ${formatPrice(record.discount_fixed_amount)}` :
                          record.discount_type === 'mixed' ? `混合折扣 ${record.discount_percentage}%` :
                          '免费' }}
                    </a-tag>
                  </div>
                </div>
              </template>
              <template v-else-if="column.key === 'amount_info'">
                <div class="amount-details">
                  <div class="original-amount">原价: Rp {{ formatPrice(record.original_amount) }}</div>
                  <div v-if="record.discount_amount > 0" class="discount-amount">折扣: -Rp {{ formatPrice(record.discount_amount) }}</div>
                  <div class="final-amount">应付: Rp {{ formatPrice(record.final_amount) }}</div>
                </div>
              </template>
              <template v-else-if="column.key === 'payment_status'">
                <a-tag :color="record.payment_status === 'paid' ? 'green' : record.payment_status === 'pending' ? 'orange' : 'red'">
                  {{ record.payment_status === 'paid' ? '已付款' : record.payment_status === 'pending' ? '待付款' : '已取消' }}
                </a-tag>
              </template>
            </template>
          </a-table>
        </div>

        <!-- 支付记录 -->
        <div class="payment-section">
          <h3>支付记录</h3>
          <a-table
            :data-source="paymentDetailsData.payments"
            :columns="paymentColumns"
            :pagination="false"
            size="small"
            row-key="id"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'payment_info'">
                <div>
                  <div class="payer-name">{{ record.payer_name }}</div>
                  <div class="payment-amount">Rp {{ formatPrice(record.payment_amount) }}</div>
                </div>
              </template>
              <template v-else-if="column.key === 'covers_info'">
                <div>
                  <div class="covers-count">覆盖 {{ record.covers_player_count }} 名玩家</div>
                  <div class="covers-roles">
                    <a-tag v-for="role in record.payment_for_roles" :key="role" size="small">{{ role }}</a-tag>
                  </div>
                </div>
              </template>
              <template v-else-if="column.key === 'status'">
                <a-tag :color="record.payment_status === 'confirmed' ? 'green' : record.payment_status === 'pending' ? 'orange' : 'red'">
                  {{ record.payment_status === 'confirmed' ? '已确认' : record.payment_status === 'pending' ? '待确认' : '已取消' }}
                </a-tag>
              </template>
              <template v-else-if="column.key === 'date'">
                {{ formatDateTime(record.payment_date || record.created_at) }}
              </template>
            </template>
          </a-table>
        </div>

        <!-- 汇总信息 -->
        <div v-if="paymentDetailsData.summary" class="payment-summary">
          <h3>汇总信息</h3>
          <a-row :gutter="16">
            <a-col :span="6">
              <a-statistic
                title="原价总计"
                :value="paymentDetailsData.summary.total_original_amount || 0"
                :formatter="(value) => `Rp ${formatPrice(value)}`"
              />
            </a-col>
            <a-col :span="6">
              <a-statistic
                title="折扣总计"
                :value="paymentDetailsData.summary.total_discount_amount || 0"
                :formatter="(value) => `-Rp ${formatPrice(value)}`"
                :value-style="{ color: '#f50' }"
              />
            </a-col>
            <a-col :span="6">
              <a-statistic
                title="应收总计"
                :value="paymentDetailsData.summary.total_final_amount || 0"
                :formatter="(value) => `Rp ${formatPrice(value)}`"
                :value-style="{ color: '#52c41a' }"
              />
            </a-col>
            <a-col :span="6">
              <a-statistic
                title="已收金额"
                :value="paymentDetailsData.summary.total_paid_amount || 0"
                :formatter="(value) => `Rp ${formatPrice(value)}`"
                :value-style="{ color: '#1890ff' }"
              />
            </a-col>
          </a-row>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { useAuthStore } from '@/stores/auth'
import { orderAPI } from '@/api/order'
import { storeAPI } from '@/api/store'
import OrderFormModal from '@/components/order/OrderFormModal.vue'
import dayjs from 'dayjs'
import {
  PlusOutlined,
  SearchOutlined,
  BarChartOutlined,
  DownloadOutlined,
  DownOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  CheckOutlined,
  CloseCircleOutlined,
  DollarOutlined
} from '@ant-design/icons-vue'

const authStore = useAuthStore()

// 权限检查
const hasManagePermission = computed(() => authStore.hasPermission('order.manage'))

// 响应式数据
const loading = ref(false)
const exportLoading = ref(false)
const orderList = ref([])
const storeList = ref([])
const selectedOrder = ref(null)

// 筛选表单
const filterForm = reactive({
  store_id: null,
  order_type: null,
  status: null,
  payment_status: null,
  customer_search: null,
  // 🆕 新增筛选字段
  payment_mode: null, // single/multi
  has_role_discount: null, // true/false
  dateRange: [dayjs().startOf('day'), dayjs().endOf('day')] // 默认当日
})

// 分页参数
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0
})

// 模态框显示状态
const detailModalVisible = ref(false)
const formModalVisible = ref(false)
const paymentDetailsModalVisible = ref(false) // 🆕 支付明细模态框

// 表单数据
const formData = ref({})
const isEdit = ref(false)

// 🆕 支付明细数据
const paymentDetailsData = ref({
  order: null,
  players: [],
  payments: []
})

// 表格列定义
const columns = [
  {
    title: '订单信息',
    key: 'order_info',
    width: 280,
    fixed: 'left'
  },
  {
    title: '客户信息',
    key: 'customer_info',
    width: 150
  },
  {
    title: '门店房间',
    key: 'store_room_info',
    width: 180
  },
  {
    title: '付款凭证',
    key: 'payment_proof',
    width: 120
  },
  {
    title: 'Game Host',
    key: 'game_host',
    width: 100
  },
  {
    title: 'PIC负责人',
    key: 'pic_info',
    width: 100
  },
  {
    title: '支付信息',
    key: 'payment_info',
    width: 150
  },
  {
    title: '状态',
    key: 'status',
    width: 80
  },
  {
    title: '创建信息',
    key: 'create_info',
    width: 150
  },
  {
    title: '操作',
    key: 'action',
    width: 180,
    fixed: 'right'
  }
]

// 🆕 玩家明细表格列定义
const playerColumns = [
  {
    title: '玩家序号',
    dataIndex: 'player_order',
    width: 80
  },
  {
    title: '玩家姓名',
    dataIndex: 'player_name',
    width: 120
  },
  {
    title: '角色信息',
    key: 'role_info',
    width: 150
  },
  {
    title: '金额详情',
    key: 'amount_info',
    width: 200
  },
  {
    title: '支付状态',
    key: 'payment_status',
    width: 100
  },
  {
    title: '备注',
    dataIndex: 'notes',
    ellipsis: true
  }
]

// 🆕 支付记录表格列定义
const paymentColumns = [
  {
    title: '支付信息',
    key: 'payment_info',
    width: 180
  },
  {
    title: '支付方式',
    dataIndex: 'payment_method',
    width: 120
  },
  {
    title: '覆盖信息',
    key: 'covers_info',
    width: 200
  },
  {
    title: '状态',
    key: 'status',
    width: 100
  },
  {
    title: '支付时间',
    key: 'date',
    width: 150
  },
  {
    title: '备注',
    dataIndex: 'notes',
    ellipsis: true
  }
]

// 生命周期
onMounted(() => {
  loadOrderList()
  loadStoreList()
})

// 加载订单列表
const loadOrderList = async () => {
  try {
    loading.value = true
    const params = buildFilterParams()
    params.page = pagination.current
    params.pageSize = pagination.pageSize
    
    const response = await orderAPI.getList(params)
    if (response.data) {
      // 兼容不同的返回格式
      if (response.data.list) {
        // 分页格式
        orderList.value = response.data.list
        pagination.total = response.data.total || 0
        pagination.current = response.data.page || pagination.current
        pagination.pageSize = response.data.pageSize || pagination.pageSize
      } else {
        // 直接数组格式（向后兼容）
        orderList.value = response.data || []
        pagination.total = response.data.length || 0
      }
    }
  } catch (error) {
    console.error('加载订单列表失败:', error)
    message.error('加载订单列表失败')
  } finally {
    loading.value = false
  }
}

// 加载门店列表
const loadStoreList = async () => {
  try {
    const response = await orderAPI.getAvailableStores()
    storeList.value = response.data || []
  } catch (error) {
    console.error('加载门店列表失败:', error)
  }
}

// 构建筛选参数
const buildFilterParams = () => {
  const params = {}
  
  if (filterForm.store_id) params.store_id = filterForm.store_id
  if (filterForm.order_type) params.order_type = filterForm.order_type
  if (filterForm.status) params.status = filterForm.status
  if (filterForm.payment_status) params.payment_status = filterForm.payment_status
  if (filterForm.customer_search) {
    if (/^\d+$/.test(filterForm.customer_search)) {
      params.customer_phone = filterForm.customer_search
    } else {
      params.customer_name = filterForm.customer_search
    }
  }
  
  // 🆕 新增筛选参数
  if (filterForm.payment_mode) {
    if (filterForm.payment_mode === 'multi') {
      params.enable_multi_payment = true
    } else if (filterForm.payment_mode === 'single') {
      params.enable_multi_payment = false
    }
  }
  
  if (filterForm.has_role_discount) {
    if (filterForm.has_role_discount === 'true') {
      params.has_role_discount = true
    } else if (filterForm.has_role_discount === 'false') {
      params.has_role_discount = false
    }
  }
  
  // 🆕 日期范围筛选参数
  if (filterForm.dateRange && filterForm.dateRange.length === 2) {
    params.start_date = filterForm.dateRange[0]?.format('YYYY-MM-DD')
    params.end_date = filterForm.dateRange[1]?.format('YYYY-MM-DD')
  }
  
  return params
}

// 处理筛选
const handleFilter = () => {
  pagination.current = 1 // 筛选时重置到第一页
  loadOrderList()
}

// 重置筛选
const resetFilter = () => {
  Object.keys(filterForm).forEach(key => {
    if (key === 'dateRange') {
      filterForm[key] = [dayjs().startOf('day'), dayjs().endOf('day')] // 重置为当日
    } else {
      filterForm[key] = null
    }
  })
  pagination.current = 1 // 重置时重置到第一页
  loadOrderList()
}

// 处理表格变化（分页、排序、筛选）
const handleTableChange = (paginationInfo, filters, sorter) => {
  pagination.current = paginationInfo.current
  pagination.pageSize = paginationInfo.pageSize
  loadOrderList()
}

// 显示创建模态框
const showCreateModal = () => {
  isEdit.value = false
  formData.value = {}
  formModalVisible.value = true
}

// 显示统计模态框
const showStatsModal = () => {
  message.info('统计报表功能开发中...')
}

// 导出订单
const exportOrders = async () => {
  try {
    exportLoading.value = true
    const params = buildFilterParams()
    
    const response = await orderAPI.exportOrders(params)
    
    // 创建下载链接
    const blob = new Blob([response], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    
    // 生成文件名
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-')
    link.download = `订单列表_${dateStr}_${timeStr}.xlsx`
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    
    message.success('订单导出成功')
  } catch (error) {
    console.error('导出订单失败:', error)
    message.error('导出订单失败')
  } finally {
    exportLoading.value = false
  }
}

// 查看订单
const viewOrder = async (record) => {
  try {
    loading.value = true
    
    // 获取订单支付汇总信息以获取准确的价格明细
    const response = await orderAPI.getOrderPaymentSummary(record.id)
    
    // 合并订单基本信息和准确的价格明细统计
    const playerSummary = response.data?.player_summary || {}
    selectedOrder.value = {
      ...record,
      // 覆盖价格明细相关字段，确保显示准确的计算结果
      total_original_amount: playerSummary.total_original_amount || record.total_original_amount,
      total_discount_amount: playerSummary.total_discount_amount || record.total_discount_amount,
      total_final_amount: playerSummary.total_player_amount || record.total_final_amount,
      total_players_with_discount: playerSummary.players_with_discount || record.total_players_with_discount,
      total_players_without_discount: playerSummary.players_without_discount || record.total_players_without_discount,
      total_discount_percentage: playerSummary.discount_percentage ? 
        Math.round(playerSummary.discount_percentage * 100) / 100 : record.total_discount_percentage
    }
    
    detailModalVisible.value = true
  } catch (error) {
    console.error('获取订单详情失败:', error)
    // 降级处理：使用原始数据
    selectedOrder.value = record
    detailModalVisible.value = true
    message.warning('部分详情信息可能不准确，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 🆕 查看支付明细
const viewPaymentDetails = async (record) => {
  try {
    loading.value = true
    
    // 获取订单支付汇总信息
    const response = await orderAPI.getOrderPaymentSummary(record.id)
    
    paymentDetailsData.value = {
      order: record,
      players: response.data.players || [],
      payments: response.data.payments || [],
      summary: response.data.summary || {}
    }
    
    paymentDetailsModalVisible.value = true
  } catch (error) {
    console.error('获取支付明细失败:', error)
    message.error('获取支付明细失败')
  } finally {
    loading.value = false
  }
}

// 编辑订单
const editOrder = async (record) => {
  try {
    isEdit.value = true
    formData.value = { ...record }
    formModalVisible.value = true
  } catch (error) {
    console.error('编辑订单失败:', error)
    message.error('编辑订单失败')
  }
}

// 删除订单
const deleteOrder = (record) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除订单 ${record.id.substring(0, 8)} 吗？`,
    okText: '确定',
    cancelText: '取消',
    onOk: async () => {
      try {
        await orderAPI.delete(record.id)
        message.success('删除成功')
        loadOrderList()
      } catch (error) {
        console.error('删除失败:', error)
        message.error('删除失败')
      }
    }
  })
}

// 处理表单提交
const handleFormSubmit = async (formData) => {
  try {
    if (isEdit.value) {
      await orderAPI.update(formData.id, formData)
      message.success('更新成功')
    } else {
      await orderAPI.create(formData)
      message.success('创建成功')
    }
    formModalVisible.value = false
    loadOrderList()
  } catch (error) {
    console.error('操作失败:', error)
    message.error('操作失败')
  }
}

// 🆕 处理状态变更
const handleStatusChange = async (record, newStatus) => {
  try {
    let confirmMessage = ''
    let successMessage = ''
    
    switch (newStatus) {
      case 'confirmed':
        confirmMessage = '确认此订单？'
        successMessage = '订单已确认'
        break
      case 'in_progress':
        confirmMessage = '开始游戏？'
        successMessage = '游戏已开始'
        break
      case 'completed':
        confirmMessage = '完成游戏？'
        successMessage = '游戏已完成'
        break
      case 'cancelled':
        confirmMessage = '取消此订单？此操作不可撤销！'
        successMessage = '订单已取消'
        break
      case 'refunded':
        // 退款需要特殊处理
        handleRefund(record)
        return
      default:
        confirmMessage = `将订单状态更改为 ${getStatusText(newStatus)}？`
        successMessage = '状态更新成功'
    }
    
    Modal.confirm({
      title: '确认操作',
      content: confirmMessage,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          if (newStatus === 'in_progress') {
            await orderAPI.startGame(record.id)
          } else if (newStatus === 'completed') {
            await orderAPI.completeGame(record.id)
          } else {
            await orderAPI.updateStatus(record.id, newStatus)
          }
          message.success(successMessage)
          loadOrderList()
        } catch (error) {
          console.error('状态更新失败:', error)
          message.error('状态更新失败')
        }
      }
    })
  } catch (error) {
    console.error('状态变更失败:', error)
    message.error('操作失败')
  }
}

// 🆕 处理退款
const handleRefund = (record) => {
  Modal.confirm({
    title: '申请退款',
    content: '请确认要为此订单申请退款？',
    okText: '确定',
    cancelText: '取消',
    onOk: () => {
      // 这里可以打开一个退款表单模态框
      // 目前简化处理，直接全额退款
      Modal.confirm({
        title: '确认退款金额',
        content: `退款金额：Rp ${formatPrice(record.total_amount)}`,
        okText: '确定退款',
        cancelText: '取消',
        onOk: async () => {
          try {
            await orderAPI.processRefund(record.id, {
              refund_amount: record.total_amount,
              refund_reason: '客户申请退款'
            })
            message.success('退款申请已提交')
            loadOrderList()
          } catch (error) {
            console.error('退款失败:', error)
            message.error('退款申请失败')
          }
        }
      })
    }
  })
}

// 工具函数
const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return ''
  return new Date(dateTimeStr).toLocaleString('zh-CN')
}

const formatPrice = (price) => {
  return new Intl.NumberFormat('id-ID').format(price)
}

// 语言文本映射
const getLanguageText = (language) => {
  const languageMap = {
    'CN': '中文',
    'EN': '英语',
    'IND': '印尼语'
  }
  return languageMap[language] || language
}

// 获取显示语言
const getDisplayLanguages = (order) => {
  if (!order) return '未知'
  
  // 优先使用display_languages字段
  if (order.display_languages) {
    return order.display_languages
  }
  
  // 兼容旧数据
  const languages = []
  if (order.script_supported_languages) {
    const scriptLangs = Array.isArray(order.script_supported_languages) 
      ? order.script_supported_languages 
      : [order.script_supported_languages]
    languages.push(...scriptLangs.map(lang => getLanguageText(lang)))
  }
  if (order.escape_room_supported_languages) {
    const roomLangs = Array.isArray(order.escape_room_supported_languages) 
      ? order.escape_room_supported_languages 
      : [order.escape_room_supported_languages]
    languages.push(...roomLangs.map(lang => getLanguageText(lang)))
  }
  
  return languages.length > 0 ? languages.join(' / ') : '未知'
}

// 状态和类型颜色映射
const getOrderTypeColor = (type) => {
  return type === '剧本杀' ? 'blue' : 'green'
}

const getStatusColor = (status) => {
  const colors = {
    'pending': 'orange',
    'confirmed': 'blue',
    'in_progress': 'cyan',
    'completed': 'green',
    'cancelled': 'red',
    'refunded': 'purple',
    'partially_refunded': 'magenta',
    'no_show': 'volcano',
    'rescheduled': 'geekblue'
  }
  return colors[status] || 'default'
}

const getStatusText = (status) => {
  const texts = {
    'pending': '待确认',
    'confirmed': '已确认',
    'in_progress': '进行中',
    'completed': '已完成',
    'cancelled': '已取消',
    'refunded': '已退款',
    'partially_refunded': '部分退款',
    'no_show': '未到场',
    'rescheduled': '已改期'
  }
  return texts[status] || status
}

const getPaymentStatusColor = (status) => {
  const colors = {
    'FULL': 'green',
    'DP': 'orange',
    'Not Yet': 'red',
    'Free': 'purple'
  }
  return colors[status] || 'default'
}

const getPaymentStatusText = (status) => {
  const texts = {
    'FULL': '已付全款',
    'DP': '已付定金',
    'Not Yet': '未付款',
    'Free': '免费'
  }
  return texts[status] || status
}

// 图片预览相关
const previewVisible = ref(false)
const previewImageUrl = ref('')

const previewImage = (url) => {
  previewImageUrl.value = url
  previewVisible.value = true
}

// 付款凭证预览相关
const proofPreviewVisible = ref(false)
const previewProofImages = ref([])
const currentProofIndex = ref(0)

const previewPaymentProof = (images, startIndex = 0) => {
  previewProofImages.value = images
  currentProofIndex.value = startIndex
  proofPreviewVisible.value = true
}

const prevProofImage = () => {
  if (currentProofIndex.value > 0) {
    currentProofIndex.value--
  }
}

const nextProofImage = () => {
  if (currentProofIndex.value < previewProofImages.value.length - 1) {
    currentProofIndex.value++
  }
}
</script>

<style scoped>
.order-container {
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header-actions h2 {
  margin: 0;
}

.actions {
  display: flex;
  gap: 8px;
}

.filter-card {
  margin-bottom: 16px;
  flex-shrink: 0;
}

/* 表格卡片样式 */
.order-container > .ant-card:last-child {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.order-container > .ant-card:last-child :deep(.ant-card-body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
}

.order-container > .ant-card:last-child :deep(.ant-table-wrapper) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.order-container > .ant-card:last-child :deep(.ant-table) {
  flex: 1;
}

.order-container > .ant-card:last-child :deep(.ant-table-container) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.order-container > .ant-card:last-child :deep(.ant-table-body) {
  flex: 1;
  overflow: auto;
}

.order-container > .ant-card:last-child :deep(.ant-pagination) {
  margin: 16px 0;
  text-align: right;
  flex-shrink: 0;
}

/* 表格内容样式 */
.order-info {
  padding: 4px 0;
}

.order-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.order-id {
  font-family: monospace;
  font-weight: bold;
  color: #1890ff;
}

.order-details {
  font-size: 12px;
  color: #666;
}

.order-date {
  font-weight: 500;
  color: #333;
}

.order-subject {
  margin-top: 2px;
  color: #1890ff;
}

.customer-info {
  padding: 4px 0;
}

.customer-name {
  font-weight: 500;
  margin-bottom: 2px;
}

.customer-phone {
  font-size: 12px;
  color: #666;
  margin-bottom: 2px;
}

.player-count {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.store-room-info {
  padding: 4px 0;
}

.store-name {
  font-weight: 500;
  margin-bottom: 2px;
  color: #1890ff;
}

.room-name {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.language-booking {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.payment-info {
  padding: 4px 0;
}

.payment-amount {
  margin-bottom: 4px;
}

.amount {
  font-weight: 500;
  color: #52c41a;
}

.free-order {
  color: #722ed1;
  font-weight: 500;
}

/* 🆕 支付详情样式 */
.payment-details {
  font-size: 11px;
  color: #666;
  margin-bottom: 4px;
}

.prepaid-info {
  color: #52c41a;
  margin-bottom: 1px;
}

.remaining-info {
  color: #faad14;
}

/* 🆕 多笔付款信息样式 */
.multi-payment-info {
  margin: 4px 0;
  font-size: 11px;
}

.payment-progress {
  display: flex;
  gap: 4px;
  align-items: center;
  margin-top: 2px;
}

.progress-text {
  color: #1890ff;
  font-weight: 500;
}

.completion-rate {
  color: #52c41a;
  font-weight: 500;
}

/* 🆕 折扣定价信息样式 */
.role-discount-info {
  margin: 4px 0;
  font-size: 11px;
}

.discount-rate {
  color: #fa8c16;
  font-weight: 500;
  margin-top: 2px;
}

/* 🆕 多笔付款统计样式 */
.multi-payment-stats {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
}

/* 🆕 价格明细样式 */
.price-breakdown {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
}

.price-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: white;
  border-radius: 4px;
  margin-bottom: 8px;
}

.price-item:last-child {
  margin-bottom: 0;
}

.price-item.discount .price-value {
  color: #f50;
  font-weight: 600;
}

.price-item.final {
  border: 2px solid #52c41a;
}

.price-item.final .price-value {
  color: #52c41a;
  font-weight: 600;
  font-size: 16px;
}

.price-label {
  font-weight: 500;
  color: #666;
}

.price-value {
  font-weight: 600;
  color: #333;
}

.player-stats {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e8e8e8;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* 🆕 危险菜单项样式 */
:deep(.danger-item) {
  color: #ff4d4f !important;
}

:deep(.danger-item:hover) {
  background-color: #fff2f0 !important;
  color: #ff4d4f !important;
}

.order-detail {
  padding: 16px 0;
}

.create-info {
  padding: 4px 0;
  font-size: 12px;
}

.create-time {
  font-weight: 500;
  margin-bottom: 2px;
}

.create-by {
  color: #666;
  margin-bottom: 2px;
}

.update-info {
  color: #999;
  font-size: 11px;
}

.order-images {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.order-image {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid #d9d9d9;
}

.order-image:hover {
  border-color: #1890ff;
}

/* 付款凭证样式 */
.payment-proof {
  padding: 4px 0;
}

.proof-images {
  text-align: center;
}

.image-count {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.proof-thumbnails {
  display: flex;
  gap: 2px;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
}

.proof-thumbnail {
  width: 24px;
  height: 24px;
  object-fit: cover;
  border-radius: 2px;
  cursor: pointer;
  border: 1px solid #d9d9d9;
}

.proof-thumbnail:hover {
  border-color: #1890ff;
}

.more-indicator {
  font-size: 10px;
  color: #666;
  background: #f5f5f5;
  padding: 2px 4px;
  border-radius: 2px;
}

.no-proof {
  text-align: center;
  color: #999;
  font-size: 12px;
}

/* Game Host样式 */
.game-host {
  padding: 4px 0;
  text-align: center;
}

.host-name {
  font-size: 12px;
  color: #333;
  font-weight: 500;
}

.npc-info {
  margin-top: 4px;
}

.npc-roles-compact {
  margin-top: 4px;
  font-size: 11px;
  color: #666;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 🆕 折扣显示样式 */
.role-templates-display {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.role-template-tag {
  margin-bottom: 4px;
}

.role-template-tag .discount-info {
  margin-left: 4px;
  font-weight: bold;
  color: #52c41a;
}

.npc-roles-text {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.no-host {
  color: #999;
  font-size: 12px;
}

/* PIC信息样式 */
.pic-info {
  padding: 4px 0;
  text-align: center;
}

.pic-name {
  font-size: 12px;
  color: #333;
  font-weight: 500;
  margin-bottom: 2px;
}

.pic-payment {
  margin-top: 2px;
}

.no-pic {
  color: #999;
  font-size: 12px;
}

/* 付款凭证预览样式 */
.proof-preview-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.proof-preview-main {
  margin-bottom: 16px;
}

.proof-preview-image {
  max-width: 100%;
  max-height: 600px;
  object-fit: contain;
}

.proof-preview-nav {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.proof-nav-info {
  font-size: 14px;
  color: #666;
}

.proof-preview-thumbnails {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.proof-preview-thumb {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
  border: 2px solid #d9d9d9;
  transition: border-color 0.3s;
}

.proof-preview-thumb:hover {
  border-color: #1890ff;
}

.proof-preview-thumb.active {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

/* 🆕 支付明细模态框样式 */
.payment-details-container {
  max-height: 80vh;
  overflow-y: auto;
}

.payment-header {
  margin-bottom: 24px;
}

.payment-section {
  margin-bottom: 24px;
}

.payment-section h3 {
  margin-bottom: 16px;
  color: #333;
  border-bottom: 1px solid #e8e8e8;
  padding-bottom: 8px;
}

.payment-summary {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e8e8e8;
}

.payment-summary h3 {
  margin-bottom: 16px;
  color: #333;
}

.role-name {
  font-weight: 500;
  margin-bottom: 4px;
}

.discount-info {
  margin-top: 4px;
}

.amount-details {
  font-size: 12px;
}

.original-amount {
  color: #666;
  margin-bottom: 2px;
}

.discount-amount {
  color: #f50;
  margin-bottom: 2px;
}

.final-amount {
  color: #52c41a;
  font-weight: 600;
}

.payer-name {
  font-weight: 500;
  margin-bottom: 4px;
}

.payment-amount {
  color: #1890ff;
  font-weight: 600;
}

.covers-count {
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.covers-roles {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .filter-card .ant-form {
    flex-direction: column;
  }
  
  .filter-card .ant-form-item {
    margin-bottom: 16px;
  }

  .payment-details-container {
    padding: 8px;
  }
  
  .payment-section h3 {
    font-size: 16px;
  }
}
</style> 