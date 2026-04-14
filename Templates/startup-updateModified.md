<%*
// Guard: only register once per Obsidian session
if (!app._modifiedAtListenerActive) {
    const processing = new Set();

    const handler = async (file) => {
        // Only .md files
        if (!file.path.endsWith('.md')) return;
        // Skip if we're already writing this file (prevents write loop)
        if (processing.has(file.path)) return;

        const today = moment().format('YYYY-MM-DD');
        const cache = app.metadataCache.getFileCache(file);
        // Skip if already up to date
        if (cache?.frontmatter?.modified_at === today) return;

        processing.add(file.path);
        try {
            await app.fileManager.processFrontMatter(file, (fm) => {
                fm['modified_at'] = today;
            });
        } finally {
            processing.delete(file.path);
        }
    };

    app.vault.on('modify', handler);
    app._modifiedAtListenerActive = true;
}
tR = '';
%>
