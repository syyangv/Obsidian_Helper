module.exports = {
    entry: async (params, settings) => {
        const { app, quickAddApi } = params;
        const file = app.workspace.getActiveFile();
        if (!file) {
            new Notice("No active file");
            return;
        }

        const fm = app.metadataCache.getFileCache(file)?.frontmatter || {};
        const field = (settings && settings.field) || "体重";
        const label = (settings && settings.label) || "⚖️ 今日体重";

        const weight = await quickAddApi.inputPrompt(
            label + " (lb)",
            "",
            String(fm[field] ?? "")
        );
        if (weight === null) return;

        const val = parseFloat(weight);
        if (Number.isNaN(val)) {
            new Notice("请输入有效数字");
            return;
        }

        await app.fileManager.processFrontMatter(file, (frontmatter) => {
            frontmatter[field] = val;
        });

        new Notice("✅ " + label + "已更新: " + val);
    },
    settings: {
        name: "Edit Weight Field",
        author: "syang",
        options: {
            field: {
                type: "text",
                defaultValue: "体重",
                placeholder: "Frontmatter field name"
            },
            label: {
                type: "text",
                defaultValue: "⚖️ 今日体重",
                placeholder: "Display label"
            }
        }
    }
};
