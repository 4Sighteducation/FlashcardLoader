// Vue Table UI Safe Enhancer - CSS Only, No DOM Manipulation
// This version ONLY applies styles and click handlers, no reordering

(function() {
    'use strict';
    
    // IMMEDIATE HIDE - Execute before anything else to prevent flash
    const immediateHideStyle = document.createElement('style');
    immediateHideStyle.id = 'vue-table-immediate-hide';
    immediateHideStyle.textContent = `
        /* Immediately hide both table views to prevent flash */
        #view_2772, #view_2776 {
            opacity: 0 !important;
            visibility: hidden !important;
        }
    `;
    document.head.appendChild(immediateHideStyle);
    
    const DEBUG = true;
    const log = (msg, data) => {
        if (DEBUG) console.log(`[VueTableSafe] ${msg}`, data || '');
    };
    
    log('🎨 Vue Table Safe Enhancer Initializing...');
    
    // Configuration - dynamically detect which view to target
    const CONFIG = {
        // Check if we have a config from the loader, otherwise default to view_2772
        targetView: window.DYNAMIC_STAFF_TABLE_1014_CONFIG?.targetView || 
                   (document.querySelector('#view_2772') ? '#view_2772' : '#view_2776'),
        checkInterval: 500,
        maxAttempts: 30,  // Increased attempts
        initialDelay: 2000  // Add 2 second initial delay
        // enableUserFiltering: false  // Disabled - keeping separate pages for different user types
    };
    
    log('Target view configured as:', CONFIG.targetView);
    
    // Strip HTML tags from text - more aggressive
    function stripHtmlTags(html) {
        if (!html) return '';
        
        // First, replace <br> tags with spaces
        let text = html.replace(/<br\s*\/?>/gi, ' ');
        
        // Then strip all other HTML tags
        const tmp = document.createElement('div');
        tmp.innerHTML = text;
        text = tmp.textContent || tmp.innerText || '';
        
        // Clean up extra whitespace
        return text.replace(/\s+/g, ' ').trim();
    }
    
    // Get first sentence from text
    function getFirstSentence(text) {
        if (!text) return '';
        
        // Find the first sentence-ending punctuation
        const match = text.match(/^[^.!?]+[.!?]/);
        if (match) {
            return match[0];
        }
        
        // If no sentence ending found, take first 80 characters
        if (text.length > 80) {
            return text.substring(0, 80) + '...';
        }
        
        return text;
    }
    
    // Create modal HTML
    function createModal() {
        if (document.getElementById('vue-table-modal')) return;
        
        const modalHTML = `
            <div id="vue-table-modal" class="vue-table-modal">
                <div class="vue-table-modal-content">
                    <div class="vue-table-modal-header">
                        <h3 class="vue-table-modal-title">Content</h3>
                        <button class="vue-table-modal-close">&times;</button>
                    </div>
                    <div class="vue-table-modal-body"></div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Add event listeners
        const modal = document.getElementById('vue-table-modal');
        const closeBtn = modal.querySelector('.vue-table-modal-close');
        
        closeBtn.onclick = () => {
            modal.classList.remove('active');
        };
        
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        };
        
        log('Modal created');
    }
    
    // Show modal with content
    function showModal(title, content) {
        const modal = document.getElementById('vue-table-modal');
        const modalTitle = modal.querySelector('.vue-table-modal-title');
        const modalBody = modal.querySelector('.vue-table-modal-body');
        
        modalTitle.textContent = title;
        modalBody.textContent = stripHtmlTags(content);
        modal.classList.add('active');
    }
    
    // Inject styles based on actual column positions
    function injectAdaptiveStyles() {
        if (document.getElementById('vue-table-safe-styles')) return;
        
        // First, analyze the table to understand column positions
        const table = document.querySelector(`${CONFIG.targetView} table`);
        if (!table) {
            log('Table not found for style analysis');
            return;
        }
        
        const headers = table.querySelectorAll('thead th');
        const columnInfo = {};
        
        headers.forEach((th, idx) => {
            const text = th.textContent.trim().toLowerCase();
            columnInfo[text] = idx;
            log(`Column ${idx}: "${text}"`);
        });
        
        // Build adaptive styles based on actual column positions
        let columnStyles = '';
        
        // Narrow columns (Group, Year Group)
        if (columnInfo['group'] !== undefined) {
            columnStyles += `
                ${CONFIG.targetView} th:nth-child(${columnInfo['group'] + 1}),
                ${CONFIG.targetView} td:nth-child(${columnInfo['group'] + 1}) {
                    width: 80px !important;
                    max-width: 80px !important;
                }
            `;
        }
        
        if (columnInfo['year group'] !== undefined) {
            columnStyles += `
                ${CONFIG.targetView} th:nth-child(${columnInfo['year group'] + 1}),
                ${CONFIG.targetView} td:nth-child(${columnInfo['year group'] + 1}) {
                    width: 80px !important;
                    max-width: 80px !important;
                }
            `;
        }
        
        // Score columns (V, E, S, P, A, O) - make them narrow
        ['v', 'e', 's', 'p', 'a', 'o'].forEach(letter => {
            if (columnInfo[letter] !== undefined) {
                columnStyles += `
                    ${CONFIG.targetView} th:nth-child(${columnInfo[letter] + 1}),
                    ${CONFIG.targetView} td:nth-child(${columnInfo[letter] + 1}) {
                        width: 40px !important;
                        max-width: 40px !important;
                        text-align: center !important;
                    }
                `;
            }
        });
        
        // Text columns (Report Response, Action Plan) - with color indicators
        if (columnInfo['report response'] !== undefined) {
            columnStyles += `
                ${CONFIG.targetView} th:nth-child(${columnInfo['report response'] + 1}) {
                    min-width: 220px !important;
                }
                ${CONFIG.targetView} td:nth-child(${columnInfo['report response'] + 1}) {
                    min-width: 220px !important;
                    max-width: 320px !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    line-height: 1.5 !important;
                    font-size: 13px !important;
                    padding: 8px 12px !important;
                    cursor: pointer !important;
                    vertical-align: middle !important;
                    position: relative !important;
                    border-left: 4px solid transparent !important;
                    transition: all 0.2s ease !important;
                }
                ${CONFIG.targetView} td:nth-child(${columnInfo['report response'] + 1}).has-content {
                    border-left-color: #10b981 !important;
                    background: rgba(16, 185, 129, 0.04) !important;
                    color: #065f46 !important;
                }
                ${CONFIG.targetView} td:nth-child(${columnInfo['report response'] + 1}).no-content {
                    border-left-color: #ef4444 !important;
                    background: rgba(239, 68, 68, 0.04) !important;
                    color: #991b1b !important;
                    font-style: italic !important;
                }
                ${CONFIG.targetView} td:nth-child(${columnInfo['report response'] + 1}):hover {
                    background: rgba(7, 155, 170, 0.08) !important;
                    transform: translateX(2px) !important;
                }
            `;
        }
        
        if (columnInfo['action plan'] !== undefined) {
            columnStyles += `
                ${CONFIG.targetView} th:nth-child(${columnInfo['action plan'] + 1}) {
                    min-width: 220px !important;
                }
                ${CONFIG.targetView} td:nth-child(${columnInfo['action plan'] + 1}) {
                    min-width: 220px !important;
                    max-width: 320px !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    line-height: 1.5 !important;
                    font-size: 13px !important;
                    padding: 8px 12px !important;
                    cursor: pointer !important;
                    vertical-align: middle !important;
                    position: relative !important;
                    border-left: 4px solid transparent !important;
                    transition: all 0.2s ease !important;
                }
                ${CONFIG.targetView} td:nth-child(${columnInfo['action plan'] + 1}).has-content {
                    border-left-color: #10b981 !important;
                    background: rgba(16, 185, 129, 0.04) !important;
                    color: #065f46 !important;
                }
                ${CONFIG.targetView} td:nth-child(${columnInfo['action plan'] + 1}).no-content {
                    border-left-color: #ef4444 !important;
                    background: rgba(239, 68, 68, 0.04) !important;
                    color: #991b1b !important;
                    font-style: italic !important;
                }
                ${CONFIG.targetView} td:nth-child(${columnInfo['action plan'] + 1}):hover {
                    background: rgba(7, 155, 170, 0.08) !important;
                    transform: translateX(2px) !important;
                }
            `;
        }
        
        const styles = `
            <style id="vue-table-safe-styles">
                /* Enhanced title styling */
                ${CONFIG.targetView} .kn-title h1,
                ${CONFIG.targetView} .kn-title h2,
                ${CONFIG.targetView} .view-header h1,
                ${CONFIG.targetView} .view-header h2 {
                    text-transform: uppercase !important;
                    letter-spacing: 2px !important;
                    font-weight: 700 !important;
                    color: #2a3c7a !important;
                    font-size: 24px !important;
                    margin-bottom: 20px !important;
                    text-align: center !important;
                    position: relative !important;
                    padding-bottom: 15px !important;
                }
                
                ${CONFIG.targetView} .kn-title h1:after,
                ${CONFIG.targetView} .kn-title h2:after,
                ${CONFIG.targetView} .view-header h1:after,
                ${CONFIG.targetView} .view-header h2:after {
                    content: '' !important;
                    position: absolute !important;
                    bottom: 0 !important;
                    left: 50% !important;
                    transform: translateX(-50%) !important;
                    width: 80px !important;
                    height: 3px !important;
                    background: linear-gradient(90deg, #079baa 0%, #00e5db 100%) !important;
                    border-radius: 2px !important;
                }
                
                /* Info section for cycle filters */
                .cycle-filter-info {
                    background: linear-gradient(135deg, #f0fdfa 0%, #e6fffa 100%);
                    border: 1px solid #5eead4;
                    border-radius: 10px;
                    padding: 20px;
                    margin: 20px auto;
                    max-width: 900px;
                    box-shadow: 0 2px 10px rgba(94, 234, 212, 0.1);
                }
                
                .cycle-filter-info h3 {
                    color: #0f766e;
                    margin: 0 0 12px 0;
                    font-size: 18px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .cycle-filter-info h3::before {
                    content: 'ℹ️';
                    font-size: 20px;
                }
                
                .cycle-filter-info p {
                    color: #134e4a;
                    margin: 0 0 10px 0;
                    line-height: 1.6;
                    font-size: 14px;
                }
                
                .cycle-filter-info ul {
                    margin: 10px 0 0 20px;
                    padding: 0;
                    list-style: none;
                }
                
                .cycle-filter-info li {
                    color: #134e4a;
                    padding: 5px 0;
                    position: relative;
                    padding-left: 25px;
                    font-size: 14px;
                }
                
                .cycle-filter-info li::before {
                    content: '▸';
                    position: absolute;
                    left: 0;
                    color: #10b981;
                    font-weight: bold;
                }
                
                /* Fix table positioning - ensure it stays in place */
                ${CONFIG.targetView} {
                    min-height: 600px !important;
                    position: relative !important;
                }
                
                /* Prevent table from jumping when filtering */
                ${CONFIG.targetView} .p-datatable-wrapper,
                ${CONFIG.targetView} [data-v-app] {
                    min-height: 500px !important;
                    transition: none !important;
                }
                
                ${CONFIG.targetView} .p-paginator {
                    position: relative !important;
                    background: white !important;
                    z-index: 5 !important;
                    padding: 10px !important;
                    border-top: 1px solid #e5e7eb !important;
                    margin-top: 20px !important;
                }
                
                /* Table container */
                ${CONFIG.targetView} .kn-rich_text__content {
                    padding: 0 !important;
                    overflow-x: auto !important;
                }
                
                /* Table base styles with mobile responsiveness */
                ${CONFIG.targetView} table {
                    width: 100% !important;
                    table-layout: auto !important;
                    border-collapse: separate !important;
                    border-spacing: 0 !important;
                    border-radius: 12px !important;
                    overflow: hidden !important;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.08) !important;
                    background: white !important;
                }
                
                /* Mobile responsive wrapper */
                @media (max-width: 768px) {
                    ${CONFIG.targetView} {
                        padding: 10px !important;
                    }
                    
                    ${CONFIG.targetView} table {
                        font-size: 12px !important;
                        border-radius: 8px !important;
                    }
                    
                    ${CONFIG.targetView} th,
                    ${CONFIG.targetView} td {
                        padding: 8px 4px !important;
                        font-size: 11px !important;
                    }
                    
                    ${CONFIG.targetView} .kn-title h1,
                    ${CONFIG.targetView} .kn-title h2 {
                        font-size: 18px !important;
                        letter-spacing: 1px !important;
                    }
                    
                    .cycle-filter-info {
                        margin: 10px !important;
                        padding: 15px !important;
                    }
                    
                    .cycle-filter-info h3 {
                        font-size: 16px !important;
                    }
                    
                    .cycle-filter-info p,
                    .cycle-filter-info li {
                        font-size: 12px !important;
                    }
                    
                    /* Hide less important columns on mobile */
                    ${CONFIG.targetView} th:nth-child(n+8),
                    ${CONFIG.targetView} td:nth-child(n+8) {
                        display: none !important;
                    }
                    
                    /* Make buttons smaller on mobile */
                    ${CONFIG.targetView} button {
                        padding: 4px 8px !important;
                        font-size: 10px !important;
                    }
                }
                
                @media (max-width: 480px) {
                    /* Even more aggressive mobile optimization */
                    ${CONFIG.targetView} th,
                    ${CONFIG.targetView} td {
                        padding: 6px 2px !important;
                        font-size: 10px !important;
                    }
                    
                    /* Show only essential columns */
                    ${CONFIG.targetView} th:nth-child(n+6),
                    ${CONFIG.targetView} td:nth-child(n+6) {
                        display: none !important;
                    }
                }
                
                /* Headers */
                ${CONFIG.targetView} thead th {
                    background: linear-gradient(135deg, #079baa 0%, #00b8d4 100%) !important;
                    color: white !important;
                    padding: 12px 8px !important;
                    font-weight: 600 !important;
                    font-size: 13px !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.3px !important;
                    border: none !important;
                    position: sticky !important;
                    top: 0 !important;
                    z-index: 10 !important;
                }
                
                /* Rows */
                ${CONFIG.targetView} tbody tr {
                    transition: all 0.2s ease !important;
                    border-bottom: 1px solid #f0f0f0 !important;
                }
                
                ${CONFIG.targetView} tbody tr:hover {
                    background-color: #f0f8ff !important;
                    transform: translateX(2px) !important;
                    box-shadow: 0 2px 8px rgba(7, 155, 170, 0.1) !important;
                }
                
                /* Cells */
                ${CONFIG.targetView} td {
                    padding: 12px 8px !important;
                    color: #333 !important;
                    font-size: 14px !important;
                    border: none !important;
                    vertical-align: middle !important;
                }
                
                /* Student name styling */
                ${CONFIG.targetView} td:first-child {
                    font-weight: 600 !important;
                    color: #23356f !important;
                }
                
                /* Adaptive column widths */
                ${columnStyles}
                
                /* Report buttons and filter buttons */
                ${CONFIG.targetView} button {
                    background: linear-gradient(135deg, #079baa 0%, #00e5db 100%) !important;
                    color: white !important;
                    border: none !important;
                    padding: 6px 16px !important;
                    border-radius: 6px !important;
                    font-weight: 500 !important;
                    font-size: 12px !important;
                    cursor: pointer !important;
                    transition: all 0.3s ease !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.5px !important;
                    box-shadow: 0 2px 8px rgba(7, 155, 170, 0.2) !important;
                }
                
                ${CONFIG.targetView} button:hover {
                    transform: translateY(-2px) !important;
                    box-shadow: 0 4px 12px rgba(7, 155, 170, 0.3) !important;
                }
                
                /* Style filter/pagination buttons specifically */
                ${CONFIG.targetView} .p-paginator button,
                ${CONFIG.targetView} .p-button {
                    min-width: 36px !important;
                    height: 36px !important;
                    padding: 0 !important;
                    margin: 0 2px !important;
                    display: inline-flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                }
                
                ${CONFIG.targetView} .p-paginator .p-button.p-highlight {
                    background: linear-gradient(135deg, #2a3c7a 0%, #079baa 100%) !important;
                    box-shadow: 0 2px 10px rgba(42, 60, 122, 0.3) !important;
                }
                
                /* Filter dropdowns styling */
                ${CONFIG.targetView} .p-dropdown {
                    border: 1px solid #d1d5db !important;
                    border-radius: 6px !important;
                    transition: all 0.2s ease !important;
                }
                
                ${CONFIG.targetView} .p-dropdown:hover {
                    border-color: #079baa !important;
                    box-shadow: 0 0 0 2px rgba(7, 155, 170, 0.1) !important;
                }
                
                ${CONFIG.targetView} .p-dropdown-label {
                    padding: 8px 12px !important;
                    font-size: 14px !important;
                    color: #374151 !important;
                }
                
                /* RAG Score Background Colors - Applied via JavaScript */
                ${CONFIG.targetView} td.score-null {
                    background: transparent !important;
                }
                
                ${CONFIG.targetView} td.score-low {
                    background: #fee2e2 !important; /* Light red for 1-3 */
                    color: #991b1b !important;
                    font-weight: 600 !important;
                }
                
                ${CONFIG.targetView} td.score-medium {
                    background: #fed7aa !important; /* Light orange for 4-5 */
                    color: #9a3412 !important;
                    font-weight: 600 !important;
                }
                
                ${CONFIG.targetView} td.score-good {
                    background: #bbf7d0 !important; /* Light green for 6-7 */
                    color: #14532d !important;
                    font-weight: 600 !important;
                }
                
                ${CONFIG.targetView} td.score-high {
                    background: #86efac !important; /* Darker green for 8-10 */
                    color: #14532d !important;
                    font-weight: 700 !important;
                }
                
                /* Modal styles */
                .vue-table-modal {
                    display: none;
                    position: fixed;
                    z-index: 10000;
                    left: 0;
                    top: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.5);
                    animation: fadeIn 0.3s;
                }
                
                .vue-table-modal.active {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                
                .vue-table-modal-content {
                    background: white;
                    padding: 30px;
                    border-radius: 12px;
                    max-width: 700px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                    animation: slideIn 0.3s;
                }
                
                .vue-table-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 2px solid #e5e7eb;
                }
                
                .vue-table-modal-title {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: #23356f;
                }
                
                .vue-table-modal-close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: #6b7280;
                    transition: color 0.2s;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                }
                
                .vue-table-modal-close:hover {
                    color: #ef4444;
                }
                
                .vue-table-modal-body {
                    color: #374151;
                    line-height: 1.8;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    font-size: 15px;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes slideIn {
                    from {
                        transform: translateY(-20px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
        log('Adaptive styles injected');
    }
    
    // Update filter placeholders
    function updateFilterPlaceholders() {
        // Find filter inputs
        const filterInputs = document.querySelectorAll(`${CONFIG.targetView} input[placeholder*="FILTER"]`);
        filterInputs.forEach(input => {
            input.placeholder = 'Filter';
        });
        
        // Also check for dropdown filters
        const filterDropdowns = document.querySelectorAll(`${CONFIG.targetView} .p-dropdown-label`);
        filterDropdowns.forEach(dropdown => {
            if (dropdown.textContent.includes('FILTER')) {
                dropdown.textContent = 'Filter';
            }
        });
        
        log('Filter placeholders updated');
    }
    
    // Add info section about cycle filters
    function addCycleFilterInfo() {
        // Check if info section already exists
        if (document.querySelector('.cycle-filter-info')) {
            return;
        }
        
        // Find the table or view container
        const viewContainer = document.querySelector(CONFIG.targetView);
        if (!viewContainer) {
            log('View container not found for cycle filter info');
            return;
        }
        
        // Create the info section HTML
        const infoHTML = `
            <div class="cycle-filter-info">
                <h3>Understanding Cycle Filters</h3>
                <p>The numbered tabs above filter students based on their questionnaire completion status:</p>
                <ul>
                    <li><strong>Tab "1":</strong> Shows ALL students (including those who haven't completed any questionnaires)</li>
                    <li><strong>Tab "2":</strong> Shows ONLY students who have completed the Cycle 2 questionnaire</li>
                    <li><strong>Tab "3":</strong> Shows ONLY students who have completed the Cycle 3 questionnaire</li>
                    <li><strong>Tab "4+":</strong> Each subsequent tab shows students who have completed that specific cycle</li>
                </ul>
                <p><em>Note: Students must have completed the specific cycle's questionnaire to appear when that filter is selected.</em></p>
            </div>
        `;
        
        // Find the best place to insert it (after filters/pagination if visible, otherwise before table)
        const paginatorElement = viewContainer.querySelector('.p-paginator');
        const tableElement = viewContainer.querySelector('table');
        const titleElement = viewContainer.querySelector('.kn-title, .view-header, h1, h2');
        
        // Try to insert after pagination/filter buttons if they exist at the top
        if (paginatorElement && paginatorElement.offsetTop < 200) {
            // Paginator is at the top (filters)
            paginatorElement.insertAdjacentHTML('afterend', infoHTML);
            log('Cycle filter info added after filters');
        } else if (tableElement) {
            // Insert before the table's parent container
            const tableParent = tableElement.closest('.p-datatable, .kn-table, [data-v-app]') || tableElement.parentElement;
            tableParent.insertAdjacentHTML('beforebegin', infoHTML);
            log('Cycle filter info added before table');
        } else if (titleElement) {
            // Insert after the title
            titleElement.insertAdjacentHTML('afterend', infoHTML);
            log('Cycle filter info added after title');
        } else {
            // Insert at the beginning of the view
            viewContainer.insertAdjacentHTML('afterbegin', infoHTML);
            log('Cycle filter info added at beginning of view');
        }
    }
    
    // Add click handlers to text cells WITHOUT moving them
    function addTextCellHandlers(table) {
        const headers = table.querySelectorAll('thead th');
        let responseColumnIndex = -1;
        let actionColumnIndex = -1;
        
        // Find the actual column indices - be more flexible with naming
        headers.forEach((th, idx) => {
            const text = th.textContent.trim().toLowerCase();
            // Check for various possible names
            if (text.includes('report response') || text === 'report response') {
                responseColumnIndex = idx;
            }
            if (text.includes('action plan') || text === 'action plan' || text.includes('goal')) {
                actionColumnIndex = idx;
            }
        });
        
        // If we still haven't found them, look for the columns by position
        // Based on your screenshot, Report Response seems to be around column 10-11
        // and Action Plan around column 11-12
        if (responseColumnIndex === -1 || actionColumnIndex === -1) {
            log('Columns not found by name, checking by content patterns...');
            const firstRow = table.querySelector('tbody tr');
            if (firstRow) {
                const cells = firstRow.querySelectorAll('td');
                cells.forEach((cell, idx) => {
                    const text = cell.textContent.trim();
                    // Look for cells with longer text content
                    if (text.length > 50) {
                        if (responseColumnIndex === -1) {
                            responseColumnIndex = idx;
                        } else if (actionColumnIndex === -1 && idx !== responseColumnIndex) {
                            actionColumnIndex = idx;
                        }
                    }
                });
            }
        }
        
        log(`Found Report Response at column ${responseColumnIndex}, Action Plan at ${actionColumnIndex}`);
        
        // Add handlers to the cells
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            
            // Handle Report Response column
            if (responseColumnIndex >= 0 && cells[responseColumnIndex]) {
                const cell = cells[responseColumnIndex];
                const originalText = cell.innerHTML;
                const cleanText = stripHtmlTags(originalText);
                
                // Clear existing classes
                cell.classList.remove('has-content', 'no-content');
                
                if (cleanText.trim()) {
                    // Has content - show first sentence
                    const truncated = getFirstSentence(cleanText);
                    cell.textContent = truncated;
                    cell.classList.add('has-content');
                    cell.title = 'Click to read full response';
                    
                    // Store full text for modal
                    cell.dataset.fullText = cleanText;
                    
                    cell.onclick = () => {
                        const studentName = cells[0] ? cells[0].textContent : 'Student';
                        showModal(`${studentName} - Report Response`, cleanText);
                    };
                } else {
                    // No content - show indicator
                    cell.textContent = 'No response added';
                    cell.classList.add('no-content');
                    cell.title = 'No response provided';
                    cell.onclick = null;
                }
            }
            
            // Handle Action Plan column
            if (actionColumnIndex >= 0 && cells[actionColumnIndex]) {
                const cell = cells[actionColumnIndex];
                const originalText = cell.innerHTML;
                const cleanText = stripHtmlTags(originalText);
                
                // Clear existing classes
                cell.classList.remove('has-content', 'no-content');
                
                if (cleanText.trim()) {
                    // Has content - show first sentence
                    const truncated = getFirstSentence(cleanText);
                    cell.textContent = truncated;
                    cell.classList.add('has-content');
                    cell.title = 'Click to read full action plan';
                    
                    // Store full text for modal
                    cell.dataset.fullText = cleanText;
                    
                    cell.onclick = () => {
                        const studentName = cells[0] ? cells[0].textContent : 'Student';
                        showModal(`${studentName} - Action Plan`, cleanText);
                    };
                } else {
                    // No content - show indicator
                    cell.textContent = 'No action plan added';
                    cell.classList.add('no-content');
                    cell.title = 'No action plan provided';
                    cell.onclick = null;
                }
            }
        });
        
        log('Text cell handlers added');
    }
    
    // Filter table rows based on user connections
    // DISABLED: Keeping separate pages for different user types due to Vue app limitations
    function filterTableByUserConnections(table) {
        return; // Disabled - Vue app only works for staff admins
        
        /* Original filtering code preserved below for future reference
        if (!CONFIG.enableUserFiltering) return;
        
        log('Checking if user filtering is needed...');
        
        // Get current user
        const user = Knack.getUserAttributes();
        if (!user) {
            log('No user found, skipping filtering');
            return;
        }
        
        // Check user roles
        const roles = user.values?.field_73 || user.field_73 || [];
        const profileKeys = user.values?.profile_keys || user.profile_keys || [];
        const allRoles = [...(Array.isArray(roles) ? roles : [roles]), 
                         ...(Array.isArray(profileKeys) ? profileKeys : [profileKeys])];
        
        log('User roles:', allRoles);
        
        // Determine if user should see all records
        const isStaffAdmin = allRoles.includes('profile_5');
        const isSuperUser = allRoles.includes('profile_21');
        const isTutor = allRoles.includes('profile_7');
        
        if (isStaffAdmin || isSuperUser) {
            log('Staff admin or super user detected - showing all records');
            return;
        }
        
        if (!isTutor) {
            log('Not a tutor - no filtering rules defined yet');
            return;
        }
        
        // For tutors, we need to filter
        log('Tutor detected - will filter records based on connections');
        
        // Get tutor's email (this is how they're connected in field_145)
        const tutorEmail = user.email;
        log('Tutor email:', tutorEmail);
        
        // We need to check each row to see if this tutor is connected
        const rows = table.querySelectorAll('tbody tr');
        let hiddenCount = 0;
        
        rows.forEach((row, index) => {
            // Try to find connection data in the row
            // This is tricky because we need to know which column has the tutor connections
            // For now, let's log what we find
            
            const cells = row.querySelectorAll('td');
            
            // Log first row structure to understand the data
            if (index === 0) {
                log('First row structure:');
                cells.forEach((cell, cellIndex) => {
                    const text = cell.textContent.trim();
                    if (text.length > 0 && text.length < 100) {
                        log(`  Cell ${cellIndex}: ${text.substring(0, 50)}`);
                    }
                });
            }
            
            // For now, let's check if the tutor's name or email appears anywhere in the row
            const rowText = row.textContent.toLowerCase();
            const tutorName = user.name?.toLowerCase() || '';
            const tutorEmailLower = tutorEmail.toLowerCase();
            
            // Check if this student is connected to the tutor
            // This is a simplified check - we'd need to know the exact column structure
            const isConnected = rowText.includes(tutorEmailLower) || 
                               (tutorName && rowText.includes(tutorName));
            
            if (!isConnected) {
                // Hide rows that aren't connected to this tutor
                row.style.display = 'none';
                hiddenCount++;
            }
        });
        
        log(`Filtered table: Hidden ${hiddenCount} of ${rows.length} rows`);
        
        // Add a notice about filtering
        if (hiddenCount > 0) {
            const notice = document.createElement('div');
            notice.className = 'filter-notice';
            notice.style.cssText = `
                padding: 10px;
                background: #079baa;
                color: white;
                margin-bottom: 10px;
                border-radius: 6px;
                font-size: 14px;
            `;
            notice.textContent = `Showing only students connected to you (${rows.length - hiddenCount} of ${rows.length} total)`;
            
            const tableContainer = table.parentElement;
            if (tableContainer && !tableContainer.querySelector('.filter-notice')) {
                tableContainer.insertBefore(notice, table);
            }
        }
        */
    }
    
    // Apply RAG rating colors to VESPAO score cells
    function applyScoreRAGRating(table) {
        // Find VESPAO column indices
        const headers = table.querySelectorAll('thead th');
        const scoreColumns = [];
        
        headers.forEach((th, idx) => {
            const text = th.textContent.trim().toUpperCase();
            // Look for V, E, S, P, A, O columns
            if (text === 'V' || text === 'E' || text === 'S' || text === 'P' || text === 'A' || text === 'O') {
                scoreColumns.push(idx);
            }
        });
        
        log(`Found score columns at indices: ${scoreColumns.join(', ')}`);
        
        // Apply RAG classes to score cells
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            
            scoreColumns.forEach(colIdx => {
                if (cells[colIdx]) {
                    const cell = cells[colIdx];
                    const scoreText = cell.textContent.trim();
                    const score = parseInt(scoreText, 10);
                    
                    // Remove any existing score classes
                    cell.classList.remove('score-null', 'score-low', 'score-medium', 'score-good', 'score-high');
                    
                    // Apply appropriate class based on score
                    if (isNaN(score) || score === 0 || scoreText === '' || scoreText === 'No') {
                        cell.classList.add('score-null');
                    } else if (score >= 1 && score <= 3) {
                        cell.classList.add('score-low');
                    } else if (score >= 4 && score <= 5) {
                        cell.classList.add('score-medium');
                    } else if (score >= 6 && score <= 7) {
                        cell.classList.add('score-good');
                    } else if (score >= 8 && score <= 10) {
                        cell.classList.add('score-high');
                    }
                }
            });
        });
        
        log('RAG rating applied to score cells');
    }
    
    // Main enhancement function - NO DOM RESTRUCTURING
    async function enhanceVueTable() {
        let attempts = 0;
        
        const checkAndEnhance = setInterval(() => {
            attempts++;
            
            const table = document.querySelector(`${CONFIG.targetView} table`);
            
            if (table && table.querySelector('tbody tr')) {
                log('Vue table found with data, applying safe enhancements...');
                
                // Create modal
                createModal();
                
                // Inject adaptive styles
                injectAdaptiveStyles();
                
                // Add cycle filter info section (with slight delay to ensure DOM is ready)
                setTimeout(() => {
                    addCycleFilterInfo();
                }, 500);
                
                // Update filter placeholders
                updateFilterPlaceholders();
                
                // Add text cell handlers
                addTextCellHandlers(table);
                
                // Apply RAG rating to score cells
                applyScoreRAGRating(table);
                
                // Filter table based on user connections (disabled - using separate pages)
                // filterTableByUserConnections(table);
                
                // Watch for table updates
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'childList' && mutation.target.tagName === 'TBODY') {
                            log('Table data updated, reapplying handlers...');
                            setTimeout(() => {
                                const updatedTable = document.querySelector(`${CONFIG.targetView} table`);
                                if (updatedTable) {
                                    // Check if info section was removed during update
                                    if (!document.querySelector('.cycle-filter-info')) {
                                        setTimeout(() => addCycleFilterInfo(), 200);
                                    }
                                    addTextCellHandlers(updatedTable);
                                    updateFilterPlaceholders();
                                    applyScoreRAGRating(updatedTable);
                                    filterTableByUserConnections(updatedTable);
                                }
                            }, 100);
                        }
                    });
                });
                
                observer.observe(table, {
                    childList: true,
                    subtree: true
                });
                
                // Mark table as enhanced for the loader
                table.classList.add('enhanced');
                
                // Ensure table is visible and remove immediate hide
                const viewContainer = document.querySelector(CONFIG.targetView);
                if (viewContainer) {
                    viewContainer.style.opacity = '1';
                    viewContainer.style.visibility = 'visible';
                }
                
                // Remove the immediate hide style once enhanced
                const hideStyle = document.getElementById('vue-table-immediate-hide');
                if (hideStyle) {
                    hideStyle.remove();
                }
                
                log('✅ Vue table safely enhanced!');
                clearInterval(checkAndEnhance);
            } else if (attempts >= CONFIG.maxAttempts) {
                log('❌ Table not found after maximum attempts');
                
                // Still need to show the view even if enhancement failed
                const viewContainer = document.querySelector(CONFIG.targetView);
                if (viewContainer) {
                    viewContainer.style.opacity = '1';
                    viewContainer.style.visibility = 'visible';
                }
                
                // Remove the immediate hide style
                const hideStyle = document.getElementById('vue-table-immediate-hide');
                if (hideStyle) {
                    hideStyle.remove();
                }
                
                clearInterval(checkAndEnhance);
            }
        }, CONFIG.checkInterval);
    }
    
    // Initialize with better Vue app detection and loading screen coordination
    log('Coordinating with loading screen...');
    
    // Check if we have a loading screen active
    const hasLoadingScreen = document.querySelector('.vespa-loading-overlay');
    if (hasLoadingScreen) {
        log('Loading screen detected, enhancer will wait for Vue app');
    }
    
    // Wait for Vue app to be ready
    let initAttempts = 0;
    const initInterval = setInterval(() => {
        initAttempts++;
        
        // Check if the Vue app exists (look for Vue-specific attributes)
        const vueApp = document.querySelector(`${CONFIG.targetView} [data-v-app], ${CONFIG.targetView} .p-datatable, ${CONFIG.targetView} table`);
        
        if (vueApp) {
            // Check if there's an error state
            const hasError = document.querySelector(`${CONFIG.targetView} .error, ${CONFIG.targetView} .exception`);
            if (hasError) {
                log('⚠️ Vue app has errors, waiting...');
                if (initAttempts >= CONFIG.maxAttempts) {
                    clearInterval(initInterval);
                    log('❌ Vue app failed to recover from errors');
                }
                return;
            }
            
            // Vue app found, try to enhance
            clearInterval(initInterval);
            log('Vue app detected, attempting enhancement...');
            enhanceVueTable();
            
            // Also try after a delay as fallback
            setTimeout(() => {
                const table = document.querySelector(`${CONFIG.targetView} table`);
                if (table && !document.getElementById('vue-table-safe-styles')) {
                    log('Fallback enhancement triggered');
                    enhanceVueTable();
                }
            }, 2000);
        } else if (initAttempts >= CONFIG.maxAttempts) {
            clearInterval(initInterval);
            log('❌ Vue app not found after maximum attempts');
            
            // Make sure view is visible even if enhancement failed
            const viewContainer = document.querySelector(CONFIG.targetView);
            if (viewContainer) {
                viewContainer.style.opacity = '1';
                viewContainer.style.visibility = 'visible';
            }
            
            // Remove the immediate hide style
            const hideStyle = document.getElementById('vue-table-immediate-hide');
            if (hideStyle) {
                hideStyle.remove();
            }
        } else {
            log(`Waiting for Vue app (attempt ${initAttempts}/${CONFIG.maxAttempts})`);
        }
    }, CONFIG.checkInterval);
    
})();
