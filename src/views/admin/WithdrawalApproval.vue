<template>
  <div>
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
</style>
