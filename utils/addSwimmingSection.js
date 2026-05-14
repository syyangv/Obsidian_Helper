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
        await app.fileManager.processFrontMatter(file, (fm) => {
            fm.activity_swimming = false;
            if (Array.isArray(fm.activity_tags)) {
                fm.activity_tags = fm.activity_tags.filter(t => t !== "健身房");
            }
        });

        const content = await app.vault.read(file);
        const lines = content.split("\n");
        const startIdx = lines.findIndex(l => l.trim() === "# 游泳课");
        if (startIdx !== -1) {
            let endIdx = lines.length;
            for (let i = startIdx + 1; i < lines.length; i++) {
                if (lines[i].match(/^# /)) { endIdx = i; break; }
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
        await app.fileManager.processFrontMatter(file, (fm) => {
            if (!fm.activity_tags) fm.activity_tags = [];
            if (!fm.activity_tags.includes("健身房")) fm.activity_tags.push("健身房");
            fm.activity_swimming = true;
        });

        // Re-read after front matter is updated — positions are now accurate
        const content = await app.vault.read(file);
        if (content.includes("\n# 游泳课\n")) {
            new Notice("游泳课 logged");
            return;
        }

        // Insert before # Event using raw line search (not stale cache positions)
        const lines = content.split("\n");
        const eventIdx = lines.findIndex(l => l.trim() === "# Event");
        if (eventIdx === -1) {
            new Notice("Could not find Event section");
            return;
        }

        lines.splice(eventIdx, 0, "# 游泳课", "", "");
        await app.vault.modify(file, lines.join("\n"));
        new Notice("游泳课 logged + section added");
    }
};
