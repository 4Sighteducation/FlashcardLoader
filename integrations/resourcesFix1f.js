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
                    margin-top: -40px !important; /* Pull content up */
                    padding-top: 20px !important;
                    position: relative !important;
                    z-index: 10 !important;
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
                
                /* Style the book images with fancy borders and positioning */
                #kn-scene_481 .field_1439 img,
                #kn-scene_481 .field_2922 img,
                #kn-scene_481 .field_2924 img {
                    max-width: 280px !important;
                    height: auto !important;
                    border-radius: 12px !important;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.15) !important;
                    transition: all 0.3s ease !important;
                    cursor: pointer !important;
                    margin: 10px !important;
                    
                    /* Fancy border with gradient */
                    border: 3px solid transparent !important;
                    background-origin: border-box !important;
                    background-clip: padding-box, border-box !important;
                    background-image: 
                        linear-gradient(white, white),
                        linear-gradient(45deg, #5f497a, #8b7aa0, #5f497a) !important;
                    
                    /* Add some visual depth */
                    position: relative !important;
                    top: -20px !important; /* Move books up */
                }
                
                /* Even fancier hover effect */
                #kn-scene_481 .field_1439 img:hover,
                #kn-scene_481 .field_2922 img:hover,
                #kn-scene_481 .field_2924 img:hover {
                    transform: translateY(-10px) scale(1.08) rotate(1deg) !important;
                    box-shadow: 
                        0 20px 40px rgba(95, 73, 122, 0.3),
                        0 10px 20px rgba(0,0,0,0.15) !important;
                    
                    /* Glow effect on hover */
                    filter: brightness(1.05) !important;
                    
                    /* Animated gradient border on hover */
                    background-image: 
                        linear-gradient(white, white),
                        linear-gradient(90deg, #5f497a, #8b7aa0, #b19dc0, #8b7aa0, #5f497a) !important;
                }
                
                /* Style the book section with enhanced appearance */
                #kn-scene_481 .kn-details-group {
                    background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%) !important;
                    padding: 30px !important;
                    border-radius: 20px !important;
                    margin: 10px 0 !important;
                    box-shadow: 
                        0 10px 30px rgba(95, 73, 122, 0.1),
                        0 5px 15px rgba(0,0,0,0.08) !important;
                    border: 1px solid rgba(95, 73, 122, 0.1) !important;
                    position: relative !important;
                    overflow: visible !important;
                }
                
                /* Add a subtle animated background pattern */
                #kn-scene_481 .kn-details-group::before {
                    content: '' !important;
                    position: absolute !important;
                    top: -2px !important;
                    left: -2px !important;
                    right: -2px !important;
                    bottom: -2px !important;
                    background: linear-gradient(45deg, #5f497a, #8b7aa0, #5f497a) !important;
                    border-radius: 20px !important;
                    opacity: 0.1 !important;
                    z-index: -1 !important;
                    transition: opacity 0.3s ease !important;
                }
                
                #kn-scene_481 .kn-details-group:hover::before {
                    opacity: 0.15 !important;
                }
                
                /* Grid layout for book images */
                #kn-scene_481 .kn-details-group-column {
                    display: grid !important;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)) !important;
                    gap: 35px !important;
                    align-items: start !important;
                    justify-items: center !important;
                    padding: 20px 0 !important;
                }
                
                /* Add animation to books on load */
                @keyframes bookFadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                
                #kn-scene_481 .field_1439,
                #kn-scene_481 .field_2922,
                #kn-scene_481 .field_2924 {
                    animation: bookFadeIn 0.6s ease-out forwards !important;
                }
                
                #kn-scene_481 .field_1439 {
                    animation-delay: 0.1s !important;
                }
                
                #kn-scene_481 .field_2922 {
                    animation-delay: 0.2s !important;
                }
                
                #kn-scene_481 .field_2924 {
                    animation-delay: 0.3s !important;
                }
                
                /* Header styling with enhanced appearance */
                #kn-scene_481 #view_1277 .view-header h2 {
                    color: #5f497a !important;
                    font-size: 32px !important;
                    margin-bottom: 30px !important;
                    text-align: center !important;
                    font-weight: 700 !important;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.1) !important;
                    letter-spacing: 1px !important;
                    position: relative !important;
                    padding-bottom: 15px !important;
                }
                
                /* Add decorative underline to header */
                #kn-scene_481 #view_1277 .view-header h2::after {
                    content: '' !important;
                    position: absolute !important;
                    bottom: 0 !important;
                    left: 50% !important;
                    transform: translateX(-50%) !important;
                    width: 100px !important;
                    height: 3px !important;
                    background: linear-gradient(90deg, transparent, #5f497a, transparent) !important;
                    border-radius: 2px !important;
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

