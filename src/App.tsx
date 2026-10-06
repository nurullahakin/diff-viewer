import { useRef, useState, type ClipboardEvent } from 'react'
import { DiffEditor, type MonacoDiffEditor } from '@monaco-editor/react'
import {
  findFileByPath,
  isDirectoryPickerSupported,
  pickProjectDirectory,
  scanPhpFiles,
  type ScannedFile,
} from './lib/projectScan'
import { findFunctionInFiles } from './lib/phpExtract'
import { hsla } from './lib/color'
import './App.css'

const LANGUAGES = [
  'javascript',
  'typescript',
  'php',
  'python',
  'java',
  'csharp',
  'cpp',
  'go',
  'rust',
  'ruby',
  'html',
  'css',
  'json',
  'plaintext',
]

type SymbolType = 'file' | 'function'

const DEFAULT_ORIGINAL = `function add(a, b) {
  return a + b;
}
`

const DEFAULT_MODIFIED = `function add(a, b) {
  // sum two numbers
  return a + b;
}
`

function App() {
  // Refs, not state: avoids feeding keystrokes back into the controlled original/modified props.
  const originalRef = useRef(DEFAULT_ORIGINAL)
  const modifiedRef = useRef(DEFAULT_MODIFIED)
  const diffEditorRef = useRef<MonacoDiffEditor | null>(null)
  const [inline, setInline] = useState(false)
  const [language, setLanguage] = useState('php')

  const [projectName, setProjectName] = useState<string | null>(null)
  const [projectFiles, setProjectFiles] = useState<ScannedFile[]>([])
  const [scanning, setScanning] = useState(false)
  const [finding, setFinding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [symbolType, setSymbolType] = useState<SymbolType>('function')
  const [origValue, setOrigValue] = useState('')
  const [newValue, setNewValue] = useState('')

  function handleSymbolPaste(event: ClipboardEvent<HTMLInputElement>) {
    const parts = event.clipboardData.getData('text/plain').split('->').map((part) => part.trim())
    if (parts.length !== 2 || !parts[0] || !parts[1]) return

    event.preventDefault()
    setOrigValue(parts[0])
    setNewValue(parts[1])
  }

  async function handleSelectProject() {
    setError(null)
    try {
      const dirHandle = await pickProjectDirectory()
      setProjectName(dirHandle.name)
      setScanning(true)
      const files = await scanPhpFiles(dirHandle)
      setProjectFiles(files)
      setLanguage('php')
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Failed to select project folder.')
    } finally {
      setScanning(false)
    }
  }

  async function resolveSymbol(value: string) {
    if (!value.trim()) return null
    return symbolType === 'file'
      ? findFileByPath(projectFiles, value)
      : findFunctionInFiles(projectFiles, value, language === 'php')
  }

  async function handleFind() {
    setError(null)
    if (projectFiles.length === 0) {
      setError('Select a project folder first.')
      return
    }

    setFinding(true)
    try {
      const [origResult, newResult] = await Promise.all([
        resolveSymbol(origValue),
        resolveSymbol(newValue),
      ])

      if (!origResult) {
        setError(`Could not find ${symbolType} "${origValue}" (old).`)
        return
      }
      if (!newResult) {
        setError(`Could not find ${symbolType} "${newValue}" (new).`)
        return
      }

      originalRef.current = origResult.code
      modifiedRef.current = newResult.code
      diffEditorRef.current?.getOriginalEditor().setValue(origResult.code)
      diffEditorRef.current?.getModifiedEditor().setValue(newResult.code)
      setLanguage('php')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find symbols.')
    } finally {
      setFinding(false)
    }
  }

  return (
    <div className="app">
      <header className="toolbar">
        <h1>Diff Viewer</h1>
        <div className="toolbar-controls">
          <label className="toggle">
            Language
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={inline}
              onChange={(e) => setInline(e.target.checked)}
            />
            Inline view
          </label>
        </div>
      </header>

      <section className="project-bar">
        <div className="project-select">
          <button
            type="button"
            onClick={handleSelectProject}
            disabled={!isDirectoryPickerSupported() || scanning}
          >
            {scanning ? 'Scanning…' : 'Select Project Folder'}
          </button>
          <span className="project-status">
            {projectName
              ? `${projectName} — ${projectFiles.length} PHP file(s)`
              : 'No project selected (PHP only, for now)'}
          </span>
        </div>

        <label className="symbol-input">
          <span className="symbol-label">Type</span>
          <select
            value={symbolType}
            onChange={(e) => setSymbolType(e.target.value as SymbolType)}
          >
            <option value="function">Function</option>
            <option value="file">File</option>
          </select>
        </label>

        <div className="symbol-input">
          <span className="symbol-label">Old</span>
          <input
            type="text"
            value={origValue}
            onChange={(e) => setOrigValue(e.target.value)}
            onPaste={handleSymbolPaste}
            placeholder={symbolType === 'file' ? 'path/to/File.php' : 'functionName'}
          />
        </div>

        <div className="symbol-input">
          <span className="symbol-label">New</span>
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onPaste={handleSymbolPaste}
            placeholder={symbolType === 'file' ? 'path/to/File.php' : 'functionName'}
          />
        </div>

        <button type="button" onClick={handleFind} disabled={finding}>
          {finding ? 'Finding…' : 'Compare'}
        </button>
      </section>

      {error && <div className="error-banner">{error}</div>}

      <main className="editor-wrap">
        <DiffEditor
          height="100%"
          language={language}
          original={originalRef.current}
          modified={modifiedRef.current}
          theme="diff-viewer-dark"
          beforeMount={(monaco) => {
            // Diff colors live here, not in CSS. Edit these to restyle diff highlighting.
            monaco.editor.defineTheme('diff-viewer-dark', {
              base: 'vs-dark',
              inherit: true,
              rules: [],
              colors: {
                'diffEditor.insertedLineBackground': hsla(60, 100, 50, 0.05),
                'diffEditor.removedLineBackground': hsla(0, 100, 50, 0.15),
                'diffEditor.insertedTextBackground': hsla(120, 100, 50, 0.15),
                'diffEditor.removedTextBackground': hsla(0, 100, 50, 0.25),
                'editor.selectionBackground': '#ffff003c',
                'diffEditor.diagonalFill': hsla(0, 0, 25, 1),
              },
            })
          }}
          options={{
            renderSideBySide: !inline,
            diffAlgorithm: 'advanced',
            originalEditable: true,
            automaticLayout: true,
          }}
          onMount={(editor) => {
            diffEditorRef.current = editor
            const originalEditor = editor.getOriginalEditor()
            const modifiedEditor = editor.getModifiedEditor()

            originalEditor.onDidChangeModelContent(() => {
              originalRef.current = originalEditor.getValue()
            })
            modifiedEditor.onDidChangeModelContent(() => {
              modifiedRef.current = modifiedEditor.getValue()
            })
          }}
        />
      </main>
    </div>
  )
}


export default App
