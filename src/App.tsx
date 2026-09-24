import { useRef, useState } from 'react'
import { DiffEditor, type MonacoDiffEditor } from '@monaco-editor/react'
import {
  findFileByPath,
  isDirectoryPickerSupported,
  pickProjectDirectory,
  scanPhpFiles,
  type ScannedFile,
} from './lib/projectScan'
import { findFunctionInFiles } from './lib/phpExtract'
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
  const [language, setLanguage] = useState('javascript')

  const [projectName, setProjectName] = useState<string | null>(null)
  const [projectFiles, setProjectFiles] = useState<ScannedFile[]>([])
  const [scanning, setScanning] = useState(false)
  const [finding, setFinding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [origType, setOrigType] = useState<SymbolType>('function')
  const [origValue, setOrigValue] = useState('')
  const [newType, setNewType] = useState<SymbolType>('function')
  const [newValue, setNewValue] = useState('')

  async function handleSelectProject() {
    setError(null)
    try {
      const dirHandle = await pickProjectDirectory()
      setProjectName(dirHandle.name)
      setScanning(true)
      const files = await scanPhpFiles(dirHandle)
      setProjectFiles(files)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Failed to select project folder.')
    } finally {
      setScanning(false)
    }
  }

  async function resolveSymbol(type: SymbolType, value: string) {
    if (!value.trim()) return null
    return type === 'file'
      ? findFileByPath(projectFiles, value)
      : findFunctionInFiles(projectFiles, value)
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
        resolveSymbol(origType, origValue),
        resolveSymbol(newType, newValue),
      ])

      if (!origResult) {
        setError(`Could not find ${origType} "${origValue}" (ref/orig).`)
        return
      }
      if (!newResult) {
        setError(`Could not find ${newType} "${newValue}" (new).`)
        return
      }

      originalRef.current = origResult.code
      modifiedRef.current = newResult.code
      diffEditorRef.current?.getOriginalEditor().setValue(origResult.code)
      diffEditorRef.current?.getModifiedEditor().setValue(newResult.code)
      setLanguage('php')
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

        <div className="symbol-input">
          <span className="symbol-label">Ref/Orig</span>
          <select
            value={origType}
            onChange={(e) => setOrigType(e.target.value as SymbolType)}
          >
            <option value="function">Function</option>
            <option value="file">File</option>
          </select>
          <input
            type="text"
            value={origValue}
            onChange={(e) => setOrigValue(e.target.value)}
            placeholder={origType === 'file' ? 'path/to/File.php' : 'functionName'}
          />
        </div>

        <div className="symbol-input">
          <span className="symbol-label">New</span>
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as SymbolType)}
          >
            <option value="function">Function</option>
            <option value="file">File</option>
          </select>
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder={newType === 'file' ? 'path/to/File.php' : 'functionName'}
          />
        </div>

        <button type="button" onClick={handleFind} disabled={finding}>
          {finding ? 'Finding…' : 'Scan / Find'}
        </button>
      </section>

      {error && <div className="error-banner">{error}</div>}

      <main className="editor-wrap">
        <DiffEditor
          height="100%"
          language={language}
          original={originalRef.current}
          modified={modifiedRef.current}
          theme="vs-dark"
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
