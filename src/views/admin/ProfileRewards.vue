<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">资料奖励配置</h1>
        <p class="desc">
          {{
            isCoordinator
              ? '配置本物业统筹作用域下、住户完善资料可获得的积分奖励'
              : '配置住户完善资料字段可获得的积分奖励'
          }}
        </p>
      </div>
      <button class="btnPrimary" @click="openCreate">新增规则</button>
    </div>

    <div class="toolbar">
      <select
        v-model="scope"
        class="input"
        :disabled="isCoordinator"
        @change="load"
      >
        <option v-for="opt in scopeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
      <button class="btnPrimary" :disabled="loading" @click="load">刷新</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>
    <div v-if="loading" class="hint">加载中...</div>
    <div v-else-if="list.length" class="tableScroll">
      <table class="table">
        <thead>
          <tr><th>字段</th><th>奖励积分</th><th>仅一次</th><th>创建时间</th><th>操作</th></tr>
        </thead>
        <tbody>
          <tr v-for="item in list" :key="item.id">
            <td>{{ item.fieldName || '—' }}</td>
            <td>{{ item.rewardPoints ?? '—' }}</td>
            <td>{{ item.oncePerUser ? '是' : '否' }}</td>
            <td>{{ item.createdAt || '—' }}</td>
            <td>
              <button class="linkBtn" @click="openEdit(item)">编辑</button>
              <button class="linkBtn danger" @click="removeItem(item)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-else class="hint">暂无配置（可让后端预置 birthday/phone/hasChildren 样例）</p>

    <Teleport to="body">
      <div v-if="modalOpen" class="modalOverlay" @click.self="closeModal">
        <div class="modal">
          <div class="modalHeader">
            <h3 class="modalTitle">{{ editingId ? '编辑规则' : '新增规则' }}</h3>
            <button class="modalClose" @click="closeModal">&times;</button>
          </div>
          <div class="modalBody">
            <div class="field">
              <label class="label">字段名</label>
              <input v-model.trim="form.fieldName" class="input" placeholder="如 birthday / phone / hasChildren" />
            </div>
            <div class="field">
              <label class="label">奖励积分</label>
              <input v-model.number="form.rewardPoints" type="number" min="1" class="input" />
            </div>
            <label class="check">
              <input v-model="form.oncePerUser" type="checkbox" />
              同一用户仅奖励一次
            </label>
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="modalFooter">
              <button class="btnSecondary" @click="closeModal">取消</button>
              <button class="btnPrimary" :disabled="saving" @click="submit">{{ saving ? '保存中...' : '保存' }}</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { profileRewardApi } from '../../api/services'
import { ApiError } from '../../api/request'
import type { ProfileRewardItem } from '../../api/types'
import { PROFILE_REWARD_SCOPE, PROFILE_REWARD_SCOPE_LABEL, USER_ROLE } from '../../constants/enums'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const isCoordinator = computed(() => auth.profile?.role === USER_ROLE.COORDINATOR)

const scopeOptions = computed(() => {
  if (isCoordinator.value) {
    return [{ value: PROFILE_REWARD_SCOPE.COORDINATOR, label: PROFILE_REWARD_SCOPE_LABEL.coordinator }]
  }
  return Object.entries(PROFILE_REWARD_SCOPE_LABEL).map(([value, label]) => ({ value, label }))
})

const scope = ref(
  isCoordinator.value ? PROFILE_REWARD_SCOPE.COORDINATOR : PROFILE_REWARD_SCOPE.PROPERTY_COMPANY
)
const list = ref<ProfileRewardItem[]>([])
const loading = ref(false)
const error = ref('')
const modalOpen = ref(false)
const editingId = ref('')
const saving = ref(false)
const formError = ref('')
const form = reactive({
  fieldName: '',
  rewardPoints: 50,
  oncePerUser: true
})

/** 统筹 scopeId = 本物业 ID；后端会校验并自动限定 */
const scopeId = computed(
  () => auth.propertyCompanyId || auth.profile?.propertyCompanyId || ''
)

