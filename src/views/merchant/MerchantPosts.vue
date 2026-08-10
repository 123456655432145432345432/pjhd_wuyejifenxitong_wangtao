<template>
  <div class="page" :class="{ mobilePage: isMobile }">
    <div class="header">
      <div>
        <h1 class="title">店铺动态</h1>
        <p class="desc">发布促销、新品与服务动态，用户可在商家主页浏览</p>
      </div>
      <button type="button" class="btnPrimary" @click="openCreate">发布动态</button>
    </div>

    <div class="panel">
      <div v-if="loading" class="hint">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <template v-else>
        <div v-if="list.length && isMobile" class="mobileList">
          <article v-for="item in list" :key="item.id" class="mobileCard">
            <div class="mobileCardHead">
              <strong>{{ item.title || '无标题' }}</strong>
              <span>{{ statusLabel(item.status) }}</span>
            </div>
            <p class="clamp">{{ item.content || '—' }}</p>
            <small>浏览 {{ item.viewCount ?? 0 }} · {{ item.createdAt || '—' }}</small>
            <div class="mobileActions">
              <button type="button" class="linkBtn" @click="openEdit(item)">编辑</button>
              <button type="button" class="linkBtn danger" @click="remove(item)">删除</button>
            </div>
          </article>
        </div>
        <table v-else-if="list.length" class="table">
          <thead>
            <tr>
              <th>标题</th>
              <th>内容</th>
              <th>状态</th>
              <th>浏览</th>
              <th>时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in list" :key="item.id">
              <td>{{ item.title || '—' }}</td>
              <td class="descCell">{{ item.content || '—' }}</td>
              <td>{{ statusLabel(item.status) }}</td>
              <td>{{ item.viewCount ?? 0 }}</td>
              <td>{{ item.createdAt || '—' }}</td>
              <td class="actions">
                <button type="button" class="linkBtn" @click="openEdit(item)">编辑</button>
                <button type="button" class="linkBtn danger" @click="remove(item)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="hint">暂无动态，点击右上角发布</p>
      </template>
    </div>

    <Teleport to="body">
      <div v-if="modalOpen" class="modalOverlay" @click.self="closeModal">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">{{ editingId ? '编辑动态' : '发布动态' }}</h3>
            <button type="button" class="modalClose" @click="closeModal">&times;</button>
          </div>
          <div class="modalBody">
            <div class="field">
              <label class="label">标题 <span class="required">*</span></label>
              <input v-model.trim="form.title" class="input" maxlength="100" placeholder="如：夏日促销" />
            </div>
            <div class="field">
              <label class="label">内容 <span class="required">*</span></label>
              <textarea
                v-model.trim="form.content"
                class="textarea"
                rows="5"
                maxlength="2000"
                placeholder="动态正文"
              />
            </div>
            <div class="field">
              <label class="label">图片（可选）</label>
              <MediaUploader v-model="form.imageUrls" category="merchant" accept="image" :max="9" />
            </div>
            <div class="field">
              <label class="label">视频（可选）</label>
              <MediaUploader v-model="form.videoUrl" category="merchant" accept="video" :max="1" />
            </div>
            <div class="field">
              <label class="label">状态</label>
              <select v-model="form.status" class="input">
                <option
                  v-for="opt in MERCHANT_POST_STATUS_OPTIONS"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <p v-if="formError" class="error">{{ formError }}</p>
          </div>
          <div class="modalFooter">
            <button type="button" class="btnSecondary" @click="closeModal">取消</button>
            <button type="button" class="btnPrimary" :disabled="saving" @click="submit">
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
import { merchantPostApi } from '../../api/services'
import type { MerchantPostItem, MerchantPostPayload } from '../../api/types'
import { ApiError } from '../../api/request'
import {
  getEnumLabel,
  MERCHANT_POST_STATUS,
  MERCHANT_POST_STATUS_LABEL,
  MERCHANT_POST_STATUS_OPTIONS
} from '../../constants/enums'
import { useIsMobile } from '../../composables/useIsMobile'
import MediaUploader from '../../components/MediaUploader.vue'

const { isMobile } = useIsMobile()
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const formError = ref('')
const list = ref<MerchantPostItem[]>([])
const modalOpen = ref(false)
const editingId = ref('')

