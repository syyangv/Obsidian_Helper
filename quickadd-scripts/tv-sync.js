module.exports = async (params) => {
    const { app } = params;

    const dv = app.plugins.plugins['dataview']?.api;
    if (!dv) {
        new Notice('❌ Dataview plugin not found');
        return;
    }

    const SYNC_FILE_PATH = 'Helper/utils/tvSync.md';

    // Read last_sync from tvSync.md frontmatter
    const syncPage = dv.page(SYNC_FILE_PATH);
    const lastSyncRaw = syncPage?.last_sync;
    const lastSyncDate = lastSyncRaw?.toFormat
        ? lastSyncRaw
        : (lastSyncRaw ? dv.date(String(lastSyncRaw)) : null);

    // Shows to process: has 总集数, not complete, not abandoned
    const showPages = dv.pages('"看电视"').where(p => {
        if (!p.总集数) return false;
        if (p.file.tags?.values?.some(t => t === '#弃剧' || t === '弃剧')) return false;
        const watched = p.看过集数 || 0;
        if (watched >= p.总集数) return false;
        return true;
    });

    const notice = new Notice(`🔄 TV 同步中... (0/${showPages.length})`, 0);

    const updated = [];
    const upToDate = [];
    let i = 0;

    for (const show of showPages) {
        i++;
        const showName = show.file.basename ?? show.file.name?.replace(/\.md$/, '');
        if (!showName) {
            console.warn('TV sync: skipping page with undefined basename', show.file?.path);
            continue;
        }

        notice.setMessage(`🔄 TV 同步中 (${i}/${showPages.length}): ${showName}`);

        const startDate = show.开始看日期;
        if (!startDate) { upToDate.push(showName); continue; }

        let scanFrom = startDate;
        if (lastSyncDate && lastSyncDate > startDate) {
            scanFrom = lastSyncDate;
        }

        const dailyNotes = dv.pages('"日记"')
            .where(p => {
                const folderMatch = p.file.folder.match(/^日记\/\d{4}$/);
                return folderMatch && p.file.day && p.file.day >= scanFrom;
            })
            .sort(p => p.file.day, 'asc');

        let latestProgress = null;
        const escapedName = showName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        for (const note of dailyNotes) {
            try {
                const noteFile = app.vault.getAbstractFileByPath(note.file.path);
                const content = await app.vault.read(noteFile);
                const regex = new RegExp(
                    `##\\s+(?:\\d+(?:\\.\\d+)?\\s+)?看电视[\\s\\S]*?\\[\\[${escapedName}\\]\\].*?看过集数::\\s*(\\d+)`
                );
                const match = regex.exec(content);
                if (match) {
                    latestProgress = parseInt(match[1]);
                    if (latestProgress >= show.总集数) break;
                }
            } catch (e) {}
        }

        if (latestProgress !== null) {
            const current = Number(show.看过集数 || 0);
            if (latestProgress !== current) {
                const showFile = app.vault.getAbstractFileByPath(show.file.path);
                await app.fileManager.processFrontMatter(showFile, fm => {
                    fm.看过集数 = latestProgress;
                });
                updated.push({ name: showName, from: current, to: latestProgress, total: show.总集数 });
            } else {
                upToDate.push(showName);
            }
        } else {
            upToDate.push(showName);
        }
    }

    // Update last_sync in tvSync.md
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const syncFile = app.vault.getAbstractFileByPath(SYNC_FILE_PATH);
    if (syncFile) {
        await app.fileManager.processFrontMatter(syncFile, fm => {
            fm.last_sync = todayStr;
        });
    }

    notice.hide();

    if (updated.length > 0) {
        const lines = updated.map(u => {
            const finished = u.to >= u.total ? ' 🎉' : '';
            return `  ${u.name}: ${u.from} → ${u.to} / ${u.total}${finished}`;
        }).join('\n');
        new Notice(`✅ 已更新 ${updated.length} 部:\n${lines}`, 10000);
    } else {
        new Notice(`✅ 无需更新 (共 ${upToDate.length} 部已同步)`, 5000);
    }
};
