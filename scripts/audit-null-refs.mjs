#!/usr/bin/env node
/**
 * 只读审计：找出「被赋值为 null 的 ref」在模板里裸用（未加 ?. / 未包在 v-if 里）的点。
 * 这类写法在数据未就绪或接口失败时会抛 TypeError，导致组件渲染中断。
 * 用法：node scripts/audit-null-refs.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = 'src/views'

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (name.endsWith('.vue')) out.push(p)
  }
  return out
}

const files = walk(ROOT)
const hits = []

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8')
  const tplStart = text.indexOf('<template')
  const tplEnd = text.indexOf('</template>')
  const scriptStart = text.indexOf('<script')
  if (tplStart < 0 || tplEnd < 0 || scriptStart < 0) continue

  const tpl = text.slice(tplStart, tplEnd)
  const script = text.slice(scriptStart)

  // 1) 收集被赋 null 的 ref 名
  const nulled = new Set()
  for (const m of script.matchAll(/([A-Za-z_$][\w$]*)\.value\s*=\s*null/g)) nulled.add(m[1])
  if (!nulled.size) continue

  // 2) 找出模板中「有 v-if 保护」的区域：按行判断最近的外层 v-if 是否含该变量
  const lines = tpl.split('\n')
  const guardStack = [] // { indent, varNames:Set }

  lines.forEach((raw, idx) => {
    const line = raw
    const indent = line.length - line.trimStart().length

    // 弹出已结束的块（缩进回退）
    while (guardStack.length && indent <= guardStack[guardStack.length - 1].indent) {
      if (indent <= guardStack[guardStack.length - 1].indent) guardStack.pop()
      else break
    }

    // 记录本行开启的 v-if 守卫
    const vif = line.match(/v-(?:if|else-if)="([^"]+)"/)
    if (vif) {
      const guarded = new Set()
      for (const n of nulled) if (vif[1].includes(n)) guarded.add(n)
      guardStack.push({ indent, guarded })
    }

    // 本行引用的可空变量
    for (const n of nulled) {
      // 裸用 v.xxx / v[  （排除 v?.）
      const bare = new RegExp(`(?<![\\w$.])${n.replace(/\$/g, '\\$')}\\s*(?:\\.[A-Za-z_$]|\\[)`)
      if (!bare.test(line)) continue
      if (line.includes(`${n}?.`)) continue
      const covered = guardStack.some((g) => g.guarded.has(n))
      if (!covered) hits.push({ file, line: idx + 1, name: n, expr: line.trim().slice(0, 120) })
    }
  })
}

const byFile = new Map()
for (const h of hits) {
  if (!byFile.has(h.file)) byFile.set(h.file, [])
  byFile.get(h.file).push(h)
}

console.log(`扫描 ${files.length} 个 .vue 文件`)
console.log(`可疑未保护的空值引用：${hits.length} 处 / ${byFile.size} 个文件\n`)
for (const [file, list] of [...byFile.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`${file.replace(/\\/g, '/')}  (${list.length})`)
  for (const h of list.slice(0, 6)) console.log(`  L${h.line}  ${h.name}  →  ${h.expr}`)
  if (list.length > 6) console.log(`  ... 另有 ${list.length - 6} 处`)
}
process.exitCode = hits.length ? 0 : 0
