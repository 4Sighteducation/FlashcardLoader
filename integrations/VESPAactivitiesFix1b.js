// VESPA Activities Enhancement Script - Simple UI Enhancement v1.0
// Works WITH existing external code to enhance UI and mobile experience

(function() {
    'use strict';
    
    const VERSION = '1.0';
    const DEBUG = true;
    
    // VESPA theme colors
    const VESPA_COLORS = {
        vision: '#ff8f00',
        effort: '#86b4f0', 
        systems: '#72cb44',
        practice: '#7f31a4',
        attitude: '#f032e6'
    };
    
    function log(message, data) {
        if (DEBUG) console.log(`[VESPA Activities Enhancement v${VERSION}] ${message}`, data || '');
    }
    
    function isMobileDevice() {
        return window.innerWidth <= 768 || 
               /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    // Wait for the external code to populate view_2959
    function waitForActivities() {
        log('Waiting for activities to load...');
        
        const observer = new MutationObserver(function(mutations, obs) {
            const container = document.querySelector('#view_2959');
            
            // Check if activities have been loaded by external code
            if (container && container.innerHTML.trim().length > 100) {
                log('Activities detected, enhancing...');
                obs.disconnect();
                enhanceActivities();
            }
        });
        
        // Start observing
        const targetNode = document.querySelector('#view_2959') || document.body;
        observer.observe(targetNode, {
            childList: true,
            subtree: true,
            characterData: true
        });
        
        // Also check periodically in case mutation observer misses it
        let checkCount = 0;
        const checkInterval = setInterval(() => {
            const container = document.querySelector('#view_2959');
            if (container && container.innerHTML.trim().length > 100) {
                clearInterval(checkInterval);
                observer.disconnect();
                enhanceActivities();
            }
            
            checkCount++;
            if (checkCount > 30) { // Stop after 15 seconds
                clearInterval(checkInterval);
                log('Timeout waiting for activities');
            }
        }, 500);
    }
    
    // Main enhancement function
    function enhanceActivities() {
        log('Enhancing activities display...');
        
        try {
            // Hide the data views that should be hidden
            hideDataViews();
            
            // Enhance the existing activities display
            const container = document.querySelector('#view_2959');
            if (!container) {
                log('Activities container not found');
                return;
            }
            
            // Add a wrapper class for styling
            container.classList.add('vespa-activities-enhanced');
            
            // Find and enhance activity sections
            enhanceActivitySections();
            
            // Add mobile enhancements
            if (isMobileDevice()) {
                addMobileEnhancements();
            }
            
            // Apply styles
            applyEnhancementStyles();
            
            log('Enhancement complete!');
            
        } catch (error) {
            log('Error during enhancement:', error);
        }
    }
    
    // Hide the data views
    function hideDataViews() {
        const viewsToHide = ['#view_1089', '#view_1090', '#view_1505'];
        
        viewsToHide.forEach(selector => {
            const view = document.querySelector(selector);
            if (view) {
                view.style.display = 'none';
                log(`Hidden data view: ${selector}`);
            }
        });
    }
    
    // Enhance activity sections
    function enhanceActivitySections() {
        // Look for activity containers - adjust selectors based on actual HTML
        const activityContainers = document.querySelectorAll('#view_2959 .kn-list-item-container, #view_2959 .activity-item, #view_2959 [class*="activity"]');
        
        activityContainers.forEach((container, index) => {
            // Add enhanced class
            container.classList.add('vespa-activity-item');
            
            // Try to identify VESPA category and add color coding
            const text = container.textContent.toLowerCase();
            let category = null;
            
            if (text.includes('vision')) category = 'vision';
            else if (text.includes('effort')) category = 'effort';
            else if (text.includes('system')) category = 'systems';
            else if (text.includes('practice')) category = 'practice';
            else if (text.includes('attitude')) category = 'attitude';
            
            if (category) {
                container.classList.add(`vespa-category-${category}`);
                container.style.borderLeftColor = VESPA_COLORS[category];
            }
            
            // Add animation delay
            container.style.animationDelay = `${index * 0.1}s`;
        });
        
        // Enhance any progress indicators
        const progressBars = document.querySelectorAll('#view_2959 .progress-bar, #view_2959 [class*="progress"]');
        progressBars.forEach(bar => {
            bar.classList.add('vespa-progress-enhanced');
        });
    }
    
    // Add mobile-specific enhancements
    function addMobileEnhancements() {
        log('Adding mobile enhancements...');
        
        const container = document.querySelector('#view_2959');
        if (!container) return;
        
        // Add mobile class
        container.classList.add('vespa-mobile');
        
        // Make activity items more touch-friendly
        const items = container.querySelectorAll('.vespa-activity-item');
        items.forEach(item => {
            item.style.minHeight = '80px';
            item.style.padding = '15px';
        });
    }
    
    // Apply enhancement styles
    function applyEnhancementStyles() {
        // Remove any existing style tag to avoid duplicates
        const existingStyles = document.getElementById('vespa-activities-enhancement-styles');
        if (existingStyles) {
            existingStyles.remove();
        }
        
        const styles = `
            /* Hide data views */
            #view_1089, #view_1090, #view_1505 {
                display: none !important;
            }
            
            /* Enhanced container */
            .vespa-activities-enhanced {
                animation: fadeIn 0.5s ease;
            }
            
            /* Activity items */
            .vespa-activity-item {
                margin-bottom: 15px;
                padding: 15px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                border-left: 4px solid #ddd;
                transition: all 0.3s ease;
                animation: slideIn 0.5s ease forwards;
                opacity: 0;
            }
            
            .vespa-activity-item:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
            }
            
            /* Category colors */
            .vespa-category-vision { border-left-color: ${VESPA_COLORS.vision} !important; }
            .vespa-category-effort { border-left-color: ${VESPA_COLORS.effort} !important; }
            .vespa-category-systems { border-left-color: ${VESPA_COLORS.systems} !important; }
            .vespa-category-practice { border-left-color: ${VESPA_COLORS.practice} !important; }
            .vespa-category-attitude { border-left-color: ${VESPA_COLORS.attitude} !important; }
            
            /* Progress bars */
            .vespa-progress-enhanced {
                height: 20px;
                border-radius: 10px;
                overflow: hidden;
                background: #f0f0f0;
            }
            
            /* Mobile enhancements */
            .vespa-mobile .vespa-activity-item {
                font-size: 16px;
                line-height: 1.5;
            }
            
            .vespa-mobile button,
            .vespa-mobile .kn-button {
                min-height: 44px;
                font-size: 16px;
            }
            
            /* Animations */
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateX(-20px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            /* Improve readability */
            #view_2959 {
                font-size: 14px;
                line-height: 1.6;
            }
            
            #view_2959 h1, #view_2959 h2, #view_2959 h3 {
                color: #2a3c7a;
                margin-bottom: 15px;
            }
            
            /* Better spacing */
            #view_2959 > * {
                margin-bottom: 20px;
            }
            
            /* Responsive */
            @media (max-width: 768px) {
                .vespa-activity-item {
                    margin-bottom: 10px;
                    padding: 12px;
                }
                
                #view_2959 {
                    padding: 10px;
                }
            }
        `;
        
        const styleEl = document.createElement('style');
        styleEl.id = 'vespa-activities-enhancement-styles';
        styleEl.textContent = styles;
        document.head.appendChild(styleEl);
    }
    
    // Initialize when DOM is ready
    function init() {
        log('Initializing VESPA Activities Enhancement...');
        
        // Check if we're on the activities page
        if (window.location.href.includes('scene_437') || document.querySelector('#view_2959')) {
            // Wait a bit for external code to run first
            setTimeout(() => {
                waitForActivities();
            }, 1000);
        }
        
        // Also listen for Knack view render events
        if (window.$ && window.$(document)) {
            $(document).on('knack-view-render.view_2959', function() {
                log('View 2959 rendered, waiting for content...');
                setTimeout(() => {
                    waitForActivities();
                }, 500);
            });
        }
    }
    
    // Start when document is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
})();

