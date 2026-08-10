<template>
  <div class="page" :class="{ mobilePage: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">服务关键词</h1>
        <p class="desc">自行添加服务标签，用于用户需求智能匹配（如空调清洗、上门维修）</p>
      </div>
      <button type="button" class="btnPrimary" @click="openAdd">添加关键词</button>
    </div>

    <div class="panel">
      <div v-if="loading" class="hint">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <template v-else>
        <p v-if="merchantName" class="meta">店铺：{{ merchantName }}</p>
        <div v-if="keywords.length && isMobile" class="mobileList">
          <article v-for="item in keywords" :key="item.id" class="mobileCard">
            <div class="mobileCardHead">
              <strong>{{ item.keyword }}</strong>
              <span>权重 {{ item.weight ?? 0 }}</span>
            </div>
            <div class="mobileActions">
              <button type="button" class="linkBtn" @click="openEdit(item)">改权重</button>
              <button type="button" class="linkBtn danger" @click="remove(item)">删除</button>
            </div>
          </article>
        </div>
        <table v-else-if="keywords.length" class="table">
          <thead>
            <tr>
              <th>关键词</th>
              <th>权重</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in keywords" :key="item.id">
              <td>{{ item.keyword }}</td>
              <td>{{ item.weight ?? 0 }}</td>
              <td class="actions">
                <button type="button" class="linkBtn" @click="openEdit(item)">改权重</button>
                <button type="button" class="linkBtn danger" @click="remove(item)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="hint">暂无关键词，点击右上角添加；也可一次批量粘贴多个。</p>
      </template>
    </div>

    <Teleport to="body">
      <div v-if="addOpen" class="modalOverlay" @click.self="addOpen = false">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">添加关键词</h3>
            <button type="button" class="modalClose" @click="addOpen = false">&times;</button>
          </div>
          <div class="modalBody">
            <div class="field">
              <label class="label">单个关键词</label>
              <input v-model.trim="addForm.keyword" class="input" maxlength="50" placeholder="如：空调清洗" />
            </div>
            <div class="field">
              <label class="label">权重</label>
              <input v-model.number="addForm.weight" type="number" min="0" step="1" class="input" />
            </div>
            <div class="field">
              <label class="label">或批量添加（每行一个，忽略权重）</label>
              <textarea
                v-model="addForm.batchText"
                class="textarea"
                rows="4"
                placeholder="空调清洗&#10;空调维修&#10;空调加氟"
              />
            </div>
            <p v-if="formError" class="error">{{ formError }}</p>
          </div>
          <div class="modalFooter">
            <button type="button" class="btnSecondary" @click="addOpen = false">取消</button>
            <button type="button" class="btnPrimary" :disabled="saving" @click="submitAdd">
              {{ saving ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>

      <div v-if="editOpen" class="modalOverlay" @click.self="editOpen = false">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">调整权重 · {{ editTarget?.keyword }}</h3>
            <button type="button" class="modalClose" @click="editOpen = false">&times;</button>
          </div>
          <div class="modalBody">
            <div class="field">
              <label class="label">权重</label>
              <input v-model.number="editWeight" type="number" min="0" step="1" class="input" />
            </div>
            <p v-if="formError" class="error">{{ formError }}</p>
          </div>
          <div class="modalFooter">
            <button type="button" class="btnSecondary" @click="editOpen = false">取消</button>
            <button type="button" class="btnPrimary" :disabled="saving" @click="submitEdit">
              {{ saving ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { merchantKeywordApi } from '../../api/services'
import type { MerchantKeywordItem } from '../../api/types'
import { ApiError } from '../../api/request'
import { useIsMobile } from '../../composables/useIsMobile'

const { isMobile } = useIsMobile()
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const formError = ref('')
const merchantName = ref('')
const keywords = ref<MerchantKeywordItem[]>([])

const addOpen = ref(false)
const editOpen = ref(false)
const editTarget = ref<MerchantKeywordItem | null>(null)
const editWeight = ref(10)
const addForm = reactive({
  keyword: '',
  weight: 10,
  batchText: ''
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await merchantKeywordApi.my()
    merchantName.value = res.merchantName || ''
    keywords.value = res.keywords || []
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载失败'
    keywords.value = []
  } finally {
    loading.value = false
  }
}

function openAdd() {
  addForm.keyword = ''
  addForm.weight = 10
  addForm.batchText = ''
  formError.value = ''
  addOpen.value = true
}

function openEdit(item: MerchantKeywordItem) {
  editTarget.value = item
  editWeight.value = item.weight ?? 10
  formError.value = ''
  editOpen.value = true
}

async function submitAdd() {
  const batch = addForm.batchText
    .split(/[\n,，;；]/g)
    .map((s) => s.trim())
    .filter(Boolean)
  const single = addForm.keyword.trim()

  if (!batch.length && !single) {
    formError.value = '请填写关键词或批量列表'
    return
  }

  saving.value = true
  formError.value = ''
  try {
    if (batch.length) {
      await merchantKeywordApi.addBatch({ keywords: batch })
    } else {
      await merchantKeywordApi.add({
        keyword: single,
        weight: Number(addForm.weight) || 0
      })
    }
    addOpen.value = false
    await load()
  } catch (e) {
    formError.value = e instanceof ApiError ? e.message : '保存失败'
  } finally {
    saving.value = false
  }
}

async function submitEdit() {
  if (!editTarget.value?.id) return
  saving.value = true
  formError.value = ''
  try {
    await merchantKeywordApi.updateWeight(editTarget.value.id, {
      weight: Number(editWeight.value) || 0
    })
    editOpen.value = false
    await load()
  } catch (e) {
    formError.value = e instanceof ApiError ? e.message : '保存失败'
  } finally {
    saving.value = false
  }
}

async function remove(item: MerchantKeywordItem) {
  if (!item.id) return
  if (!window.confirm(`确定删除关键词「${item.keyword}」？`)) return
  try {
    await merchantKeywordApi.remove(item.id)
    await load()
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '删除失败'
  }
}

onMounted(load)
</script>

<style scoped>
.page { display: flex; flex-direction: column; gap: 16px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.title { margin: 0; font-size: 22px; color: #1f1f2e; }
.desc { margin: 6px 0 0; font-size: 13px; color: #8c8c9a; }
.panel {
  background: #fff;
  border: 1px solid #ececf2;
  border-radius: 12px;
  padding: 16px;
}
.meta { margin: 0 0 12px; font-size: 13px; color: #5c5c6e; }
.hint { margin: 0; color: #8c8c9a; font-size: 13px; }
.error { margin: 0; color: #c0392b; font-size: 13px; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th { text-align: left; color: #8c8c9a; font-weight: 500; padding: 10px 8px; border-bottom: 1px solid #f0f0f3; }
.table td { padding: 12px 8px; border-bottom: 1px solid #f7f7f9; color: #1f1f2e; }
.actions { display: flex; gap: 10px; }
.linkBtn {
  border: none; background: none; color: #3a5ccc; cursor: pointer; padding: 0; font-size: 13px;
}
.linkBtn.danger { color: #c0392b; }
.btnPrimary, .btnSecondary {
  border: none; border-radius: 8px; padding: 10px 16px; font-size: 14px; cursor: pointer;
}
.btnPrimary { background: #3a5ccc; color: #fff; }
.btnPrimary:disabled { opacity: 0.6; cursor: not-allowed; }
.btnSecondary { background: #f0f0f5; color: #1f1f2e; }
.mobileList { display: flex; flex-direction: column; gap: 10px; }
.mobileCard {
  border: 1px solid #ececf2; border-radius: 10px; padding: 12px; display: flex; flex-direction: column; gap: 8px;
}
.mobileCardHead { display: flex; justify-content: space-between; gap: 8px; font-size: 14px; }
.mobileActions { display: flex; gap: 12px; }
.modalOverlay {
  position: fixed; inset: 0; background: rgba(20, 20, 30, 0.45);
  display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px;
}
.modal {
  width: min(480px, 100%); background: #fff; border-radius: 12px; overflow: hidden;
}
.modal.mobileSheet { align-self: flex-end; width: 100%; border-radius: 16px 16px 0 0; }
.modalHeader {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 16px; border-bottom: 1px solid #f0f0f3;
}
.modalTitle { margin: 0; font-size: 16px; }
.modalClose { border: none; background: none; font-size: 22px; cursor: pointer; color: #8c8c9a; }
.modalBody { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.modalFooter {
  padding: 12px 16px 16px; display: flex; justify-content: flex-end; gap: 10px;
}
.field { display: flex; flex-direction: column; gap: 6px; }
.label { font-size: 13px; color: #5c5c6e; }
.input, .textarea {
  width: 100%; box-sizing: border-box; border: 1px solid #e8e8ec; border-radius: 8px;
  padding: 10px 12px; font-size: 14px; font-family: inherit;
}
.textarea { resize: vertical; }
</style>
