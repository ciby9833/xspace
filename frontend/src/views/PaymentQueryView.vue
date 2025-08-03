<template>
  <div class="payment-query-view">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>
        <CreditCardOutlined />
        支付查询
      </h1>
      <p>查看订单的支付信息</p>
    </div>

    <!-- 筛选条件 -->
    <a-card class="filter-card">
      <a-form layout="inline" :model="filters">
        <a-form-item label="门店">
          <a-select
            v-model:value="filters.store_id"
            placeholder="选择门店"
            style="width: 180px"
            allow-clear
            @change="loadOrders"
          >
            <a-select-option v-for="store in availableStores" :key="store.id" :value="store.id">
              {{ store.name }}
            </a-select-option>
          </a-select>
        </a-form-item>
        
        <a-form-item label="订单类型">
          <a-select
            v-model:value="filters.order_type"
            placeholder="选择类型"
            style="width: 120px"
            allow-clear
            @change="loadOrders"
          >
            <a-select-option value="剧本杀">剧本杀</a-select-option>
            <a-select-option value="密室">密室</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="支付状态">
          <a-select
            v-model:value="filters.payment_status"
            placeholder="支付状态"
            style="width: 120px"
            allow-clear
            @change="loadOrders"
          >
            <a-select-option value="Not Yet">未支付</a-select-option>
            <a-select-option value="DP">部分支付</a-select-option>
            <a-select-option value="FULL">已支付</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="客户姓名">
          <a-input
            v-model:value="filters.customer_name"
            placeholder="输入客户姓名"
            style="width: 150px"
            @pressEnter="loadOrders"
          />
        </a-form-item>

        <a-form-item label="日期范围">
          <a-range-picker
            v-model:value="filters.dateRange"
            format="YYYY-MM-DD"
            @change="loadOrders"
          />
        </a-form-item>

        <a-form-item>
          <a-space>
            <a-button type="primary" @click="loadOrders" :loading="loading">
              <SearchOutlined />
              查询
            </a-button>
            <a-button @click="resetFilters">
              <ClearOutlined />
              重置
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 订单列表 -->
    <a-card class="orders-card">
      <template #title>
        <div class="card-title">
          <span>订单列表</span>
          <a-tag v-if="orders.length > 0" color="blue">共 {{ orders.length }} 个订单</a-tag>
        </div>
      </template>

      <a-table
        :columns="columns"
        :data-source="orders"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: 1380 }"
        row-key="id"
        @change="handleTableChange"
      >
        <!-- 订单信息 -->
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'order_info'">
            <div class="order-info">
              <div class="order-id">{{ record.id.slice(0, 8) }}...</div>
              <div class="order-type">{{ record.order_type }}</div>
              <div class="order-date">{{ record.order_date }}</div>
            </div>
          </template>

          <!-- 客户信息 -->
          <template v-if="column.key === 'customer_info'">
            <div class="customer-info">
              <div class="customer-name">{{ record.customer_name }}</div>
              <div class="customer-phone" v-if="record.customer_phone">
                <PhoneOutlined />
                {{ record.customer_phone }}
              </div>
              <div class="player-count">
                <UserOutlined />
                {{ record.player_count }}人
              </div>
            </div>
          </template>

          <!-- 游戏信息 -->
          <template v-if="column.key === 'game_info'">
            <div class="game-info">
              <div class="game-name">{{ record.script_name || record.escape_room_name || '-' }}</div>
              <div class="game-time">
                <ClockCircleOutlined />
                {{ record.start_time }} - {{ record.end_time }}
              </div>
              <div class="store-name">
                <ShopOutlined />
                {{ record.store_name }}
              </div>
            </div>
          </template>

          <!-- 支付信息 -->
          <template v-if="column.key === 'payment_info'">
            <div class="payment-info">
              <div class="total-amount">Rp {{ formatCurrency(record.total_amount) }}</div>
              <a-tag :color="getPaymentStatusColor(record.payment_status)">
                {{ getPaymentStatusText(record.payment_status) }}
              </a-tag>
              <div v-if="record.enable_multi_payment" class="multi-payment-tag">
                <a-tag color="purple" size="small">多笔支付</a-tag>
              </div>
              <!-- 🤖 AI识别状态显示 -->
              <div class="ai-recognition-status" style="margin-top: 4px;">
                <a-tag 
                  v-if="record.ai_recognition_status" 
                  :color="getAiRecognitionColor(record.ai_recognition_status)"
                  size="small"
                >
                  {{ getAiRecognitionText(record.ai_recognition_status) }}
                </a-tag>
              </div>
            </div>
          </template>

          <!-- 🤖 AI识别结果 -->
          <template v-if="column.key === 'ai_recognition_info'">
            <div class="ai-recognition-info">
              <div v-if="record.ai_total_recognized_amount && record.ai_total_recognized_amount > 0" class="ai-amount">
                <span class="amount-label">AI识别:</span>
                <span class="amount-value">Rp {{ formatCurrency(record.ai_total_recognized_amount) }}</span>
              </div>
              <div v-if="record.ai_total_confidence_score && record.ai_total_confidence_score > 0" class="ai-confidence">
                <span class="confidence-label">置信度:</span>
                <span class="confidence-value">{{ record.ai_total_confidence_score }}%</span>
              </div>
              <div v-if="!record.ai_total_recognized_amount || record.ai_total_recognized_amount === 0" class="no-ai-data">
                <a-tag color="default" size="small">暂无识别</a-tag>
              </div>
            </div>
          </template>

          <!-- 操作 -->
          <template v-if="column.key === 'actions'">
            <a-space>
              <a-button type="link" size="small" @click="viewPaymentDetails(record)">
                <EyeOutlined />
                查看支付详情
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 支付详情弹窗 -->
    <a-modal
      v-model:visible="detailsVisible"
      title="支付详情"
      width="900px"
      :footer="null"
      @cancel="handleCloseDetails"
    >
      <div class="payment-details">
        <a-spin :spinning="detailsLoading">
          <!-- 订单基本信息 -->
          <div class="order-summary">
            <a-descriptions title="订单信息" :column="3" bordered size="small">
              <a-descriptions-item label="订单编号">
                {{ currentOrder?.id?.slice(0, 8) }}...
              </a-descriptions-item>
              <a-descriptions-item label="客户姓名">
                {{ currentOrder?.customer_name }}
              </a-descriptions-item>
              <a-descriptions-item label="游戏类型">
                {{ currentOrder?.order_type }}
              </a-descriptions-item>
              <a-descriptions-item label="游戏时间">
                {{ currentOrder?.order_date }} {{ currentOrder?.start_time }}-{{ currentOrder?.end_time }}
              </a-descriptions-item>
              <a-descriptions-item label="门店">
                {{ currentOrder?.store_name }}
              </a-descriptions-item>
              <a-descriptions-item label="总金额">
                Rp {{ formatCurrency(currentOrder?.total_amount) }}
              </a-descriptions-item>
              <a-descriptions-item label="订单类型">
                <a-tag :color="currentOrder?.enable_multi_payment ? 'purple' : 'blue'">
                  {{ currentOrder?.enable_multi_payment ? '多笔支付订单' : '传统订单' }}
                </a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="支付状态">
                <a-tag :color="getPaymentStatusColor(currentOrder?.payment_status)">
                  {{ getPaymentStatusText(currentOrder?.payment_status) }}
                </a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="玩家人数">
                {{ currentOrder?.player_count }}人
              </a-descriptions-item>
              <!-- 🤖 AI识别总金额信息 -->
              <a-descriptions-item label="AI识别总金额" v-if="currentOrder?.ai_total_recognized_amount && currentOrder.ai_total_recognized_amount > 0">
                <span style="color: #52c41a; font-weight: 500;">
                  Rp {{ formatCurrency(currentOrder.ai_total_recognized_amount) }}
                </span>
                <span v-if="currentOrder?.ai_total_confidence_score" style="color: #1890ff; font-size: 12px; margin-left: 8px;">
                  (置信度: {{ currentOrder.ai_total_confidence_score }}%)
                </span>
              </a-descriptions-item>
              <!-- 🤖 AI识别摘要信息 -->
              <a-descriptions-item label="AI识别摘要" v-if="currentOrder?.ai_recognition_summary" :span="3">
                <span style="color: #666; font-size: 12px;">
                  {{ currentOrder.ai_recognition_summary }}
                </span>
              </a-descriptions-item>
            </a-descriptions>
          </div>

          <!-- 提示信息 -->
          <a-alert 
            v-if="!currentOrder?.enable_multi_payment" 
            message="传统订单说明" 
            description="此订单为传统订单，系统基于订单的角色模板和折扣信息生成了玩家详情用于展示，支付记录显示为统一支付。传统订单的金额按角色模板分配，但实际收款为统一收取。" 
            type="info" 
            show-icon 
            style="margin-top: 16px"
          />
          
          <a-alert 
            v-if="currentOrder?.enable_multi_payment" 
            message="多笔支付订单说明" 
            description="此订单为多笔支付订单，显示的是数据库中实际存储的玩家信息和支付记录，包含真实的支付凭证和详细的支付状态。" 
            type="success" 
            show-icon 
            style="margin-top: 16px"
          />

          <!-- 支付详情标签页 -->
          <a-tabs v-model:activeKey="activeTab" style="margin-top: 24px">
            <!-- 玩家信息 -->
            <a-tab-pane key="players" tab="玩家信息">
              <a-table
                :columns="playerColumns"
                :data-source="paymentDetails?.players || []"
                :pagination="false"
                size="small"
                row-key="id"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'player_info'">
                    <div>
                      <div class="player-name">{{ record.player_name }}</div>
                      <div class="player-phone" v-if="record.player_phone">
                        <PhoneOutlined />
                        {{ record.player_phone }}
                      </div>
                    </div>
                  </template>

                  <template v-if="column.key === 'role_info'">
                    <div>
                      <div>{{ record.selected_role_name }}</div>
                      <div v-if="record.discount_type !== 'none'">
                        <a-tag :color="getDiscountColor(record.discount_type)" size="small">
                          {{ getDiscountText(record) }}
                        </a-tag>
                      </div>
                    </div>
                  </template>

                  <template v-if="column.key === 'amount_info'">
                    <div>
                      <div v-if="record.discount_amount > 0" class="original-amount">
                        原价: Rp {{ formatCurrency(record.original_amount) }}
                      </div>
                      <div class="final-amount">
                        实付: Rp {{ formatCurrency(record.final_amount) }}
                      </div>
                      <div v-if="record.discount_amount > 0" class="discount-amount">
                        优惠: -Rp {{ formatCurrency(record.discount_amount) }}
                      </div>
                    </div>
                  </template>

                  <template v-if="column.key === 'payment_status'">
                    <a-tag :color="getPaymentStatusColor(record.payment_status)">
                      {{ getPaymentStatusText(record.payment_status) }}
                    </a-tag>
                  </template>
                </template>
              </a-table>
            </a-tab-pane>

            <!-- 支付记录 -->
            <a-tab-pane key="payments" tab="支付记录">
              <a-table
                :columns="paymentColumns"
                :data-source="paymentDetails?.payments || []"
                :pagination="false"
                size="small"
                row-key="id"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'payer_info'">
                    <div>
                      <div class="payer-name">{{ record.payer_name }}</div>
                      <div class="payer-phone" v-if="record.payer_phone">
                        <PhoneOutlined />
                        {{ record.payer_phone }}
                      </div>
                    </div>
                  </template>

                  <template v-if="column.key === 'payment_amount'">
                    <div>
                      <div class="amount">Rp {{ formatCurrency(record.payment_amount) }}</div>
                      <div v-if="record.covers_player_count" class="covers-count">
                        <UserOutlined />
                        {{ record.covers_player_count }}人
                      </div>
                    </div>
                  </template>

                  <!-- 🤖 AI识别金额 -->
                  <template v-if="column.key === 'ai_amount'">
                    <div class="ai-amount-cell">
                      <div v-if="record.ai_recognition_result && getAiRecognizedAmount(record)" class="ai-amount-value">
                        <span class="ai-label">AI:</span>
                        <span class="amount-text">Rp {{ formatCurrency(getAiRecognizedAmount(record)) }}</span>
                      </div>
                      <div v-else-if="record.ai_recognition_status === 'success'" class="ai-amount-empty">
                        <span class="ai-label">AI:</span>
                        <span class="no-amount">无金额</span>
                      </div>
                      <div v-else class="ai-amount-pending">
                        <a-tag :color="getAiRecognitionColor(record.ai_recognition_status || 'pending')" size="small">
                          {{ getAiRecognitionText(record.ai_recognition_status || 'pending') }}
                        </a-tag>
                      </div>
                    </div>
                  </template>

                  <template v-if="column.key === 'payment_method'">
                    <a-tag :color="getPaymentMethodColor(record.payment_method)">
                      {{ record.payment_method }}
                    </a-tag>
                  </template>

                  <template v-if="column.key === 'payment_status'">
                    <a-tag :color="getPaymentStatusColor(record.payment_status)">
                      {{ getPaymentStatusText(record.payment_status) }}
                    </a-tag>
                  </template>

                  <template v-if="column.key === 'payment_proof'">
                    <div v-if="record.images && record.images.length > 0">
                      <a-tag color="green" size="small">
                        <PictureOutlined />
                        {{ record.images.length }}张凭证
                      </a-tag>
                      <div style="margin-top: 4px;">
                        <a-image
                          v-for="(image, index) in record.images.slice(0, 2)"
                          :key="index"
                          :src="image.image_url"
                          :width="30"
                          :height="30"
                          style="margin-right: 4px; border-radius: 4px;"
                          :preview="true"
                        />
                        <span v-if="record.images.length > 2" style="font-size: 12px; color: #666;">
                          +{{ record.images.length - 2 }}
                        </span>
                      </div>
                    </div>
                    <div v-else>
                      <a-tag color="orange" size="small">
                        <FileImageOutlined />
                        无凭证
                      </a-tag>
                    </div>
                  </template>

                  <template v-if="column.key === 'ai_recognition'">
                    <div class="ai-recognition-info">
                      <a-tag 
                        :color="getAiRecognitionColor(record.ai_recognition_status || 'pending')"
                        size="small"
                      >
                        {{ getAiRecognitionText(record.ai_recognition_status || 'pending') }}
                      </a-tag>
                      <div v-if="record.ai_recognition_confidence" class="confidence-score">
                        置信度: {{ record.ai_recognition_confidence }}%
                      </div>
                    </div>
                  </template>

                  <template v-if="column.key === 'payment_date'">
                    {{ formatDateTime(record.payment_date) }}
                  </template>
                </template>
              </a-table>
            </a-tab-pane>

            <!-- 🤖 AI识别结果 -->
            <a-tab-pane key="ai_recognition" tab="AI识别结果">
              <div class="ai-recognition-results">
                <a-spin :spinning="aiRecognitionLoading">
                  <!-- 订单AI识别结果（单笔支付） -->
                  <div v-if="!currentOrder?.enable_multi_payment" class="order-recognition-section">
                    <h4>订单AI识别结果</h4>
                    <a-card size="small" style="margin-bottom: 16px;">
                      <div class="recognition-status">
                        <a-descriptions :column="2" size="small">
                          <a-descriptions-item label="识别状态">
                            <a-tag :color="getAiRecognitionColor(aiRecognitionData?.order_recognition?.status || 'pending')">
                              {{ getAiRecognitionText(aiRecognitionData?.order_recognition?.status || 'pending') }}
                            </a-tag>
                          </a-descriptions-item>
                          <a-descriptions-item label="置信度" v-if="aiRecognitionData?.order_recognition?.confidence">
                            {{ aiRecognitionData.order_recognition.confidence }}%
                          </a-descriptions-item>
                          <a-descriptions-item label="识别时间" v-if="aiRecognitionData?.order_recognition?.recognized_at">
                            {{ formatDateTime(aiRecognitionData.order_recognition.recognized_at) }}
                          </a-descriptions-item>
                        </a-descriptions>
                        
                        <!-- 识别结果详情 -->
                        <div v-if="aiRecognitionData?.order_recognition?.result" class="recognition-details">
                          <h5>识别详情：</h5>
                          <div v-for="(result, index) in aiRecognitionData.order_recognition.result" :key="index" class="result-item">
                            <a-card size="small" style="margin-bottom: 8px;">
                              <div class="result-header">
                                <strong>{{ result.image_name }}</strong>
                                <a-tag v-if="result.recognition_result?.success" color="green">识别成功</a-tag>
                                <a-tag v-else color="red">识别失败</a-tag>
                              </div>
                              <div v-if="result.recognition_result?.success" class="result-content">
                                <!-- 🔧 改进：显示关键信息而不是原始JSON -->
                                <div class="recognition-summary">
                                  <a-descriptions :column="2" size="small">
                                    <a-descriptions-item label="银行">
                                      {{ result.recognition_result.bank_name || '未识别' }}
                                    </a-descriptions-item>
                                    <a-descriptions-item label="金额">
                                      <span class="amount-highlight">
                                        Rp {{ formatCurrency(result.recognition_result.amount || 0) }}
                                      </span>
                                    </a-descriptions-item>
                                    <a-descriptions-item label="交易类型">
                                      {{ result.recognition_result.transaction_type || '未识别' }}
                                    </a-descriptions-item>
                                    <a-descriptions-item label="置信度">
                                      <a-tag color="blue">{{ result.recognition_result.confidence_score || 0 }}%</a-tag>
                                    </a-descriptions-item>
                                    <a-descriptions-item label="交易日期" v-if="result.recognition_result.transaction_date">
                                      {{ result.recognition_result.transaction_date }}
                                    </a-descriptions-item>
                                    <a-descriptions-item label="收款人" v-if="result.recognition_result.payee_name">
                                      {{ result.recognition_result.payee_name }}
                                    </a-descriptions-item>
                                  </a-descriptions>
                                </div>
                                <!-- 可展开的原始数据 -->
                                <a-collapse style="margin-top: 8px;">
                                  <a-collapse-panel key="raw" header="查看原始识别数据">
                                    <pre class="raw-data">{{ JSON.stringify(result.recognition_result, null, 2) }}</pre>
                                  </a-collapse-panel>
                                </a-collapse>
                              </div>
                              <div v-else class="error-content">
                                <a-alert type="error" :message="result.recognition_result?.error || '识别失败'" size="small" />
                              </div>
                            </a-card>
                          </div>
                        </div>
                        
                        <!-- 错误信息 -->
                        <div v-if="aiRecognitionData?.order_recognition?.error" class="error-info">
                          <a-alert type="error" :message="aiRecognitionData.order_recognition.error" size="small" />
                        </div>
                      </div>
                    </a-card>
                  </div>

                  <!-- 支付记录AI识别结果（多笔支付） -->
                  <div v-if="currentOrder?.enable_multi_payment" class="payments-recognition-section">
                    <h4>支付记录AI识别结果</h4>
                    
                    <!-- 显示所有支付记录（包括未识别的） -->
                    <div v-for="payment in paymentDetails?.payments || []" :key="payment.id" class="payment-recognition-item">
                      <a-card size="small" style="margin-bottom: 16px;">
                        <template #title>
                          <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span>{{ payment.payer_name }} - Rp {{ formatCurrency(payment.payment_amount) }}</span>
                            <a-tag 
                              :color="getAiRecognitionColor(payment.ai_recognition_status || 'pending')"
                              size="small"
                            >
                              {{ getAiRecognitionText(payment.ai_recognition_status || 'pending') }}
                            </a-tag>
                          </div>
                        </template>
                        
                        <a-descriptions :column="2" size="small">
                          <a-descriptions-item label="支付金额">
                            Rp {{ formatCurrency(payment.payment_amount) }}
                          </a-descriptions-item>
                          <a-descriptions-item label="AI识别金额" v-if="payment.ai_recognition_result && getAiRecognizedAmount(payment) > 0">
                            <span class="amount-highlight">
                              Rp {{ formatCurrency(getAiRecognizedAmount(payment)) }}
                            </span>
                          </a-descriptions-item>
                          <a-descriptions-item label="置信度" v-if="payment.ai_recognition_confidence">
                            {{ payment.ai_recognition_confidence }}%
                          </a-descriptions-item>
                          <a-descriptions-item label="识别时间" v-if="payment.ai_recognition_at">
                            {{ formatDateTime(payment.ai_recognition_at) }}
                          </a-descriptions-item>
                        </a-descriptions>
                        
                        <!-- 识别结果详情 -->
                        <div v-if="payment.ai_recognition_result && Array.isArray(payment.ai_recognition_result)" class="recognition-details">
                          <h5>识别详情：</h5>
                          <div v-for="(result, index) in payment.ai_recognition_result" :key="index" class="result-item">
                            <a-card size="small" style="margin-bottom: 8px;">
                              <div class="result-header">
                                <strong>{{ result.image_name }}</strong>
                                <a-tag v-if="result.recognition_result?.success" color="green">识别成功</a-tag>
                                <a-tag v-else color="red">识别失败</a-tag>
                              </div>
                              <div v-if="result.recognition_result?.success" class="result-content">
                                <!-- 🔧 改进：显示关键信息而不是原始JSON -->
                                <div class="recognition-summary">
                                  <a-descriptions :column="2" size="small">
                                    <a-descriptions-item label="银行">
                                      {{ result.recognition_result.bank_name || '未识别' }}
                                    </a-descriptions-item>
                                    <a-descriptions-item label="金额">
                                      <span class="amount-highlight">
                                        Rp {{ formatCurrency(result.recognition_result.amount || 0) }}
                                      </span>
                                    </a-descriptions-item>
                                    <a-descriptions-item label="交易类型">
                                      {{ result.recognition_result.transaction_type || '未识别' }}
                                    </a-descriptions-item>
                                    <a-descriptions-item label="置信度">
                                      <a-tag color="blue">{{ result.recognition_result.confidence_score || 0 }}%</a-tag>
                                    </a-descriptions-item>
                                    <a-descriptions-item label="交易日期" v-if="result.recognition_result.transaction_date">
                                      {{ result.recognition_result.transaction_date }}
                                    </a-descriptions-item>
                                    <a-descriptions-item label="收款人" v-if="result.recognition_result.payee_name">
                                      {{ result.recognition_result.payee_name }}
                                    </a-descriptions-item>
                                  </a-descriptions>
                                </div>
                                <!-- 可展开的原始数据 -->
                                <a-collapse style="margin-top: 8px;">
                                  <a-collapse-panel key="raw" header="查看原始识别数据">
                                    <pre class="raw-data">{{ JSON.stringify(result.recognition_result, null, 2) }}</pre>
                                  </a-collapse-panel>
                                </a-collapse>
                              </div>
                              <div v-else class="error-content">
                                <a-alert type="error" :message="result.recognition_result?.error || '识别失败'" size="small" />
                              </div>
                            </a-card>
                          </div>
                        </div>
                        
                        <!-- 未识别或无凭证状态 -->
                        <div v-else-if="payment.ai_recognition_status === 'pending'" class="pending-recognition">
                          <a-alert type="info" message="此支付记录尚未进行AI识别" size="small" />
                        </div>
                        
                        <!-- 错误信息 -->
                        <div v-if="payment.ai_recognition_error" class="error-info">
                          <a-alert type="error" :message="payment.ai_recognition_error" size="small" />
                        </div>
                      </a-card>
                    </div>
                  </div>

                  <!-- 无AI识别数据：只有在单笔支付且没有AI结果时显示 -->
                  <div v-if="!currentOrder?.enable_multi_payment && (!currentOrder?.ai_recognition_status || currentOrder.ai_recognition_status === 'pending')" class="no-recognition-data">
                    <a-empty description="暂无AI识别数据">
                      <template #description>
                        <span style="color: #999;">
                          订单暂未进行AI识别或正在识别中
                        </span>
                      </template>
                    </a-empty>
                  </div>
                </a-spin>
              </div>
            </a-tab-pane>
          </a-tabs>
        </a-spin>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  CreditCardOutlined,
  SearchOutlined,
  ClearOutlined,
  EyeOutlined,
  PhoneOutlined,
  UserOutlined,
  ClockCircleOutlined,
  ShopOutlined,
  PictureOutlined,
  FileImageOutlined
} from '@ant-design/icons-vue'

