// Local-first project scanning via the File System Access API (Chromium browsers only).

export interface ScannedFile {
  path: string
  handle: FileSystemFileHandle
}

const IGNORED_DIRS = new Set(['node_modules', 'vendor', '.git', 'dist', 'build'])

export function isDirectoryPickerSupported(): boolean {
  return 'showDirectoryPicker' in window
}

export async function pickProjectDirectory(): Promise<FileSystemDirectoryHandle> {
  if (!isDirectoryPickerSupported()) {
    throw new Error(
      'Folder access is not supported in this browser. Use Chrome or Edge.',
    )
  }
  return window.showDirectoryPicker()
}

// Recursively collects .php files, skipping common dependency/build directories.
// Per-entry errors (e.g. cloud-sync placeholders on OneDrive) are skipped rather than aborting the scan.
export async function scanPhpFiles(
  dirHandle: FileSystemDirectoryHandle,
  basePath = '',
): Promise<ScannedFile[]> {
  const results: ScannedFile[] = []

  const entries: Array<FileSystemFileHandle | FileSystemDirectoryHandle> = []
  try {
    for await (const entry of dirHandle.values()) entries.push(entry)
  } catch {
    return results
  }

  for (const entry of entries) {
    const entryPath = basePath ? `${basePath}/${entry.name}` : entry.name

    try {
      if (entry.kind === 'directory') {
        if (IGNORED_DIRS.has(entry.name)) continue
        const nested = await scanPhpFiles(entry, entryPath)
        results.push(...nested)
      } else if (entry.kind === 'file' && entry.name.endsWith('.php')) {
        results.push({ path: entryPath, handle: entry })
      }
    } catch {
      // Skip entries the filesystem refuses to expose (locked, placeholder, permission-denied, etc.)
      continue
    }
  }

  return results
}

// Accepts a bare filename, a relative path, or a full/absolute path (even from
// a different filesystem root, e.g. pasted from an editor). Tries the most
// specific match first (longest path suffix) and falls back to just the
// basename so a lone class/file name still resolves.
export async function findFileByPath(
  files: ScannedFile[],
  rawPath: string,
): Promise<{ path: string; code: string } | null> {
  const trimmed = rawPath.trim()
  if (!trimmed) return null

  const segments = trimmed
    .replace(/\\/g, '/')
    .replace(/^[A-Za-z]:/, '')
    .split('/')
    .filter(Boolean)
  if (segments.length === 0) return null

  const lastIndex = segments.length - 1
  segments[lastIndex] = segments[lastIndex].endsWith('.php')
    ? segments[lastIndex]
    : `${segments[lastIndex]}.php`

  for (let start = 0; start < segments.length; start++) {
    const suffix = segments.slice(start).join('/')
    const match = files.find(
      (f) => f.path === suffix || f.path.endsWith(`/${suffix}`),
    )
    if (match) {
      const file = await match.handle.getFile()
      return { path: match.path, code: await file.text() }
    }
  }

  return null
}
