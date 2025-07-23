/**
 * Scene 481 Resources Page Layout Fix
 * Hides unnecessary elements and improves the display of book images
 * Version 5 - Aggressive whitespace removal and repositioning
 */

(function() {
    'use strict';
    
    console.log('[Scene 481 Fix v5] Script loaded');
    
    // Track if we've already applied certain one-time fixes
    let stylesApplied = false;
    let isProcessing = false;
    
    function fixScene481Layout() {
        // Check if we're on scene_481
        const currentScene = window.location.hash;
        if (!currentScene.includes('tutor-activities') && !currentScene.includes('scene_481')) {
            return;
        }
        
        // Prevent race conditions
        if (isProcessing) {
            console.log('[Scene 481 Fix v5] Already processing, skipping...');
            return;
        }
        
        isProcessing = true;
        
        console.log('[Scene 481 Fix v5] Applying layout fixes');
        
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
        const styleId = 'scene-481-fixes-v5';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                /* Remove ALL padding/margin from the scene container */
                #kn-scene_481 {
                    padding-top: 0 !important;
                    margin-top: 0 !important;
                }
                
                /* Hide the unnecessary elements completely */
                #kn-scene_481 #view_1255,
                #kn-scene_481 .view_1255,
                #kn-scene_481 #view_3150,
                #kn-scene_481 .view_3150 {
                    display: none !important;
                    visibility: hidden !important;
                    height: 0 !important;
                    max-height: 0 !important;
                    min-height: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: hidden !important;
                    position: absolute !important;
                    left: -9999px !important;
                    top: -9999px !important;
                    width: 0 !important;
                }
                
                /* Completely remove the first view group */
                #kn-scene_481 .view-group-1,
                #kn-scene_481 .view-group:first-child:has(#view_1255),
                #kn-scene_481 .view-group:has(#view_3150) {
                    display: none !important;
                    visibility: hidden !important;
                    height: 0 !important;
                    max-height: 0 !important;
                    min-height: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: hidden !important;
                    position: absolute !important;
                    left: -9999px !important;
                    top: -9999px !important;
                }
                
                /* Force the second view group to the top */
                #kn-scene_481 .view-group-2 {
                    margin-top: -20px !important;
                    padding-top: 0 !important;
                    position: relative !important;
                    top: 0 !important;
                }
                
                /* Make the details view prominent and at the top */
                #kn-scene_481 #view_1277 {
                    margin-top: 0 !important;
                    padding-top: 10px !important;
                    position: relative !important;
                    top: 0 !important;
                }
                
                /* Remove any empty space at the top of the page */
                #kn-scene_481 > *:first-child {
                    margin-top: 0 !important;
                    padding-top: 0 !important;
                }
                
                /* Ensure the book images section is visible */
                #kn-scene_481 .kn-details {
                    display: block !important;
                    visibility: visible !important;
                    opacity: 1 !important;
                }
                
                /* Style the book images better */
                #kn-scene_481 .field_1439 img,
                #kn-scene_481 .field_2922 img,
                #kn-scene_481 .field_2924 img {
                    max-width: 280px;
                    height: auto;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    transition: transform 0.3s ease, box-shadow 0.3s ease;
                    cursor: pointer;
                    margin: 10px;
                }
                
                #kn-scene_481 .field_1439 img:hover,
                #kn-scene_481 .field_2922 img:hover,
                #kn-scene_481 .field_2924 img:hover {
                    transform: translateY(-5px) scale(1.05);
                    box-shadow: 0 8px 20px rgba(0,0,0,0.25);
                }
                
                /* Make the book image section more prominent */
                #kn-scene_481 .kn-details-group {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 12px;
                    margin: 10px 0;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                }
                
                /* Style the labels */
                #kn-scene_481 .kn-detail-label {
                    font-weight: 600;
                    color: #333;
                    margin-bottom: 10px;
                    font-size: 14px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
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
                    font-weight: 600;
                }
                
                /* Create a grid layout for multiple book images */
                #kn-scene_481 .kn-details-group-column {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 25px;
                    align-items: start;
                    justify-items: center;
                }
                
                /* Remove any default Knack spacing */
                #kn-scene_481 .kn-container {
                    padding-top: 0 !important;
                    margin-top: 0 !important;
                }
                
                /* Force proper stacking order */
                #kn-scene_481 .view-group {
                    position: relative;
                    z-index: 1;
                }
                
                #kn-scene_481 .view-group-2 {
                    z-index: 10;
                }
                
                /* Responsive adjustments */
                @media (max-width: 768px) {
                    #kn-scene_481 .field_1439 img,
                    #kn-scene_481 .field_2922 img,
                    #kn-scene_481 .field_2924 img {
                        max-width: 100%;
                        margin: 5px;
                    }
                    
                    #kn-scene_481 .kn-details-group-column {
                        grid-template-columns: 1fr;
                    }
                    
                    #kn-scene_481 .view-group-2 {
                        margin-top: -10px !important;
                    }
                }
            `;
            document.head.appendChild(style);
            stylesApplied = true;
            console.log('[Scene 481 Fix v5] Styles applied');
        }
    }
    
    function applyDOMFixes() {
        // Find the scene container and remove top padding
        const sceneContainer = document.querySelector('#kn-scene_481');
        if (sceneContainer) {
            sceneContainer.style.paddingTop = '0';
            sceneContainer.style.marginTop = '0';
        }
        
        // Hide problematic views
        const elementsToHide = [
            '#kn-scene_481 #view_1255',
            '#kn-scene_481 #view_3150',
            '#kn-scene_481 .view-group-1',
            '#kn-scene_481 .view-group:first-child'
        ];
        
        elementsToHide.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                element.style.display = 'none';
                element.style.height = '0';
                element.style.margin = '0';
                element.style.padding = '0';
                element.style.overflow = 'hidden';
            });
        });
        
        // Force the book images section to the top
        const viewGroup2 = document.querySelector('#kn-scene_481 .view-group-2');
        if (viewGroup2) {
            viewGroup2.style.marginTop = '-20px';
            viewGroup2.style.paddingTop = '0';
            console.log('[Scene 481 Fix v5] Repositioned view-group-2');
        }
        
        // Enhance book images
        enhanceBookImages();
        
        // Remove any empty space at the top
        removeTopWhitespace();
    }
    
    function removeTopWhitespace() {
        // Find all direct children of the scene
        const scene = document.querySelector('#kn-scene_481');
        if (!scene) return;
        
        const children = scene.children;
        let firstVisibleFound = false;
        
        // Hide everything until we find the first visible element with content
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            
            // Check if this element has the book images
            if (child.querySelector('#view_1277') || child.querySelector('.field_1439')) {
                firstVisibleFound = true;
                child.style.marginTop = '0';
                child.style.paddingTop = '0';
                console.log('[Scene 481 Fix v5] Found book section, removing top spacing');
            } else if (!firstVisibleFound) {
                // Hide elements before the book section
                child.style.display = 'none';
                console.log('[Scene 481 Fix v5] Hiding element before book section');
            }
        }
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
        
        console.log(`[Scene 481 Fix v5] Enhanced ${bookImages.length} book images`);
    }
    
    // Initialize with a longer delay to ensure DOM is ready
    setTimeout(() => {
        fixScene481Layout();
    }, 1000);
    
    // Re-apply fixes on scene render
    $(document).on('knack-scene-render.scene_481', function() {
        console.log('[Scene 481 Fix v5] Scene rendered event');
        setTimeout(() => {
            isProcessing = false; // Reset flag
            fixScene481Layout();
        }, 500);
    });
    
    // Also apply fixes when the specific view renders
    $(document).on('knack-view-render.view_1277', function() {
        console.log('[Scene 481 Fix v5] Book view rendered');
        setTimeout(() => {
            isProcessing = false; // Reset flag
            fixScene481Layout();
        }, 300);
    });
    
    console.log('[Scene 481 Fix v5] Initialization complete');
})(); 
