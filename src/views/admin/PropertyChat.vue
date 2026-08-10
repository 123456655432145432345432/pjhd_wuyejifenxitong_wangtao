<template>
  <div class="page">
    <div class="header">
      <div>
        <h1 class="title">住户消息</h1>
        <p class="desc">以物业官方身份与住户一对一沟通（复用官方消息会话）</p>
      </div>
    </div>

    <div class="layout">
      <aside class="sidebar">
        <form class="search" @submit.prevent="loadConversations(1)">
          <IconSvg name="search" />
          <input
            v-model.trim="keyword"
            type="search"
            placeholder="搜索住户姓名 / ID"
            @input="onSearchInput"
          />
        </form>
        <div v-if="listLoading" class="hint">加载会话...</div>
        <p v-else-if="listError" class="error">{{ listError }}</p>
        <ul v-else-if="conversations.length" class="convList">
          <li
            v-for="item in conversations"
            :key="item.peerId"
            class="convItem"
            :class="{ active: selectedPeerId === item.peerId }"
            @click="selectConversation(item)"
          >
            <div class="avatar" :style="{ background: avatarColor(item.peerId || item.peerName) }">
              {{ initials(item.peerName) }}
            </div>
            <div class="convBody">
              <div class="convTop">
                <span class="peerName">{{ item.peerName || item.peerId }}</span>
                <span class="time">{{ formatTime(item.lastMessageTime) }}</span>
              </div>
              <div class="convBottom">
                <span class="lastMsg">
                  <template v-if="item.lastMessageFromMe">我：</template>{{ item.lastMessage || '—' }}
                </span>
                <span v-if="item.unreadCount" class="unread">{{ item.unreadCount > 99 ? '99+' : item.unreadCount }}</span>
              </div>
            </div>
          </li>
        </ul>
        <p v-else class="hint">暂无会话。可从住户详情发起沟通，或等待住户回复官方消息后出现。</p>
        <div v-if="listTotalPages > 1" class="pager">
          <button type="button" class="pageBtn" :disabled="listPage <= 1 || listLoading" @click="loadConversations(listPage - 1)">
            上一页
          </button>
          <span>{{ listPage }} / {{ listTotalPages }}</span>
          <button
            type="button"
            class="pageBtn"
            :disabled="listPage >= listTotalPages || listLoading"
            @click="loadConversations(listPage + 1)"
          >
            下一页
          </button>
        </div>
      </aside>

      <section class="chatPanel">
        <template v-if="selectedPeerId">
          <div class="chatHeader">
            <div>
              <strong>{{ selectedPeerName }}</strong>
              <span class="peerId">{{ selectedPeerId }}</span>
            </div>
            <button type="button" class="btnSecondary" :disabled="msgLoading" @click="loadMessages(1)">
              刷新
            </button>
          </div>
          <div ref="chatScrollEl" class="chatMessages">
            <div v-if="msgLoading && !messages.length" class="hint">加载消息...</div>
            <p v-else-if="msgError" class="error">{{ msgError }}</p>
            <template v-else>
              <button
                v-if="msgPage < msgTotalPages"
                type="button"
                class="loadMore"
                :disabled="msgLoading"
                @click="loadOlder"
              >
                {{ msgLoading ? '加载中...' : '加载更早消息' }}
              </button>
              <div
                v-for="msg in messagesAsc"
                :key="msg.id"
                class="bubbleRow"
                :class="{ fromMe: msg.fromMe }"
              >
                <div class="bubble">
                  <div class="bubbleContent">{{ msg.content }}</div>
                  <div class="bubbleMeta">
                    {{ formatTime(msg.createdAt) }}
                    <span v-if="msg.fromMe"> · {{ msg.readStatus === 'read' ? '已读' : '未读' }}</span>
                  </div>
                </div>
              </div>
              <p v-if="!messages.length" class="hint">暂无聊天记录，发送第一条消息开始沟通</p>
            </template>
          </div>
          <form class="composer" @submit.prevent="sendMessage">
            <textarea
              v-model.trim="draft"
              class="textarea"
              rows="3"
              maxlength="2000"
              placeholder="输入消息内容…"
              @keydown.enter.exact.prevent="sendMessage"
            />
            <div class="composerActions">
              <span class="hint">{{ draft.length }}/2000</span>
              <button type="submit" class="btnPrimary" :disabled="sending || !draft">
                {{ sending ? '发送中...' : '发送' }}
              </button>
            </div>
            <p v-if="sendError" class="error">{{ sendError }}</p>
          </form>
        </template>
        <div v-else class="emptyChat">
          <IconSvg name="notice" />
          <p>请选择左侧会话，或输入住户 ID 直接发起</p>
          <form class="startForm" @submit.prevent="startByResidentId">
            <input v-model.trim="startResidentId" class="input" placeholder="住户 ID（如 res_xxx）" />
            <button type="submit" class="btnPrimary" :disabled="!startResidentId">开始聊天</button>
          </form>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import IconSvg from '../../components/IconSvg.vue'
