/**
 * Scene 481 Resources Page Layout Fix
 * Hides unnecessary elements and improves the display of book images
 * Version 4 - Stable version with race condition prevention
 */

(function() {
    'use strict';
    
    console.log('[Scene 481 Fix v4] Script loaded');
    
    // Track if we've already applied certain one-time fixes
    let stylesApplied = false;
    let isProcessing = false;
    let processCount = 0;
    const MAX_PROCESS_COUNT = 5; // Prevent infinite loops
    
    function fixScene481Layout() {
        // Check if we're on scene_481
        const currentScene = window.location.hash;
        if (!currentScene.includes('tutor-activities') && !currentScene.includes('scene_481')) {
            return;
        }
        
        // Prevent race conditions
        if (isProcessing) {
            console.log('[Scene 481 Fix v4] Already processing, skipping...');
            return;
        }
        
        if (processCount >= MAX_PROCESS_COUNT) {
            console.log('[Scene 481 Fix v4] Max process count reached, stopping to prevent infinite loop');
            return;
        }
        
        isProcessing = true;
        processCount++;
        
        console.log(`[Scene 481 Fix v4] Applying layout fixes (attempt ${processCount})`);
        
        // Apply CSS fixes (only once)
        if (!stylesApplied) {
            applyStyles();
        }
        
        // Apply fixes with a slight delay to let DOM settle
        setTimeout(() => {
            applyDOMFixes();
            isProcessing = false;
        }, 100);
    }
    
    function applyStyles() {
        const styleId = 'scene-481-fixes-v4';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                /* Hide the unnecessary table view at the top */
                #kn-scene_481 #view_1255,
                #kn-scene_481 .kn-table.view_1255 {
                    display: none !important;
                    visibility: hidden !important;
                    height: 0 !important;
                    overflow: hidden !important;
                    position: absolute !important;
                    left: -9999px !important;
                }
                
                /* Hide the "Hello World" rich text view */
                #kn-scene_481 #view_3150,
                #kn-scene_481 .kn-rich_text.view_3150 {
                    display: none !important;
                    visibility: hidden !important;
                    height: 0 !important;
                    overflow: hidden !important;
                    position: absolute !important;
                    left: -9999px !important;
                }
                
                /* Hide the entire first view group */
                #kn-scene_481 .view-group-1 {
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
            console.log('[Scene 481 Fix v4] Styles applied');
        }
    }
    
    function applyDOMFixes() {
        // Only hide elements that are actually visible
        const view1255 = document.querySelector('#kn-scene_481 #view_1255');
        if (view1255 && view1255.style.display !== 'none') {
            view1255.style.display = 'none';
            console.log('[Scene 481 Fix v4] Hidden view_1255');
        }
        
        const view3150 = document.querySelector('#kn-scene_481 #view_3150');
        if (view3150 && view3150.style.display !== 'none') {
            view3150.style.display = 'none';
            console.log('[Scene 481 Fix v4] Hidden view_3150');
        }
        
        const viewGroup1 = document.querySelector('#kn-scene_481 .view-group-1');
        if (viewGroup1 && viewGroup1.style.display !== 'none') {
            viewGroup1.style.display = 'none';
            console.log('[Scene 481 Fix v4] Hidden view-group-1');
        }
        
        // Enhance book images
        enhanceBookImages();
    }
    
    function enhanceBookImages() {
        // Find all book images and add click handlers
        const bookImages = document.querySelectorAll('#kn-scene_481 .field_1439 img, #kn-scene_481 .field_2922 img, #kn-scene_481 .field_2924 img');
        
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
        
        console.log(`[Scene 481 Fix v4] Enhanced ${bookImages.length} book images`);
    }
    
    // Initialize on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(fixScene481Layout, 500);
        });
    } else {
        setTimeout(fixScene481Layout, 500);
    }
    
    // Re-apply fixes on scene render - but with debouncing
    let sceneRenderTimeout;
    $(document).on('knack-scene-render.scene_481', function() {
        console.log('[Scene 481 Fix v4] Scene rendered event');
        clearTimeout(sceneRenderTimeout);
        sceneRenderTimeout = setTimeout(() => {
            processCount = 0; // Reset count for new scene render
            fixScene481Layout();
        }, 300);
    });
    
    // Listen for view renders but with debouncing
    let viewRenderTimeout;
    $(document).on('knack-view-render.any', function(event, view) {
        if (window.location.hash.includes('tutor-activities') || window.location.hash.includes('scene_481')) {
            clearTimeout(viewRenderTimeout);
            viewRenderTimeout = setTimeout(() => {
                // Only process if we haven't hit the limit
                if (processCount < MAX_PROCESS_COUNT) {
                    fixScene481Layout();
                }
            }, 200);
        }
    });
    
    console.log('[Scene 481 Fix v4] Initialization complete');
})(); 
