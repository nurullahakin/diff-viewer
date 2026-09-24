// Minimal ambient typing for the File System Access API entry point not yet in lib.dom.d.ts.
export {}

declare global {
  interface Window {
    showDirectoryPicker(options?: { mode?: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle>
  }
}
