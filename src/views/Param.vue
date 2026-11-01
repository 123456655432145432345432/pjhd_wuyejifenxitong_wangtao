<template>
  <div class="page" :class="{ mobilePage: isMobile, mobilePageInShell: inMobileShell }">
    <div class="header">
      <div>
        <h1 class="title">参数配置</h1>
        <p class="desc">
          {{ companyDetail.name ? `${companyDetail.name} · ` : '' }}单物业业务规则（分成、积分、物业币、提现等）。
          <template v-if="isPlatformAdmin">
            当前为<strong>平台管理员</strong>：可切换物业，分成比例、配送费抽成、提现手续费仅本角色可写。
          </template>
          <template v-else>
            当前为<strong>物业领导</strong>：仅可修改本物业的运营参数（积分/物业币开关、抵扣规则、提现设置）；
            分成比例与提现手续费为平台专属，页面置灰。
          </template>
          全平台默认归属/提现粒度见侧栏「平台配置」。
        </p>
      </div>
      <button
        v-if="!isMobile"
        class="btnSave"
        :disabled="loading || saving || !companyId"
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
            与物业、统筹的分成在此设置：商品价进平台盘（我们公司 / 物业 / 管理盘）；管理盘内再按统筹 : 板块 : 个体拆分。
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
                <span v-if="poolTierWarn">（须约 100%）</span>
              </p>
              <p class="tierHint">
                规则：我们公司 + 物业 + 管理盘 = 100%。落库为三档绝对值，不做「剩余盘权重」换算。
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
              <p class="tierHint">
                默认统筹 40% · 板块 30% · 个体 30%（合计 100%）。落库为级联：板块抽管理盘、个体抽板块（默认 60% / 50%），各自落在 [0,1]，勿相加校验。
              </p>
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

            <div class="shareGrid">
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
            </div>

            <div class="shareGrid">
              <div class="field">
                <label class="label">利润测算参考值</label>
                <div class="inputWrap prefix">
                  <span class="prefixText">¥</span>
                  <input
                    v-model.number="config.deliveryBaseFee"
                    type="number"
                    min="0"
                    step="0.01"
                    class="input"
                  />
                  <span class="unit">/ 单</span>
                </div>
                <p class="fieldHint">
                  仅用于平台商家「利润测算」参考，<strong>不影响住户下单配送费</strong>
                  （住户配送费按商家 `deliveryFee` 计）。字段名 `deliveryBaseFee`。
                </p>
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
          <p class="sectionDesc">抵扣规则、清零策略。积分分成与兑换比例已按后端最终口径下架（无业务消费方）。</p>
        </div>
        <div class="grid single">
          <div class="card">
            <div class="header">
              <div class="icon purple"><IconSvg name="points" /></div>
              <span>积分规则</span>
            </div>
            <div class="field">
              <div class="switchRow">
                <div>
                  <div class="label">启用积分功能</div>
                  <p class="note">关闭后住户端隐藏积分、建设积分、资料奖励及支付抵扣，商家端停用购分和赠分。</p>
                </div>
                <button
                  type="button"
                  class="switch"
                  :class="{ active: config.pointEnabled }"
                  @click="config.pointEnabled = !config.pointEnabled"
                >
                  <span class="thumb" />
                </button>
              </div>
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
              <label class="label">归属模式（平台级）</label>
              <p class="fieldHint">
                积分归属与奖励金归属是<strong>平台级</strong>参数（`GET/PUT /admin/platform-config`），
                不按物业公司单独设置。原先放在本页会写进物业配置接口，而后端
                `UpdatePropertyCompanyRequest` 里没有这两个字段，属于「改了不落库」，故移除。
                <template v-if="isPlatformAdmin">
                  请到
                  <RouterLink class="inlineLink" :to="{ name: 'platform-config' }">平台配置</RouterLink>
                  修改。
                </template>
                <template v-else>该项仅平台管理员可改。</template>
              </p>
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

        </div>
      </section>

      <!-- ③ 物业币 -->
      <section class="section">
        <div class="sectionHead">
          <h2 class="sectionTitle">物业币</h2>
          <p class="sectionDesc">有效期、展示开关、商城抵扣与使用门槛。发放模式与「新用户默认冻结」已按后端口径下架（无业务消费方）。</p>
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
            </div>
            <div class="field">
              <div class="switchRow">
                <div>
                  <div class="label">启用物业币功能</div>
                  <p class="note">关闭后隐藏余额、明细、充值及支付抵扣，不再仅对余额打码。</p>
                </div>
                <button
                  type="button"
                  class="switch"
                  :class="{ active: config.coinEnabled }"
                  @click="config.coinEnabled = !config.coinEnabled"
                >
                  <span class="thumb" />
                </button>
              </div>
            </div>
            <div v-if="canEditCoinDisplay" class="field">
              <div class="switchRow">
                <div>
                  <div class="label">向住户显示物业币入口</div>
                  <p class="note">
                    关闭后住户端隐藏物业币入口（余额、明细、商城抵扣一并不可见）。
                    本开关独立生效，点击即刻保存，不随「保存全局设置」提交。
                  </p>
                  <p v-if="coinDisplayMsg" class="note">{{ coinDisplayMsg }}</p>
                </div>
                <button
                  type="button"
                  class="switch"
                  :class="{ active: coinDisplayEnabled }"
                  :disabled="coinDisplaySaving"
                  @click="toggleCoinDisplay"
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
                  <p v-if="!canEditMallRules" class="note">
                    商城抵扣规则由物业领导在本小区设置；平台账号只读（后端
                    `PUT /admin/property-coin/mall-rules` 仅 `property_admin`）。
                  </p>
                </div>
                <button
                  type="button"
                  class="switch"
                  :class="{ active: config.coinMallEnabled }"
                  :disabled="!canEditMallRules"
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
                    :disabled="!canEditMallRules"
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
                    :disabled="!canEditMallRules"
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

      <!-- ③a 订单核实与冻结（v6.5：核实入口由商品分类=团购决定） -->
      <section class="section">
        <div class="sectionHead">
          <h2 class="sectionTitle">订单核实与冻结</h2>
          <p class="sectionDesc">
            仅整单商品分类均为「团购」时，支付后进入商家核实；通过或超时未核实均视为通过并进入冻结期，期满自动分账。其余订单仍走配送选择。退款窗口不能超过冻结期。
          </p>
        </div>
        <div class="grid">
          <div class="card cardWide">
            <div class="header">
              <div class="icon pink"><IconSvg name="wallet" /></div>
              <span>核实 / 冻结 / 退款窗口</span>
            </div>
            <div class="shareGrid three">
              <div class="field">
                <label class="label">核实时限</label>
                <div class="inputWrap">
                  <input
                    v-model.number="orderConfig.merchantVerificationHours"
                    type="number"
                    min="1"
                    max="168"
                    step="1"
                    class="input"
                    :disabled="!canEditPlatformFinance"
                  />
                  <span class="unit">小时</span>
                </div>
              </div>
              <div class="field">
                <label class="label">冻结期</label>
                <div class="inputWrap">
                  <input
                    v-model.number="orderConfig.freezeDays"
                    type="number"
                    min="1"
                    max="30"
                    step="1"
                    class="input"
                    :disabled="!canEditPlatformFinance"
                  />
                  <span class="unit">天</span>
                </div>
              </div>
              <div class="field">
                <label class="label">退款窗口</label>
                <div class="inputWrap">
                  <input
                    v-model.number="orderConfig.refundWindowDays"
                    type="number"
                    min="1"
                    max="30"
                    step="1"
                    class="input"
                    :disabled="!canEditPlatformFinance"
                  />
                  <span class="unit">天</span>
                </div>
              </div>
            </div>
            <p class="fieldHint">核实时限只作用于纯团购单；时限内商家未操作则系统自动通过。混装或非团购商品不进核实。冻结期满后不可再申请退货。退款窗口天数不能超过冻结期。</p>
            <p v-if="orderConfigError" class="error">{{ orderConfigError }}</p>
            <p v-if="orderConfigSuccess" class="success">{{ orderConfigSuccess }}</p>
            <p v-if="!canEditPlatformFinance" class="fieldHint">
              订单配置为平台级参数，可查看，仅平台管理员（platform_admin）可以修改。
            </p>
            <button
              type="button"
              class="btnSave compact"
              :disabled="orderConfigSaving || !companyId || !canEditPlatformFinance"
              @click="saveOrderConfig"
            >
              {{ orderConfigSaving ? '保存中...' : '保存订单配置' }}
            </button>
          </div>
        </div>
      </section>

      <!-- ④ 提现与其它 -->
      <section class="section">
        <div class="sectionHead">
          <h2 class="sectionTitle">提现与其它</h2>
          <p class="sectionDesc">
            提现手续费与费率<strong>仅平台管理员</strong>可改（后端 §1.2）；自动提现开关与周期物业领导可改（仅本物业）。
            <template v-if="!canEditPlatformFinance">当前账号：手续费只读，自动提现可编辑。</template>
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
                  <p class="note">物业领导可改本物业设置（后端 §80 按 propertyCompanyId 区分）</p>
                </div>
                <button
                  type="button"
                  class="switch"
                  :class="{ active: withdrawSettings.autoEnabled }"
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
                />
                <span class="unit">天</span>
              </div>
            </div>
            <p v-if="withdrawError" class="error">{{ withdrawError }}</p>
            <p v-if="withdrawSuccess" class="success">{{ withdrawSuccess }}</p>
            <button
              type="button"
              class="btnSave compact"
              :disabled="withdrawSaving || !companyId"
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
        :disabled="loading || saving || !companyId"
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
import { adminOrderConfigApi, configApi, propertyCoinMallApi, propertyCompanyApi, coinUseConditionApi, coinWithdrawalAdminApi, platformShareApi } from '../api/services'
import {
  normalizePropertyCompanyDetail,
  rateToFormPercent
} from '../api/mappers'
import { ApiError } from '../api/request'
import { useAuthStore } from '../stores/auth'
import type { PropertyCompanyConfig, PropertyCompanyDetail, PropertyCompanyItem } from '../api/types'
import { COIN_USE_CONDITION, COIN_USE_CONDITION_OPTIONS, USER_ROLE } from '../constants/enums'
import { useInMobileShell } from '../composables/useInMobileShell'

