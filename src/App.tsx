import { useRef, useState } from 'react'
import { DiffEditor } from '@monaco-editor/react'
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
  const [inline, setInline] = useState(false)
  const [language, setLanguage] = useState('javascript')

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
