import { findFileByPath } from './projectScan'

// Minimal PHP function extraction: locates `function name(` and captures the
// balanced-brace body. Good enough for typical PHP source, not a full parser.

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function extractPhpFunction(source: string, name: string): string | null {
  const pattern = new RegExp(`function\\s+${escapeRegExp(name)}\\s*\\(`, 'i')
  const match = pattern.exec(source)
  if (!match) return null

  const lineStart = source.lastIndexOf('\n', match.index) + 1
  const braceStart = source.indexOf('{', match.index)
  if (braceStart === -1) return null

  let depth = 0
  let end = -1
  for (let i = braceStart; i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}') {
      depth--
      if (depth === 0) {
        end = i + 1
        break
      }
    }
  }
  if (end === -1) return null

  const body = source.slice(lineStart, end).trimEnd()
  // Monaco needs the opening tag to apply PHP syntax highlighting to a bare function body.
  return body.startsWith('<?php') ? body : `<?php\n${body}`
}

export async function findFunctionInFiles(
  files: { path: string; handle: FileSystemFileHandle }[],
  name: string,
  allowFileQualifier = true,
): Promise<{ path: string; code: string } | null> {
  if (allowFileQualifier && name.includes('::')) {
    const parts = name.split('::').map((part) => part.trim())
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      throw new Error('Use File::function for a file-scoped PHP function search.')
    }
    const result = await findFileByPath(files, parts[0], true)
    if (!result) return null
    const code = extractPhpFunction(result.code, parts[1])
    return code ? { path: result.path, code } : null
  }

  for (const file of files) {
    const fileData = await file.handle.getFile()
    const text = await fileData.text()
    const extracted = extractPhpFunction(text, name)
    if (extracted) {
      return { path: file.path, code: extracted }
    }
  }
  return null
}
