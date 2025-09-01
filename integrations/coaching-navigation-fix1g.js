// Coaching Navigation Fix - Ensures proper loading of coaching pages
// This module handles navigation to/from coaching scenes (1014 & 1095)
// Version: 1.0

(function() {
    'use strict';
    
    const DEBUG = true;
    const log = (msg, data) => {
        if (DEBUG) console.log(`[CoachingNavFix] ${msg}`, data || '');
    };
    
    // Configuration
    const COACHING_SCENES = ['scene_1014', 'scene_1095'];
    const COACHING_URLS = ['#admin-coaching', '#mygroup-vespa-results2'];
    
    // Track current state
    let currentScene = null;
    let isCoachingScene = false;
    let cleanupFunctions = [];
    let lastPatchTime = 0;
    const PATCH_DEBOUNCE_MS = 1000; // Prevent rapid re-patching
    
    // Detect if we're on a coaching scene
    function detectCoachingScene() {
        const scene = window.Knack?.scene?.key;
        if (!scene) return false;
        return COACHING_SCENES.includes(scene);
    }
    
    // Detect if URL is coaching related
    function isCoachingUrl(url) {
        if (!url) return false;
        return COACHING_URLS.some(coachingUrl => url.includes(coachingUrl));
    }
    
    // Clean up when leaving coaching scene
    function cleanupCoachingScene() {
        log('Cleaning up coaching scene');
        
        // Stop all intervals and timeouts
        if (window.enhancementCheckInterval) {
            clearInterval(window.enhancementCheckInterval);
            window.enhancementCheckInterval = null;
        }
        
        if (window.tableUpdateTimeout) {
            clearTimeout(window.tableUpdateTimeout);
            window.tableUpdateTimeout = null;
        }
        
        // Remove any mutation observers
        if (window.coachingTableObserver) {
            window.coachingTableObserver.disconnect();
            window.coachingTableObserver = null;
        }
        
        // Clear any cached states
        if (window._forceAppReload) {
            delete window._forceAppReload;
        }
        
        // Reset DOM modifications
        const modalElement = document.getElementById('vue-table-modal');
        if (modalElement) {
            modalElement.remove();
        }
        
        // Clear background styles that might persist
        document.body.style.backgroundColor = '';
        document.body.style.background = '';
        document.body.style.backgroundImage = '';
        
        // Run any registered cleanup functions
        cleanupFunctions.forEach(fn => {
            try {
                fn();
            } catch (e) {
                console.error('[CoachingNavFix] Cleanup function error:', e);
            }
        });
        cleanupFunctions = [];
        
        log('Cleanup complete');
    }
    
    // Prepare for coaching scene load
    function prepareCoachingScene(sceneKey) {
        log('Preparing coaching scene:', sceneKey);
        
        // Set flags for loader
        window._forceAppReload = sceneKey;
        window._coachingSceneLoading = true;
        
        // Clear any existing app states for this scene
        if (window.cleanupAppsForScene && typeof window.cleanupAppsForScene === 'function') {
            window.cleanupAppsForScene(sceneKey);
        }
        
        // Signal to table enhancer to reinitialize
        window._tableEnhancerReset = true;
        
        // Clear any cached Vue table states
        if (window.vueTableCache) {
            delete window.vueTableCache;
        }
        
        log('Preparation complete');
    }
    
    // Function to show loading screen using universal system
    function showLoadingScreen(scene) {
        // Set flag to indicate loading screen is active
        window._loadingScreenActive = true;
        log('Setting _loadingScreenActive flag to true');
        
        // Use universal loading screen if available
        if (window.VespaLoadingScreen) {
            window.VespaLoadingScreen.showForNavigation(scene, 'coaching');
        } else {
            // Fallback: create simple loading indicator if universal screen not available
            log('Universal loading screen not available, using fallback');
            const fallbackHTML = `
                <div id="vespa-loading-overlay" style="
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: linear-gradient(135deg, #2a3c7a 0%, #079baa 100%);
                    z-index: 99999; display: flex; align-items: center; justify-content: center;">
                    <div style="color: white; text-align: center;">
                        <div style="font-size: 18px;">Loading...</div>
                    </div>
                </div>`;
            document.body.insertAdjacentHTML('beforeend', fallbackHTML);
            document.body.style.overflow = 'hidden';
        }
    }

    // Enhanced navigation function for both header and homepage
    window.navigateToCoachingScene = function(scene, url, source = 'unknown') {
        log(`Navigation to coaching scene from ${source}`, { scene, url });
        
        // Show loading screen IMMEDIATELY
        showLoadingScreen(scene);
        
        // If we're currently on a coaching scene, clean it up first
        if (isCoachingScene) {
            cleanupCoachingScene();
        }
        
        // Prepare for new coaching scene
        if (COACHING_SCENES.includes(scene)) {
            prepareCoachingScene(scene);
        }
        
        // Set navigation flags
        window._universalRedirectCompleted = true;
        window._bypassUniversalRedirect = true;
        window._navigationInProgress = true;
        window._loadingScreenActive = true; // Flag to prevent duplicate loading screens
        sessionStorage.setItem('universalRedirectCompleted', 'true');
        sessionStorage.setItem('navigationTarget', scene);
        
        // Perform navigation with delay for cleanup
        setTimeout(() => {
            window.location.hash = url.startsWith('#') ? url : '#' + url;
            
            // Verify navigation and clear flags
            setTimeout(() => {
                const currentScene = window.Knack?.scene?.key;
                if (currentScene === scene) {
                    log('Navigation successful');
                    window._coachingSceneLoading = false;
                    // Don't remove loading screen here - let knackAppLoader handle it
                } else {
                    log('Navigation may have failed, attempting reload');
                    window.location.reload();
                }
                window._navigationInProgress = false;
            }, 1000);
        }, 100);
    };
    
    // Register cleanup function (for external scripts to use)
    window.registerCoachingCleanup = function(fn) {
        if (typeof fn === 'function') {
            cleanupFunctions.push(fn);
        }
    };
    
    // Monitor scene changes
    function monitorSceneChanges() {
        const checkScene = () => {
            const newScene = window.Knack?.scene?.key;
            
            if (newScene !== currentScene) {
                log(`Scene changed: ${currentScene} → ${newScene}`);
                
                // If leaving a coaching scene
                if (currentScene && COACHING_SCENES.includes(currentScene) && 
                    !COACHING_SCENES.includes(newScene)) {
                    cleanupCoachingScene();
                    isCoachingScene = false;
                }
                
                // If entering a coaching scene
                if (newScene && COACHING_SCENES.includes(newScene)) {
                    isCoachingScene = true;
                    // Give time for table to load
                    setTimeout(() => {
                        window._tableEnhancerReset = false;
                    }, 2000);
                }
                
                currentScene = newScene;
            }
        };
        
        // Check periodically
        setInterval(checkScene, 500);
        
        // Also listen to Knack events
        if (window.$ && window.Knack) {
            $(document).on('knack-scene-render.any', function(event, scene) {
                setTimeout(checkScene, 100);
            });
        }
    }
    
    // Override the original navigateToScene function if it exists
    const originalNavigateToScene = window.navigateToScene;
    window.navigateToScene = function(scene, url, featureName) {
        // Check if this is a coaching scene
        if (COACHING_SCENES.includes(scene) || isCoachingUrl(url)) {
            log('Intercepting coaching navigation from homepage');
            return window.navigateToCoachingScene(scene, url, 'homepage');
        }
        
        // Otherwise use original function if it exists
        if (originalNavigateToScene) {
            return originalNavigateToScene.call(this, scene, url, featureName);
        } else {
            // Fallback to simple navigation
            window.location.hash = url.startsWith('#') ? url : '#' + url;
        }
    };
    
    // Patch GeneralHeader navigation
    function patchHeaderNavigation() {
        // Debounce rapid calls
        const now = Date.now();
        if (now - lastPatchTime < PATCH_DEBOUNCE_MS) {
            log('Skipping header patch - too soon after last patch');
            return;
        }
        lastPatchTime = now;
        
        log('Patching header navigation for coaching scenes');
        
        // Wait for header to be ready
        const waitForHeader = setInterval(() => {
            const navButtons = document.querySelectorAll('.header-nav-button');
            
            if (navButtons.length > 0) {
                clearInterval(waitForHeader);
                
                let patchedCount = 0;
                navButtons.forEach(button => {
                    const originalClick = button.onclick;
                    const targetScene = button.dataset.scene;
                    const targetHref = button.getAttribute('href');
                    
                    // Skip if already patched
                    if (button.dataset.coachingPatched === 'true') {
                        return;
                    }
                    
                    // If this button navigates to a coaching scene
                    if (COACHING_SCENES.includes(targetScene) || isCoachingUrl(targetHref)) {
                        patchedCount++;
                        
                        // Mark as patched
                        button.dataset.coachingPatched = 'true';
                        
                        // Remove existing listeners
                        button.onclick = null;
                        const newButton = button.cloneNode(true);
                        newButton.dataset.coachingPatched = 'true';
                        button.parentNode.replaceChild(newButton, button);
                        
                        // Add enhanced listener
                        newButton.addEventListener('click', function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            log('Header coaching navigation clicked');
                            window.navigateToCoachingScene(targetScene, targetHref, 'header');
                        });
                    }
                });
                
                if (patchedCount > 0) {
                    log(`Header navigation patched - ${patchedCount} button(s)`);
                } else {
                    log('Header navigation already patched - no changes needed');
                }
            }
        }, 500);
        
        // Stop checking after 10 seconds
        setTimeout(() => clearInterval(waitForHeader), 10000);
    }
    
    // Patch homepage navigation buttons
    function patchHomepageNavigation() {
        log('Patching homepage navigation for coaching scenes');
        
        // Wait for homepage buttons to be ready
        const waitForHomepage = setInterval(() => {
            // Look for app cards with coaching scenes
            const coachingButtons = document.querySelectorAll('.app-card[data-scene="scene_1095"], .app-card[data-scene="scene_1014"]');
            
            if (coachingButtons.length > 0) {
                clearInterval(waitForHomepage);
                
                let patchedCount = 0;
                coachingButtons.forEach(button => {
                    // Skip if already patched
                    if (button.dataset.coachingPatched === 'true') {
                        return;
                    }
                    
                    const targetScene = button.dataset.scene;
                    const targetHref = button.getAttribute('href');
                    
                    patchedCount++;
                    
                    // Mark as patched
                    button.dataset.coachingPatched = 'true';
                    
                    // Remove the inline onclick handler
                    button.onclick = null;
                    button.removeAttribute('onclick');
                    
                    // Add enhanced click handler
                    button.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        log('Homepage coaching navigation clicked');
                        
                        // Track feature usage if needed
                        const appName = this.querySelector('.app-name')?.textContent;
                        if (appName && window.trackFeatureUse) {
                            window.trackFeatureUse(appName);
                        }
                        
                        // Use enhanced navigation
                        window.navigateToCoachingScene(targetScene, targetHref, 'homepage');
                    });
                });
                
                if (patchedCount > 0) {
                    log(`Homepage navigation patched - ${patchedCount} button(s)`);
                } else {
                    log('Homepage navigation already patched - no changes needed');
                }
            }
        }, 500);
        
        // Stop checking after 10 seconds
        setTimeout(() => clearInterval(waitForHomepage), 10000);
    }
    
    // Initialize
    function initialize() {
        log('Initializing Coaching Navigation Fix');
        
        // Detect initial state
        currentScene = window.Knack?.scene?.key;
        isCoachingScene = detectCoachingScene();
        
        // Start monitoring
        monitorSceneChanges();
        
        // Patch header navigation
        setTimeout(patchHeaderNavigation, 1000);
        
        // Patch homepage navigation
        setTimeout(patchHomepageNavigation, 1000);
        
        // Re-patch if scene gets re-rendered
        if (window.$ && window.Knack) {
            let sceneRenderCount = 0;
            $(document).on('knack-scene-render.any', function(event, scene) {
                sceneRenderCount++;
                
                // Only re-patch on significant scene changes, not every render
                if (sceneRenderCount > 1 && scene && scene.key !== currentScene) {
                    currentScene = scene.key;
                    
                    // Re-patch header only if we've changed scenes
                    setTimeout(patchHeaderNavigation, 500);
                    
                    // Re-patch homepage if we're on the homepage scene
                    if (scene.key === 'scene_1215') {
                        setTimeout(patchHomepageNavigation, 500);
                    }
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

