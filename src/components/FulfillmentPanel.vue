<template>
  <section class="fulfillment">
    <h4 class="sectionTitle">履约</h4>
    <p v-if="order.requiresDelivery === false || fulfillmentModeOf(order) === FULFILLMENT_MODE.NONE" class="hint">
      无需配送（团购 / 社区食堂等），不出现履约选择。
    </p>
    <ul v-else class="infoGrid">
      <li>
        <span>履约方式</span>
        <strong>{{ fulfillmentModeLabelOf(order) }}</strong>
      </li>
      <li v-if="fulfillmentModeOf(order) === FULFILLMENT_MODE.PENDING_CHOICE">
        <span>选择截止</span>
        <strong :class="{ overdue: isChoiceOverdue(order) }">
          {{ order.fulfillmentDeadline || '—' }}
          <em v-if="isChoiceOverdue(order)">已超时，将自动改派平台配送</em>
        </strong>
      </li>
      <li>
        <span>选定时间</span>
        <strong>{{ order.fulfillmentChosenAt || '—' }}</strong>
      </li>
      <li>
        <span>配送单</span>
        <strong>{{ order.deliveryId || '—' }}</strong>
      </li>
      <li>
        <span>配送状态</span>
        <strong>{{ deliveryStatusText }}</strong>
      </li>
      <li>
        <span>承运</span>
        <strong>{{ carrierTypeLabelOf(order) }}</strong>
      </li>
    </ul>

    <p
      v-if="variant === 'merchant' && fulfillmentModeOf(order) === FULFILLMENT_MODE.COURIER_HALL"
      class="hint"
    >
      已选平台配送，订单在待抢大厅；无需再次发布。
    </p>

    <div v-if="variant === 'admin' && canAdminOverride(order)" class="actions">
      <button
        class="btnPrimary"
        :disabled="busy"
        @click="$emit('override', FULFILLMENT_MODE.MERCHANT_SELF)"
      >
        改派为商家自配
      </button>
      <button
        class="btnPrimary"
        :disabled="busy"
        @click="$emit('override', FULFILLMENT_MODE.COURIER_HALL)"
      >
        改派为平台配送
      </button>
    </div>

    <div v-if="variant === 'merchant'" class="actions">
      <button
        v-if="canMerchantChoose(order)"
        class="btnPrimary"
        :disabled="busy"
        @click="$emit('choose', FULFILLMENT_MODE.MERCHANT_SELF)"
      >
        商家自行配送
      </button>
      <button
        v-if="canMerchantChoose(order)"
        class="btnPrimary"
        :disabled="busy"
        @click="$emit('choose', FULFILLMENT_MODE.COURIER_HALL)"
      >
        发布到平台配送
      </button>
      <button
        v-if="canMerchantConfirmDelivery(order)"
        class="btnPrimary"
        :disabled="busy"
        @click="$emit('confirm-delivery')"
      >
        确认送达
      </button>
    </div>

    <div v-if="order.fulfillmentChoiceLogs?.length" class="logs">
      <h5 class="logTitle">履约记录</h5>
      <ul>
        <li v-for="(log, index) in order.fulfillmentChoiceLogs" :key="log.id || index">
          <strong>{{ fulfillmentActionLabel(log.action) }}</strong>
          <span>{{ log.operatorName || log.operatorId || '' }}</span>
          <span>{{ log.remark || '' }}</span>
          <span>{{ log.createdAt || '' }}</span>
        </li>
      </ul>
    </div>
    <p v-else-if="variant === 'admin'" class="hint">改派请填写备注；操作将写入履约改派审计日志。</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { OrderItem } from '../api/types'
import {
  DELIVERY_STATUS_LABEL,
  FULFILLMENT_MODE,
  getEnumLabel
} from '../constants/enums'
import {
  canAdminOverride,
  canMerchantChoose,
  canMerchantConfirmDelivery,
  carrierTypeLabelOf,
  fulfillmentActionLabel,
  fulfillmentModeLabelOf,
  fulfillmentModeOf,
  isChoiceOverdue
} from '../utils/fulfillment'

const props = defineProps<{
  order: OrderItem
  variant: 'admin' | 'merchant'
  busy?: boolean
}>()

defineEmits<{
  override: [mode: string]
  choose: [mode: string]
  'confirm-delivery': []
}>()

const deliveryStatusText = computed(() => {
  return (
    props.order.deliveryStatusLabel ||
    getEnumLabel(DELIVERY_STATUS_LABEL, props.order.deliveryStatus, '—')
  )
})
</script>

<style scoped>
.fulfillment { margin-top: 4px; }
.sectionTitle { font-size: 14px; font-weight: 600; color: #1f1f2e; margin: 0 0 12px; }
.infoGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
  margin: 0 0 12px;
  padding: 0;
  list-style: none;
}
.infoGrid li { display: flex; justify-content: space-between; gap: 12px; font-size: 13px; }
.infoGrid span { color: #8c8c9a; }
.infoGrid strong { color: #1f1f2e; text-align: right; }
.overdue { color: #cf1322; }
.overdue em { font-style: normal; margin-left: 6px; font-size: 12px; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
.btnPrimary {
  padding: 8px 14px;
  border-radius: 8px;
  background: #5c5c9e;
  color: #fff;
  border: none;
  cursor: pointer;
  font-size: 13px;
}
.btnPrimary:disabled { opacity: 0.5; cursor: not-allowed; }
.hint { margin: 0; font-size: 12px; color: #8c8c9a; line-height: 1.5; }
.logs { margin-top: 8px; }
.logTitle { font-size: 13px; font-weight: 600; margin: 0 0 8px; }
.logs ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 6px; }
.logs li { display: grid; gap: 2px; font-size: 12px; color: #5c5c66; }
@media (max-width: 640px) {
  .infoGrid { grid-template-columns: 1fr; }
}
</style>
