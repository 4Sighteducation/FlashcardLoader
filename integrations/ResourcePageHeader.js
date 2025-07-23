/**
 * Resource Page Header Injector
 * Monitors for curriculum app to load and injects navigation header above it
 */

(function() {
    'use strict';
    
    console.log('[Resource Page Header] Script loaded, waiting for initialization...');
    
    function initializeResourcePageHeader() {
        const config = window.RESOURCE_PAGE_HEADER_CONFIG;
        
        if (!config) {
            console.error('[Resource Page Header] Configuration not found');
            return;
        }
        
        console.log('[Resource Page Header] Initializing with config:', config);
        
        // Configuration
        const DEBUG = config.debugMode || false;
        const CURRICULUM_SELECTORS = config.curriculumSelectors || {
            sidePanel: '#sidePanel',
            courseMain: '#course-main'
        };
        
        // Helper function for debug logging
        function log(message, data) {
            if (DEBUG) {
                console.log(`[Resource Page Header] ${message}`, data || '');
            }
        }
        
        // Create the header HTML
        function createHeaderHTML() {
            return `
                <div id="resourcePageHeader" class="resource-page-header">
                    <div class="header-content">
                        <div class="header-navigation">
                            <a href="#staff-landing-page/" class="nav-button home-button">
                                <i class="fa fa-home"></i>
                                <span>Home</span>
                            </a>
                            <a href="#worksheets" class="nav-button">
                                <i class="fa fa-files-o"></i>
                                <span>Activity Worksheets</span>
                            </a>
                            <a href="#tutor-activities/suggested-curriculum" class="nav-button">
                                <i class="fa fa-calendar"></i>
                                <span>Suggested Curriculum</span>
                            </a>
                            <a href="#vespa-newsletter" class="nav-button">
                                <i class="fa fa-newspaper-o"></i>
                                <span>Newsletter</span>
                            </a>
                        </div>
                        <div class="header-title">
                            <h1>VESPA Resources</h1>
                        </div>
                    </div>
                </div>
                <style>
                    /* Header Styles */
                    .resource-page-header {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        background-color: #1a3a52;
                        color: white;
                        z-index: 1000;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                        height: 80px;
                    }
                    
                    .header-content {
                        max-width: 1400px;
                        margin: 0 auto;
                        padding: 0 20px;
                        height: 100%;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    }
                    
                    .header-navigation {
                        display: flex;
                        gap: 20px;
                        align-items: center;
                    }
                    
                    .nav-button {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 10px 16px;
                        background-color: rgba(255,255,255,0.1);
                        color: white;
                        text-decoration: none;
                        border-radius: 4px;
                        transition: all 0.3s ease;
                        font-size: 14px;
                        font-weight: 500;
                    }
                    
                    .nav-button:hover {
                        background-color: rgba(255,255,255,0.2);
                        transform: translateY(-1px);
                    }
                    
                    .nav-button i {
                        font-size: 16px;
                    }
                    
                    .home-button {
                        background-color: #ff8f00;
                    }
                    
                    .home-button:hover {
                        background-color: #e67e00;
                    }
                    
                    .header-title h1 {
                        margin: 0;
                        font-size: 24px;
                        font-weight: 600;
                    }
                    
                    /* Adjust body and curriculum content */
                    body.has-resource-header {
                        padding-top: 80px !important;
                    }
                    
                    /* Ensure side panel doesn't overlap header */
                    body.has-resource-header #sidePanel {
                        top: 80px !important;
                        height: calc(100vh - 80px) !important;
                    }
                    
                    /* Adjust course main content */
                    body.has-resource-header #course-main {
                        margin-top: 20px;
                    }
                    
                    /* Hide the original rich text view to prevent conflicts */
                    #view_3150 {
                        display: none !important;
                    }
                    
                    /* Mobile responsive */
                    @media (max-width: 768px) {
                        .resource-page-header {
                            height: auto;
                            padding: 10px 0;
                        }
                        
                        .header-content {
                            flex-direction: column;
                            gap: 10px;
                        }
                        
                        .header-navigation {
                            flex-wrap: wrap;
                            justify-content: center;
                        }
                        
                        .nav-button {
                            font-size: 12px;
                            padding: 8px 12px;
                        }
                        
                        .nav-button span {
                            display: none;
                        }
                        
                        .header-title h1 {
                            font-size: 20px;
                        }
                        
                        body.has-resource-header {
                            padding-top: 120px !important;
                        }
                        
                        body.has-resource-header #sidePanel {
                            top: 120px !important;
                            height: calc(100vh - 120px) !important;
                        }
                    }
                </style>
            `;
        }
        
        // Function to inject the header
        function injectHeader() {
            // Check if header already exists
            if (document.getElementById('resourcePageHeader')) {
                log('Header already exists, skipping injection');
                return;
            }
            
            // Create and inject the header
            const headerHTML = createHeaderHTML();
            document.body.insertAdjacentHTML('afterbegin', headerHTML);
            
            // Add class to body for CSS adjustments
            document.body.classList.add('has-resource-header');
            
            log('Header injected successfully');
            
            // Update navigation links to use Knack navigation
            const navLinks = document.querySelectorAll('#resourcePageHeader .nav-button');
            navLinks.forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const href = this.getAttribute('href');
                    if (href && href.startsWith('#')) {
                        // Use Knack's navigation
                        window.location.hash = href;
                    }
                });
            });
        }
        
        // Function to check if curriculum has loaded
        function checkCurriculumLoaded() {
            const sidePanel = document.querySelector(CURRICULUM_SELECTORS.sidePanel);
            const courseMain = document.querySelector(CURRICULUM_SELECTORS.courseMain);
            
            return sidePanel && courseMain;
        }
        
        // Main initialization function
        function init() {
            log('Starting initialization...');
            
            // Check if curriculum is already loaded
            if (checkCurriculumLoaded()) {
                log('Curriculum already loaded, injecting header immediately');
                injectHeader();
                return;
            }
            
            // Set up MutationObserver to watch for curriculum load
            log('Setting up MutationObserver to watch for curriculum...');
            
            const observer = new MutationObserver((mutations, obs) => {
                if (checkCurriculumLoaded()) {
                    log('Curriculum detected via MutationObserver');
                    obs.disconnect();
                    // Small delay to ensure curriculum is fully rendered
                    setTimeout(() => {
                        injectHeader();
                    }, 100);
                }
            });
            
            // Start observing
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            // Fallback timeout
            setTimeout(() => {
                if (!document.getElementById('resourcePageHeader')) {
                    log('Fallback timeout reached, attempting to inject header anyway');
                    observer.disconnect();
                    injectHeader();
                }
            }, 5000);
        }
        
        // Handle Knack view render events in case we need to reinitialize
        $(document).on('knack-view-render.any', function(event, view) {
            if (view && view.key === config.viewKey) {
                log('View render event detected for our view', view.key);
                // Check if we need to reinject the header
                setTimeout(() => {
                    if (!document.getElementById('resourcePageHeader') && checkCurriculumLoaded()) {
                        log('Reinjecting header after view render');
                        injectHeader();
                    }
                }, 500);
            }
        });
        
        // Start initialization
        init();
    }
    
    // Export the initializer function
    window.initializeResourcePageHeader = initializeResourcePageHeader;
    
    console.log('[Resource Page Header] Script setup complete, initializer function ready');
})();

