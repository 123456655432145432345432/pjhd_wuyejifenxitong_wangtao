<template>
  <div class="page" :class="{ mobilePage: isMobile, mobilePageInShell: inMobileShell }">
    <div class="header">
      <div>
        <h1 class="title">参数配置</h1>
        <p class="desc">
          {{ companyDetail.name ? `${companyDetail.name} · ` : '' }}物业级业务规则。
          平台盘「我们公司」占比、配送费抽成、提现手续费由
          <strong>平台管理员</strong>统一控制。
        </p>
      </div>
      <button
        v-if="!isMobile"
        class="btnSave"
        :disabled="loading || saving || !companyId || pointShareSaveBlocked"
        @click="handleSave"
      >
        {{ saving ? '保存中...' : '保存全局设置' }}
      </button>
    </div>

    <p v-if="loadError" class="bannerError">{{ loadError }}</p>
    <p v-if="saveError" class="bannerError">{{ saveError }}</p>
    <p v-if="saveSuccess" class="bannerSuccess">{{ saveSuccess }}</p>

    <div v-if="isPlatformAdmin" class="field propertySelect">
      <label class="label">选择物业公司</label>
      <select v-model="selectedPropertyId" class="input" @change="loadDetail()">
        <option value="">请选择物业公司</option>
        <option v-for="pc in propertyCompanies" :key="pc.id" :value="pc.id">{{ pc.name }}</option>
      </select>
    </div>

    <div v-if="loading" class="loadingText">加载配置中...</div>
    <template v-else>
      <!-- ① 分账：平台盘 + 配送费 -->
      <section class="section">
        <div class="sectionHead">
          <h2 class="sectionTitle">分账</h2>
          <p class="sectionDesc">
            商品价进平台盘（我们公司 / 物业 / 管理盘）；管理盘内再按统筹 : 板块 : 个体 = 4 : 3 : 3 拆分。
            配送结算基数单独分给我们公司与配送员；满额减免由明确承担方补贴，不从商品平台盘扣除。
            <template v-if="!canEditPlatformFinance">当前账号仅可查看分成比例。</template>
          </p>
        </div>

        <div class="stack">
          <div class="card cardWide">
            <div class="header">
              <div class="icon pink"><IconSvg name="bank" /></div>
              <div class="headerText">
                <span>平台盘比例</span>
                <span class="headerSub">三档之和约 100%；管理盘内默认统筹:板块:个体 = 4:3:3</span>
              </div>
            </div>

            <div class="tierBlock">
              <p class="tierLabel">三档并行</p>
              <div class="shareGrid three">
                <div class="field">
                  <label class="label">我们公司（只读）</label>
                  <div class="inputWrap">
                    <input :value="config.platformSharePercent" type="number" class="input" disabled />
                    <span class="unit">%</span>
                  </div>
                </div>
                <div class="field">
                  <label class="label">物业</label>
                  <div class="inputWrap">
                    <input
                      v-model.number="config.propertySharePercent"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      class="input"
                      :disabled="!canEditPlatformFinance"
                    />
                    <span class="unit">%</span>
                  </div>
                </div>
                <div class="field">
                  <label class="label">管理 / 统筹盘</label>
                  <div class="inputWrap">
                    <input
                      v-model.number="config.coordinatorSharePercent"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      class="input"
                      :disabled="!canEditPlatformFinance"
                    />
                    <span class="unit">%</span>
                  </div>
                </div>
              </div>
              <div class="poolBar" aria-hidden="true">
                <span class="poolSeg our" :style="{ width: `${poolBarWidths.our}%` }" />
                <span class="poolSeg property" :style="{ width: `${poolBarWidths.property}%` }" />
                <span class="poolSeg management" :style="{ width: `${poolBarWidths.management}%` }" />
              </div>
              <p class="poolSum" :class="{ warn: poolTierWarn }">
                三档合计 {{ poolTierSumPercent.toFixed(1) }}%
                <span v-if="poolTierWarn">（建议约 100%）</span>
              </p>
            </div>

            <div class="tierBlock cascade">
              <div class="tierLabelRow">
                <p class="tierLabel">管理盘内拆分（占管理盘）</p>
                <button
                  v-if="canEditPlatformFinance"
                  type="button"
                  class="linkBtn"
                  @click="applyDefaultManagementSplit"
                >
                  应用默认 4:3:3
                </button>
              </div>
              <p class="tierHint">默认统筹 40% · 板块负责人 30% · 个体负责人 30%；三者之和应为 100%。</p>
              <div class="shareGrid three">
                <div class="field">
                  <label class="label">统筹</label>
                  <div class="inputWrap">
                    <input
                      v-model.number="managementSplit.coordinatorPercent"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      class="input"
                      :disabled="!canEditPlatformFinance"
                      @input="onManagementCoordinatorInput"
                    />
                    <span class="unit">%</span>
                  </div>
                </div>
                <div class="field">
                  <label class="label">板块负责人</label>
                  <div class="inputWrap">
                    <input
                      v-model.number="managementSplit.sectorPercent"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      class="input"
                      :disabled="!canEditPlatformFinance"
                      @input="onManagementSectorOrIndividualInput"
                    />
                    <span class="unit">%</span>
                  </div>
                </div>
                <div class="field">
                  <label class="label">个体负责人</label>
                  <div class="inputWrap">
                    <input
                      v-model.number="managementSplit.individualPercent"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      class="input"
                      :disabled="!canEditPlatformFinance"
                      @input="onManagementSectorOrIndividualInput"
                    />
                    <span class="unit">%</span>
                  </div>
                </div>
              </div>
              <div class="poolBar" aria-hidden="true">
                <span class="poolSeg management" :style="{ width: `${managementBarWidths.coordinator}%` }" />
                <span class="poolSeg sector" :style="{ width: `${managementBarWidths.sector}%` }" />
                <span class="poolSeg individual" :style="{ width: `${managementBarWidths.individual}%` }" />
              </div>
              <p class="poolSum" :class="{ warn: managementSplitWarn }">
                管理盘内合计 {{ managementSplitSum.toFixed(1) }}%
                <span v-if="managementSplitWarn">（须为 100%）</span>
                <span v-else class="poolSumOk"> · 级联落库 板块抽 {{ config.sectorLeaderPercent.toFixed(1) }}% / 个体抽板块 {{ config.individualLeaderPercent.toFixed(1) }}%</span>
              </p>
            </div>

            <details class="fold">
              <summary>参考比例（不进主分成链）</summary>
              <div class="shareGrid foldBody">
                <div class="field">
                  <label class="label">区域负责人</label>
                  <div class="inputWrap">
                    <input
                      v-model.number="config.regionalLeaderPercent"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      class="input"
                      :disabled="!canEditPlatformFinance"
                    />
                    <span class="unit">%</span>
                  </div>
                </div>
                <div class="field">
                  <label class="label">项目负责人</label>
                  <div class="inputWrap">
                    <input
                      v-model.number="config.projectLeaderPercent"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      class="input"
                      :disabled="!canEditPlatformFinance"
                    />
                    <span class="unit">%</span>
                  </div>
                </div>
              </div>
            </details>

            <p class="cardFoot">
              「我们公司」占比请到
              <RouterLink v-if="isPlatformAdmin" class="inlineLink" :to="{ name: 'platform-share-config' }">
                平台分成配置
              </RouterLink>
              <span v-else>平台分成配置</span>
              修改；真实份额以分成明细为准。
            </p>
          </div>

          <div class="card cardWide">
            <div class="header">
              <div class="icon orange"><IconSvg name="delivery" /></div>
              <div class="headerText">
                <span>配送链路分账</span>
                <span class="headerSub">按配送结算基数分配，仅我们公司与配送员参与</span>
              </div>
            </div>

            <div class="shareGrid three">
              <div class="field">
                <label class="label">我们公司抽成（只读）</label>
                <div class="inputWrap">
                  <input :value="config.platformDeliverySharePercent" type="number" class="input" disabled />
                  <span class="unit">%</span>
                </div>
              </div>
              <div class="field">
                <label class="label">配送员所得（只读）</label>
                <div class="inputWrap">
                  <input :value="courierDeliveryRemainPercent" type="number" class="input" disabled />
                  <span class="unit">%</span>
                </div>
              </div>
              <div class="field">
                <label class="label">按重量加价</label>
                <div class="inputWrap prefix">
                  <span class="prefixText">¥</span>
                  <input
                    v-model.number="config.deliveryPerKgFee"
                    type="number"
                    min="0"
                    step="0.01"
                    class="input"
                  />
                  <span class="unit">/ kg</span>
                </div>
              </div>
            </div>

            <p class="cardFoot">
              配送结算基数抽成请到
              <RouterLink v-if="isPlatformAdmin" class="inlineLink" :to="{ name: 'platform-share-config' }">
                平台分成配置
              </RouterLink>
              <span v-else>平台分成配置</span>
              修改。提现手续费平台分成（只读）：{{ config.platformWithdrawalFeeSharePercent }}%。
            </p>
          </div>
        </div>
      </section>

      <!-- ② 积分 -->
      <section class="section">
        <div class="sectionHead">
          <h2 class="sectionTitle">积分</h2>
          <p class="sectionDesc">抵扣规则、清零策略，以及消费返积分比例（变更走价格审批）。</p>
        </div>
        <div class="grid">
          <div class="card">
            <div class="header">
              <div class="icon purple"><IconSvg name="points" /></div>
              <span>积分规则</span>
            </div>
            <div class="field">
              <label class="label">抵扣物业费比率</label>
              <div class="inline">
                <div class="inputWrap">
                  <input
                    v-model.number="config.pointToFeeRatePercent"
                    type="number"
                    min="0"
                    step="0.01"
                    class="input"
                  />
                  <span class="unit">%</span>
                </div>
              </div>
            </div>
            <div class="field">
              <label class="label">积分兑换比例</label>
              <div class="inline">
                <div class="inputWrap">
                  <input
                    v-model.number="config.pointExchangeRate"
                    type="number"
                    min="1"
                    step="1"
                    class="input"
                  />
                </div>
                <span class="hint">积分 / 1 元</span>
              </div>
            </div>
            <div class="field">
              <label class="label">清零规则</label>
              <label class="checkbox">
                <input v-model="config.twoYearClearEnabled" type="checkbox" />
                <span class="checkmark"><IconSvg v-if="config.twoYearClearEnabled" name="check" /></span>
                <span>连续 24 个月欠费自动清零</span>
              </label>
            </div>
          </div>

          <div class="card">
            <div class="header">
              <div class="icon purple"><IconSvg name="points" /></div>
              <div class="headerText">
                <span>积分分成比例</span>
                <span class="headerSub">
                  四项合计必须为 100%，{{ isPlatformAdmin ? '保存后直接生效' : '保存时提交价格审批' }}
                </span>
              </div>
            </div>
            <div class="shareGrid">
              <div class="field">
                <label class="label">业主</label>
                <div class="inputWrap">
                  <input
                    v-model.number="pointShare.residentPercent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    class="input"
                    :class="{ inputError: pointShareInvalid }"
                  />
                  <span class="unit">%</span>
                </div>
              </div>
              <div class="field">
                <label class="label">商家</label>
                <div class="inputWrap">
                  <input
                    v-model.number="pointShare.merchantPercent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    class="input"
                    :class="{ inputError: pointShareInvalid }"
                  />
                  <span class="unit">%</span>
                </div>
              </div>
              <div class="field">
                <label class="label">物业币</label>
                <div class="inputWrap">
                  <input
                    v-model.number="pointShare.coinPercent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    class="input"
                    :class="{ inputError: pointShareInvalid }"
                  />
                  <span class="unit">%</span>
                </div>
              </div>
              <div class="field">
                <label class="label">共享</label>
                <div class="inputWrap">
                  <input
                    v-model.number="pointShare.sharedPercent"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    class="input"
                    :class="{ inputError: pointShareInvalid }"
                  />
                  <span class="unit">%</span>
                </div>
              </div>
            </div>
            <div class="bar" :class="{ barDanger: pointShareInvalid }">
              <div
                class="fill"
                :class="{ fillDanger: pointShareInvalid }"
                :style="{ width: `${Math.min(pointShareTotalPercent, 100)}%` }"
              />
            </div>
            <p class="shareTotal" :class="{ error: pointShareInvalid }">
              合计 {{ pointShareTotalPercent.toFixed(1) }}% / 必须为 100%
              <span v-if="pointShareInvalid">（请调整后再提交）</span>
            </p>
            <p v-if="pointShareDirty && !pointShareInvalid" class="sharePendingHint">
              <template v-if="isPlatformAdmin">
                已修改：点「保存全局设置」后直接生效。
              </template>
              <template v-else>
                已修改：点「保存全局设置」将提交价格审批，生效前仍显示原值。
                <RouterLink class="inlineLink" :to="{ name: 'price-approvals' }">价格审批</RouterLink>
              </template>
            </p>
            <div class="shareActions">
              <button
                type="button"
                class="btnSecondary"
                :disabled="!pointShareDirty || saving"
                @click="resetPointShareForm"
              >
                还原
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- ③ 物业币 -->
      <section class="section">
        <div class="sectionHead">
          <h2 class="sectionTitle">物业币</h2>
          <p class="sectionDesc">发放、展示、商城抵扣与使用门槛。</p>
        </div>
        <div class="grid">
          <div class="card">
            <div class="header">
              <div class="icon green"><IconSvg name="coin" /></div>
              <span>基础设置</span>
            </div>
            <div class="shareGrid">
              <div class="field">
                <label class="label">有效期</label>
                <div class="inputWrap">
                  <input v-model.number="config.coinExpiryDays" type="number" min="1" class="input" />
                  <span class="unit">天</span>
                </div>
              </div>
              <div class="field">
                <label class="label">发放模式</label>
                <select v-model="config.coinIssueMode" class="select">
                  <option v-for="opt in COIN_ISSUE_MODE_OPTIONS" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
              </div>
            </div>
            <div class="field">
              <div class="switchRow">
                <div>
                  <div class="label">App 显示余额</div>
                </div>
                <button
                  type="button"
                  class="switch"
                  :class="{ active: config.coinDisplayEnabled }"
                  @click="config.coinDisplayEnabled = !config.coinDisplayEnabled"
                >
                  <span class="thumb" />
                </button>
              </div>
            </div>
            <div class="field">
              <div class="switchRow">
                <div>
                  <div class="label">新用户默认冻结</div>
                </div>
                <button
                  type="button"
                  class="switch"
                  :class="{ active: config.coinFreezeDefault }"
                  @click="config.coinFreezeDefault = !config.coinFreezeDefault"
                >
                  <span class="thumb" />
                </button>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="header">
              <div class="icon green"><IconSvg name="coin" /></div>
              <span>商城与使用条件</span>
            </div>
            <div class="field">
              <div class="switchRow">
                <div>
                  <div class="label">商城可用物业币抵扣</div>
                </div>
                <button
                  type="button"
                  class="switch"
                  :class="{ active: config.coinMallEnabled }"
                  @click="config.coinMallEnabled = !config.coinMallEnabled"
                >
                  <span class="thumb" />
                </button>
              </div>
            </div>
            <div class="shareGrid">
              <div class="field">
                <label class="label">最大抵扣比例</label>
                <div class="inputWrap">
                  <input
                    v-model.number="config.coinMallMaxRatioPercent"
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    class="input"
                  />
                  <span class="unit">%</span>
                </div>
              </div>
              <div class="field">
                <label class="label">最低使用金额</label>
                <div class="inputWrap prefix">
                  <span class="prefixText">¥</span>
                  <input
                    v-model.number="config.coinMallMinAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    class="input"
                  />
                </div>
              </div>
            </div>
            <div class="subDivider" />
            <div class="field">
              <label class="label">使用条件</label>
              <select v-model="coinUseForm.condition" class="selectInput">
                <option v-for="opt in COIN_USE_CONDITION_OPTIONS" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
            <div v-if="coinUseForm.condition === COIN_USE_CONDITION.POINT_THRESHOLD" class="field">
              <label class="label">积分阈值</label>
              <div class="inputWrap">
                <input v-model.number="coinUseForm.pointThreshold" type="number" min="0" step="1" class="input" />
              </div>
            </div>
            <p v-if="coinUseError" class="error">{{ coinUseError }}</p>
            <p v-if="coinUseSuccess" class="success">{{ coinUseSuccess }}</p>
            <button
              type="button"
              class="btnSave compact"
              :disabled="coinUseSaving || !companyId"
              @click="saveCoinUseCondition"
            >
              {{ coinUseSaving ? '保存中...' : '保存使用条件' }}
            </button>
          </div>
        </div>
      </section>

      <!-- ④ 提现与其它 -->
      <section class="section">
        <div class="sectionHead">
          <h2 class="sectionTitle">提现与其它</h2>
          <p class="sectionDesc">
            手续费与自动提现仅平台管理员可改。
            <template v-if="!canEditPlatformFinance">当前账号只读。</template>
          </p>
        </div>
        <div class="grid">
          <div class="card">
            <div class="header">
              <div class="icon pink"><IconSvg name="wallet" /></div>
              <span>提现</span>
            </div>
            <div class="field">
              <div class="switchRow">
                <div>
                  <div class="label">收取提现手续费</div>
                  <p class="note">关闭后费率为 0</p>
                </div>
                <button
                  type="button"
                  class="switch"
                  :class="{ active: feeChargeEnabled }"
                  :disabled="!canEditPlatformFinance"
                  @click="toggleFeeCharge"
                >
                  <span class="thumb" />
                </button>
              </div>
            </div>
            <div class="field">
              <label class="label">提现手续费率</label>
              <div class="inputWrap">
                <input
                  v-model.number="config.withdrawalFeeRatePercent"
                  type="number"
                  min="0"
                  step="0.01"
                  class="input"
                  :disabled="!canEditPlatformFinance || !feeChargeEnabled"
                />
                <span class="unit">%</span>
              </div>
              <p class="fieldHint">默认常见 0.6%；随「保存全局设置」落库</p>
            </div>
            <div class="field">
              <div class="switchRow">
                <div>
                  <div class="label">自动提现</div>
                </div>
                <button
                  type="button"
                  class="switch"
                  :class="{ active: withdrawSettings.autoEnabled }"
                  :disabled="!canEditPlatformFinance"
                  @click="withdrawSettings.autoEnabled = !withdrawSettings.autoEnabled"
                >
                  <span class="thumb" />
                </button>
              </div>
            </div>
            <div class="field">
              <label class="label">提现周期</label>
              <div class="inputWrap">
                <input
                  v-model.number="withdrawSettings.periodDays"
                  type="number"
                  min="1"
                  step="1"
                  class="input"
                  :disabled="!canEditPlatformFinance"
                />
                <span class="unit">天</span>
              </div>
            </div>
            <p v-if="withdrawError" class="error">{{ withdrawError }}</p>
            <p v-if="withdrawSuccess" class="success">{{ withdrawSuccess }}</p>
            <button
              type="button"
              class="btnSave compact"
              :disabled="withdrawSaving || !companyId || !canEditPlatformFinance"
              @click="saveWithdrawSettings"
            >
              {{ withdrawSaving ? '保存中...' : '保存自动提现' }}
            </button>
          </div>

          <div class="card">
            <div class="header">
              <div class="icon purple"><IconSvg name="setting" /></div>
              <span>其它</span>
            </div>
            <div class="field">
              <label class="label">邻居私聊每日限制</label>
              <div class="inputWrap">
                <input
                  v-model.number="config.neighborDailyContactLimit"
                  type="number"
                  min="0"
                  step="1"
                  class="input"
                />
                <span class="unit">人/天</span>
              </div>
              <p class="fieldHint">主动发起新聊的不同对象人数上限</p>
            </div>
          </div>
        </div>
      </section>

      <div v-if="companyDetail.communities?.length || companyDetail.admins?.length" class="metaGrid">
        <div v-if="companyDetail.communities?.length" class="card metaCard">
          <div class="header">
            <span>小区列表（{{ companyDetail.communities.length }}）</span>
          </div>
          <ul class="metaList">
            <li v-for="item in companyDetail.communities" :key="item.id">
              {{ item.name || item.id }}
            </li>
          </ul>
        </div>
        <div v-if="companyDetail.admins?.length" class="card metaCard">
          <div class="header">
            <span>管理员列表（{{ companyDetail.admins.length }}）</span>
          </div>
          <ul class="metaList">
            <li v-for="item in companyDetail.admins" :key="item.id">
              {{ item.name || item.id }}
              <span v-if="item.phone" class="metaSub"> · {{ item.phone }}</span>
            </li>
          </ul>
        </div>
      </div>
    </template>

    <div v-if="isMobile" class="mobileSaveBar" :class="{ mobileSaveBarInShell: inMobileShell }">
      <button
        class="btnSave"
        :disabled="loading || saving || !companyId || pointShareSaveBlocked"
        @click="handleSave"
      >
        {{ saving ? '保存中...' : '保存全局设置' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import IconSvg from '../components/IconSvg.vue'
import { configApi, propertyCoinMallApi, propertyCompanyApi, coinUseConditionApi, coinWithdrawalAdminApi, platformShareApi, priceApprovalApi } from '../api/services'
import {
  extractPropertyCompanyConfig,
  normalizePropertyCompanyDetail,
  rateToFormPercent
} from '../api/mappers'
import { ApiError } from '../api/request'
import { useAuthStore } from '../stores/auth'
import type { PropertyCompanyConfig, PropertyCompanyDetail, PropertyCompanyItem } from '../api/types'
import { API_ERROR_CODE, COIN_ISSUE_MODE, COIN_ISSUE_MODE_OPTIONS, COIN_USE_CONDITION, COIN_USE_CONDITION_OPTIONS, PRICE_APPROVAL_ITEM_TYPE, USER_ROLE } from '../constants/enums'
import { useInMobileShell } from '../composables/useInMobileShell'

const auth = useAuthStore()
const { isMobile, inMobileShell } = useInMobileShell()
const isPlatformAdmin = computed(() => auth.profile?.role === USER_ROLE.PLATFORM_ADMIN)
const isPropertyAdmin = computed(() => auth.profile?.role === USER_ROLE.PROPERTY_ADMIN)
/** 各角色分成比例、手续费开关、手续费比例：仅平台管理员可写 */
const canEditPlatformFinance = computed(() => isPlatformAdmin.value)
/** @deprecated 兼容旧名，等同 canEditPlatformFinance */
const canEditCashShare = canEditPlatformFinance

const propertyCompanies = ref<PropertyCompanyItem[]>([])
const selectedPropertyId = ref('')

const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const saveError = ref('')
const saveSuccess = ref('')

const companyDetail = reactive<PropertyCompanyDetail>({ id: '' })
const companyId = computed(
  () => selectedPropertyId.value || auth.propertyCompanyId || auth.profile?.propertyCompanyId || ''
)

const coinUseForm = reactive({
  condition: COIN_USE_CONDITION.NONE as string,
  pointThreshold: 0
})
const coinUseSaving = ref(false)
const coinUseError = ref('')
const coinUseSuccess = ref('')

const withdrawSettings = reactive({
  autoEnabled: false,
  periodDays: 7,
  feeRate: undefined as number | undefined
})
const withdrawSaving = ref(false)
const withdrawError = ref('')
const withdrawSuccess = ref('')

/** v5.3 积分分成比例（表单用百分比，四项合计必须为 100%）；变更走价格审批 */
const pointShare = reactive({
  residentPercent: 0,
  merchantPercent: 0,
  coinPercent: 0,
  sharedPercent: 0
})
/** 当前已生效值（用于对比是否 dirty、提交审批 oldValue） */
const pointShareSaved = reactive({
  residentPercent: 0,
  merchantPercent: 0,
  coinPercent: 0,
  sharedPercent: 0
})

const pointShareTotalPercent = computed(
  () =>
    Number(pointShare.residentPercent || 0) +
    Number(pointShare.merchantPercent || 0) +
    Number(pointShare.coinPercent || 0) +
    Number(pointShare.sharedPercent || 0)
)
const pointShareInvalid = computed(() => {
  const values = [
    pointShare.residentPercent,
    pointShare.merchantPercent,
    pointShare.coinPercent,
    pointShare.sharedPercent
  ].map((value) => Number(value))
  return (
    values.some((value) => !Number.isFinite(value) || value < 0 || value > 100) ||
    Math.abs(pointShareTotalPercent.value - 100) > 0.01
  )
})

function ratesClose(a: number, b: number) {
  return Math.abs(Number(a || 0) - Number(b || 0)) < 0.0001
}

const pointShareDirty = computed(
  () =>
    !ratesClose(pointShare.residentPercent, pointShareSaved.residentPercent) ||
    !ratesClose(pointShare.merchantPercent, pointShareSaved.merchantPercent) ||
    !ratesClose(pointShare.coinPercent, pointShareSaved.coinPercent) ||
    !ratesClose(pointShare.sharedPercent, pointShareSaved.sharedPercent)
)
const pointShareSaveBlocked = computed(() => pointShareDirty.value && pointShareInvalid.value)

const config = reactive({
  pointToFeeRatePercent: 1,
  twoYearClearEnabled: false,
  coinExpiryDays: 365,
  coinDisplayEnabled: true,
  coinIssueMode: COIN_ISSUE_MODE.AUTO,
  coinFreezeDefault: false,
  coinMallEnabled: false,
  coinMallMaxRatioPercent: 50,
  coinMallMinAmount: 10,
  deliveryBaseFee: 0.5,
  deliveryPerKgFee: 0,
  propertySharePercent: 60,
  coordinatorSharePercent: 30,
  sectorLeaderPercent: 60,
  individualLeaderPercent: 50,
  regionalLeaderPercent: 0,
  projectLeaderPercent: 0,
  platformSharePercent: 0,
  platformDeliverySharePercent: 0,
  platformWithdrawalFeeSharePercent: 0,
  pointExchangeRate: 100,
  withdrawalFeeRatePercent: 0.6,
  neighborDailyContactLimit: 3
} as {
  pointToFeeRatePercent: number
  twoYearClearEnabled: boolean
  coinExpiryDays: number
  coinDisplayEnabled: boolean
  coinIssueMode: string
  coinFreezeDefault: boolean
  coinMallEnabled: boolean
  coinMallMaxRatioPercent: number
  coinMallMinAmount: number
  deliveryBaseFee: number
  deliveryPerKgFee: number
  propertySharePercent: number
  coordinatorSharePercent: number
  sectorLeaderPercent: number
  individualLeaderPercent: number
  regionalLeaderPercent: number
  projectLeaderPercent: number
  platformSharePercent: number
  platformDeliverySharePercent: number
  platformWithdrawalFeeSharePercent: number
  pointExchangeRate: number
  withdrawalFeeRatePercent: number
  neighborDailyContactLimit: number
})

/** 平台盘三档：我们公司 + 物业 + 管理 */
const poolTierSumPercent = computed(
  () =>
    Number(config.platformSharePercent || 0) +
    Number(config.propertySharePercent || 0) +
    Number(config.coordinatorSharePercent || 0)
)
const poolTierWarn = computed(() => Math.abs(poolTierSumPercent.value - 100) > 0.5)
const poolBarWidths = computed(() => {
  const our = Math.max(0, Number(config.platformSharePercent) || 0)
  const property = Math.max(0, Number(config.propertySharePercent) || 0)
  const management = Math.max(0, Number(config.coordinatorSharePercent) || 0)
  const sum = our + property + management
  if (sum < 0.0001) return { our: 0, property: 0, management: 0 }
  const scale = sum > 100 ? 100 / sum : 1
  return {
    our: our * scale,
    property: property * scale,
    management: management * scale
  }
})
const courierDeliveryRemainPercent = computed(() => {
  const cut = Number(config.platformDeliverySharePercent) || 0
  return Math.round(Math.max(0, 100 - cut) * 10) / 10
})

/** 管理盘内展示用：统筹 / 板块 / 个体（默认 4:3:3），保存时换算为级联字段 */
const MANAGEMENT_SPLIT_DEFAULT = { coordinatorPercent: 40, sectorPercent: 30, individualPercent: 30 }
const managementSplit = reactive({ ...MANAGEMENT_SPLIT_DEFAULT })

function roundPercent1(n: number) {
  return Math.round(n * 10) / 10
}

function syncCascadeFromManagementSplit() {
  const sector = Math.max(0, Number(managementSplit.sectorPercent) || 0)
  const individual = Math.max(0, Number(managementSplit.individualPercent) || 0)
  const gross = sector + individual
  config.sectorLeaderPercent = roundPercent1(gross)
  config.individualLeaderPercent = gross > 0.0001 ? roundPercent1((individual / gross) * 100) : 0
}

/** 改板块/个体时，统筹自动补足为剩余（保证管理盘内合计 100%） */
function onManagementSectorOrIndividualInput() {
  const sector = Math.max(0, Number(managementSplit.sectorPercent) || 0)
  const individual = Math.max(0, Number(managementSplit.individualPercent) || 0)
  managementSplit.coordinatorPercent = roundPercent1(Math.max(0, 100 - sector - individual))
  syncCascadeFromManagementSplit()
}

function onManagementCoordinatorInput() {
  syncCascadeFromManagementSplit()
}

function loadManagementSplitFromCascade() {
  const sectorRate = Math.max(0, Number(config.sectorLeaderPercent) || 0)
  const individualRate = Math.max(0, Number(config.individualLeaderPercent) || 0)
  const sectorGross = sectorRate
  const individual = sectorGross * (individualRate / 100)
  const sector = sectorGross - individual
  const coordinator = 100 - sectorGross
  managementSplit.coordinatorPercent = roundPercent1(Math.max(0, coordinator))
  managementSplit.sectorPercent = roundPercent1(Math.max(0, sector))
  managementSplit.individualPercent = roundPercent1(Math.max(0, individual))
}

function applyDefaultManagementSplit() {
  Object.assign(managementSplit, { ...MANAGEMENT_SPLIT_DEFAULT })
  syncCascadeFromManagementSplit()
}

const managementSplitSum = computed(
  () =>
    Number(managementSplit.coordinatorPercent || 0) +
    Number(managementSplit.sectorPercent || 0) +
    Number(managementSplit.individualPercent || 0)
)
const managementSplitWarn = computed(() => Math.abs(managementSplitSum.value - 100) > 0.5)
const managementBarWidths = computed(() => {
  const coordinator = Math.max(0, Number(managementSplit.coordinatorPercent) || 0)
  const sector = Math.max(0, Number(managementSplit.sectorPercent) || 0)
  const individual = Math.max(0, Number(managementSplit.individualPercent) || 0)
  const sum = coordinator + sector + individual
  if (sum < 0.0001) return { coordinator: 0, sector: 0, individual: 0 }
  const scale = sum > 100 ? 100 / sum : 1
  return {
    coordinator: coordinator * scale,
    sector: sector * scale,
    individual: individual * scale
  }
})

/** 上次非零手续费率，关闭「收取手续费」后可恢复 */
const lastPositiveFeePercent = ref(0.6)
const feeChargeEnabled = computed(() => Number(config.withdrawalFeeRatePercent) > 0)

function toggleFeeCharge() {
  if (!canEditPlatformFinance.value) return
  if (feeChargeEnabled.value) {
    const current = Number(config.withdrawalFeeRatePercent) || 0
    if (current > 0) lastPositiveFeePercent.value = current
    config.withdrawalFeeRatePercent = 0
  } else {
    config.withdrawalFeeRatePercent =
      lastPositiveFeePercent.value > 0 ? lastPositiveFeePercent.value : 0.6
  }
}

function mapConfigToForm(apiConfig: PropertyCompanyConfig) {
  config.pointToFeeRatePercent = rateToFormPercent(apiConfig.pointToFeeRate ?? 0.01)
  config.twoYearClearEnabled = apiConfig.twoYearClearEnabled ?? false
  config.coinExpiryDays = apiConfig.coinExpiryDays ?? 365
  config.coinDisplayEnabled = apiConfig.coinDisplayEnabled ?? true
  config.coinIssueMode = apiConfig.coinIssueMode || COIN_ISSUE_MODE.AUTO
  config.coinFreezeDefault = apiConfig.coinFreezeDefault ?? false
  config.coinMallEnabled = apiConfig.coinMallEnabled ?? false
  config.coinMallMaxRatioPercent = rateToFormPercent(apiConfig.coinMallMaxRatio ?? 0.5)
  config.coinMallMinAmount = apiConfig.coinMallMinAmount ?? 10
  config.deliveryBaseFee = apiConfig.deliveryBaseFee ?? 0.5
  config.deliveryPerKgFee = apiConfig.deliveryPerKgFee ?? apiConfig.perKgFee ?? 0
  config.propertySharePercent = rateToFormPercent(apiConfig.propertyShareRate ?? 0.6)
  config.coordinatorSharePercent = rateToFormPercent(apiConfig.coordinatorShareRate ?? 0.3)
  config.sectorLeaderPercent = rateToFormPercent(apiConfig.sectorLeaderRate ?? 0.6)
  config.individualLeaderPercent = rateToFormPercent(apiConfig.individualLeaderRate ?? 0.5)
  config.regionalLeaderPercent = rateToFormPercent(apiConfig.regionalLeaderRate ?? 0)
  config.projectLeaderPercent = rateToFormPercent(apiConfig.projectLeaderRate ?? 0)
  config.platformSharePercent = rateToFormPercent(apiConfig.platformShareRate ?? 0)
  config.platformDeliverySharePercent = rateToFormPercent(apiConfig.platformDeliveryShareRate ?? 0)
  config.platformWithdrawalFeeSharePercent = rateToFormPercent(apiConfig.platformWithdrawalFeeShareRate ?? 0)
  config.pointExchangeRate = apiConfig.pointExchangeRate ?? 100
  config.withdrawalFeeRatePercent = rateToFormPercent(apiConfig.withdrawalFeeRate ?? 0.006)
  if (config.withdrawalFeeRatePercent > 0) {
    lastPositiveFeePercent.value = config.withdrawalFeeRatePercent
  }
  config.neighborDailyContactLimit = apiConfig.neighborDailyContactLimit ?? 3
  loadManagementSplitFromCascade()
}

function percentToRate(percent: number) {
  return percent / 100
}

function toNonNegativeNumber(value: unknown, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

function mapFormToConfig(): PropertyCompanyConfig {
  syncCascadeFromManagementSplit()
  const payload: PropertyCompanyConfig = {
    coinDisplayEnabled: config.coinDisplayEnabled,
    coinIssueMode: config.coinIssueMode,
    coinExpiryDays: Math.round(Number(config.coinExpiryDays)),
    coinFreezeDefault: config.coinFreezeDefault,
    // 平台管理员无 mall-rules 写权限，统一经物业配置落库；物业管理员也会同步写一份兜底
    coinMallEnabled: config.coinMallEnabled,
    coinMallMaxRatio: percentToRate(config.coinMallMaxRatioPercent),
    coinMallMinAmount: toNonNegativeNumber(config.coinMallMinAmount),
    deliveryBaseFee: toNonNegativeNumber(config.deliveryBaseFee),
    deliveryPerKgFee: toNonNegativeNumber(config.deliveryPerKgFee),
    pointToFeeRate: percentToRate(config.pointToFeeRatePercent),
    twoYearClearEnabled: config.twoYearClearEnabled,
    neighborDailyContactLimit: Math.round(Number(config.neighborDailyContactLimit)),
    pointExchangeRate: toNonNegativeNumber(config.pointExchangeRate, 100)
  }
  // 分成比例 + 手续费比例：仅平台管理员可写，避免物业保存时覆盖
  if (canEditPlatformFinance.value) {
    payload.withdrawalFeeRate = percentToRate(config.withdrawalFeeRatePercent)
    payload.propertyShareRate = percentToRate(config.propertySharePercent)
    payload.coordinatorShareRate = percentToRate(config.coordinatorSharePercent)
    payload.sectorLeaderRate = percentToRate(config.sectorLeaderPercent)
    payload.individualLeaderRate = percentToRate(config.individualLeaderPercent)
    payload.regionalLeaderRate = percentToRate(config.regionalLeaderPercent)
    payload.projectLeaderRate = percentToRate(config.projectLeaderPercent)
  }
  return payload
}

function applyMallRules(rules: {
  coinMallEnabled?: boolean
  coinMallMaxRatio?: number
  coinMallMinAmount?: number
}) {
  if (rules.coinMallEnabled !== undefined) config.coinMallEnabled = rules.coinMallEnabled
  if (rules.coinMallMaxRatio !== undefined) {
    config.coinMallMaxRatioPercent = rateToFormPercent(rules.coinMallMaxRatio)
  }
  if (rules.coinMallMinAmount !== undefined) {
    config.coinMallMinAmount = rules.coinMallMinAmount
  }
}

function applyPointShareFromDetail(detail: PropertyCompanyDetail) {
  const next = {
    residentPercent: rateToFormPercent(detail.residentPointShareRate ?? 0),
    merchantPercent: rateToFormPercent(detail.merchantPointShareRate ?? 0),
    coinPercent: rateToFormPercent(detail.coinPointShareRate ?? 0),
    sharedPercent: rateToFormPercent(detail.sharedPointShareRate ?? 0)
  }
  Object.assign(pointShare, next)
  Object.assign(pointShareSaved, next)
}

function mapPointShareToPayload() {
  return {
    residentPointShareRate: percentToRate(Number(pointShare.residentPercent) || 0),
    merchantPointShareRate: percentToRate(Number(pointShare.merchantPercent) || 0),
    coinPointShareRate: percentToRate(Number(pointShare.coinPercent) || 0),
    sharedPointShareRate: percentToRate(Number(pointShare.sharedPercent) || 0)
  }
}

function mapSavedPointShareToPayload() {
  return {
    residentPointShareRate: percentToRate(Number(pointShareSaved.residentPercent) || 0),
    merchantPointShareRate: percentToRate(Number(pointShareSaved.merchantPercent) || 0),
    coinPointShareRate: percentToRate(Number(pointShareSaved.coinPercent) || 0),
    sharedPointShareRate: percentToRate(Number(pointShareSaved.sharedPercent) || 0)
  }
}

function resetPointShareForm() {
  Object.assign(pointShare, { ...pointShareSaved })
}

async function submitPointShareApproval(propertyCompanyId: string) {
  const oldValue = JSON.stringify(mapSavedPointShareToPayload())
  const newValue = JSON.stringify(mapPointShareToPayload())
  await priceApprovalApi.create({
    // 平台管理员提交必须带物业公司；领导由后端取绑定公司
    ...(isPlatformAdmin.value ? { propertyCompanyId } : {}),
    itemType: PRICE_APPROVAL_ITEM_TYPE.RESIDENT_SHARE_RATE,
    itemId: propertyCompanyId,
    oldValue,
    newValue,
    reason: '参数配置：调整积分分成比例（业主/商家/物业币/共享）'
  })
  // 未生效前表单回退到当前已生效值，避免误以为已保存
  resetPointShareForm()
}

function applyDetail(raw: Partial<PropertyCompanyDetail & PropertyCompanyConfig>, fallbackId?: string) {
  const detail = normalizePropertyCompanyDetail(raw, fallbackId || companyId.value || '')
  Object.assign(companyDetail, {
    id: detail.id,
    name: detail.name,
    logoUrl: detail.logoUrl,
    contactPhone: detail.contactPhone,
    address: detail.address,
    status: detail.status,
    communityCount: detail.communityCount,
    communities: detail.communities || [],
    admins: detail.admins || [],
    residentPointShareRate: detail.residentPointShareRate,
    merchantPointShareRate: detail.merchantPointShareRate,
    coinPointShareRate: detail.coinPointShareRate,
    sharedPointShareRate: detail.sharedPointShareRate,
    regionalLeaderRate: detail.regionalLeaderRate,
    projectLeaderRate: detail.projectLeaderRate
  })
  mapConfigToForm({
    ...(detail.config || {}),
    regionalLeaderRate: detail.config?.regionalLeaderRate ?? detail.regionalLeaderRate,
    projectLeaderRate: detail.config?.projectLeaderRate ?? detail.projectLeaderRate
  })
  applyPointShareFromDetail(detail)
}

async function loadPlatformShareReadonlyValues(propertyCompanyId: string) {
  try {
    const rates = await platformShareApi.getRates(propertyCompanyId)
    config.platformSharePercent = rateToFormPercent(rates.platformShareRate ?? 0)
    config.platformDeliverySharePercent = rateToFormPercent(rates.platformDeliveryShareRate ?? 0)
    config.platformWithdrawalFeeSharePercent = rateToFormPercent(rates.platformWithdrawalFeeShareRate ?? 0)
  } catch {
    // 分成只读值请求失败时，保留 propertyCompany.config 的兜底值
  }
}

async function mergeConfigEcho(id: string) {
  try {
    const raw = await configApi.getConfig(id)
    const echoed = extractPropertyCompanyConfig(
      raw as Partial<PropertyCompanyDetail & PropertyCompanyConfig>
    )
    // 详情接口有时不带新字段；优先用 /config 回显覆盖
    if (echoed.deliveryPerKgFee !== undefined || echoed.perKgFee !== undefined) {
      config.deliveryPerKgFee = Number(echoed.deliveryPerKgFee ?? echoed.perKgFee ?? 0)
    }
    if (echoed.pointExchangeRate !== undefined) {
      config.pointExchangeRate = Number(echoed.pointExchangeRate)
    }
    if (echoed.deliveryBaseFee !== undefined) {
      config.deliveryBaseFee = Number(echoed.deliveryBaseFee)
    }
    if (echoed.regionalLeaderRate !== undefined) {
      config.regionalLeaderPercent = rateToFormPercent(echoed.regionalLeaderRate)
    }
    if (echoed.projectLeaderRate !== undefined) {
      config.projectLeaderPercent = rateToFormPercent(echoed.projectLeaderRate)
    }
    if (echoed.propertyShareRate !== undefined) {
      config.propertySharePercent = rateToFormPercent(echoed.propertyShareRate)
    }
    if (echoed.coordinatorShareRate !== undefined) {
      config.coordinatorSharePercent = rateToFormPercent(echoed.coordinatorShareRate)
    }
    if (echoed.sectorLeaderRate !== undefined) {
      config.sectorLeaderPercent = rateToFormPercent(echoed.sectorLeaderRate)
    }
    if (echoed.individualLeaderRate !== undefined) {
      config.individualLeaderPercent = rateToFormPercent(echoed.individualLeaderRate)
    }
    loadManagementSplitFromCascade()
  } catch {
    // GET /config 不可用时保留详情里的 config
  }
}

async function loadDetail(options?: { silent?: boolean }) {
  const id = companyId.value
  if (!id) {
    loadError.value = isPlatformAdmin.value
      ? '请先选择物业公司'
      : '未获取到物业公司，请重新登录'
    return
  }
  if (!options?.silent) loading.value = true
  loadError.value = ''
  try {
    const detail = await configApi.propertyCompany(id)
    applyDetail(detail, id)
    await mergeConfigEcho(id)
    try {
      const mallRules = await propertyCoinMallApi.getRules(id)
      applyMallRules(mallRules)
    } catch {
      // 专用接口不可用时保留物业公司配置中的 coinMall 字段
    }
    await loadPlatformShareReadonlyValues(id)
    await Promise.all([loadCoinUseCondition(), loadWithdrawSettings()])
  } catch (e) {
    loadError.value = e instanceof ApiError ? e.message : '配置加载失败'
  } finally {
    if (!options?.silent) loading.value = false
  }
}

async function loadCoinUseCondition() {
  try {
    const res = await coinUseConditionApi.get()
    coinUseForm.condition = res.condition || COIN_USE_CONDITION.NONE
    coinUseForm.pointThreshold = res.pointThreshold ?? 0
  } catch {
    // 接口不可用时保持默认
  }
}

async function saveCoinUseCondition() {
  const id = companyId.value
  if (!id || coinUseSaving.value) return
  coinUseSaving.value = true
  coinUseError.value = ''
  coinUseSuccess.value = ''
  try {
    await coinUseConditionApi.set(id, {
      condition: coinUseForm.condition,
      pointThreshold:
        coinUseForm.condition === COIN_USE_CONDITION.POINT_THRESHOLD
          ? Number(coinUseForm.pointThreshold) || 0
          : undefined
    })
    coinUseSuccess.value = '使用条件已保存'
  } catch (e) {
    coinUseError.value = e instanceof ApiError ? e.message : '保存使用条件失败'
  } finally {
    coinUseSaving.value = false
  }
}

async function loadWithdrawSettings() {
  try {
    const res = await coinWithdrawalAdminApi.getSettings()
    withdrawSettings.autoEnabled = res.autoEnabled ?? false
    withdrawSettings.periodDays = res.periodDays ?? 7
    withdrawSettings.feeRate = res.feeRate
  } catch {
    // 接口不可用时保持默认
  }
}

async function saveWithdrawSettings() {
  if (withdrawSaving.value || !canEditPlatformFinance.value) return
  withdrawSaving.value = true
  withdrawError.value = ''
  withdrawSuccess.value = ''
  try {
    const res = await coinWithdrawalAdminApi.updateSettings({
      autoEnabled: withdrawSettings.autoEnabled,
      periodDays: Number(withdrawSettings.periodDays) || 7
    })
    withdrawSettings.autoEnabled = res.autoEnabled ?? withdrawSettings.autoEnabled
    withdrawSettings.periodDays = res.periodDays ?? withdrawSettings.periodDays
    withdrawSettings.feeRate = res.feeRate ?? withdrawSettings.feeRate
    withdrawSuccess.value = '提现设置已保存（手续费比例请一并点「保存全局设置」落库）'
  } catch (e) {
    withdrawError.value = e instanceof ApiError ? e.message : '保存提现设置失败'
  } finally {
    withdrawSaving.value = false
  }
}

async function handleSave() {
  const id = companyId.value
  if (!id || saving.value || pointShareSaveBlocked.value) return
  saving.value = true
  saveError.value = ''
  saveSuccess.value = ''
  const expectedExchange = toNonNegativeNumber(config.pointExchangeRate, 100)
  const expectedPerKg = toNonNegativeNumber(config.deliveryPerKgFee)
  const shareMessages: string[] = []
  try {
    // v5.3：平台管理员直接修改；物业管理员提交价格审批。
    // 两种方式都先于其他配置保存，避免旧比例非 100% 时阻断整个请求。
    if (pointShareDirty.value) {
      try {
        if (isPlatformAdmin.value) {
          await propertyCompanyApi.update(id, mapPointShareToPayload())
          Object.assign(pointShareSaved, { ...pointShare })
          shareMessages.push('积分分成比例已直接生效')
        } else {
          await submitPointShareApproval(id)
          shareMessages.push('积分分成比例已提交价格审批，待领导通过后生效')
        }
      } catch (e) {
        const actionLabel = isPlatformAdmin.value ? '积分分成修改' : '积分分成审批提交'
        saveError.value =
          e instanceof ApiError && e.errorCode === API_ERROR_CODE.INVALID_SHARE_RATE_TOTAL
            ? `${actionLabel}失败：业主、商家、物业币和共享四项合计必须为 100%`
            : e instanceof ApiError
              ? `${actionLabel}失败：${e.message}`
              : `${actionLabel}失败`
        return
      }
    }

    // PUT /admin/property-coin/mall-rules 仅 property_admin；平台管理员走物业配置接口
    if (isPropertyAdmin.value) {
      try {
        await propertyCoinMallApi.updateRules({
          propertyCompanyId: id,
          coinMallEnabled: config.coinMallEnabled,
          coinMallMaxRatio: percentToRate(config.coinMallMaxRatioPercent),
          coinMallMinAmount: toNonNegativeNumber(config.coinMallMinAmount)
        })
      } catch (e) {
        // 专用接口失败时仍用 config 兜底，避免整页保存中断
        console.warn('mall-rules update failed, fallback to company config', e)
      }
    }
    await configApi.updateConfig(id, mapFormToConfig())
    // 再单独 PATCH 积分兑换与按重量加价，确保回显契约字段落库
    try {
      await configApi.updateConfig(id, {
        pointExchangeRate: expectedExchange,
        deliveryPerKgFee: expectedPerKg
      })
    } catch (e) {
      console.warn('focused exchange/perKg patch failed', e)
    }
    // 积分分成比例改走价格审批，禁止在此直接 PUT 分成字段
    // 兑换比例 / 按重量加价仍可写物业公司（不含分成）
    try {
      await propertyCompanyApi.update(id, {
        pointExchangeRate: expectedExchange,
        deliveryPerKgFee: expectedPerKg
      })
    } catch (e) {
      console.warn('property-company exchange/perKg update failed', e)
    }
    if (isPlatformAdmin.value) {
      auth.setPropertyCompanyId(id)
    }
    await loadDetail({ silent: true })
    const exchangeMismatch = Math.abs(Number(config.pointExchangeRate) - expectedExchange) > 0.0001
    const perKgMismatch = Math.abs(Number(config.deliveryPerKgFee) - expectedPerKg) > 0.0001
    if (exchangeMismatch || perKgMismatch) {
      saveError.value =
        '保存请求已发出，但部分字段回显未更新。请确认测试服已部署 v3.9；可在网络面板查看 PATCH .../config 与 PUT .../property-companies。'
      saveSuccess.value = shareMessages.join('；')
    } else {
      saveSuccess.value = shareMessages.length
        ? `配置已保存。${shareMessages.join('；')}`
        : '配置已保存'
    }
  } catch (e) {
    if (shareMessages.length) {
      saveSuccess.value = shareMessages.join('；')
      saveError.value = e instanceof ApiError
        ? `积分分成调整已完成，但其他配置保存失败：${e.message}`
        : '积分分成调整已完成，但其他配置暂未保存，请重试'
    } else {
      saveError.value = e instanceof ApiError ? e.message : '保存失败，请稍后重试'
    }
  } finally {
    saving.value = false
  }
}

async function loadPropertyCompanies() {
  if (!isPlatformAdmin.value) return
  try {
    const res = await propertyCompanyApi.list({ page: 1, pageSize: 100 }, true)
    propertyCompanies.value = res.list || []
    if (!selectedPropertyId.value) {
      selectedPropertyId.value =
        auth.propertyCompanyId ||
        auth.profile?.propertyCompanyId ||
        propertyCompanies.value[0]?.id ||
        ''
    }
  } catch {
    propertyCompanies.value = []
  }
}

onMounted(async () => {
  selectedPropertyId.value = auth.propertyCompanyId || auth.profile?.propertyCompanyId || ''
  await loadPropertyCompanies()
  await loadDetail()
})
</script>

<style scoped>
.page { max-width: 1080px; }
.header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; gap: 16px; }
.title { font-size: 24px; font-weight: 600; color: #1f1f2e; margin-bottom: 8px; }
.desc { font-size: 14px; color: #8c8c9a; line-height: 1.55; max-width: 640px; }
.btnSave { padding: 10px 20px; border-radius: 8px; background: #5c5c9e; color: #ffffff; font-size: 14px; transition: background 0.2s; cursor: pointer; border: none; }
.btnSave.compact { margin-top: 4px; }
.btnSave:hover:not(:disabled) { background: #52529a; }
.btnSave:disabled { opacity: 0.6; cursor: not-allowed; }
.error { font-size: 13px; color: #e05c5c; margin: 8px 0; }
.success { font-size: 13px; color: #3aaf7d; margin: 8px 0; }
.selectInput { width: 100%; height: 40px; border: 1px solid #e8e8ec; border-radius: 8px; padding: 0 12px; background: #ffffff; font-size: 14px; color: #1f1f2e; }
.bannerError { font-size: 13px; color: #e05c5c; margin-bottom: 12px; }
.bannerSuccess { font-size: 13px; color: #3aaf7d; margin-bottom: 12px; }
.propertySelect { margin-bottom: 20px; max-width: 420px; }
.propertySelect .label { display: block; font-size: 14px; color: #5c5c66; margin-bottom: 8px; }
.propertySelect .input { width: 100%; height: 40px; border: 1px solid #e8e8ec; border-radius: 8px; padding: 0 12px; }
.loadingText { text-align: center; color: #8c8c9a; padding: 48px 0; }

.section { margin-bottom: 28px; }
.sectionHead { margin-bottom: 12px; }
.sectionTitle { margin: 0 0 4px; font-size: 15px; font-weight: 600; color: #1f1f2e; letter-spacing: 0.02em; }
.sectionDesc { margin: 0; font-size: 13px; color: #8c8c9a; line-height: 1.55; max-width: 720px; }
.stack { display: flex; flex-direction: column; gap: 16px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.metaGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }

.card { background: #ffffff; border-radius: 12px; padding: 22px 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.cardWide { width: 100%; }
.card .header { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; font-size: 16px; font-weight: 500; color: #1f1f2e; }
.headerText { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.headerSub { font-size: 12px; font-weight: 400; color: #8c8c9a; line-height: 1.4; }
.card .icon { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #ffffff; flex-shrink: 0; }
.card .icon svg { width: 20px; height: 20px; }
.card .icon.purple { background: #5c5c9e; }
.card .icon.green { background: #3aaf7d; }
.card .icon.orange { background: #f5a623; }
.card .icon.pink { background: #e05c5c; }
.card .field { margin-bottom: 16px; }
.card .field:last-child { margin-bottom: 0; }
.card .label { display: block; font-size: 13px; color: #5c5c66; margin-bottom: 8px; }
.card .inline { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.card .inputWrap { display: flex; align-items: center; border: 1px solid #e8e8ec; border-radius: 8px; padding: 0 12px; background: #ffffff; height: 40px; min-width: 140px; }
.card .input { flex: 1; border: none; background: transparent; font-size: 14px; color: #1f1f2e; outline: none; min-width: 60px; }
.card .select { width: 100%; height: 40px; border: 1px solid #e8e8ec; border-radius: 8px; padding: 0 12px; font-size: 14px; color: #1f1f2e; background: #ffffff; outline: none; }
.card .select:focus { border-color: #5c5c9e; }
.card .unit { font-size: 13px; color: #8c8c9a; margin-left: 8px; white-space: nowrap; }
.card .inputWrap.prefix { padding-left: 0; }
.card .prefixText { padding: 0 12px; color: #8c8c9a; font-size: 14px; height: 100%; display: flex; align-items: center; }
.card .hint { font-size: 13px; color: #8c8c9a; }
.card .note { font-size: 12px; color: #8c8c9a; margin-top: 4px; line-height: 1.45; }
.inlineLink { color: #5c5c9e; margin: 0 2px; text-decoration: none; }
.inlineLink:hover { text-decoration: underline; }
.card .checkbox { display: flex; align-items: center; gap: 10px; cursor: pointer; font-size: 14px; font-weight: 500; color: #1f1f2e; }
.card .checkbox input { position: absolute; opacity: 0; width: 0; height: 0; }
.card .checkmark { width: 18px; height: 18px; border-radius: 4px; border: 2px solid #d0d0d8; display: flex; align-items: center; justify-content: center; color: #ffffff; flex-shrink: 0; transition: all 0.2s; }
.card .checkbox input:checked + .checkmark { background: #5c5c9e; border-color: #5c5c9e; }
.card .checkmark svg { width: 14px; height: 14px; }
.card .switchRow { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.card .switch { width: 44px; height: 24px; border-radius: 12px; background: #e8e8ec; position: relative; cursor: pointer; transition: background 0.2s; border: none; flex-shrink: 0; }
.card .switch.active { background: #5c5c9e; }
.card .switch:disabled { opacity: 0.55; cursor: not-allowed; }
.card .thumb { position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; border-radius: 50%; background: #ffffff; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.card .switch.active .thumb { transform: translateX(20px); }
.card .shareGrid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 16px; margin-bottom: 12px; }
.card .shareGrid.three { grid-template-columns: repeat(3, 1fr); }
.card .shareGrid .field { margin-bottom: 0; }

.tierBlock { margin-bottom: 18px; }
.tierBlock.cascade {
  padding: 14px 14px 4px;
  background: #f7f8fc;
  border-radius: 10px;
  border: 1px solid #eef0f5;
}
.tierLabel {
  margin: 0 0 10px;
  font-size: 12px;
  font-weight: 600;
  color: #8c8c9a;
  letter-spacing: 0.04em;
  text-transform: none;
}
.tierLabelRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;
}
.tierLabelRow .tierLabel { margin-bottom: 0; }
.tierHint {
  margin: 0 0 12px;
  font-size: 12px;
  color: #8c8c9a;
  line-height: 1.45;
}
.linkBtn {
  border: none;
  background: transparent;
  color: #5c5c9e;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  white-space: nowrap;
}
.linkBtn:hover { color: #45458a; }
.poolBar {
  display: flex;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  background: #e8e8ec;
  margin: 4px 0 8px;
}
.poolSeg { display: block; height: 100%; min-width: 0; }
.poolSeg.our { background: #5c5c9e; }
.poolSeg.property { background: #3aaf7d; }
.poolSeg.management { background: #f5a623; }
.poolSeg.sector { background: #ef4444; }
.poolSeg.individual { background: #ec4899; }
.poolSum { margin: 0; font-size: 12px; color: #8c8c9a; }
.poolSum.warn { color: #c47d1a; }
.poolSumOk { color: #8c8c9a; }

.fold {
  margin-top: 12px;
  border-top: 1px dashed #e8e8ec;
  padding-top: 10px;
}
.fold summary {
  cursor: pointer;
  font-size: 13px;
  color: #5c5c66;
  user-select: none;
  list-style: none;
}
.fold summary::-webkit-details-marker { display: none; }
.fold summary::before {
  content: '▸';
  display: inline-block;
  margin-right: 6px;
  color: #8c8c9a;
  transition: transform 0.15s;
}
.fold[open] summary::before { transform: rotate(90deg); }
.foldBody { margin-top: 12px; }
.legacyGrid { grid-template-columns: repeat(3, 1fr); }
.cardFoot { margin: 8px 0 0; font-size: 12px; color: #8c8c9a; line-height: 1.5; }
.subDivider { height: 1px; background: #f0f0f3; margin: 4px 0 16px; }

.card .bar { height: 8px; border-radius: 4px; background: #e8e8ec; margin-bottom: 10px; overflow: hidden; }
.card .fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, #5c5c9e 0%, #3aaf7d 100%); }
.card .barDanger { background: #fde8e8; }
.card .fillDanger { background: #e05c5c !important; }
.shareTotal { margin: 0; font-size: 13px; color: #8c8c9a; }
.shareTotal.error { color: #e05c5c; }
.input.inputError { border-color: #e05c5c; background: #fff7f7; }
.sharePendingHint { margin: 8px 0 0; font-size: 12px; color: #d48806; line-height: 1.5; }
.shareActions { margin-top: 12px; }
.btnSecondary {
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid #e8e8ec;
  background: #fff;
  font-size: 13px;
  color: #5c5c66;
  cursor: pointer;
}
.btnSecondary:disabled { opacity: 0.5; cursor: not-allowed; }
.fieldHint { margin: 6px 0 0; font-size: 12px; color: #8c8c9a; line-height: 1.4; }
.card .input:disabled { background: #f5f5f7; color: #8c8c9a; cursor: not-allowed; }
.field .input:disabled { background: #f5f5f7; color: #8c8c9a; cursor: not-allowed; }

.metaCard .header { margin-bottom: 12px; font-size: 15px; }
.metaList { list-style: none; margin: 0; padding: 0; max-height: 200px; overflow-y: auto; }
.metaList li { padding: 8px 0; border-bottom: 1px solid #f0f0f3; font-size: 14px; color: #1f1f2e; }
.metaList li:last-child { border-bottom: none; }
.metaSub { color: #8c8c9a; font-size: 13px; }

@media (max-width: 900px) {
  .header { flex-direction: column; }
  .grid, .metaGrid { grid-template-columns: 1fr; }
  .card .shareGrid,
  .card .shareGrid.three,
  .legacyGrid { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .mobilePage { padding-bottom: 76px; }
  .mobilePageInShell { padding-bottom: calc(140px + env(safe-area-inset-bottom)); }
  .page > .header { margin-bottom: 16px; }
  .title { font-size: 22px; }
  .section { margin-bottom: 22px; }
  .grid, .metaGrid, .stack { gap: 12px; }
  .card { border-radius: 10px; padding: 16px; }
  .card .header { margin-bottom: 16px; }
  .card .inline { align-items: stretch; }
  .card .inputWrap { min-width: 0; width: 100%; }
  .metaList { max-height: 160px; }
  .mobileSaveBar {
    position: fixed;
    z-index: 10;
    right: 0;
    bottom: 0;
    left: 0;
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
    background: rgba(255, 255, 255, 0.96);
    border-top: 1px solid #f0f0f3;
    box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.06);
  }
  .mobileSaveBar .btnSave { width: 100%; min-height: 44px; }
  .mobileSaveBarInShell {
    z-index: 45;
    bottom: calc(64px + env(safe-area-inset-bottom));
  }
}
</style>