const auth = useAuthStore()
const { isMobile, inMobileShell } = useInMobileShell()
const isPlatformAdmin = computed(() => auth.profile?.role === USER_ROLE.PLATFORM_ADMIN)
const isPropertyAdmin = computed(() => auth.profile?.role === USER_ROLE.PROPERTY_ADMIN)
/** 各角色分成比例、手续费开关、手续费比例：仅平台管理员可写（后端 §1.2 确认） */
const canEditPlatformFinance = computed(() => isPlatformAdmin.value)
/**
 * 商城抵扣规则：后端 §1.4 确认 `PUT /admin/property-coin/mall-rules`
 * 仍只允许 property_admin（物业领导），平台账号调用必然 403，故平台侧只读。
 */
const canEditMallRules = computed(() => isPropertyAdmin.value && !isPlatformAdmin.value)

const propertyCompanies = ref<PropertyCompanyItem[]>([])
const selectedPropertyId = ref('')

const loading = ref(true)
const saving = ref(false)
const loadError = ref('')
const saveError = ref('')
const saveSuccess = ref('')

const companyDetail = reactive<PropertyCompanyDetail>({ id: '' })

/**
 * v2（文档 §8）：物业币显示开关，权限码 coin:display_control。
 * 走 PUT /admin/property-companies/{id}/coin-display，独立保存，不并入「保存全局设置」。
 * 无该权限码时不渲染开关（与后端 403 口径一致），避免「看得到但点不动」。
 */