import { adminMessageApi } from '../../api/services'
import { avatarColor, initials } from '../../api/mappers'
import { ApiError } from '../../api/request'
import type { AdminChatMessageItem, AdminConversationItem } from '../../api/types'

const route = useRoute()
const keyword = ref('')
const listLoading = ref(false)
const listError = ref('')
const conversations = ref<AdminConversationItem[]>([])
const listPage = ref(1)
const listTotalPages = ref(1)
let searchTimer: ReturnType<typeof setTimeout> | null = null

const selectedPeerId = ref('')
const selectedPeerName = ref('')
const messages = ref<AdminChatMessageItem[]>([])
const msgLoading = ref(false)
const msgError = ref('')
const msgPage = ref(1)
const msgTotalPages = ref(1)
const draft = ref('')
const sending = ref(false)
const sendError = ref('')
const startResidentId = ref('')
const chatScrollEl = ref<HTMLElement | null>(null)

const messagesAsc = computed(() => [...messages.value].reverse())

function formatTime(value?: string) {
  if (!value) return ''
  return value.replace('T', ' ').slice(0, 16)
}

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadConversations(1), 300)
}

async function loadConversations(page = 1) {
  listLoading.value = true
  listError.value = ''
  try {
    const res = await adminMessageApi.conversations({
      page,
      pageSize: 20,
      keyword: keyword.value || undefined
    })
    conversations.value = res.list || []
    listPage.value = res.pagination?.page || page
    listTotalPages.value = res.pagination?.totalPages || 1
  } catch (e) {
    listError.value = e instanceof ApiError ? e.message : '加载会话失败'
    conversations.value = []
  } finally {
    listLoading.value = false
  }
}

async function selectConversation(item: AdminConversationItem) {
  selectedPeerId.value = item.peerId
  selectedPeerName.value = item.peerName || item.peerId
  draft.value = ''
  sendError.value = ''
  await loadMessages(1)
  // 打开后未读清零，刷新列表角标
  item.unreadCount = 0
}

async function startByResidentId() {
  const id = startResidentId.value.trim()
  if (!id) return
  selectedPeerId.value = id
  selectedPeerName.value = id
  await loadMessages(1)
  await loadConversations(listPage.value)
}

async function loadMessages(page = 1, append = false) {
  if (!selectedPeerId.value) return
  msgLoading.value = true
  msgError.value = ''
  try {
    const res = await adminMessageApi.conversationMessages(selectedPeerId.value, {
      page,
      pageSize: 30
    })
    const list = res.list || []
    messages.value = append ? [...messages.value, ...list] : list
    msgPage.value = res.pagination?.page || page
    msgTotalPages.value = res.pagination?.totalPages || 1
    if (!append) {
      await nextTick()
      scrollToBottom()
    }
  } catch (e) {
    msgError.value = e instanceof ApiError ? e.message : '加载消息失败'
    if (!append) messages.value = []
  } finally {
    msgLoading.value = false
  }
}

async function loadOlder() {
  if (msgPage.value >= msgTotalPages.value) return
  await loadMessages(msgPage.value + 1, true)
}

function scrollToBottom() {
  const el = chatScrollEl.value
  if (el) el.scrollTop = el.scrollHeight
}

async function sendMessage() {
  if (!selectedPeerId.value || !draft.value || sending.value) return
  sending.value = true
  sendError.value = ''
  const content = draft.value
  try {
    const msg = await adminMessageApi.send(selectedPeerId.value, { content })
    draft.value = ''
    messages.value = [msg, ...messages.value]
    await nextTick()
    scrollToBottom()
    await loadConversations(listPage.value)
  } catch (e) {
    sendError.value = e instanceof ApiError ? e.message : '发送失败'
  } finally {
    sending.value = false
  }
}

