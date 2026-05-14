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
    var lines = content.split("\n");

    // Find 课程 section by raw text search — works for both normal headings
    // and headings inside columns code blocks (which cache.headings won't index)
    var startLine = -1;
    for (var i = 0; i < lines.length; i++) {
        if (/^##\s.*课程/.test(lines[i])) {
            startLine = i;
            break;
        }
    }

    if (startLine === -1) {
        new Notice("✅ 已更新课程进度，但日记中没有找到课程标题");
        return;
    }

    // Section ends at next === (columns separator), closing ```, or ## heading
    var endLine = lines.length;
    for (var j = startLine + 1; j < lines.length; j++) {
        var trimmed = lines[j].trim();
        if (trimmed === '===' || trimmed === '```' || /^#{1,2} /.test(lines[j])) {
            endLine = j;
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
