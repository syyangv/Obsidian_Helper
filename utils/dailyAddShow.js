module.exports = async (params) => {
    const { app, quickAddApi } = params;
    
    const shows = app.vault.getMarkdownFiles()
        .filter(function(f) {
            const cache = app.metadataCache.getFileCache(f);
            const fm = cache && cache.frontmatter;
            
            // Check if file has the 弃剧 tag
            const tags = [];
            // Get tags from frontmatter
            if (fm && fm.tags) {
                if (Array.isArray(fm.tags)) {
                    tags.push.apply(tags, fm.tags);
                } else if (typeof fm.tags === 'string') {
                    tags.push(fm.tags);
                }
            }
            // Get inline tags from cache
            if (cache && cache.tags) {
                for (var i = 0; i < cache.tags.length; i++) {
                    tags.push(cache.tags[i].tag.replace(/^#/, ''));
                }
            }
            
            // Check if 弃剧 tag exists
            var hasDroppedTag = false;
            for (var j = 0; j < tags.length; j++) {
                if (tags[j] === '弃剧') {
                    hasDroppedTag = true;
                    break;
                }
            }
            
            return fm && fm.总集数 && fm.开始看日期 && !fm.看过日期 && !hasDroppedTag;
        })
        .map(function(f) { return f.basename; })
        .sort();

    if (shows.length === 0) {
        new Notice("没有找到正在观看的电视剧");
        return;
    }

    const selected = await quickAddApi.suggester(shows, shows);
    if (!selected) return;

    const showFile = app.vault.getMarkdownFiles().find(f => f.basename === selected);
    const showFm = showFile && app.metadataCache.getFileCache(showFile)?.frontmatter;
    const lastEpisodes = showFm?.看过集数;
    const episodePrompt = lastEpisodes != null ? `看过集数（上次：${lastEpisodes}）` : "看过集数";

    const episodes = await quickAddApi.inputPrompt(episodePrompt);
    if (!episodes) return;

    const file = app.workspace.getActiveFile();
    if (!file) {
        new Notice("请先打开一个笔记");
        return;
    }
    
    var content = await app.vault.read(file);
    var newEntry = "- [[" + selected + "]] 看过集数:: " + episodes;
    
    const cache = app.metadataCache.getFileCache(file);
    const headings = (cache && cache.headings) || [];
    
    // Find the heading that ends with 看电视
    var targetHeading = null;
    for (var i = 0; i < headings.length; i++) {
        var h = headings[i];
        if (h.level === 2 && h.heading.endsWith("看电视")) {
            targetHeading = h;
            break;
        }
    }
    
    if (!targetHeading) {
        new Notice("没有找到看电视标题");
        return;
    }
    
    var lines = content.split("\n");
    var startLine = targetHeading.position.start.line;
    
    // Find the end of this section
    var endLine = lines.length;
    for (var j = 0; j < headings.length; j++) {
        var heading = headings[j];
        if (heading.position.start.line > startLine && heading.level <= 2) {
            endLine = heading.position.start.line;
            break;
        }
    }
    
    // Check if this show already exists in this section
    var existingLineIndex = -1;
    var searchStr = "- [[" + selected + "]] 看过集数:: ";
    for (var k = startLine + 1; k < endLine; k++) {
        if (lines[k].indexOf(searchStr) === 0) {
            existingLineIndex = k;
            break;
        }
    }
    
    if (existingLineIndex !== -1) {
        lines[existingLineIndex] = newEntry;
        await app.vault.modify(file, lines.join("\n"));
        new Notice("已更新: " + selected + " - " + episodes + "集");
    } else {
        lines.splice(endLine, 0, newEntry);
        await app.vault.modify(file, lines.join("\n"));
        new Notice("已添加: " + selected + " - " + episodes + "集");
    }

    // If new episode count > 更新集数, bump 更新集数 on the show file
    const newEpNum = parseInt(episodes);
    const currentUpdateCount = showFm?.更新集数;
    const currentTotalCount = showFm?.总集数;
    const needsUpdateCount = !isNaN(newEpNum) && (currentUpdateCount == null || newEpNum > currentUpdateCount);
    const needsTotalCount = !isNaN(newEpNum) && (currentTotalCount == null || newEpNum > currentTotalCount);
    if (needsUpdateCount || needsTotalCount) {
        await app.fileManager.processFrontMatter(showFile, (fm) => {
            if (needsUpdateCount) fm['更新集数'] = newEpNum;
            if (needsTotalCount) fm['总集数'] = newEpNum;
        });
    }
};