const canEditCoinDisplay = computed(() => auth.hasPermission('coin:display_control'))
const coinDisplayEnabled = ref(true)
const coinDisplaySaving = ref(false)
const coinDisplayMsg = ref('')

async function toggleCoinDisplay() {
  if (!companyId.value || coinDisplaySaving.value) return
  const next = !coinDisplayEnabled.value
  coinDisplaySaving.value = true
  coinDisplayMsg.value = ''
  try {
    await propertyCompanyApi.setCoinDisplay(companyId.value, next)
    coinDisplayEnabled.value = next
    coinDisplayMsg.value = next ? '已开启：住户端显示物业币入口' : '已关闭：住户端隐藏物业币入口'
  } catch (e) {
    coinDisplayMsg.value = e instanceof ApiError ? e.message : '切换失败，请稍后重试'
  } finally {
    coinDisplaySaving.value = false
  }
}
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

const orderConfig = reactive({
  merchantVerificationHours: 24,
  freezeDays: 7,
  refundWindowDays: 3
})
const orderConfigSaving = ref(false)
const orderConfigError = ref('')
const orderConfigSuccess = ref('')

const withdrawSettings = reactive({
  autoEnabled: false,
  periodDays: 7,
  feeRate: undefined as number | undefined
})
const withdrawSaving = ref(false)
const withdrawError = ref('')
const withdrawSuccess = ref('')

