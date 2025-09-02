/**
 * Results Page Navigation Fix
 * Prevents blank screen issues when navigating to the VESPA Results page (scene_1270)
 * Ensures the Results page loads and stays visible without interference
 */

(function() {
    'use strict';
    
    const log = (msg, data) => {
        if (console && console.log) {
            console.log(`[ResultsNavFix] ${msg}`, data || '');
        }
    };
    
    log('Initializing Results Navigation Fix');
    
    // Track if we're navigating to or on the results page
    let navigatingToResults = false;
    let onResultsPage = false;
    
    // Function to prepare for results scene
    function prepareResultsScene() {
        log('Preparing results scene');
        
        // Set flags to prevent unwanted redirects and homepage loading
        window._bypassUniversalRedirect = true;
        window._navigationInProgress = true;
        window._resultsNavigationActive = true;
        window._blockHomepageLoad = true;
        window._skipHomepageRender = true;
        
        // Store in sessionStorage to persist across potential reloads
        sessionStorage.setItem('navigatingToResults', 'true');
        sessionStorage.setItem('targetScene', 'scene_1270');
        sessionStorage.setItem('blockHomepageLoad', 'true');
        sessionStorage.setItem('skipHomepageRender', 'true');
        
        // Clear any homepage timers
        if (window._homepageLoadTimer) {
            clearTimeout(window._homepageLoadTimer);
            window._homepageLoadTimer = null;
            log('Cleared homepage load timer');
        }
        
        // Remove any existing homepage containers that might interfere
        const containers = document.querySelectorAll('[id*="homepage"], [id*="staff-homepage"], [id*="resource-dashboard"], [id*="scene-level-container"]');
        containers.forEach(container => {
            log('Removing interfering container:', container.id);
            container.remove();
        });
        
        log('Results scene preparation complete');
    }
    
    // Function to protect results content from being cleared
    function protectResultsContent() {
        log('Setting up results content protection');
        
        // Create a MutationObserver to detect if content is being removed
        const targetNode = document.querySelector('#kn-scene_1270') || document.querySelector('.kn-scene');
        
        if (targetNode) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
                        // Check if significant content was removed
                        const significantRemoval = Array.from(mutation.removedNodes).some(node => {
                            return node.nodeType === 1 && (
                                node.classList?.contains('kn-view') ||
                                node.classList?.contains('kn-table') ||
                                node.id?.includes('view_')
                            );
                        });
                        
                        if (significantRemoval && onResultsPage) {
                            log('WARNING: Results content was removed, preventing blank screen');
                            // Set flag to trigger re-render
                            window._resultsNeedsRerender = true;
                        }
                    }
                });
            });
            
            observer.observe(targetNode, {
                childList: true,
                subtree: true
            });
            
            // Store observer for cleanup
            window._resultsContentObserver = observer;
        }
    }
    
    // Function to ensure results page stays visible
    function ensureResultsVisible() {
        log('Ensuring results page visibility');
        
        // Make sure the scene container is visible
        const sceneContainer = document.querySelector('#kn-scene_1270');
        if (sceneContainer) {
            sceneContainer.style.display = 'block';
            sceneContainer.style.visibility = 'visible';
            sceneContainer.style.opacity = '1';
            
            // Also ensure parent containers are visible
            let parent = sceneContainer.parentElement;
            while (parent && parent !== document.body) {
                parent.style.display = '';
                parent.style.visibility = '';
                parent.style.opacity = '';
                parent = parent.parentElement;
            }
        }
        
        // Hide any loading screens that might be stuck
        if (window.hideUniversalLoadingScreen) {
            setTimeout(() => {
                window.hideUniversalLoadingScreen();
            }, 500);
        }
        
        // Remove any overlay elements that might be covering content
        const overlays = document.querySelectorAll('.loading-overlay, .universal-loading-screen, [class*="loading"]');
        overlays.forEach(overlay => {
            if (overlay.style.display !== 'none') {
                log('Hiding potential overlay:', overlay.className);
                overlay.style.display = 'none';
            }
        });
    }
    
    // Function to clean up after leaving results page
    function cleanupResultsPage() {
        log('Cleaning up results page flags');
        
        onResultsPage = false;
        navigatingToResults = false;
        
        // Clear flags
        window._resultsNavigationActive = false;
        window._resultsNeedsRerender = false;
        
        // Clear sessionStorage
        sessionStorage.removeItem('navigatingToResults');
        sessionStorage.removeItem('onResultsPage');
        
        // Disconnect observer if exists
        if (window._resultsContentObserver) {
            window._resultsContentObserver.disconnect();
            window._resultsContentObserver = null;
        }
    }
    
    // Monitor navigation to results page
    $(document).on('click', 'a[href*="#vesparesults"], a[href*="scene_1270"], .header-nav-button[data-scene="scene_1270"]', function(e) {
        log('Results navigation link clicked');
        navigatingToResults = true;
        prepareResultsScene();
    });
    
    // Handle results scene render
    $(document).on('knack-scene-render.scene_1270', function(event, scene) {
        log('Results scene rendering', scene);
        
        onResultsPage = true;
        navigatingToResults = false;
        
        // Store that we're on results page
        sessionStorage.setItem('onResultsPage', 'true');
        sessionStorage.removeItem('navigatingToResults');
        
        // Clear navigation flags after a delay
        setTimeout(() => {
            window._navigationInProgress = false;
            window._resultsNavigationActive = false;
            window._blockHomepageLoad = false;
            window._skipHomepageRender = false;
            
            sessionStorage.removeItem('blockHomepageLoad');
            sessionStorage.removeItem('skipHomepageRender');
            
            log('Navigation flags cleared');
        }, 1000);
        
        // Set up content protection
        setTimeout(() => {
            protectResultsContent();
            ensureResultsVisible();
        }, 500);
        
        // Double-check visibility after a longer delay
        setTimeout(() => {
            ensureResultsVisible();
            
            // If content was removed and needs re-render
            if (window._resultsNeedsRerender) {
                log('Results content needs re-render, triggering refresh');
                window._resultsNeedsRerender = false;
                // Force a re-render by navigating to the same hash
                const currentHash = window.location.hash;
                window.location.hash = '';
                setTimeout(() => {
                    window.location.hash = currentHash;
                }, 50);
            }
        }, 2000);
    });
    
    // Handle results views rendering
    $(document).on('knack-view-render.any', function(event, view, data) {
        if (onResultsPage && view.key && view.key.includes('view_')) {
            log('Results view rendered:', view.key);
            
            // Ensure visibility after each view renders
            setTimeout(() => {
                ensureResultsVisible();
            }, 100);
        }
    });
    
    // Handle navigation away from results
    $(document).on('knack-scene-render.any', function(event, scene) {
        if (scene.key !== 'scene_1270' && onResultsPage) {
            log('Navigating away from results page');
            cleanupResultsPage();
        }
    });
    
    // Check on page load if we're supposed to be on results page
    $(document).ready(function() {
        const hash = window.location.hash;
        const isResultsPage = hash.includes('vesparesults') || hash.includes('scene_1270');
        const wasOnResults = sessionStorage.getItem('onResultsPage') === 'true';
        
        if (isResultsPage || wasOnResults) {
            log('Page loaded on results page or returning to results');
            prepareResultsScene();
            
            // Force navigation if needed
            if (isResultsPage && !document.querySelector('#kn-scene_1270')) {
                setTimeout(() => {
                    log('Results scene not found, forcing navigation');
                    window.location.hash = '#vesparesults';
                }, 500);
            }
        }
    });
    
    // Intercept any cleanup functions that might affect results page
    const originalCleanup = window.cleanupPageContent;
    window.cleanupPageContent = function(newScene) {
        if (onResultsPage && newScene !== 'scene_1270') {
            log('Preventing cleanup while on results page');
            return;
        }
        if (originalCleanup) {
            originalCleanup.apply(this, arguments);
        }
    };
    
    // Global function to check if results page is active
    window.isResultsPageActive = function() {
        return onResultsPage || navigatingToResults || sessionStorage.getItem('onResultsPage') === 'true';
    };
    
    log('Results Navigation Fix initialized');
})();
