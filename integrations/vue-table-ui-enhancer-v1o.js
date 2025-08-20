// Vue Table UI Enhancer v2.0 - COMPLETE REWRITE
// Fixes: Reloading state, styling uniformity, cycle-specific data
// Version: 2.0

(function() {
    'use strict';
    
    const DEBUG = true;
    const log = (msg, data) => {
        if (DEBUG) console.log(`[VueTableV2] ${msg}`, data || '');
    };
    
    log('🚀 Vue Table Enhancer v2.0 Starting...');
    
    // RACE CONDITION PREVENTION FLAGS
    let isProcessing = false;
    let fixSpacingTimeout = null;
    let lastFixSpacingTime = 0;
    const MIN_SPACING_FIX_INTERVAL = 1000;
    
    // Track enhanced state - IMPROVED STATE MANAGEMENT
    let isEnhanced = false;
    let lastEnhancedTime = 0;
    let enhancementCheckInterval = null;
    let currentSceneKey = null;  // Track scene changes
    let reinitializeTimeout = null;  // Prevent multiple reinits
    
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
        checkInterval: 500,
        maxAttempts: 30,
        initialDelay: 500,
        maxPreviewWords: 8
    };
    
    // Get the correct view selector based on current scene
    function getTargetView() {
        if (document.querySelector('#view_2772')) return '#view_2772';
        if (document.querySelector('#view_2776')) return '#view_2776';
        return null;
    }
    
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
        const targetView = getTargetView();
        const table = targetView ? document.querySelector(`${targetView} table`) : null;
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
        const targetView = getTargetView();
        if (!targetView) return false;
        const table = document.querySelector(`${targetView} table`);
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
    
    // Detect current cycle - IMPROVED to return cycle NUMBER
    function detectCurrentCycle() {
        const targetView = getTargetView();
        if (!targetView) return 1;
        
        const activeTab = document.querySelector(
            `${targetView} .p-tabview-nav li[aria-selected="true"], 
             ${targetView} .p-button.p-highlight,
             ${targetView} button.active,
             ${targetView} .p-button-primary`
        );
        
        if (activeTab) {
            const text = activeTab.textContent.trim();
            // Extract cycle number from text like "Cycle 1" or just "1"
            const match = text.match(/(\d+)/);
            if (match) {
                return parseInt(match[1]);
            }
        }
        
        return 1; // Default to cycle 1
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
    
    // Add cycle filter information section
    function addCycleFilterInfo() {
        // Check if info already exists
        if (document.querySelector('.cycle-filter-info')) {
            return;
        }
        
        const targetView = getTargetView();
        if (!targetView) return;
        const tableView = document.querySelector(targetView);
        if (!tableView) return;
        
        // Create the info section
        const infoHTML = `
            <div class="cycle-filter-info">
                <div class="cycle-filter-info-icon">ℹ️</div>
                <div class="cycle-filter-info-content">
                    <h3>Understanding Cycle Filters</h3>
                    <p><strong>Cycle 1:</strong> Shows ALL students (completed Cycle 1 or no cycles)</p>
                    <p><strong>Cycles 2+:</strong> Shows ONLY students who completed that cycle's questionnaire</p>
                    <p class="cycle-filter-note">💡 Students appear in each tab where they've completed questionnaires</p>
                </div>
            </div>
        `;
        
        // Find the table or its container
        const table = tableView.querySelector('table');
        const tableParent = table?.parentElement || tableView;
        
        // Insert before the table
        tableParent.insertAdjacentHTML('afterbegin', infoHTML);
        log('Cycle filter info section added');
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
                /* Cycle Filter Info Section */
                .cycle-filter-info {
                    background: linear-gradient(135deg, #f0fdfa 0%, #e6fffa 100%);
                    border: 1px solid #5eead4;
                    border-left: 4px solid #079baa;
                    border-radius: 8px;
                    padding: 16px 20px;
                    margin: 20px 0 25px 0;
                    display: flex;
                    align-items: flex-start;
                    gap: 15px;
                    box-shadow: 0 2px 8px rgba(7, 155, 170, 0.08);
                    animation: slideDown 0.3s ease-out;
                }
                
                .cycle-filter-info-icon {
                    font-size: 24px;
                    line-height: 1;
                    flex-shrink: 0;
                }
                
                .cycle-filter-info-content {
                    flex: 1;
                }
                
                .cycle-filter-info h3 {
                    margin: 0 0 10px 0;
                    color: #23356f;
                    font-size: 16px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .cycle-filter-info p {
                    margin: 5px 0;
                    color: #374151;
                    font-size: 14px;
                    line-height: 1.5;
                }
                
                .cycle-filter-info p strong {
                    color: #079baa;
                    font-weight: 600;
                }
                
                .cycle-filter-info .cycle-filter-note {
                    margin-top: 10px;
                    padding-top: 10px;
                    border-top: 1px solid rgba(7, 155, 170, 0.2);
                    color: #065f46;
                    font-style: italic;
                    font-size: 13px;
                }
                
                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                /* Responsive design for info section */
                @media (max-width: 768px) {
                    .cycle-filter-info {
                        flex-direction: column;
                        gap: 10px;
                        padding: 14px;
                        margin: 15px 10px;
                    }
                    
                    .cycle-filter-info h3 {
                        font-size: 14px;
                    }
                    
                    .cycle-filter-info p {
                        font-size: 12px;
                    }
                    
                    .cycle-filter-info .cycle-filter-note {
                        font-size: 11px;
                    }
                }
                
                /* Critical positioning fixes */
                #view_2772, #view_2776 {
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
                #view_2772 .kn-title h1, #view_2772 .kn-title h2,
                #view_2776 .kn-title h1, #view_2776 .kn-title h2 {
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
                
                #view_2772 .kn-title h1:after, #view_2772 .kn-title h2:after,
                #view_2776 .kn-title h1:after, #view_2776 .kn-title h2:after {
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
                #view_2772 table, #view_2776 table {
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
                #view_2772 thead th, #view_2776 thead th {
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
                
                /* IMPROVED COLUMN WIDTHS - UNIFORM ACROSS BOTH SCENES */
                /* Apply fixed layout to ensure widths are respected */
                #view_2772 table, #view_2776 table {
                    table-layout: fixed !important;
                }
                
                /* Student Name - Wider for visibility */
                #view_2772 th:nth-child(1), #view_2772 td:nth-child(1),
                #view_2776 th:nth-child(1), #view_2776 td:nth-child(1) {
                    width: 160px !important;
                    min-width: 160px !important;
                    max-width: 160px !important;
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                    white-space: nowrap !important;
                    padding-left: 12px !important;
                }
                
                /* Group - Better sized */
                #view_2772 th:nth-child(2), #view_2772 td:nth-child(2),
                #view_2776 th:nth-child(2), #view_2776 td:nth-child(2) {
                    width: 85px !important;
                    min-width: 85px !important;
                    max-width: 85px !important;
                    text-align: center !important;
                }
                
                /* Year Group - Better sized */
                #view_2772 th:nth-child(3), #view_2772 td:nth-child(3),
                #view_2776 th:nth-child(3), #view_2776 td:nth-child(3) {
                    width: 85px !important;
                    min-width: 85px !important;
                    max-width: 85px !important;
                    text-align: center !important;
                }
                
                /* Column 4 - Empty/checkbox column */
                #view_2772 th:nth-child(4), #view_2772 td:nth-child(4),
                #view_2776 th:nth-child(4), #view_2776 td:nth-child(4) {
                    width: 50px !important;
                    min-width: 50px !important;
                    max-width: 50px !important;
                    text-align: center !important;
                }
                
                /* Focus - Now at column 5 */
                #view_2772 th:nth-child(5), #view_2772 td:nth-child(5),
                #view_2776 th:nth-child(5), #view_2776 td:nth-child(5) {
                    width: 90px !important;
                    min-width: 90px !important;
                    max-width: 90px !important;
                    text-align: center !important;
                }
                
                /* VESPAO columns - Shifted by 1 (columns 6-11) */
                #view_2772 th:nth-child(6), #view_2772 td:nth-child(6),
                #view_2772 th:nth-child(7), #view_2772 td:nth-child(7),
                #view_2772 th:nth-child(8), #view_2772 td:nth-child(8),
                #view_2772 th:nth-child(9), #view_2772 td:nth-child(9),
                #view_2772 th:nth-child(10), #view_2772 td:nth-child(10),
                #view_2772 th:nth-child(11), #view_2772 td:nth-child(11),
                #view_2776 th:nth-child(6), #view_2776 td:nth-child(6),
                #view_2776 th:nth-child(7), #view_2776 td:nth-child(7),
                #view_2776 th:nth-child(8), #view_2776 td:nth-child(8),
                #view_2776 th:nth-child(9), #view_2776 td:nth-child(9),
                #view_2776 th:nth-child(10), #view_2776 td:nth-child(10),
                #view_2776 th:nth-child(11), #view_2776 td:nth-child(11) {
                    width: 40px !important;
                    min-width: 40px !important;
                    max-width: 40px !important;
                    text-align: center !important;
                    padding: 8px 4px !important;
                    font-weight: 600 !important;
                }
                
                /* Report Response - Now at column 12 - ENSURE CONSISTENCY */
                #view_2772 th:nth-child(12), #view_2772 td:nth-child(12),
                #view_2776 th:nth-child(12), #view_2776 td:nth-child(12) {
                    width: 240px !important;
                    min-width: 240px !important;
                    max-width: 240px !important;
                    padding: 10px 8px !important;
                    word-wrap: break-word !important;
                    overflow-wrap: break-word !important;
                }
                
                /* Action Plan - Now at column 13 - ENSURE CONSISTENCY */
                #view_2772 th:nth-child(13), #view_2772 td:nth-child(13),
                #view_2776 th:nth-child(13), #view_2776 td:nth-child(13) {
                    width: 240px !important;
                    min-width: 240px !important;
                    max-width: 240px !important;
                    padding: 10px 8px !important;
                    word-wrap: break-word !important;
                    overflow-wrap: break-word !important;
                }
                
                /* Report button - Now at column 14 */
                #view_2772 th:nth-child(14), #view_2772 td:nth-child(14),
                #view_2776 th:nth-child(14), #view_2776 td:nth-child(14) {
                    width: 100px !important;
                    min-width: 100px !important;
                    max-width: 100px !important;
                    text-align: center !important;
                }
                
                /* SPECIFIC TUTOR VIEW OVERRIDES for better consistency */
                #view_2776 table {
                    table-layout: fixed !important;
                    width: 100% !important;
                }
                
                /* Ensure tutor view respects column widths */
                #view_2776 thead th,
                #view_2776 tbody td {
                    box-sizing: border-box !important;
                }
                
                /* Prevent cell content from expanding columns in tutor view */
                #view_2776 td {
                    overflow: hidden !important;
                    text-overflow: ellipsis !important;
                }
                
                /* Special handling for text columns in tutor view */
                #view_2776 td:nth-child(12),
                #view_2776 td:nth-child(13) {
                    white-space: normal !important;
                    word-wrap: break-word !important;
                    overflow-wrap: break-word !important;
                }
                
                /* Rows */
                #view_2772 tbody tr, #view_2776 tbody tr {
                    transition: all 0.2s ease !important;
                    border-bottom: 1px solid #f0f0f0 !important;
                }
                
                #view_2772 tbody tr:hover, #view_2776 tbody tr:hover {
                    background-color: #f0f8ff !important;
                    box-shadow: 0 2px 8px rgba(7, 155, 170, 0.1) !important;
                }
                
                /* Base cell styles */
                #view_2772 td, #view_2776 td {
                    padding: 10px 6px !important;
                    color: #333 !important;
                    font-size: 13px !important;
                    border: none !important;
                    vertical-align: middle !important;
                }
                
                /* Student name */
                #view_2772 td:first-child, #view_2776 td:first-child {
                    font-weight: 600 !important;
                    color: #23356f !important;
                    padding-left: 10px !important;
                }
                
                /* Content cells with green */
                #view_2772 td.has-content, #view_2776 td.has-content {
                    background: linear-gradient(to right, #10b981 4px, rgba(16, 185, 129, 0.08) 4px) !important;
                    color: #065f46 !important;
                    cursor: pointer !important;
                    font-weight: 500 !important;
                    position: relative !important;
                    padding-left: 12px !important;
                    transition: all 0.2s ease !important;
                }
                
                #view_2772 td.has-content:hover, #view_2776 td.has-content:hover {
                    background: linear-gradient(to right, #10b981 4px, rgba(16, 185, 129, 0.15) 4px) !important;
                    transform: translateX(2px) !important;
                }
                
                /* No content cells with red */
                #view_2772 td.no-content, #view_2776 td.no-content {
                    background: linear-gradient(to right, #ef4444 4px, rgba(239, 68, 68, 0.08) 4px) !important;
                    color: #991b1b !important;
                    font-style: italic !important;
                    font-size: 12px !important;
                    padding-left: 12px !important;
                }
                
                /* Click indicator */
                #view_2772 td.has-content::after, #view_2776 td.has-content::after {
                    content: "📖";
                    position: absolute;
                    right: 8px;
                    opacity: 0.5;
                    font-size: 14px;
                }
                
                /* RAG Score colors */
                #view_2772 td.score-low, #view_2776 td.score-low {
                    background: #fee2e2 !important;
                    color: #991b1b !important;
                    font-weight: 700 !important;
                }
                
                #view_2772 td.score-medium, #view_2776 td.score-medium {
                    background: #fed7aa !important;
                    color: #9a3412 !important;
                    font-weight: 600 !important;
                }
                
                #view_2772 td.score-good, #view_2776 td.score-good {
                    background: #bbf7d0 !important;
                    color: #14532d !important;
                    font-weight: 600 !important;
                }
                
                #view_2772 td.score-high, #view_2776 td.score-high {
                    background: #86efac !important;
                    color: #14532d !important;
                    font-weight: 700 !important;
                }
                
                /* Buttons */
                #view_2772 button, #view_2776 button {
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
                
                #view_2772 button:hover, #view_2776 button:hover {
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
    
    // CYCLE-AWARE DATA STORAGE
    const cycleDataCache = new Map(); // Cache for cycle-specific data
    
    // Process text cells with cycle awareness
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
        
        const currentCycleNum = detectCurrentCycle();
        const rows = table.querySelectorAll('tbody tr');
        
        rows.forEach((row, rowIndex) => {
            const cells = row.querySelectorAll('td');
            const studentName = cells[0]?.textContent?.trim() || 'Student';
            const cacheKey = `${studentName}_cycle_${currentCycleNum}`;
            
            // Process Report Response
            if (responseColumnIndex >= 0 && cells[responseColumnIndex]) {
                const cell = cells[responseColumnIndex];
                const currentHTML = cell.innerHTML;
                const cleanText = stripHtmlTags(currentHTML);
                
                // Store in cache for this cycle
                if (!cycleDataCache.has(cacheKey)) {
                    cycleDataCache.set(cacheKey, {});
                }
                const studentData = cycleDataCache.get(cacheKey);
                studentData.reportResponse = cleanText;
                
                cell.classList.remove('has-content', 'no-content');
                cell.onclick = null;
                
                if (cleanText && cleanText.length > 0) {
                    const preview = getPreviewText(cleanText);
                    cell.textContent = preview;
                    cell.classList.add('has-content');
                    cell.title = 'Click to read full response';
                    
                    cell.onclick = (e) => {
                        e.stopPropagation();
                        const cycleText = currentCycleNum ? `(Cycle ${currentCycleNum})` : '';
                        showModal(`${studentName} - Report Response ${cycleText}`, cleanText);
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
                
                // Store in cache for this cycle
                const studentData = cycleDataCache.get(cacheKey) || {};
                studentData.actionPlan = cleanText;
                cycleDataCache.set(cacheKey, studentData);
                
                cell.classList.remove('has-content', 'no-content');
                cell.onclick = null;
                
                if (cleanText && cleanText.length > 0) {
                    const preview = getPreviewText(cleanText);
                    cell.textContent = preview;
                    cell.classList.add('has-content');
                    cell.title = 'Click to read full action plan';
                    
                    cell.onclick = (e) => {
                        e.stopPropagation();
                        const cycleText = currentCycleNum ? `(Cycle ${currentCycleNum})` : '';
                        showModal(`${studentName} - Action Plan ${cycleText}`, cleanText);
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
    
    // Force column widths programmatically for consistency
    function enforceColumnWidths(table) {
        const scene = getCurrentScene();
        if (!table) return;
        
        // Detect column structure by looking for key columns
        const headers = table.querySelectorAll('thead th');
        let reportResponseIdx = -1;
        let actionPlanIdx = -1;
        let vespaStartIdx = -1;
        
        // Find key columns
        headers.forEach((th, idx) => {
            const text = th.textContent.trim();
            if (text.toLowerCase().includes('report') && text.toLowerCase().includes('response')) {
                reportResponseIdx = idx;
            }
            if (text.toLowerCase().includes('action') && text.toLowerCase().includes('plan')) {
                actionPlanIdx = idx;
            }
            if (text === 'V' && vespaStartIdx === -1) {
                vespaStartIdx = idx;
            }
        });
        
        log(`Column detection: Report Response at ${reportResponseIdx}, Action Plan at ${actionPlanIdx}, VESPA starts at ${vespaStartIdx}`);
        
        // Build dynamic column width map based on detected structure
        const columnWidthMap = {};
        
        // For tutor view with duplicated columns
        if (scene === 'tutor' && headers.length > 14) {
            // First set of columns
            columnWidthMap[0] = 160;  // Student Name
            columnWidthMap[1] = 85;   // Group
            columnWidthMap[2] = 85;   // Year Group (might be empty)
            
            // Adjust based on where we found Focus and VESPA columns
            if (headers[3]?.textContent.trim() === 'Focus') {
                // Focus is at position 3 (shifted structure)
                columnWidthMap[3] = 90;   // Focus
                columnWidthMap[4] = 40;   // V
                columnWidthMap[5] = 40;   // E
                columnWidthMap[6] = 40;   // S
                columnWidthMap[7] = 40;   // P
                columnWidthMap[8] = 40;   // A
                columnWidthMap[9] = 40;   // O
                columnWidthMap[10] = 240; // Report Response (at index 10)
                columnWidthMap[11] = 240; // Action Plan (at index 11)
            } else {
                // Standard structure with checkbox column
                columnWidthMap[3] = 50;   // Empty/checkbox
                columnWidthMap[4] = 90;   // Focus
                columnWidthMap[5] = 40;   // V
                columnWidthMap[6] = 40;   // E
                columnWidthMap[7] = 40;   // S
                columnWidthMap[8] = 40;   // P
                columnWidthMap[9] = 40;   // A
                columnWidthMap[10] = 40;  // O
                columnWidthMap[11] = 240; // Report Response
                columnWidthMap[12] = 240; // Action Plan
            }
            
            // Handle duplicate columns (if they exist)
            if (headers.length > 12) {
                for (let i = 12; i < headers.length; i++) {
                    if (i < 24) {
                        // Mirror the widths for duplicate columns
                        columnWidthMap[i] = columnWidthMap[i - 12] || 100;
                    }
                }
            }
        } else {
            // Standard structure for staff view
            columnWidthMap[0] = 160;  // Student Name
            columnWidthMap[1] = 85;   // Group
            columnWidthMap[2] = 85;   // Year Group
            columnWidthMap[3] = 50;   // Empty/checkbox
            columnWidthMap[4] = 90;   // Focus
            columnWidthMap[5] = 40;   // V
            columnWidthMap[6] = 40;   // E
            columnWidthMap[7] = 40;   // S
            columnWidthMap[8] = 40;   // P
            columnWidthMap[9] = 40;   // A
            columnWidthMap[10] = 40;  // O
            columnWidthMap[11] = 240; // Report Response
            columnWidthMap[12] = 240; // Action Plan
            columnWidthMap[13] = 100; // Report button
        }
        
        // Special handling for detected Report Response and Action Plan columns
        if (reportResponseIdx >= 0) {
            columnWidthMap[reportResponseIdx] = 240;
        }
        if (actionPlanIdx >= 0) {
            columnWidthMap[actionPlanIdx] = 240;
        }
        
        // Apply widths to all headers
        headers.forEach((cell, index) => {
            const width = columnWidthMap[index];
            if (width) {
                cell.style.cssText = `
                    width: ${width}px !important;
                    min-width: ${width}px !important;
                    max-width: ${width}px !important;
                `;
            }
        });
        
        // Apply to all body cells for consistency
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            cells.forEach((cell, index) => {
                const width = columnWidthMap[index];
                if (width) {
                    cell.style.cssText += `
                        width: ${width}px !important;
                        min-width: ${width}px !important;
                        max-width: ${width}px !important;
                    `;
                }
            });
        });
        
        // Force table layout
        table.style.tableLayout = 'fixed';
        table.style.width = '100%';
        
        log(`Column widths enforced for ${scene} view with ${headers.length} columns`);
    }
    
    // Apply all enhancements to table
    function applyAllEnhancements() {
        const targetView = getTargetView();
        const table = targetView ? document.querySelector(`${targetView} table`) : null;
        if (!table || !table.querySelector('tbody tr')) {
            log('No table found to enhance');
            return false;
        }
        
        log('Applying all enhancements...');
        
        // Ensure modal exists
        createModal();
        
        // Re-inject styles (in case they were lost)
        injectTableStyles();
        
        // Add cycle filter info section
        addCycleFilterInfo();
        
        // Enforce column widths programmatically for consistency
        enforceColumnWidths(table);
        
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
        const view = document.querySelector(targetView);
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
            
            const targetView = getTargetView();
            const table = targetView ? document.querySelector(`${targetView} table`) : null;
            
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
                            
                            const targetView = getTargetView();
                            const updatedTable = targetView ? document.querySelector(`${targetView} table`) : null;
                            if (updatedTable) {
                                enforceColumnWidths(updatedTable);  // Maintain consistent widths
                                processTextCells(updatedTable, true);
                                applyScoreRAGRating(updatedTable);
                            }
                        } else {
                            // Even if cycle hasn't changed, ensure column widths remain consistent
                            const targetView = getTargetView();
                            const updatedTable = targetView ? document.querySelector(`${targetView} table`) : null;
                            if (updatedTable) {
                                enforceColumnWidths(updatedTable);
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
                    const targetView = getTargetView();
                    if (targetView && e.target.matches(`${targetView} button, ${targetView} .p-button, ${targetView} [role="tab"]`)) {
                        setTimeout(() => {
                            const newCycle = detectCurrentCycle();
                            if (newCycle !== currentCycle) {
                                log(`Cycle changed via button: ${currentCycle} → ${newCycle}`);
                                currentCycle = newCycle;
                                
                                const targetView = getTargetView();
                                const table = targetView ? document.querySelector(`${targetView} table`) : null;
                                if (table) {
                                    enforceColumnWidths(table);  // Ensure column widths remain consistent
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
                
                const targetView = getTargetView();
                const viewContainer = targetView ? document.querySelector(targetView) : null;
                if (viewContainer) {
                    viewContainer.style.opacity = '1';
                    viewContainer.style.visibility = 'visible';
                }
                
                const hideStyle = document.getElementById('vue-table-immediate-hide');
                if (hideStyle) hideStyle.remove();
            }
        }, CONFIG.checkInterval);
    }
    
    // IMPROVED Initialize with cleanup
    function initialize() {
        log('Initializing Vue Table Enhancer v2.0...');
        
        // Clear any pending reinitialize timeout
        if (reinitializeTimeout) {
            clearTimeout(reinitializeTimeout);
            reinitializeTimeout = null;
        }
        
        // Track current scene
        const scene = getCurrentScene();
        if (scene) {
            currentSceneKey = scene === 'tutor' ? 'scene_1095' : 'scene_1014';
        }
        
        // Clear previous enhancements if scene changed
        if (isEnhanced) {
            log('Clearing previous enhancements...');
            const existingModal = document.getElementById('vue-table-modal');
            if (existingModal) existingModal.remove();
            
            const existingInfo = document.querySelector('.cycle-filter-info');
            if (existingInfo) existingInfo.remove();
            
            isEnhanced = false;
        }
        
        // Initial fix
        fixViewSpacing(true);
        
        // Start enhancement
        setTimeout(() => {
            enhanceVueTable();
        }, CONFIG.initialDelay);
    }
    
    // IMPROVED Knack event handling with better state management
    if (window.Knack && window.$) {
        // Listen for view renders
        $(document).on('knack-view-render.view_2776 knack-view-render.view_2772', function(event, view) {
            log(`Target view rendered: ${view.key}`);
            
            // Debounced re-enhancement
            clearTimeout(reinitializeTimeout);
            reinitializeTimeout = setTimeout(() => {
                if (!isEnhanced || needsEnhancement()) {
                    log('Re-enhancing after view render');
                    applyAllEnhancements();
                }
            }, 500);
        });
        
        // Listen for scene renders with scene change detection
        $(document).on('knack-scene-render.scene_1095 knack-scene-render.scene_1014', function(event, scene) {
            log(`Target scene rendered: ${scene.key}`);
            
            // Check if scene actually changed
            if (scene.key !== currentSceneKey) {
                log(`Scene changed from ${currentSceneKey} to ${scene.key} - full reinitialize`);
                currentSceneKey = scene.key;
                
                // Full reinitialize for scene change
                clearTimeout(reinitializeTimeout);
                reinitializeTimeout = setTimeout(() => {
                    initialize();
                }, 500);
            } else {
                // Same scene, just check if enhancement needed
                clearTimeout(reinitializeTimeout);
                reinitializeTimeout = setTimeout(() => {
                    if (!isEnhanced || needsEnhancement()) {
                        log('Re-enhancing same scene');
                        applyAllEnhancements();
                    }
                }, 500);
            }
        });
        
        // Listen for page changes
        $(document).on('knack-page-render.any', function(event, page) {
            // Only act if we're on a target scene
            const scene = getCurrentScene();
            if (scene) {
                clearTimeout(reinitializeTimeout);
                reinitializeTimeout = setTimeout(() => {
                    if (needsEnhancement()) {
                        log('Re-enhancing after page render');
                        applyAllEnhancements();
                    }
                }, 500);
            }
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
