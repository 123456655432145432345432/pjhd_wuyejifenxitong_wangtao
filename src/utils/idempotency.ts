/**
 * C1 写接口幂等 ID（API v8.19 §105.1）
 *
 * 规则（后端契约）：
 * - 每次**新操作**生成一个新 ID；用户重试 / 弱网重发必须**复用同一个 ID**；
 * - 长度 8~128，只允许字母、数字、`.`、`_`、`:`、`-`；
 * - 同一 ID 不跨接口 / 跨业务复用（后端幂等 key = 用户 + 方法 + 路径 + ID）。
 *
 * 使用方式：页面在「开始一次新操作」时生成并持有，提交失败重试时继续传同一个值，
 * 成功后清空，下一次操作重新生成。
 */
export function newRequestId(): string {
  const cryptoObj = globalThis.crypto as Crypto | undefined
  // 安全上下文（https / localhost / Capacitor）才有 randomUUID；
  // 内网 http 调试环境会缺失，走下面的兜底。
  if (typeof cryptoObj?.randomUUID === 'function') {
    return cryptoObj.randomUUID()
  }
  const rand = () => Math.random().toString(16).slice(2, 10)
  return `${Date.now().toString(16)}-${rand()}-${rand()}-${rand()}`
}
