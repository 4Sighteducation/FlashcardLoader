/**
 * Resources Page Navigation Fix
 * Handles navigation to/from Resources pages (scenes 481, 1169, 1234, 1214, 1266)
 * Prevents page loading underneath homepage
 */

(function() {
    'use strict';
    
    const DEBUG = true;
    const log = (msg, data) => {
        if (DEBUG) console.log(`[Resources Navigation Fix] ${msg}`, data || '');
    };
    
    // Resource-related scenes
    const RESOURCE_SCENES = [
        'scene_481',  // Resources
        'scene_1169', // Worksheets
        'scene_1234', // Curriculum
        'scene_1294', // Activities Hub (new combined page)
        'scene_1214', // Newsletter
        'scene_1266'  // Videos
    ];
    
    // Track navigation state
    let isNavigatingToResources = false;
    
    // Function to clean up before navigation
    function cleanupBeforeNavigation() {
        log('Cleaning up before resources navigation');
        
        // Hide any existing homepage content
        const homepageContainers = document.querySelectorAll(
            '.staff-homepage-container, .student-homepage-container, .resource-dashboard-container, [id^="scene-level-container"]'
        );
        
        homepageContainers.forEach(container => {
            container.style.display = 'none';
            log('Hid container:', container.className || container.id);
        });
        
        // Clear any scene-level rendering flags
        if (window._sceneRenderingInProgress) {
            window._sceneRenderingInProgress = false;
        }
        
        // Clear homepage loaded flags
        if (window._staffHomepageLoaded) {
            window._staffHomepageLoaded = false;
        }
    }
    
    // Intercept navigation to resource pages
    $(document).on('click', 'a[href*="#tutor-activities"], a[href*="#worksheets"], a[href*="#suggested-curriculum"], a[href*="#vespa-newsletter"], a[href*="#vespa-videos"], a[href*="#curriculum-builder"]', function(e) {
        const href = $(this).attr('href');
        log('Resource navigation link clicked:', href);
        
        // Set flag
        isNavigatingToResources = true;
        sessionStorage.setItem('navigatingToResources', 'true');
        
        // Clean up immediately
        cleanupBeforeNavigation();
        
        // Allow normal navigation to proceed
    });
    
    // Handle scene render for resource pages
    $(document).on('knack-scene-render.any', function(event, scene) {
        if (RESOURCE_SCENES.includes(scene.key)) {
            log('Resource scene rendering:', scene.key);
            
            // Clean up any lingering homepage content
            cleanupBeforeNavigation();
            
            // Ensure proper body padding for header
            const header = document.getElementById('vespaGeneralHeader');
            if (header) {
                const hasSecondaryRow = header.querySelector('.header-secondary-row');
                const padding = hasSecondaryRow ? '110px' : '70px';
                document.body.style.paddingTop = padding;
                log('Adjusted body padding for resources page:', padding);
            }
            
            // Clear navigation flag
            isNavigatingToResources = false;
            sessionStorage.removeItem('navigatingToResources');
        }
    });
    
    // Prevent homepage from loading over resource pages
    $(document).on('knack-view-render.any', function(event, view) {
        // If we're on a resource page, prevent homepage views from rendering
        const currentScene = Knack.scene ? Knack.scene.key : null;
        if (RESOURCE_SCENES.includes(currentScene)) {
            if (view.key === 'view_3024' || view.key === 'view_3023' || view.key === 'view_3418') {
                log('Preventing homepage view from rendering on resource page');
                
                // Hide the view immediately
                const viewElement = document.getElementById(view.key);
                if (viewElement) {
                    viewElement.style.display = 'none';
                }
                
                return false; // Try to prevent further processing
            }
        }
    });
    
    // Handle browser back/forward buttons
    window.addEventListener('popstate', function() {
        const hash = window.location.hash;
        if (hash.includes('tutor-activities') || hash.includes('worksheets') || 
            hash.includes('suggested-curriculum') || hash.includes('vespa-newsletter') || 
            hash.includes('vespa-videos') || hash.includes('curriculum-builder')) {
            log('Browser navigation to resource page detected');
            cleanupBeforeNavigation();
        }
    });
    
    log('Resources navigation fix initialized');
})();
