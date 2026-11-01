#!/usr/bin/env node
/**
 * 只读审计：找出 .vue 里「定义了但全文件只出现一次」的函数/事件处理。
 * 这类符号通常意味着「弹窗/按钮的入口没接上」——功能写了但用户点不到。
 * 用法：node scripts/audit-dead-actions.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = 'src'
const files = []
;(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) walk(p)
    else if (name.endsWith('.vue')) files.push(p)
  }
})(ROOT)

const findings = []

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8')
  const scriptStart = text.indexOf('<script')
  if (scriptStart < 0) continue
  const script = text.slice(scriptStart)

  const fns = new Set()
  for (const m of script.matchAll(/(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g)) fns.add(m[1])
  for (const m of script.matchAll(/const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g)) fns.add(m[1])

  for (const fn of fns) {
    const re = new RegExp(`(?<![\\w$.])${fn.replace(/\$/g, '\\$')}(?![\\w$])`, 'g')
    const count = (text.match(re) || []).length
    if (count > 1) continue
    // 只关注「动作类」命名，减少噪音
    if (!/^(open|show|handle|submit|toggle|export|download|upload|create|save|confirm|choose|edit|remove|delete|audit|deduct|refresh|reload|load|send|apply|bind|unbind|switch|reset|close|copy|assign|approve|reject|grant|publish|withdraw)/i.test(fn)) continue
    findings.push({ file, fn })
  }
}

const byFile = new Map()
for (const f of findings) {
  if (!byFile.has(f.file)) byFile.set(f.file, [])
  byFile.get(f.file).push(f.fn)
}

console.log(`扫描 ${files.length} 个 .vue 文件`)
console.log(`定义了但从未被引用的动作函数：${findings.length} 个 / ${byFile.size} 个文件\n`)
for (const [file, list] of [...byFile.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${file.replace(/\\/g, '/')}  (${list.length})`)
  console.log(`  ${[...new Set(list)].join(', ')}`)
}
