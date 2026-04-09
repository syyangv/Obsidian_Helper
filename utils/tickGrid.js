// Templater function for creating tick grids
// Save this as: Scripts/tickGrid.js in your vault
// Then call with: <%* tR += await tp.user.tickGrid(5) %>

function tickGrid(count, options = {}) {
    // Default options
    const defaults = {
        theme: '', // 'success', 'warning', 'danger', or ''
        size: '', // 'compact', 'large', or ''
        startNumber: 1
    };
    
    const opts = { ...defaults, ...options };
    
    // Build class string
    let containerClass = 'tick-container';
    if (opts.theme) containerClass += ` ${opts.theme}`;
    if (opts.size) containerClass += ` ${opts.size}`;
    
    // Generate the HTML
    let html = `<div class="${containerClass}">\n`;
    
    for (let i = opts.startNumber; i < opts.startNumber + count; i++) {
        html += `  <label class="tick-box">\n`;
        html += `    <input type="checkbox">\n`;
        html += `    <span class="tick-label">${i}</span>\n`;
        html += `  </label>\n`;
    }
    
    html += `</div>`;
    
    return html;
}

// Export for Templater
module.exports = tickGrid;