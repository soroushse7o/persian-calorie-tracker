/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = process.cwd()
const CSS = readFileSync(join(ROOT, 'src/index.css'), 'utf8')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry: string) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(path) ? [path] : []
  })
}

function darkHexClasses(pattern: RegExp): string[] {
  const found = new Set<string>()
  for (const file of sourceFiles(join(ROOT, 'src'))) {
    const source = readFileSync(file, 'utf8')
    for (const match of source.matchAll(pattern)) found.add(match[1].toUpperCase())
  }
  return [...found].sort()
}

function isCovered(selector: string, hex: string): boolean {
  // Escaped Tailwind arbitrary value in CSS: html.light .bg-\[\#0C0C0D\]
  return CSS.includes(`html.light .${selector}\\[\\#${hex}\\]`)
}

describe('Light theme dark-surface coverage', () => {
  it('provides a light override for every hardcoded dark background class', () => {
    const uncovered = darkHexClasses(/(?<!:)bg-\[#([0-9A-Fa-f]{6})\]/g).filter(
      (hex) => !isCovered('bg-', hex),
    )
    expect(uncovered).toEqual([])
  })

  it('provides a light override for every hardcoded dark hover background class', () => {
    const uncovered = darkHexClasses(/hover:bg-\[#([0-9A-Fa-f]{6})\]/g).filter(
      (hex) => !isCovered('hover\\:bg-', hex),
    )
    expect(uncovered).toEqual([])
  })
})
