// Vue Table UI Enhancer v1h - NAVIGATION FIX
// Fixes: table reverting when navigating back from reports
// Version: 1.8h STABLE

(function() {
    'use strict';
    
    const DEBUG = true;
    const log = (msg, data) => {
        if (DEBUG) console.log(`[VueTableV1H] ${msg}`, data || '');
    };
    
    log('🚀 Vue Table Enhancer v1.8h Starting (with navigation fixes)...');
    
    // RACE CONDITION PREVENTION FLAGS
    let isProcessing = false;
    let fixSpacingTimeout = null;
    let lastFixSpacingTime = 0;
    const MIN_SPACING_FIX_INTERVAL = 1000;
    
    // Track enhanced state
    let isEnhanced = false;
    let lastEnhancedTime = 0;
    let enhancementCheckInterval = null;
    
    // Immediate hide to prevent flash
    const immediateHideStyle = document.createElement('style');
    immediateHideStyle.id = 'vue-table-immediate-hide';
    immediateHideStyle.textContent = `
        #view_2772, #view_2776 {
            opacity: 0 !important;
            visibility: hidden !important;
        }
    `;
    document.head.appendChild(immediateHideStyle);
    
    // Configuration
    const CONFIG = {
        targetView: window.DYNAMIC_STAFF_TABLE_1014_CONFIG?.targetView || 
                   (document.querySelector('#view_2772') ? '#view_2772' : '#view_2776'),
        checkInterval: 500,
        maxAttempts: 30,
        initialDelay: 500,
        maxPreviewWords: 8
    };
    
    // Track current cycle for change detection
    let currentCycle = null;
    let observerPaused = false;
    let currentViewMode = 'unknown'; // 'table' or 'report'
    
    // Detect current scene
    function getCurrentScene() {
        if (document.querySelector('#kn-scene_1095')) return 'tutor';
        if (document.querySelector('#kn-scene_1014')) return 'staff';
        return null;
    }
    
    // Detect current view mode (table vs report)
    function detectViewMode() {
        const scene = getCurrentScene();
        if (!scene) return 'unknown';
        
        // Check for report container
        const reportContainer = document.querySelector('#view_3015 #report-container, #view_3204 #report-container');
        const hasReportContent = reportContainer && reportContainer.children.length > 0;
        
        // Check for table
        const table = document.querySelector(`${CONFIG.targetView} table`);
        const hasTableData = table?.querySelector('tbody tr');
        
        if (hasReportContent && !hasTableData) {
            return 'report';
        } else if (hasTableData) {
            return 'table';
        }
        
        return 'unknown';
    }
    
    // Check if table needs enhancement
    function needsEnhancement() {
        const table = document.querySelector(`${CONFIG.targetView} table`);
        if (!table) return false;
        
        // Check if already enhanced by looking for our classes
        const hasEnhancedCells = table.querySelector('td.has-content, td.no-content');
        const hasEnhancedStyles = document.getElementById('vue-table-enhancement-styles');
        
        // If table exists but doesn't have our enhancements, it needs enhancement
        return table.querySelector('tbody tr') && (!hasEnhancedCells || !hasEnhancedStyles);
    }
    
    // CRITICAL FIX with race condition prevention
    function fixViewSpacing(force = false) {
        if (isProcessing && !force) {
            return false;
        }
        
        const now = Date.now();
        if (!force && (now - lastFixSpacingTime) < MIN_SPACING_FIX_INTERVAL) {
            return false;
        }
        
        clearTimeout(fixSpacingTimeout);
        isProcessing = true;
        lastFixSpacingTime = now;
        
        try {
            const scene = getCurrentScene();
            if (!scene) {
                isProcessing = false;
                return false;
            }
            
            const viewsToCheck = {
                tutor: {
                    tableView: '#view_2776',
                    academicProfile: '#view_3015',
                    aiCoach: '#view_3047',
                    hiddenData: '#view_2716'
                },
                staff: {
                    tableView: '#view_2772',
                    academicProfile: '#view_3204',
                    aiCoach: null,
                    hiddenData: '#view_449'
                }
            };
            
            const config = viewsToCheck[scene];
            if (!config) {
                isProcessing = false;
                return false;
            }
            
            const tableView = document.querySelector(config.tableView);
            const table = tableView?.querySelector('table');
            const hasTableData = table?.querySelector('tbody tr');
            
            if (hasTableData) {
                observerPaused = true;
                
                if (config.academicProfile) {
                    const academicView = document.querySelector(config.academicProfile);
                    if (academicView && academicView.offsetHeight > 100) {
                        const hasContent = academicView.querySelector('#report-container')?.children.length > 0;
                        
                        if (!hasContent) {
                            if (academicView.style.display !== 'none') {
                                academicView.style.cssText = `
                                    display: none !important;
                                    height: 0 !important;
                                    margin: 0 !important;
                                    padding: 0 !important;
                                `;
                            }
                        }
                    }
                }
                
                if (config.hiddenData) {
                    const hiddenView = document.querySelector(config.hiddenData);
                    if (hiddenView && hiddenView.style.display !== 'none') {
                        hiddenView.style.cssText = `
                            display: none !important;
                            position: absolute !important;
                            left: -9999px !important;
                        `;
                    }
                }
                
                setTimeout(() => {
                    observerPaused = false;
                }, 100);
                
                const tableTop = table.getBoundingClientRect().top + window.pageYOffset;
                
                if (tableTop > 400 || DEBUG === false) {
                    log(`Table position: ${tableTop}px from top`);
                }
                
                isProcessing = false;
                return tableTop < 400;
            }
            
            isProcessing = false;
            return false;
            
        } catch (error) {
            log('Error in fixViewSpacing:', error);
            isProcessing = false;
            observerPaused = false;
            return false;
        }
    }
    
    // Strip ALL HTML tags
    function stripHtmlTags(html) {
        if (!html) return '';
        
        let text = html
            .replace(/<br\s*\/?>/gi, ' ')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&amp;/gi, '&')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            .replace(/&quot;/gi, '"')
            .replace(/&#39;/gi, "'");
        
        text = text.replace(/<[^>]*>/g, '');
        text = text.replace(/\s+/g, ' ').trim();
        
        return text;
    }
    
    // Get preview text
    function getPreviewText(text, maxWords = CONFIG.maxPreviewWords) {
        if (!text) return '';
        
        const words = text.split(/\s+/);
        if (words.length <= maxWords) {
            return text;
        }
        
        return words.slice(0, maxWords).join(' ') + '...';
    }
    
    // Detect current cycle
    function detectCurrentCycle() {
        const activeTab = document.querySelector(
            `${CONFIG.targetView} .p-tabview-nav li[aria-selected="true"], 
             ${CONFIG.targetView} .p-button.p-highlight,
             ${CONFIG.targetView} button.active,
             ${CONFIG.targetView} .p-button-primary`
        );
        
        if (activeTab) {
            return activeTab.textContent.trim();
        }
        
        return null;
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
        
        const modal = document.getElementById('vue-table-modal');
        const closeBtn = modal.querySelector('.vue-table-modal-close');
        
        closeBtn.onclick = () => modal.classList.remove('active');
        modal.onclick = (e) => {
            if (e.target === modal) modal.classList.remove('active');
        };
    }
    
    // Show modal with content
    function showModal(title, content) {
        const modal = document.getElementById('vue-table-modal');
        modal.querySelector('.vue-table-modal-title').textContent = title;
        modal.querySelector('.vue-table-modal-body').textContent = content;
        modal.classList.add('active');
    }
    
    // Inject comprehensive styles
    function injectTableStyles() {
        // Always remove and re-inject to ensure fresh styles
        const existingStyles = document.getElementById('vue-table-enhancement-styles');
        if (existingStyles) {
            existingStyles.remove();
        }
        
        const styles = `
            <style id="vue-table-enhancement-styles">
                /* Critical positioning fixes */
                ${CONFIG.targetView} {
                    position: relative !important;
                    top: 0 !important;
                    margin-top: 0 !important;
                    padding-top: 0 !important;
                }
                
                /* Hide empty views */
                #view_3015:empty, #view_3204:empty,
                #view_2716, #view_449 {
                    display: none !important;
                }
                
                /* Table title styling */
                ${CONFIG.targetView} .kn-title h1,
                ${CONFIG.targetView} .kn-title h2 {
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
                ${CONFIG.targetView} .kn-title h2:after {
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
                
                /* Table base styles */
                ${CONFIG.targetView} table {
                    width: 100% !important;
                    table-layout: fixed !important;
                    border-collapse: separate !important;
                    border-spacing: 0 !important;
                    border-radius: 12px !important;
                    overflow: hidden !important;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.08) !important;
                    background: white !important;
                    margin-top: 20px !important;
                }
                
                /* Headers */
                ${CONFIG.targetView} thead th {
                    background: linear-gradient(135deg, #079baa 0%, #00b8d4 100%) !important;
                    color: white !important;
                    padding: 12px 6px !important;
                    font-weight: 600 !important;
                    font-size: 12px !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.3px !important;
                    border: none !important;
                    position: sticky !important;
                    top: 0 !important;
                    z-index: 10 !important;
                }
                
                /* Column widths */
                ${CONFIG.targetView} th:nth-child(1),
                ${CONFIG.targetView} td:nth-child(1) {
                    width: 120px !important;
                    min-width: 120px !important;
                    max-width: 120px !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    white-space: nowrap !important;
                }
                
                ${CONFIG.targetView} th:nth-child(2),
                ${CONFIG.targetView} td:nth-child(2) {
                    width: 60px !important;
                    text-align: center !important;
                }
                
                ${CONFIG.targetView} th:nth-child(3),
                ${CONFIG.targetView} td:nth-child(3) {
                    width: 60px !important;
                    text-align: center !important;
                }
                
                ${CONFIG.targetView} th:nth-child(4),
                ${CONFIG.targetView} td:nth-child(4) {
                    width: 80px !important;
                }
                
                /* VESPAO columns */
                ${CONFIG.targetView} th:nth-child(5), ${CONFIG.targetView} td:nth-child(5),
                ${CONFIG.targetView} th:nth-child(6), ${CONFIG.targetView} td:nth-child(6),
                ${CONFIG.targetView} th:nth-child(7), ${CONFIG.targetView} td:nth-child(7),
                ${CONFIG.targetView} th:nth-child(8), ${CONFIG.targetView} td:nth-child(8),
                ${CONFIG.targetView} th:nth-child(9), ${CONFIG.targetView} td:nth-child(9),
                ${CONFIG.targetView} th:nth-child(10), ${CONFIG.targetView} td:nth-child(10) {
                    width: 35px !important;
                    text-align: center !important;
                    padding: 8px 2px !important;
                }
                
                /* Report Response - LARGE */
                ${CONFIG.targetView} th:nth-child(11),
                ${CONFIG.targetView} td:nth-child(11) {
                    width: 280px !important;
                    min-width: 280px !important;
                }
                
                /* Action Plan - LARGE */
                ${CONFIG.targetView} th:nth-child(12),
                ${CONFIG.targetView} td:nth-child(12) {
                    width: 280px !important;
                    min-width: 280px !important;
                }
                
                /* Report button */
                ${CONFIG.targetView} th:nth-child(13),
                ${CONFIG.targetView} td:nth-child(13) {
                    width: 100px !important;
                }
                
                /* Rows */
                ${CONFIG.targetView} tbody tr {
                    transition: all 0.2s ease !important;
                    border-bottom: 1px solid #f0f0f0 !important;
                }
                
                ${CONFIG.targetView} tbody tr:hover {
                    background-color: #f0f8ff !important;
                    box-shadow: 0 2px 8px rgba(7, 155, 170, 0.1) !important;
                }
                
                /* Base cell styles */
                ${CONFIG.targetView} td {
                    padding: 10px 6px !important;
                    color: #333 !important;
                    font-size: 13px !important;
                    border: none !important;
                    vertical-align: middle !important;
                }
                
                /* Student name */
                ${CONFIG.targetView} td:first-child {
                    font-weight: 600 !important;
                    color: #23356f !important;
                    padding-left: 10px !important;
                }
                
                /* Content cells with green */
                ${CONFIG.targetView} td.has-content {
                    background: linear-gradient(to right, #10b981 4px, rgba(16, 185, 129, 0.08) 4px) !important;
                    color: #065f46 !important;
                    cursor: pointer !important;
                    font-weight: 500 !important;
                    position: relative !important;
                    padding-left: 12px !important;
                    transition: all 0.2s ease !important;
                }
                
                ${CONFIG.targetView} td.has-content:hover {
                    background: linear-gradient(to right, #10b981 4px, rgba(16, 185, 129, 0.15) 4px) !important;
                    transform: translateX(2px) !important;
                }
                
                /* No content cells with red */
                ${CONFIG.targetView} td.no-content {
                    background: linear-gradient(to right, #ef4444 4px, rgba(239, 68, 68, 0.08) 4px) !important;
                    color: #991b1b !important;
                    font-style: italic !important;
                    font-size: 12px !important;
                    padding-left: 12px !important;
                }
                
                /* Click indicator */
                ${CONFIG.targetView} td.has-content::after {
                    content: "📖";
                    position: absolute;
                    right: 8px;
                    opacity: 0.5;
                    font-size: 14px;
                }
                
                /* RAG Score colors */
                ${CONFIG.targetView} td.score-low {
                    background: #fee2e2 !important;
                    color: #991b1b !important;
                    font-weight: 700 !important;
                }
                
                ${CONFIG.targetView} td.score-medium {
                    background: #fed7aa !important;
                    color: #9a3412 !important;
                    font-weight: 600 !important;
                }
                
                ${CONFIG.targetView} td.score-good {
                    background: #bbf7d0 !important;
                    color: #14532d !important;
                    font-weight: 600 !important;
                }
                
                ${CONFIG.targetView} td.score-high {
                    background: #86efac !important;
                    color: #14532d !important;
                    font-weight: 700 !important;
                }
                
                /* Buttons */
                ${CONFIG.targetView} button {
                    background: linear-gradient(135deg, #079baa 0%, #00e5db 100%) !important;
                    color: white !important;
                    border: none !important;
                    padding: 6px 14px !important;
                    border-radius: 6px !important;
                    font-weight: 500 !important;
                    font-size: 11px !important;
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
                    background: none !important;
                    border: none !important;
                    font-size: 1.5rem !important;
                    cursor: pointer !important;
                    color: #6b7280 !important;
                    padding: 0 !important;
                    width: 30px !important;
                    height: 30px !important;
                    box-shadow: none !important;
                }
                
                .vue-table-modal-close:hover {
                    color: #ef4444 !important;
                    transform: none !important;
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
                    from { transform: translateY(-20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
        log('Table styles injected');
    }
    
    // Process text cells
    function processTextCells(table, forceRefresh = false) {
        const headers = table.querySelectorAll('thead th');
        let responseColumnIndex = -1;
        let actionColumnIndex = -1;
        
        headers.forEach((th, idx) => {
            const text = th.textContent.trim().toLowerCase();
            if (text.includes('report response') || text === 'report response') {
                responseColumnIndex = idx;
            }
            if (text.includes('action plan') || text === 'action plan') {
                actionColumnIndex = idx;
            }
        });
        
        if (responseColumnIndex === -1 || actionColumnIndex === -1) {
            return;
        }
        
        const rows = table.querySelectorAll('tbody tr');
        
        rows.forEach((row, rowIndex) => {
            const cells = row.querySelectorAll('td');
            
            // Process Report Response
            if (responseColumnIndex >= 0 && cells[responseColumnIndex]) {
                const cell = cells[responseColumnIndex];
                const currentHTML = cell.innerHTML;
                const cleanText = stripHtmlTags(currentHTML);
                
                cell.classList.remove('has-content', 'no-content');
                cell.onclick = null;
                
                if (cleanText && cleanText.length > 0) {
                    const preview = getPreviewText(cleanText);
                    cell.textContent = preview;
                    cell.classList.add('has-content');
                    cell.title = 'Click to read full response';
                    
                    cell.onclick = (e) => {
                        e.stopPropagation();
                        const studentName = cells[0]?.textContent || 'Student';
                        const cycle = detectCurrentCycle() || '';
                        showModal(`${studentName} - Report Response ${cycle}`, cleanText);
                    };
                } else {
                    cell.textContent = 'No response';
                    cell.classList.add('no-content');
                    cell.title = 'No response provided';
                }
            }
            
            // Process Action Plan
            if (actionColumnIndex >= 0 && cells[actionColumnIndex]) {
                const cell = cells[actionColumnIndex];
                const currentHTML = cell.innerHTML;
                const cleanText = stripHtmlTags(currentHTML);
                
                cell.classList.remove('has-content', 'no-content');
                cell.onclick = null;
                
                if (cleanText && cleanText.length > 0) {
                    const preview = getPreviewText(cleanText);
                    cell.textContent = preview;
                    cell.classList.add('has-content');
                    cell.title = 'Click to read full action plan';
                    
                    cell.onclick = (e) => {
                        e.stopPropagation();
                        const studentName = cells[0]?.textContent || 'Student';
                        const cycle = detectCurrentCycle() || '';
                        showModal(`${studentName} - Action Plan ${cycle}`, cleanText);
                    };
                } else {
                    cell.textContent = 'No action plan';
                    cell.classList.add('no-content');
                    cell.title = 'No action plan provided';
                }
            }
        });
        
        log('Text cells processed');
    }
    
    // Apply RAG rating colors
    function applyScoreRAGRating(table) {
        const headers = table.querySelectorAll('thead th');
        const scoreColumns = [];
        
        headers.forEach((th, idx) => {
            const text = th.textContent.trim().toUpperCase();
            if (['V', 'E', 'S', 'P', 'A', 'O'].includes(text)) {
                scoreColumns.push(idx);
            }
        });
        
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            
            scoreColumns.forEach(colIdx => {
                if (cells[colIdx]) {
                    const cell = cells[colIdx];
                    const score = parseInt(cell.textContent.trim(), 10);
                    
                    cell.classList.remove('score-null', 'score-low', 'score-medium', 'score-good', 'score-high');
                    
                    if (!isNaN(score)) {
                        if (score <= 3) {
                            cell.classList.add('score-low');
                        } else if (score <= 5) {
                            cell.classList.add('score-medium');
                        } else if (score <= 7) {
                            cell.classList.add('score-good');
                        } else if (score >= 8) {
                            cell.classList.add('score-high');
                        }
                    }
                }
            });
        });
    }
    
    // Apply all enhancements to table
    function applyAllEnhancements() {
        const table = document.querySelector(`${CONFIG.targetView} table`);
        if (!table || !table.querySelector('tbody tr')) {
            log('No table found to enhance');
            return false;
        }
        
        log('Applying all enhancements...');
        
        // Ensure modal exists
        createModal();
        
        // Re-inject styles (in case they were lost)
        injectTableStyles();
        
        // Process cells
        processTextCells(table, true);
        applyScoreRAGRating(table);
        
        // Fix spacing
        fixViewSpacing(true);
        
        // Mark as enhanced
        isEnhanced = true;
        lastEnhancedTime = Date.now();
        table.classList.add('enhanced');
        
        // Make view visible
        const view = document.querySelector(CONFIG.targetView);
        if (view) {
            view.style.opacity = '1';
            view.style.visibility = 'visible';
        }
        
        // Remove hide style
        const hideStyle = document.getElementById('vue-table-immediate-hide');
        if (hideStyle) hideStyle.remove();
        
        log('✅ All enhancements applied');
        return true;
    }
    
    // Monitor for table needing re-enhancement
    function startEnhancementMonitor() {
        // Clear any existing interval
        if (enhancementCheckInterval) {
            clearInterval(enhancementCheckInterval);
        }
        
        // Check every second if table needs enhancement
        enhancementCheckInterval = setInterval(() => {
            const viewMode = detectViewMode();
            
            // If we're in table view and table needs enhancement
            if (viewMode === 'table' && needsEnhancement()) {
                log('Table needs re-enhancement (likely returned from report)');
                applyAllEnhancements();
            }
            
            // Update current view mode
            if (viewMode !== currentViewMode) {
                log(`View mode changed: ${currentViewMode} → ${viewMode}`);
                currentViewMode = viewMode;
                
                // If switching to table view, ensure it's enhanced
                if (viewMode === 'table') {
                    setTimeout(() => {
                        if (needsEnhancement()) {
                            log('Enhancing table after view mode change');
                            applyAllEnhancements();
                        }
                    }, 500);
                }
            }
        }, 1000);
    }
    
    // Main enhancement function
    async function enhanceVueTable() {
        let attempts = 0;
        
        const checkAndEnhance = setInterval(() => {
            attempts++;
            
            // Fix spacing
            fixViewSpacing(attempts === 1);
            
            const table = document.querySelector(`${CONFIG.targetView} table`);
            
            if (table && table.querySelector('tbody tr')) {
                log('Vue table found with data, applying initial enhancements...');
                
                clearInterval(checkAndEnhance);
                
                // Apply all enhancements
                applyAllEnhancements();
                
                // Set up cycle detection
                currentCycle = detectCurrentCycle();
                log(`Initial cycle: ${currentCycle}`);
                
                // Start monitoring for re-enhancement needs
                startEnhancementMonitor();
                
                // Set up mutation observer for table updates
                let updateTimeout;
                const observer = new MutationObserver((mutations) => {
                    if (observerPaused) return;
                    
                    let isRelevantChange = false;
                    mutations.forEach(mutation => {
                        if (mutation.type === 'childList' && 
                            (mutation.target.tagName === 'TBODY' || 
                             mutation.target.classList?.contains('p-datatable'))) {
                            isRelevantChange = true;
                        }
                    });
                    
                    if (!isRelevantChange) return;
                    
                    clearTimeout(updateTimeout);
                    updateTimeout = setTimeout(() => {
                        const newCycle = detectCurrentCycle();
                        
                        if (newCycle !== currentCycle) {
                            log(`CYCLE CHANGED: ${currentCycle} → ${newCycle}`);
                            currentCycle = newCycle;
                            
                            const updatedTable = document.querySelector(`${CONFIG.targetView} table`);
                            if (updatedTable) {
                                processTextCells(updatedTable, true);
                                applyScoreRAGRating(updatedTable);
                            }
                        }
                    }, 300);
                });
                
                // Observe table container
                const tableContainer = table.closest('.p-datatable') || table.parentElement;
                if (tableContainer) {
                    observer.observe(tableContainer, {
                        childList: true,
                        subtree: true,
                        attributes: false
                    });
                }
                
                // Click handler for cycle buttons
                document.addEventListener('click', (e) => {
                    if (e.target.matches(`${CONFIG.targetView} button, ${CONFIG.targetView} .p-button, ${CONFIG.targetView} [role="tab"]`)) {
                        setTimeout(() => {
                            const newCycle = detectCurrentCycle();
                            if (newCycle !== currentCycle) {
                                log(`Cycle changed via button: ${currentCycle} → ${newCycle}`);
                                currentCycle = newCycle;
                                
                                const table = document.querySelector(`${CONFIG.targetView} table`);
                                if (table) {
                                    processTextCells(table, true);
                                    applyScoreRAGRating(table);
                                }
                            }
                        }, 500);
                    }
                });
                
                log('✅ Initial enhancement complete');
                
            } else if (attempts >= CONFIG.maxAttempts) {
                log('❌ Table not found after maximum attempts');
                clearInterval(checkAndEnhance);
                
                // Still start monitor in case table appears later
                startEnhancementMonitor();
                
                const viewContainer = document.querySelector(CONFIG.targetView);
                if (viewContainer) {
                    viewContainer.style.opacity = '1';
                    viewContainer.style.visibility = 'visible';
                }
                
                const hideStyle = document.getElementById('vue-table-immediate-hide');
                if (hideStyle) hideStyle.remove();
            }
        }, CONFIG.checkInterval);
    }
    
    // Initialize
    function initialize() {
        log('Initializing Vue Table Enhancer v1.8h...');
        
        // Initial fix
        fixViewSpacing(true);
        
        // Start enhancement
        setTimeout(() => {
            enhanceVueTable();
        }, CONFIG.initialDelay);
    }
    
    // Handle Knack events - MORE AGGRESSIVE
    if (window.Knack && window.$) {
        // Listen for ANY view render
        $(document).on('knack-view-render.any', function(event, view) {
            log(`Knack view rendered: ${view.key}`);
            
            // If it's our target view, force re-enhancement
            if (view.key === 'view_2776' || view.key === 'view_2772') {
                log('Target view rendered - checking for enhancement');
                setTimeout(() => {
                    if (needsEnhancement()) {
                        log('Re-enhancing after view render');
                        applyAllEnhancements();
                    }
                }, 500);
            }
            
            // Always check spacing
            setTimeout(() => {
                fixViewSpacing();
            }, 100);
        });
        
        // Listen for scene renders
        $(document).on('knack-scene-render.any', function(event, scene) {
            log(`Knack scene rendered: ${scene.key}`);
            
            if (scene.key === 'scene_1095' || scene.key === 'scene_1014') {
                log('Target scene rendered - reinitializing');
                setTimeout(initialize, 500);
            }
        });
        
        // Listen for page changes (back button, etc)
        $(document).on('knack-page-render.any', function(event, page) {
            log('Page rendered - checking if enhancement needed');
            setTimeout(() => {
                if (needsEnhancement()) {
                    log('Re-enhancing after page render');
                    applyAllEnhancements();
                }
            }, 500);
        });
    }
    
    // Start when ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        setTimeout(initialize, 100);
    }
    
    // Also listen for browser back/forward navigation
    window.addEventListener('popstate', function() {
        log('Browser navigation detected');
        setTimeout(() => {
            if (needsEnhancement()) {
                log('Re-enhancing after browser navigation');
                applyAllEnhancements();
            }
        }, 500);
    });
    
})();

