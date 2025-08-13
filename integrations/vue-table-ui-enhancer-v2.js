// Vue Table UI Enhancer v2.0 for Scene 1014
// Enhanced features: Column reordering, width optimization, modal popups, HTML stripping
// Purpose: Enhance the visual appearance of the Vue.js student table in view_2772

(function() {
    'use strict';
    
    const DEBUG = true;
    const log = (msg, data) => {
        if (DEBUG) console.log(`[VueTableUI-v2] ${msg}`, data || '');
    };
    
    log('🎨 Vue Table UI Enhancer v2.0 Initializing...');
    
    // Configuration
    const CONFIG = {
        targetView: '#view_2772',
        checkInterval: 500,
        maxAttempts: 20
    };
    
    // Strip HTML tags from text
    function stripHtmlTags(html) {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
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
    
    // Enhanced styles for the Vue table
    function injectEnhancedStyles() {
        if (document.getElementById('vue-table-enhanced-styles-v2')) return;
        
        const styles = `
            <style id="vue-table-enhanced-styles-v2">
                /* Enhanced table container */
                #view_2772 .kn-rich_text__content {
                    padding: 0 !important;
                }
                
                /* Table styling with fixed layout for column control */
                #view_2772 table {
                    width: 100% !important;
                    table-layout: fixed !important;
                    border-collapse: separate !important;
                    border-spacing: 0 !important;
                    border-radius: 12px !important;
                    overflow: hidden !important;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.08) !important;
                    background: white !important;
                }
                
                /* Column width optimization */
                #view_2772 thead th:nth-child(1), 
                #view_2772 tbody td:nth-child(1) { width: 15% !important; } /* Student Name */
                
                #view_2772 thead th:nth-child(2), 
                #view_2772 tbody td:nth-child(2) { width: 6% !important; }  /* Group - narrower */
                
                #view_2772 thead th:nth-child(3), 
                #view_2772 tbody td:nth-child(3) { width: 6% !important; }  /* Year Group - narrower */
                
                #view_2772 thead th:nth-child(4), 
                #view_2772 tbody td:nth-child(4) { width: 8% !important; }  /* Focus */
                
                #view_2772 thead th:nth-child(5), 
                #view_2772 tbody td:nth-child(5) { width: 4% !important; }  /* V */
                
                #view_2772 thead th:nth-child(6), 
                #view_2772 tbody td:nth-child(6) { width: 4% !important; }  /* E */
                
                #view_2772 thead th:nth-child(7), 
                #view_2772 tbody td:nth-child(7) { width: 4% !important; }  /* S */
                
                #view_2772 thead th:nth-child(8), 
                #view_2772 tbody td:nth-child(8) { width: 4% !important; }  /* P */
                
                #view_2772 thead th:nth-child(9), 
                #view_2772 tbody td:nth-child(9) { width: 4% !important; }  /* A */
                
                #view_2772 thead th:nth-child(10), 
                #view_2772 tbody td:nth-child(10) { width: 4% !important; } /* O */
                
                #view_2772 thead th:nth-child(11), 
                #view_2772 tbody td:nth-child(11) { width: 20% !important; } /* Report Response */
                
                #view_2772 thead th:nth-child(12), 
                #view_2772 tbody td:nth-child(12) { width: 21% !important; } /* Action Plan */
                
                /* Enhanced table headers */
                #view_2772 thead th,
                #view_2772 th {
                    background: linear-gradient(135deg, #079baa 0%, #00b8d4 100%) !important;
                    color: white !important;
                    padding: 12px 8px !important;
                    text-align: left !important;
                    font-weight: 600 !important;
                    font-size: 13px !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.3px !important;
                    border: none !important;
                    position: sticky !important;
                    top: 0 !important;
                    z-index: 10 !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                }
                
                /* Center align score headers */
                #view_2772 thead th:nth-child(n+5):nth-child(-n+10) {
                    text-align: center !important;
                }
                
                /* Table rows */
                #view_2772 tbody tr {
                    transition: all 0.2s ease !important;
                    border-bottom: 1px solid #f0f0f0 !important;
                }
                
                #view_2772 tbody tr:hover {
                    background-color: #f0f8ff !important;
                    transform: translateX(2px) !important;
                    box-shadow: 0 2px 8px rgba(7, 155, 170, 0.1) !important;
                }
                
                /* Table cells */
                #view_2772 td {
                    padding: 12px 8px !important;
                    color: #333 !important;
                    font-size: 14px !important;
                    border: none !important;
                    vertical-align: middle !important;
                }
                
                /* Student name cells */
                #view_2772 td:first-child {
                    font-weight: 600 !important;
                    color: #23356f !important;
                }
                
                /* Score cells - center aligned */
                #view_2772 td:nth-child(n+5):nth-child(-n+10) {
                    text-align: center !important;
                    font-weight: 600 !important;
                }
                
                /* Text columns - Report Response and Action Plan */
                #view_2772 td:nth-child(11),
                #view_2772 td:nth-child(12) {
                    max-width: 250px !important;
                    white-space: nowrap !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    cursor: pointer !important;
                    position: relative !important;
                    padding-right: 25px !important;
                }
                
                /* Add expand icon to text cells */
                #view_2772 td:nth-child(11)::after,
                #view_2772 td:nth-child(12)::after {
                    content: "⤢" !important;
                    position: absolute !important;
                    right: 8px !important;
                    top: 50% !important;
                    transform: translateY(-50%) !important;
                    color: #079baa !important;
                    font-size: 16px !important;
                    opacity: 0.6 !important;
                    transition: opacity 0.2s !important;
                }
                
                #view_2772 td:nth-child(11):hover,
                #view_2772 td:nth-child(12):hover {
                    background: rgba(7, 155, 170, 0.05) !important;
                }
                
                #view_2772 td:nth-child(11):hover::after,
                #view_2772 td:nth-child(12):hover::after {
                    opacity: 1 !important;
                }
                
                /* Report buttons enhancement */
                #view_2772 button,
                #view_2772 .kn-button {
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
                    display: inline-block !important;
                    text-decoration: none !important;
                    box-shadow: 0 2px 8px rgba(7, 155, 170, 0.2) !important;
                }
                
                #view_2772 button:hover {
                    transform: translateY(-2px) !important;
                    box-shadow: 0 4px 12px rgba(7, 155, 170, 0.3) !important;
                    background: linear-gradient(135deg, #00b8d4 0%, #00e5db 100%) !important;
                }
                
                /* Score coloring */
                /* High scores (8-10) - green */
                #view_2772 td:nth-child(n+5):nth-child(-n+10):contains("10"),
                #view_2772 td:nth-child(n+5):nth-child(-n+10):contains("9"),
                #view_2772 td:nth-child(n+5):nth-child(-n+10):contains("8") {
                    color: #22c55e !important;
                    background: rgba(34, 197, 94, 0.08) !important;
                }
                
                /* Medium scores (5-7) - orange */
                #view_2772 td:nth-child(n+5):nth-child(-n+10):contains("7"),
                #view_2772 td:nth-child(n+5):nth-child(-n+10):contains("6"),
                #view_2772 td:nth-child(n+5):nth-child(-n+10):contains("5") {
                    color: #f59e0b !important;
                    background: rgba(245, 158, 11, 0.08) !important;
                }
                
                /* Low scores (1-4) - red */
                #view_2772 td:nth-child(n+5):nth-child(-n+10):contains("4"),
                #view_2772 td:nth-child(n+5):nth-child(-n+10):contains("3"),
                #view_2772 td:nth-child(n+5):nth-child(-n+10):contains("2"),
                #view_2772 td:nth-child(n+5):nth-child(-n+10):contains("1") {
                    color: #ef4444 !important;
                    background: rgba(239, 68, 68, 0.08) !important;
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
                    display: flex;
                    align-items: center;
                    justify-content: center;
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
        log('Enhanced styles v2 injected');
    }
    
    // Reorder columns in the table
    function reorderColumns(table) {
        try {
            // Define the desired column order
            // Current: Name, Group, Year, Focus, V, E, S, P, A, O, Response, Action
            // Desired: Name, Group, Year, Response, Action, Focus, V, E, S, P, A, O
            
            const columnMapping = {
                0: 0,  // Student Name stays at 0
                1: 1,  // Group stays at 1
                2: 2,  // Year Group stays at 2
                10: 3, // Report Response moves to 3
                11: 4, // Action Plan moves to 4
                3: 5,  // Focus moves to 5
                4: 6,  // V moves to 6
                5: 7,  // E moves to 7
                6: 8,  // S moves to 8
                7: 9,  // P moves to 9
                8: 10, // A moves to 10
                9: 11  // O moves to 11
            };
            
            // Reorder header cells
            const headerRow = table.querySelector('thead tr');
            if (headerRow) {
                const headers = Array.from(headerRow.children);
                const reorderedHeaders = new Array(headers.length);
                
                Object.entries(columnMapping).forEach(([oldIndex, newIndex]) => {
                    if (headers[oldIndex]) {
                        reorderedHeaders[newIndex] = headers[oldIndex];
                    }
                });
                
                // Clear and re-append in new order
                headerRow.innerHTML = '';
                reorderedHeaders.forEach(header => {
                    if (header) headerRow.appendChild(header);
                });
            }
            
            // Reorder data cells in each row
            const dataRows = table.querySelectorAll('tbody tr');
            dataRows.forEach(row => {
                const cells = Array.from(row.children);
                const reorderedCells = new Array(cells.length);
                
                Object.entries(columnMapping).forEach(([oldIndex, newIndex]) => {
                    if (cells[oldIndex]) {
                        reorderedCells[newIndex] = cells[oldIndex];
                    }
                });
                
                // Clear and re-append in new order
                row.innerHTML = '';
                reorderedCells.forEach(cell => {
                    if (cell) row.appendChild(cell);
                });
            });
            
            log('Columns reordered successfully');
            return true;
        } catch (error) {
            log('Error reordering columns:', error);
            return false;
        }
    }
    
    // Process text cells to strip HTML and add click handlers
    function processTextCells(table) {
        // Find Report Response and Action Plan columns (after reordering they're at positions 3 and 4)
        const rows = table.querySelectorAll('tbody tr');
        
        rows.forEach((row, rowIndex) => {
            const cells = row.querySelectorAll('td');
            
            // Process Report Response (now at index 3)
            if (cells[3]) {
                const originalText = cells[3].innerHTML;
                const cleanText = stripHtmlTags(originalText);
                cells[3].textContent = cleanText;
                cells[3].dataset.fullText = cleanText;
                cells[3].title = 'Click to view full text';
                
                cells[3].onclick = () => {
                    const studentName = cells[0] ? cells[0].textContent : 'Student';
                    showModal(`${studentName} - Report Response`, cleanText);
                };
            }
            
            // Process Action Plan (now at index 4)
            if (cells[4]) {
                const originalText = cells[4].innerHTML;
                const cleanText = stripHtmlTags(originalText);
                cells[4].textContent = cleanText;
                cells[4].dataset.fullText = cleanText;
                cells[4].title = 'Click to view full text';
                
                cells[4].onclick = () => {
                    const studentName = cells[0] ? cells[0].textContent : 'Student';
                    showModal(`${studentName} - Action Plan`, cleanText);
                };
            }
        });
        
        log('Text cells processed');
    }
    
    // Main enhancement function
    async function enhanceVueTable() {
        let attempts = 0;
        
        const checkAndEnhance = setInterval(() => {
            attempts++;
            
            const table = document.querySelector(`${CONFIG.targetView} table`);
            
            if (table) {
                log('Vue table found, applying enhancements...');
                
                // Inject styles
                injectEnhancedStyles();
                
                // Create modal
                createModal();
                
                // Reorder columns
                const reordered = reorderColumns(table);
                
                if (reordered) {
                    // Process text cells after reordering
                    processTextCells(table);
                }
                
                // Watch for table updates (Vue re-renders)
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'childList' && mutation.target.tagName === 'TBODY') {
                            log('Table updated, reprocessing...');
                            setTimeout(() => {
                                const updatedTable = document.querySelector(`${CONFIG.targetView} table`);
                                if (updatedTable) {
                                    reorderColumns(updatedTable);
                                    processTextCells(updatedTable);
                                }
                            }, 100);
                        }
                    });
                });
                
                observer.observe(table, {
                    childList: true,
                    subtree: true
                });
                
                log('✅ Vue table enhanced successfully!');
                clearInterval(checkAndEnhance);
            } else if (attempts >= CONFIG.maxAttempts) {
                log('❌ Table not found after maximum attempts');
                clearInterval(checkAndEnhance);
            }
        }, CONFIG.checkInterval);
    }
    
    // Initialize on scene render
    if (typeof Knack !== 'undefined') {
        Knack.on('scene:render', function(event, scene) {
            if (scene.key === 'scene_1014') {
                log('Scene 1014 rendered, waiting for Vue table...');
                setTimeout(enhanceVueTable, 1000);
            }
        });
    } else {
        log('Knack not found, trying direct enhancement...');
        setTimeout(enhanceVueTable, 2000);
    }
    
})();
