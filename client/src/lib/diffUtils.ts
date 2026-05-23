export type DiffLineType = 'hunk' | 'added' | 'removed' | 'context' | 'noNewline'

export interface DiffLine {
  type: DiffLineType
  content: string
  oldNo: number | null
  newNo: number | null
}

export function parsePatch(patch: string): DiffLine[] {
  if (!patch?.trim()) return []

  const lines: DiffLine[] = []
  let oldNo = 0
  let newNo = 0

  for (const raw of patch.split('\n')) {
    if (raw.startsWith('@@')) {
      const m = raw.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
      if (m) {
        oldNo = parseInt(m[1], 10)
        newNo = parseInt(m[2], 10)
      }
      lines.push({ type: 'hunk', content: raw, oldNo: null, newNo: null })
    } else if (raw.startsWith('+')) {
      lines.push({ type: 'added', content: raw.slice(1), oldNo: null, newNo: newNo++ })
    } else if (raw.startsWith('-')) {
      lines.push({ type: 'removed', content: raw.slice(1), oldNo: oldNo++, newNo: null })
    } else if (raw.startsWith('\\')) {
      lines.push({ type: 'noNewline', content: raw, oldNo: null, newNo: null })
    } else {
      lines.push({ type: 'context', content: raw.slice(1), oldNo: oldNo++, newNo: newNo++ })
    }
  }

  return lines
}

export function fileLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java',
    cs: 'csharp', cpp: 'cpp', c: 'c', html: 'html', css: 'css',
    scss: 'scss', json: 'json', md: 'markdown', yml: 'yaml', yaml: 'yaml',
    sh: 'bash', sql: 'sql', graphql: 'graphql',
  }
  return map[ext] ?? 'plaintext'
}
