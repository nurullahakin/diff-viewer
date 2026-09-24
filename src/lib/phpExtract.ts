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

  return source.slice(lineStart, end).trimEnd()
}

export async function findFunctionInFiles(
  files: { path: string; handle: FileSystemFileHandle }[],
  name: string,
): Promise<{ path: string; code: string } | null> {
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
