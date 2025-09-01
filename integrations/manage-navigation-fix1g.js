/**
 * Manage Page Navigation Fix
 * Prevents redirect issues when navigating to the upload manager (scene_1212)
 */

(function() {
    'use strict';
    
    const log = (msg, data) => {
        if (console && console.log) {
            console.log(`[ManageNavFix] ${msg}`, data || '');
        }
    };
    
    log('Initializing Manage Navigation Fix');
    
    // Track if we're navigating to the manage page
    let navigatingToManage = false;
    
    // Function to prepare for manage scene
    function prepareManageScene() {
        log('Preparing manage scene');
        
        // Store existing VESPA_UPLOAD_CONFIG if it exists
        // Don't delete it as the script declares it as const
        if (window.VESPA_UPLOAD_CONFIG && !window._uploadConfigBackup) {
            window._uploadConfigBackup = window.VESPA_UPLOAD_CONFIG;
            log('Backed up existing VESPA_UPLOAD_CONFIG');
        }
        
        // Set flag to prevent script reload
        window._uploadSystemLoaded = true;
        
        // Clear any loading states for uploadSystem
        if (window._loading_uploadSystem) {
            window._loading_uploadSystem = false;
            log('Cleared uploadSystem loading flag');
        }
        
        // Set flags to prevent unwanted redirects
        window._bypassUniversalRedirect = true;
        window._navigationInProgress = true;
        window._manageNavigationActive = true;
        
        // Store in sessionStorage to persist across potential reloads
        sessionStorage.setItem('navigatingToManage', 'true');
        sessionStorage.setItem('targetScene', 'scene_1212');
        
        log('Manage scene preparation complete');
    }
    
    // Enhanced navigation function for manage page
    window.navigateToManageScene = function(href, source = 'unknown') {
        log(`Navigation to manage scene from ${source}`, { href });
        
        // Set navigation flag
        navigatingToManage = true;
        
        // Show loading screen if available
        if (window.VespaLoadingScreen) {
            window.VespaLoadingScreen.showForNavigation('scene_1212', 'manage');
            window._loadingScreenActive = true;
        }
        
        // Prepare the scene
        prepareManageScene();
        
        // Hide homepage containers immediately
        const homepageContainers = document.querySelectorAll('#staff-homepage-container, .staff-dashboard-container, #view_3024');
        homepageContainers.forEach(container => {
            if (container) {
                container.style.display = 'none';
            }
        });
        
        // Clear any existing scene/app states
        if (window.cleanupAppsForScene && typeof window.cleanupAppsForScene === 'function') {
            window.cleanupAppsForScene('scene_1212');
        }
        
        // Set force stay flag
        window._forceStayOnManage = true;
        
        // Navigate with a small delay to ensure cleanup
        setTimeout(() => {
            window.location.hash = href;
            
            // Monitor for successful navigation
            setTimeout(() => {
                const currentScene = (typeof Knack !== 'undefined' && Knack.scene) ? Knack.scene.key : null;
                if (currentScene !== 'scene_1212') {
                    log('Scene navigation may have failed, forcing reload');
                    window.location.href = window.location.origin + window.location.pathname + '#upload-manager';
                } else {
                    log('Successfully navigated to manage scene');
                    // Keep flags active to prevent redirects
                    window._bypassUniversalRedirect = true;
                    window._universalRedirectCompleted = true;
                }
            }, 1000);
        }, 100);
    };
    
    // Patch header navigation buttons for manage page
    function patchHeaderNavigation() {
        // Find manage buttons in the header
        const manageButtons = document.querySelectorAll('a[href="#upload-manager"], a[href*="scene_1212"]');
        
        if (manageButtons.length > 0) {
            manageButtons.forEach(button => {
                // Skip if already patched
                if (button.dataset.managePatched === 'true') return;
                
                // Remove any existing click handlers
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
                
                // Add enhanced click handler
                newButton.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const href = this.getAttribute('href');
                    window.navigateToManageScene(href, 'header');
                });
                
                // Mark as patched
                newButton.dataset.managePatched = 'true';
            });
            
            log(`Header navigation patched - ${manageButtons.length} button(s)`);
        }
    }
    
    // Patch homepage navigation buttons for manage page
    function patchHomepageNavigation() {
        // Look for manage button in staff homepage
        const homepageButtons = document.querySelectorAll('.app-card[onclick*="upload-manager"], .app-button[onclick*="upload-manager"], a[onclick*="navigateToScene"][onclick*="scene_1212"]');
        
        homepageButtons.forEach(button => {
            if (button.dataset.managePatched === 'true') return;
            
            // Remove inline onclick
            button.removeAttribute('onclick');
            
            // Add proper event listener
            button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Hide the dashboard first if it exists
                const dashboard = document.getElementById('staff-homepage-container');
                if (dashboard) {
                    dashboard.style.display = 'none';
                }
                
                window.navigateToManageScene('#upload-manager', 'homepage');
            });
            
            button.dataset.managePatched = 'true';
        });
        
        if (homepageButtons.length > 0) {
            log(`Homepage navigation patched - ${homepageButtons.length} button(s)`);
        }
    }
    
    // Prevent unwanted redirects when on manage page
    function preventManageRedirects() {
        // Check if we're supposed to be on the manage page
        const shouldBeOnManage = sessionStorage.getItem('navigatingToManage') === 'true' || 
                                window.location.hash === '#upload-manager' ||
                                window._manageNavigationActive;
        
        const currentScene = (typeof Knack !== 'undefined' && Knack.scene) ? Knack.scene.key : null;
        
        // If we're on scene_1212, prevent ANY redirects
        if (currentScene === 'scene_1212') {
            window._bypassUniversalRedirect = true;
            window._universalRedirectCompleted = true;
            window._navigationInProgress = false;
            
            // Force stay on manage page
            if (window.location.hash !== '#upload-manager') {
                log('Forcing hash back to upload-manager');
                window.location.hash = '#upload-manager';
            }
            
            // Clear navigation flags after successful load
            if (shouldBeOnManage) {
                sessionStorage.removeItem('navigatingToManage');
                window._manageNavigationActive = false;
                navigatingToManage = false;
            }
            
            // Hide loading screen if it's still showing
            if (window.VespaLoadingScreen && window.VespaLoadingScreen.isActive()) {
                setTimeout(() => {
                    window.VespaLoadingScreen.hide();
                    window._loadingScreenActive = false;
                }, 500);
            }
            
            return true; // Indicate we're preventing redirects
        }
        
        return false;
    }
    
    // Monitor for hash changes that might redirect away from manage
    let lastHash = window.location.hash;
    function monitorHashChanges() {
        const currentHash = window.location.hash;
        
        if (lastHash !== currentHash) {
            // If we were on upload-manager and hash changed unexpectedly
            if (lastHash === '#upload-manager' && navigatingToManage) {
                log('Unexpected hash change from upload-manager, preventing redirect');
                // Restore the hash
                window.location.hash = '#upload-manager';
            }
            lastHash = currentHash;
        }
    }
    
    // Listen for scene renders to patch navigation
    $(document).on('knack-scene-render.any', function(event, scene) {
        if (scene && scene.key) {
            // Always try to patch navigation buttons
            setTimeout(() => {
                patchHeaderNavigation();
                patchHomepageNavigation();
            }, 100);
            
            // Special handling for scene_1212
            if (scene.key === 'scene_1212') {
                log('Scene 1212 rendered, ensuring stable state');
                
                // Ensure flags are set correctly to prevent ANY redirects
                window._bypassUniversalRedirect = true;
                window._universalRedirectCompleted = true;
                window._navigationInProgress = false;
                window._forceStayOnManage = true;
                
                // Clear duplicate config if it exists
                if (window.VESPA_UPLOAD_CONFIG && window._uploadConfigBackup) {
                    log('Restoring VESPA_UPLOAD_CONFIG from backup');
                    window.VESPA_UPLOAD_CONFIG = window._uploadConfigBackup;
                    delete window._uploadConfigBackup;
                }
                
                // Hide any homepage containers that might be showing
                const homepageContainers = document.querySelectorAll('#staff-homepage-container, .staff-dashboard-container, #view_3024');
                homepageContainers.forEach(container => {
                    if (container) {
                        container.style.display = 'none';
                    }
                });
                
                // Ensure upload container is visible
                const uploadContainer = document.querySelector('#view_3020');
                if (uploadContainer) {
                    uploadContainer.style.display = 'block';
                }
            }
            // Block navigation away from scene_1212 if we're supposed to stay
            else if (window._forceStayOnManage && scene.key !== 'scene_1212') {
                log(`Blocking navigation from manage page to ${scene.key}`);
                event.preventDefault();
                event.stopImmediatePropagation();
                
                // Force back to manage page
                setTimeout(() => {
                    window.location.hash = '#upload-manager';
                }, 0);
                return false;
            }
            
            // If we're leaving scene_1212 intentionally, clean up
            if (scene.key !== 'scene_1212' && !navigatingToManage && !window._forceStayOnManage) {
                window._manageNavigationActive = false;
                window._forceStayOnManage = false;
                sessionStorage.removeItem('navigatingToManage');
            }
            
            // Always prevent redirects if we're on the manage page
            preventManageRedirects();
        }
    });
    
    // Listen for view renders to catch late-loading buttons
    $(document).on('knack-view-render.any', function(event, view) {
        if (view && view.key) {
            setTimeout(() => {
                patchHeaderNavigation();
                patchHomepageNavigation();
            }, 100);
        }
    });
    
    // Monitor hash changes
    setInterval(monitorHashChanges, 500);
    
    // Initial patch attempt
    $(document).ready(function() {
        setTimeout(() => {
            patchHeaderNavigation();
            patchHomepageNavigation();
            preventManageRedirects();
        }, 500);
    });
    
    // Check on page load if we should be on the manage page
    if (window.location.hash === '#upload-manager') {
        prepareManageScene();
    }
    
    // Clear force stay flag when user clicks any non-manage navigation
    $(document).on('click', 'a[href]:not([href*="upload-manager"]):not([href*="scene_1212"])', function() {
        if (window._forceStayOnManage) {
            log('User navigating away from manage page, clearing force stay flag');
            window._forceStayOnManage = false;
            window._manageNavigationActive = false;
            sessionStorage.removeItem('navigatingToManage');
        }
    });
    
    // Also intercept Knack router navigation
    if (typeof Knack !== 'undefined' && Knack.router) {
        const originalNavigate = Knack.router.navigate;
        Knack.router.navigate = function(fragment, options) {
            // Check if we're navigating away from manage page
            if (window._forceStayOnManage && !fragment.includes('upload-manager') && !fragment.includes('scene_1212')) {
                // Check if this is an intentional navigation (user clicked something)
                if (options && options.trigger) {
                    log('Allowing intentional navigation away from manage page');
                    window._forceStayOnManage = false;
                    window._manageNavigationActive = false;
                } else {
                    // This is an automatic redirect, block it
                    log('Blocking automatic redirect from manage page');
                    return false;
                }
            }
            return originalNavigate.call(this, fragment, options);
        };
    }
    
    log('Initialization complete');
    
})();
