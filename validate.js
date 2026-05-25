#!/usr/bin/env node
/**
 * NihonGO! Pre-Push Validator
 * Catches bugs BEFORE they reach Vercel.
 * Checks: duplicate keys, TDZ/circular imports, missing exports,
 * JSX syntax, env vars, bundle build, ESLint, dead routes.
 *
 * Run: node validate.js
 * Auto-run before push via git hook (see setup below)
 */

import { execSync, spawnSync } from 'child_process'
import { readFileSync, existsSync, readdirSync } from 'fs'
import { join, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const ROOT = resolve(__dirname)
const SRC  = join(ROOT, 'src')

// ─── Helpers ──────────────────────────────────────────────────
const RESET = '\x1b[0m', RED = '\x1b[31m', GREEN = '\x1b[32m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m', BOLD = '\x1b[1m'
let errors = [], warnings = [], passed = []

function ok(msg)   { passed.push(msg);   console.log(`  ${GREEN}✓${RESET} ${msg}`) }
function warn(msg) { warnings.push(msg); console.log(`  ${YELLOW}⚠${RESET}  ${msg}`) }
function fail(msg) { errors.push(msg);   console.log(`  ${RED}✗${RESET} ${msg}`) }
function section(name) { console.log(`\n${BOLD}${CYAN}── ${name} ${RESET}`) }

function readFile(path) {
  try { return readFileSync(path, 'utf8') } catch { return null }
}

function getAllJSX(dir = SRC, files = []) {
  try {
    readdirSync(dir, { withFileTypes: true }).forEach(d => {
      const full = join(dir, d.name)
      if (d.isDirectory()) getAllJSX(full, files)
      else if (d.name.endsWith('.js') || d.name.endsWith('.jsx')) files.push(full)
    })
  } catch {}
  return files
}

// ─── 1. Environment ───────────────────────────────────────────
section('1. Environment')
const pkg = JSON.parse(readFile(join(ROOT, 'package.json')) || '{}')
const nodeVer = process.versions.node.split('.')[0]
if (parseInt(nodeVer) >= 18) ok(`Node.js v${process.versions.node}`)
else fail(`Node.js v${process.versions.node} — need ≥18`)

if (existsSync(join(ROOT, '.env'))) ok('.env file present')
else warn('.env missing — VITE_SUPABASE_ANON_KEY must be set in Vercel env vars')

if (existsSync(join(ROOT, 'vercel.json'))) {
  const vj = JSON.parse(readFile(join(ROOT, 'vercel.json')))
  if (vj.framework === 'vite') ok('vercel.json: framework=vite ✓')
  else fail('vercel.json: missing framework=vite — Vercel will not build correctly')
  if (vj.outputDirectory === 'dist') ok('vercel.json: outputDirectory=dist ✓')
  else fail('vercel.json: outputDirectory should be "dist"')
} else fail('vercel.json missing')

// ─── 2. Duplicate style keys (the bug that killed us) ─────────
section('2. Duplicate Style Object Keys')
const files = getAllJSX()
let dupKeyErrors = 0

for (const file of files) {
  const src = readFile(file)
  if (!src) continue
  const rel = file.replace(ROOT + '/', '')

  // Find all style={{ ... }} blocks (multi-line aware)
  const styleBlockRe = /style=\{\{([\s\S]*?)\}\}/g
  let m
  while ((m = styleBlockRe.exec(src)) !== null) {
    const block = m[1]
    const keyRe = /\b([a-zA-Z]+):/g
    const keys = []
    const dupes = []
    let km
    while ((km = keyRe.exec(block)) !== null) {
      const k = km[1]
      // skip ternary value words (they look like keys but aren't)
      if (['px', 'auto', 'center', 'flex', 'none', 'solid', 'transparent', 'hidden', 'scroll', 'block', 'row', 'column', 'wrap', 'nowrap', 'pointer', 'default', 'grab', 'grabbing', 'relative', 'absolute', 'fixed', 'sticky', 'inherit', 'initial', 'normal', 'bold', 'italic'].includes(k)) continue
      if (keys.includes(k)) dupes.push(k)
      else keys.push(k)
    }
    if (dupes.length) {
      dupes.forEach(d => {
        const lineNum = src.substring(0, m.index).split('\n').length
        fail(`Duplicate style key "${d}" in ${rel}:~${lineNum}`)
        dupKeyErrors++
      })
    }
  }
}
if (dupKeyErrors === 0) ok('No duplicate style keys found in any JSX file')

// ─── 3. JSX Syntax check (acorn-style via Node) ───────────────
section('3. JSX & JS Syntax')
let syntaxErrors = 0
for (const file of files) {
  const rel = file.replace(ROOT + '/', '')
  const result = spawnSync(process.execPath, ['--input-type=module', '--check'],
    { input: `import React from 'react'\n` + (readFile(file) || ''), encoding: 'utf8' })
  // Node --check doesn't parse JSX, so we rely on the build for that.
  // Instead check for common raw JS syntax errors:
  const src = readFile(file) || ''

  // Unclosed template literals
  const backticks = (src.match(/`/g) || []).length
  if (backticks % 2 !== 0) { fail(`Unclosed template literal in ${rel}`); syntaxErrors++ }

  // Mismatched braces (rough check)
  const opens  = (src.match(/\{/g) || []).length
  const closes = (src.match(/\}/g) || []).length
  if (Math.abs(opens - closes) > 5) { warn(`Possible brace mismatch in ${rel} (${opens} open, ${closes} close)`) }
}
if (syntaxErrors === 0) ok('No obvious syntax issues detected')

// ─── 4. TDZ / Declaration Order in data files ────────────────
section('4. TDZ & Declaration Order (data files)')
const dataFiles = [
  join(SRC, 'data', 'content.js'),
  join(SRC, 'data', 'vocab.js'),
  join(SRC, 'data', 'modules.js'),
  join(SRC, 'data', 'index.js'),
]

for (const file of dataFiles) {
  if (!existsSync(file)) { warn(`Data file missing: ${file.replace(ROOT+'/', '')}`); continue }
  const rawSrc = readFile(file)
  // Strip single-line comments to avoid false positives
  const src = rawSrc.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
  const rel = file.replace(ROOT + '/', '')

  // Find all export const declarations and their positions
  const declarations = {}
  const declRe = /export const (\w+)/g
  let dm
  while ((dm = declRe.exec(src)) !== null) {
    declarations[dm[1]] = dm.index
  }

  // Check if any identifier is used BEFORE it's declared
  let tdzFound = false
  for (const [name, declPos] of Object.entries(declarations)) {
    const usageRe = new RegExp(`(?<!export const )\\b${name}\\b`, 'g')
    let um
    while ((um = usageRe.exec(src)) !== null) {
      if (um.index < declPos) {
        const lineNum = rawSrc.substring(0, um.index).split('\n').length
        fail(`TDZ risk: "${name}" used at line ${lineNum} before declaration in ${rel}`)
        tdzFound = true
      }
    }
  }
  if (!tdzFound) ok(`${rel}: declaration order OK`)
}

// ─── 5. Import/Export consistency ────────────────────────────
section('5. Import / Export Consistency')
const indexFile = join(SRC, 'data', 'index.js')
if (existsSync(indexFile)) {
  const indexSrc = readFile(indexFile)

  // Check all re-exported files actually exist
  const reExportRe = /from ['"](.+?)['"]/g
  let rem
  while ((rem = reExportRe.exec(indexSrc)) !== null) {
    const importPath = rem[1]
    if (importPath.startsWith('.')) {
      const resolved = resolve(join(SRC, 'data'), importPath)
      const withExt = existsSync(resolved) ? resolved
        : existsSync(resolved + '.js') ? resolved + '.js'
        : existsSync(resolved + '.jsx') ? resolved + '.jsx'
        : null
      if (withExt) ok(`data/index.js → ${importPath} ✓`)
      else fail(`data/index.js imports "${importPath}" — file not found`)
    }
  }
}

// Check pages imported in App.jsx actually exist
const appSrc = readFile(join(SRC, 'App.jsx')) || ''
const pageImports = [...appSrc.matchAll(/from ['"](.\/pages\/[^'"]+)['"]/g)]
for (const [, imp] of pageImports) {
  const resolved = resolve(join(SRC), imp)
  const withExt = existsSync(resolved + '.jsx') || existsSync(resolved + '.js') || existsSync(resolved)
  if (withExt) ok(`App.jsx → ${imp} ✓`)
  else fail(`App.jsx imports "${imp}" — file not found`)
}

// ─── 6. React hook rules (quick check) ───────────────────────
section('6. React Hook Rules & Render Side Effects')
let hookErrors = 0
for (const file of files) {
  const src = readFile(file) || ''
  const rel = file.replace(ROOT + '/', '')
  const lines = src.split('\n')

  lines.forEach((line, i) => {
    // Hook called conditionally
    if (/^\s*(if|for|while)\s*\(/.test(line)) {
      const next = lines[i + 1] || ''
      if (/use[A-Z]/.test(next)) {
        warn(`Possible hook in conditional at ${rel}:${i + 2}`)
        hookErrors++
      }
    }
    // onXPEarned / side-effect callbacks called directly during render (not in useEffect/handler)
    if (/onXPEarned\?\.\(|onXPEarned\(/.test(line)) {
      // Allow if it's inside a function definition, useEffect, or event handler
      const trimmed = line.trim()
      const isInHandler = /^\s*(function|const|let|var|async|useEffect|=>|onXPEarned)/.test(lines[i] || '')
      // Flag if it looks like a bare call during JSX render (inside a ternary, IIFE, or conditional block)
      if (/\(\)\s*\{.*onXPEarned|onXPEarned.*return null/.test(line) || (trimmed.startsWith('onXPEarned') && !src.substring(0, src.indexOf(line)).match(/useEffect\s*\(\s*\(\s*\)\s*=>\s*\{[^}]*$/))) {
        fail(`Render side-effect: onXPEarned called during render at ${rel}:${i + 1} — use useEffect`)
        hookErrors++
      }
    }
    // setState called directly during render (outside handlers/effects)
    if (/^\s*set[A-Z]\w+\(/.test(line) && !/^\s*(function|const|let|=|\/\/)/.test(lines[i - 1] || '')) {
      // Only flag at top-level render scope (not inside functions)
      // This is a heuristic — flag for review
    }
  })
}
if (hookErrors === 0) ok('No hook violations or render side-effects detected')

// ─── 7. Circular import detection ────────────────────────────
section('7. Circular Import Detection')
const importGraph = {}
for (const file of files) {
  const src = readFile(file) || ''
  const rel = file.replace(SRC + '/', '')
  const imports = [...src.matchAll(/from ['"](\.[^'"]+)['"]/g)].map(m => m[1])
  importGraph[rel] = imports
}

function detectCycle(node, graph, visited = new Set(), stack = []) {
  if (stack.includes(node)) return [...stack, node]
  if (visited.has(node)) return null
  visited.add(node)
  stack.push(node)
  for (const dep of (graph[node] || [])) {
    const cycle = detectCycle(dep, graph, visited, [...stack])
    if (cycle) return cycle
  }
  return null
}

let cycleFound = false
for (const node of Object.keys(importGraph)) {
  const cycle = detectCycle(node, importGraph)
  if (cycle && cycle.length > 1) {
    warn(`Possible circular import: ${cycle.join(' → ')}`)
    cycleFound = true
  }
}
if (!cycleFound) ok('No circular imports detected')

// ─── 8. Vite build ────────────────────────────────────────────
section('8. Production Build')
console.log('  Running vite build...')
const buildResult = spawnSync('npm', ['run', 'build'], {
  cwd: ROOT, encoding: 'utf8', shell: true, timeout: 120000
})
const buildOut = (buildResult.stdout + buildResult.stderr)

if (buildResult.status === 0) {
  ok('vite build succeeded')
  // Check for esbuild warnings that indicate real problems
  if (buildOut.includes('Duplicate key')) fail('Build warning: Duplicate object key detected')
  if (buildOut.includes('is not defined')) fail('Build warning: Undefined variable')
  if (buildOut.includes('Cannot access')) fail('Build warning: TDZ access')
  const bundleMatch = buildOut.match(/(\d+\.\d+) kB/)
  if (bundleMatch) {
    const kb = parseFloat(bundleMatch[1])
    if (kb > 800) warn(`Bundle is ${kb} kB — consider code splitting (Phase 5)`)
    else ok(`Bundle size: ${kb} kB`)
  }
} else {
  fail('vite build FAILED')
  // Print relevant error lines
  buildOut.split('\n').filter(l => l.includes('error') || l.includes('Error')).slice(0, 10).forEach(l => console.log(`    ${RED}${l}${RESET}`))
}

// ─── 9. ESLint ────────────────────────────────────────────────
section('9. ESLint')
const lintResult = spawnSync('npx', ['eslint', 'src/', '--max-warnings=20', '--format=compact'], {
  cwd: ROOT, encoding: 'utf8', shell: true, timeout: 60000
})
const lintOut = lintResult.stdout + lintResult.stderr
const lintErrors   = (lintOut.match(/\d+ error/g) || []).map(x => parseInt(x)).reduce((a, b) => a + b, 0)
const lintWarnings = (lintOut.match(/\d+ warning/g) || []).map(x => parseInt(x)).reduce((a, b) => a + b, 0)

if (lintErrors === 0 && lintWarnings === 0) ok('ESLint: clean')
else if (lintErrors === 0) warn(`ESLint: ${lintWarnings} warnings (non-blocking)`)
else {
  fail(`ESLint: ${lintErrors} errors, ${lintWarnings} warnings`)
  lintOut.split('\n').filter(l => l.includes('error')).slice(0, 8).forEach(l => console.log(`    ${l}`))
}

// ─── 10. Key data exports exist ───────────────────────────────
section('10. Critical Data Exports')
const requiredExports = {
  'src/data/content.js': ['HIRAGANA_BEGINNER', 'KATAKANA_BEGINNER', 'MODULE_META', 'KANA_MAP'],
  'src/data/vocab.js':   ['WORD_COLLECTIONS', 'ANIMAL_COLLECTIONS', 'THINGS_COLLECTIONS', 'ALL_WORDS'],
  'src/data/modules.js': ['HIRAGANA_DAKUTEN', 'HIRAGANA_COMBOS', 'TIME_CARDS', 'MONEY_CARDS', 'SENTENCE_PATTERNS'],
  'src/data/index.js':   ['COLLECTION_MAP', 'MODULE_ALL_CARDS'],
}
for (const [file, exports] of Object.entries(requiredExports)) {
  const src = readFile(join(ROOT, file)) || ''
  for (const exp of exports) {
    if (src.includes(exp)) ok(`${file}: exports ${exp}`)
    else fail(`${file}: missing export "${exp}"`)
  }
}

// ─── 11. Route completeness ───────────────────────────────────
section('11. Route Completeness')
const expectedScreens = ['landing', 'dashboard', 'module', 'flashcards', 'quiz', 'mock', 'daily', 'leaderboard', 'resources', 'profile', 'builder']
for (const screen of expectedScreens) {
  if (appSrc.includes(`screen === '${screen}'`)) ok(`Route "${screen}" handled`)
  else fail(`Route "${screen}" missing from App.jsx`)
}

// ─── Summary ──────────────────────────────────────────────────
console.log(`\n${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`)
console.log(`${BOLD}  Validation Summary${RESET}`)
console.log(`  ${GREEN}✓ ${passed.length} checks passed${RESET}`)
if (warnings.length) console.log(`  ${YELLOW}⚠  ${warnings.length} warnings${RESET}`)
if (errors.length) {
  console.log(`  ${RED}✗ ${errors.length} errors — FIX BEFORE PUSHING${RESET}`)
  console.log(`\n${RED}${BOLD}  PUSH BLOCKED. Fix the errors above first.${RESET}`)
  process.exit(1)
} else {
  console.log(`\n${GREEN}${BOLD}  ✅ ALL CHECKS PASSED — safe to push.${RESET}`)
  process.exit(0)
}
