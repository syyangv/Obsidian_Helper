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

    const containerId = 'bilt-reward-' + activeFile.path;

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
    const fieldName = "bilt_flight_dollar_value";
    
    const currentFileName = activeFile.basename || "";
    const yearMatch = currentFileName.match(/(\d{4})/);
    const selectedYear = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();

    // Get total from base folder
    let expensePages;
    try {
        expensePages = dv.pages(`"${baseFolder}/${selectedYear}"`);
    } catch (e) {
        expensePages = [];
    }
    
    let total = 0;

    for (let page of expensePages) {
        if (!page || !page.file) {
            continue;
        }
        
        const frontmatter = page.file.frontmatter;
        
        if (!frontmatter || typeof frontmatter !== 'object') {
            continue;
        }
        
        const value = frontmatter[fieldName];
        if (typeof value === 'number' && !isNaN(value)) {
            total += value;
        }
    }

    // Get total from daily notes
    let dailyPages;
    try {
        dailyPages = dv.pages(`"${dailyNotesFolder}/${selectedYear}"`);
    } catch (e) {
        dailyPages = [];
    }

    for (let page of dailyPages) {
        if (!page || !page.file) {
            continue;
        }
        
        const frontmatter = page.file.frontmatter;
        
        if (!frontmatter || typeof frontmatter !== 'object') {
            continue;
        }
        
        const value = frontmatter[fieldName];
        if (typeof value === 'number' && !isNaN(value)) {
            total += value;
        }
    }

    // Round to integer
    total = Math.round(total);

    // Display
    dv.paragraph(`**Total:** <span style="color: red;">$${total}</span>`);

} catch (error) {
    console.error('Bilt Reward Error:', error);
    dv.paragraph('⚠️ Error: ' + error.message);
} finally {
    // Always clear running flag
    window[containerId + '_running'] = false;
}
})();
```