const form = reactive({
  title: '',
  content: '',
  imageUrls: [] as string[],
  videoUrl: '',
  status: MERCHANT_POST_STATUS.PUBLISHED
})

function statusLabel(status?: string) {
  return getEnumLabel(MERCHANT_POST_STATUS_LABEL, status, status || '—')
}

function normalizeImageUrls(value?: string[] | string): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.filter(Boolean)
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String)
  } catch {
    // ignore
  }
  return String(value)
    .split(/[\n,，]/g)
    .map((s) => s.trim())
    .filter(Boolean)
}

function resetForm() {
  form.title = ''
  form.content = ''
  form.imageUrls = []
  form.videoUrl = ''
  form.status = MERCHANT_POST_STATUS.PUBLISHED
  formError.value = ''
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await merchantPostApi.my({ page: 1, pageSize: 50 })
    list.value = res.list || []
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '加载失败'
    list.value = []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingId.value = ''
  resetForm()
  modalOpen.value = true
}

function openEdit(item: MerchantPostItem) {
  editingId.value = item.id
  form.title = item.title || ''
  form.content = item.content || ''
  form.imageUrls = normalizeImageUrls(item.imageUrls)
  form.videoUrl = item.videoUrl || ''
  form.status = item.status || MERCHANT_POST_STATUS.PUBLISHED
  formError.value = ''
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
}

function buildPayload(): MerchantPostPayload {
  const images = form.imageUrls.filter(Boolean)
  return {
    title: form.title.trim(),
    content: form.content.trim(),
    imageUrls: images.length ? images : undefined,
    videoUrl: form.videoUrl.trim() || undefined,
    status: form.status
  }
}

async function submit() {
  if (!form.title.trim() || !form.content.trim()) {
    formError.value = '请填写标题和内容'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    const payload = buildPayload()
    if (editingId.value) {
      await merchantPostApi.update(editingId.value, payload)
    } else {
      await merchantPostApi.create(payload)
    }
    modalOpen.value = false
    await load()
  } catch (e) {
    formError.value = e instanceof ApiError ? e.message : '保存失败'
  } finally {
    saving.value = false
  }
}

async function remove(item: MerchantPostItem) {
  if (!item.id) return
  if (!window.confirm(`确定删除动态「${item.title || item.id}」？`)) return
  try {
    await merchantPostApi.remove(item.id)
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
.hint { margin: 0; color: #8c8c9a; font-size: 13px; }
.error { margin: 0; color: #c0392b; font-size: 13px; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th { text-align: left; color: #8c8c9a; font-weight: 500; padding: 10px 8px; border-bottom: 1px solid #f0f0f3; }
.table td { padding: 12px 8px; border-bottom: 1px solid #f7f7f9; color: #1f1f2e; vertical-align: top; }
.descCell {
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
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
.clamp {
  margin: 0; font-size: 13px; color: #5c5c6e;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.mobileActions { display: flex; gap: 12px; }
.modalOverlay {
  position: fixed; inset: 0; background: rgba(20, 20, 30, 0.45);
  display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px;
}
.modal {
  width: min(520px, 100%); background: #fff; border-radius: 12px; overflow: hidden;
}
.modal.mobileSheet { align-self: flex-end; width: 100%; border-radius: 16px 16px 0 0; }
.modalHeader {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 16px; border-bottom: 1px solid #f0f0f3;
}
.modalTitle { margin: 0; font-size: 16px; }
.modalClose { border: none; background: none; font-size: 22px; cursor: pointer; color: #8c8c9a; }
.modalBody { padding: 16px; display: flex; flex-direction: column; gap: 12px; max-height: 70vh; overflow: auto; }
.modalFooter {
  padding: 12px 16px 16px; display: flex; justify-content: flex-end; gap: 10px;
}
.field { display: flex; flex-direction: column; gap: 6px; }
.label { font-size: 13px; color: #5c5c6e; }
.required { color: #c0392b; }
.input, .textarea {
  width: 100%; box-sizing: border-box; border: 1px solid #e8e8ec; border-radius: 8px;
  padding: 10px 12px; font-size: 14px; font-family: inherit;
}
.textarea { resize: vertical; }
</style>
