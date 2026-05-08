---
modified_at: 2026-01-22
---
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

    // Function to create progress bar (SVG pill — matches 绿卡.md style)
    function createProgressBar(percentage) {
        if (typeof percentage !== 'number' || isNaN(percentage)) {
            percentage = 0;
        }

        const pct    = Math.min(100, Math.max(0, percentage));
        const W = 200, H = 16, R = 8;
        const filled = (pct / 100) * W;

        const [c1, c2] =
            percentage >= 100 ? ["#86efac","#4ade80"] :
            percentage >= 75  ? ["#4ade80","#16a34a"] :
            percentage >= 50  ? ["#fbbf24","#ca8a04"] :
            percentage >= 25  ? ["#fb923c","#ea580c"] :
                                ["#f87171","#dc2626"];

        const gId = "pg_" + Math.random().toString(36).slice(2, 7);
        const cId = "cl_" + Math.random().toString(36).slice(2, 7);

        return `<svg width="${W}" height="${H}" style="vertical-align:middle">
  <defs>
    <linearGradient id="${gId}" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0%"   stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <clipPath id="${cId}"><rect width="${W}" height="${H}" rx="${R}"/></clipPath>
  </defs>
  <rect width="${W}" height="${H}" rx="${R}" fill="#e5e7eb"/>
  <rect width="${filled}" height="${H}" fill="url(#${gId})" clip-path="url(#${cId})"/>
</svg><span style="margin-left:8px;font-size:1.1em;">${Math.max(0, percentage).toFixed(1)}%</span>`;
    }

    function buildTable(container, headers, rows) {
        container.empty();
        const tbl = container.createEl("table", { cls: "dataview table-view-table" });
        const hrow = tbl.createEl("thead").createEl("tr");
        headers.forEach(h => hrow.createEl("th", { text: h }));
        const tbody = tbl.createEl("tbody");
        rows.forEach(row => {
            const tr = tbody.createEl("tr");
            row.forEach(cell => {
                const td = tr.createEl("td");
                if (typeof cell === "string" && cell.includes("<svg")) {
                    td.innerHTML = cell;
                } else {
                    td.innerHTML = String(cell);
                }
            });
        });
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

    buildTable(dv.container, ["Category", "Credit", "已用", "剩余", "Usage"], rows);

} catch (error) {
    console.error('Amex Platinum Reward Error:', error);
    dv.paragraph('⚠️ Error: ' + error.message);
} finally {
    // Always clear running flag
    window[containerId + '_running'] = false;
}
})();
```
