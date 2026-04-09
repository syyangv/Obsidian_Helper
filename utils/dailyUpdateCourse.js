module.exports = async (params) => {
    const { app, quickAddApi } = params;

    const courses = app.vault.getMarkdownFiles()
        .filter(f => {
            const cache = app.metadataCache.getFileCache(f);
            const fm = cache && cache.frontmatter;
            if (!fm) return false;
            const status = fm['任务状态'];
            if (Array.isArray(status)) return status.includes('进行中');
            return status === '进行中';
        })
        .map(f => f.basename)
        .sort();

    if (courses.length === 0) {
        new Notice("没有找到进行中的课程");
        return;
    }

    const selected = await quickAddApi.suggester(courses, courses);
    if (!selected) return;

    const courseFile = app.vault.getMarkdownFiles().find(f => f.basename === selected);
    const courseFm = courseFile && app.metadataCache.getFileCache(courseFile)?.frontmatter;
    const lastProgress = courseFm?.进度;
    const progressPrompt = lastProgress != null && lastProgress !== 0 ? `当前进度（集/节数）（上次：${lastProgress}）` : "当前进度（集/节数）";

    const input = await quickAddApi.inputPrompt(progressPrompt);
    if (input === null || input === undefined || input === '') return;

    const progressNum = parseInt(input, 10);
    if (isNaN(progressNum)) {
        new Notice("请输入有效数字");
        return;
    }

    // Update 进度 frontmatter in the course file
    if (!courseFile) {
        new Notice("找不到课程文件: " + selected);
        return;
    }
    await app.fileManager.processFrontMatter(courseFile, (fm) => {
        fm['进度'] = progressNum;
    });

    // Log to today's daily note under the 课程 section
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dailyPath = `日记/${yyyy}/${yyyy}-${mm}-${dd}.md`;
    const dailyFile = app.vault.getAbstractFileByPath(dailyPath);

    if (!dailyFile) {
        new Notice("✅ 已更新课程进度，但找不到今日日记");
        return;
    }

    var content = await app.vault.read(dailyFile);
    var newEntry = "- [[" + selected + "]] 进度:: " + progressNum;

    const cache = app.metadataCache.getFileCache(dailyFile);
    const headings = (cache && cache.headings) || [];

    // Find heading that ends with 课程
    var targetHeading = null;
    for (var i = 0; i < headings.length; i++) {
        if (headings[i].heading.endsWith("课程")) {
            targetHeading = headings[i];
            break;
        }
    }

    if (!targetHeading) {
        new Notice("✅ 已更新课程进度，但日记中没有找到课程标题");
        return;
    }

    var lines = content.split("\n");
    var startLine = targetHeading.position.start.line;

    // Find end of this section (next heading of same or higher level)
    var endLine = lines.length;
    for (var j = 0; j < headings.length; j++) {
        if (headings[j].position.start.line > startLine && headings[j].level <= targetHeading.level) {
            endLine = headings[j].position.start.line;
            break;
        }
    }

    // Check if entry already exists in this section
    var searchStr = "- [[" + selected + "]] 进度:: ";
    var existingLineIndex = -1;
    for (var k = startLine + 1; k < endLine; k++) {
        if (lines[k].indexOf(searchStr) === 0) {
            existingLineIndex = k;
            break;
        }
    }

    if (existingLineIndex !== -1) {
        lines[existingLineIndex] = newEntry;
        await app.vault.modify(dailyFile, lines.join("\n"));
        new Notice("✅ 已更新: " + selected + " 进度 → " + progressNum);
    } else {
        lines.splice(endLine, 0, newEntry);
        await app.vault.modify(dailyFile, lines.join("\n"));
        new Notice("✅ 已记录: " + selected + " 进度 → " + progressNum);
    }
};