// API 导入
import { orderAPI } from '@/api/order'

// 响应式数据
const loading = ref(false)
const detailsLoading = ref(false)
const aiRecognitionLoading = ref(false)
const orders = ref([])
const allOrders = ref([]) // 缓存所有订单数据
const availableStores = ref([])
const detailsVisible = ref(false)
const currentOrder = ref(null)
const paymentDetails = ref(null)
const aiRecognitionData = ref(null)
const activeTab = ref('players')

// 筛选条件
const filters = reactive({
  store_id: null,
  order_type: null,
  payment_status: null,
  customer_name: '',
  dateRange: null
})

// 分页配置
const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
})

// 表格列定义
const columns = [
  { title: '订单信息', key: 'order_info', width: 150, fixed: 'left' },
  { title: '客户信息', key: 'customer_info', width: 150 },
  { title: '游戏信息', key: 'game_info', width: 200 },
  { title: '支付信息', key: 'payment_info', width: 150 },
  { title: 'AI识别结果', key: 'ai_recognition_info', width: 180 },
  { title: '操作', key: 'actions', width: 120, fixed: 'right' }
]

const playerColumns = [
  { title: '玩家信息', key: 'player_info', width: 150 },
  { title: '折扣信息', key: 'role_info', width: 120 },
  { title: '金额信息', key: 'amount_info', width: 180 },
  { title: '支付状态', key: 'payment_status', width: 100 }
]

