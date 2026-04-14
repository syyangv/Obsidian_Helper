module.exports = async (params) => {
    const { app, quickAddApi } = params;
    const file = app.workspace.getActiveFile();
    if (!file) { new Notice("No active file"); return; }

    const fm = app.metadataCache.getFileCache(file)?.frontmatter || {};

    const weight = await quickAddApi.inputPrompt("⚖️ 今日体重 (kg)", "", String(fm.体重 ?? ""));
    if (weight === null) return;

    const val = parseFloat(weight);
    if (isNaN(val)) { new Notice("请输入有效数字"); return; }

    await app.fileManager.processFrontMatter(file, (frontmatter) => {
        frontmatter.体重 = val;
    });

    new Notice("✅ 体重已更新: " + val);
};
