// Meta Bind js action — runs via JS Engine.
// Globals available: app, engine, obsidian
// Must return an async function, which Meta Bind calls immediately.
return async () => {
    const date = await engine.prompt.text({
        title: "Date (MM-DD)",
        placeholder: "05-01",
    });
    if (!date) return;

    const trimmedDate = date.trim();
    if (!/^\d{2}-\d{2}$/.test(trimmedDate)) {
        new obsidian.Notice("❌ Date must be MM-DD (e.g. 05-01)");
        return;
    }

    const label = await engine.prompt.text({
        title: "Event label",
        placeholder: "Mom's Birthday",
    });
    if (!label) return;

    const type = await engine.prompt.suggester({
        placeholder: "Event type",
        options: [
            { label: "🎂 Birthday",    value: "birthday" },
            { label: "💍 Anniversary", value: "anniversary" },
            { label: "🏖️ Holiday",     value: "holiday" },
        ],
    });
    if (!type) return;

    const filePath = "个人整理/重要日期.md";
    const file = app.vault.getAbstractFileByPath(filePath);
    if (!file) {
        new obsidian.Notice("❌ 重要日期.md not found");
        return;
    }

    const content = await app.vault.read(file);
    const lines = content.split('\n');
    let lastTableRow = -1;
    for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].trim().startsWith('|')) {
            lastTableRow = i;
            break;
        }
    }

    if (lastTableRow === -1) {
        new obsidian.Notice("❌ Could not find table in 重要日期.md");
        return;
    }

    lines.splice(lastTableRow + 1, 0, `| ${trimmedDate} | ${label.trim()} | ${type} |`);
    await app.vault.modify(file, lines.join('\n'));
    new obsidian.Notice(`✅ Added: ${label.trim()} (${trimmedDate})`);
};