const config = reactive({
  pointToFeeRatePercent: 1,
  twoYearClearEnabled: false,
  pointEnabled: true,
  coinEnabled: true,
  coinExpiryDays: 365,
  coinMallEnabled: false,
  coinMallMaxRatioPercent: 50,
  coinMallMinAmount: 10,
  deliveryBaseFee: 0.5,
  propertySharePercent: 60,
  coordinatorSharePercent: 30,
  sectorLeaderPercent: 60,
  individualLeaderPercent: 50,
  platformSharePercent: 0,
  platformDeliverySharePercent: 0,
  platformWithdrawalFeeSharePercent: 0,
  withdrawalFeeRatePercent: 0.6,
  neighborDailyContactLimit: 3,
} as {
  pointToFeeRatePercent: number
  twoYearClearEnabled: boolean
  pointEnabled: boolean
  coinEnabled: boolean
  coinExpiryDays: number
  coinMallEnabled: boolean
  coinMallMaxRatioPercent: number
  coinMallMinAmount: number
  deliveryBaseFee: number
  propertySharePercent: number
  coordinatorSharePercent: number
  sectorLeaderPercent: number
  individualLeaderPercent: number
  platformSharePercent: number
  platformDeliverySharePercent: number
  platformWithdrawalFeeSharePercent: number
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
  /**
   * 后端 §1.1：详情返回 pointEnabled / coinEnabled，空值按 true。
   * 不再回退 pointDisplayEnabled / coinDisplayEnabled：
   * 后两者是独立的「是否对住户展示」开关（coinDisplayEnabled 有自己的接口），
   * 回退会让「展示关闭」被误判成「功能关闭」，是上一版就被后端点出的覆盖问题。
   */
  config.pointEnabled = apiConfig.pointEnabled ?? true
  config.coinEnabled = apiConfig.coinEnabled ?? true
  config.coinExpiryDays = apiConfig.coinExpiryDays ?? 365
  config.coinMallEnabled = apiConfig.coinMallEnabled ?? false
  config.coinMallMaxRatioPercent = rateToFormPercent(apiConfig.coinMallMaxRatio ?? 0.5)
  config.coinMallMinAmount = apiConfig.coinMallMinAmount ?? 10
  config.deliveryBaseFee = apiConfig.deliveryBaseFee ?? 0.5
  config.propertySharePercent = rateToFormPercent(apiConfig.propertyShareRate ?? 0.6)
  config.coordinatorSharePercent = rateToFormPercent(apiConfig.coordinatorShareRate ?? 0.3)
  config.sectorLeaderPercent = rateToFormPercent(apiConfig.sectorLeaderRate ?? 0.6)
  config.individualLeaderPercent = rateToFormPercent(apiConfig.individualLeaderRate ?? 0.5)
  config.platformSharePercent = rateToFormPercent(apiConfig.platformShareRate ?? 0)
  config.platformDeliverySharePercent = rateToFormPercent(apiConfig.platformDeliveryShareRate ?? 0)
  config.platformWithdrawalFeeSharePercent = rateToFormPercent(apiConfig.platformWithdrawalFeeShareRate ?? 0)
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

/**
 * 历史库若仍是「物业+统筹权重合计 100%」旧存法，按「我们公司」展开为三档绝对百分比便于编辑。
 * 已是三档绝对合计≈100% 时不改（v8.2 落库即为绝对值）。
 */
function expandPropertyCoordinatorForDisplay() {
  const platform = Math.max(0, Number(config.platformSharePercent) || 0)
  const prop = Math.max(0, Number(config.propertySharePercent) || 0)
  const coord = Math.max(0, Number(config.coordinatorSharePercent) || 0)
  const threeSum = platform + prop + coord
  if (Math.abs(threeSum - 100) <= 0.6) return
  const twoSum = prop + coord
  if (Math.abs(twoSum - 100) > 0.6) return
  const remain = Math.max(0, 100 - platform)
  config.propertySharePercent = roundPercent1((prop / 100) * remain)
  config.coordinatorSharePercent = roundPercent1((coord / 100) * remain)
}

function toNonNegativeNumber(value: unknown, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

/**
 * 参数保存载荷（v8.31 后端最终口径）。
 *
 * 只提交后端确认「能落库且已生效」的字段：
 * - pointEnabled / coinEnabled：P0 已补进 UpdatePropertyCompanyRequest，平台 + 物业领导（本物业）可写；
 * - coinExpiryDays / pointToFeeRate / twoYearClearEnabled / neighborDailyContactLimit / deliveryBaseFee。
 *
 * 已下架字段（后端 §1.4 明确不再接收、详情也不返回）一律不提交：
 * coinIssueMode、coinFreezeDefault、deliveryPerKgFee、pointExchangeRate、
 * pointsAttributionMode、rewardAttributionMode、regionalLeaderRate、projectLeaderRate、4 项积分分成。
 *
 * coinMall* 不在此处：商城抵扣规则走专用接口 `PUT /admin/property-coin/mall-rules`（仅物业领导）。
 * coinDisplayEnabled 不在此处：走独立接口 `PUT /{id}/coin-display`，避免覆盖独立开关。
 */
function mapFormToConfig(): PropertyCompanyConfig {
  syncCascadeFromManagementSplit()
  const payload: PropertyCompanyConfig = {
    pointEnabled: config.pointEnabled,
    coinEnabled: config.coinEnabled,
    coinExpiryDays: Math.round(Number(config.coinExpiryDays)),
    deliveryBaseFee: toNonNegativeNumber(config.deliveryBaseFee),
    pointToFeeRate: percentToRate(config.pointToFeeRatePercent),
    twoYearClearEnabled: config.twoYearClearEnabled,
    neighborDailyContactLimit: Math.round(Number(config.neighborDailyContactLimit))
  }
  /**
   * 分成比例 + 手续费：后端 §1.2 确认仅 platform_admin 可写，物业领导传入直接 403 20004。
   * 因此只在平台账号下附加，物业领导保存时完全不出现这些键。
   */
  if (canEditPlatformFinance.value) {
    payload.withdrawalFeeRate = percentToRate(config.withdrawalFeeRatePercent)
    payload.platformShareRate = percentToRate(config.platformSharePercent)
    payload.propertyShareRate = percentToRate(config.propertySharePercent)
    payload.coordinatorShareRate = percentToRate(config.coordinatorSharePercent)
    payload.sectorLeaderRate = percentToRate(config.sectorLeaderPercent)
    payload.individualLeaderRate = percentToRate(config.individualLeaderPercent)
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
    admins: detail.admins || []
  })
  /**
   * v8.31：详情接口已新增返回 pointEnabled / coinEnabled（后端 P0）。
   * 这两个字段在响应根层级，不在 config 子对象里，必须显式回填，
   * 否则开关永远显示默认的「开启」，用户看不出实际状态。
   */
  mapConfigToForm({
    ...(detail.config || {}),
    pointEnabled: detail.pointEnabled ?? detail.config?.pointEnabled,
    coinEnabled: detail.coinEnabled ?? detail.config?.coinEnabled
  })
}

async function loadPlatformShareReadonlyValues(propertyCompanyId: string) {
  try {
    const rates = await platformShareApi.getRates(propertyCompanyId)
    config.platformSharePercent = rateToFormPercent(rates.platformShareRate ?? 0)
    config.platformDeliverySharePercent = rateToFormPercent(rates.platformDeliveryShareRate ?? 0)
    config.platformWithdrawalFeeSharePercent = rateToFormPercent(rates.platformWithdrawalFeeShareRate ?? 0)
    expandPropertyCoordinatorForDisplay()
  } catch {
    // 分成只读值请求失败时，保留 propertyCompany.config 的兜底值
    expandPropertyCoordinatorForDisplay()
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
    // v2：后端未下发该字段时按「显示」处理，避免老环境把开关默认显示为关闭而误导
    coinDisplayEnabled.value = detail.coinDisplayEnabled !== false
    applyCoinUseFromDetail(detail)
    applyWithdrawSettingsFromDetail(detail)
    await loadWithdrawSettings(id)
    // 配置无独立 GET；详情已含字段，不再对 /config 发 GET（会 405）
    try {
      const mallRules = await propertyCoinMallApi.getRules(id)
      applyMallRules(mallRules)
    } catch {
      // 专用接口不可用时保留物业公司配置中的 coinMall 字段
    }
    await loadPlatformShareReadonlyValues(id)
    await loadOrderConfig()
  } catch (e) {
    loadError.value = e instanceof ApiError ? e.message : '配置加载失败'
  } finally {
    if (!options?.silent) loading.value = false
  }
}

function applyCoinUseFromDetail(detail: PropertyCompanyDetail) {
  if (detail.coinUseCondition) {
    coinUseForm.condition = detail.coinUseCondition
  }
  if (detail.coinPointThreshold != null) {
    coinUseForm.pointThreshold = Number(detail.coinPointThreshold) || 0
  }
}

function applyWithdrawSettingsFromDetail(detail: PropertyCompanyDetail) {
  if (detail.autoWithdrawalEnabled !== undefined) {
    withdrawSettings.autoEnabled = Boolean(detail.autoWithdrawalEnabled)
  }
  if (detail.autoWithdrawalPeriodDays != null) {
    withdrawSettings.periodDays = Number(detail.autoWithdrawalPeriodDays) || 7
  }
}

/**
 * §80.1 提现设置回显。
 * 详情里的 autoWithdrawalEnabled / autoWithdrawalPeriodDays 是同一组库字段的兜底，
 * 但 feeRate 只有本接口返回，所以优先用它，失败再保留详情值。
 */
async function loadWithdrawSettings(id: string) {
  try {
    const res = await coinWithdrawalAdminApi.getSettings(id)
    if (res.autoEnabled !== undefined) withdrawSettings.autoEnabled = Boolean(res.autoEnabled)
    if (res.periodDays != null) withdrawSettings.periodDays = Number(res.periodDays) || 7
    if (res.feeRate != null) {
      config.withdrawalFeeRatePercent = rateToFormPercent(res.feeRate)
      if (config.withdrawalFeeRatePercent > 0) {
        lastPositiveFeePercent.value = config.withdrawalFeeRatePercent
      }
    }
  } catch {
    // 接口未部署时保留详情字段回显
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

async function loadOrderConfig() {
  try {
    const res = await adminOrderConfigApi.get()
    orderConfig.merchantVerificationHours = res.merchantVerificationHours ?? 24
    orderConfig.freezeDays = res.freezeDays ?? 7
    orderConfig.refundWindowDays = res.refundWindowDays ?? 3
  } catch {
    // 接口未部署时保留默认
  }
}

async function saveOrderConfig() {
  if (orderConfigSaving.value || !companyId.value) return
  if (!canEditPlatformFinance.value) {
    orderConfigError.value = '仅平台管理员可修改订单配置'
    return
  }
  const hours = Number(orderConfig.merchantVerificationHours) || 0
  const freezeDays = Number(orderConfig.freezeDays) || 0
  const refundWindowDays = Number(orderConfig.refundWindowDays) || 0
  if (hours < 1 || hours > 168) {
    orderConfigError.value = '核实时限须在 1–168 小时'
    return
  }
  if (freezeDays < 1 || freezeDays > 30) {
    orderConfigError.value = '冻结期须在 1–30 天'
    return
  }
  if (refundWindowDays < 1 || refundWindowDays > 30) {
    orderConfigError.value = '退款窗口须在 1–30 天'
    return
  }
  if (refundWindowDays > freezeDays) {
    orderConfigError.value = '退款窗口不能超过冻结期'
    return
  }
  orderConfigSaving.value = true
  orderConfigError.value = ''
  orderConfigSuccess.value = ''
  try {
    const res = await adminOrderConfigApi.update({
      merchantVerificationHours: hours,
      freezeDays,
      refundWindowDays
    })
    orderConfig.merchantVerificationHours = res.merchantVerificationHours ?? hours
    orderConfig.freezeDays = res.freezeDays ?? freezeDays
    orderConfig.refundWindowDays = res.refundWindowDays ?? refundWindowDays
    orderConfigSuccess.value = '订单配置已保存'
  } catch (e) {
    orderConfigError.value = e instanceof ApiError ? e.message : '保存订单配置失败'
  } finally {
    orderConfigSaving.value = false
  }
}

async function saveWithdrawSettings() {
  if (withdrawSaving.value) return
  const id = companyId.value
  if (!id) return
  withdrawSaving.value = true
  withdrawError.value = ''
  withdrawSuccess.value = ''
  const payload = {
    autoEnabled: withdrawSettings.autoEnabled,
    periodDays: Number(withdrawSettings.periodDays) || 7
  }
  try {
    try {
      const res = await coinWithdrawalAdminApi.updateSettings(payload, id)
      withdrawSettings.autoEnabled = res.autoEnabled ?? withdrawSettings.autoEnabled
      withdrawSettings.periodDays = res.periodDays ?? withdrawSettings.periodDays
      withdrawSettings.feeRate = res.feeRate ?? withdrawSettings.feeRate
    } catch (e) {
      // 不再回退到 §14.6：后端已确认它与 admin 共用同一 DTO，回退写入同样被忽略，只会制造「保存成功」假象
      if (!(e instanceof ApiError) || (e.code !== 404 && e.code !== 405)) throw e
      throw new ApiError(404, '测试服未部署自动提现设置接口（§80），当前无法保存该项')
    }
    withdrawSuccess.value = '提现设置已保存（手续费比例请一并点「保存全局设置」落库）'
  } catch (e) {
    withdrawError.value = e instanceof ApiError ? e.message : '保存提现设置失败'
  } finally {
    withdrawSaving.value = false
  }
}

async function handleSave() {
  const id = companyId.value
  if (!id || saving.value) return
  if (canEditPlatformFinance.value && poolTierWarn.value) {
    saveError.value = '平台盘三档（我们公司 + 物业 + 管理盘）合计须约 100% 后再保存'
    return
  }
  saving.value = true
  saveError.value = ''
  saveSuccess.value = ''
  const notices: string[] = []
  try {
    /**
     * 商城抵扣规则走专用接口，后端 §1.4 确认只允许 property_admin（物业领导）：
     * 平台账号调用必然 403，因此只在可编辑时发送，且失败不阻断主保存。
     */
    if (canEditMallRules.value) {
      try {
        await propertyCoinMallApi.updateRules({
          propertyCompanyId: id,
          coinMallEnabled: config.coinMallEnabled,
          coinMallMaxRatio: percentToRate(config.coinMallMaxRatioPercent),
          coinMallMinAmount: toNonNegativeNumber(config.coinMallMinAmount)
        })
      } catch (e) {
        console.warn('mall-rules update failed', e)
        notices.push('商城抵扣规则未保存（接口失败），其余配置已保存')
      }
    }

    /**
     * 主保存：PATCH /admin/property-companies/{id}/config。
     * 平台账号额外携带分成/手续费（后端确认仅平台可写）；
     * 物业领导不发送这些键，避免 403 20004 导致整单保存失败。
     */
    await configApi.updateConfig(id, mapFormToConfig())

    if (isPlatformAdmin.value) {
      auth.setPropertyCompanyId(id)
    }
    await loadDetail({ silent: true })
    saveSuccess.value = notices.length ? `配置已保存。${notices.join('；')}` : '配置已保存'
  } catch (e) {
    if (e instanceof ApiError && e.code === 97006) {
      saveError.value = e.message || '分账保存失败：商品平台盘一级比例（我们公司+物业+管理盘）合计须为 100%'
    } else if (e instanceof ApiError && e.code === 20004) {
      saveError.value = '当前账号无权修改分成比例或提现手续费（平台专属参数），请联系平台管理员'
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
/* 积分区块下架积分分成卡后只剩一张卡，单列铺满，避免半宽留白 */
.grid.single { grid-template-columns: 1fr; }
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