const paymentColumns = [
  { title: '付款人', key: 'payer_info', width: 150 },
  { title: '支付金额', key: 'payment_amount', width: 120 },
  { title: 'AI识别金额', key: 'ai_amount', width: 120 },
  { title: '支付方式', key: 'payment_method', width: 100 },
  { title: '支付状态', key: 'payment_status', width: 100 },
  { title: '支付凭证', key: 'payment_proof', width: 120 },
  { title: 'AI识别', key: 'ai_recognition', width: 120 },
  { title: '支付时间', key: 'payment_date', width: 150 }
]

// 初始化
onMounted(async () => {
  await loadAvailableStores()
  await loadOrders()
})

// 方法定义
const loadAvailableStores = async () => {
  try {
    const response = await orderAPI.getAvailableStores()
    if (response.success) {
      availableStores.value = response.data
    }
  } catch (error) {
    console.error('加载门店列表失败:', error)
  }
}

const loadOrders = async () => {
  loading.value = true
  try {
    const params = {
      ...filters,
      start_date: filters.dateRange?.[0]?.format('YYYY-MM-DD'),
      end_date: filters.dateRange?.[1]?.format('YYYY-MM-DD')
    }
    
    // 清理空值
    Object.keys(params).forEach(key => {
      if (params[key] === null || params[key] === undefined || params[key] === '') {
        delete params[key]
      }
    })

    const response = await orderAPI.getList(params)
    if (response.success) {
      // 缓存所有订单数据
      allOrders.value = response.data || []
      
      // 重置到第一页
      pagination.current = 1
      
      // 应用分页
      applyPagination()
    }
  } catch (error) {
    console.error('加载订单列表失败:', error)
    message.error('加载订单列表失败')
  } finally {
    loading.value = false
  }
}