onMounted(async () => {
  await loadConversations(1)
  const q = route.query.residentId
  if (typeof q === 'string' && q) {
    startResidentId.value = q
    await startByResidentId()
  }
})
</script>

<style scoped>
.page { max-width: 1200px; }
.header { margin-bottom: 16px; }
.title { font-size: 24px; font-weight: 600; margin: 0 0 6px; color: #1f1f2e; }
.desc { margin: 0; color: #8c8c9a; font-size: 14px; }
.layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 16px;
  min-height: 560px;
}
.sidebar, .chatPanel {
  background: #fff;
  border: 1px solid #f0f0f3;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.search {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px;
  padding: 8px 12px;
  border: 1px solid #e8e8ec;
  border-radius: 8px;
}
.search input {
  flex: 1;
  border: none;
  outline: none;
  font: inherit;
  background: transparent;
}
.convList { list-style: none; margin: 0; padding: 0; overflow-y: auto; flex: 1; }
.convItem {
  display: flex;
  gap: 10px;
  padding: 12px 14px;
  cursor: pointer;
  border-bottom: 1px solid #f5f5f7;
}
.convItem:hover, .convItem.active { background: #f7f7fb; }
.avatar {
  width: 40px; height: 40px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 600; flex-shrink: 0;
}
.convBody { flex: 1; min-width: 0; }
.convTop, .convBottom { display: flex; justify-content: space-between; gap: 8px; }
.peerName { font-weight: 600; color: #1f1f2e; font-size: 14px; }
.time { font-size: 12px; color: #b0b0ba; flex-shrink: 0; }
.lastMsg {
  font-size: 13px; color: #8c8c9a;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.unread {
  min-width: 18px; height: 18px; padding: 0 5px;
  border-radius: 999px; background: #e05c5c; color: #fff;
  font-size: 11px; display: inline-flex; align-items: center; justify-content: center;
}
.pager {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 10px; border-top: 1px solid #f0f0f3; font-size: 13px; color: #8c8c9a;
}
.pageBtn, .btnPrimary, .btnSecondary {
  padding: 8px 14px; border-radius: 8px; cursor: pointer; font: inherit;
}
.pageBtn, .btnSecondary { border: 1px solid #e8e8ec; background: #fff; color: #1f1f2e; }
.btnPrimary { border: none; background: #5c5c9e; color: #fff; }
.pageBtn:disabled, .btnPrimary:disabled, .btnSecondary:disabled { opacity: 0.6; cursor: not-allowed; }

.chatHeader {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 16px; border-bottom: 1px solid #f0f0f3;
}
.peerId { margin-left: 8px; font-size: 12px; color: #b0b0ba; font-weight: 400; }
.chatMessages {
  flex: 1; overflow-y: auto; padding: 16px;
  background: #fafafc; min-height: 320px; max-height: 480px;
}
.loadMore {
  display: block; margin: 0 auto 12px;
  border: none; background: transparent; color: #5c5c9e; cursor: pointer; font-size: 13px;
}
.bubbleRow { display: flex; margin-bottom: 12px; }
.bubbleRow.fromMe { justify-content: flex-end; }
.bubble {
  max-width: 75%;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #f0f0f3;
}
.bubbleRow.fromMe .bubble {
  background: #5c5c9e;
  border-color: #5c5c9e;
  color: #fff;
}
.bubbleContent { font-size: 14px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }
.bubbleMeta { margin-top: 6px; font-size: 11px; opacity: 0.7; }
.composer { padding: 12px 16px; border-top: 1px solid #f0f0f3; }
.textarea {
  width: 100%; box-sizing: border-box; padding: 10px 12px;
  border: 1px solid #e8e8ec; border-radius: 8px; resize: vertical; font: inherit;
}
.composerActions {
  display: flex; justify-content: space-between; align-items: center;
  margin-top: 8px;
}
.emptyChat {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 12px;
  color: #8c8c9a; padding: 32px; text-align: center;
}
.emptyChat svg { font-size: 36px; opacity: 0.5; }
.startForm { display: flex; gap: 8px; width: 100%; max-width: 420px; }
.input {
  flex: 1; padding: 8px 12px; border: 1px solid #e8e8ec; border-radius: 8px; font: inherit;
}
.hint { color: #8c8c9a; font-size: 13px; padding: 12px; }
.error { color: #e05c5c; font-size: 13px; padding: 8px 12px; }

@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; }
  .sidebar { max-height: 280px; }
}
</style>