async function load() {
  loading.value = true
  error.value = ''
  try {
    if (isCoordinator.value) {
      scope.value = PROFILE_REWARD_SCOPE.COORDINATOR
    }
    const res = await profileRewardApi.list({
      scope: scope.value,
      scopeId: scopeId.value || undefined
    })
    list.value = Array.isArray(res) ? res : res.list || []
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载失败'
    list.value = []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = ''
  form.fieldName = ''
  form.rewardPoints = 50
  form.oncePerUser = true
  formError.value = ''
  modalOpen.value = true
}

function openEdit(item: ProfileRewardItem) {
  editingId.value = item.id
  form.fieldName = item.fieldName || ''
  form.rewardPoints = item.rewardPoints ?? 50
  form.oncePerUser = item.oncePerUser !== false
  formError.value = ''
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

async function submit() {
  if (!form.fieldName.trim() || !scopeId.value) {
    formError.value = '请填写字段名，并确认已选择物业公司'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    const payload = {
      scope: isCoordinator.value ? PROFILE_REWARD_SCOPE.COORDINATOR : scope.value,
      scopeId: scopeId.value,
      fieldName: form.fieldName.trim(),
      rewardPoints: Number(form.rewardPoints) || 0,
      oncePerUser: form.oncePerUser
    }
    if (editingId.value) {
      await profileRewardApi.update(editingId.value, payload)
    } else {
      await profileRewardApi.create(payload)
    }
    closeModal()
    await load()
  } catch (e) {
    formError.value = e instanceof ApiError ? e.message : '保存失败'
  } finally {
    saving.value = false
  }
}

async function removeItem(item: ProfileRewardItem) {
  if (!confirm(`确认删除字段「${item.fieldName}」的奖励规则？`)) return
  try {
    await profileRewardApi.remove(item.id)
    await load()
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '删除失败'
  }
}

onMounted(load)
</script>

<style scoped>
.page { max-width: 960px; min-width: 0; width: 100%; box-sizing: border-box; }
.header { display: flex; justify-content: space-between; margin-bottom: 20px; gap: 12px; }
.title { font-size: 24px; font-weight: 600; margin: 0 0 6px; }
.desc { margin: 0; color: #8c8c9a; font-size: 14px; }
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; }
.input { min-width: 160px; width: 100%; padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; box-sizing: border-box; }
.btnPrimary, .btnSecondary { padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; }
.btnPrimary { background: #5c5c9e; color: #fff; }
.btnPrimary:disabled { opacity: 0.6; cursor: not-allowed; }
.btnSecondary { background: #f0f0f3; color: #5c5c66; }
.tableScroll { width: 100%; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
.table { width: 100%; min-width: 560px; border-collapse: collapse; font-size: 13px; }
.table th, .table td {
  padding: 10px 8px; border-bottom: 1px solid #f0f0f3; text-align: left;
  word-break: break-word; overflow-wrap: anywhere;
}
.linkBtn { border: none; background: none; color: #5c5c9e; cursor: pointer; margin-right: 8px; }
.linkBtn.danger { color: #e05c5c; }
.hint, .error { color: #8c8c9a; }
.error { color: #e05c5c; }
.modalOverlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { width: 420px; max-width: calc(100vw - 32px); background: #fff; border-radius: 12px; overflow: hidden; }
.modalHeader { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #f0f0f3; }
.modalTitle { margin: 0; font-size: 16px; }
.modalClose { border: none; background: none; font-size: 22px; cursor: pointer; color: #8c8c9a; }
.modalBody { padding: 20px; display: grid; gap: 12px; }
.modalFooter { display: flex; justify-content: flex-end; gap: 10px; margin-top: 8px; }
.field { display: grid; gap: 6px; }
.label { font-size: 13px; color: #8c8c9a; }
.check { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #5c5c66; }
</style>
