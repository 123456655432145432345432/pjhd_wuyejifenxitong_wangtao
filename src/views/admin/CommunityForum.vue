<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">社区论坛</h1>
        <p class="desc">property_admin / platform_admin 管理端：帖子治理与举报处理（不含居民发帖）</p>
      </div>
    </div>

    <div class="tabs">
      <button class="tab" :class="{ active: tab === 'posts' }" @click="switchTab('posts')">帖子管理</button>
      <button class="tab" :class="{ active: tab === 'reports' }" @click="switchTab('reports')">举报处理</button>
    </div>

    <div v-if="tab === 'posts'" class="panel">
      <div class="toolbar">
        <input
          v-model="postKeyword"
          type="search"
          class="input"
          placeholder="搜索关键词"
          @keydown.enter.prevent="loadPosts(1)"
        />
        <select v-model="postStatus" class="input select" @change="loadPosts(1)">
          <option v-for="opt in COMMUNITY_POST_STATUS_OPTIONS" :key="opt.value || 'all'" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
        <button class="btnPrimary" :disabled="loading" @click="loadPosts(1)">查询</button>
      </div>

      <div v-if="loading" class="hint">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <table v-else-if="posts.length" class="table">
        <thead>
          <tr>
            <th>作者</th>
            <th>内容</th>
            <th>状态</th>
            <th>点赞/评论</th>
            <th>时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in posts" :key="item.id">
            <td>{{ item.authorName || item.authorId || '—' }}</td>
            <td class="contentCell">{{ item.content || '—' }}</td>
            <td>{{ getEnumLabel(COMMUNITY_POST_STATUS_LABEL, item.status) }}</td>
            <td>{{ item.likeCount ?? 0 }} / {{ item.commentCount ?? 0 }}</td>
            <td>{{ item.createdAt || '—' }}</td>
            <td>
              <button class="linkBtn" @click="openDeleteComment(item)">删评论</button>
              <button
                class="linkBtn danger"
                :disabled="item.status === COMMUNITY_POST_STATUS.DELETED"
                @click="deletePost(item)"
              >
                删帖
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="hint">暂无帖子</p>
      <div v-if="postTotalPages > 1" class="pagination">
        <button class="pageBtn" :disabled="postPage <= 1 || loading" @click="loadPosts(postPage - 1)">&lt;</button>
        <span class="pageInfo">{{ postPage }} / {{ postTotalPages }}</span>
        <button class="pageBtn" :disabled="postPage >= postTotalPages || loading" @click="loadPosts(postPage + 1)">&gt;</button>
      </div>
    </div>

    <div v-else class="panel">
      <div class="toolbar">
        <select v-model="reportStatus" class="input select" @change="loadReports(1)">
          <option v-for="opt in COMMUNITY_REPORT_STATUS_OPTIONS" :key="opt.value || 'all'" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
        <button class="btnPrimary" :disabled="loading" @click="loadReports(1)">刷新</button>
      </div>

      <div v-if="loading" class="hint">加载中...</div>
      <p v-else-if="error" class="error">{{ error }}</p>
      <table v-else-if="reports.length" class="table">
        <thead>
          <tr>
            <th>目标</th>
            <th>原因</th>
            <th>内容摘要</th>
            <th>举报人</th>
            <th>状态</th>
            <th>时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in reports" :key="item.id">
            <td>
              {{ getEnumLabel(COMMUNITY_REPORT_TARGET_LABEL, item.targetType) }}
              <span class="muted">{{ item.targetId || '' }}</span>
            </td>
            <td>{{ getEnumLabel(COMMUNITY_REPORT_REASON_LABEL, item.reasonType) }}</td>
            <td class="contentCell">{{ item.targetContent || item.reasonDetail || '—' }}</td>
            <td>{{ item.reporterName || item.reporterId || '—' }}</td>
            <td>{{ getEnumLabel(COMMUNITY_REPORT_STATUS_LABEL, item.status) }}</td>
            <td>{{ item.createdAt || '—' }}</td>
            <td>
              <button
                v-if="item.status === COMMUNITY_REPORT_STATUS.PENDING"
                class="linkBtn"
                @click="openHandleReport(item)"
              >
                处理
              </button>
              <span v-else class="muted">已处理</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="hint">暂无举报</p>
      <div v-if="reportTotalPages > 1" class="pagination">
        <button class="pageBtn" :disabled="reportPage <= 1 || loading" @click="loadReports(reportPage - 1)">&lt;</button>
        <span class="pageInfo">{{ reportPage }} / {{ reportTotalPages }}</span>
        <button class="pageBtn" :disabled="reportPage >= reportTotalPages || loading" @click="loadReports(reportPage + 1)">&gt;</button>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="commentModalOpen" class="modalOverlay" @click.self="closeCommentModal">
        <div class="modal">
          <div class="modalHeader">
            <h3 class="modalTitle">删除评论</h3>
            <button class="modalClose" @click="closeCommentModal">&times;</button>
          </div>
          <div class="modalBody">
            <p class="hintInline">从该帖已有评论中选择后删除。通过举报处理时，通过即会自动删除被举报评论。</p>
            <div v-if="commentPost" class="auditInfo">
              <div class="infoRow">
                <span class="infoLabel">帖子</span>
                <span>{{ commentPostExcerpt }}</span>
              </div>
              <div class="infoRow">
                <span class="infoLabel">作者</span>
                <span>{{ commentPost.authorName || commentPost.authorId || '—' }}</span>
              </div>
            </div>
            <div class="field">
              <label class="label">选择评论</label>
              <p v-if="commentsLoading" class="fieldHint">正在加载该帖评论...</p>
              <select
                v-else
                v-model="selectedCommentId"
                class="input select commentSelect"
                :disabled="!comments.length"
              >
                <option value="">{{ comments.length ? '请选择要删除的评论' : '该帖暂无评论' }}</option>
                <option v-for="item in comments" :key="item.id" :value="item.id">
                  {{ commentOptionLabel(item) }}
                </option>
              </select>
            </div>
            <div v-if="selectedComment" class="commentPreview">
              <div class="commentMeta">
                {{ selectedComment.authorName || '匿名' }}
                <span v-if="selectedComment.replyToUserName"> · 回复 {{ selectedComment.replyToUserName }}</span>
                <span v-if="selectedComment.createdAt"> · {{ selectedComment.createdAt }}</span>
              </div>
              <p class="commentText">{{ selectedComment.content || '（无文字）' }}</p>
            </div>
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="modalFooter">
              <button class="btnSecondary" @click="closeCommentModal">取消</button>
              <button
                class="btnPrimary"
                :disabled="formSubmitting || commentsLoading || !selectedCommentId"
                @click="submitDeleteComment"
              >
                {{ formSubmitting ? '删除中...' : '确认删除' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="reportModalOpen" class="modalOverlay" @click.self="closeReportModal">
        <div class="modal">
          <div class="modalHeader">
            <h3 class="modalTitle">处理举报</h3>
            <button class="modalClose" @click="closeReportModal">&times;</button>
          </div>
          <div class="modalBody">
            <div class="auditInfo">
              <div class="infoRow">
                <span class="infoLabel">目标</span>
                <span>
                  {{ getEnumLabel(COMMUNITY_REPORT_TARGET_LABEL, reportTarget?.targetType) }}
                  {{ reportTarget?.targetId || '' }}
                </span>
              </div>
              <div class="infoRow">
                <span class="infoLabel">原因</span>
                <span>{{ getEnumLabel(COMMUNITY_REPORT_REASON_LABEL, reportTarget?.reasonType) }}</span>
              </div>
              <div class="infoRow">
                <span class="infoLabel">内容</span>
                <span>{{ reportTarget?.targetContent || reportTarget?.reasonDetail || '—' }}</span>
              </div>
            </div>
            <div class="field">
              <label class="label">处理结果 <span class="required">*</span></label>
              <div class="radioGroup">
                <label class="radioItem">
                  <input v-model="reportAction" type="radio" :value="COMMUNITY_REPORT_ACTION.ACCEPT" />
                  <span>通过（accept）</span>
                </label>
                <label class="radioItem">
                  <input v-model="reportAction" type="radio" :value="COMMUNITY_REPORT_ACTION.REJECT" />
                  <span>驳回（reject）</span>
                </label>
              </div>
            </div>
            <div class="field">
              <label class="label">处理备注</label>
              <textarea v-model="handleRemark" class="textarea" rows="3" maxlength="200" placeholder="备注（选填）" />
            </div>
            <p v-if="reportTarget?.targetType === COMMUNITY_REPORT_TARGET.COMMENT" class="hintInline">
              选择「通过」后，被举报评论会自动删除，无需再手填评论 ID。
            </p>
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="modalFooter">
              <button class="btnSecondary" @click="closeReportModal">取消</button>
              <button class="btnPrimary" :disabled="formSubmitting" @click="submitHandleReport">
                {{ formSubmitting ? '提交中...' : '确认处理' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { communityForumAdminApi } from '../../api/services'
import type { CommunityCommentItem, CommunityPostItem, ContentReportItem } from '../../api/types'
import { ApiError } from '../../api/request'
import {
  COMMUNITY_COMMENT_STATUS,
  COMMUNITY_POST_STATUS,
  COMMUNITY_POST_STATUS_LABEL,
  COMMUNITY_POST_STATUS_OPTIONS,
  COMMUNITY_REPORT_ACTION,
  COMMUNITY_REPORT_REASON_LABEL,
  COMMUNITY_REPORT_STATUS,
  COMMUNITY_REPORT_STATUS_LABEL,
  COMMUNITY_REPORT_STATUS_OPTIONS,
  COMMUNITY_REPORT_TARGET,
  COMMUNITY_REPORT_TARGET_LABEL,
  getEnumLabel
} from '../../constants/enums'

const PAGE_SIZE = 20
const tab = ref<'posts' | 'reports'>('posts')
const loading = ref(false)
const error = ref('')

const posts = ref<CommunityPostItem[]>([])
const postKeyword = ref('')
const postStatus = ref('')
const postPage = ref(1)
const postTotalPages = ref(1)

const reports = ref<ContentReportItem[]>([])
const reportStatus = ref('')
const reportPage = ref(1)
const reportTotalPages = ref(1)

const commentModalOpen = ref(false)
const commentPost = ref<CommunityPostItem | null>(null)
const comments = ref<CommunityCommentItem[]>([])
const commentsLoading = ref(false)
const selectedCommentId = ref('')
const reportModalOpen = ref(false)
const reportTarget = ref<ContentReportItem | null>(null)
const reportAction = ref(COMMUNITY_REPORT_ACTION.ACCEPT)
const handleRemark = ref('')
const formSubmitting = ref(false)
const formError = ref('')

async function loadPosts(page = postPage.value, silent = false) {
  if (!silent) loading.value = true
  error.value = ''
  try {
    const res = await communityForumAdminApi.listPosts({
      page,
      pageSize: PAGE_SIZE,
      status: postStatus.value || undefined,
      keyword: postKeyword.value.trim() || undefined
    })
    posts.value = res.list || []
    postPage.value = res.pagination?.page ?? page
    postTotalPages.value = res.pagination?.totalPages ?? 1
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '帖子加载失败'
    posts.value = []
  } finally {
    if (!silent) loading.value = false
  }
}

async function loadReports(page = reportPage.value) {
  loading.value = true
  error.value = ''
  try {
    const res = await communityForumAdminApi.listReports({
      page,
      pageSize: PAGE_SIZE,
      status: reportStatus.value || undefined
    })
    reports.value = res.list || []
    reportPage.value = res.pagination?.page ?? page
    reportTotalPages.value = res.pagination?.totalPages ?? 1
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '举报加载失败'
    reports.value = []
  } finally {
    loading.value = false
  }
}

function switchTab(next: 'posts' | 'reports') {
  tab.value = next
  error.value = ''
  if (next === 'posts') void loadPosts(1)
  else void loadReports(1)
}

async function deletePost(item: CommunityPostItem) {
  if (!confirm(`确认删除帖子「${(item.content || item.id).slice(0, 40)}」？`)) return
  try {
    await communityForumAdminApi.deletePost(item.id)
    await loadPosts(postPage.value)
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : '删帖失败'
  }
}

const commentPostExcerpt = computed(() => {
  const text = (commentPost.value?.content || '').replace(/\s+/g, ' ').trim()
  if (!text) return commentPost.value?.id || '—'
  return text.length > 80 ? `${text.slice(0, 80)}…` : text
})

const selectedComment = computed(
  () => comments.value.find((item) => item.id === selectedCommentId.value) || null
)

function snippet(text: string, max = 36) {
  const value = text.replace(/\s+/g, ' ').trim()
  if (!value) return '（无文字）'
  return value.length > max ? `${value.slice(0, max)}…` : value
}

function commentOptionLabel(item: CommunityCommentItem) {
  const author = item.authorName || '匿名'
  const reply = item.replyToUserName ? `回复${item.replyToUserName} · ` : item.parentId ? '回复 · ' : ''
  const prefix = item.parentId ? '└ ' : ''
  return `${prefix}${author}：${reply}${snippet(item.content || '')}`
}

async function loadPostComments(postId: string) {
  commentsLoading.value = true
  comments.value = []
  selectedCommentId.value = ''
  try {
    const pageSize = 50
    const first = await communityForumAdminApi.listComments(postId, { page: 1, pageSize })
    const list = [...(first.list || [])]
    const totalPages = Math.max(1, first.pagination?.totalPages ?? 1)
    for (let page = 2; page <= totalPages; page++) {
      const next = await communityForumAdminApi.listComments(postId, { page, pageSize })
      list.push(...(next.list || []))
    }
    comments.value = list.filter(
      (item) => item.id && item.status !== COMMUNITY_COMMENT_STATUS.DELETED
    )
  } catch (e) {
    formError.value = e instanceof ApiError ? e.message : '评论列表加载失败'
    comments.value = []
  } finally {
    commentsLoading.value = false
  }
}

function openDeleteComment(item: CommunityPostItem) {
  commentPost.value = item
  comments.value = []
  selectedCommentId.value = ''
  formError.value = ''
  commentModalOpen.value = true
  void loadPostComments(item.id)
}

function closeCommentModal() {
  commentModalOpen.value = false
  commentPost.value = null
  comments.value = []
  selectedCommentId.value = ''
  formError.value = ''
}

async function submitDeleteComment() {
  if (!selectedCommentId.value) {
    formError.value = '请选择要删除的评论'
    return
  }
  const preview = snippet(selectedComment.value?.content || '', 40)
  if (!confirm(`确认删除评论「${preview}」？`)) return
  formSubmitting.value = true
  formError.value = ''
  try {
    await communityForumAdminApi.deleteComment(selectedCommentId.value)
    const postId = commentPost.value?.id
    selectedCommentId.value = ''
    if (postId) await loadPostComments(postId)
    await loadPosts(postPage.value, true)
  } catch (e) {
    formError.value = e instanceof ApiError ? e.message : '删评论失败'
  } finally {
    formSubmitting.value = false
  }
}

function openHandleReport(item: ContentReportItem) {
  reportTarget.value = item
  reportAction.value = COMMUNITY_REPORT_ACTION.ACCEPT
  handleRemark.value = ''
  formError.value = ''
  reportModalOpen.value = true
}

function closeReportModal() {
  reportModalOpen.value = false
  reportTarget.value = null
  formError.value = ''
}

async function submitHandleReport() {
  if (!reportTarget.value) return
  formSubmitting.value = true
  formError.value = ''
  try {
    await communityForumAdminApi.handleReport(reportTarget.value.id, {
      action: reportAction.value,
      handleRemark: handleRemark.value.trim() || undefined
    })
    closeReportModal()
    await loadReports(reportPage.value)
  } catch (e) {
    formError.value = e instanceof ApiError ? e.message : '处理失败'
  } finally {
    formSubmitting.value = false
  }
}

onMounted(() => {
  void loadPosts(1)
})
</script>

<style scoped>
.page { max-width: 1100px; }
.header { margin-bottom: 16px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin: 0 0 8px; }
.desc { font-size: 14px; color: #8c8c9a; margin: 0; }
.tabs { display: flex; gap: 8px; margin-bottom: 14px; }
.tab { padding: 8px 14px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fff; cursor: pointer; }
.tab.active { background: #5c5c9e; color: #fff; border-color: #5c5c9e; }
.panel { background: #fff; border-radius: 12px; padding: 20px 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.input { padding: 10px 14px; border: 1px solid #e8e8ec; border-radius: 8px; font-size: 14px; box-sizing: border-box; min-width: 160px; }
.select { min-width: 140px; background: #fff; }
.table { width: 100%; border-collapse: collapse; font-size: 14px; }
.table th, .table td { padding: 12px 10px; text-align: left; border-bottom: 1px solid #f0f0f3; vertical-align: top; }
.table th { color: #8c8c9a; font-weight: 500; background: #fafafc; }
.contentCell { max-width: 280px; word-break: break-word; }
.linkBtn { border: none; background: none; color: #5c5c9e; cursor: pointer; margin-right: 8px; padding: 0; }
.linkBtn.danger { color: #e05c5c; }
.linkBtn:disabled { color: #c8c8d0; cursor: not-allowed; }
.hint, .error { font-size: 14px; color: #8c8c9a; text-align: center; padding: 24px 0; }
.error { color: #e05c5c; }
.modalBody .error { text-align: left; padding: 0 0 8px; }
.muted { color: #8c8c9a; font-size: 12px; margin-left: 4px; }
.hintInline { margin: 0 0 12px; font-size: 13px; color: #5c5c66; }
.pagination { display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-top: 12px; }
.pageInfo { font-size: 13px; color: #8c8c9a; }
.pageBtn { width: 32px; height: 32px; border-radius: 6px; border: 1px solid #e8e8ec; background: #fff; cursor: pointer; }
.pageBtn:disabled { color: #c8c8d0; cursor: not-allowed; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; background: #5c5c9e; color: #fff; border: none; cursor: pointer; }
.btnPrimary:disabled { opacity: 0.6; cursor: not-allowed; }
.btnSecondary { padding: 10px 18px; border-radius: 8px; border: 1px solid #e8e8ec; background: #fff; cursor: pointer; }
.modalOverlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; padding: 24px; }
.modal { background: #fff; border-radius: 12px; width: min(560px, 100%); }
.fieldHint { margin: 0 0 8px; font-size: 13px; color: #8c8c9a; }
.commentSelect { width: 100%; min-width: 0; }
.commentPreview { background: #fafafc; border-radius: 8px; padding: 12px 14px; margin-bottom: 12px; }
.commentMeta { font-size: 12px; color: #8c8c9a; margin-bottom: 6px; }
.commentText { margin: 0; font-size: 14px; color: #1f1f2e; line-height: 1.5; word-break: break-word; }
.modalHeader { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid #f0f0f3; }
.modalTitle { font-size: 16px; font-weight: 600; margin: 0; }
.modalClose { border: none; background: none; font-size: 24px; cursor: pointer; color: #8c8c9a; }
.modalBody { padding: 24px; }
.field { margin-bottom: 16px; }
.label { display: block; font-size: 13px; color: #5c5c66; margin-bottom: 8px; }
.required { color: #e05c5c; }
.radioGroup { display: flex; gap: 20px; }
.radioItem { display: flex; align-items: center; gap: 6px; font-size: 14px; color: #5c5c66; cursor: pointer; }
.textarea { width: 100%; padding: 10px 12px; border: 1px solid #e8e8ec; border-radius: 8px; font-size: 14px; box-sizing: border-box; resize: vertical; font-family: inherit; }
.auditInfo { background: #fafafc; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
.infoRow { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; font-size: 14px; color: #5c5c66; }
.infoLabel { color: #8c8c9a; flex-shrink: 0; }
.modalFooter { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }
</style>