// 应用分页逻辑
const applyPagination = () => {
  pagination.total = allOrders.value.length
  
  // 客户端分页：计算当前页的数据
  const startIndex = (pagination.current - 1) * pagination.pageSize
  const endIndex = startIndex + pagination.pageSize
  orders.value = allOrders.value.slice(startIndex, endIndex)
}

const resetFilters = () => {
  Object.keys(filters).forEach(key => {
    if (key === 'dateRange') {
      filters[key] = null
    } else {
      filters[key] = key === 'customer_name' ? '' : null
    }
  })
  loadOrders()
}

const handleTableChange = (paginationInfo) => {
  pagination.current = paginationInfo.current
  pagination.pageSize = paginationInfo.pageSize
  applyPagination()
}

const viewPaymentDetails = async (order) => {
  currentOrder.value = order
  detailsVisible.value = true
  detailsLoading.value = true
  
  try {
    // 只获取支付详情，AI识别结果直接从其中提取
    const paymentResponse = await orderAPI.getOrderPaymentSummary(order.id)
    
    // 处理支付详情
    if (paymentResponse.success) {
      const response = paymentResponse
      
      // 🆕 处理支付记录中的图片数据格式转换
      if (response.data.payments && response.data.payments.length > 0) {
        response.data.payments = response.data.payments.map(payment => {
          // 如果已经有 images 字段，直接使用（多笔支付场景）
          if (payment.images && Array.isArray(payment.images)) {
            return payment
          }
          // 如果有 payment_proof_images 字段，需要转换（兼容旧数据）
          if (payment.payment_proof_images) {
            return {
              ...payment,
              images: formatPaymentImages(payment)
            }
          }
          // 都没有的话，设置为空数组
          return {
            ...payment,
            images: []
          }
        })
      }
      
      // 🆕 对于单笔支付订单，如果后端返回空数组，则生成显示数据
      if (!response.data.order.enable_multi_payment && 
          (!response.data.players || response.data.players.length === 0)) {
        response.data.players = generateSinglePaymentPlayers(response.data.order)
        response.data.payments = generateSinglePaymentRecord(response.data.order)
      }
      
      paymentDetails.value = response.data
      
      // 🤖 直接从支付汇总数据中提取AI识别结果
      extractAiRecognitionData(response.data)
    }
    
  } catch (error) {
    console.error('加载支付详情失败:', error)
    message.error('加载支付详情失败')
  } finally {
    detailsLoading.value = false
  }
}

