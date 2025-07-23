/**
 * Scene 481 Resources Page Layout Fix
 * Hides unnecessary elements and improves the display of book images
 * Version 6 - Specifically targets view-column-group-3 and view-column-group-4
 */

(function() {
    'use strict';
    
    console.log('[Scene 481 Fix v6] Script loaded');
    
    let stylesApplied = false;
    
    function fixScene481Layout() {
        // Check if we're on scene_481
        const currentScene = window.location.hash;
        if (!currentScene.includes('tutor-activities') && !currentScene.includes('scene_481')) {
            return;
        }
        
        console.log('[Scene 481 Fix v6] Applying layout fixes');
        
        // Apply CSS fixes (only once)
        if (!stylesApplied) {
            applyStyles();
        }
        
        // Apply DOM fixes
        setTimeout(() => {
            applyDOMFixes();
        }, 300);
    }
    
    function applyStyles() {
        const styleId = 'scene-481-fixes-v6';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                /* Hide the specific view column groups that are taking up space */
                #kn-scene_481 .view-column-group-3,
                #kn-scene_481 .view-column-group-4,
                #kn-scene_481 .view-column-group-5,
                #kn-scene_481 .view-column-group-6,
                #kn-scene_481 .view-group-3,
                #kn-scene_481 .view-group-4,
                #kn-scene_481 .view-group-5,
                #kn-scene_481 .view-group-6 {
                    display: none !important;
                    visibility: hidden !important;
                    height: 0 !important;
                    max-height: 0 !important;
                    overflow: hidden !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    position: absolute !important;
                    left: -9999px !important;
                }
                
                /* Also hide the first two groups if they're empty */
                #kn-scene_481 .view-column-group-1,
                #kn-scene_481 .view-column-group-2,
                #kn-scene_481 .view-group-1,
                #kn-scene_481 .view-group-2:not(:has(#view_1277)) {
                    display: none !important;
                    visibility: hidden !important;
                    height: 0 !important;
                    max-height: 0 !important;
                    overflow: hidden !important;
                    margin: 0 !important;
                    padding: 0 !important;
                }
                
                /* Hide the unnecessary views */
                #kn-scene_481 #view_1255,
                #kn-scene_481 #view_3150,
                #kn-scene_481 #view_1316,
                #kn-scene_481 #view_1462,
                #kn-scene_481 .view_1255,
                #kn-scene_481 .view_3150,
                #kn-scene_481 .view_1316 {
                    display: none !important;
                    visibility: hidden !important;
                    height: 0 !important;
                    overflow: hidden !important;
                    position: absolute !important;
                    left: -9999px !important;
                }
                
                /* Ensure the book details view is visible and at the top */
                #kn-scene_481 #view_1277 {
                    display: block !important;
                    visibility: visible !important;
                    margin-top: 0 !important;
                    padding-top: 20px !important;
                }
                
                /* If view_1277 is in view-group-2, make sure that group is visible */
                #kn-scene_481 .view-group-2:has(#view_1277) {
                    display: block !important;
                    visibility: visible !important;
                    height: auto !important;
                    margin-top: 0 !important;
                    padding-top: 0 !important;
                    position: relative !important;
                    left: auto !important;
                }
                
                /* Remove top padding/margin from scene */
                #kn-scene_481 {
                    padding-top: 0 !important;
                    margin-top: 0 !important;
                }
                
                /* Style the book images */
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
                
                /* Style the book section */
                #kn-scene_481 .kn-details-group {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 12px;
                    margin: 10px 0;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                }
                
                /* Grid layout for book images */
                #kn-scene_481 .kn-details-group-column {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 25px;
                    align-items: start;
                    justify-items: center;
                }
                
                /* Header styling */
                #kn-scene_481 #view_1277 .view-header h2 {
                    color: #5f497a;
                    font-size: 28px;
                    margin-bottom: 20px;
                    text-align: center;
                    font-weight: 600;
                }
                
                /* Hide empty details */
                #kn-scene_481 .kn-detail:has(.kn-detail-body:empty) {
                    display: none !important;
                }
                
                /* Responsive */
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
            console.log('[Scene 481 Fix v6] Styles applied');
        }
    }
    
    function applyDOMFixes() {
        // Target the specific view column groups shown in the developer tools
        const problematicGroups = [
            '.view-column-group-3',
            '.view-column-group-4',
            '.view-column-group-5',
            '.view-column-group-6',
            '.view-group-3',
            '.view-group-4',
            '.view-group-5',
            '.view-group-6'
        ];
        
        problematicGroups.forEach(selector => {
            const elements = document.querySelectorAll(`#kn-scene_481 ${selector}`);
            elements.forEach(element => {
                element.style.display = 'none';
                element.style.height = '0';
                element.style.overflow = 'hidden';
                element.style.margin = '0';
                element.style.padding = '0';
                console.log(`[Scene 481 Fix v6] Hidden ${selector}`);
            });
        });
        
        // Also hide view_1255, view_3150, and view_1316 (Tutor Details)
        const viewsToHide = ['#view_1255', '#view_3150', '#view_1316', '#view_1462', '.view_1255', '.view_3150', '.view_1316', '.view_1462'];
        viewsToHide.forEach(selector => {
            const elements = document.querySelectorAll(`#kn-scene_481 ${selector}`);
            elements.forEach(element => {
                element.style.display = 'none';
                console.log(`[Scene 481 Fix v6] Hidden ${selector}`);
            });
        });
        
        // Ensure book section is visible
        const bookSection = document.querySelector('#kn-scene_481 #view_1277');
        if (bookSection) {
            bookSection.style.display = 'block';
            bookSection.style.visibility = 'visible';
            
            // Find its parent and make sure it's visible too
            let parent = bookSection.parentElement;
            while (parent && !parent.id.includes('kn-scene')) {
                parent.style.display = 'block';
                parent.style.visibility = 'visible';
                parent.style.height = 'auto';
                parent = parent.parentElement;
            }
        }
        
        // Enhance book images
        enhanceBookImages();
    }
    
    function enhanceBookImages() {
        const bookImages = document.querySelectorAll('#kn-scene_481 .field_1439 img, #kn-scene_481 .field_2922 img, #kn-scene_481 .field_2924 img');
        
        bookImages.forEach(img => {
            if (!img.hasAttribute('data-click-handler-added')) {
                img.style.cursor = 'pointer';
                img.title = 'Click to view larger';
                
                img.addEventListener('click', function() {
                    window.open(this.src, '_blank');
                });
                
                img.setAttribute('data-click-handler-added', 'true');
            }
        });
        
        // Style the level name
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
        
        console.log(`[Scene 481 Fix v6] Enhanced ${bookImages.length} book images`);
    }
    
    // Initialize
    setTimeout(() => {
        fixScene481Layout();
    }, 500);
    
    // Re-apply on scene render
    $(document).on('knack-scene-render.scene_481', function() {
        console.log('[Scene 481 Fix v6] Scene rendered');
        setTimeout(() => {
            fixScene481Layout();
        }, 300);
    });
    
    // Re-apply on view render
    $(document).on('knack-view-render.view_1277', function() {
        console.log('[Scene 481 Fix v6] Book view rendered');
        setTimeout(() => {
            fixScene481Layout();
        }, 300);
    });
    
    // Also check for any view render in scene_481
    $(document).on('knack-view-render.any', function(event, view) {
        if (window.location.hash.includes('scene_481')) {
            console.log(`[Scene 481 Fix v6] View ${view.key} rendered in scene_481`);
            setTimeout(() => {
                applyDOMFixes(); // Just apply DOM fixes, don't re-apply styles
            }, 200);
        }
    });
    
    console.log('[Scene 481 Fix v6] Initialization complete');
})(); 
