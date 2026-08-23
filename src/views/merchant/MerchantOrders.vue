<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">订单管理</h1>
        <p class="desc">支付成功后 30 分钟内选择商家自配或发大厅；超时自动进大厅。整单商品分类均为「团购」时无需配送，需先核实；通过或超时未核实均进入冻结期再结算。</p>
      </div>
    </div>

    <div class="toolbar">
      <select v-model="filters.orderStatus" class="select" @change="reload">
        <option value="">全部状态</option>
        <option v-for="opt in ORDER_STATUS_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
      <div class="dateRange">
        <input
          v-model="filters.startDate"
          type="date"
          class="input dateInput"
          :class="{ empty: !filters.startDate }"
          @change="reload"
        />
        <span class="sep">至</span>
        <input
          v-model="filters.endDate"
          type="date"
          class="input dateInput"
          :class="{ empty: !filters.endDate }"
          @change="reload"
        />
      </div>
      <button class="btnGhost" :disabled="loading" @click="reload">查询</button>
    </div>

    <div class="panel">
      <div v-if="loading" class="loading">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <p v-else-if="success" class="success">{{ success }}</p>
      <template v-else>
        <div v-if="orders.length && isMobile" class="mobileList">
          <article v-for="order in orders" :key="order.id" class="mobileCard">
            <div class="mobileCardHead">
              <strong>{{ order.residentName || '—' }}</strong>
              <span class="tag" :class="statusClass(order)">{{ statusLabel(order) }}</span>
            </div>
            <p class="mobileMeta">{{ itemsSummary(order) }}</p>
            <div class="mobileDetails">
              <span>金额 ¥{{ formatMoney(order.totalAmount) }}</span>
              <span>{{ paymentSummary(order) }}</span>
              <span>{{ order.createdAt || '—' }}</span>
              <span>{{ order.deliveryAddress || '—' }}</span>
            </div>
            <div class="mobileActions">
              <button class="linkBtn" @click="openDetail(order.id)">详情</button>
              <button
                v-if="canMerchantVerify(order)"
                class="linkBtn"
                :disabled="verifyId === order.id"
                @click="openVerify(order)"
              >核实</button>
              <button
                v-if="canMerchantChoose(order)"
                class="linkBtn"
                :disabled="chooseId === order.id"
                @click="chooseFulfillment(order.id, FULFILLMENT_MODE.MERCHANT_SELF)"
              >商家自配</button>
              <button
                v-if="canMerchantChoose(order)"
                class="linkBtn"
                :disabled="chooseId === order.id"
                @click="chooseFulfillment(order.id, FULFILLMENT_MODE.COURIER_HALL)"
              >发大厅</button>
              <button
                v-if="canMerchantConfirmDelivery(order)"
                class="linkBtn"
                :disabled="confirmId === order.id"
                @click="confirmMerchantArrival(order)"
              >确认送达</button>
              <button
                v-if="canAssignCourier(order) && canDeliver(order)"
                class="linkBtn"
                :disabled="actionId === order.id || hasCourier(order)"
                @click="openAssign(order.id, order.deliveryId ?? undefined)"
              >开始配送</button>
              <button
                v-if="canCompleteOrder(order)"
                class="linkBtn"
                :disabled="completeId === order.id"
                @click="completeOrder(order.id)"
              >
                {{ completeId === order.id ? '完成中...' : '确认完成' }}
              </button>
            </div>
          </article>
        </div>
        <table v-else-if="orders.length" class="table">
          <thead>
            <tr>
              <th>顾客</th>
              <th>商品</th>
              <th>金额</th>
              <th>支付</th>
              <th>配送地址</th>
              <th>状态</th>
              <th>履约</th>
              <th>下单时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in orders" :key="order.id">
              <td>{{ order.residentName || '—' }}</td>
              <td class="itemsCell"><span class="itemsText">{{ itemsSummary(order) }}</span></td>
              <td class="amountCell">
                <div class="cellStack">
                  <div>¥{{ formatMoney(order.totalAmount) }}</div>
                  <div class="sub">{{ order.deliveryFee != null ? `含配送 ¥${formatMoney(order.deliveryFee)}` : '\u00A0' }}</div>
                </div>
              </td>
              <td class="payCell">{{ paymentSummary(order) }}</td>
              <td>{{ order.deliveryAddress || '—' }}</td>
              <td>
                <span class="tag" :class="statusClass(order)">{{ statusLabel(order) }}</span>
              </td>
              <td>{{ fulfillmentModeLabelOf(order) }}</td>
              <td>{{ order.createdAt || '—' }}</td>
              <td class="actions">
                <div class="actionsInner">
                  <button class="linkBtn" @click="openDetail(order.id)">详情</button>
                  <button
                    v-if="canMerchantVerify(order)"
                    class="linkBtn"
                    :disabled="verifyId === order.id"
                    @click="openVerify(order)"
                  >核实</button>
                  <button
                    v-if="canMerchantChoose(order)"
                    class="linkBtn"
                    :disabled="chooseId === order.id"
                    @click="chooseFulfillment(order.id, FULFILLMENT_MODE.MERCHANT_SELF)"
                  >商家自配</button>
                  <button
                    v-if="canMerchantChoose(order)"
                    class="linkBtn"
                    :disabled="chooseId === order.id"
                    @click="chooseFulfillment(order.id, FULFILLMENT_MODE.COURIER_HALL)"
                  >发大厅</button>
                  <button
                    v-if="canMerchantConfirmDelivery(order)"
                    class="linkBtn"
                    :disabled="confirmId === order.id"
                    @click="confirmMerchantArrival(order)"
                  >确认送达</button>
                  <button
                    v-if="canAssignCourier(order)"
                    class="linkBtn"
                    :class="{ greyed: !canDeliver(order) || hasCourier(order) }"
                    :disabled="actionId === order.id || !canDeliver(order) || hasCourier(order)"
                    @click="openAssign(order.id, order.deliveryId ?? undefined)"
                  >
                    {{ actionId === order.id ? '处理中...' : '开始配送' }}
                  </button>
                  <button
                    v-if="canCompleteOrder(order)"
                    class="linkBtn"
                    :disabled="completeId === order.id"
                    @click="completeOrder(order.id)"
                  >
                    {{ completeId === order.id ? '完成中...' : '确认完成' }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="empty">暂无订单</p>
        <div v-if="totalPages > 1" class="pagination">
          <button class="pageBtn" :disabled="page <= 1" @click="changePage(page - 1)">&lt;</button>
          <span class="pageInfo">{{ page }} / {{ totalPages }}（共 {{ total }} 条）</span>
          <button class="pageBtn" :disabled="page >= totalPages" @click="changePage(page + 1)">&gt;</button>
        </div>
      </template>
    </div>

    <Teleport to="body">
      <div v-if="detailOpen" class="modalOverlay" @click.self="closeDetail">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">订单详情</h3>
            <button class="modalClose" @click="closeDetail">&times;</button>
          </div>
          <div class="modalBody">
            <div v-if="detailLoading" class="loading">加载详情中...</div>
            <p v-else-if="detailError" class="error">{{ detailError }}</p>
            <template v-else-if="detail">
              <div class="detailHead">
                <div>
                  <div class="orderNo">{{ detail.orderNo || detail.id }}</div>
                  <div class="meta">下单时间：{{ detail.createdAt || '—' }}</div>
                </div>
                <span class="tag large" :class="statusClass(detail)">{{ statusLabel(detail) }}</span>
              </div>

              <section class="section">
                <h4 class="sectionTitle">顾客信息</h4>
                <ul class="infoGrid">
                  <li><span>顾客</span><strong>{{ detail.residentName || '—' }}</strong></li>
                  <li><span>联系电话</span><strong>{{ detail.contactPhone || '—' }}</strong></li>
                  <li><span>配送地址</span><strong>{{ detail.deliveryAddress || '—' }}</strong></li>
                  <li><span>备注</span><strong>{{ detail.remark || '—' }}</strong></li>
                </ul>
              </section>

              <section class="section">
                <h4 class="sectionTitle">商品明细</h4>
                <div v-if="detail.items?.length && isMobile" class="mobileItemList">
                  <div v-for="(item, index) in detail.items" :key="item.productId || index" class="mobileItem">
                    <div class="productCell">
                      <img v-if="item.coverUrl" :src="item.coverUrl" :alt="item.productName" class="coverThumb" />
                      <span v-else class="coverPlaceholder">无图</span>
                      <span>{{ item.productName || '—' }}</span>
                    </div>
                    <span>¥{{ formatMoney(item.price) }} × {{ item.quantity ?? '—' }}</span>
                    <strong>¥{{ formatMoney(item.subtotal ?? (item.price || 0) * (item.quantity || 0)) }}</strong>
                  </div>
                </div>
                <table v-else-if="detail.items?.length" class="itemTable">
                  <thead>
                    <tr>
                      <th>商品</th>
                      <th>单价</th>
                      <th>数量</th>
                      <th>小计</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, index) in detail.items" :key="item.productId || index">
                      <td>
                        <div class="productCell">
                          <img
                            v-if="item.coverUrl"
                            :src="item.coverUrl"
                            :alt="item.productName"
                            class="coverThumb"
                          />
                          <span v-else class="coverPlaceholder">无图</span>
                          <span>{{ item.productName || '—' }}</span>
                        </div>
                      </td>
                      <td>¥{{ formatMoney(item.price) }}</td>
                      <td>{{ item.quantity ?? '—' }}</td>
                      <td>¥{{ formatMoney(item.subtotal ?? (item.price || 0) * (item.quantity || 0)) }}</td>
                    </tr>
                  </tbody>
                </table>
                <p v-else class="muted">暂无商品明细</p>
              </section>

              <section class="section">
                <h4 class="sectionTitle">费用与支付</h4>
                <ul class="infoGrid">
                  <li><span>商品金额</span><strong>¥{{ formatMoney(detail.productAmount) }}</strong></li>
                  <li><span>原配送费</span><strong>¥{{ formatMoney(detail.originalDeliveryFee) }}</strong></li>
                  <li><span>满额配送费减免</span><strong>¥{{ formatMoney(detail.deliveryWaiverAmount) }}</strong></li>
                  <li><span>用户实际配送费</span><strong>¥{{ formatMoney(detail.deliveryFee) }}</strong></li>
                  <li><span>应付总额</span><strong>¥{{ formatMoney(detail.totalAmount) }}</strong></li>
                  <li><span>减免承担方</span><strong>{{ sponsorLabel(detail.deliverySubsidySponsor) }}</strong></li>
                  <li><span>配送补贴</span><strong>¥{{ formatMoney(detail.deliverySubsidyAmount) }}</strong></li>
                  <li><span>配送结算基数</span><strong>¥{{ formatMoney(detail.deliverySettlementBase) }}</strong></li>
                  <li><span>支付方式</span><strong>{{ paymentMethodLabel(detail.paymentMethod) }}</strong></li>
                  <li><span>积分抵扣</span><strong>{{ detail.pointUsed ?? 0 }} 积分</strong></li>
                  <li><span>物业币</span><strong>¥{{ formatMoney(detail.coinUsed) }}</strong></li>
                  <li><span>现金</span><strong>¥{{ formatMoney(detail.cashAmount) }}</strong></li>
                </ul>
              </section>

              <section class="section">
                <h4 class="sectionTitle">分账预览（账面试算）</h4>
                <p class="calcHint">
                  按订单 ID 调用 GET /distribution/calculate，由后端读取下单快照；前端不重算正式金额。
                </p>
                <p v-if="calcLoading" class="muted">试算中...</p>
                <p v-else-if="calcError" class="error">{{ calcError }}</p>
                <template v-else-if="calcResult">
                  <ul class="infoGrid">
                    <li><span>商品金额</span><strong>¥{{ formatMoney(calcResult.productAmount) }}</strong></li>
                    <li><span>抽佣比例</span><strong>{{ formatRate(calcResult.commissionRate) }}</strong></li>
                    <li><span>商家商品实得</span><strong>¥{{ formatMoney(calcResult.merchantGoodsShare) }}</strong></li>
                    <li><span>商家配送补贴</span><strong>¥{{ formatMoney(calcResult.merchantDeliverySubsidy) }}</strong></li>
                    <li><span>商家商品结算</span><strong>¥{{ formatMoney(calcResult.merchantShare) }}</strong></li>
                    <li>
                      <span>抽佣基础额</span>
                      <strong>¥{{ formatMoney(calcResult.commissionBaseAmount) }}</strong>
                    </li>
                    <li><span>积分成本</span><strong>¥{{ formatMoney(calcResult.pointCost) }}</strong></li>
                    <li><span>物业币成本</span><strong>¥{{ formatMoney(calcResult.coinCost) }}</strong></li>
                    <li>
                      <span>实际可分配平台盘</span>
                      <strong>¥{{ formatMoney(calcResult.distributableAmount) }}</strong>
                    </li>
                    <li><span>成本击穿差额</span><strong>¥{{ formatMoney(calcResult.deficitAmount) }}</strong></li>
                    <li><span>击穿承担方</span><strong>{{ sponsorLabel(calcResult.deficitSponsor) }}</strong></li>
                    <li><span>商家调整额</span><strong>¥{{ formatMoney(calcResult.merchantAdjustmentAmount) }}</strong></li>
                    <li><span>公司商品收入</span><strong>¥{{ formatMoney(calcResult.platformShare) }}</strong></li>
                    <li><span>物业</span><strong>¥{{ formatMoney(calcResult.propertyShare) }}</strong></li>
                    <li><span>管理盘</span><strong>¥{{ formatMoney(calcResult.managementPoolAmount) }}</strong></li>
                    <li v-if="calcResult.coordinatorShare != null">
                      <span>统筹</span>
                      <strong>¥{{ formatMoney(calcResult.coordinatorShare) }}</strong>
                    </li>
                    <li v-if="calcResult.sectorLeaderShare != null">
                      <span>板块负责人</span>
                      <strong>¥{{ formatMoney(calcResult.sectorLeaderShare) }}</strong>
                    </li>
                    <li v-if="calcResult.individualLeaderShare != null">
                      <span>个体负责人</span>
                      <strong>¥{{ formatMoney(calcResult.individualLeaderShare) }}</strong>
                    </li>
                  </ul>
                  <h5 class="sectionTitle">配送分账</h5>
                  <ul class="infoGrid">
                    <li><span>原配送费</span><strong>¥{{ formatMoney(calcResult.originalDeliveryFee) }}</strong></li>
                    <li><span>用户配送费</span><strong>¥{{ formatMoney(calcResult.deliveryFee) }}</strong></li>
                    <li><span>补贴承担方</span><strong>{{ sponsorLabel(calcResult.deliverySubsidySponsor) }}</strong></li>
                    <li><span>配送补贴</span><strong>¥{{ formatMoney(calcResult.deliverySubsidyAmount) }}</strong></li>
                    <li><span>配送结算基数</span><strong>¥{{ formatMoney(calcResult.deliverySettlementBase) }}</strong></li>
                    <li><span>公司配送收入</span><strong>¥{{ formatMoney(calcResult.platformDeliveryShare) }}</strong></li>
                    <li><span>配送员收入</span><strong>¥{{ formatMoney(calcResult.courierEarning) }}</strong></li>
                    <li><span>商家配送费分成</span><strong>¥{{ formatMoney(calcResult.merchantDeliveryFeeShare) }}</strong></li>
                  </ul>
                  <p class="calcHint">
                    商品分账与配送分账相互独立。大厅：配送员拿剩余配送费，商家配送费分成=0；自配相反。金额以后端为准，不要把 merchantShare 与 merchantDeliveryFeeShare 合成一列。
                  </p>
                </template>
                <p v-else class="muted">暂无试算结果</p>
              </section>

              <section class="section">
                <FulfillmentPanel
                  :order="detail"
                  variant="merchant"
                  :busy="Boolean(chooseId || confirmId)"
                  @choose="(mode) => chooseFulfillment(detail.id, mode)"
                  @confirm-delivery="confirmMerchantArrival(detail)"
                />
              </section>

              <section class="section">
                <h4 class="sectionTitle">配送与进度</h4>
                <ul class="infoGrid">
                  <li><span>配送员</span><strong>{{ detail.courierName || '—' }}</strong></li>
                  <li><span>配送单号</span><strong>{{ detail.deliveryId || '—' }}</strong></li>
                  <li><span>支付时间</span><strong>{{ detail.paidAt || '—' }}</strong></li>
                  <li><span>核实时间</span><strong>{{ detail.verifiedAt || '—' }}</strong></li>
                  <li><span>冻结截止</span><strong>{{ detail.freezeEndDate || '—' }}</strong></li>
                  <li><span>完成时间</span><strong>{{ detail.completedAt || '—' }}</strong></li>
                  <li><span>取消时间</span><strong>{{ detail.cancelledAt || '—' }}</strong></li>
                  <li><span>更新时间</span><strong>{{ detail.updatedAt || '—' }}</strong></li>
                </ul>
              </section>
            </template>
          </div>
          <div v-if="detail" class="modalFooter">
            <button
              v-if="canMerchantVerify(detail)"
              class="btnPrimary"
              :disabled="verifyId === detail.id"
              @click="openVerify(detail)"
            >核实订单</button>
            <button
              v-if="canMerchantChoose(detail)"
              class="btnPrimary"
              :disabled="chooseId === detail.id"
              @click="chooseFulfillment(detail.id, FULFILLMENT_MODE.MERCHANT_SELF)"
            >商家自配</button>
            <button
              v-if="canMerchantChoose(detail)"
              class="btnPrimary"
              :disabled="chooseId === detail.id"
              @click="chooseFulfillment(detail.id, FULFILLMENT_MODE.COURIER_HALL)"
            >发大厅</button>
            <button
              v-if="canMerchantConfirmDelivery(detail)"
              class="btnPrimary"
              :disabled="confirmId === detail.id"
              @click="confirmMerchantArrival(detail)"
            >确认送达</button>
            <button
              v-if="canAssignCourier(detail)"
              class="btnPrimary"
              :class="{ greyed: !canDeliver(detail) || hasCourier(detail) }"
              :disabled="actionId === detail.id || !canDeliver(detail) || hasCourier(detail)"
              @click="markDeliveringFromDetail"
            >
              {{ actionId === detail.id ? '处理中...' : '开始配送' }}
            </button>
            <button
              v-if="canCompleteOrder(detail)"
              class="btnPrimary"
              :disabled="completeId === detail.id"
              @click="completeOrder(detail.id)"
            >
              {{ completeId === detail.id ? '完成中...' : '确认完成' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="verifyOpen" class="modalOverlay" @click.self="closeVerify">
        <div class="modal assignModal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">核实订单</h3>
            <button class="modalClose" @click="closeVerify">&times;</button>
          </div>
          <div class="modalBody">
            <p class="calcHint">仅整单均为团购商品的待核实订单可操作。通过后进入冻结期；拒绝将取消并退款；超时未核实由系统自动视为通过。</p>
            <ul class="infoGrid">
              <li><span>订单</span><strong>{{ verifyTarget?.orderNo || verifyTarget?.id || '—' }}</strong></li>
              <li><span>顾客</span><strong>{{ verifyTarget?.residentName || '—' }}</strong></li>
              <li><span>金额</span><strong>¥{{ formatMoney(verifyTarget?.totalAmount) }}</strong></li>
            </ul>
            <p v-if="verifyError" class="error">{{ verifyError }}</p>
            <div class="verifyField">
              <label>核实结果</label>
              <div class="verifyRadios">
                <label>
                  <input v-model="verifyApproved" type="radio" :value="true" />
                  通过
                </label>
                <label>
                  <input v-model="verifyApproved" type="radio" :value="false" />
                  拒绝
                </label>
              </div>
            </div>
            <div class="verifyField">
              <label>{{ verifyApproved ? '备注（选填）' : '拒绝原因' }}</label>
              <textarea
                v-model="verifyReason"
                class="verifyTextarea"
                rows="3"
                maxlength="200"
                :placeholder="verifyApproved ? '核实备注' : '请填写拒绝原因'"
              />
            </div>
          </div>
          <div class="modalFooter">
            <button class="btnGhost" @click="closeVerify">取消</button>
            <button class="btnPrimary" :disabled="Boolean(verifyId)" @click="submitVerify">
              {{ verifyId ? '提交中...' : '确认提交' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 快递员指配弹窗 -->
      <div v-if="assignOpen" class="modalOverlay" @click.self="closeAssign">
        <div class="modal assignModal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">选择配送员</h3>
            <button class="modalClose" @click="closeAssign">&times;</button>
          </div>
          <div class="modalBody">
            <div v-if="assignLoading" class="loading">加载配送员列表...</div>
            <p v-else-if="assignError" class="error">{{ assignError }}</p>
            <div v-else-if="couriers.length === 0" class="empty">暂无可用配送员</div>
            <ul v-else class="courierList">
              <li
                v-for="courier in couriers"
                :key="courier.id"
                class="courierItem"
                :class="{ selected: selectedCourierId === (courier.courierId || courier.id) }"
                @click="selectedCourierId = courier.courierId || courier.id"
              >
                <span class="courierRadio" :class="{ checked: selectedCourierId === (courier.courierId || courier.id) }" />
                <span class="courierName">{{ courier.courierName || courier.id }}</span>
              </li>
            </ul>
          </div>
          <div class="modalFooter">
            <button class="btnGhost" @click="closeAssign">取消</button>
            <button
              class="btnPrimary"
              :disabled="!selectedCourierId || actionId === (assignTarget?.orderId || '')"
              @click="confirmAssign"
            >
              {{ actionId === (assignTarget?.orderId || '') ? '指派中...' : '确认指派' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { distributionApi, merchantPortalApi } from '../../api/services'
import type { DeliveryTaskItem, DistributionCalculateResult, OrderItem } from '../../api/types'
import { ApiError, formatApiError } from '../../api/request'
import FulfillmentPanel from '../../components/FulfillmentPanel.vue'
import {
  DELIVERY_SUBSIDY_SPONSOR_LABEL,
  FULFILLMENT_MODE,
  getEnumLabel,
  ORDER_STATUS,
  ORDER_STATUS_LABEL,
  ORDER_STATUS_OPTIONS,
  PAYMENT_METHOD_LABEL
} from '../../constants/enums'
import { useIsMobile } from '../../composables/useIsMobile'
import {
  canAssignCourier,
  canMerchantChoose,
  canMerchantConfirmDelivery,
  canMerchantVerify,
  fulfillmentModeLabelOf
} from '../../utils/fulfillment'

const { isMobile } = useIsMobile()

const orders = ref<OrderItem[]>([])
const loading = ref(false)
const error = ref('')
const success = ref('')
const page = ref(1)
const totalPages = ref(1)
const total = ref(0)
const actionId = ref('')
const chooseId = ref('')
const confirmId = ref('')
const completeId = ref('')
const verifyId = ref('')
const verifyOpen = ref(false)
const verifyTarget = ref<OrderItem | null>(null)
const verifyApproved = ref(true)
const verifyReason = ref('')
const verifyError = ref('')
const filters = reactive({ orderStatus: '', startDate: '', endDate: '' })

const detailOpen = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detail = ref<OrderItem | null>(null)
const calcLoading = ref(false)
const calcError = ref('')
const calcResult = ref<DistributionCalculateResult | null>(null)

/** 快递员指配弹窗 */
const assignOpen = ref(false)
const assignLoading = ref(false)
const assignError = ref('')
const couriers = ref<DeliveryTaskItem[]>([])
const selectedCourierId = ref('')
const assignTarget = ref<{ orderId: string; deliveryId: string } | null>(null)

function formatMoney(value?: number | null) {
  if (value === undefined || value === null) return '0.00'
  return Number(value).toFixed(2)
}

function formatRate(rate?: number | null) {
  if (rate === undefined || rate === null || Number.isNaN(Number(rate))) return '—'
  return `${(Number(rate) * 100).toFixed(2)}%`
}

function orderStatus(order: OrderItem) {
  return order.orderStatus || order.status || ''
}

function statusLabel(order: OrderItem) {
  return getEnumLabel(ORDER_STATUS_LABEL, orderStatus(order))
}

function statusClass(order: OrderItem) {
  const status = orderStatus(order)
  if (status === ORDER_STATUS.PAID) return 'paid'
  if (status === ORDER_STATUS.PENDING_VERIFICATION) return 'pendingVerification'
  if (status === ORDER_STATUS.VERIFIED) return 'verified'
  if (status === ORDER_STATUS.DELIVERING) return 'delivering'
  if (status === ORDER_STATUS.COMPLETED) return 'completed'
  if (status === ORDER_STATUS.CANCELLED || status === ORDER_STATUS.REFUNDED || status === ORDER_STATUS.REFUND_REJECTED) return 'cancelled'
  if (status === ORDER_STATUS.REFUNDING) return 'refunding'
  return ''
}

function paymentMethodLabel(method?: string) {
  return getEnumLabel(PAYMENT_METHOD_LABEL, method, method || '—')
}

function sponsorLabel(sponsor?: string) {
  return getEnumLabel(DELIVERY_SUBSIDY_SPONSOR_LABEL, sponsor, sponsor || '—')
}

function itemsSummary(order: OrderItem) {
  if (order.items?.length) {
    return order.items
      .map((item) => `${item.productName || '商品'}×${item.quantity ?? 1}`)
      .join('、')
  }
  return order.productSummary || '—'
}

function paymentSummary(order: OrderItem) {
  return order.paymentMethod || '—'
}

/** 平台配送且未接单时，可指派配送员 */
function canDeliver(order: OrderItem) {
  const status = orderStatus(order)
  return (
    canAssignCourier(order) &&
    (status === ORDER_STATUS.PAID || status === ORDER_STATUS.DELIVERING)
  )
}

/** 订单已有配送员（已有人接单），按钮显示为灰色不可点击 */
function hasCourier(order: OrderItem) {
  return !!(order.courierId || order.courierName)
}

/** 自配进行中先确认送达；完成后才允许标订单完成，避免 70024 绕过送达 */
function canCompleteOrder(order: OrderItem) {
  return orderStatus(order) === ORDER_STATUS.DELIVERING && !canMerchantConfirmDelivery(order)
}

async function load(pageNo = 1) {
  loading.value = true
  error.value = ''
  success.value = ''
  try {
    const res = await merchantPortalApi.orders({
      page: pageNo,
      pageSize: 20,
      orderStatus: filters.orderStatus || undefined,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      sort: '-createdAt'
    })
    orders.value = res.list || []
    page.value = res.pagination?.page || pageNo
    totalPages.value = res.pagination?.totalPages || 1
    total.value = res.pagination?.total ?? orders.value.length
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '订单加载失败'
  } finally {
    loading.value = false
  }
}

function reload() {
  load(1)
}

function changePage(next: number) {
  load(next)
}

async function openDetail(id: string) {
  detailOpen.value = true
  detailLoading.value = true
  detailError.value = ''
  detail.value = null
  calcResult.value = null
  calcError.value = ''
  try {
    detail.value = await merchantPortalApi.getOrder(id)
    void loadCalculatePreview(detail.value)
  } catch (e) {
    detailError.value = e instanceof ApiError ? e.message : '订单详情加载失败'
  } finally {
    detailLoading.value = false
  }
}

async function loadCalculatePreview(order: OrderItem) {
  if (!order.id) {
    calcError.value = '缺少订单 ID，无法按订单快照试算'
    return
  }
  calcLoading.value = true
  calcError.value = ''
  try {
    calcResult.value = await distributionApi.calculate({
      orderId: order.id
    })
  } catch (e) {
    calcResult.value = null
    calcError.value = formatApiError(e, '分账试算失败')
  } finally {
    calcLoading.value = false
  }
}

function closeDetail() {
  detailOpen.value = false
  detail.value = null
  detailError.value = ''
  calcResult.value = null
  calcError.value = ''
  calcLoading.value = false
}

/** 打开快递员指配弹窗 */
async function openAssign(orderId: string, deliveryId?: string) {
  // 列表行可能没有 deliveryId，从详情补查
  if (!deliveryId) {
    try {
      const order = await merchantPortalApi.getOrder(orderId)
      deliveryId = order.deliveryId || undefined
    } catch { /* 后续弹窗显示错误 */ }
  }
  if (!deliveryId) {
    error.value = '该订单暂无配送单，请先发送配送任务'
    return
  }
  assignTarget.value = { orderId, deliveryId }
  selectedCourierId.value = ''
  assignError.value = ''
  assignOpen.value = true
  assignLoading.value = true
  couriers.value = []
  try {
    const res = await merchantPortalApi.couriers({ page: 1, pageSize: 50 })
    couriers.value = res.list || []
    if (couriers.value.length === 1) {
      selectedCourierId.value = couriers.value[0].courierId || couriers.value[0].id
    }
  } catch (e) {
    assignError.value = e instanceof ApiError ? e.message : '获取快递员列表失败'
  } finally {
    assignLoading.value = false
  }
}

function closeAssign() {
  assignOpen.value = false
  assignTarget.value = null
  selectedCourierId.value = ''
  assignError.value = ''
}

/** 确认指派配送员 */
async function confirmAssign() {
  if (!assignTarget.value || !selectedCourierId.value) return
  const { orderId, deliveryId } = assignTarget.value
  actionId.value = orderId
  assignError.value = ''
  try {
    await merchantPortalApi.assignDelivery(deliveryId, selectedCourierId.value)
    await merchantPortalApi.updateOrderStatus(orderId, ORDER_STATUS.DELIVERING)
    success.value = '配送员已指派'
    await load(page.value)
    if (detail.value?.id === orderId) {
      detail.value = await merchantPortalApi.getOrder(orderId)
    }
    closeAssign()
  } catch (e) {
    assignError.value = e instanceof ApiError ? e.message : '指派配送员失败'
  } finally {
    actionId.value = ''
  }
}

async function markDeliveringFromDetail() {
  if (!detail.value || !detail.value.deliveryId) return
  openAssign(detail.value.id, detail.value.deliveryId)
}

async function chooseFulfillment(id: string, mode: string) {
  if (chooseId.value) return
  chooseId.value = id
  error.value = ''
  success.value = ''
  try {
    const res = await merchantPortalApi.chooseFulfillment(id, mode)
    success.value = res?.statusLabel || (mode === FULFILLMENT_MODE.MERCHANT_SELF ? '已选商家自配' : '已发大厅')
    await load(page.value)
    if (detail.value?.id === id) {
      detail.value = await merchantPortalApi.getOrder(id)
    }
  } catch (e) {
    error.value = formatApiError(e, '选择履约方式失败')
  } finally {
    chooseId.value = ''
  }
}

async function confirmMerchantArrival(order: OrderItem) {
  if (!order.deliveryId || confirmId.value) return
  confirmId.value = order.id
  error.value = ''
  success.value = ''
  try {
    await merchantPortalApi.confirmMerchantDelivery(order.deliveryId)
    success.value = '已确认送达'
    await load(page.value)
    if (detail.value?.id === order.id) {
      detail.value = await merchantPortalApi.getOrder(order.id)
    }
  } catch (e) {
    error.value = formatApiError(e, '确认送达失败')
  } finally {
    confirmId.value = ''
  }
}

async function completeOrder(id: string) {
  if (completeId.value) return
  if (!window.confirm('确认将该订单标记为已完成？完成后本单收入将计入可提现。')) return
  completeId.value = id
  error.value = ''
  success.value = ''
  try {
    const order = await merchantPortalApi.completeOrder(id)
    const wallet = await merchantPortalApi.my().catch(() => null)
    const withdrawable = wallet?.withdrawableAmount
    const revenue = wallet?.totalRevenue
    success.value =
      withdrawable != null
        ? `订单已完成。可提现 ¥${formatMoney(Number(withdrawable))}${revenue != null ? ` · 累计收入 ¥${formatMoney(Number(revenue))}` : ''}`
        : '订单已完成，请打开提现页确认可提现余额'
    await load(page.value)
    if (detail.value?.id === id) {
      detail.value = order?.id ? order : await merchantPortalApi.getOrder(id)
    }
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '确认完成失败'
  } finally {
    completeId.value = ''
  }
}

function openVerify(order: OrderItem) {
  verifyTarget.value = order
  verifyApproved.value = true
  verifyReason.value = ''
  verifyError.value = ''
  verifyOpen.value = true
}

function closeVerify() {
  verifyOpen.value = false
  verifyTarget.value = null
  verifyError.value = ''
}

async function submitVerify() {
  if (!verifyTarget.value || verifyId.value) return
  if (!verifyApproved.value && !verifyReason.value.trim()) {
    verifyError.value = '拒绝时请填写原因'
    return
  }
  verifyId.value = verifyTarget.value.id
  const approved = verifyApproved.value
  verifyError.value = ''
  try {
    const res = await merchantPortalApi.verifyOrder(verifyTarget.value.id, {
      approved,
      reason: verifyReason.value.trim() || undefined
    })
    closeVerify()
    closeDetail()
    success.value = res.message || (approved ? '核实通过，已进入冻结期' : '已拒绝并退款')
    await load(page.value)
  } catch (e) {
    verifyError.value = formatApiError(e, '核实失败')
  } finally {
    verifyId.value = ''
  }
}

onMounted(() => load(1))
</script>

<style scoped>
.page { max-width: 1200px; }
.header { margin-bottom: 24px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.dateRange { display: flex; align-items: center; gap: 12px; min-width: 0; }
.select, .input { padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; font-size: 14px; }
.dateInput {
  padding: 6px 4px;
  width: 132px;
  box-sizing: border-box;
  line-height: 1.2;
}
.dateInput.empty {
  width: 132px;
  padding: 6px 4px;
  color: transparent;
}
.dateInput.empty::-webkit-datetime-edit,
.dateInput.empty::-webkit-datetime-edit-fields-wrapper {
  padding: 0;
  opacity: 0;
}
.dateInput.empty::-webkit-calendar-picker-indicator {
  opacity: 1;
  margin: 0;
  padding: 0;
  cursor: pointer;
}
.dateInput:not(.empty) {
  color: #1f1f2e;
  padding: 6px 8px;
}
.dateInput:not(.empty)::-webkit-datetime-edit {
  padding: 0;
}
.dateInput:not(.empty)::-webkit-calendar-picker-indicator {
  margin-left: 4px;
  cursor: pointer;
}
.btnGhost { padding: 8px 14px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; color: #5c5c66; font-size: 14px; cursor: pointer; }
.btnGhost:hover { border-color: #5c5c9e; color: #5c5c9e; }
.sep { color: #8c8c9a; font-size: 13px; }
.panel { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.loading, .empty, .error, .success { text-align: center; color: #8c8c9a; font-size: 14px; padding: 16px 0; }
.error { color: #e05c5c; }
.success { color: #389e0d; }
.table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.table th, .table td {
  padding: 8px 6px;
  text-align: left;
  font-size: 13px;
  vertical-align: middle;
  box-sizing: border-box;
}
.table th { color: #8c8c9a; font-weight: 500; border-bottom: 1px solid #f0f0f3; }
.table tbody tr { border-bottom: 1px solid #f0f0f3; }
.table tbody td { border-bottom: none; }
.table th:nth-child(1), .table td:nth-child(1) { width: 80px; }
.table th:nth-child(2), .table td:nth-child(2) { width: 150px; }
.table th:nth-child(3), .table td:nth-child(3) { width: 80px; }
.table th:nth-child(4), .table td:nth-child(4) { width: 100px; }
.table th:nth-child(5), .table td:nth-child(5) { width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.table th:nth-child(6), .table td:nth-child(6) { width: 64px; }
.table th:nth-child(7), .table td:nth-child(7) { width: 130px; }
.table th:nth-child(8), .table td:nth-child(8) { width: 160px; }
.mono { font-family: ui-monospace, monospace; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.itemsText {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
  word-break: break-all;
}
.payCell { line-height: 1.4; font-size: 12px; color: #5c5c66; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.amountCell { white-space: nowrap; }
.cellStack { display: flex; flex-direction: column; justify-content: center; gap: 2px; line-height: 1.3; }
.sub { font-size: 11px; color: #8c8c9a; min-height: 14px; }
.tag { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #f4f5f7; color: #5c5c66; font-size: 12px; white-space: nowrap; }
.tag.large { padding: 4px 12px; font-size: 13px; }
.tag.paid { background: #e6f4ff; color: #1677ff; }
.tag.pendingVerification { background: #fff7e6; color: #d48806; }
.tag.verified { background: #f9f0ff; color: #722ed1; }
.tag.delivering { background: #fff7e6; color: #d48806; }
.tag.completed { background: #f6ffed; color: #389e0d; }
.tag.cancelled { background: #fff1f0; color: #cf1322; }
.tag.refunding { background: #fff7e6; color: #d48806; }
.verifyField { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; font-size: 13px; color: #5c5c66; }
.verifyRadios { display: flex; gap: 16px; }
.verifyRadios label { display: flex; align-items: center; gap: 6px; cursor: pointer; color: #1f1f2e; }
.verifyTextarea { width: 100%; min-height: 72px; padding: 8px 10px; border: 1px solid #e8e8ec; border-radius: 8px; resize: vertical; }
.actions { height: 1px; }
.actionsInner {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  gap: 12px;
  white-space: nowrap;
}
.linkBtn {
  color: #5c5c9e;
  font-size: 13px;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  line-height: 1.4;
  flex-shrink: 0;
  text-decoration: none;
}
.linkBtn:disabled { opacity: 0.6; cursor: not-allowed; }
.linkBtn.greyed { color: #b0b0ba; cursor: not-allowed; }
.btnPrimary.greyed { background: #c8c8d0; cursor: not-allowed; }
.muted { color: #c8c8d0; font-size: 13px; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 16px; }
.pageBtn { padding: 6px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; cursor: pointer; }
.pageInfo { font-size: 13px; color: #8c8c9a; }
.modalOverlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
.modal { width: 720px; max-width: 100%; max-height: 90vh; background: #fff; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }
.modalHeader { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #f0f0f3; flex-shrink: 0; }
.modalTitle { font-size: 16px; font-weight: 600; }
.modalClose { font-size: 24px; color: #8c8c9a; cursor: pointer; background: none; border: none; }
.modalBody { padding: 24px; overflow-y: auto; }
.modalFooter { padding: 16px 24px 24px; border-top: 1px solid #f0f0f3; display: flex; justify-content: flex-end; flex-shrink: 0; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.btnPrimary:hover { background: #52529a; }
.detailHead { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 20px; }
.orderNo { font-size: 18px; font-weight: 600; color: #1f1f2e; margin-bottom: 6px; }
.meta { font-size: 13px; color: #8c8c9a; }
.section { margin-bottom: 20px; }
.sectionTitle { font-size: 14px; font-weight: 600; color: #1f1f2e; margin-bottom: 12px; }
.calcHint { margin: 0 0 10px; font-size: 12px; color: #8a6d1d; }
.deficitAmt { color: #c45c26 !important; }
.infoGrid { list-style: none; display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; }
.infoGrid li { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; padding: 8px 0; border-bottom: 1px solid #f7f7f9; }
.infoGrid span { color: #8c8c9a; flex-shrink: 0; }
.infoGrid strong { color: #1f1f2e; text-align: right; font-weight: 500; word-break: break-all; }
.itemTable { width: 100%; border-collapse: collapse; font-size: 13px; }
.itemTable th, .itemTable td { padding: 10px 8px; border-bottom: 1px solid #f0f0f3; text-align: left; }
.itemTable th { color: #8c8c9a; font-weight: 500; }
.productCell { display: flex; align-items: center; gap: 10px; }
.coverThumb { width: 40px; height: 40px; object-fit: cover; border-radius: 6px; border: 1px solid #f0f0f3; flex-shrink: 0; }
.coverPlaceholder { width: 40px; height: 40px; line-height: 40px; text-align: center; font-size: 10px; color: #8c8c9a; background: #f4f5f7; border-radius: 6px; flex-shrink: 0; }
.assignModal { width: 420px; max-width: 100%; }
.courierList { list-style: none; max-height: 320px; overflow-y: auto; padding: 0; margin: 0; }
.courierItem {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; cursor: pointer; border-radius: 8px; transition: background 0.15s;
}
.courierItem:hover { background: #f4f5f9; }
.courierItem.selected { background: #eef0ff; }
.courierRadio {
  width: 16px; height: 16px; border-radius: 50%; border: 2px solid #c8c8d0;
  flex-shrink: 0; transition: all 0.15s;
}
.courierRadio.checked { border-color: #5c5c9e; background: #5c5c9e; box-shadow: inset 0 0 0 3px #fff; }
.courierName { font-size: 14px; color: #1f1f2e; }
.mobileList { display: flex; flex-direction: column; gap: 12px; }
.mobileCard { border: 1px solid #ececf2; border-radius: 10px; padding: 14px; }
.mobileCardHead, .mobileActions { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.mobileMeta { margin: 10px 0; font-size: 14px; color: #3f3f4a; }
.mobileDetails { display: grid; gap: 6px; font-size: 12px; color: #8c8c9a; }
.mobileActions { justify-content: flex-start; flex-wrap: wrap; margin-top: 12px; }
.mobileItemList { display: flex; flex-direction: column; gap: 10px; }
.mobileItem { display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f3; font-size: 13px; }
.mobileItem .productCell { grid-column: 1 / -1; }
.mobileItem strong { text-align: right; }
.mobileSheet { max-width: 100%; border-radius: 18px 18px 0 0; margin-top: auto; }
@media (max-width: 640px) {
  .header { margin-bottom: 16px; }
  .toolbar { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .toolbar .select, .toolbar .btnGhost { width: 100%; min-height: 44px; }
  .toolbar .dateRange {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .toolbar .dateInput { width: 100%; min-width: 0; }
  .toolbar .sep { display: none; }
  .panel { padding: 14px; }
  .modalOverlay { align-items: flex-end; padding: 0; }
  .modal { max-height: 92vh; width: 100%; }
  .modalHeader, .modalBody { padding: 16px; }
  .modalFooter { flex-direction: column-reverse; padding: 12px 16px 16px; gap: 8px; }
  .modalFooter .btnSecondary, .modalFooter .btnPrimary, .modalFooter .btnDanger { width: 100%; min-height: 44px; }
  .infoGrid { grid-template-columns: 1fr; }
}
</style>