const handleCloseDetails = () => {
  detailsVisible.value = false
  currentOrder.value = null
  paymentDetails.value = null
  aiRecognitionData.value = null
  activeTab.value = 'players'
}

// 🤖 从支付汇总数据中提取AI识别结果
const extractAiRecognitionData = (paymentSummaryData) => {
  aiRecognitionLoading.value = true
  
  try {
    const { order, payments } = paymentSummaryData
    
    let aiData = {
      order_id: order.id,
      enable_multi_payment: order.enable_multi_payment,
      order_recognition: null,
      payments_recognition: []
    }
    
    if (order.enable_multi_payment) {
      // 多笔支付：提取每个支付记录的AI识别结果
      aiData.payments_recognition = payments
        .filter(payment => payment.ai_recognition_status && payment.ai_recognition_status !== 'pending')
        .map(payment => ({
          payment_id: payment.id,
          payer_name: payment.payer_name,
          payment_amount: payment.payment_amount,
          status: payment.ai_recognition_status,
          result: payment.ai_recognition_result,
          error: payment.ai_recognition_error,
          recognized_at: payment.ai_recognition_at,
          confidence: payment.ai_recognition_confidence
        }))
    } else {
      // 单笔支付：提取订单级别的AI识别结果
      if (order.ai_recognition_status && order.ai_recognition_status !== 'pending') {
        aiData.order_recognition = {
          status: order.ai_recognition_status,
          result: order.ai_recognition_result,
          error: order.ai_recognition_error,
          recognized_at: order.ai_recognition_at,
          confidence: order.ai_recognition_confidence,
          total_recognized_amount: order.ai_total_recognized_amount,
          total_confidence_score: order.ai_total_confidence_score,
          recognition_summary: order.ai_recognition_summary
        }
      }
    }
    
    aiRecognitionData.value = aiData
    console.log('🤖 AI识别数据提取完成:', aiData)
    
  } catch (error) {
    console.error('提取AI识别结果失败:', error)
  } finally {
    aiRecognitionLoading.value = false
  }
}

