// Vue Table UI Safe Enhancer - CSS Only, No DOM Manipulation
// This version ONLY applies styles and click handlers, no reordering

(function() {
    'use strict';
    
    const DEBUG = true;
    const log = (msg, data) => {
        if (DEBUG) console.log(`[VueTableSafe] ${msg}`, data || '');
    };
    
    log('🎨 Vue Table Safe Enhancer Initializing...');
    
    // Configuration
    const CONFIG = {
        targetView: '#view_2772',
        checkInterval: 500,
        maxAttempts: 20
    };
    
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
        const table = document.querySelector('#view_2772 table');
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
                #view_2772 th:nth-child(${columnInfo['group'] + 1}),
                #view_2772 td:nth-child(${columnInfo['group'] + 1}) {
                    width: 80px !important;
                    max-width: 80px !important;
                }
            `;
        }
        
        if (columnInfo['year group'] !== undefined) {
            columnStyles += `
                #view_2772 th:nth-child(${columnInfo['year group'] + 1}),
                #view_2772 td:nth-child(${columnInfo['year group'] + 1}) {
                    width: 80px !important;
                    max-width: 80px !important;
                }
            `;
        }
        
        // Score columns (V, E, S, P, A, O) - make them narrow
        ['v', 'e', 's', 'p', 'a', 'o'].forEach(letter => {
            if (columnInfo[letter] !== undefined) {
                columnStyles += `
                    #view_2772 th:nth-child(${columnInfo[letter] + 1}),
                    #view_2772 td:nth-child(${columnInfo[letter] + 1}) {
                        width: 40px !important;
                        max-width: 40px !important;
                        text-align: center !important;
                    }
                `;
            }
        });
        
        // Text columns (Report Response, Action Plan) - simpler styling without box effect
        if (columnInfo['report response'] !== undefined) {
            columnStyles += `
                #view_2772 th:nth-child(${columnInfo['report response'] + 1}) {
                    min-width: 200px !important;
                }
                #view_2772 td:nth-child(${columnInfo['report response'] + 1}) {
                    min-width: 200px !important;
                    max-width: 300px !important;
                    white-space: normal !important;
                    word-wrap: break-word !important;
                    overflow-wrap: break-word !important;
                    line-height: 1.3 !important;
                    font-size: 13px !important;
                    color: #333 !important;
                    padding: 12px 8px !important;
                    cursor: pointer !important;
                    vertical-align: top !important;
                }
                #view_2772 td:nth-child(${columnInfo['report response'] + 1}):hover {
                    background: rgba(7, 155, 170, 0.05) !important;
                }
            `;
        }
        
        if (columnInfo['action plan'] !== undefined) {
            columnStyles += `
                #view_2772 th:nth-child(${columnInfo['action plan'] + 1}) {
                    min-width: 200px !important;
                }
                #view_2772 td:nth-child(${columnInfo['action plan'] + 1}) {
                    min-width: 200px !important;
                    max-width: 300px !important;
                    white-space: normal !important;
                    word-wrap: break-word !important;
                    overflow-wrap: break-word !important;
                    line-height: 1.3 !important;
                    font-size: 13px !important;
                    color: #333 !important;
                    padding: 12px 8px !important;
                    cursor: pointer !important;
                    vertical-align: top !important;
                }
                #view_2772 td:nth-child(${columnInfo['action plan'] + 1}):hover {
                    background: rgba(7, 155, 170, 0.05) !important;
                }
            `;
        }
        
        const styles = `
            <style id="vue-table-safe-styles">
                /* Table container */
                #view_2772 .kn-rich_text__content {
                    padding: 0 !important;
                    overflow-x: auto !important;
                }
                
                /* Table base styles */
                #view_2772 table {
                    width: 100% !important;
                    table-layout: auto !important;
                    border-collapse: separate !important;
                    border-spacing: 0 !important;
                    border-radius: 12px !important;
                    overflow: hidden !important;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.08) !important;
                    background: white !important;
                }
                
                /* Headers */
                #view_2772 thead th {
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
                #view_2772 tbody tr {
                    transition: all 0.2s ease !important;
                    border-bottom: 1px solid #f0f0f0 !important;
                }
                
                #view_2772 tbody tr:hover {
                    background-color: #f0f8ff !important;
                    transform: translateX(2px) !important;
                    box-shadow: 0 2px 8px rgba(7, 155, 170, 0.1) !important;
                }
                
                /* Cells */
                #view_2772 td {
                    padding: 12px 8px !important;
                    color: #333 !important;
                    font-size: 14px !important;
                    border: none !important;
                    vertical-align: middle !important;
                }
                
                /* Student name styling */
                #view_2772 td:first-child {
                    font-weight: 600 !important;
                    color: #23356f !important;
                }
                
                /* Adaptive column widths */
                ${columnStyles}
                
                /* Report buttons */
                #view_2772 button {
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
                
                #view_2772 button:hover {
                    transform: translateY(-2px) !important;
                    box-shadow: 0 4px 12px rgba(7, 155, 170, 0.3) !important;
                }
                
                /* RAG Score Background Colors - Applied via JavaScript */
                #view_2772 td.score-null {
                    background: transparent !important;
                }
                
                #view_2772 td.score-low {
                    background: #fee2e2 !important; /* Light red for 1-3 */
                    color: #991b1b !important;
                    font-weight: 600 !important;
                }
                
                #view_2772 td.score-medium {
                    background: #fed7aa !important; /* Light orange for 4-5 */
                    color: #9a3412 !important;
                    font-weight: 600 !important;
                }
                
                #view_2772 td.score-good {
                    background: #bbf7d0 !important; /* Light green for 6-7 */
                    color: #14532d !important;
                    font-weight: 600 !important;
                }
                
                #view_2772 td.score-high {
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
        const filterInputs = document.querySelectorAll('#view_2772 input[placeholder*="FILTER"]');
        filterInputs.forEach(input => {
            input.placeholder = 'Filter';
        });
        
        // Also check for dropdown filters
        const filterDropdowns = document.querySelectorAll('#view_2772 .p-dropdown-label');
        filterDropdowns.forEach(dropdown => {
            if (dropdown.textContent.includes('FILTER')) {
                dropdown.textContent = 'Filter';
            }
        });
        
        log('Filter placeholders updated');
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
                let cleanText = stripHtmlTags(originalText);
                
                // Check if this cell actually contains Action Plan text that was misplaced
                if (cleanText.toLowerCase().includes('goal') || cleanText.toLowerCase().includes('action plan')) {
                    // This is actually Action Plan content, move it to the right column if possible
                    if (actionColumnIndex >= 0 && cells[actionColumnIndex]) {
                        const actionCell = cells[actionColumnIndex];
                        if (!actionCell.textContent.trim()) {
                            // Action Plan cell is empty, move the content there
                            actionCell.textContent = cleanText;
                            cell.textContent = ''; // Clear from wrong column
                            
                            // Add click handler to the correct cell
                            actionCell.title = 'Click to view full text';
                            actionCell.style.cursor = 'pointer';
                            actionCell.onclick = () => {
                                const studentName = cells[0] ? cells[0].textContent : 'Student';
                                showModal(`${studentName} - Action Plan`, cleanText);
                            };
                            return; // Skip processing this cell further
                        }
                    }
                }
                
                // Process as Report Response
                if (originalText !== cleanText && cleanText.trim()) {
                    cell.textContent = cleanText;
                }
                
                if (cleanText.trim()) {
                    cell.title = 'Click to view full text';
                    cell.style.cursor = 'pointer';
                    
                    cell.onclick = () => {
                        const studentName = cells[0] ? cells[0].textContent : 'Student';
                        showModal(`${studentName} - Report Response`, cleanText);
                    };
                }
            }
            
            // Handle Action Plan column
            if (actionColumnIndex >= 0 && cells[actionColumnIndex]) {
                const cell = cells[actionColumnIndex];
                const originalText = cell.innerHTML;
                const cleanText = stripHtmlTags(originalText);
                
                // Only process if there's content and we haven't already moved content here
                if (cleanText.trim() && !cell.onclick) {
                    if (originalText !== cleanText) {
                        cell.textContent = cleanText;
                    }
                    
                    cell.title = 'Click to view full text';
                    cell.style.cursor = 'pointer';
                    
                    cell.onclick = () => {
                        const studentName = cells[0] ? cells[0].textContent : 'Student';
                        showModal(`${studentName} - Action Plan`, cleanText);
                    };
                }
            }
        });
        
        log('Text cell handlers added');
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
                
                // Update filter placeholders
                updateFilterPlaceholders();
                
                // Add text cell handlers
                addTextCellHandlers(table);
                
                // Apply RAG rating to score cells
                applyScoreRAGRating(table);
                
                // Watch for table updates
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'childList' && mutation.target.tagName === 'TBODY') {
                            log('Table data updated, reapplying handlers...');
                            setTimeout(() => {
                                const updatedTable = document.querySelector(`${CONFIG.targetView} table`);
                                if (updatedTable) {
                                    addTextCellHandlers(updatedTable);
                                    updateFilterPlaceholders();
                                    applyScoreRAGRating(updatedTable);
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
                
                // Ensure table is visible
                table.style.opacity = '1';
                
                log('✅ Vue table safely enhanced!');
                clearInterval(checkAndEnhance);
            } else if (attempts >= CONFIG.maxAttempts) {
                log('❌ Table not found after maximum attempts');
                clearInterval(checkAndEnhance);
            }
        }, CONFIG.checkInterval);
    }
    
    // Initialize immediately since we're loaded after the scene
    log('Starting enhancement process...');
    
    // Try immediately
    enhanceVueTable();
    
    // Also try after a delay as fallback
    setTimeout(() => {
        const table = document.querySelector('#view_2772 table');
        if (table && !document.getElementById('vue-table-safe-styles')) {
            log('Fallback enhancement triggered');
            enhanceVueTable();
        }
    }, 2000);
    
})();
