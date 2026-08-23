<template>
  <div>
    <p class="legacyHint">提现审批只处理上线前旧余额；新单分账完结后不到本页。物业币兑换入口不变，与商品分账不是同一条链路。</p>
    <SegmentedControl v-model="activeTab" :tabs="tabs" class="approvalTabs" />
    <KeepAlive>
      <component :is="activeComponent" />
    </KeepAlive>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import SegmentedControl from '../../components/SegmentedControl.vue'
import MerchantWithdrawalApproval from './MerchantWithdrawalApproval.vue'
import RoleWithdrawalApproval from './RoleWithdrawalApproval.vue'

const tabs = [
  { code: 'merchant', name: '商家提现' },
  { code: 'role', name: '配送员/角色提现' }
]

const activeTab = ref('merchant')
const activeComponent = computed(() =>
  activeTab.value === 'role' ? RoleWithdrawalApproval : MerchantWithdrawalApproval
)
</script>

<style scoped>
.approvalTabs {
  margin-bottom: 20px;
}
.legacyHint {
  margin: 0 0 12px;
  padding: 10px 14px;
  border-radius: 8px;
  background: #eff6ff;
  color: #1e40af;
  border: 1px solid #bfdbfe;
  font-size: 13px;
  line-height: 1.5;
}
</style>