// 工具方法
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('id-ID').format(amount || 0)
}

const formatDateTime = (dateTime) => {
  if (!dateTime) return '-'
  return new Date(dateTime).toLocaleString('zh-CN')
}

const getPaymentStatusColor = (status) => {
  const colorMap = {
    'Not Yet': 'red',
    'DP': 'orange',
    'FULL': 'green',
    'Free': 'blue',
    'pending': 'orange',
    'confirmed': 'green',
    'failed': 'red',
    'cancelled': 'gray'
  }
  return colorMap[status] || 'default'
}

const getPaymentStatusText = (status) => {
  const textMap = {
    'Not Yet': '未支付',
    'DP': '部分支付',
    'FULL': '已支付',
    'Free': '免费',
    'pending': '待确认',
    'confirmed': '已确认',
    'failed': '失败',
    'cancelled': '已取消'
  }
  return textMap[status] || status
}

const getPaymentMethodColor = (method) => {
  const colorMap = {
    'Bank Transfer': 'blue',
    'QR BCA': 'green',
    'DEBIT': 'orange',
    'CC': 'purple',
    'Cash': 'gold'
  }
  return colorMap[method] || 'default'
}

const getDiscountColor = (type) => {
  const colorMap = {
    percentage: 'green',
    fixed: 'blue',
    free: 'purple',
    mixed: 'orange'
  }
  return colorMap[type] || 'default'
}

const getDiscountText = (player) => {
  if (player.discount_type === 'percentage') {
    return `${player.discount_percentage}%折扣`
  } else if (player.discount_type === 'fixed') {
    return `固定减 Rp ${formatCurrency(player.discount_fixed_amount)}`
  } else if (player.discount_type === 'free') {
    return '免费'
  } else if (player.discount_type === 'mixed') {
    // 对于混合折扣，显示总折扣金额和百分比
    if (player.discount_percentage > 0) {
      return `混合折扣 ${player.discount_percentage}%`
    } else if (player.discount_amount > 0) {
      return `混合折扣 Rp ${formatCurrency(player.discount_amount)}`
    }
    return '混合折扣'
  }
  return '无折扣'
}

// 🤖 AI识别状态相关方法
const getAiRecognitionColor = (status) => {
  const colorMap = {
    'pending': 'default',
    'processing': 'blue',
    'success': 'green',
    'failed': 'red',
    'skipped': 'orange'
  }
  return colorMap[status] || 'default'
}

const getAiRecognitionText = (status) => {
  const textMap = {
    'pending': '待识别',
    'processing': '识别中',
    'success': '识别成功',
    'failed': '识别失败',
    'skipped': '已跳过'
  }
  return textMap[status] || '未知状态'
}

