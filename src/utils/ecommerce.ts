import { ApiError } from '../api/request'
import { API_ERROR_CODE, APPLYMENT_STATE } from '../constants/enums'

export function isApplymentNotFound(e: unknown) {
  return (
    e instanceof ApiError &&
    (e.errorCode === API_ERROR_CODE.APPLYMENT_NOT_FOUND || e.code === 99006)
  )
}

export function isOrderPayUnavailable(e: unknown) {
  return (
    e instanceof ApiError &&
    (e.errorCode === API_ERROR_CODE.ORDER_PAY_UNAVAILABLE || e.code === 99004)
  )
}

export function applymentStateHint(state?: string | null) {
  switch (state) {
    case APPLYMENT_STATE.INIT:
      return '资料已保存为草稿。提交进件后进入微信审核（约 1–2 个工作日），也可等运营后台提交。'
    case APPLYMENT_STATE.SUBMITTED:
    case APPLYMENT_STATE.AUDITING:
      return '微信审核中（约 1–2 个工作日），审核中不可修改资料。'
    case APPLYMENT_STATE.LEGAL_VALIDATING:
      return '请引导法人打开验证链接完成人脸核验。链接有时效，失效后请联系运营刷新进件状态。'
    case APPLYMENT_STATE.SIGNING:
      return '请打开签约链接完成签约。链接有时效，失效后请联系运营刷新进件状态。'
    case APPLYMENT_STATE.FINISHED:
      return '进件成功，该店可正常使用微信支付收款。'
    case APPLYMENT_STATE.REJECTED:
      return '进件已驳回，请按驳回原因修改资料后重新提交。'
    default:
      return '尚未填写微信进件资料。未完成进件前，住户无法对该店使用微信支付，请引导积分/物业币。'
  }
}
