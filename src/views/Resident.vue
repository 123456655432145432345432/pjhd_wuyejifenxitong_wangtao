<template>
    <div class="page">
      <div class="header">
        <div>
          <h1 class="title">住户资料管理</h1>
          <p class="desc">
            {{
              isCoordinatorReadonly
                ? '统筹只读查看住户列表与详情；新建/编辑/冻结/删除由物业管理员操作。'
                : '按楼栋-楼层-单元-房号排序；未填写地址的住户排在全部列表最后。'
            }}
          </p>
        </div>
        <div class="headerActions" :class="{ headerActionsMobile: isMobile }">
          <button v-if="canMutateResident" class="btnPrimary" @click="openCreateModal">
            <IconSvg name="plus" />
            新增住户
          </button>
          <SegmentedControl :tabs="statusTabs" v-model="activeStatus" />
        </div>
      </div>
      <div class="toolbar" :class="{ toolbarMobile: isMobile }">
        <form class="search" @submit.prevent="submitSearch">
          <IconSvg name="search" />
          <input
            v-model="searchKeyword"
            type="search"
            placeholder="搜索姓名、手机号..."
            @input="onSearchInput"
          />
        </form>
        <button v-if="isMobile" class="btnSecondary mobileFilterBtn" @click="mobileFilterOpen = !mobileFilterOpen">
          <IconSvg name="filter" />
          {{ mobileFilterOpen ? '收起筛选' : '筛选楼栋' }}
        </button>
        <div class="filters" :class="{ filtersMobile: isMobile, filtersMobileOpen: !isMobile || mobileFilterOpen }">
          <select v-model="selectedBuilding" class="select" @change="applyFilters">
            <option value="">全部楼栋</option>
            <option value="__null__">未填写楼栋</option>
            <option v-for="building in buildingOptions" :key="building" :value="building">
              {{ building }}
            </option>
          </select>
        </div>
      </div>
      <div class="table">
        <div v-if="isMobile" class="residentCards">
          <div v-if="loading" class="emptyCell">加载中...</div>
          <div v-else-if="!residents.length" class="emptyCell">暂无住户数据</div>
          <div v-for="resident in residents" v-else :key="resident.id" class="residentCard">
            <div class="residentCardHeader">
              <div class="info">
                <div class="avatar" :style="{ background: resident.avatarColor }">{{ resident.initials }}</div>
                <div>
                  <div class="name">
                    {{ resident.name }}
                    <span
                      v-if="resident.hasArrears"
                      class="arrearsBadge"
                      @click="goArrearsFromList(resident)"
                    >
                      {{ formatArrearsBadge(resident) }}
                    </span>
                  </div>
                  <div class="residentPhone">{{ resident.phone }}</div>
                </div>
              </div>
              <span class="badge" :class="statusBadgeClass(resident.status)">
                {{ resident.statusLabel }}
              </span>
            </div>
            <div class="residentMeta">
              <span>{{ resident.addressLabel || '未填写地址' }}</span>
              <span>{{ resident.identity === RESIDENT_USER_TYPE.OWNER ? '业主' : '租住人员' }}</span>
              <span>{{ resident.registerTime }}</span>
            </div>
            <div class="residentCardActions">
              <button class="cardActionBtn" @click="openDetailModal(resident.id)">详情</button>
              <button
                v-if="canMutateResident"
                class="cardActionBtn"
                @click="router.push({ name: 'property-chat', query: { residentId: resident.id } })"
              >
                消息
              </button>
              <button v-if="canEditResident" class="cardActionBtn primary" @click="openEditModal(resident.id)">编辑</button>
              <button
                v-if="canMutateResident"
                class="cardActionBtn warning"
                @click="openStatusModal(resident.id, resident.status)"
              >
                状态
              </button>
              <button
                v-if="canMutateResident"
                class="cardActionBtn danger"
                @click="openDeleteModal(resident.id, resident.name)"
              >
                删除
              </button>
            </div>
          </div>
        </div>
        <table v-else>
          <thead>
            <tr>
              <th>姓名</th>
              <th>手机号</th>
              <th>楼栋</th>
              <th>楼层</th>
              <th>单元</th>
              <th>房号</th>
              <th>身份</th>
              <th>欠费</th>
              <th>状态</th>
              <th>家庭</th>
              <th>注册时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="12" class="emptyCell">加载中...</td>
            </tr>
            <tr v-else-if="!residents.length">
              <td colspan="12" class="emptyCell">暂无住户数据</td>
            </tr>
            <tr v-for="resident in residents" v-else :key="resident.id">
              <td>
                <div class="info">
                  <div class="avatar" :style="{ background: resident.avatarColor }">{{ resident.initials }}</div>
                  <span class="name">{{ resident.name }}</span>
                </div>
              </td>
              <td>{{ resident.phone }}</td>
              <td>
                <span :class="{ mutedCell: resident.building === '未填写' }">{{ resident.building }}</span>
              </td>
              <td>
                <span :class="{ mutedCell: resident.floor === '未填写' }">{{ resident.floor }}</span>
              </td>
              <td>
                <span :class="{ mutedCell: resident.unit === '未填写' }">{{ resident.unit }}</span>
              </td>
              <td>
                <span :class="{ mutedCell: resident.room === '未填写' }">{{ resident.room }}</span>
              </td>
              <td>
                <span class="badge" :class="resident.identity === RESIDENT_USER_TYPE.OWNER ? 'purple' : 'green'">
                  {{ resident.identity === RESIDENT_USER_TYPE.OWNER ? '业主' : '租住人员' }}
                </span>
              </td>
              <td>
                <button
                  v-if="resident.hasArrears"
                  type="button"
                  class="arrearsBadge link"
                  @click="goArrearsFromList(resident)"
                >
                  {{ formatArrearsBadge(resident) }}
                </button>
                <span v-else class="mutedCell">无</span>
              </td>
              <td>
                <span class="badge" :class="statusBadgeClass(resident.status)">
                  {{ resident.statusLabel }}
                </span>
              </td>
              <td>{{ resident.familyCount }}</td>
              <td>{{ resident.registerTime }}</td>
              <td>
                <div class="actions">
                  <button class="actionBtn detail" title="详情" @click="openDetailModal(resident.id)">
                    <IconSvg name="eye" />
                  </button>
                  <button
                    v-if="canEditResident"
                    class="actionBtn edit"
                    title="编辑"
                    @click="openEditModal(resident.id)"
                  >
                    <IconSvg name="edit" />
                  </button>
                  <button
                    v-if="canMutateResident"
                    class="actionBtn status"
                    title="变更状态"
                    @click="openStatusModal(resident.id, resident.status)"
                  >
                    <IconSvg name="setting" />
                  </button>
                  <button
                    v-if="canMutateResident"
                    class="actionBtn delete"
                    title="删除"
                    @click="openDeleteModal(resident.id, resident.name)"
                  >
                    <IconSvg name="close" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="footer">
          <span class="total">
            显示 {{ pageStart }} 到 {{ pageEnd }}，共 {{ residentTotal }} 条记录
          </span>
          <div v-if="totalPages > 1" class="pagination">
            <button class="pageBtn" :disabled="currentPage <= 1 || loading" @click="changePage(currentPage - 1)">&lt;</button>
            <span class="pageInfo">{{ currentPage }} / {{ totalPages }}</span>
            <button class="pageBtn" :disabled="currentPage >= totalPages || loading" @click="changePage(currentPage + 1)">&gt;</button>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="createModalOpen" class="modalOverlay" @click.self="closeCreateModal">
        <div class="modal modalScroll" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">新增住户</h3>
            <button class="modalClose" @click="closeCreateModal">&times;</button>
          </div>
          <form class="modalBody" @submit.prevent="submitCreate">
            <div class="field">
              <label class="label">姓名 <span class="required">*</span></label>
              <input v-model="createForm.name" type="text" class="input" maxlength="50" required />
            </div>
            <div class="field">
              <label class="label">手机号 <span class="required">*</span></label>
              <input v-model="createForm.phone" type="tel" class="input" maxlength="11" pattern="1\d{10}" required />
            </div>
            <div class="field">
              <label class="label">身份 <span class="required">*</span></label>
              <select v-model="createForm.userType" class="input" required>
                <option v-for="opt in createUserTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
            <div class="field">
              <label class="label">所属小区 <span class="required">*</span></label>
              <select
                v-model="createForm.communityId"
                class="input"
                required
                :disabled="communitiesLoading || !communities.length"
              >
                <option v-if="communitiesLoading" value="">加载小区中...</option>
                <option v-else-if="!communities.length" value="">暂无可用小区</option>
                <option v-for="item in communities" :key="item.id" :value="item.id">
                  {{ item.name || item.id }}
                </option>
              </select>
            </div>
            <div class="fieldRow">
              <div class="field">
                <label class="label">楼栋</label>
                <input v-model="createForm.building" type="text" class="input" maxlength="20" />
              </div>
              <div class="field">
                <label class="label">楼层</label>
                <input v-model="createForm.floor" type="text" class="input" maxlength="20" />
              </div>
              <div class="field">
                <label class="label">单元</label>
                <input v-model="createForm.unit" type="text" class="input" maxlength="20" />
              </div>
              <div class="field">
                <label class="label">房号</label>
                <input v-model="createForm.room" type="text" class="input" maxlength="20" />
              </div>
            </div>
            <div class="fieldRow">
              <div class="field">
                <label class="label">性别</label>
                <select v-model.number="createForm.gender" class="input">
                  <option v-for="opt in GENDER_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
              <div class="field">
                <label class="label">生日</label>
                <input v-model="createForm.birthday" type="date" min="1920-01-01" :max="today" class="input" />
              </div>
            </div>
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="closeCreateModal">取消</button>
              <button type="submit" class="btnPrimary" :disabled="formSubmitting">
                {{ formSubmitting ? '提交中...' : '创建' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="detailModalOpen" class="modalOverlay" @click.self="closeDetailModal">
        <div class="modal modalWide modalScroll" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">住户详情</h3>
            <button class="modalClose" @click="closeDetailModal">&times;</button>
          </div>
          <div class="modalBody">
            <div v-if="detailLoading" class="loadingText">加载中...</div>
            <template v-else-if="detailData">
              <div
                v-if="detailData.hasArrears"
                class="arrearsBanner"
                :role="canMutateResident ? 'button' : undefined"
                :tabindex="canMutateResident ? 0 : undefined"
                @click="goArrearsReport(detailData)"
                @keydown.enter="goArrearsReport(detailData)"
              >
                <strong>欠费提醒</strong>
                <span>{{ formatArrearsBadge(detailData) }}</span>
                <span class="arrearsLink">查看欠费报表 →</span>
              </div>
              <div class="detailGrid">
                <div v-for="row in detailRows" :key="row.label" class="detailItem">
                  <span class="detailLabel">{{ row.label }}</span>
                  <span class="detailValue">{{ row.value }}</span>
                </div>
              </div>
              <div class="familySection">
                <h4 class="familyTitle">家庭成员（{{ familyMembers.length }}）</h4>
                <p class="familyHint">加人须同一小区+楼栋+单元+房号（忽略楼层）。</p>
                <div v-if="familyLoading" class="loadingText compact">加载家庭成员...</div>
                <p v-else-if="!detailData.familyId" class="familyEmpty">该住户尚未加入家庭</p>
                <p v-else-if="familyError" class="error">{{ familyError }}</p>
                <table v-else-if="familyMembers.length" class="familyTable">
                  <thead>
                    <tr>
                      <th>姓名</th>
                      <th>关系</th>
                      <th>手机号</th>
                      <th>状态</th>
                      <th>加入时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="member in familyMembers" :key="member.id">
                      <td>
                        {{ member.name || '—' }}
                        <span v-if="member.isOwner" class="ownerTag">户主</span>
                      </td>
                      <td>{{ getEnumLabel(FAMILY_RELATION_LABEL, member.relation, '—') }}</td>
                      <td>{{ member.phone || '—' }}</td>
                      <td>{{ getEnumLabel(RESIDENT_STATUS_LABEL, member.status, '—') }}</td>
                      <td>{{ member.joinedAt || '—' }}</td>
                    </tr>
                  </tbody>
                </table>
                <p v-else class="familyEmpty">暂无家庭成员</p>
                <div v-if="detailData.familyId && canMutateResident" class="familyAdd">
                  <label class="label">添加家庭成员</label>
                  <ResidentSearchSelect
                    v-model="familyAddResidentId"
                    :status="RESIDENT_STATUS.ACTIVE"
                    @select="onFamilyAddSelect"
                  />
                  <select v-model="familyAddRelation" class="input">
                    <option v-for="opt in FAMILY_RELATION_OPTIONS" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                  <input
                    v-model="familyAddPhone"
                    class="input"
                    maxlength="11"
                    placeholder="11位手机号（脱敏时请手填）"
                  />
                  <button
                    type="button"
                    class="btnSecondary"
                    :disabled="familyAdding"
                    @click="submitFamilyAdd"
                  >
                    {{ familyAdding ? '添加中...' : '添加成员' }}
                  </button>
                  <p v-if="familyAddError" class="error">{{ familyAddError }}</p>
                </div>
              </div>
            </template>
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="closeDetailModal">关闭</button>
              <button
                v-if="detailData && canMutateResident"
                type="button"
                class="btnSecondary"
                @click="router.push({ name: 'property-chat', query: { residentId: detailData.id } }); closeDetailModal()"
              >
                发消息
              </button>
              <button
                v-if="detailData?.building && canMutateResident"
                type="button"
                class="btnSecondary"
                @click="goArrearsReport(detailData)"
              >
                查看楼栋欠费
              </button>
              <button
                v-if="detailData && canMutateResident"
                type="button"
                class="btnSecondary"
                :disabled="withdrawBlockSubmitting"
                @click="toggleResidentWithdrawBlock(detailData)"
              >
                {{ detailData.withdrawalBlocked ? '解除提现阻止' : '阻止提现' }}
              </button>
              <button
                v-if="detailData && canEditResident"
                type="button"
                class="btnPrimary"
                @click="openEditModal(detailData.id); closeDetailModal()"
              >
                编辑信息
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="editModalOpen" class="modalOverlay" @click.self="closeEditModal">
        <div class="modal modalScroll" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">编辑住户信息</h3>
            <button class="modalClose" @click="closeEditModal">&times;</button>
          </div>
          <form class="modalBody" @submit.prevent="submitEdit">
            <div v-if="editLoading" class="loadingText">加载中...</div>
            <template v-else>
              <div class="field">
                <label class="label">姓名</label>
                <input v-model="editForm.name" type="text" class="input" maxlength="50" />
              </div>
              <div class="fieldRow">
                <div class="field">
                  <label class="label">性别</label>
                  <select v-model.number="editForm.gender" class="input">
                    <option v-for="opt in GENDER_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </div>
                <div class="field">
                  <label class="label">生日</label>
                  <input v-model="editForm.birthday" type="date" min="1920-01-01" :max="today" class="input" />
                </div>
                <div class="field">
                  <label class="label">年龄（自动计算）</label>
                  <input :value="calculateAge(editForm.birthday)" type="text" class="input" disabled />
                </div>
              </div>
              <div class="field">
                <label class="label">婚姻状态</label>
                <select v-model="editForm.maritalStatus" class="input">
                  <option v-for="opt in MARITAL_STATUS_OPTIONS" :key="opt.value || 'empty'" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </div>
              <div class="field">
                <label class="label">是否有子女</label>
                <select v-model="editForm.hasChildren" class="input">
                  <option :value="undefined">未填写</option>
                  <option :value="true">是</option>
                  <option :value="false">否</option>
                </select>
              </div>
              <div class="fieldRow">
                <div class="field">
                  <label class="label">楼栋</label>
                  <input v-model="editForm.building" type="text" class="input" maxlength="20" />
                </div>
                <div class="field">
                  <label class="label">楼层</label>
                  <input v-model="editForm.floor" type="text" class="input" maxlength="20" />
                </div>
                <div class="field">
                  <label class="label">单元</label>
                  <input v-model="editForm.unit" type="text" class="input" maxlength="20" />
                </div>
                <div class="field">
                  <label class="label">房号</label>
                  <input v-model="editForm.room" type="text" class="input" maxlength="20" />
                </div>
              </div>
            </template>
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="closeEditModal">取消</button>
              <button type="submit" class="btnPrimary" :disabled="formSubmitting || editLoading">
                {{ formSubmitting ? '保存中...' : '保存' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="statusModalOpen" class="modalOverlay" @click.self="closeStatusModal">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">变更住户状态</h3>
            <button class="modalClose" @click="closeStatusModal">&times;</button>
          </div>
          <form class="modalBody" @submit.prevent="submitStatus">
            <div class="field">
              <label class="label">目标状态 <span class="required">*</span></label>
              <select v-model="statusForm.status" class="input" required>
                <option v-for="opt in RESIDENT_STATUS_OPTIONS" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div class="field">
              <label class="label">操作原因</label>
              <textarea
                v-model="statusForm.reason"
                class="textarea"
                rows="3"
                maxlength="200"
                placeholder="选填，如：异常登录"
              />
            </div>
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="closeStatusModal">取消</button>
              <button type="submit" class="btnPrimary" :disabled="formSubmitting">
                {{ formSubmitting ? '提交中...' : '确认' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="deleteModalOpen" class="modalOverlay" @click.self="closeDeleteModal">
        <div class="modal" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">删除住户</h3>
            <button class="modalClose" @click="closeDeleteModal">&times;</button>
          </div>
          <div class="modalBody">
            <p class="confirmText">
              确定要删除住户「{{ deleteTargetName }}」吗？此操作为软删除，删除后不可恢复登录。
            </p>
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="closeDeleteModal">取消</button>
              <button type="button" class="btnDanger" :disabled="formSubmitting" @click="submitDelete">
                {{ formSubmitting ? '删除中...' : '确认删除' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import IconSvg from '../components/IconSvg.vue'
import ResidentSearchSelect from '../components/ResidentSearchSelect.vue'
import SegmentedControl from '../components/SegmentedControl.vue'
import { familyApi, propertyCompanyApi, residentApi, coinWithdrawalAdminApi } from '../api/services'
import { ApiError } from '../api/request'
import type { FamilyMemberItem, PropertyCompanyCommunity, ResidentItem, ResidentUpdatePayload } from '../api/types'
import { formatMoney, mapResidents, sortResidentsByAddress } from '../api/mappers'
import { useIsMobile } from '../composables/useIsMobile'
import {
  RESIDENT_STATUS,
  RESIDENT_STATUS_OPTIONS,
  RESIDENT_STATUS_LABEL,
  RESIDENT_USER_TYPE,
  RESIDENT_USER_TYPE_LABEL,
  MARITAL_STATUS_OPTIONS,
  MARITAL_STATUS_LABEL,
  FAMILY_RELATION,
  FAMILY_RELATION_LABEL,
  FAMILY_RELATION_OPTIONS,
  USER_ROLE,
  ROLE_LABEL,
  getEnumLabel
} from '../constants/enums'
import { useAuthStore } from '../stores/auth'
import { isSameHousing } from '../utils/housing'

const PAGE_SIZE = 20
const today = new Date().toISOString().slice(0, 10)

const GENDER_OPTIONS = [
  { value: 0, label: '未知' },
  { value: 1, label: '男' },
  { value: 2, label: '女' }
]

const createUserTypeOptions = [
  { value: RESIDENT_USER_TYPE.OWNER, label: '业主' },
  { value: RESIDENT_USER_TYPE.TENANT, label: '租住人员' }
]

const authStore = useAuthStore()
const router = useRouter()
const { isMobile } = useIsMobile()

const loading = ref(true)
const mobileFilterOpen = ref(false)
const searchKeyword = ref('')
const appliedKeyword = ref('')
const selectedBuilding = ref('')
const buildingOptions = ref<string[]>([])
const residents = ref<ReturnType<typeof mapResidents>>([])
/** 当前筛选条件下的全量排序结果（有地址在前，未填地址在全列表末尾） */
const allSortedResidents = ref<ReturnType<typeof mapResidents>>([])
const residentTotal = ref(0)
const currentPage = ref(1)
const totalPages = ref(1)

const createModalOpen = ref(false)
const communities = ref<PropertyCompanyCommunity[]>([])
const communitiesLoading = ref(false)
const detailModalOpen = ref(false)
const editModalOpen = ref(false)
const statusModalOpen = ref(false)
const deleteModalOpen = ref(false)

const formError = ref('')
const formSubmitting = ref(false)
const detailLoading = ref(false)
const editLoading = ref(false)
const withdrawBlockSubmitting = ref(false)
const detailData = ref<ResidentItem | null>(null)
const familyMembers = ref<FamilyMemberItem[]>([])
const familyAddResidentId = ref('')
const familyAddResident = ref<ResidentItem | null>(null)
const familyAddRelation = ref(FAMILY_RELATION.SPOUSE)
const familyAddPhone = ref('')
const familyAddError = ref('')
const familyAdding = ref(false)
const familyLoading = ref(false)
const familyError = ref('')
const editingId = ref('')
const statusTargetId = ref('')
const deleteTargetId = ref('')
const deleteTargetName = ref('')

const createForm = ref({
  name: '',
  phone: '',
  userType: RESIDENT_USER_TYPE.OWNER,
  communityId: '',
  building: '',
  floor: '',
  unit: '',
  room: '',
  gender: 0 as number | undefined,
  birthday: ''
})

const editForm = ref<ResidentUpdatePayload & { name?: string }>({
  name: '',
  gender: 0,
  birthday: '',
  maritalStatus: '',
  hasChildren: undefined,
  building: '',
  floor: '',
  unit: '',
  room: ''
})

const statusForm = ref({
  status: RESIDENT_STATUS.ACTIVE,
  reason: ''
})

let searchTimer: ReturnType<typeof setTimeout>

const statusTabs = [
  { code: 'all', name: '全部' },
  { code: RESIDENT_STATUS.ACTIVE, name: '正常' },
  { code: RESIDENT_STATUS.FROZEN, name: '已冻结' },
  { code: RESIDENT_STATUS.DISABLED, name: '已禁用' }
]
const activeStatus = ref('all')

const pageStart = computed(() => {
  if (!residentTotal.value) return 0
  return (currentPage.value - 1) * PAGE_SIZE + 1
})

const pageEnd = computed(() => {
  if (!residentTotal.value) return 0
  return Math.min(currentPage.value * PAGE_SIZE, residentTotal.value)
})

/** API 2.8：仅 property_admin 可编辑他人信息，platform_admin 无此权限 */
const canEditResident = computed(() => authStore.profile?.role === USER_ROLE.PROPERTY_ADMIN)
/** 统筹对住户只读：隐藏新建/冻/删等写入口 */
const isCoordinatorReadonly = computed(() => authStore.profile?.role === USER_ROLE.COORDINATOR)
const canMutateResident = computed(() => !isCoordinatorReadonly.value)

const detailRows = computed(() => {
  const d = detailData.value
  if (!d) return []
  const genderLabel = GENDER_OPTIONS.find(g => g.value === d.gender)?.label ?? '—'
  return [
    { label: '姓名', value: d.name || '—' },
    { label: '手机号', value: d.phone || '—' },
    { label: '身份', value: getEnumLabel(RESIDENT_USER_TYPE_LABEL, d.userType, '—') },
    { label: '角色', value: getEnumLabel(ROLE_LABEL, d.role, '—') },
    { label: '状态', value: getEnumLabel(RESIDENT_STATUS_LABEL, d.status) },
    { label: '物业公司', value: d.propertyName || d.propertyCompanyId || '—' },
    { label: '小区', value: d.communityName || d.communityId || '—' },
    { label: '楼栋/楼层/单元/房号', value: [d.building, d.floor, d.unit, d.room].filter(Boolean).join('-') || '—' },
    { label: '家庭编号', value: d.familyId || '—' },
    { label: '性别', value: genderLabel },
    { label: '生日', value: d.birthday || '—' },
    { label: '年龄', value: d.age !== undefined && d.age !== null ? String(d.age) : '—' },
    { label: '婚姻状态', value: getEnumLabel(MARITAL_STATUS_LABEL, d.maritalStatus, '—') },
    { label: '是否有子女', value: d.hasChildren === true ? '是' : d.hasChildren === false ? '否' : '—' },
    { label: '个人积分', value: `${formatMoney(d.pointBalance)} 积分` },
    {
      label: '家庭积分',
      value: d.familyPointBalance == null ? '—（无家庭）' : `${formatMoney(d.familyPointBalance)} 积分`
    },
    { label: '物业币余额', value: `¥${formatMoney(d.coinBalance)}` },
    { label: '物业币冻结', value: d.coinFrozen ? '已冻结' : '未冻结' },
    { label: '物业币显示', value: d.coinHidden ? '用户已隐藏' : '显示中' },
    { label: '提现阻止', value: d.withdrawalBlocked === true ? '已阻止' : d.withdrawalBlocked === false ? '正常' : '—' },
    { label: '累计消费', value: d.totalConsumption !== undefined ? `¥${formatMoney(d.totalConsumption)}` : '—' },
    { label: '累计订单', value: d.totalOrders !== undefined ? String(d.totalOrders) : '—' },
    {
      label: '欠费状态',
      value: d.hasArrears ? formatArrearsBadge(d) : '无欠费'
    },
    { label: '微信绑定', value: d.wechatBound ? '已绑定' : '未绑定' },
    { label: '注册时间', value: d.createdAt || '—' },
    { label: '更新时间', value: d.updatedAt || '—' }
  ]
})

function calculateAge(birthday?: string) {
  if (!birthday) return '—'
  const birth = new Date(`${birthday}T00:00:00`)
  if (Number.isNaN(birth.getTime())) return '—'
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  if (beforeBirthday) age -= 1
  return age >= 0 ? String(age) : '—'
}

function statusBadgeClass(status: string) {
  if (status === RESIDENT_STATUS.FROZEN) return 'orange'
  if (status === RESIDENT_STATUS.DISABLED) return 'red'
  return 'blue'
}

function resetFormError() {
  formError.value = ''
}

function resolveErrorMessage(e: unknown) {
  if (e instanceof ApiError) return e.message
  if (e instanceof Error) return e.message
  return '操作失败，请稍后重试'
}

function formatArrearsBadge(resident: {
  arrearsCount?: number
  arrearsAmount?: number
  arrearsPeriodStart?: string
  arrearsPeriodEnd?: string
}) {
  const count = resident.arrearsCount ?? 0
  const amount = formatMoney(resident.arrearsAmount)
  const start = (resident.arrearsPeriodStart || '').trim()
  const end = (resident.arrearsPeriodEnd || '').trim()
  if (start && end) return `自 ${start} 至 ${end} · 欠费${count}笔 · ¥${amount}`
  if (end) return `至 ${end} · 欠费${count}笔 · ¥${amount}`
  return `欠费${count}笔 · ¥${amount}`
}

function collectBuildings(list: ResidentItem[]) {
  const set = new Set(buildingOptions.value)
  list.forEach(item => {
    if (item.building) set.add(item.building)
  })
  buildingOptions.value = Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

async function loadBuildingOptions() {
  try {
    const res = await residentApi.list({
      page: 1,
      pageSize: 100,
      sort: '+building,+floor,+unit,+room',
      propertyCompanyId: authStore.propertyCompanyId || undefined
    })
    collectBuildings(res.list || [])
  } catch (e) {
    console.error(e)
  }
}

async function fetchAllResidentsSorted() {
  const emptyAddress = selectedBuilding.value === '__null__'
  const pageSize = 100
  const maxPages = 50
  let page = 1
  let totalApiPages = 1
  const all: ResidentItem[] = []

  while (page <= totalApiPages && page <= maxPages) {
    const res = await residentApi.list({
      page,
      pageSize,
      keyword: appliedKeyword.value || undefined,
      building: emptyAddress ? undefined : (selectedBuilding.value || undefined),
      buildingIsNull: emptyAddress ? true : undefined,
      status: activeStatus.value === 'all' ? undefined : activeStatus.value,
      propertyCompanyId: authStore.propertyCompanyId || undefined,
      sort: '+building,+floor,+unit,+room'
    })
    const list = res.list || []
    all.push(...list)
    totalApiPages = res.pagination?.totalPages ?? 1
    if (!list.length) break
    page += 1
  }

  return sortResidentsByAddress(mapResidents(all))
}

function applyResidentPage(page: number) {
  residentTotal.value = allSortedResidents.value.length
  totalPages.value = Math.max(1, Math.ceil(residentTotal.value / PAGE_SIZE) || 1)
  currentPage.value = Math.min(Math.max(1, page), totalPages.value)
  const start = (currentPage.value - 1) * PAGE_SIZE
  residents.value = allSortedResidents.value.slice(start, start + PAGE_SIZE)
}

async function loadResidents(page = currentPage.value, options: { refetch?: boolean } = {}) {
  const shouldRefetch = options.refetch !== false
  loading.value = true
  try {
    if (shouldRefetch) {
      allSortedResidents.value = await fetchAllResidentsSorted()
      if (!selectedBuilding.value || selectedBuilding.value === '__null__') {
        const set = new Set(buildingOptions.value)
        allSortedResidents.value.forEach((item) => {
          if (item.buildingRaw) set.add(item.buildingRaw)
        })
        buildingOptions.value = Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-CN'))
      }
    }
    applyResidentPage(page)
  } catch (e) {
    console.error(e)
    if (shouldRefetch) {
      allSortedResidents.value = []
    }
    residents.value = []
    residentTotal.value = 0
    totalPages.value = 1
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  if (isMobile.value) {
    mobileFilterOpen.value = false
  }
  currentPage.value = 1
  loadResidents(1, { refetch: true })
}

function submitSearch() {
  clearTimeout(searchTimer)
  appliedKeyword.value = searchKeyword.value.trim()
  currentPage.value = 1
  loadResidents(1, { refetch: true })
}

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(submitSearch, 300)
}

function changePage(page: number) {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return
  applyResidentPage(page)
}

function openCreateModal() {
  resetFormError()
  createForm.value = {
    name: '',
    phone: '',
    userType: RESIDENT_USER_TYPE.OWNER,
    communityId: '',
    building: '',
    floor: '',
    unit: '',
    room: '',
    gender: 0,
    birthday: ''
  }
  createModalOpen.value = true
  loadCommunities()
}

async function loadCommunities() {
  const companyId = authStore.propertyCompanyId
  if (!companyId) {
    communities.value = []
    return
  }
  communitiesLoading.value = true
  try {
    const res = await propertyCompanyApi.communities(companyId)
    communities.value = res.list || []
    if (communities.value.length && !createForm.value.communityId) {
      createForm.value.communityId = communities.value[0].id
    }
  } catch (e) {
    communities.value = []
    formError.value = e instanceof ApiError ? e.message : '小区列表加载失败'
  } finally {
    communitiesLoading.value = false
  }
}

function closeCreateModal() {
  createModalOpen.value = false
  resetFormError()
}

async function submitCreate() {
  if (!canMutateResident.value) {
    formError.value = '统筹账号仅可查看住户，无法新建'
    return
  }
  resetFormError()
  const companyId = authStore.propertyCompanyId
  if (!companyId) {
    formError.value = '未获取到物业公司编号，请重新登录'
    return
  }
  if (!createForm.value.communityId.trim()) {
    formError.value = '请选择小区'
    return
  }
  formSubmitting.value = true
  try {
    await residentApi.create({
      name: createForm.value.name.trim(),
      phone: createForm.value.phone.trim(),
      userType: createForm.value.userType,
      role: 'resident',
      propertyCompanyId: companyId,
      communityId: createForm.value.communityId.trim(),
      building: createForm.value.building.trim() || undefined,
      floor: createForm.value.floor.trim() || undefined,
      unit: createForm.value.unit.trim() || undefined,
      room: createForm.value.room.trim() || undefined,
      gender: createForm.value.gender,
      birthday: createForm.value.birthday || undefined
    })
    closeCreateModal()
    await loadResidents(currentPage.value)
  } catch (e) {
    formError.value = resolveErrorMessage(e)
  } finally {
    formSubmitting.value = false
  }
}

function goArrearsReport(resident: ResidentItem) {
  if (!canMutateResident.value) return
  const building = resident.building?.trim()
  router.push({
    name: 'arrears-report',
    query: {
      ...(resident.communityId ? { communityId: resident.communityId } : {}),
      ...(building && building !== '未填写' ? { building } : {})
    }
  })
}

function goArrearsFromList(resident: {
  communityId?: string
  buildingRaw?: string
  building?: string
}) {
  if (!canMutateResident.value) return
  const building = (resident.buildingRaw || resident.building || '').trim()
  router.push({
    name: 'arrears-report',
    query: {
      ...(resident.communityId ? { communityId: resident.communityId } : {}),
      ...(building && building !== '未填写' ? { building } : {})
    }
  })
}

async function openDetailModal(id: string) {
  resetFormError()
  detailData.value = null
  familyMembers.value = []
  familyError.value = ''
  familyAddResidentId.value = ''
  familyAddResident.value = null
  familyAddRelation.value = FAMILY_RELATION.SPOUSE
  familyAddPhone.value = ''
  familyAddError.value = ''
  detailModalOpen.value = true
  detailLoading.value = true
  familyLoading.value = false
  try {
    detailData.value = await residentApi.get(id)
    const familyId = detailData.value.familyId
    if (familyId) {
      familyLoading.value = true
      try {
        const res = await familyApi.listMembers(familyId)
        familyMembers.value = res.list || []
      } catch (e) {
        familyError.value = resolveErrorMessage(e)
        familyMembers.value = []
      } finally {
        familyLoading.value = false
      }
    }
  } catch (e) {
    formError.value = resolveErrorMessage(e)
  } finally {
    detailLoading.value = false
  }
}

function closeDetailModal() {
  detailModalOpen.value = false
  detailData.value = null
  familyMembers.value = []
  familyError.value = ''
  familyAddResidentId.value = ''
  familyAddResident.value = null
  familyAddRelation.value = FAMILY_RELATION.SPOUSE
  familyAddPhone.value = ''
  familyAddError.value = ''
  familyLoading.value = false
  resetFormError()
}

function onFamilyAddSelect(item: ResidentItem) {
  familyAddResident.value = item
  familyAddError.value = ''
  const phone = String(item.phone || '')
  if (/^1\d{10}$/.test(phone)) familyAddPhone.value = phone
}

async function submitFamilyAdd() {
  const owner = detailData.value
  const familyId = owner?.familyId
  if (!familyId) {
    familyAddError.value = '该住户尚未加入家庭'
    return
  }
  const phone = familyAddPhone.value.trim()
  if (!/^1\d{10}$/.test(phone)) {
    familyAddError.value = '请填写完整 11 位手机号'
    return
  }
  if (familyAddResident.value && !isSameHousing(owner, familyAddResident.value)) {
    familyAddError.value = '只能添加同一房号的住户（同一小区+楼栋+单元+房号，忽略楼层）'
    return
  }
  familyAdding.value = true
  familyAddError.value = ''
  try {
    await familyApi.addMember(familyId, {
      phone,
      name: familyAddResident.value?.name,
      relation: familyAddRelation.value
    })
    const res = await familyApi.listMembers(familyId)
    familyMembers.value = res.list || []
    familyAddResidentId.value = ''
    familyAddResident.value = null
    familyAddPhone.value = ''
  } catch (e) {
    familyAddError.value = resolveErrorMessage(e)
  } finally {
    familyAdding.value = false
  }
}

async function toggleResidentWithdrawBlock(resident: ResidentItem) {
  if (!resident.id || withdrawBlockSubmitting.value) return
  const nextBlocked = !resident.withdrawalBlocked
  const reason = nextBlocked ? window.prompt('请输入阻止提现原因（可选）') || undefined : undefined
  withdrawBlockSubmitting.value = true
  resetFormError()
  try {
    await coinWithdrawalAdminApi.blockResident(resident.id, {
      blocked: nextBlocked,
      reason
    })
    if (detailData.value?.id === resident.id) {
      detailData.value = { ...detailData.value, withdrawalBlocked: nextBlocked }
    }
  } catch (e) {
    formError.value = resolveErrorMessage(e)
  } finally {
    withdrawBlockSubmitting.value = false
  }
}

async function openEditModal(id: string) {
  resetFormError()
  editingId.value = id
  editModalOpen.value = true
  editLoading.value = true
  try {
    const data = await residentApi.get(id)
    editForm.value = {
      name: data.name || '',
      gender: data.gender ?? 0,
      birthday: data.birthday || '',
      maritalStatus: data.maritalStatus || '',
      hasChildren: data.hasChildren,
      building: data.building || '',
      floor: data.floor || '',
      unit: data.unit || '',
      room: data.room || ''
    }
  } catch (e) {
    formError.value = resolveErrorMessage(e)
  } finally {
    editLoading.value = false
  }
}

function closeEditModal() {
  editModalOpen.value = false
  editingId.value = ''
  resetFormError()
}

function buildUpdatePayload(): ResidentUpdatePayload {
  const form = editForm.value
  const payload: ResidentUpdatePayload = {}
  const name = form.name?.trim()
  if (name) payload.name = name
  if (form.gender !== undefined && form.gender !== null) payload.gender = form.gender
  if (form.birthday?.trim()) payload.birthday = form.birthday.trim()
  const maritalStatus = form.maritalStatus?.trim()
  if (maritalStatus) payload.maritalStatus = maritalStatus
  if (form.hasChildren !== undefined) payload.hasChildren = form.hasChildren
  const building = form.building?.trim()
  if (building) payload.building = building
  const floor = form.floor?.trim()
  if (floor) payload.floor = floor
  const unit = form.unit?.trim()
  if (unit) payload.unit = unit
  const room = form.room?.trim()
  if (room) payload.room = room
  return payload
}

async function submitEdit() {
  if (!editingId.value) return
  if (!canEditResident.value) {
    formError.value = '当前账号无编辑住户权限，请使用物业管理员账号登录'
    return
  }
  resetFormError()
  formSubmitting.value = true
  try {
    const payload = buildUpdatePayload()
    if (!Object.keys(payload).length) {
      formError.value = '请至少修改一项信息'
      return
    }
    await residentApi.update(editingId.value, payload)
    closeEditModal()
    await loadResidents(currentPage.value)
  } catch (e) {
    formError.value = resolveErrorMessage(e)
  } finally {
    formSubmitting.value = false
  }
}

function openStatusModal(id: string, currentStatus: string) {
  resetFormError()
  statusTargetId.value = id
  statusForm.value = {
    status: currentStatus === RESIDENT_STATUS.FROZEN || currentStatus === RESIDENT_STATUS.DISABLED
      ? currentStatus
      : RESIDENT_STATUS.ACTIVE,
    reason: ''
  }
  statusModalOpen.value = true
}

function closeStatusModal() {
  statusModalOpen.value = false
  statusTargetId.value = ''
  resetFormError()
}

async function submitStatus() {
  if (!statusTargetId.value) return
  if (!canMutateResident.value) {
    formError.value = '统筹账号仅可查看住户，无法变更状态'
    return
  }
  resetFormError()
  formSubmitting.value = true
  try {
    await residentApi.updateStatus(statusTargetId.value, {
      status: statusForm.value.status,
      reason: statusForm.value.reason.trim() || undefined
    })
    closeStatusModal()
    await loadResidents(currentPage.value)
  } catch (e) {
    formError.value = resolveErrorMessage(e)
  } finally {
    formSubmitting.value = false
  }
}

function openDeleteModal(id: string, name: string) {
  resetFormError()
  deleteTargetId.value = id
  deleteTargetName.value = name
  deleteModalOpen.value = true
}

function closeDeleteModal() {
  deleteModalOpen.value = false
  deleteTargetId.value = ''
  deleteTargetName.value = ''
  resetFormError()
}

async function submitDelete() {
  if (!deleteTargetId.value) return
  if (!canMutateResident.value) {
    formError.value = '统筹账号仅可查看住户，无法删除'
    return
  }
  resetFormError()
  formSubmitting.value = true
  try {
    await residentApi.remove(deleteTargetId.value)
    closeDeleteModal()
    if (residents.value.length === 1 && currentPage.value > 1) {
      currentPage.value -= 1
    }
    await loadResidents(currentPage.value)
  } catch (e) {
    formError.value = resolveErrorMessage(e)
  } finally {
    formSubmitting.value = false
  }
}

watch(activeStatus, () => {
  currentPage.value = 1
  loadResidents(1)
})

onMounted(async () => {
  try {
    await Promise.all([loadBuildingOptions(), loadResidents(1)])
  } catch (e) {
    console.error(e)
    loading.value = false
  }
})
</script>

<style scoped>
.page { max-width: 1200px; }
.header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; gap: 16px; }
.headerActions { display: flex; flex-direction: column; align-items: flex-end; gap: 12px; }
.headerActionsMobile { align-items: stretch; width: 100%; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.btnPrimary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 8px;
  border: none;
  background: #5c5c9e;
  color: #ffffff;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}
.btnPrimary:hover { background: #52529a; }
.btnPrimary:disabled { opacity: 0.6; cursor: not-allowed; }
.btnPrimary svg { width: 16px; height: 16px; }
.btnSecondary {
  padding: 10px 18px;
  border-radius: 8px;
  border: 1px solid #e8e8ec;
  background: #ffffff;
  color: #5c5c66;
  font-size: 14px;
  cursor: pointer;
}
.btnSecondary:hover { border-color: #5c5c9e; color: #5c5c9e; }
.btnDanger {
  padding: 10px 18px;
  border-radius: 8px;
  border: none;
  background: #e05c5c;
  color: #ffffff;
  font-size: 14px;
  cursor: pointer;
}
.btnDanger:hover { background: #c94a4a; }
.btnDanger:disabled { opacity: 0.6; cursor: not-allowed; }
.toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.toolbarMobile { flex-wrap: wrap; }
.search { display: flex; align-items: center; gap: 8px; flex: 1; padding: 10px 14px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fafafc; min-width: 240px; }
.search svg { width: 18px; height: 18px; color: #8c8c9a; }
.search input { flex: 1; border: none; background: transparent; font-size: 14px; color: #1f1f2e; outline: none; }
.search input::placeholder { color: #8c8c9a; }
.filters { display: flex; gap: 12px; }
.filtersMobile { width: 100%; display: none; }
.filtersMobileOpen { display: flex; }
.mobileFilterBtn { display: inline-flex; align-items: center; gap: 6px; }
.mobileFilterBtn svg { width: 16px; height: 16px; }
.select {
  padding: 10px 14px;
  border: 1px solid #e8e8ec;
  border-radius: 8px;
  background: #ffffff;
  color: #5c5c66;
  font-size: 14px;
  cursor: pointer;
  min-width: 120px;
  outline: none;
}
.select:focus { border-color: #5c5c9e; }
.table { background: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); overflow: hidden; margin-bottom: 20px; }
.table table { width: 100%; font-size: 14px; }
.table thead th { text-align: left; padding: 14px 24px; color: #8c8c9a; font-weight: 500; background: #fafafc; border-bottom: 1px solid #f0f0f3; }
.table tbody td { padding: 16px 24px; color: #1f1f2e; border-bottom: 1px solid #f0f0f3; vertical-align: middle; }
.table tbody tr:last-child td { border-bottom: none; }
.table .emptyCell { text-align: center; padding: 24px; color: #8c8c9a; }
.table .info { display: flex; align-items: center; gap: 12px; }
.table .avatar { width: 36px; height: 36px; border-radius: 50%; color: #ffffff; font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: center; }
.table .name { font-weight: 500; color: #1f1f2e; }
.table .badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
.table .badge.purple { background: #f0f0ff; color: #5c5c9e; }
.table .badge.green { background: #e8f8f0; color: #3aaf7d; }
.table .badge.blue { background: #eef0ff; color: #5c5c9e; }
.table .badge.orange { background: #fff4e6; color: #f5a623; }
.table .badge.red { background: #fdeaea; color: #e05c5c; }
.table .actions { display: flex; align-items: center; gap: 8px; }
.table .actionBtn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; border: 1px solid; background: transparent; cursor: pointer; }
.table .actionBtn svg { width: 14px; height: 14px; }
.table .actionBtn.detail { border-color: #e8e8ec; color: #8c8c9a; }
.table .actionBtn.edit { border-color: #5c5c9e; color: #5c5c9e; }
.table .actionBtn.status { border-color: #f5a623; color: #f5a623; }
.table .actionBtn.delete { border-color: #e05c5c; color: #e05c5c; }
.table .footer { display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; border-top: 1px solid #f0f0f3; }
.table .total { font-size: 13px; color: #8c8c9a; }
.table .pagination { display: flex; align-items: center; gap: 8px; }
.table .pageInfo { font-size: 13px; color: #8c8c9a; min-width: 48px; text-align: center; }
.table .pageBtn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 6px; border: 1px solid #e8e8ec; background: #ffffff; color: #5c5c66; font-size: 14px; cursor: pointer; }
.table .pageBtn:disabled { color: #c8c8d0; cursor: not-allowed; }
.residentCards { display: grid; gap: 12px; padding: 14px; }
.residentCard { border: 1px solid #f0f0f3; border-radius: 14px; padding: 14px; background: #fafafc; }
.residentCardHeader { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.residentCard .info { display: flex; align-items: center; gap: 12px; }
.residentCard .avatar { width: 40px; height: 40px; border-radius: 50%; color: #ffffff; font-size: 13px; font-weight: 500; display: flex; align-items: center; justify-content: center; }
.residentCard .name { font-weight: 600; color: #1f1f2e; }
.residentPhone { font-size: 12px; color: #8c8c9a; margin-top: 4px; }
.residentMeta { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #5c5c66; margin-bottom: 12px; }
.residentCard .badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; }
.residentCard .badge.purple { background: #f0f0ff; color: #5c5c9e; }
.residentCard .badge.green { background: #e8f8f0; color: #3aaf7d; }
.residentCard .badge.blue { background: #eef0ff; color: #5c5c9e; }
.residentCard .badge.orange { background: #fff4e6; color: #f5a623; }
.residentCard .badge.red { background: #fdeaea; color: #e05c5c; }
.residentCardActions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.cardActionBtn { min-height: 40px; border-radius: 10px; border: 1px solid #e8e8ec; background: #ffffff; color: #5c5c66; font-size: 14px; }
.cardActionBtn.primary { border-color: #5c5c9e; color: #5c5c9e; }
.cardActionBtn.warning { border-color: #f5a623; color: #d99112; }
.cardActionBtn.danger { border-color: #e05c5c; color: #e05c5c; }
.residentCards .emptyCell { text-align: center; padding: 24px; color: #8c8c9a; }
.modalOverlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.modal {
  width: 100%;
  max-width: 480px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}
.mobileSheet {
  max-width: 100%;
  border-radius: 18px 18px 0 0;
  margin-top: auto;
}
.modalWide { max-width: 720px; }
.modalScroll { max-height: calc(100vh - 48px); display: flex; flex-direction: column; }
.modalScroll .modalBody { overflow-y: auto; }
.modalHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f3;
}
.modalTitle { font-size: 16px; font-weight: 600; color: #1f1f2e; margin: 0; }
.modalClose {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 24px;
  line-height: 1;
  color: #8c8c9a;
  cursor: pointer;
}
.modalClose:hover { color: #1f1f2e; }
.modalBody { padding: 24px; }
.field { margin-bottom: 16px; }
.fieldRow { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.fieldRow .field { margin-bottom: 16px; }
.field .label { display: block; font-size: 13px; font-weight: 500; color: #5c5c66; margin-bottom: 8px; }
.field .required { color: #e05c5c; }
.field .input,
.field .textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e8e8ec;
  border-radius: 8px;
  font-size: 14px;
  color: #1f1f2e;
  background: #ffffff;
  outline: none;
  box-sizing: border-box;
}
.field .input:focus,
.field .textarea:focus { border-color: #5c5c9e; }
.field .textarea { resize: vertical; min-height: 80px; font-family: inherit; }
.error { font-size: 13px; color: #e05c5c; margin-bottom: 12px; }
.loadingText { text-align: center; color: #8c8c9a; padding: 24px 0; }
.confirmText { font-size: 14px; color: #1f1f2e; line-height: 1.6; margin: 0 0 16px; }
.detailGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px 24px;
  margin-bottom: 8px;
}
.detailItem { display: flex; flex-direction: column; gap: 4px; }
.detailLabel { font-size: 12px; color: #8c8c9a; }
.detailValue { font-size: 14px; color: #1f1f2e; word-break: break-all; }
.mutedCell { color: #b0b0ba; }
.arrearsBadge {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #fdeaea;
  color: #e05c5c;
  font-size: 12px;
  font-weight: 500;
  border: none;
  vertical-align: middle;
}
.arrearsBadge.link {
  margin-left: 0;
  cursor: pointer;
}
.arrearsBadge.link:hover { background: #fad4d4; }
.arrearsBanner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding: 12px 14px;
  border-radius: 10px;
  background: #fdeaea;
  color: #c43d3d;
  cursor: pointer;
}
.arrearsBanner strong { font-size: 13px; }
.arrearsLink { margin-left: auto; font-size: 13px; color: #5c5c9e; }
.familySection { margin-top: 20px; padding-top: 16px; border-top: 1px solid #f0f0f3; }
.familyHint { font-size: 12px; color: #8c8c9a; margin: 0 0 8px; }
.familyAdd { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
.familyTitle { margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #1f1f2e; }
.familyEmpty { margin: 0; font-size: 13px; color: #8c8c9a; }
.familyTable { width: 100%; border-collapse: collapse; font-size: 13px; }
.familyTable th { text-align: left; color: #8c8c9a; font-weight: 500; padding: 8px 6px; border-bottom: 1px solid #f0f0f3; }
.familyTable td { padding: 10px 6px; color: #1f1f2e; border-bottom: 1px solid #f7f7f9; }
.ownerTag {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 11px;
  background: #f3f0ff;
  color: #5c5c9e;
}
.loadingText.compact { padding: 12px 0; }
.modalFooter {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}
@media (max-width: 900px) {
  .header { flex-direction: column; }
  .headerActions { align-items: stretch; width: 100%; }
  .toolbar { flex-direction: column; align-items: stretch; }
  .filters { width: 100%; }
  .filters .select { flex: 1; }
  .table { overflow-x: auto; }
  .table table { min-width: 860px; }
  .fieldRow { grid-template-columns: 1fr; }
  .detailGrid { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .search { min-width: 0; width: 100%; }
  .table .footer { flex-direction: column; align-items: flex-start; gap: 10px; }
  .table .pagination { width: 100%; justify-content: flex-end; }
  .modalOverlay { align-items: flex-end; padding: 0; }
  .modalScroll { max-height: min(88vh, 760px); }
  .modalHeader { padding: 18px 18px 14px; }
  .modalBody { padding: 18px; }
  .modalFooter { flex-direction: column-reverse; }
  .modalFooter .btnSecondary,
  .modalFooter .btnPrimary,
  .modalFooter .btnDanger { width: 100%; min-height: 44px; }
}
</style>
