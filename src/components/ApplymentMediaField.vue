<template>
  <div class="mediaField">
    <div class="previewRow">
      <div v-if="previewUrl" class="preview">
        <img :src="previewUrl" alt="预览" />
        <button type="button" class="removeBtn" :disabled="disabled || uploading" @click="clear">×</button>
      </div>
      <button
        v-else
        type="button"
        class="addBtn"
        :disabled="disabled || uploading"
        @click="openPicker"
      >
        {{ uploading ? '上传中...' : '上传图片' }}
      </button>
    </div>
    <p v-if="mediaId && !previewUrl" class="hint">已上传媒体 ID，提交前请尽量重新上传（有效期约 3 天）</p>
    <p v-if="error" class="error">{{ error }}</p>
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="hidden"
      :disabled="disabled || uploading"
      @change="onFileChange"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { merchantApplymentApi } from '../api/services'
import { formatApiError } from '../api/request'

const props = defineProps<{
  modelValue?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const error = ref('')
const previewUrl = ref('')
const mediaId = ref(props.modelValue || '')

watch(
  () => props.modelValue,
  (v) => {
    mediaId.value = v || ''
    if (!v) previewUrl.value = ''
  }
)

function openPicker() {
  if (props.disabled || uploading.value) return
  error.value = ''
  fileInput.value?.click()
}

function clear() {
  if (previewUrl.value.startsWith('blob:')) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = ''
  mediaId.value = ''
  emit('update:modelValue', '')
}

async function onFileChange(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    error.value = '请选择图片文件'
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    error.value = '图片不能超过 10MB'
    return
  }
  uploading.value = true
  error.value = ''
  try {
    const res = await merchantApplymentApi.uploadMedia(file)
    const id = res.mediaId || ''
    if (!id) throw new Error('上传成功但未返回 mediaId')
    if (previewUrl.value.startsWith('blob:')) URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = URL.createObjectURL(file)
    mediaId.value = id
    emit('update:modelValue', id)
  } catch (e) {
    error.value = formatApiError(e, '图片上传微信失败，请重试')
  } finally {
    uploading.value = false
  }
}
</script>

<style scoped>
.previewRow { display: flex; align-items: center; gap: 10px; }
.preview {
  position: relative;
  width: 96px;
  height: 96px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #f0f0f3;
  background: #f4f5f7;
}
.preview img { width: 100%; height: 100%; object-fit: cover; display: block; }
.removeBtn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(0,0,0,0.55);
  color: #fff;
  font-size: 16px;
  line-height: 20px;
  padding: 0;
}
.addBtn {
  width: 96px;
  height: 96px;
  border-radius: 8px;
  border: 1px dashed #c8c8d4;
  background: #fafafc;
  color: #5c5c66;
  font-size: 13px;
}
.addBtn:disabled { opacity: 0.6; }
.hint, .error { margin: 6px 0 0; font-size: 12px; }
.hint { color: #8c8c9a; }
.error { color: #e05c5c; }
.hidden { display: none; }
</style>
