<template>
    <div class="page">
      <div class="header">
        <div>
          <h1 class="title">商家管理</h1>
          <p class="desc">配置并监控平台商家及其财务参数。</p>
        </div>
        <div v-if="viewMode === 'platform'" class="headerActions">
          <button class="btnPrimary" @click="openCreatePlatformModal">
            <IconSvg name="plus" />
            新增平台商家
          </button>
        </div>
      </div>

      <SegmentedControl
        v-if="isPlatformAdmin"
        v-model="viewMode"
        :tabs="viewTabs"
        class="viewTabs"
        @update:model-value="onViewModeChange"
      />

      <div v-if="isPlatformAdmin" class="profitFlow">
        <div class="profitHeader">
          <div class="profitTitle">
            <IconSvg name="merchant" class="headerIcon" />
            <span>盈利空间计算</span>
            <span v-if="profitDisplay.propertyName" class="propertyTag">{{ profitDisplay.propertyName }}</span>
          </div>
          <div class="profitControls">
            <select
              v-model="selectedPropertyCompanyId"
              class="periodSelect companySelect"
              :disabled="!canSwitchPropertyCompany || companiesLoading"
              @change="onPropertyCompanyChange"
            >
              <option v-if="companiesLoading" value="">加载物业公司...</option>
              <option v-else-if="!propertyCompanies.length" value="">暂无物业公司</option>
              <option v-for="company in propertyCompanies" :key="company.id" :value="company.id">
                {{ company.name }}
              </option>
            </select>
            <select
              v-model="selectedProfitMerchantId"
              class="periodSelect merchantSelect"
              :disabled="!profitMerchantOptions.length"
              @change="loadProfitSpace"
            >
              <option v-if="!profitMerchantOptions.length" value="">暂无商家</option>
              <option v-for="m in profitMerchantOptions" :key="m.id" :value="m.id">
                {{ m.name }}
              </option>
            </select>
            <div class="consumptionInput">
              <label class="consumptionLabel">消费额</label>
              <input
                v-model.number="consumptionAmount"
                type="number"
                min="0"
                step="0.01"
                class="periodSelect amountInput"
                @change="loadProfitSpace"
              />
            </div>
          </div>
        </div>
        <p v-if="profitDisplay.periodLabel || profitDisplay.merchantName !== '—'" class="periodHint">
          <span v-if="profitDisplay.merchantName !== '—'">{{ profitDisplay.merchantName }}</span>
          <span v-if="profitDisplay.periodLabel"> · {{ profitDisplay.periodLabel }}</span>
          <span v-if="profitDisplay.propertyName"> · {{ profitDisplay.propertyName }}</span>
          <span v-if="profitDisplay.totalOrders"> · {{ profitDisplay.totalOrders }} 笔订单</span>
        </p>
        <div v-if="profitLoading" class="profitLoading">加载盈利数据中...</div>
        <div v-else-if="profitError" class="profitError">{{ profitError }}</div>
        <div v-else class="body">
          <div class="step">
            <div class="stepIcon"><IconSvg name="money" /></div>
            <div class="stepLabel">消费额</div>
            <div class="stepValue">{{ profitDisplay.revenue }}</div>
            <div v-if="profitDisplay.revenueGrowth" class="stepHint">较上期 ↑{{ profitDisplay.revenueGrowth }}</div>
          </div>
          <div class="arrow">→</div>
          <div class="step" v-if="profitDisplay.commission !== '¥0'">
            <div class="stepIcon down"><IconSvg name="trend" /></div>
            <div class="stepLabel">抽佣</div>
            <div class="stepValue">{{ profitDisplay.commission }}</div>
            <div class="stepHint">占比 {{ profitDisplay.commissionPct }}%</div>
          </div>
          <div class="arrow" v-if="profitDisplay.commission !== '¥0'">→</div>
          <div class="step">
            <div class="stepIcon down"><IconSvg name="trend" /></div>
            <div class="stepLabel">配送费</div>
            <div class="stepValue">{{ profitDisplay.deliveryFee }}</div>
            <div class="stepHint">{{ profitDisplay.deliveryFeeAmount }}</div>
          </div>
          <div class="arrow">→</div>
          <div class="step">
            <div class="stepIcon down"><IconSvg name="trend" /></div>
            <div class="stepLabel">兑换成本</div>
            <div class="stepValue">{{ profitDisplay.exchangeCost }}</div>
            <div class="stepHint">{{ profitDisplay.exchangeCostDetail }}</div>
          </div>
          <div class="arrow">→</div>
          <div class="step">
            <div class="stepIcon up"><IconSvg name="chart" /></div>
            <div class="stepLabel">盈利空间</div>
            <div class="stepValue">{{ profitDisplay.profitSpace }}</div>
            <div class="stepHint">{{ profitDisplay.profitSpaceAmount }}</div>
            <div v-if="profitDisplay.profitGrowth" class="stepHint">较上期 ↑{{ profitDisplay.profitGrowth }}</div>
          </div>
          <div class="arrow">→</div>
          <div class="result">
            <div v-for="(item, index) in profitDisplay.shareBreakdown" :key="item.label" class="resultGroup">
              <div v-if="index > 0" class="resultDivider" />
              <div class="resultItem">
                <div class="resultLabel">{{ item.label }}</div>
                <div class="resultValue">{{ item.percent }}</div>
                <div class="resultHint">{{ item.amount }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="table">
        <div class="toolbar">
          <form class="search" @submit.prevent="submitSearch">
            <IconSvg name="search" />
            <input
              v-model="searchKeyword"
              type="search"
              :placeholder="viewMode === 'platform' ? '搜索商家名称、电话...' : '搜索商家名称...'"
              @input="onSearchInput"
            />
          </form>
          <button v-if="isMobile" type="button" class="btnSecondary mobileFilterBtn" @click="mobileFilterOpen = !mobileFilterOpen">
            <IconSvg name="filter" />
            {{ mobileFilterOpen ? '收起筛选' : '筛选' }}
          </button>
          <div class="filters" :class="{ filtersMobile: isMobile, filtersMobileOpen: !isMobile || mobileFilterOpen }">
            <select v-model="selectedCategory" class="filterSelect" @change="applyFilters">
              <option value="">全部分类</option>
              <option v-for="cat in categoryOptions" :key="cat" :value="cat">{{ cat }}</option>
            </select>
            <select
              v-if="viewMode === 'property'"
              v-model="selectedAuditStatus"
              class="filterSelect"
              @change="applyFilters"
            >
              <option v-for="opt in MERCHANT_AUDIT_STATUS_OPTIONS" :key="opt.value || 'all'" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
            <select
              v-else
              v-model="selectedPlatformStatus"
              class="filterSelect"
              @change="applyFilters"
            >
              <option v-for="opt in PLATFORM_MERCHANT_STATUS_OPTIONS" :key="opt.value || 'all'" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>
        <div v-if="isMobile && viewMode === 'property'" class="merchantCards">
          <div v-if="loading" class="emptyCell">加载中...</div>
          <div v-else-if="!merchants.length" class="emptyCell">暂无商家数据</div>
          <article v-for="merchant in merchants" v-else :key="merchant.id" class="merchantCard">
            <div class="merchantCardHeader">
              <div class="info">
                <div class="avatar"><IconSvg :name="merchant.categoryCode" /></div>
                <div>
                  <div class="name">{{ merchant.name }}</div>
                  <div class="category">{{ merchant.category }}</div>
                </div>
              </div>
              <span class="badge">{{ merchant.merchantLevel }}</span>
            </div>
            <div class="merchantMeta">
              <span>审核：{{ merchant.auditStatus }}</span>
              <span>营业：{{ merchant.statusLabel }}</span>
              <span>抽佣：{{ merchant.commissionRate }}</span>
              <span>兑换：{{ merchant.pointsRatio }}</span>
              <span>返现：{{ merchant.cashbackRate }}</span>
            </div>
            <div class="merchantCardActions">
              <button class="cardActionBtn" @click="openDetailModal(merchant.id, merchant.category)">详情</button>
              <button class="cardActionBtn primary" @click="openEditModal(merchant.id)">编辑</button>
              <button v-if="canManageAdQuota" class="cardActionBtn success" @click="openAdQuotaModal(merchant.id, merchant.name)">广告额度</button>
              <button v-if="canKick && merchant.status !== MERCHANT_STATUS.KICKED" class="cardActionBtn danger" @click="openKickModal(merchant.id, merchant.name)">踢出</button>
            </div>
          </article>
        </div>
        <table v-else-if="viewMode === 'property'" class="content">
          <thead>
            <tr>
              <th>商家名称</th>
              <th>等级</th>
              <th>审核状态</th>
              <th>营业状态</th>
              <th>抽佣比例</th>
              <th>积分兑换比</th>
              <th>返现比例</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="8" class="emptyCell">加载中...</td>
            </tr>
            <tr v-else-if="!merchants.length">
              <td colspan="8" class="emptyCell">暂无商家数据</td>
            </tr>
            <tr v-for="merchant in merchants" v-else :key="merchant.id" class="merchantRow">
              <td>
                <div class="info">
                  <div class="avatar"><IconSvg :name="merchant.categoryCode" /></div>
                  <div>
                    <div class="name">{{ merchant.name }}</div>
                    <div class="category">{{ merchant.category }}</div>
                  </div>
                </div>
              </td>
              <td>{{ merchant.merchantLevel }}</td>
              <td>{{ merchant.auditStatus }}</td>
              <td>{{ merchant.statusLabel }}</td>
              <td><span class="badge">{{ merchant.commissionRate }}</span></td>
              <td>
                <div class="points"><IconSvg name="coin" /><span>{{ merchant.pointsRatio }}</span></div>
              </td>
              <td>{{ merchant.cashbackRate }}</td>
              <td>
                <div class="actions">
                  <button class="actionBtn detail" title="详情" @click="openDetailModal(merchant.id, merchant.category)">
                    <IconSvg name="eye" />
                  </button>
                  <button class="actionBtn edit" title="编辑" @click="openEditModal(merchant.id)">
                    <IconSvg name="edit" />
                  </button>
                  <button
                    v-if="canManageAdQuota"
                    class="actionBtn adQuota"
                    title="广告额度"
                    @click="openAdQuotaModal(merchant.id, merchant.name)"
                  >
                    <IconSvg name="retail" />
                  </button>
                  <button
                    v-if="canKick && merchant.status !== MERCHANT_STATUS.KICKED"
                    class="actionBtn kick"
                    title="踢出"
                    @click="openKickModal(merchant.id, merchant.name)"
                  >
                    <IconSvg name="close" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else-if="isMobile" class="merchantCards">
          <div v-if="loading" class="emptyCell">加载中...</div>
          <div v-else-if="!platformMerchants.length" class="emptyCell">暂无平台商家</div>
          <article v-for="merchant in platformMerchants" v-else :key="merchant.id" class="merchantCard">
            <div class="merchantCardHeader">
              <div class="info">
                <div class="avatar"><IconSvg :name="merchant.categoryCode" /></div>
                <div>
                  <div class="name">{{ merchant.name }}</div>
                  <div class="category">{{ merchant.category }}</div>
                </div>
              </div>
              <span class="badge">{{ merchant.statusLabel }}</span>
            </div>
            <div class="merchantMeta">
              <span>电话：{{ merchant.contactPhone }}</span>
              <span>挂接物业：{{ merchant.linkedPropertyCount }}</span>
              <span>创建时间：{{ merchant.createdAt }}</span>
            </div>
            <div class="merchantCardActions">
              <button class="cardActionBtn" @click="openPlatformDetailModal(merchant.id)">详情</button>
              <button class="cardActionBtn primary" @click="openPlatformEditModal(merchant.id)">编辑</button>
            </div>
          </article>
        </div>
        <table v-else class="content">
          <thead>
            <tr>
              <th>商家名称</th>
              <th>分类</th>
              <th>联系电话</th>
              <th>状态</th>
              <th>挂接物业数</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7" class="emptyCell">加载中...</td>
            </tr>
            <tr v-else-if="!platformMerchants.length">
              <td colspan="7" class="emptyCell">暂无平台商家</td>
            </tr>
            <tr v-for="merchant in platformMerchants" v-else :key="merchant.id" class="merchantRow">
              <td>
                <div class="info">
                  <div class="avatar"><IconSvg :name="merchant.categoryCode" /></div>
                  <div class="name">{{ merchant.name }}</div>
                </div>
              </td>
              <td>{{ merchant.category }}</td>
              <td>{{ merchant.contactPhone }}</td>
              <td>{{ merchant.statusLabel }}</td>
              <td>{{ merchant.linkedPropertyCount }}</td>
              <td>{{ merchant.createdAt }}</td>
              <td>
                <div class="actions">
                  <button class="actionBtn detail" title="详情" @click="openPlatformDetailModal(merchant.id)">
                    <IconSvg name="eye" />
                  </button>
                  <button class="actionBtn edit" title="编辑" @click="openPlatformEditModal(merchant.id)">
                    <IconSvg name="edit" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="footer">
          <span class="total">显示 {{ pageStart }} 到 {{ pageEnd }}，共 {{ listTotal }} 条记录</span>
          <div v-if="totalPages > 1" class="pagination">
            <button class="pageBtn" :disabled="currentPage <= 1 || loading" @click="changePage(currentPage - 1)">&lt;</button>
            <span class="pageInfo">{{ currentPage }} / {{ totalPages }}</span>
            <button class="pageBtn" :disabled="currentPage >= totalPages || loading" @click="changePage(currentPage + 1)">&gt;</button>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="detailModalOpen" class="modalOverlay" @click.self="closeDetailModal">
        <div class="modal modalWide modalScroll" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">商家详情</h3>
            <button class="modalClose" @click="closeDetailModal">&times;</button>
          </div>
          <div class="modalBody">
            <div v-if="detailLoading" class="loadingText">加载中...</div>
            <div v-else-if="detailData" class="detailGrid">
              <div v-for="row in detailRows" :key="row.label" class="detailItem">
                <span class="detailLabel">{{ row.label }}</span>
                <span class="detailValue">{{ row.value }}</span>
              </div>
            </div>
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="closeDetailModal">关闭</button>
              <button v-if="detailData" type="button" class="btnPrimary" @click="openEditModal(detailData.id); closeDetailModal()">
                编辑
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
            <h3 class="modalTitle">编辑商家信息</h3>
            <button class="modalClose" @click="closeEditModal">&times;</button>
          </div>
          <form class="modalBody" @submit.prevent="submitEdit">
            <div v-if="editLoading" class="loadingText">加载中...</div>
            <template v-else>
              <div class="field">
                <label class="label">商家名称</label>
                <input v-model="editForm.name" type="text" class="input" maxlength="100" />
              </div>
              <div class="field">
                <label class="label">描述</label>
                <textarea v-model="editForm.description" class="textarea" rows="3" />
              </div>
              <div class="fieldRow">
                <div class="field">
                  <label class="label">联系电话</label>
                  <input v-model="editForm.contactPhone" type="text" class="input" maxlength="20" />
                </div>
                <div class="field">
                  <label class="label">营业时间</label>
                  <input v-model="editForm.businessHours" type="text" class="input" maxlength="50" placeholder="08:00-22:00" />
                </div>
              </div>
              <div class="field">
                <label class="label">地址</label>
                <input v-model="editForm.address" type="text" class="input" maxlength="200" />
              </div>
              <div class="fieldRow">
                <div class="field">
                  <label class="label">配送费</label>
                  <input v-model="editForm.deliveryFee" type="number" min="0" step="0.01" class="input" />
                </div>
                <div class="field">
                  <label class="label">满额免配送费</label>
                  <input v-model="editForm.freeDeliveryThreshold" type="number" min="0" step="0.01" class="input" />
                </div>
                <div class="field">
                  <label class="label">排序权重</label>
                  <input v-model.number="editForm.rankOrder" type="number" min="0" class="input" />
                </div>
              </div>
              <div class="field">
                <label class="label">封面图片 URL</label>
                <input v-model="editForm.coverUrlsText" type="text" class="input" placeholder="多个 URL 用逗号分隔" />
              </div>
              <div class="field">
                <label class="label">视频 URL</label>
                <input v-model="editForm.videoUrl" type="text" class="input" maxlength="500" />
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
      <div v-if="platformFormModalOpen" class="modalOverlay" @click.self="closePlatformFormModal">
        <div class="modal modalScroll" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">{{ platformFormMode === 'create' ? '新增平台商家' : '编辑平台商家' }}</h3>
            <button class="modalClose" @click="closePlatformFormModal">&times;</button>
          </div>
          <form class="modalBody" @submit.prevent="submitPlatformForm">
            <div v-if="platformFormLoading" class="loadingText">加载中...</div>
            <template v-else>
              <div class="field">
                <label class="label">商家名称 <span class="required">*</span></label>
                <input v-model="platformForm.name" type="text" class="input" maxlength="100" required />
              </div>
              <div class="fieldRow">
                <div class="field">
                  <label class="label">分类 <span class="required">*</span></label>
                  <input v-model="platformForm.category" type="text" class="input" required />
                </div>
                <div class="field">
                  <label class="label">联系电话 <span class="required">*</span></label>
                  <input v-model="platformForm.contactPhone" type="text" class="input" maxlength="20" required />
                </div>
              </div>
              <div class="field">
                <label class="label">描述</label>
                <textarea v-model="platformForm.description" class="textarea" rows="3" />
              </div>
              <div class="fieldRow">
                <div class="field">
                  <label class="label">营业时间</label>
                  <input v-model="platformForm.businessHours" type="text" class="input" maxlength="50" placeholder="08:00-22:00" />
                </div>
                <div v-if="platformFormMode === 'edit'" class="field">
                  <label class="label">状态</label>
                  <select v-model="platformForm.status" class="input">
                    <option v-for="opt in PLATFORM_MERCHANT_STATUS_OPTIONS.filter(o => o.value)" :key="opt.value" :value="opt.value">
                      {{ opt.label }}
                    </option>
                  </select>
                </div>
              </div>
              <div class="field">
                <label class="label">地址</label>
                <input v-model="platformForm.address" type="text" class="input" maxlength="200" />
              </div>
              <div class="field">
                <label class="label">封面图 URL</label>
                <input v-model="platformForm.coverUrl" type="text" class="input" maxlength="500" />
              </div>
            </template>
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="closePlatformFormModal">取消</button>
              <button type="submit" class="btnPrimary" :disabled="formSubmitting || platformFormLoading">
                {{ formSubmitting ? '保存中...' : '保存' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="platformDetailModalOpen" class="modalOverlay" @click.self="closePlatformDetailModal">
        <div class="modal modalWide modalScroll" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">平台商家详情</h3>
            <button class="modalClose" @click="closePlatformDetailModal">&times;</button>
          </div>
          <div class="modalBody">
            <div v-if="platformDetailLoading" class="loadingText">加载中...</div>
            <div v-else-if="platformDetailData" class="detailGrid">
              <div v-for="row in platformDetailRows" :key="row.label" class="detailItem">
                <span class="detailLabel">{{ row.label }}</span>
                <span class="detailValue">{{ row.value }}</span>
              </div>
            </div>
            <div v-if="platformDetailData?.linkedProperties?.length" class="linkedSection">
              <h4 class="linkedTitle">挂接物业</h4>
              <ul class="linkedList">
                <li v-for="item in platformDetailData.linkedProperties" :key="item.propertyCompanyId">
                  {{ item.propertyName }}（{{ item.propertyCompanyId }}） · {{ item.linkedAt }}
                </li>
              </ul>
            </div>
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="closePlatformDetailModal">关闭</button>
              <button v-if="platformDetailData" type="button" class="btnPrimary" @click="openPlatformEditModal(platformDetailData.id); closePlatformDetailModal()">
                编辑
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="kickModalOpen" class="modalOverlay" @click.self="closeKickModal">
        <div class="modal modalScroll" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">踢出商家</h3>
            <button class="modalClose" @click="closeKickModal">&times;</button>
          </div>
          <form class="modalBody" @submit.prevent="submitKick">
            <p class="kickHint">确定踢出「{{ kickTargetName }}」？踢出后商品将自动下架。</p>
            <div class="field">
              <label class="label">踢出原因 <span class="required">*</span></label>
              <textarea v-model="kickForm.reason" class="textarea" rows="3" maxlength="200" required placeholder="请填写踢出原因" />
            </div>
            <label class="checkboxRow">
              <input v-model="kickForm.notifyMerchant" type="checkbox" />
              <span>通知商家</span>
            </label>
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="closeKickModal">取消</button>
              <button type="submit" class="btnDanger" :disabled="formSubmitting">
                {{ formSubmitting ? '提交中...' : '确认踢出' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="adQuotaModalOpen" class="modalOverlay" @click.self="closeAdQuotaModal">
        <div class="modal modalScroll" :class="{ mobileSheet: isMobile }">
          <div class="modalHeader">
            <h3 class="modalTitle">增加广告额度</h3>
            <button class="modalClose" @click="closeAdQuotaModal">&times;</button>
          </div>
          <form class="modalBody" @submit.prevent="submitAdQuota">
            <p class="kickHint">为「{{ adQuotaTargetName }}」增加本周付费广告条数。</p>
            <div class="field">
              <label class="label">增加付费条数 <span class="required">*</span></label>
              <input
                v-model.number="adQuotaPurchased"
                type="number"
                class="input"
                min="1"
                step="1"
                required
                placeholder="请输入正整数"
              />
            </div>
            <div v-if="adQuotaResult" class="adQuotaResult">
              <div class="adQuotaResultTitle">额度已更新</div>
              <div class="adQuotaResultRow">
                <span>周期</span>
                <strong>{{ adQuotaResult.weekStart || '—' }} ~ {{ adQuotaResult.weekEnd || '—' }}</strong>
              </div>
              <div class="adQuotaResultRow">
                <span>免费 / 已购</span>
                <strong>{{ adQuotaResult.freeQuota ?? 1 }} / {{ adQuotaResult.purchasedQuota ?? 0 }}</strong>
              </div>
              <div class="adQuotaResultRow">
                <span>已用 / 剩余</span>
                <strong>{{ adQuotaResult.usedCount ?? 0 }} / {{ adQuotaResult.remainingCount ?? 0 }}</strong>
              </div>
            </div>
            <p v-if="formError" class="error">{{ formError }}</p>
            <div class="modalFooter">
              <button type="button" class="btnSecondary" @click="closeAdQuotaModal">
                {{ adQuotaResult ? '关闭' : '取消' }}
              </button>
              <button v-if="!adQuotaResult" type="submit" class="btnPrimary" :disabled="formSubmitting">
                {{ formSubmitting ? '提交中...' : '确认增加' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import IconSvg from '../components/IconSvg.vue'
import SegmentedControl from '../components/SegmentedControl.vue'
import { merchantApi, merchantAdAdminApi, propertyCompanyApi } from '../api/services'
import type {
  MerchantAdQuota,
  MerchantItem,
  MerchantUpdatePayload,
  PlatformMerchantCreatePayload,
  PlatformMerchantItem,
  PlatformMerchantUpdatePayload,
  PropertyCompanyItem
} from '../api/types'
import {
  formatMoney,
  formatPercent,
  mapMerchants,
  mapPlatformMerchants,
  mapProfitSpaceDisplay,
  resolvePlatformMerchantId
} from '../api/mappers'
import { ApiError } from '../api/request'
import {
  ENTITY_STATUS,
  MERCHANT_AUDIT_STATUS_LABEL,
  MERCHANT_AUDIT_STATUS_OPTIONS,
  MERCHANT_LEVEL_LABEL,
  MERCHANT_STATUS,
  MERCHANT_STATUS_LABEL,
  PLATFORM_MERCHANT_STATUS_OPTIONS,
  USER_ROLE,
  getEnumLabel
} from '../constants/enums'
import { useAuthStore } from '../stores/auth'
import { useIsMobile } from '../composables/useIsMobile'

const PAGE_SIZE = 20

const auth = useAuthStore()
const { isMobile } = useIsMobile()

type ViewMode = 'property' | 'platform'

const viewMode = ref<ViewMode>('property')
const isPlatformAdmin = computed(() => auth.profile?.role === USER_ROLE.PLATFORM_ADMIN)
const canKick = computed(
  () => auth.profile?.role === USER_ROLE.PROPERTY_ADMIN || auth.profile?.role === USER_ROLE.PLATFORM_ADMIN
)
const canManageAdQuota = computed(
  () => auth.profile?.role === USER_ROLE.PROPERTY_ADMIN || auth.profile?.role === USER_ROLE.PLATFORM_ADMIN
)
const viewTabs = [
  { code: 'property', name: '物业商家' },
  { code: 'platform', name: '平台商家库' }
]

const loading = ref(true)
const companiesLoading = ref(true)
const profitLoading = ref(false)
const profitError = ref('')
const consumptionAmount = ref(100)
const selectedProfitMerchantId = ref('')
const selectedPropertyCompanyId = ref('')
const propertyCompanies = ref<PropertyCompanyItem[]>([])
const merchants = ref<ReturnType<typeof mapMerchants>>([])
const platformMerchants = ref<ReturnType<typeof mapPlatformMerchants>>([])
const profitData = ref<ReturnType<typeof mapProfitSpaceDisplay> | null>(null)

const searchKeyword = ref('')
const appliedKeyword = ref('')
const selectedCategory = ref('')
const selectedAuditStatus = ref('')
const selectedPlatformStatus = ref('')
const mobileFilterOpen = ref(false)
const categoryOptions = ref<string[]>([])
const merchantListCache = ref<Record<string, MerchantItem>>({})
const platformMerchantListCache = ref<Record<string, PlatformMerchantItem>>({})
const merchantTotal = ref(0)
const platformMerchantTotal = ref(0)
const currentPage = ref(1)
const totalPages = ref(1)

const detailModalOpen = ref(false)
const editModalOpen = ref(false)
const detailLoading = ref(false)
const editLoading = ref(false)
const formSubmitting = ref(false)
const formError = ref('')
const detailData = ref<MerchantItem | null>(null)
const editingId = ref('')

const platformFormModalOpen = ref(false)
const platformDetailModalOpen = ref(false)
const platformFormMode = ref<'create' | 'edit'>('create')
const platformFormLoading = ref(false)
const platformDetailLoading = ref(false)
const platformEditingId = ref('')
const platformDetailData = ref<PlatformMerchantItem | null>(null)
const platformForm = ref({
  name: '',
  category: '',
  contactPhone: '',
  description: '',
  businessHours: '',
  address: '',
  coverUrl: '',
  status: MERCHANT_STATUS.ACTIVE
})

const kickModalOpen = ref(false)
const kickTargetId = ref('')
const kickTargetName = ref('')
const kickForm = ref({
  reason: '',
  notifyMerchant: true
})

const adQuotaModalOpen = ref(false)
const adQuotaTargetId = ref('')
const adQuotaTargetName = ref('')
const adQuotaPurchased = ref<number | ''>(1)
const adQuotaResult = ref<MerchantAdQuota | null>(null)

const editForm = ref({
  name: '',
  description: '',
  contactPhone: '',
  businessHours: '',
  address: '',
  deliveryFee: '' as string | number,
  freeDeliveryThreshold: '' as string | number,
  rankOrder: undefined as number | undefined,
  coverUrlsText: '',
  videoUrl: ''
})

let searchTimer: ReturnType<typeof setTimeout>

const canSwitchPropertyCompany = computed(() => auth.profile?.role === USER_ROLE.PLATFORM_ADMIN)
const emptyProfit = mapProfitSpaceDisplay(null)
const profitDisplay = computed(() => profitData.value || emptyProfit)

const pageStart = computed(() => {
  const total = listTotal.value
  if (!total) return 0
  return (currentPage.value - 1) * PAGE_SIZE + 1
})

const pageEnd = computed(() => {
  const total = listTotal.value
  if (!total) return 0
  return Math.min(currentPage.value * PAGE_SIZE, total)
})

const listTotal = computed(() =>
  viewMode.value === 'platform' ? platformMerchantTotal.value : merchantTotal.value
)

const profitMerchantOptions = computed(() => {
  const seen = new Set<string>()
  const options: { id: string; name: string }[] = []

  for (const item of Object.values(merchantListCache.value)) {
    const platformId = resolvePlatformMerchantId(item)
    if (!platformId || seen.has(platformId)) continue
    seen.add(platformId)
    options.push({ id: platformId, name: item.name || '—' })
  }

  for (const item of Object.values(platformMerchantListCache.value)) {
    if (!item.id || seen.has(item.id)) continue
    seen.add(item.id)
    options.push({ id: item.id, name: item.name || '—' })
  }

  return options.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
})

const detailRows = computed(() => {
  const d = detailData.value
  if (!d) return []
  return [
    { label: '商家名称', value: d.name || '—' },
    { label: '平台商家 ID', value: d.platformMerchantId || '—' },
    { label: '分类', value: d.category || '—' },
    { label: '等级', value: getEnumLabel(MERCHANT_LEVEL_LABEL, d.merchantLevel) },
    { label: '审核状态', value: getEnumLabel(MERCHANT_AUDIT_STATUS_LABEL, d.auditStatus) },
    { label: '营业状态', value: getEnumLabel(MERCHANT_STATUS_LABEL, d.status, '—') },
    { label: '联系电话', value: d.contactPhone || '—' },
    { label: '地址', value: d.address || '—' },
    { label: '营业时间', value: d.businessHours || '—' },
    { label: '配送费', value: d.deliveryFee !== undefined ? `¥${formatMoney(Number(d.deliveryFee))}` : '—' },
    { label: '满额免配送', value: d.freeDeliveryThreshold !== undefined ? `¥${formatMoney(Number(d.freeDeliveryThreshold))}` : '—' },
    { label: '返现比例', value: d.coinRebateRate !== undefined ? `${formatPercent(d.coinRebateRate)}%` : '—' },
    { label: '排序权重', value: d.rankOrder !== undefined ? String(d.rankOrder) : '—' },
    { label: '描述', value: d.description || '—' },
    { label: '创建时间', value: d.createdAt || '—' },
    { label: '更新时间', value: d.updatedAt || '—' }
  ]
})

const platformDetailRows = computed(() => {
  const d = platformDetailData.value
  if (!d) return []
  return [
    { label: '平台商家 ID', value: d.id || '—' },
    { label: '商家名称', value: d.name || '—' },
    { label: '分类', value: d.category || '—' },
    { label: '状态', value: getEnumLabel(MERCHANT_STATUS_LABEL, d.status, '—') },
    { label: '联系电话', value: d.contactPhone || '—' },
    { label: '地址', value: d.address || '—' },
    { label: '营业时间', value: d.businessHours || '—' },
    { label: '挂接物业数', value: d.linkedPropertyCount !== undefined ? String(d.linkedPropertyCount) : '—' },
    { label: '描述', value: d.description || '—' },
    { label: '封面图', value: d.coverUrl || '—' },
    { label: '创建时间', value: d.createdAt || '—' },
    { label: '更新时间', value: d.updatedAt || '—' }
  ]
})

function selectedPropertyName() {
  return propertyCompanies.value.find(c => c.id === selectedPropertyCompanyId.value)?.name || ''
}

function collectCategories(list: MerchantItem[]) {
  const set = new Set(categoryOptions.value)
  list.forEach(item => {
    if (item.category) set.add(item.category)
  })
  categoryOptions.value = Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

function collectCategoriesFromPlatform(list: PlatformMerchantItem[]) {
  const set = new Set(categoryOptions.value)
  list.forEach(item => {
    if (item.category) set.add(item.category)
  })
  categoryOptions.value = Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

function resetFormError() {
  formError.value = ''
}

function resolveErrorMessage(e: unknown) {
  if (e instanceof ApiError) return e.message
  if (e instanceof Error) return e.message
  return '操作失败，请稍后重试'
}

async function loadPropertyCompanies() {
  companiesLoading.value = true
  try {
    const res = await propertyCompanyApi.list(
      { page: 1, pageSize: 100, status: ENTITY_STATUS.ACTIVE, sort: '-createdAt' },
      true
    )
    propertyCompanies.value = res.list || []
    const preferredId = auth.propertyCompanyId || import.meta.env.VITE_PROPERTY_COMPANY_ID || ''
    if (preferredId && propertyCompanies.value.some(c => c.id === preferredId)) {
      selectedPropertyCompanyId.value = preferredId
    } else if (propertyCompanies.value.length) {
      selectedPropertyCompanyId.value = propertyCompanies.value[0].id
    }
  } catch (e) {
    console.error(e)
    profitError.value = e instanceof ApiError ? e.message : '物业公司列表加载失败'
  } finally {
    companiesLoading.value = false
  }
}

async function loadMerchants(page = currentPage.value) {
  if (!selectedPropertyCompanyId.value) {
    merchants.value = []
    merchantTotal.value = 0
    totalPages.value = 1
    return
  }
  loading.value = true
  try {
    const res = await merchantApi.list({
      page,
      pageSize: PAGE_SIZE,
      keyword: appliedKeyword.value || undefined,
      category: selectedCategory.value || undefined,
      auditStatus: selectedAuditStatus.value || undefined,
      propertyCompanyId: selectedPropertyCompanyId.value,
      sort: '-rankOrder'
    })
    const list = res.list || []
    list.forEach(item => {
      merchantListCache.value[item.id] = item
    })
    merchants.value = mapMerchants(list)
    merchantTotal.value = res.pagination?.total ?? merchants.value.length
    currentPage.value = res.pagination?.page ?? page
    totalPages.value = res.pagination?.totalPages ?? 1
    if (!selectedCategory.value) {
      collectCategories(list)
    }
    if (!selectedProfitMerchantId.value && list.length && isPlatformAdmin.value) {
      const first = profitMerchantOptions.value[0]
      if (first) selectedProfitMerchantId.value = first.id
    }
  } catch (e) {
    console.error(e)
    merchants.value = []
    merchantTotal.value = 0
    totalPages.value = 1
  } finally {
    loading.value = false
  }
}

async function loadPlatformMerchants(page = currentPage.value) {
  loading.value = true
  try {
    const res = await merchantApi.listPlatform({
      page,
      pageSize: PAGE_SIZE,
      keyword: appliedKeyword.value || undefined,
      category: selectedCategory.value || undefined,
      status: selectedPlatformStatus.value || undefined,
      sort: '-createdAt'
    })
    const list = res.list || []
    list.forEach(item => {
      platformMerchantListCache.value[item.id] = item
    })
    platformMerchants.value = mapPlatformMerchants(list)
    platformMerchantTotal.value = res.pagination?.total ?? platformMerchants.value.length
    currentPage.value = res.pagination?.page ?? page
    totalPages.value = res.pagination?.totalPages ?? 1
    if (!selectedCategory.value) {
      collectCategoriesFromPlatform(list)
    }
  } catch (e) {
    console.error(e)
    platformMerchants.value = []
    platformMerchantTotal.value = 0
    totalPages.value = 1
  } finally {
    loading.value = false
  }
}

async function onPropertyCompanyChange() {
  if (!isPlatformAdmin.value) return
  profitError.value = ''
  selectedProfitMerchantId.value = ''
  currentPage.value = 1
  try {
    await loadMerchants(1)
    if (profitMerchantOptions.value.length) {
      selectedProfitMerchantId.value = profitMerchantOptions.value[0].id
    }
    await loadProfitSpace()
  } catch (e) {
    profitError.value = e instanceof ApiError ? e.message : '数据加载失败'
  }
}

async function loadProfitSpace() {
  if (!isPlatformAdmin.value) return
  const platformMerchantId = selectedProfitMerchantId.value
  if (!platformMerchantId) {
    profitData.value = mapProfitSpaceDisplay(null)
    profitError.value = profitMerchantOptions.value.length ? '请选择商家' : '暂无可用商家'
    return
  }
  const amount = Number(consumptionAmount.value)
  if (!Number.isFinite(amount) || amount < 0) {
    profitData.value = mapProfitSpaceDisplay(null)
    profitError.value = '请输入有效的消费额'
    return
  }
  profitLoading.value = true
  profitError.value = ''
  try {
    const data = await merchantApi.profitSpace(platformMerchantId, {
      consumptionAmount: amount
    })
    profitData.value = {
      ...mapProfitSpaceDisplay(data),
      merchantName: data.merchantName
        || data.platformMerchantName
        || profitMerchantOptions.value.find(m => m.id === platformMerchantId)?.name
        || '—',
      propertyName: data.propertyName || selectedPropertyName()
    }
  } catch (e) {
    profitError.value = e instanceof ApiError ? e.message : '盈利数据加载失败'
    profitData.value = mapProfitSpaceDisplay(null)
  } finally {
    profitLoading.value = false
  }
}

async function onViewModeChange(mode: string) {
  viewMode.value = mode as ViewMode
  currentPage.value = 1
  appliedKeyword.value = searchKeyword.value.trim()
  selectedProfitMerchantId.value = ''
  if (mode === 'platform') {
    await Promise.all([loadPlatformMerchants(1), loadMerchants(1)])
  } else {
    await loadMerchants(1)
  }
  if (isPlatformAdmin.value) {
    if (profitMerchantOptions.value.length) {
      selectedProfitMerchantId.value = profitMerchantOptions.value[0].id
    }
    await loadProfitSpace()
  }
}

function applyFilters() {
  currentPage.value = 1
  if (viewMode.value === 'platform') loadPlatformMerchants(1)
  else loadMerchants(1)
}

function submitSearch() {
  clearTimeout(searchTimer)
  appliedKeyword.value = searchKeyword.value.trim()
  currentPage.value = 1
  if (viewMode.value === 'platform') loadPlatformMerchants(1)
  else loadMerchants(1)
}

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(submitSearch, 300)
}

function changePage(page: number) {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return
  currentPage.value = page
  if (viewMode.value === 'platform') loadPlatformMerchants(page)
  else loadMerchants(page)
}

function resolveCategory(id: string, category?: string | null) {
  if (category && category !== '-') return category
  return merchantListCache.value[id]?.category
}

async function openDetailModal(id: string, listCategory?: string) {
  resetFormError()
  const cached = merchantListCache.value[id]
  detailData.value = cached ? { ...cached } : null
  detailModalOpen.value = true
  detailLoading.value = true
  try {
    const data = await merchantApi.get(id, selectedPropertyCompanyId.value || undefined)
    detailData.value = {
      ...data,
      category: resolveCategory(id, data.category || listCategory)
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
  resetFormError()
}

async function openEditModal(id: string) {
  resetFormError()
  editingId.value = id
  editModalOpen.value = true
  editLoading.value = true
  try {
    const data = await merchantApi.get(id, selectedPropertyCompanyId.value || undefined)
    editForm.value = {
      name: data.name || '',
      description: data.description || '',
      contactPhone: data.contactPhone || '',
      businessHours: data.businessHours || '',
      address: data.address || '',
      deliveryFee: data.deliveryFee ?? '',
      freeDeliveryThreshold: data.freeDeliveryThreshold ?? '',
      rankOrder: data.rankOrder,
      coverUrlsText: (data.coverUrls || []).join(', '),
      videoUrl: data.videoUrl || ''
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

async function submitEdit() {
  if (!editingId.value) return
  resetFormError()
  formSubmitting.value = true
  try {
    const coverUrls = editForm.value.coverUrlsText
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
    const payload: MerchantUpdatePayload = {
      name: editForm.value.name.trim() || undefined,
      description: editForm.value.description.trim() || undefined,
      contactPhone: editForm.value.contactPhone.trim() || undefined,
      businessHours: editForm.value.businessHours.trim() || undefined,
      address: editForm.value.address.trim() || undefined,
      deliveryFee: editForm.value.deliveryFee !== '' ? editForm.value.deliveryFee : undefined,
      freeDeliveryThreshold: editForm.value.freeDeliveryThreshold !== '' ? editForm.value.freeDeliveryThreshold : undefined,
      rankOrder: editForm.value.rankOrder,
      coverUrls: coverUrls.length ? coverUrls : undefined,
      videoUrl: editForm.value.videoUrl.trim() || undefined
    }
    await merchantApi.update(editingId.value, payload, selectedPropertyCompanyId.value || undefined)
    closeEditModal()
    await loadMerchants(currentPage.value)
  } catch (e) {
    formError.value = resolveErrorMessage(e)
  } finally {
    formSubmitting.value = false
  }
}

function resetPlatformForm() {
  platformForm.value = {
    name: '',
    category: '',
    contactPhone: '',
    description: '',
    businessHours: '',
    address: '',
    coverUrl: '',
    status: MERCHANT_STATUS.ACTIVE
  }
}

function openCreatePlatformModal() {
  resetFormError()
  platformFormMode.value = 'create'
  platformEditingId.value = ''
  resetPlatformForm()
  platformFormModalOpen.value = true
  platformFormLoading.value = false
}

async function openPlatformEditModal(id: string) {
  resetFormError()
  platformFormMode.value = 'edit'
  platformEditingId.value = id
  platformFormModalOpen.value = true
  platformFormLoading.value = true
  try {
    const data = await merchantApi.getPlatform(id)
    platformForm.value = {
      name: data.name || '',
      category: data.category || '',
      contactPhone: data.contactPhone || '',
      description: data.description || '',
      businessHours: data.businessHours || '',
      address: data.address || '',
      coverUrl: data.coverUrl || '',
      status: data.status || MERCHANT_STATUS.ACTIVE
    }
  } catch (e) {
    formError.value = resolveErrorMessage(e)
  } finally {
    platformFormLoading.value = false
  }
}

function closePlatformFormModal() {
  platformFormModalOpen.value = false
  platformEditingId.value = ''
  resetFormError()
}

async function submitPlatformForm() {
  resetFormError()
  formSubmitting.value = true
  try {
    if (platformFormMode.value === 'create') {
      const payload: PlatformMerchantCreatePayload = {
        name: platformForm.value.name.trim(),
        category: platformForm.value.category.trim(),
        contactPhone: platformForm.value.contactPhone.trim(),
        description: platformForm.value.description.trim() || undefined,
        businessHours: platformForm.value.businessHours.trim() || undefined,
        address: platformForm.value.address.trim() || undefined,
        coverUrl: platformForm.value.coverUrl.trim() || undefined
      }
      await merchantApi.createPlatform(payload)
    } else if (platformEditingId.value) {
      const payload: PlatformMerchantUpdatePayload = {
        name: platformForm.value.name.trim() || undefined,
        category: platformForm.value.category.trim() || undefined,
        contactPhone: platformForm.value.contactPhone.trim() || undefined,
        description: platformForm.value.description.trim() || undefined,
        businessHours: platformForm.value.businessHours.trim() || undefined,
        address: platformForm.value.address.trim() || undefined,
        coverUrl: platformForm.value.coverUrl.trim() || undefined,
        status: platformForm.value.status || undefined
      }
      await merchantApi.updatePlatform(platformEditingId.value, payload)
    }
    closePlatformFormModal()
    await loadPlatformMerchants(currentPage.value)
  } catch (e) {
    formError.value = resolveErrorMessage(e)
  } finally {
    formSubmitting.value = false
  }
}

async function openPlatformDetailModal(id: string) {
  resetFormError()
  platformDetailData.value = platformMerchantListCache.value[id] || null
  platformDetailModalOpen.value = true
  platformDetailLoading.value = true
  try {
    platformDetailData.value = await merchantApi.getPlatform(id)
  } catch (e) {
    formError.value = resolveErrorMessage(e)
  } finally {
    platformDetailLoading.value = false
  }
}

function closePlatformDetailModal() {
  platformDetailModalOpen.value = false
  platformDetailData.value = null
  resetFormError()
}

function openKickModal(id: string, name: string) {
  resetFormError()
  kickTargetId.value = id
  kickTargetName.value = name
  kickForm.value = { reason: '', notifyMerchant: true }
  kickModalOpen.value = true
}

function closeKickModal() {
  kickModalOpen.value = false
  kickTargetId.value = ''
  kickTargetName.value = ''
  resetFormError()
}

async function submitKick() {
  if (!kickTargetId.value) return
  if (!kickForm.value.reason.trim()) {
    formError.value = '请填写踢出原因'
    return
  }
  resetFormError()
  formSubmitting.value = true
  try {
    await merchantApi.kick(kickTargetId.value, {
      reason: kickForm.value.reason.trim(),
      notifyMerchant: kickForm.value.notifyMerchant
    })
    closeKickModal()
    await loadMerchants(currentPage.value)
  } catch (e) {
    formError.value = resolveErrorMessage(e)
  } finally {
    formSubmitting.value = false
  }
}

function openAdQuotaModal(id: string, name: string) {
  resetFormError()
  adQuotaTargetId.value = id
  adQuotaTargetName.value = name
  adQuotaPurchased.value = 1
  adQuotaResult.value = null
  adQuotaModalOpen.value = true
}

function closeAdQuotaModal() {
  adQuotaModalOpen.value = false
  adQuotaTargetId.value = ''
  adQuotaTargetName.value = ''
  adQuotaPurchased.value = 1
  adQuotaResult.value = null
  resetFormError()
}

async function submitAdQuota() {
  if (!adQuotaTargetId.value) return
  const amount = Number(adQuotaPurchased.value)
  if (!Number.isInteger(amount) || amount < 1) {
    formError.value = '请输入不小于 1 的整数'
    return
  }
  resetFormError()
  formSubmitting.value = true
  try {
    adQuotaResult.value = await merchantAdAdminApi.addQuota(adQuotaTargetId.value, amount)
  } catch (e) {
    formError.value = resolveErrorMessage(e)
  } finally {
    formSubmitting.value = false
  }
}

onMounted(async () => {
  try {
    await loadPropertyCompanies()
    await loadMerchants(1)
    if (isPlatformAdmin.value) {
      if (!selectedProfitMerchantId.value && profitMerchantOptions.value.length) {
        selectedProfitMerchantId.value = profitMerchantOptions.value[0].id
      }
      await loadProfitSpace()
    }
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.page { max-width: 1200px; }
.header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
.headerActions { display: flex; align-items: center; gap: 12px; }
.viewTabs { margin-bottom: 20px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; }
.required { color: #e05c5c; }
.btnPrimary { display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: 8px; border: none; background: #5c5c9e; color: #ffffff; font-size: 14px; cursor: pointer; transition: background 0.2s; }
.btnPrimary:hover { background: #52529a; }
.btnPrimary svg { width: 16px; height: 16px; }
.btnPrimary:disabled { opacity: 0.6; cursor: not-allowed; }
.btnDanger { padding: 10px 18px; border-radius: 8px; border: none; background: #e05c5c; color: #ffffff; font-size: 14px; cursor: pointer; }
.btnDanger:disabled { opacity: 0.6; cursor: not-allowed; }
.kickHint { font-size: 14px; color: #5c5c66; margin-bottom: 16px; }
.checkboxRow { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #5c5c66; margin-bottom: 16px; cursor: pointer; }
.linkedSection { margin-top: 16px; padding-top: 16px; border-top: 1px solid #f0f0f3; }
.linkedTitle { font-size: 14px; font-weight: 600; color: #1f1f2e; margin: 0 0 12px; }
.linkedList { margin: 0; padding-left: 20px; color: #5c5c66; font-size: 13px; line-height: 1.8; }

.profitFlow { background: #ffffff; border-radius: 12px; padding: 20px 24px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.profitHeader { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 12px; flex-wrap: wrap; }
.profitTitle { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 500; color: #1f1f2e; }
.headerIcon { width: 20px; height: 20px; color: #5c5c9e; }
.propertyTag { padding: 2px 8px; border-radius: 10px; background: #f0f0ff; color: #5c5c9e; font-size: 12px; font-weight: 500; }
.profitControls { display: flex; gap: 8px; flex-wrap: wrap; }
.periodSelect { padding: 6px 12px; border: 1px solid #e8e8ec; border-radius: 8px; background: #ffffff; color: #5c5c66; font-size: 13px; outline: none; cursor: pointer; max-width: 180px; }
.periodSelect:disabled { cursor: default; background: #fafafc; color: #8c8c9a; }
.companySelect { max-width: 200px; }
.periodSelect:focus { border-color: #5c5c9e; }
.consumptionInput { display: flex; align-items: center; gap: 8px; }
.consumptionLabel { font-size: 13px; color: #5c5c66; white-space: nowrap; }
.amountInput { width: 120px; max-width: 120px; }
.periodHint { font-size: 12px; color: #8c8c9a; margin-bottom: 16px; }
.profitLoading, .profitError { padding: 24px; text-align: center; color: #8c8c9a; font-size: 14px; }
.profitError { color: #e05c5c; }
.profitFlow .body { display: flex; align-items: center; gap: 16px; padding: 20px; background: #fafafc; border-radius: 12px; flex-wrap: wrap; }
.profitFlow .step { display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 100px; }
.profitFlow .stepIcon { width: 48px; height: 48px; border-radius: 50%; background: #f4f5f7; color: #5c5c66; display: flex; align-items: center; justify-content: center; margin-bottom: 4px; }
.profitFlow .stepIcon svg { width: 24px; height: 24px; }
.profitFlow .stepIcon.down { color: #e05c5c; }
.profitFlow .stepIcon.up { color: #3aaf7d; }
.profitFlow .stepLabel { font-size: 13px; color: #8c8c9a; }
.profitFlow .stepValue { font-size: 16px; font-weight: 600; color: #1f1f2e; }
.profitFlow .stepHint { font-size: 11px; color: #8c8c9a; text-align: center; max-width: 120px; }
.profitFlow .arrow { color: #c8c8d0; font-size: 20px; font-weight: 500; }
.profitFlow .result { display: flex; align-items: center; gap: 0; padding: 12px 16px; background: #ffffff; border-radius: 10px; border: 1px solid #e8e8ec; margin-left: auto; flex-wrap: wrap; }
.profitFlow .resultGroup { display: flex; align-items: center; }
.profitFlow .resultItem { text-align: center; min-width: 72px; padding: 0 8px; }
.profitFlow .resultLabel { font-size: 12px; color: #8c8c9a; margin-bottom: 4px; }
.profitFlow .resultValue { font-size: 18px; font-weight: 600; color: #5c5c9e; }
.profitFlow .resultHint { font-size: 11px; color: #8c8c9a; margin-top: 4px; }
.profitFlow .resultDivider { width: 1px; height: 36px; background: #e8e8ec; }

.table { background: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); overflow: hidden; }
.merchantRow { transition: background 0.15s; }
.merchantRow:hover { background: #fafafc; }
.table .toolbar { display: flex; align-items: center; gap: 12px; padding: 16px 24px; border-bottom: 1px solid #f0f0f3; flex-wrap: wrap; }
.filters { display: flex; align-items: center; gap: 12px; }
.table .search { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 200px; padding: 10px 14px; border: 1px solid #e8e8ec; border-radius: 8px; background: #fafafc; }
.table .search svg { width: 18px; height: 18px; color: #8c8c9a; }
.table .search input { flex: 1; border: none; background: transparent; font-size: 14px; color: #1f1f2e; outline: none; }
.mobileFilterBtn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px 14px; }
.mobileFilterBtn svg { width: 16px; height: 16px; }
.filterSelect { padding: 10px 14px; border: 1px solid #e8e8ec; border-radius: 8px; background: #ffffff; color: #5c5c66; font-size: 14px; cursor: pointer; outline: none; min-width: 120px; }
.filterSelect:focus { border-color: #5c5c9e; }
.table .content { width: 100%; font-size: 14px; }
.table .content thead th { text-align: left; padding: 14px 24px; color: #8c8c9a; font-weight: 500; background: #fafafc; border-bottom: 1px solid #f0f0f3; }
.table .content tbody td { padding: 16px 24px; color: #1f1f2e; border-bottom: 1px solid #f0f0f3; vertical-align: middle; }
.table .content tbody tr:last-child td { border-bottom: none; }
.emptyCell { text-align: center; padding: 24px; color: #8c8c9a; }
.table .info { display: flex; align-items: center; gap: 12px; }
.table .avatar { width: 44px; height: 44px; border-radius: 10px; background: #f4f5f7; color: #5c5c9e; display: flex; align-items: center; justify-content: center; }
.table .avatar svg { width: 24px; height: 24px; }
.table .name { font-weight: 500; color: #1f1f2e; margin-bottom: 4px; }
.table .category { font-size: 12px; color: #8c8c9a; }
.table .badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; background: #eef0f5; color: #5c5c66; }
.table .points { display: flex; align-items: center; gap: 6px; color: #5c5c66; }
.table .points svg { width: 16px; height: 16px; color: #f5a623; }
.table .actions { display: flex; align-items: center; gap: 8px; }
.table .actionBtn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; border: 1px solid; background: transparent; cursor: pointer; }
.table .actionBtn svg { width: 14px; height: 14px; }
.table .actionBtn.detail { border-color: #e8e8ec; color: #8c8c9a; }
.table .actionBtn.edit { border-color: #5c5c9e; color: #5c5c9e; }
.table .actionBtn.adQuota { border-color: #3aaf7d; color: #3aaf7d; }
.table .actionBtn.kick { border-color: #e05c5c; color: #e05c5c; }
.merchantCards { display: grid; gap: 12px; padding: 14px; }
.merchantCard { border: 1px solid #f0f0f3; border-radius: 14px; padding: 14px; background: #fafafc; }
.merchantCardHeader { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.merchantCard .info { display: flex; align-items: center; gap: 12px; min-width: 0; }
.merchantCard .avatar { flex: 0 0 auto; width: 40px; height: 40px; border-radius: 10px; background: #f0f0ff; color: #5c5c9e; display: flex; align-items: center; justify-content: center; }
.merchantCard .avatar svg { width: 22px; height: 22px; }
.merchantCard .name { font-weight: 600; color: #1f1f2e; }
.merchantCard .category { margin-top: 4px; font-size: 12px; color: #8c8c9a; }
.merchantCard .badge { display: inline-block; padding: 4px 10px; border-radius: 12px; background: #f0f0ff; color: #5c5c9e; font-size: 12px; font-weight: 500; white-space: nowrap; }
.merchantMeta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-bottom: 12px; color: #5c5c66; font-size: 13px; }
.merchantMeta span { min-width: 0; overflow-wrap: anywhere; }
.merchantCardActions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.cardActionBtn { min-height: 40px; border: 1px solid #e8e8ec; border-radius: 10px; background: #ffffff; color: #5c5c66; font-size: 14px; cursor: pointer; }
.cardActionBtn.primary { border-color: #5c5c9e; color: #5c5c9e; }
.cardActionBtn.success { border-color: #3aaf7d; color: #3aaf7d; }
.cardActionBtn.danger { border-color: #e05c5c; color: #e05c5c; }
.merchantCards .emptyCell { text-align: center; padding: 24px; color: #8c8c9a; }
.adQuotaResult {
  margin-bottom: 16px;
  padding: 12px 14px;
  border-radius: 8px;
  background: #f5f7ff;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.adQuotaResultTitle { font-size: 13px; font-weight: 600; color: #3aaf7d; }
.adQuotaResultRow {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  color: #5c5c66;
}
.adQuotaResultRow strong { color: #1f1f2e; font-weight: 600; }
.table .footer { display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; border-top: 1px solid #f0f0f3; }
.table .total { font-size: 13px; color: #8c8c9a; }
.table .pagination { display: flex; align-items: center; gap: 8px; }
.table .pageInfo { font-size: 13px; color: #8c8c9a; min-width: 48px; text-align: center; }
.table .pageBtn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 6px; border: 1px solid #e8e8ec; background: #ffffff; color: #5c5c66; font-size: 14px; cursor: pointer; }
.table .pageBtn:disabled { color: #c8c8d0; cursor: not-allowed; }

.modalOverlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; padding: 24px; }
.modal { width: 100%; max-width: 480px; background: #ffffff; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.12); }
.mobileSheet { max-width: 100%; border-radius: 18px 18px 0 0; margin-top: auto; }
.modalWide { max-width: 720px; }
.modalScroll { max-height: calc(100vh - 48px); display: flex; flex-direction: column; }
.modalScroll .modalBody { overflow-y: auto; }
.modalHeader { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #f0f0f3; }
.modalTitle { font-size: 16px; font-weight: 600; color: #1f1f2e; margin: 0; }
.modalClose { width: 32px; height: 32px; border: none; background: transparent; font-size: 24px; line-height: 1; color: #8c8c9a; cursor: pointer; }
.modalBody { padding: 24px; }
.field { margin-bottom: 16px; }
.fieldRow { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.fieldRow .field { margin-bottom: 16px; }
.label { display: block; font-size: 13px; font-weight: 500; color: #5c5c66; margin-bottom: 8px; }
.input, .textarea { width: 100%; padding: 10px 12px; border: 1px solid #e8e8ec; border-radius: 8px; font-size: 14px; color: #1f1f2e; background: #ffffff; outline: none; box-sizing: border-box; }
.textarea { resize: vertical; min-height: 80px; font-family: inherit; }
.input:focus, .textarea:focus { border-color: #5c5c9e; }
.error { font-size: 13px; color: #e05c5c; margin-bottom: 12px; }
.loadingText { text-align: center; color: #8c8c9a; padding: 24px 0; }
.detailGrid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px 24px; margin-bottom: 8px; }
.detailItem { display: flex; flex-direction: column; gap: 4px; }
.detailLabel { font-size: 12px; color: #8c8c9a; }
.detailValue { font-size: 14px; color: #1f1f2e; word-break: break-all; }
.modalFooter { display: flex; justify-content: flex-end; gap: 12px; margin-top: 8px; }
.btnSecondary { padding: 10px 18px; border-radius: 8px; border: 1px solid #e8e8ec; background: #ffffff; color: #5c5c66; font-size: 14px; cursor: pointer; }
.btnSecondary:hover { border-color: #5c5c9e; color: #5c5c9e; }
.btnPrimary { padding: 10px 18px; border-radius: 8px; border: none; background: #5c5c9e; color: #ffffff; font-size: 14px; cursor: pointer; }
.btnPrimary:hover { background: #52529a; }
.btnPrimary:disabled { opacity: 0.6; cursor: not-allowed; }

@media (max-width: 768px) {
  .profitFlow .result { margin-left: 0; width: 100%; }
  .profitFlow .body { flex-direction: column; align-items: stretch; }
  .profitFlow .step { min-width: 0; }
  .profitFlow .arrow { display: none; }
  .filtersMobile { display: none; flex: 1 1 100%; flex-direction: column; align-items: stretch; }
  .filtersMobile.filtersMobileOpen { display: flex; }
  .filtersMobile .filterSelect { width: 100%; }
}
@media (max-width: 900px) {
  .table .content { display: block; overflow-x: auto; }
  .table .toolbar { flex-direction: column; align-items: stretch; }
  .fieldRow { grid-template-columns: 1fr; }
  .detailGrid { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .header { flex-direction: column; align-items: stretch; }
  .headerActions { width: 100%; }
  .headerActions .btnPrimary { width: 100%; justify-content: center; }
  .profitFlow { padding: 16px; }
  .profitHeader, .profitControls { align-items: stretch; flex-direction: column; }
  .periodSelect, .companySelect, .amountInput { width: 100%; max-width: none; }
  .consumptionInput { display: grid; grid-template-columns: auto minmax(0, 1fr); }
  .profitFlow .result { justify-content: center; }
  .table .toolbar { padding: 14px; flex-direction: row; align-items: center; }
  .table .search { flex: 1 1 100%; min-width: 0; }
  .mobileFilterBtn { flex: 1; }
  .filterSelect { width: 100%; }
  .table .footer { flex-direction: column; gap: 12px; padding: 14px; }
  .modalOverlay { align-items: flex-end; padding: 0; }
  .modalScroll { max-height: calc(100vh - 16px); }
  .modalHeader { flex-direction: column; align-items: flex-start; gap: 8px; padding: 16px; }
  .modalClose { align-self: flex-end; margin-top: -40px; }
  .modalBody { padding: 16px; }
  .modalFooter { width: 100%; }
  .modalFooter .btnPrimary, .modalFooter .btnSecondary, .modalFooter .btnDanger { flex: 1; }
}
</style>
