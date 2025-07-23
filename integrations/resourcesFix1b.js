/**
 * Scene 481 Resources Page Layout Fix
 * Hides unnecessary elements and improves the display of book images
 * Version 3 - Ultra aggressive hiding with MutationObserver
 */

(function() {
    'use strict';
    
    console.log('[Scene 481 Fix v3] Script loaded');
    
    // Track if we've already applied certain one-time fixes
    let stylesApplied = false;
    let observer = null;
    
    function fixScene481Layout() {
        // Check if we're on scene_481
        const currentScene = window.location.hash;
        if (!currentScene.includes('tutor-activities') && !currentScene.includes('scene_481')) {
            // Disconnect observer if we navigate away
            if (observer) {
                observer.disconnect();
                observer = null;
            }
            return;
        }
        
        console.log('[Scene 481 Fix v3] Applying layout fixes for resources page');
        
        // Apply CSS fixes (only once)
        if (!stylesApplied) {
            const styleId = 'scene-481-fixes-v3';
            if (!document.getElementById(styleId)) {
                const style = document.createElement('style');
                style.id = styleId;
                style.textContent = `
                    /* Ultra-high specificity selectors to override Knack */
                    html body #kn-scene_481 #view_1255,
                    html body #kn-scene_481 .view_1255,
                    html body div#kn-scene_481 div#view_1255 {
                        display: none !important;
                        visibility: hidden !important;
                        opacity: 0 !important;
                        height: 0 !important;
                        max-height: 0 !important;
                        overflow: hidden !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        position: absolute !important;
                        left: -9999px !important;
                        top: -9999px !important;
                    }
                    
                    /* Hide the "Hello World" rich text view */
                    html body #kn-scene_481 #view_3150,
                    html body #kn-scene_481 .view_3150,
                    html body div#kn-scene_481 div#view_3150 {
                        display: none !important;
                        visibility: hidden !important;
                        opacity: 0 !important;
                        height: 0 !important;
                        max-height: 0 !important;
                        overflow: hidden !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        position: absolute !important;
                        left: -9999px !important;
                        top: -9999px !important;
                    }
                    
                    /* Hide the entire first view group if it contains these views */
                    html body #kn-scene_481 .view-group:has(#view_1255),
                    html body #kn-scene_481 .view-group:has(#view_3150),
                    html body #kn-scene_481 .view-group-1 {
                        display: none !important;
                        visibility: hidden !important;
                        height: 0 !important;
                        overflow: hidden !important;
                    }
                    
                    /* Adjust the details view to be more prominent */
                    #kn-scene_481 #view_1277 {
                        margin-top: 0 !important;
                        padding-top: 20px;
                    }
                    
                    /* Make sure the second view group is visible and at the top */
                    #kn-scene_481 .view-group-2 {
                        margin-top: 0 !important;
                        padding-top: 0 !important;
                    }
                    
                    /* Style the book images better */
                    #kn-scene_481 .field_1439 img,
                    #kn-scene_481 .field_2922 img,
                    #kn-scene_481 .field_2924 img {
                        max-width: 300px;
                        height: auto;
                        border-radius: 8px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                        transition: transform 0.3s ease, box-shadow 0.3s ease;
                        cursor: pointer;
                    }
                    
                    #kn-scene_481 .field_1439 img:hover,
                    #kn-scene_481 .field_2922 img:hover,
                    #kn-scene_481 .field_2924 img:hover {
                        transform: translateY(-5px);
                        box-shadow: 0 8px 20px rgba(0,0,0,0.2);
                    }
                    
                    /* Make the book image section more prominent */
                    #kn-scene_481 .kn-details-group {
                        background: #f8f9fa;
                        padding: 20px;
                        border-radius: 12px;
                        margin: 20px 0;
                    }
                    
                    /* Style the labels */
                    #kn-scene_481 .kn-detail-label {
                        font-weight: 600;
                        color: #333;
                        margin-bottom: 10px;
                    }
                    
                    /* Center align the book images */
                    #kn-scene_481 .field_1439 .kn-detail-body,
                    #kn-scene_481 .field_2922 .kn-detail-body,
                    #kn-scene_481 .field_2924 .kn-detail-body {
                        text-align: center;
                        padding: 10px 0;
                    }
                    
                    /* Hide empty or redundant fields */
                    #kn-scene_481 .kn-detail:has(.kn-detail-body:empty),
                    #kn-scene_481 .kn-detail:has(.kn-detail-body span:empty) {
                        display: none !important;
                    }
                    
                    /* Improve the overall scene layout */
                    #kn-scene_481.kn-scene {
                        padding-top: 20px;
                    }
                    
                    /* Make view groups flex for better layout */
                    #kn-scene_481 .view-group {
                        display: flex;
                        flex-direction: column;
                        gap: 20px;
                    }
                    
                    /* Style the activities table if visible */
                    #kn-scene_481 #view_1279 {
                        margin-top: 30px;
                        border-top: 2px solid #e0e0e0;
                        padding-top: 30px;
                    }
                    
                    /* Add a nice header style for the tutor activity level details */
                    #kn-scene_481 #view_1277 .view-header h2 {
                        color: #5f497a;
                        font-size: 28px;
                        margin-bottom: 20px;
                        text-align: center;
                    }
                    
                    /* Create a grid layout for multiple book images */
                    #kn-scene_481 .kn-details-group-column {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                        gap: 30px;
                        align-items: start;
                    }
                    
                    /* Responsive adjustments */
                    @media (max-width: 768px) {
                        #kn-scene_481 .field_1439 img,
                        #kn-scene_481 .field_2922 img,
                        #kn-scene_481 .field_2924 img {
                            max-width: 100%;
                        }
                        
                        #kn-scene_481 .kn-details-group-column {
                            grid-template-columns: 1fr;
                        }
                    }
                `;
                document.head.appendChild(style);
                stylesApplied = true;
                console.log('[Scene 481 Fix v3] Styles applied');
            }
        }
        
        // Force hide elements immediately
        forceHideElements();
        
        // Set up MutationObserver to catch any attempts to show hidden elements
        setupMutationObserver();
        
        // Additional JavaScript enhancements
        enhanceBookImages();
    }
    
    function forceHideElements() {
        // List of selectors to hide
        const selectorsToHide = [
            '#kn-scene_481 #view_1255',
            '#kn-scene_481 #view_3150',
            '#kn-scene_481 .view-group-1',
            '#kn-scene_481 .view-group:has(#view_1255)',
            '#kn-scene_481 .view-group:has(#view_3150)'
        ];
        
        selectorsToHide.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                // Apply inline styles as the most aggressive approach
                element.style.cssText = `
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                    height: 0 !important;
                    max-height: 0 !important;
                    overflow: hidden !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    position: absolute !important;
                    left: -9999px !important;
                    top: -9999px !important;
                `;
                // Also add a data attribute to track that we've hidden it
                element.setAttribute('data-force-hidden', 'true');
            });
        });
    }
    
    function setupMutationObserver() {
        // Disconnect existing observer if any
        if (observer) {
            observer.disconnect();
        }
        
        // Create new observer
        observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // Check if any hidden elements are being shown
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    const element = mutation.target;
                    if (element.hasAttribute('data-force-hidden') || 
                        element.id === 'view_1255' || 
                        element.id === 'view_3150' ||
                        element.classList.contains('view-group-1')) {
                        // Re-hide it immediately
                        element.style.cssText = `
                            display: none !important;
                            visibility: hidden !important;
                            opacity: 0 !important;
                            height: 0 !important;
                            max-height: 0 !important;
                            overflow: hidden !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            position: absolute !important;
                            left: -9999px !important;
                            top: -9999px !important;
                        `;
                        console.log('[Scene 481 Fix v3] Re-hidden element:', element.id || element.className);
                    }
                }
                
                // Check for new nodes being added
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) { // Element node
                            // Check if it's one of our hidden elements
                            if (node.id === 'view_1255' || node.id === 'view_3150') {
                                forceHideElements();
                            }
                        }
                    });
                }
            });
        });
        
        // Start observing
        const scene = document.querySelector('#kn-scene_481');
        if (scene) {
            observer.observe(scene, {
                attributes: true,
                attributeFilter: ['style', 'class'],
                childList: true,
                subtree: true
            });
            console.log('[Scene 481 Fix v3] MutationObserver started');
        }
    }
    
    function enhanceBookImages() {
        // Use a more specific timeout to ensure DOM is ready
        const attempts = [100, 300, 500, 1000];
        
        attempts.forEach(delay => {
            setTimeout(() => {
                // Force hide elements again
                forceHideElements();
                
                // Find all book images and add click handlers
                const bookImages = document.querySelectorAll('#kn-scene_481 .field_1439 img, #kn-scene_481 .field_2922 img, #kn-scene_481 .field_2924 img');
                
                if (bookImages.length > 0) {
                    console.log(`[Scene 481 Fix v3] Found ${bookImages.length} book images after ${delay}ms`);
                    
                    bookImages.forEach(img => {
                        // Only add click handler if not already added
                        if (!img.hasAttribute('data-click-handler-added')) {
                            img.style.cursor = 'pointer';
                            img.title = 'Click to view larger';
                            
                            img.addEventListener('click', function() {
                                window.open(this.src, '_blank');
                            });
                            
                            img.setAttribute('data-click-handler-added', 'true');
                        }
                    });
                }
                
                // Clean up any empty detail rows
                const detailRows = document.querySelectorAll('#kn-scene_481 .kn-detail');
                detailRows.forEach(row => {
                    const body = row.querySelector('.kn-detail-body');
                    if (body && (!body.textContent.trim() || body.textContent.trim() === '')) {
                        row.style.display = 'none';
                    }
                });
                
                // If there's a "Tutor Activity Levels Name" field, make it more prominent
                const levelNameField = document.querySelector('#kn-scene_481 .field_1429');
                if (levelNameField && !levelNameField.hasAttribute('data-styled')) {
                    const nameText = levelNameField.querySelector('.kn-detail-body');
                    if (nameText) {
                        nameText.style.fontSize = '24px';
                        nameText.style.fontWeight = '600';
                        nameText.style.color = '#5f497a';
                        nameText.style.textAlign = 'center';
                        nameText.style.marginBottom = '20px';
                        levelNameField.setAttribute('data-styled', 'true');
                    }
                }
                
            }, delay);
        });
    }
    
    // Initialize on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixScene481Layout);
    } else {
        fixScene481Layout();
    }
    
    // Re-apply fixes on scene render
    $(document).on('knack-scene-render.scene_481', function() {
        console.log('[Scene 481 Fix v3] Scene rendered, applying fixes');
        fixScene481Layout();
    });
    
    // Also listen for view renders within scene_481
    $(document).on('knack-view-render.any', function(event, view) {
        if (window.location.hash.includes('tutor-activities') || window.location.hash.includes('scene_481')) {
            console.log(`[Scene 481 Fix v3] View ${view.key} rendered in scene_481, reapplying fixes`);
            fixScene481Layout();
        }
    });
    
    // Also listen for any navigation to tutor-activities
    $(document).on('knack-scene-render.any', function(event, scene) {
        if (window.location.hash.includes('tutor-activities')) {
            console.log('[Scene 481 Fix v3] Navigated to tutor activities');
            fixScene481Layout();
        }
    });
    
    // Clean up observer when navigating away
    $(document).on('knack-scene-render.any', function(event, scene) {
        if (scene.key !== 'scene_481' && observer) {
            observer.disconnect();
            observer = null;
            console.log('[Scene 481 Fix v3] MutationObserver disconnected');
        }
    });
    
    console.log('[Scene 481 Fix v3] Initialization complete');
})(); 
