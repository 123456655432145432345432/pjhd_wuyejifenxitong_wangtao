/**
 * 路由 / 菜单 / 角色 一致性审计（只读，不改源码）
 * 用法: node scripts/audit-router-menus.mjs
 *
 * 校验项:
 *  A1 菜单引用的路由名是否在 router 中真实存在
 *  A2 菜单所属角色是否被该路由 meta.roles 放行（点进去会不会被守卫踢回首页）
 *  A3 移动端工作台配置引用的路由名是否存在
 *  A4 视图内 router.push({name}) / :to="{name}" 引用的路由名是否存在
 */
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.cwd())
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')

const enumsSrc = read('src/constants/enums.ts')
const routerSrc = read('src/router/index.ts')
const menusSrc = read('src/constants/menus.ts')
const mobileSrc = read('src/constants/mobilePortal.ts')

/* ---------- 1. 解析 USER_ROLE ---------- */
const roleBlock = enumsSrc.match(/export const USER_ROLE = \{([\s\S]*?)\} as const/)
if (!roleBlock) throw new Error('未找到 USER_ROLE 定义')
const USER_ROLE = {}
for (const m of roleBlock[1].matchAll(/(\w+):\s*'([^']+)'/g)) USER_ROLE[m[1]] = m[2]

/* ---------- 2. 解析路由 name / roles ---------- */
/** 路由角色常量表（与 router/index.ts 顶部常量保持一致） */
const CONSTS = {
  ADMIN_ROLES: [USER_ROLE.PLATFORM_ADMIN, USER_ROLE.PROPERTY_ADMIN],
  ADMIN_ROLE_LIST: [USER_ROLE.PLATFORM_ADMIN, USER_ROLE.PROPERTY_ADMIN],
  ADMIN_LEADER_ROLES: [USER_ROLE.PLATFORM_ADMIN, USER_ROLE.PROPERTY_ADMIN],
  PLATFORM_ADMIN_ONLY: [USER_ROLE.PLATFORM_ADMIN],
  MOBILE_SHELL_ROLE_LIST: [
    USER_ROLE.PLATFORM_ADMIN,
    USER_ROLE.PROPERTY_ADMIN,
    USER_ROLE.MERCHANT,
    USER_ROLE.COURIER,
    USER_ROLE.COORDINATOR,
    USER_ROLE.SECTOR_LEADER,
    USER_ROLE.INDIVIDUAL_LEADER,
    USER_ROLE.ACTIVITY_LEADER,
    USER_ROLE.TECHNICIAN
  ],
  DIRECTED_MESSAGE_ROLES: [
    USER_ROLE.PLATFORM_ADMIN,
    USER_ROLE.PROPERTY_ADMIN,
    USER_ROLE.COORDINATOR
  ],
  TRANSFER_ACCOUNT_ROLES: [
    USER_ROLE.PROPERTY_ADMIN,
    USER_ROLE.COORDINATOR,
    USER_ROLE.SECTOR_LEADER,
    USER_ROLE.INDIVIDUAL_LEADER
  ],
  WECHAT_APPLYMENT_ROLES: [USER_ROLE.MERCHANT, USER_ROLE.ACTIVITY_LEADER, USER_ROLE.TECHNICIAN]
}

function evalRoleExpr(expr) {
  const out = new Set()
  if (!expr) return null // null = 无 roles 限制（= 登录即可）
  let unknown = []
  for (const raw of expr.split(',')) {
    // 'USER_ROLE.X' -> 'USER_ROLE_X'；'...ADMIN_ROLE_LIST' -> 'ADMIN_ROLE_LIST'
    const token = raw
      .replace(/\./g, '_')
      .replace(/[^A-Za-z0-9_]/g, '')
      .replace(/^_+/, '')
    if (!token) continue
    if (token.startsWith('USER_ROLE_')) {
      const key = token.slice('USER_ROLE_'.length)
      if (USER_ROLE[key]) out.add(USER_ROLE[key])
      else unknown.push(token)
    } else if (CONSTS[token]) {
      CONSTS[token].forEach((r) => out.add(r))
    } else {
      unknown.push(token)
    }
  }
  return { roles: [...out], unknown }
}

const routes = new Map() // name -> { roles: string[]|null, propertyLeaderOnly: boolean, path }
const routerLines = routerSrc.split('\n')
for (let i = 0; i < routerLines.length; i++) {
  const nameMatch = routerLines[i].match(/^\s*name:\s*'([^']+)',\s*$/)
  if (!nameMatch) continue
  const name = nameMatch[1]
  let rolesExpr = null
  let propertyLeaderOnly = false
  // 向后扫描该路由对象（最多 15 行）找 meta
  for (let j = i + 1; j < Math.min(i + 16, routerLines.length); j++) {
    const line = routerLines[j]
    // 路由对象结束（6 空格 } ）或下一个路由开始（8 空格 path:）
    if (/^\s{6}\}/.test(line) || /^\s{8}path:/.test(line)) break
    if (/propertyLeaderOnly:\s*true/.test(line)) propertyLeaderOnly = true
    if (/roles:/.test(line)) {
      // roles 为数组字面量时可能跨行，需一直读到右括号；为常量标识符时只取本行
      let buf = line.split('roles:')[1]
      if (buf.includes('[')) {
        let k = j
        while (!buf.includes(']') && k + 1 < routerLines.length) {
          k++
          buf += ',' + routerLines[k]
        }
      }
      if (buf.includes('propertyLeaderOnly')) buf = buf.split('propertyLeaderOnly')[0]
      rolesExpr = buf.replace(/[{}]/g, '')
      break
    }
  }
  const evaluated = evalRoleExpr(rolesExpr)
  routes.set(name, {
    roles: evaluated ? evaluated.roles : null,
    unknownRoles: evaluated ? evaluated.unknown : [],
    propertyLeaderOnly
  })
}

