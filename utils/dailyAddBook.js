module.exports = async (params) => {
    const { app, quickAddApi } = params;
    
    // Get all books with status "在看"
    const books = app.vault.getMarkdownFiles()
        .filter(f => {
            // Check if file is in the 知识库/读书笔记 folder
            if (!f.path.startsWith('知识库/读书笔记/')) return false;
            
            const cache = app.metadataCache.getFileCache(f);
            const fm = cache?.frontmatter;
            
            // Handle both array and string status
            if (Array.isArray(fm?.status)) {
                return fm.status.includes('在看');
            }
            return fm?.status === '在看';
        })
        .map(f => f.basename)
        .sort();

    if (books.length === 0) {
        new Notice("没有找到正在阅读的书籍");
        return;
    }

    const selected = await quickAddApi.suggester(books, books);
    if (!selected) return;

    const bookFile = app.vault.getMarkdownFiles().find(f => f.basename === selected);
    const bookFm = bookFile && app.metadataCache.getFileCache(bookFile)?.frontmatter;
    const lastPages = bookFm?.完成页数;
    const pagesPrompt = lastPages != null && lastPages !== 0 ? `完成页数（上次：${lastPages}）` : "完成页数";

    const pages = await quickAddApi.inputPrompt(pagesPrompt);
    if (!pages) return;

    // Get the active file
    const file = app.workspace.getActiveFile();
    if (!file) {
        new Notice("请先打开一个笔记");
        return;
    }
    
    let content = await app.vault.read(file);
    
    // Check if this book already exists in today's note
    const bookPattern = new RegExp(`^- \\[\\[${selected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]\\] 完成页数:: \\d+$`, 'gm');
    const existingMatch = content.match(bookPattern);
    
    const newEntry = `- [[${selected}]] 完成页数:: ${pages}`;
    
    if (existingMatch) {
        // Overwrite existing entry
        content = content.replace(bookPattern, newEntry);
        await app.vault.modify(file, content);
        new Notice(`✏️ 已更新: ${selected} - ${pages}页`);
    } else {
        // Add new entry
        const newContent = content + `\n${newEntry}`;
        await app.vault.modify(file, newContent);
        new Notice(`✅ 已添加: ${selected} - ${pages}页`);
    }
};