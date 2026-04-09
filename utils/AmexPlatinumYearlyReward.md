```dataviewjs
(async () => {
    // ===== PREVENT MULTIPLE SIMULTANEOUS EXECUTIONS =====
    const activeFile = app.workspace.getActiveFile();

    if (!activeFile) {
        dv.paragraph("⚠️ No active file detected.");
        return;
    }

    const containerId = 'amex-platinum-reward-' + activeFile.path;

    // If already running, skip this execution
    if (window[containerId + '_running']) {
        return;
    }

    // Set debounce timeout - only execute after 500ms of inactivity
    if (window[containerId + '_timeout']) {
        clearTimeout(window[containerId + '_timeout']);
    }

    await new Promise(resolve => {
        window[containerId + '_timeout'] = setTimeout(resolve, 500);
    });

    window[containerId + '_running'] = true;

try {
    const baseFolder = "年度记录";
    const dailyNotesFolder = "日记";
    const prefix = "AmexPlatinum_";

    const currentFileName = activeFile.basename || "";
    const yearMatch = currentFileName.match(/(\d{4})/);
    const selectedYear = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();

    // Custom row names (categories)
    const rowNames = {
        "AmexPlatinum_subscription": "Digital Subscription",
        "AmexPlatinum_shopping": "Lululemon",
        "AmexPlatinum_oura": "Oura Ring",
        "AmexPlatinum_carInsurance": "Car Insurance",
        "AmexPlatinum_healthInsurance": "Health Insurance",
        "AmexPlatinum_entertainment": "Entertainment",
        "AmexPlatinum_transportation": "Transportation",
        "AmexPlatinum_internet": "Internet",
        "AmexPlatinum_phone": "Phone",
        "AmexPlatinum_flight_dollar_value": "Flight Points Value"
    };

    // Special categories that don't show percentages
    const nonPercentageCategories = ["AmexPlatinum_flight_dollar_value"];

    // Auto-convert camelCase to Title Case
    function camelToTitle(camelCase) {
        if (!camelCase || typeof camelCase !== 'string') {
            return 'Unknown';
        }
        let name = camelCase.replace(new RegExp(`^${prefix}`, 'i'), '');
        name = name.replace(/([A-Z])/g, ' $1');
        name = name.charAt(0).toUpperCase() + name.slice(1);
        return name.trim();
    }

    // Function to create progress bar
    function createProgressBar(percentage) {
        if (typeof percentage !== 'number' || isNaN(percentage)) {
            percentage = 0;
        }

        const displayPercentage = Math.max(0, percentage);
        const clampedForBar = Math.min(100, displayPercentage);

        const width = 20;
        const filled = Math.round((clampedForBar / 100) * width);
        const empty = width - filled;

        let bar = "";
        if (displayPercentage >= 100) {
            bar = "🟩".repeat(width);
        } else if (displayPercentage >= 75) {
            bar = "🟩".repeat(filled) + "⬛".repeat(empty);
        } else if (displayPercentage >= 50) {
            bar = "🟨".repeat(filled) + "⬛".repeat(empty);
        } else if (displayPercentage >= 25) {
            bar = "🟧".repeat(filled) + "⬛".repeat(empty);
        } else {
            bar = "🟥".repeat(filled) + "⬛".repeat(empty);
        }

        return `${bar} ${displayPercentage.toFixed(1)}%`;
    }

    // Get expenses from base folder
    let expensePages;
    try {
        expensePages = dv.pages(`"${baseFolder}/${selectedYear}"`);
    } catch (e) {
        expensePages = [];
    }

    const yearTotals = {};

    for (let page of expensePages) {
        if (!page || !page.file) {
            continue;
        }

        const frontmatter = page.file.frontmatter;

        if (!frontmatter || typeof frontmatter !== 'object') {
            continue;
        }

        for (let key in frontmatter) {
            if (key && key.startsWith(prefix)) {
                const value = frontmatter[key];

                if (typeof value === 'number' && !isNaN(value)) {
                    if (!yearTotals[key]) {
                        yearTotals[key] = 0;
                    }
                    yearTotals[key] += value;
                }
            }
        }
    }

    // Get credits from daily notes
    let dailyPages;
    try {
        dailyPages = dv.pages(`"${dailyNotesFolder}/${selectedYear}"`);
    } catch (e) {
        dailyPages = [];
    }

    const creditTotals = {};

    for (let page of dailyPages) {
        if (!page || !page.file) {
            continue;
        }

        const frontmatter = page.file.frontmatter;

        if (!frontmatter || typeof frontmatter !== 'object') {
            continue;
        }

        for (let key in frontmatter) {
            if (key && key.startsWith(prefix)) {
                const value = frontmatter[key];

                if (typeof value === 'number' && !isNaN(value)) {
                    if (!creditTotals[key]) {
                        creditTotals[key] = 0;
                    }
                    creditTotals[key] += value;
                }
            }
        }
    }

    // Combine all unique keys
    const allKeys = new Set([...Object.keys(yearTotals), ...Object.keys(creditTotals)]);

    if (allKeys.size === 0) {
        dv.paragraph(`📄 No Amex Platinum data found for ${selectedYear}. Make sure your notes have frontmatter properties starting with "${prefix}".`);
        return;
    }

    // Create table with progress bar column
    const rows = Array.from(allKeys)
        .sort()
        .map(key => {
            const displayName = rowNames[key] || camelToTitle(key);
            const expense = Math.round(yearTotals[key] || 0);
            const credit = Math.round(creditTotals[key] || 0);

            // For non-percentage categories, set net to 0
            const net = nonPercentageCategories.includes(key) ? 0 : expense - credit;
            const percentage = expense > 0 ? (credit / expense) * 100 : 0;

            // Check if this is a special non-percentage category
            const progressBar = nonPercentageCategories.includes(key)
                ? `$${credit}`
                : createProgressBar(percentage);

            return [displayName, expense, credit, net, progressBar];
        });

    // Add total row
    const totalExpense = rows.reduce((sum, row) => sum + (typeof row[1] === 'number' ? row[1] : 0), 0);
    const totalCredit = rows.reduce((sum, row) => sum + (typeof row[2] === 'number' ? row[2] : 0), 0);
    const totalNet = totalExpense - totalCredit;
    const totalPercentage = totalExpense > 0 ? (totalCredit / totalExpense) * 100 : 0;
    const totalProgressBar = createProgressBar(totalPercentage);

    rows.push([
        "**TOTAL**",
        totalExpense,
        `<span style="color: red;">$${totalCredit}</span>`,
        totalNet,
        totalProgressBar
    ]);

    dv.table(["Category", "Credit", "已用", "剩余", "Usage"], rows);

} catch (error) {
    console.error('Amex Platinum Reward Error:', error);
    dv.paragraph('⚠️ Error: ' + error.message);
} finally {
    // Always clear running flag
    window[containerId + '_running'] = false;
}
})();
```