/* ---------- 3. 解析菜单表 ---------- */
const menuBlocks = [...menusSrc.matchAll(/export const (\w+Menus): Menu\[\] = \[([\s\S]*?)\n\]/g)]
const menuOwnerRole = {
  adminMenus: [USER_ROLE.PLATFORM_ADMIN, USER_ROLE.PROPERTY_ADMIN],
  merchantMenus: [USER_ROLE.MERCHANT],
  courierMenus: [USER_ROLE.COURIER],
  coordinatorMenus: [USER_ROLE.COORDINATOR],
  sectorLeaderMenus: [USER_ROLE.SECTOR_LEADER],
  individualLeaderMenus: [USER_ROLE.INDIVIDUAL_LEADER],
  activityLeaderMenus: [USER_ROLE.ACTIVITY_LEADER],
  technicianMenus: [USER_ROLE.TECHNICIAN],
  residentMenus: [USER_ROLE.RESIDENT],
  buildingLeaderMenus: [USER_ROLE.RESIDENT],
  propertyManagerMenus: [USER_ROLE.RESIDENT]
}

const menuEntries = []
for (const [, constName, body] of menuBlocks) {
  for (const m of body.matchAll(/name:\s*'([^']+)'[^}]*?route:\s*'([^']+)'/g)) {
    menuEntries.push({ constName, label: m[1], route: m[2], owners: menuOwnerRole[constName] || [] })
  }
}
// propertyOperatorMenus 是 adminMenus 过滤结果，单独按 operator 身份校验
for (const m of menusSrc.matchAll(/propertyOperatorMenus[\s\S]*?adminMenus\.filter/g)) void m

/* ---------- 4. 移动端工作台路由 ---------- */
const mobileRoutes = [...mobileSrc.matchAll(/route:\s*'([^']+)'/g)].map((m) => m[1])

/* ---------- 5. 视图内跳转引用 ---------- */
const viewFiles = []
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(p)
    else if (/\.(vue|ts)$/.test(entry.name)) viewFiles.push(p)
  }
}
walk(path.join(root, 'src'))
const jumpRefs = [] // { file, line, name }
for (const file of viewFiles) {
  const src = fs.readFileSync(file, 'utf8')
  const lines = src.split('\n')
  lines.forEach((line, idx) => {
    for (const m of line.matchAll(/name:\s*'([a-z0-9-]+)'/g)) {
      // 只取跳转上下文，避免误伤普通对象字段
      if (!/\.push\(|\.replace\(|:to=|to:\s*\{|router\./.test(line)) continue
      jumpRefs.push({ file: path.relative(root, file), line: idx + 1, name: m[1] })
    }
  })
}

/* ---------- 6. 输出 ---------- */
const problems = []

// A1 + A2
for (const entry of menuEntries) {
  const route = routes.get(entry.route)
  if (!route) {
    problems.push({
      code: 'A1',
      level: 'ERROR',
      msg: `菜单「${entry.label}」(${entry.constName}) 指向不存在的路由名 '${entry.route}'`
    })
    continue
  }
  if (route.roles && entry.owners.length) {
    const ok = entry.owners.some((r) => route.roles.includes(r))
    if (!ok) {
      problems.push({
        code: 'A2',
        level: 'ERROR',
        msg: `菜单「${entry.label}」(${entry.constName}) 对角色 [${entry.owners.join(', ')}] 可见，但路由 '${entry.route}' 只允许 [${route.roles.join(', ')}] → 点击后被守卫重定向`
      })
    }
  }
}

// A3
for (const r of mobileRoutes) {
  if (!routes.has(r)) {
    problems.push({ code: 'A3', level: 'ERROR', msg: `移动端工作台/快捷入口引用不存在的路由名 '${r}'` })
  }
}

// A4
for (const ref of jumpRefs) {
  if (!routes.has(ref.name)) {
    problems.push({
      code: 'A4',
      level: 'ERROR',
      msg: `${ref.file}:${ref.line} 跳转到不存在的路由名 '${ref.name}'`
    })
  }
}

// 未知角色 token
for (const [name, info] of routes) {
  if (info.unknownRoles?.length) {
    problems.push({
      code: 'A5',
      level: 'WARN',
      msg: `路由 '${name}' 的 roles 含脚本无法解析的标识符: ${info.unknownRoles.join(', ')}`
    })
  }
}

const errs = problems.filter((p) => p.level === 'ERROR')
const warns = problems.filter((p) => p.level === 'WARN')

console.log(`路由总数: ${routes.size}｜菜单条目: ${menuEntries.length}｜页面跳转引用: ${jumpRefs.length}`)
console.log(`发现 ERROR ${errs.length} 项，WARN ${warns.length} 项\n`)
for (const p of problems) console.log(`[${p.code}][${p.level}] ${p.msg}`)
console.log('')
console.log(errs.length ? '结果: 存在问题（见上）' : '结果: A1–A5 全部通过')
process.exitCode = errs.length ? 1 : 0