// 🤖 获取AI识别的金额
const getAiRecognizedAmount = (paymentRecord) => {
  if (!paymentRecord.ai_recognition_result) return 0
  
  try {
    // 如果是字符串，先解析为JSON
    let results = paymentRecord.ai_recognition_result
    if (typeof results === 'string') {
      results = JSON.parse(results)
    }
    
    // 如果是数组，遍历所有识别结果获取总金额
    if (Array.isArray(results)) {
      let totalAmount = 0
      results.forEach(result => {
        if (result.recognition_result && result.recognition_result.amount) {
          totalAmount += parseFloat(result.recognition_result.amount || 0)
        }
      })
      return totalAmount
    }
    
    // 如果是单个结果对象
    if (results.recognition_result && results.recognition_result.amount) {
      return parseFloat(results.recognition_result.amount || 0)
    }
    
    return 0
  } catch (error) {
    console.warn('解析AI识别金额失败:', error)
    return 0
  }
}

// 🆕 为单笔支付订单生成玩家显示数据
const generateSinglePaymentPlayers = (order) => {
  const players = []
  const templates = order.selected_role_templates || []
  const unitPrice = parseFloat(order.unit_price || 0)
  const totalPlayerCount = order.player_count || 0
  let playerIndex = 1
  
  // 根据角色模板生成玩家数据
  templates.forEach(template => {
    const playerCount = template.player_count || 1
    
    for (let i = 0; i < playerCount; i++) {
      const originalAmount = unitPrice
      let discountAmount = 0
      let finalAmount = originalAmount
      
      // 计算折扣
      if (template.discount_type === 'percentage') {
        const discountRate = parseFloat(template.discount_value || 0) / 100
        discountAmount = originalAmount * discountRate  
        finalAmount = originalAmount - discountAmount
      } else if (template.discount_type === 'fixed') {
        discountAmount = parseFloat(template.discount_value || 0)
        finalAmount = Math.max(0, originalAmount - discountAmount)
      } else if (template.discount_type === 'free') {
        discountAmount = originalAmount
        finalAmount = 0
      }
      
      players.push({
        id: `single_player_${playerIndex}`,
        player_name: `${template.role_name || '标准玩家'} - 第${i + 1}人`,
        player_phone: order.customer_phone || '',
        selected_role_name: template.role_name || '标准玩家',
        original_amount: originalAmount,
        discount_amount: discountAmount,
        final_amount: finalAmount,
        payment_status: order.payment_status === 'FULL' ? 'paid' : 
                       order.payment_status === 'DP' ? 'partial' : 'pending',
        discount_type: template.discount_type || 'none',
        discount_percentage: template.discount_type === 'percentage' ? parseFloat(template.discount_value || 0) : 0,
        discount_fixed_amount: template.discount_type === 'fixed' ? parseFloat(template.discount_value || 0) : 0,
        notes: template.discount_type !== 'none' ? `${getDiscountTypeDescription(template)}` : ''
      })
      
      playerIndex++
    }
  })
  
  // 🔧 修复：补充剩余的标准玩家（没有折扣的玩家）
  const remainingPlayerCount = totalPlayerCount - players.length
  for (let i = 0; i < remainingPlayerCount; i++) {
    players.push({
      id: `single_player_${playerIndex}`,
      player_name: `标准玩家 - 第${i + 1}人`,
      player_phone: order.customer_phone || '',
      selected_role_name: '标准玩家',
      original_amount: unitPrice,
      discount_amount: 0,
      final_amount: unitPrice,
      payment_status: order.payment_status === 'FULL' ? 'paid' : 
                     order.payment_status === 'DP' ? 'partial' : 'pending',
      discount_type: 'none',
      discount_percentage: 0,
      discount_fixed_amount: 0,
      notes: ''
    })
    
    playerIndex++
  }
  
  // 如果没有角色模板，按玩家数量生成所有标准玩家
  if (templates.length === 0) {
    for (let i = 1; i <= totalPlayerCount; i++) {
      players.push({
        id: `single_player_${i}`,
        player_name: `标准玩家 ${i}`,
        player_phone: order.customer_phone || '',
        selected_role_name: '标准玩家',
        original_amount: unitPrice,
        discount_amount: 0,
        final_amount: unitPrice,
        payment_status: order.payment_status === 'FULL' ? 'paid' : 
                       order.payment_status === 'DP' ? 'partial' : 'pending',
        discount_type: 'none',
        discount_percentage: 0,
        discount_fixed_amount: 0,
        notes: ''
      })
    }
  }
  
  return players
}

// 🆕 为单笔支付订单生成支付记录显示数据
const generateSinglePaymentRecord = (order) => {
  return [{
    id: 'single_payment',
    payer_name: order.customer_name || '客户',
    payer_phone: order.customer_phone || '',
    payment_amount: parseFloat(order.total_amount || 0),
    payment_method: order.payment_method || 'Bank Transfer',
    payment_date: order.payment_date || order.created_at,
    payment_status: order.payment_status === 'FULL' ? 'confirmed' : 
                   order.payment_status === 'DP' ? 'partial' : 'pending',
    covers_player_count: order.player_count || 0,
    payment_for_roles: ['所有玩家'],
    notes: '传统订单统一支付',
    images: order.images || [],
    // 🤖 AI识别相关字段（从订单数据复制）
    ai_recognition_status: order.ai_recognition_status,
    ai_recognition_confidence: order.ai_recognition_confidence,
    ai_recognition_result: order.ai_recognition_result,
    ai_recognition_at: order.ai_recognition_at,
    ai_recognition_error: order.ai_recognition_error
  }]
}

// 🆕 获取折扣类型描述
const getDiscountTypeDescription = (template) => {
  if (template.discount_type === 'percentage') {
    return `-${template.discount_value}%`
  } else if (template.discount_type === 'fixed') {
    return `-Rp ${formatCurrency(template.discount_value)}`
  } else if (template.discount_type === 'free') {
    return '免费'
  }
  return ''
}

