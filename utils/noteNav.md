```dataviewjs
(async () => {
    // ===== PREVENT MULTIPLE SIMULTANEOUS EXECUTIONS =====
    const activeFile = app.workspace.getActiveFile();
    if (!activeFile) return;

    const containerId = 'note-nav-' + activeFile.path;

    // If already running, skip this execution
    if (window[containerId + '_running']) return;

    // Set debounce timeout - only execute after 500ms of inactivity
    if (window[containerId + '_timeout']) {
        clearTimeout(window[containerId + '_timeout']);
    }

    await new Promise(resolve => {
        window[containerId + '_timeout'] = setTimeout(resolve, 500);
    });

    // Skip rendering if user is actively editing an input field
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
        return;
    }

    window[containerId + '_running'] = true;

try {
    // Get the active file (the one being viewed), not the embedded template
    const page = activeFile ? dv.page(activeFile.path) : null;
    const file = page?.file;
    const folderPath = file?.folder || '';

    if (file) {

// Get sibling files in the same folder
const siblings = dv.pages(`"${folderPath}"`)
    .where(p => p.file.folder === folderPath)
    .sort(p => p.file.name, 'asc')
    .array();

// Find current file index
const currentIndex = siblings.findIndex(p => p.file.path === file.path);

// Get prev and next
const prev = currentIndex > 0 ? siblings[currentIndex - 1] : null;
const next = currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null;

// Find parent folder note (traverse up)
let parentFile = null;
let searchPath = folderPath;
while (searchPath) {
    const parts = searchPath.split('/');
    const folderName = parts[parts.length - 1];
    const folderNotePath = searchPath + '/' + folderName + '.md';

    if (folderNotePath !== file.path) {
        const folderNote = dv.page(folderNotePath);
        if (folderNote) {
            parentFile = folderNote.file;
            break;
        }
    }
    parts.pop();
    searchPath = parts.join('/');
}

// Build sleek navigation
const container = dv.el('div', '', {
    attr: { style: `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        margin: 16px 0;
        background: #f3eeff;
        border-radius: 8px;
        font-size: 0.85em;
        gap: 8px;
    ` }
});

const buttonStyle = `
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 6px;
    background: transparent;
    color: var(--text-normal);
    text-decoration: none;
    transition: all 0.15s ease;
    box-shadow: none;
    border: none;
    font-weight: 500;
`;

const centerButtonStyle = buttonStyle + `
    background: transparent;
    color: var(--text-accent);
    border-color: var(--background-modifier-border-hover);
`;

const leftDiv = container.createDiv({ attr: { style: 'flex:1; display:flex; justify-content:flex-end;' } });
const centerDiv = container.createDiv({ attr: { style: 'flex:0 0 auto; text-align:center; margin:0 12px;' } });
const rightDiv = container.createDiv({ attr: { style: 'flex:1; display:flex; justify-content:flex-start;' } });

if (prev) {
    const link = leftDiv.createEl('a', { cls: 'internal-link' });
    link.setAttribute('data-href', prev.file.path);
    link.setAttribute('href', prev.file.path);
    link.setAttribute('style', buttonStyle);
    link.createSpan({ text: '←', attr: { style: 'opacity:0.7;' } });
    link.createSpan({ text: prev.file.name, attr: { style: 'max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;' } });
} else {
    leftDiv.createSpan({ text: '', attr: { style: 'opacity:0;' } });
}

if (parentFile) {
    const link = centerDiv.createEl('a', { cls: 'internal-link' });
    link.setAttribute('data-href', parentFile.path);
    link.setAttribute('href', parentFile.path);
    link.setAttribute('style', centerButtonStyle);
    link.createSpan({ text: '↑', attr: { style: 'opacity:0.9;' } });
    link.createSpan({ text: parentFile.name });
} else {
    centerDiv.createSpan({ text: '—', attr: { style: 'color:var(--text-faint); padding: 8px 14px;' } });
}

if (next) {
    const link = rightDiv.createEl('a', { cls: 'internal-link' });
    link.setAttribute('data-href', next.file.path);
    link.setAttribute('href', next.file.path);
    link.setAttribute('style', buttonStyle);
    link.createSpan({ text: next.file.name, attr: { style: 'max-width:120px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;' } });
    link.createSpan({ text: '→', attr: { style: 'opacity:0.7;' } });
} else {
    rightDiv.createSpan({ text: '', attr: { style: 'opacity:0;' } });
}
    }
} catch (error) {
    console.error("noteNav error:", error);
} finally {
    window[containerId + '_running'] = false;
}
})();
```
