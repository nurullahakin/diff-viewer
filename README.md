# Diff Viewer

Compare two files or functions from a local PHP project without copying their contents by hand. Select a project folder, enter the two targets, and see their differences in an editable Monaco diff editor.
## Run Locally

Requires Node.js 22.12 or newer, npm, and Chrome or Edge for local folder access.
```sh
npm install
npm run dev
```
Open the local URL printed in the terminal. If the default port is busy, the server chooses another port.
## Compare Code

1. Click **Select Project Folder**, choose your PHP project, and allow read access.
2. Choose **File** or **Function** from the shared **Type** selector.
3. Enter the targets in **Old** and **New**.
4. Click **Compare**.
Use **Inline view** to switch between a combined diff and side-by-side editors. Both editor inputs are editable, and differences update as you type. Edits affect only the comparison, not the files on disk.
### Files

Enter a filename with or without `.php`, or a project-relative path:
```text
VerificationsControllerDeleteTest
tests/Verification/VerificationsControllerDeleteTest.php
```
An absolute path copied from your editor is also matched against paths in the selected project; it does not grant access to files outside that folder. Use a relative path when multiple files share a name. Bare filenames select the first matching file.
### Functions And Methods

Keep **Language** set to **php**. Enter a bare function name to search the project, or use `File::function` to search a specific file:
```text
CarryPinSyncService::getDiff
WupexSyncService::getDiff
```
The part before `::` is a filename, not a PHP class lookup. If several files share that name, qualify it with a relative path:
```text
models/Procurement/API/CarryPin/CarryPinSyncService.php::getDiff
```
Bare function names select the first match. File-qualified searches reject ambiguous filenames. Extracted functions include a PHP opening tag for syntax highlighting.
### Paste Both Targets

Paste a pair into either **Old** or **New**:
```text
CarryPinSyncService::getDiff -> WupexSyncService::getDiff
```
The left target goes into **Old** and the right target into **New**, regardless of which field receives the paste. Surrounding whitespace is trimmed.
## Local File Access

The browser reads the selected folder directly with your permission. Chrome's "view and copy files" prompt describes that permission; allowing it does not copy the project to disk or upload it.
Selecting a folder lists PHP filenames and file handles, without reading their contents. Comparing files reads the selected files. Searching for a function can read many PHP files until it finds a match; `File::function` reads only the resolved file.
The tool does not save project selections, input values, or edits between sessions. Monaco may download its editor assets from a CDN, so local file access does not mean the application is fully offline.
## Current Limits

- Project scanning supports `.php` files only. The language selector changes highlighting, not which files are scanned.
- Scanning skips `node_modules`, `vendor`, `.git`, `dist`, and `build`. Inaccessible directories may be skipped.
- Function extraction uses simple name matching and brace counting, not a full PHP parser. Braces in strings or comments can produce incomplete snippets; multiple methods with the same name within one file are not distinguished.
- Folder access requires a supported browser and a secure context such as localhost. WSL folders must be accessible through the browser's folder picker.
- Files are not watched for changes. Reselect the folder to refresh the file list, and click **Compare** again to reload contents.