// 🆕 格式化支付记录中的图片数据
const formatPaymentImages = (payment) => {
  if (!payment.payment_proof_images) return []
  
  // 如果是字符串数组，需要解析JSON
  if (Array.isArray(payment.payment_proof_images)) {
    return payment.payment_proof_images.map((img, index) => {
      if (typeof img === 'string') {
        try {
          const parsed = JSON.parse(img)
          return {
            id: parsed.id || `img_${index}`,
            image_url: parsed.image_url || parsed.url,
            image_name: parsed.image_name || parsed.name || `凭证${index + 1}`,
            image_type: parsed.image_type || parsed.type || 'proof',
            sort_order: parsed.sort_order || index
          }
        } catch (e) {
          // 如果解析失败，假设它就是URL字符串
          return {
            id: `img_${index}`,
            image_url: img,
            image_name: `凭证${index + 1}`,
            image_type: 'proof',
            sort_order: index
          }
        }
      } else if (typeof img === 'object') {
        return {
          id: img.id || `img_${index}`,
          image_url: img.image_url || img.url,
          image_name: img.image_name || img.name || `凭证${index + 1}`,
          image_type: img.image_type || img.type || 'proof',
          sort_order: img.sort_order || index
        }
      }
      return null
    }).filter(Boolean)
  }
  
  return []
}
</script>

<style lang="scss" scoped>
.payment-query-view {
  padding: 24px;
  background: #f5f5f5;
  min-height: 100vh;

  .page-header {
    margin-bottom: 24px;

    h1 {
      font-size: 24px;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 8px 0;
      display: flex;
      align-items: center;
      gap: 12px;

      .anticon {
        color: #3b82f6;
      }
    }

    p {
      margin: 0;
      color: #6b7280;
      font-size: 14px;
    }
  }

  .filter-card,
  .orders-card {
    margin-bottom: 24px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  }

  .card-title {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  // 表格内容样式
  .order-info {
    .order-id {
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 12px;
      color: #6b7280;
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      margin-bottom: 4px;
    }

    .order-type {
      font-weight: 500;
      color: #3b82f6;
      margin-bottom: 2px;
    }

    .order-date {
      font-size: 12px;
      color: #6b7280;
    }
  }

  .customer-info {
    .customer-name {
      font-weight: 500;
      margin-bottom: 4px;
    }

    .customer-phone,
    .player-count {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 2px;
    }
  }

  .game-info {
    .game-name {
      font-weight: 500;
      margin-bottom: 4px;
      color: #1f2937;
    }

    .game-time,
    .store-name {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 2px;
    }
  }

  .payment-info {
    .total-amount {
      font-size: 16px;
      font-weight: 600;
      color: #059669;
      margin-bottom: 4px;
    }

    .multi-payment-tag {
      margin-top: 4px;
    }
  }

  // 支付详情弹窗样式
  .payment-details {
    .order-summary {
      margin-bottom: 24px;
    }

    .player-name,
    .payer-name {
      font-weight: 500;
      margin-bottom: 4px;
    }

    .player-phone,
    .payer-phone {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #666;
    }

    .original-amount {
      font-size: 12px;
      color: #999;
      text-decoration: line-through;
      margin-bottom: 2px;
    }

    .final-amount {
      font-weight: 500;
      color: #52c41a;
      margin-bottom: 2px;
    }

    .discount-amount {
      font-size: 12px;
      color: #ff4d4f;
    }

    .amount {
      font-weight: 500;
      color: #52c41a;
    }

    .covers-count {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }
  }

  // 🤖 AI识别相关样式
  .ai-recognition-info {
    .confidence-score {
      font-size: 11px;
      color: #666;
      margin-top: 2px;
    }

    // 🆕 表格中AI识别信息的样式
    .ai-amount {
      display: flex;
      align-items: center;
      margin-bottom: 4px;
      
      .amount-label {
        font-size: 11px;
        color: #666;
        margin-right: 4px;
      }
      
      .amount-value {
        font-size: 12px;
        font-weight: 500;
        color: #52c41a;
      }
    }

    .ai-confidence {
      display: flex;
      align-items: center;
      
      .confidence-label {
        font-size: 11px;
        color: #666;
        margin-right: 4px;
      }
      
      .confidence-value {
        font-size: 11px;
        font-weight: 500;
        color: #1890ff;
      }
    }

    .no-ai-data {
      display: flex;
      justify-content: center;
    }
  }

  // 🤖 AI识别金额列样式
  .ai-amount-cell {
    .ai-amount-value {
      display: flex;
      flex-direction: column;
      gap: 2px;
      
      .ai-label {
        font-size: 10px;
        color: #999;
      }
      
      .amount-text {
        font-size: 12px;
        font-weight: 500;
        color: #52c41a;
      }
    }
    
    .ai-amount-empty {
      display: flex;
      flex-direction: column;
      gap: 2px;
      
      .ai-label {
        font-size: 10px;
        color: #999;
      }
      
      .no-amount {
        font-size: 11px;
        color: #ccc;
      }
    }
    
    .ai-amount-pending {
      display: flex;
      justify-content: center;
    }
  }

  .ai-recognition-results {
    .recognition-details {
      margin-top: 12px;

      h5 {
        margin: 8px 0 4px 0;
        font-size: 12px;
        color: #666;
      }

      .result-item {
        .result-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .result-content {
          .recognition-summary {
            background: #f8f9fa;
            border-radius: 4px;
            padding: 8px;
            margin-bottom: 8px;
            
            .amount-highlight {
              color: #52c41a;
              font-weight: 500;
            }
          }
          
          .raw-data {
            margin: 0;
            font-size: 10px;
            white-space: pre-wrap;
            word-break: break-all;
            background: #f8f9fa;
            padding: 8px;
            border-radius: 4px;
            max-height: 200px;
            overflow-y: auto;
          }
        }

        .error-content {
          margin-top: 4px;
        }
      }
    }

    .no-recognition-data {
      text-align: center;
      padding: 40px 0;
    }
    
    .pending-recognition {
      margin-top: 12px;
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .payment-query-view {
    padding: 16px;

    .filter-card .ant-form {
      .ant-form-item {
        margin-bottom: 16px;
      }
    }
  }
}
</style> 