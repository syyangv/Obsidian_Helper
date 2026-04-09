module.exports = async (params) => {
    const { app } = params;
    const file = app.workspace.getActiveFile();
    if (!file) {
        new Notice("No active file");
        return;
    }

    const cache = app.metadataCache.getFileCache(file);
    const fm = cache && cache.frontmatter;
    const activityTags = fm && fm.activity_tags
        ? (Array.isArray(fm.activity_tags) ? fm.activity_tags : [fm.activity_tags])
        : [];
    const hasTherapy = activityTags.includes("therapy");

    if (hasTherapy) {
        // --- REMOVE ---
        // 1. Remove from activity_tags
        await app.fileManager.processFrontMatter(file, (fm) => {
            if (Array.isArray(fm.activity_tags)) {
                fm.activity_tags = fm.activity_tags.filter(t => t !== "therapy");
            }
        });

        // 2. Remove # Therapy section only if it has no content
        const content = await app.vault.read(file);
        const lines = content.split("\n");
        const startIdx = lines.findIndex(l => l.trim() === "# Therapy");
        if (startIdx !== -1) {
            // Find where the section ends (next h1 or end of file)
            let endIdx = lines.length;
            for (let i = startIdx + 1; i < lines.length; i++) {
                if (lines[i].match(/^# /)) {
                    endIdx = i;
                    break;
                }
            }
            // Check if there's any non-blank content in the section
            const hasContent = lines.slice(startIdx + 1, endIdx).some(l => l.trim() !== "");
            if (hasContent) {
                new Notice("Therapy removed from log — section kept (has notes)");
                return;
            }
            // Trim trailing blank lines before the next section
            while (endIdx > startIdx && lines[endIdx - 1].trim() === "") endIdx--;
            lines.splice(startIdx, endIdx - startIdx);
            await app.vault.modify(file, lines.join("\n"));
        }

        new Notice("Therapy removed");
    } else {
        // --- ADD ---
        // 1. Add to activity_tags
        await app.fileManager.processFrontMatter(file, (fm) => {
            if (!fm.activity_tags) fm.activity_tags = [];
            if (!fm.activity_tags.includes("therapy")) fm.activity_tags.push("therapy");
        });

        // 2. Insert # Therapy section before # 3 Event
        const content = await app.vault.read(file);
        if (content.includes("\n# Therapy\n")) {
            new Notice("Therapy logged");
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
        lines.splice(eventHeading.position.start.line, 0, "# Therapy", "", "");
        await app.vault.modify(file, lines.join("\n"));
        new Notice("Therapy logged + section added");
    }
};
