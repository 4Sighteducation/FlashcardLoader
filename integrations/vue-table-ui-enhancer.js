// Vue Table UI Enhancer for Scene 1014
// Purpose: Enhance the visual appearance of the Vue.js student table in view_2772
// No functionality changes - purely cosmetic improvements

(function() {
    'use strict';
    
    const DEBUG = true;
    const log = (msg, data) => {
        if (DEBUG) console.log(`[VueTableUI] ${msg}`, data || '');
    };
    
    log('🎨 Vue Table UI Enhancer Initializing...');
    
    // Configuration
    const CONFIG = {
        targetView: '#view_2772',
        checkInterval: 500,
        maxAttempts: 20
    };
    
    // Enhanced styles for the Vue table
    function injectEnhancedStyles() {
        if (document.getElementById('vue-table-enhanced-styles')) return;
        
        const styles = `
            <style id="vue-table-enhanced-styles">
                /* Enhanced table container */
                #view_2772 .kn-rich_text__content {
                    padding: 0 !important;
                }
                
                /* Style the Vue table if it has specific classes */
                #view_2772 table {
                    width: 100% !important;
                    border-collapse: separate !important;
                    border-spacing: 0 !important;
                    border-radius: 12px !important;
                    overflow: hidden !important;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.08) !important;
                    background: white !important;
                }
                
                /* Enhanced table headers */
                #view_2772 thead th,
                #view_2772 th {
                    background: linear-gradient(135deg, #079baa 0%, #00b8d4 100%) !important;
                    color: white !important;
                    padding: 16px 12px !important;
                    text-align: left !important;
                    font-weight: 600 !important;
                    font-size: 14px !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.5px !important;
                    border: none !important;
                    position: sticky !important;
                    top: 0 !important;
                    z-index: 10 !important;
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
                    padding: 14px 12px !important;
                    color: #333 !important;
                    font-size: 14px !important;
                    border: none !important;
                    vertical-align: middle !important;
                }
                
                /* Student name cells - make them stand out */
                #view_2772 td:first-child {
                    font-weight: 600 !important;
                    color: #23356f !important;
                }
                
                /* Report buttons enhancement */
                #view_2772 .Report,
                #view_2772 button[class*="Report"],
                #view_2772 a[class*="Report"],
                #view_2772 button:contains("Report"),
                #view_2772 .kn-button,
                #view_2772 button {
                    background: linear-gradient(135deg, #079baa 0%, #00e5db 100%) !important;
                    color: white !important;
                    border: none !important;
                    padding: 8px 20px !important;
                    border-radius: 6px !important;
                    font-weight: 500 !important;
                    font-size: 13px !important;
                    cursor: pointer !important;
                    transition: all 0.3s ease !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.5px !important;
                    display: inline-block !important;
                    text-decoration: none !important;
                    box-shadow: 0 2px 8px rgba(7, 155, 170, 0.2) !important;
                }
                
                #view_2772 .Report:hover,
                #view_2772 button:hover,
                #view_2772 a[class*="Report"]:hover {
                    transform: translateY(-2px) !important;
                    box-shadow: 0 4px 12px rgba(7, 155, 170, 0.3) !important;
                    background: linear-gradient(135deg, #00b8d4 0%, #00e5db 100%) !important;
                }
                
                /* Score cells - add visual indicators */
                #view_2772 td:nth-child(n+5) {
                    font-weight: 500 !important;
                    text-align: center !important;
                }
                
                /* High scores (8-10) - green */
                #view_2772 td:contains("10"),
                #view_2772 td:contains("9"),
                #view_2772 td:contains("8") {
                    color: #22c55e !important;
                    font-weight: 600 !important;
                }
                
                /* Medium scores (5-7) - orange */
                #view_2772 td:contains("7"),
                #view_2772 td:contains("6"),
                #view_2772 td:contains("5") {
                    color: #f59e0b !important;
                }
                
                /* Low scores (1-4) - red */
                #view_2772 td:contains("4"),
                #view_2772 td:contains("3"),
                #view_2772 td:contains("2"),
                #view_2772 td:contains("1") {
                    color: #ef4444 !important;
                }
                
                /* Yes/No indicators */
                #view_2772 td:contains("Yes") {
                    color: #22c55e !important;
                    font-weight: 600 !important;
                }
                
                #view_2772 td:contains("No") {
                    color: #6b7280 !important;
                }
                
                /* Pagination enhancement */
                #view_2772 .pagination,
                #view_2772 [class*="pagination"] {
                    margin-top: 20px !important;
                    padding: 10px !important;
                    background: #f8f9fa !important;
                    border-radius: 8px !important;
                }
                
                #view_2772 .pagination a,
                #view_2772 .pagination button {
                    background: white !important;
                    border: 1px solid #e0e0e0 !important;
                    color: #079baa !important;
                    padding: 8px 12px !important;
                    margin: 0 4px !important;
                    border-radius: 4px !important;
                    transition: all 0.2s ease !important;
                }
                
                #view_2772 .pagination a:hover,
                #view_2772 .pagination button:hover {
                    background: #079baa !important;
                    color: white !important;
                    border-color: #079baa !important;
                }
                
                #view_2772 .pagination .active,
                #view_2772 .pagination .current {
                    background: #079baa !important;
                    color: white !important;
                    border-color: #079baa !important;
                }
                
                /* Filter/Search area enhancement */
                #view_2772 input[type="text"],
                #view_2772 input[type="search"],
                #view_2772 select {
                    border: 2px solid #e0e0e0 !important;
                    border-radius: 6px !important;
                    padding: 8px 12px !important;
                    font-size: 14px !important;
                    transition: all 0.2s ease !important;
                }
                
                #view_2772 input:focus,
                #view_2772 select:focus {
                    border-color: #079baa !important;
                    box-shadow: 0 0 0 3px rgba(7, 155, 170, 0.1) !important;
                    outline: none !important;
                }
                
                /* Add subtle animations */
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                #view_2772 table {
                    animation: fadeIn 0.5s ease-out !important;
                }
                
                /* Responsive improvements */
                @media (max-width: 768px) {
                    #view_2772 {
                        overflow-x: auto !important;
                        -webkit-overflow-scrolling: touch !important;
                    }
                    
                    #view_2772 table {
                        min-width: 600px !important;
                    }
                }
                
                /* Loading state enhancement */
                #view_2772 .loading,
                #view_2772 [class*="loading"] {
                    position: relative !important;
                }
                
                #view_2772 .loading::after {
                    content: "" !important;
                    position: absolute !important;
                    top: 50% !important;
                    left: 50% !important;
                    width: 40px !important;
                    height: 40px !important;
                    margin: -20px 0 0 -20px !important;
                    border: 4px solid #f3f3f3 !important;
                    border-top: 4px solid #079baa !important;
                    border-radius: 50% !important;
                    animation: spin 1s linear infinite !important;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
        log('✅ Enhanced styles injected');
    }
    
    // Wait for Vue table to render and enhance it
    function enhanceVueTable() {
        let attempts = 0;
        
        const checkInterval = setInterval(() => {
            attempts++;
            
            const tableContainer = document.querySelector('#view_2772');
            const table = tableContainer ? tableContainer.querySelector('table') : null;
            
            if (table) {
                log('✅ Vue table found, applying enhancements');
                
                // Add a class for easier targeting
                table.classList.add('vue-enhanced-table');
                
                // Find and enhance Report buttons specifically
                const reportButtons = tableContainer.querySelectorAll('button, a');
                reportButtons.forEach(btn => {
                    if (btn.textContent && btn.textContent.includes('Report')) {
                        btn.classList.add('Report');
                        log('Enhanced Report button');
                    }
                });
                
                // Add hover effects to rows
                const rows = table.querySelectorAll('tbody tr');
                rows.forEach(row => {
                    row.style.cursor = 'pointer';
                });
                
                clearInterval(checkInterval);
                log('✅ Vue table enhancement complete');
                
            } else if (attempts >= CONFIG.maxAttempts) {
                log('⚠️ Vue table not found after maximum attempts');
                clearInterval(checkInterval);
            } else {
                log(`Waiting for Vue table... (attempt ${attempts}/${CONFIG.maxAttempts})`);
            }
        }, CONFIG.checkInterval);
    }
    
    // Initialize enhancements
    function initialize() {
        // Check if we're on scene_1014
        const isScene1014 = window.location.hash.includes('coaching-staff-admin') || 
                           document.querySelector('#kn-scene_1014');
        
        if (!isScene1014) {
            log('Not on scene_1014, skipping enhancement');
            return;
        }
        
        log('On scene_1014, starting enhancement process');
        
        // Inject styles immediately
        injectEnhancedStyles();
        
        // Wait a bit for Vue to initialize, then enhance
        setTimeout(() => {
            enhanceVueTable();
        }, 1000);
        
        // Also listen for any Vue re-renders
        const observer = new MutationObserver((mutations) => {
            for (let mutation of mutations) {
                if (mutation.type === 'childList' && mutation.target.id === 'view_2772') {
                    log('Vue table re-rendered, re-applying enhancements');
                    setTimeout(enhanceVueTable, 100);
                    break;
                }
            }
        });
        
        const targetNode = document.querySelector('#view_2772');
        if (targetNode) {
            observer.observe(targetNode, { childList: true, subtree: true });
            log('Mutation observer attached to view_2772');
        }
    }
    
    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
    
    log('Vue Table UI Enhancer loaded');
    
})();
