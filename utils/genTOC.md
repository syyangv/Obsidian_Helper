---
tags: []
modified_at: 2026-04-14
---
```dataviewjs
(function () {
    const startHeadingLevel = 1;
    const helperPath = "Helper/utils/genTOC";
    const current = dv.current();
    const currentPath = current?.file?.path;
    const activePath = app.workspace.getActiveFile()?.path;
    const targetPath = currentPath && !currentPath.includes(helperPath) ? currentPath : activePath;
    const file = targetPath ? app.vault.getAbstractFileByPath(targetPath) : null;

    // Check if file exists
    if (!file) {
        dv.paragraph("⚠️ No active file detected.");
        return;
    }

    // Check if metadata cache exists
    const cache = app.metadataCache.getFileCache(file);
    if (!cache) {
        dv.paragraph("⚠️ Unable to read file metadata.");
        return;
    }

    const { headings } = cache;

    // Check if headings exist
    if (!headings || headings.length === 0) {
        dv.paragraph("📄 No headings found in this note.");
        return;
    }

    const pastelColors = ['#FFB5E8', '#B5DEFF', '#C7CEEA', '#FFD4B5', '#B5E8D4', '#FFF5B5', '#E8B5FF', '#B5FFE8'];

    // Style the container
    dv.container.style.lineHeight = "1.4em";
    dv.container.style.margin = "0";
    dv.container.style.padding = "0";

    // Build TOC with clickable elements
    const tocContainer = dv.container.createEl('div');

    headings.forEach((p, index) => {
        // Skip if heading object is malformed
        if (!p || typeof p.level !== 'number' || !p.heading) {
            return;
        }

        // Filter by starting level if needed
        if (p.level < startHeadingLevel) {
            return;
        }

        const indentLevel = p.level - startHeadingLevel;
        const color = pastelColors[index % pastelColors.length];

        // Clean heading for display and linking (remove block refs and %% comments %%)
        const cleanHeading = p.heading.replace(/%%.*?%%/g, '').replace(/\^+$/g, '').trim();

        // Dot sizes based on heading level
        let dotSize;
        if (p.level === 1) {
            dotSize = '14px';
        } else if (p.level === 2) {
            dotSize = '11px';
        } else if (p.level === 3) {
            dotSize = '8px';
        } else if (p.level === 4) {
            dotSize = '6px';
        } else {
            dotSize = '4px';
        }

        // Reduced indentation: 16px per level
        const indentPx = Math.max(0, indentLevel) * 16;

        // Create row container
        const row = tocContainer.createEl('div', {
            attr: { style: `margin-left: ${indentPx}px; padding: 0; margin-top: 2px; margin-bottom: 2px;` }
        });

        // Create dot
        row.createEl('span', {
            attr: { style: `display: inline-block; width: ${dotSize}; height: ${dotSize}; background: ${color}; border-radius: 50%; margin-right: 8px; vertical-align: middle;` }
        });

        // Create clickable link using Obsidian's internal API
        const link = row.createEl('a', {
            text: cleanHeading,
            cls: 'internal-link',
            attr: { style: 'text-decoration: none; cursor: pointer;' }
        });

        // Use click handler with Obsidian's API for reliable navigation
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // Scroll to heading without reopening the file
            const leaf = app.workspace.getMostRecentLeaf();
            if (leaf && leaf.view.setEphemeralState) {
                leaf.view.setEphemeralState({ subpath: '#' + cleanHeading });
            }
        });
    });

    if (tocContainer.children.length === 0) {
        dv.paragraph(`📄 No headings at level ${startHeadingLevel} or below found.`);
    }
})();
```
