<template>
  <div class="mediaUploader">
    <div class="previewList">
      <div v-for="(url, idx) in urls" :key="`${url}-${idx}`" class="previewItem">
        <video v-if="isVideo(url)" :src="url" class="previewMedia" controls preload="metadata" />
        <img v-else :src="url" class="previewMedia" alt="预览" @error="onPreviewError(idx)" />
        <button
          type="button"
          class="removeBtn"
          :disabled="disabled || uploading"
          aria-label="移除"
          @click="removeAt(idx)"
        >
          &times;
        </button>
      </div>
      <button
        v-if="canAdd"
        type="button"
        class="addBtn"
        :disabled="disabled || uploading"
        @click="openPicker"
      >
        <span class="addIcon">+</span>
        <span class="addText">{{ uploading ? '上传中...' : addLabel }}</span>
      </button>
    </div>
    <p class="hint">{{ hintText }}</p>
    <p v-if="error" class="error">{{ error }}</p>
    <input
      ref="fileInput"
      type="file"
      class="hiddenInput"
      :accept="acceptAttr"
      :multiple="remaining > 1"
      :disabled="disabled || uploading"
      @change="onFileChange"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { fileApi } from '../api/services'
import { ApiError, formatApiError } from '../api/request'

const props = withDefaults(
  defineProps<{
    /** 单文件时为 string，多文件时为 string[] */
    modelValue?: string | string[] | null
    /** 上传分类：avatar | announcement | merchant | service | activity（见 FILE_CATEGORY） */
    category: string
    /** image | video | media */
    accept?: 'image' | 'video' | 'media'
    /** 最多张数，1 表示单值绑定 string */
    max?: number
    disabled?: boolean
    hint?: string
  }>(),
  {
    modelValue: '',
    accept: 'image',
    max: 1,
    disabled: false,
    hint: ''
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string | string[]]
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const error = ref('')
const broken = ref<Record<number, boolean>>({})

const isMulti = computed(() => props.max > 1)

const urls = computed(() => {
  const v = props.modelValue
  if (Array.isArray(v)) return v.filter((u) => typeof u === 'string' && u.trim())
  if (typeof v === 'string' && v.trim()) return [v.trim()]
  return [] as string[]
})

const remaining = computed(() => Math.max(0, props.max - urls.value.length))
const canAdd = computed(() => remaining.value > 0)

const acceptAttr = computed(() => {
  if (props.accept === 'video') return 'video/*'
  if (props.accept === 'media') return 'image/*,video/*'
  return 'image/*'
})

const addLabel = computed(() => {
  if (props.accept === 'video') return '选择视频'
  if (props.accept === 'media') return '添加图片/视频'
  return '拍照 / 相册'
})

const hintText = computed(() => {
  if (props.hint) return props.hint
  if (props.accept === 'video') {
    return isMulti.value ? `点击选择视频，最多 ${props.max} 个` : '点击从相册选择视频'
  }
  if (props.accept === 'media') {
    return `点击选择图片或视频，最多 ${props.max} 个`
  }
  return isMulti.value
    ? `点击拍照或从相册选择，最多 ${props.max} 张`
    : '点击拍照或从相册选择图片'
})

function isVideo(url: string) {
  if (broken.value[urls.value.indexOf(url)]) return false
  return /\.(mp4|webm|mov|m4v|avi)(\?|$)/i.test(url) || props.accept === 'video'
}

function onPreviewError(idx: number) {
  broken.value = { ...broken.value, [idx]: true }
}

function emitUrls(next: string[]) {
  if (isMulti.value) {
    emit('update:modelValue', next)
  } else {
    emit('update:modelValue', next[0] || '')
  }
}

function openPicker() {
  if (props.disabled || uploading.value || !canAdd.value) return
  error.value = ''
  fileInput.value?.click()
}

function removeAt(idx: number) {
  if (props.disabled || uploading.value) return
  const next = urls.value.slice()
  next.splice(idx, 1)
  emitUrls(next)
}

function validateFile(file: File): string | null {
  if (props.accept === 'image' && !file.type.startsWith('image/')) {
    return '请选择图片文件'
  }
  if (props.accept === 'video' && !file.type.startsWith('video/')) {
    return '请选择视频文件'
  }
  if (props.accept === 'media' && !file.type.startsWith('image/') && !file.type.startsWith('video/')) {
    return '请选择图片或视频文件'
  }
  const maxBytes = props.accept === 'video' || file.type.startsWith('video/') ? 80 * 1024 * 1024 : 10 * 1024 * 1024
  if (file.size > maxBytes) {
    return props.accept === 'video' || file.type.startsWith('video/')
      ? '视频不能超过 80MB'
      : '图片不能超过 10MB'
  }
  return null
}

async function onFileChange(ev: Event) {
  const input = ev.target as HTMLInputElement
  const files = Array.from(input.files || [])
  input.value = ''
  if (!files.length) return

  const slot = remaining.value
  const picked = files.slice(0, slot)
  for (const file of picked) {
    const msg = validateFile(file)
    if (msg) {
      error.value = msg
      return
    }
  }

  uploading.value = true
  error.value = ''
  try {
    const uploaded: string[] = []
    for (const file of picked) {
      const res = await fileApi.upload(file, props.category)
      const url = res.url || res.thumbnailUrl
      if (!url) throw new ApiError(500, '上传成功但未返回文件地址')
      uploaded.push(url)
    }
    emitUrls([...urls.value, ...uploaded])
  } catch (e) {
    error.value = formatApiError(e, '上传失败')
  } finally {
    uploading.value = false
  }
}

watch(
  () => props.modelValue,
  () => {
    broken.value = {}
  }
)
</script>

<style scoped>
.mediaUploader {
  width: 100%;
}
.previewList {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.previewItem {
  position: relative;
  width: 96px;
  height: 96px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #f0f0f3;
  background: #f4f5f7;
  flex-shrink: 0;
}
.previewMedia {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  background: #111;
}
.removeBtn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 16px;
  line-height: 20px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.removeBtn:disabled {
  opacity: 0.5;
}
.addBtn {
  width: 96px;
  height: 96px;
  border-radius: 8px;
  border: 1px dashed #c8c8d4;
  background: #fafafc;
  color: #5c5c66;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex-shrink: 0;
  min-height: 96px;
}
.addBtn:hover:not(:disabled) {
  border-color: #5c5c9e;
  color: #5c5c9e;
}
.addBtn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.addIcon {
  font-size: 22px;
  line-height: 1;
  font-weight: 500;
}
.addText {
  font-size: 11px;
  line-height: 1.2;
  padding: 0 4px;
  text-align: center;
}
.hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: #8c8c9a;
}
.error {
  margin: 6px 0 0;
  font-size: 12px;
  color: #e05c5c;
}
.hiddenInput {
  display: none;
}
</style>
