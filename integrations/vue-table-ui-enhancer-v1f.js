// Vue Table UI Enhancer with Position Fix - PRODUCTION VERSION
// Fixes view_3015/view_3204 spacing issue and enhances table UI
// Version: 4.0 FINAL

(function() {
    'use strict';
    
    // ============================================
    // CRITICAL POSITION FIX - RUNS FIRST
    // ============================================
    
    const DEBUG = true;
    const log = (msg, data) => {
        if (DEBUG) console.log(`[VueTableEnhancer] ${msg}`, data || '');
    };
    
    log('🚀 Vue Table Enhancer v4.0 Starting...');
    
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
        initialDelay: 500
    };
    
    // Detect current scene
    function getCurrentScene() {
        if (document.querySelector('#kn-scene_1095')) return 'tutor';
        if (document.querySelector('#kn-scene_1014')) return 'staff';
        return null;
    }
    
    // CRITICAL FIX: Hide empty views that push table down
    function fixViewSpacing() {
        const scene = getCurrentScene();
        if (!scene) return false;
        
        log(`Fixing view spacing for ${scene} scene`);
        
        // Configuration for each scene
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
        if (!config) return false;
        
        // Check if table view is active
        const tableView = document.querySelector(config.tableView);
        const table = tableView?.querySelector('table');
        const hasTableData = table?.querySelector('tbody tr');
        
        if (hasTableData) {
            log('Table view is active - hiding unnecessary views');
            
            // Hide academic profile if it's taking space
            if (config.academicProfile) {
                const academicView = document.querySelector(config.academicProfile);
                if (academicView && academicView.offsetHeight > 100) {
                    const hasContent = academicView.querySelector('#report-container')?.children.length > 0;
                    
                    if (!hasContent) {
                        log(`Hiding empty ${config.academicProfile} (was ${academicView.offsetHeight}px)`);
                        academicView.style.cssText = `
                            display: none !important;
                            height: 0 !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            visibility: hidden !important;
                        `;
                    }
                }
            }
            
            // Hide AI Coach view if empty
            if (config.aiCoach) {
                const aiView = document.querySelector(config.aiCoach);
                if (aiView && aiView.offsetHeight > 100 && !aiView.textContent.trim()) {
                    log(`Hiding empty ${config.aiCoach}`);
                    aiView.style.display = 'none !important';
                }
            }
            
            // Always hide hidden data views
            if (config.hiddenData) {
                const hiddenView = document.querySelector(config.hiddenData);
                if (hiddenView) {
                    hiddenView.style.cssText = `
                        display: none !important;
                        position: absolute !important;
                        left: -9999px !important;
                    `;
                }
            }
            
            // Check table position after fixes
            const tableTop = table.getBoundingClientRect().top + window.pageYOffset;
            log(`Table position: ${tableTop}px from top`);
            
            if (tableTop < 400) {
                return true; // Success!
            }
        }
        
        return false;
    }
    
    // Inject critical positioning styles
    function injectCriticalStyles() {
        if (document.getElementById('vue-table-critical-styles')) return;
        
        const styles = `
            <style id="vue-table-critical-styles">
                /* Force proper positioning */
                ${CONFIG.targetView} {
                    position: relative !important;
                    top: 0 !important;
                    margin-top: 0 !important;
                    padding-top: 0 !important;
                    transform: none !important;
                    height: auto !important;
                    min-height: 0 !important;
                    max-height: none !important;
                }
                
                ${CONFIG.targetView} [data-v-app],
                ${CONFIG.targetView} .p-datatable-wrapper,
                ${CONFIG.targetView} .p-datatable,
                ${CONFIG.targetView} .p-component {
                    position: relative !important;
                    top: 0 !important;
                    margin-top: 0 !important;
                    padding-top: 0 !important;
                    transform: none !important;
                    height: auto !important;
                    min-height: 0 !important;
                    max-height: none !important;
                    overflow: visible !important;
                }
                
                /* Hide empty views by default */
                .kn-view:empty,
                .kn-view:not(:has(*)) {
                    display: none !important;
                }
                
                /* Ensure hidden data views stay hidden */
                #view_2716, #view_449 {
                    display: none !important;
                    position: absolute !important;
                    left: -9999px !important;
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
        log('Critical styles injected');
    }
    
    // ============================================
    // TABLE ENHANCEMENT FUNCTIONS
    // ============================================
    
    // Strip HTML tags from text
    function stripHtmlTags(html) {
        if (!html) return '';
        let text = html.replace(/<br\s*\/?>/gi, ' ');
        const tmp = document.createElement('div');
        tmp.innerHTML = text;
        text = tmp.textContent || tmp.innerText || '';
        return text.replace(/\s+/g, ' ').trim();
    }
    
    // Get first sentence from text
    function getFirstSentence(text) {
        if (!text) return '';
        const match = text.match(/^[^.!?]+[.!?]/);
        if (match) return match[0];
        if (text.length > 80) return text.substring(0, 80) + '...';
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
        
        const modal = document.getElementById('vue-table-modal');
        const closeBtn = modal.querySelector('.vue-table-modal-close');
        
        closeBtn.onclick = () => modal.classList.remove('active');
        modal.onclick = (e) => {
            if (e.target === modal) modal.classList.remove('active');
        };
        
        log('Modal created');
    }
    
    // Show modal with content
    function showModal(title, content) {
        const modal = document.getElementById('vue-table-modal');
        modal.querySelector('.vue-table-modal-title').textContent = title;
        modal.querySelector('.vue-table-modal-body').textContent = stripHtmlTags(content);
        modal.classList.add('active');
    }
    
    // Inject table enhancement styles
    function injectTableStyles() {
        if (document.getElementById('vue-table-enhancement-styles')) return;
        
        const styles = `
            <style id="vue-table-enhancement-styles">
                /* Enhanced title styling */
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
                
                /* Table styles */
                ${CONFIG.targetView} table {
                    width: 100% !important;
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
                
                /* Score columns */
                ${CONFIG.targetView} th:contains("V"),
                ${CONFIG.targetView} th:contains("E"),
                ${CONFIG.targetView} th:contains("S"),
                ${CONFIG.targetView} th:contains("P"),
                ${CONFIG.targetView} th:contains("A"),
                ${CONFIG.targetView} th:contains("O") {
                    width: 40px !important;
                    text-align: center !important;
                }
                
                /* Content cells */
                ${CONFIG.targetView} td.has-content {
                    border-left: 4px solid #10b981 !important;
                    background: rgba(16, 185, 129, 0.04) !important;
                    color: #065f46 !important;
                    cursor: pointer !important;
                }
                
                ${CONFIG.targetView} td.no-content {
                    border-left: 4px solid #ef4444 !important;
                    background: rgba(239, 68, 68, 0.04) !important;
                    color: #991b1b !important;
                    font-style: italic !important;
                }
                
                /* RAG Score colors */
                ${CONFIG.targetView} td.score-low {
                    background: #fee2e2 !important;
                    color: #991b1b !important;
                    font-weight: 600 !important;
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
        log('Table enhancement styles injected');
    }
    
    // Add text cell handlers
    function addTextCellHandlers(table) {
        const headers = table.querySelectorAll('thead th');
        let responseColumnIndex = -1;
        let actionColumnIndex = -1;
        
        headers.forEach((th, idx) => {
            const text = th.textContent.trim().toLowerCase();
            if (text.includes('report response') || text.includes('response')) {
                responseColumnIndex = idx;
            }
            if (text.includes('action plan') || text.includes('action')) {
                actionColumnIndex = idx;
            }
        });
        
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            
            // Handle Report Response column
            if (responseColumnIndex >= 0 && cells[responseColumnIndex]) {
                const cell = cells[responseColumnIndex];
                const cleanText = stripHtmlTags(cell.innerHTML);
                
                cell.classList.remove('has-content', 'no-content');
                cell.onclick = null;
                
                if (cleanText.trim()) {
                    cell.textContent = getFirstSentence(cleanText);
                    cell.classList.add('has-content');
                    cell.title = 'Click to read full response';
                    
                    cell.onclick = () => {
                        const studentName = cells[0]?.textContent || 'Student';
                        showModal(`${studentName} - Report Response`, cleanText);
                    };
                } else {
                    cell.textContent = 'No response added';
                    cell.classList.add('no-content');
                    cell.title = 'No response provided';
                }
            }
            
            // Handle Action Plan column
            if (actionColumnIndex >= 0 && cells[actionColumnIndex]) {
                const cell = cells[actionColumnIndex];
                const cleanText = stripHtmlTags(cell.innerHTML);
                
                cell.classList.remove('has-content', 'no-content');
                cell.onclick = null;
                
                if (cleanText.trim()) {
                    cell.textContent = getFirstSentence(cleanText);
                    cell.classList.add('has-content');
                    cell.title = 'Click to read full action plan';
                    
                    cell.onclick = () => {
                        const studentName = cells[0]?.textContent || 'Student';
                        showModal(`${studentName} - Action Plan`, cleanText);
                    };
                } else {
                    cell.textContent = 'No action plan added';
                    cell.classList.add('no-content');
                    cell.title = 'No action plan provided';
                }
            }
        });
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
                    
                    if (isNaN(score) || score === 0) {
                        cell.classList.add('score-null');
                    } else if (score <= 3) {
                        cell.classList.add('score-low');
                    } else if (score <= 5) {
                        cell.classList.add('score-medium');
                    } else if (score <= 7) {
                        cell.classList.add('score-good');
                    } else {
                        cell.classList.add('score-high');
                    }
                }
            });
        });
    }
    
    // ============================================
    // MAIN ENHANCEMENT FUNCTION
    // ============================================
    
    async function enhanceVueTable() {
        let attempts = 0;
        
        const checkAndEnhance = setInterval(() => {
            attempts++;
            
            // First, always fix view spacing
            fixViewSpacing();
            
            const table = document.querySelector(`${CONFIG.targetView} table`);
            
            if (table && table.querySelector('tbody tr')) {
                log('Vue table found with data, applying enhancements...');
                
                // Apply all enhancements
                createModal();
                injectTableStyles();
                addTextCellHandlers(table);
                applyScoreRAGRating(table);
                
                // Setup mutation observer for updates
                const observer = new MutationObserver(() => {
                    clearTimeout(window.tableUpdateTimeout);
                    window.tableUpdateTimeout = setTimeout(() => {
                        const updatedTable = document.querySelector(`${CONFIG.targetView} table`);
                        if (updatedTable) {
                            addTextCellHandlers(updatedTable);
                            applyScoreRAGRating(updatedTable);
                            fixViewSpacing(); // Always check spacing
                        }
                    }, 500);
                });
                
                observer.observe(table, {
                    childList: true,
                    subtree: true,
                    characterData: true
                });
                
                // Mark as enhanced
                table.classList.add('enhanced');
                
                // Final position check
                setTimeout(() => {
                    fixViewSpacing();
                    
                    // Remove hide style
                    const hideStyle = document.getElementById('vue-table-immediate-hide');
                    if (hideStyle) hideStyle.remove();
                    
                    // Make view visible
                    const view = document.querySelector(CONFIG.targetView);
                    if (view) {
                        view.style.opacity = '1';
                        view.style.visibility = 'visible';
                    }
                }, 100);
                
                log('✅ Vue table enhanced successfully!');
                clearInterval(checkAndEnhance);
                
            } else if (attempts >= CONFIG.maxAttempts) {
                log('❌ Table not found after maximum attempts');
                
                // Still show the view
                const viewContainer = document.querySelector(CONFIG.targetView);
                if (viewContainer) {
                    viewContainer.style.opacity = '1';
                    viewContainer.style.visibility = 'visible';
                }
                
                const hideStyle = document.getElementById('vue-table-immediate-hide');
                if (hideStyle) hideStyle.remove();
                
                clearInterval(checkAndEnhance);
            }
        }, CONFIG.checkInterval);
    }
    
    // ============================================
    // INITIALIZATION
    // ============================================
    
    function initialize() {
        log('Initializing...');
        
        // Inject critical styles immediately
        injectCriticalStyles();
        
        // Fix spacing immediately
        fixViewSpacing();
        
        // Start enhancement process
        setTimeout(() => {
            enhanceVueTable();
        }, CONFIG.initialDelay);
        
        // Monitor for position drift
        setInterval(() => {
            const table = document.querySelector(`${CONFIG.targetView} table`);
            if (table) {
                const tableTop = table.getBoundingClientRect().top + window.pageYOffset;
                if (tableTop > 600) {
                    log(`Table drifted to ${tableTop}px - fixing...`);
                    fixViewSpacing();
                }
            }
        }, 5000);
    }
    
    // Handle Knack events
    if (window.Knack && window.$) {
        $(document).on('knack-view-render.any', function(event, view) {
            // When views render, check spacing
            setTimeout(fixViewSpacing, 100);
        });
        
        $(document).on('knack-scene-render.any', function(event, scene) {
            // Reinitialize on scene change
            setTimeout(initialize, 500);
        });
    }
    
    // Start when ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        setTimeout(initialize, 100);
    }
    
})();
