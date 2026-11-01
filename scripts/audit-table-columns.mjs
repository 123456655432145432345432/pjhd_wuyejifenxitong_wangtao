#!/usr/bin/env node
/**
 * 只读审计：比对 <thead> 的 <th> 数量与 <tbody> 内数据行的 <td> 数量。
 * 数量不一致通常意味着「列错位」或「漏写了某一列（含操作按钮）」。
 * 用法：node scripts/audit-table-columns.mjs
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
  const tplStart = text.indexOf('<template')
  if (tplStart < 0) continue
  const tpl = text.slice(tplStart)
  const lines = tpl.split('\n')

  let i = 0
  while (i < lines.length) {
    if (!/<thead[\s>]/.test(lines[i])) {
      i++
      continue
    }
    // 收集 thead 块
    const theadStart = i
    let th = 0
    let theadEnd = i
    for (let j = i; j < lines.length; j++) {
      th += (lines[j].match(/<th[\s>]/g) || []).length
      if (/<\/thead>/.test(lines[j])) {
        theadEnd = j
        break
      }
    }
    // 找紧随的 tbody
    let tbodyStart = -1
    for (let j = theadEnd; j < Math.min(theadEnd + 6, lines.length); j++) {
      if (/<tbody[\s>]/.test(lines[j])) {
        tbodyStart = j
        break
      }
      if (/<thead/.test(lines[j])) break
    }
    if (tbodyStart < 0) {
      i = theadEnd + 1
      continue
    }
    // 首行数据行（跳过 loading / 空态这类用 colspan 占位的行）
    let td = 0
    let rowLine = -1
    let skipped = 0
    for (let j = tbodyStart; j < lines.length; j++) {
      if (/<\/tbody>/.test(lines[j])) break
      if (/<tr[\s>]/.test(lines[j])) {
        if (rowLine >= 0) break
        rowLine = j
      }
      if (rowLine >= 0) {
        if (/colspan\s*=/.test(lines[j])) {
          skipped++
          break
        }
        td += (lines[j].match(/<td[\s>]/g) || []).length
        if (/<\/tr>/.test(lines[j])) break
      }
    }
    if (skipped) {
      i = theadEnd + 1
      continue
    }
    if (th && td && th !== td) {
      findings.push({ file, line: theadStart + 1, th, td })
    }
    i = theadEnd + 1
  }
}

console.log(`扫描 ${files.length} 个 .vue 文件`)
console.log(`表头列数与首行数据列数不一致：${findings.length} 处\n`)
for (const f of findings) {
  console.log(`${f.file.replace(/\\/g, '/')}:${f.line}   th=${f.th}  td=${f.td}  差 ${f.td - f.th}`)
}
