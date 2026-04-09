module.exports = async (params) => {
    const { app } = params;
    const file = app.workspace.getActiveFile();
    if (!file) {
        new Notice("No active file");
        return;
    }

    const cache = app.metadataCache.getFileCache(file);
    const fm = cache && cache.frontmatter;
    const isSwimming = fm && fm.activity_swimming === true;

    if (isSwimming) {
        // --- REMOVE ---
        // 1. Set activity_swimming to false and remove 健身房 from activity_tags
        await app.fileManager.processFrontMatter(file, (fm) => {
            fm.activity_swimming = false;
            if (Array.isArray(fm.activity_tags)) {
                fm.activity_tags = fm.activity_tags.filter(t => t !== "健身房");
            }
        });

        // 2. Remove # 游泳课 section only if it has no content
        const content = await app.vault.read(file);
        const lines = content.split("\n");
        const startIdx = lines.findIndex(l => l.trim() === "# 游泳课");
        if (startIdx !== -1) {
            let endIdx = lines.length;
            for (let i = startIdx + 1; i < lines.length; i++) {
                if (lines[i].match(/^# /)) {
                    endIdx = i;
                    break;
                }
            }
            const hasContent = lines.slice(startIdx + 1, endIdx).some(l => l.trim() !== "");
            if (hasContent) {
                new Notice("游泳课 removed from log — section kept (has notes)");
                return;
            }
            while (endIdx > startIdx && lines[endIdx - 1].trim() === "") endIdx--;
            lines.splice(startIdx, endIdx - startIdx);
            await app.vault.modify(file, lines.join("\n"));
        }

        new Notice("游泳课 removed");
    } else {
        // --- ADD ---
        // 1. Add 健身房 to activity_tags and set activity_swimming = true
        await app.fileManager.processFrontMatter(file, (fm) => {
            if (!fm.activity_tags) fm.activity_tags = [];
            if (!fm.activity_tags.includes("健身房")) fm.activity_tags.push("健身房");
            fm.activity_swimming = true;
        });

        // 2. Insert # 游泳课 section before # 3 Event
        const content = await app.vault.read(file);
        if (content.includes("\n# 游泳课\n")) {
            new Notice("游泳课 logged");
            return;
        }

        const headings = (cache && cache.headings) || [];
        let eventHeading = null;
        for (const h of headings) {
            if (h.level === 1 && h.heading.includes("Event")) {
                eventHeading = h;
                break;
            }
        }

        if (!eventHeading) {
            new Notice("Could not find Event section");
            return;
        }

        const lines = content.split("\n");
        lines.splice(eventHeading.position.start.line, 0, "# 游泳课", "", "");
        await app.vault.modify(file, lines.join("\n"));
        new Notice("游泳课 logged + section added");
    }
};
