// Profile Visibility Fix - Ensures academic profile shows on admin student reports
// This fixes the CSS conflict affecting ONLY the admin view (scene_1014/view_3204)
// Note: Tutor view (scene_1095/view_3015) works correctly without this fix

(function() {
    'use strict';
    
    const DEBUG = true;
    const log = (msg, data) => {
        if (DEBUG) console.log(`[ProfileVisibilityFix] ${msg}`, data || '');
    };
    
    // Configuration - ONLY fixing admin scene as tutor works correctly
    const PROFILE_CONFIGS = {
        'scene_1014': '#view_3204'  // Admin coaching scene - THIS IS THE PROBLEM VIEW
        // 'scene_1095': '#view_3015' // Tutor scene works fine - no fix needed
    };
    
    // Function to ensure profile view is visible
    function ensureProfileVisibility() {
        const currentScene = window.Knack?.scene?.key;
        const profileViewSelector = PROFILE_CONFIGS[currentScene];
        
        if (!profileViewSelector) return;
        
        const profileView = document.querySelector(profileViewSelector);
        if (!profileView) return;
        
        // Check if we're viewing an individual student report
        const reportContainer = document.querySelector('#report-container');
        const hasStudentReport = reportContainer && reportContainer.innerHTML.trim().length > 0;
        
        if (hasStudentReport) {
            // Force the profile view to be visible
            profileView.style.setProperty('display', 'block', 'important');
            profileView.style.setProperty('visibility', 'visible', 'important');
            profileView.style.setProperty('opacity', '1', 'important');
            
            // Also ensure it's not considered empty even if it is
            if (profileView.innerHTML.trim() === '') {
                // Add a placeholder to prevent :empty selector from matching
                const placeholder = document.createElement('div');
                placeholder.className = 'profile-placeholder';
                placeholder.style.display = 'none';
                profileView.appendChild(placeholder);
            }
            
            log('Profile view visibility ensured for', profileViewSelector);
        }
    }
    
    // Function to inject CSS override
    function injectVisibilityOverride() {
        const styleId = 'profile-visibility-override';
        
        // Remove existing style if present
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) {
            existingStyle.remove();
        }
        
        // Create new style element
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* Fix ONLY for admin view - tutor view works correctly */
            /* Override vue-table-enhancer's hiding of admin profile view */
            body.knack-scene.scene-1014 #view_3204:not(.force-hide) {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
                min-height: 10px; /* Prevent collapse */
            }
            
            /* Only hide admin view when explicitly in group view (no report) */
            body.knack-scene.scene-1014:not(.viewing-report) #view_3204:empty {
                display: none !important;
            }
            
            /* Ensure admin profile container is visible when report is active */
            body.knack-scene.scene-1014 #report-container:not(:empty) ~ #view_3204,
            body.knack-scene.scene-1014 .report-active #view_3204,
            body.knack-scene.scene-1014.viewing-report #view_3204 {
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
            }
            
            /* Additional specificity for admin view when student report is shown */
            body.knack-scene.scene-1014 #view_2772:has(#report-container:not(:empty)) ~ #view_3204 {
                display: block !important;
                visibility: visible !important;
            }
        `;
        
        document.head.appendChild(style);
        log('CSS override injected');
    }
    
    // Function to detect report view changes
    function watchForReportChanges() {
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                // Check if report container has changed
                if (mutation.target.id === 'report-container' || 
                    mutation.target.closest('#report-container')) {
                    
                    // Add/remove class based on report presence
                    const reportContainer = document.querySelector('#report-container');
                    const hasReport = reportContainer && reportContainer.innerHTML.trim().length > 0;
                    
                    if (hasReport) {
                        document.body.classList.add('viewing-report');
                        ensureProfileVisibility();
                    } else {
                        document.body.classList.remove('viewing-report');
                    }
                }
            }
        });
        
        // Observe the main content area for changes
        const contentArea = document.querySelector('#knack-body');
        if (contentArea) {
            observer.observe(contentArea, {
                childList: true,
                subtree: true,
                attributes: false
            });
            log('Report change observer attached');
        }
    }
    
    // Initialize
    function initialize() {
        log('Initializing Profile Visibility Fix for Admin View');
        
        // Only proceed if we're on the admin scene
        const currentScene = window.Knack?.scene?.key;
        if (currentScene !== 'scene_1014') {
            log('Not on admin scene, fix not needed');
            return;
        }
        
        // Inject CSS overrides
        injectVisibilityOverride();
        
        // Set up report watching
        watchForReportChanges();
        
        // Initial check
        ensureProfileVisibility();
        
        // Re-check when scenes change
        if (window.$ && window.Knack) {
            $(document).on('knack-scene-render.any', function(event, scene) {
                const sceneKey = scene?.key;
                if (sceneKey === 'scene_1014') {
                    log('Admin coaching scene rendered');
                    setTimeout(() => {
                        injectVisibilityOverride();
                        ensureProfileVisibility();
                        watchForReportChanges();
                    }, 500);
                }
            });
            
            // Also listen for view renders
            $(document).on('knack-view-render.any', function(event, view) {
                const currentScene = window.Knack?.scene?.key;
                const profileViewId = PROFILE_CONFIGS[currentScene]?.replace('#', '');
                
                if (view?.key === profileViewId) {
                    log('Profile view rendered:', view.key);
                    setTimeout(ensureProfileVisibility, 100);
                }
            });
        }
        
        log('Initialization complete');
    }
    
    // Start when ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        setTimeout(initialize, 100);
    }
    
})();
