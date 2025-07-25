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
        
        // Remove any existing style to force refresh
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) {
            existingStyle.remove();
            console.log('[Scene 481 Fix v6] Removed existing styles for refresh');
        }
        
        const style = document.createElement('style');
        style.id = styleId;
        
        // Log that we're applying styles
        console.log('[Scene 481 Fix v6] Injecting enhanced CSS styles...');
        
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
                    width: 0 !important;
                    max-height: 0 !important;
                    max-width: 0 !important;
                    overflow: hidden !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    position: fixed !important;
                    left: -9999px !important;
                    top: -9999px !important;
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
                    width: 0 !important;
                    overflow: hidden !important;
                    position: fixed !important;
                    left: -9999px !important;
                    top: -9999px !important;
                }
                
                /* Center the book details view on page */
                #kn-scene_481 #view_1277 {
                    display: block !important;
                    visibility: visible !important;
                    margin-top: 100px !important; /* Center books vertically */
                    margin-bottom: 100px !important; /* Add bottom margin too */
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
                
                /* Keep default scrolling but optimize layout */
                #kn-scene_481 {
                    padding-top: 20px !important;
                    margin-top: 0 !important;
                }
                
                /* Ensure proper container sizing */
                #kn-scene_481.kn-scene {
                    max-width: 100% !important;
                }
                
                /* Ensure the body doesn't create unnecessary scrollbars */
                body.kn-scene-active-scene_481 {
                    overflow-x: hidden !important;
                }
                
                /* Keep default scrolling behavior and layout */
                
                /* Keep default scrolling and just ensure no horizontal overflow */
                #kn-scene_481 * {
                    max-width: 100% !important;
                }
                
                /* Style the book images with fancy borders and positioning */
                #kn-scene_481 .field_1439 img,
                #kn-scene_481 .field_2922 img,
                #kn-scene_481 .field_2924 img,
                #kn-scene_481 .col-1 img,
                #kn-scene_481 .col-3 img,
                #kn-scene_481 .col-5 img,
                #kn-scene_481 .levels img {
                    width: calc(100% - 20px) !important; /* Account for margins */
                    max-width: 420px !important; /* Much larger on desktop */
                    height: auto !important;
                    border-radius: 12px !important;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.15) !important;
                    transition: all 0.3s ease !important;
                    cursor: pointer !important;
                    margin: 10px auto !important;
                    display: block !important;
                    
                    /* Simple elegant border */
                    border: 2px solid rgba(95, 73, 122, 0.3) !important;
                    
                    /* Add some visual depth */
                    position: relative !important;
                    top: 0 !important; /* Reset to normal position */
                    
                    /* Force remove any background images that might create borders */
                    background: none !important;
                    background-image: none !important;
                    outline: none !important;
                }
                
                /* Responsive sizing for different screens */
                @media (max-width: 1400px) {
                    #kn-scene_481 .field_1439 img,
                    #kn-scene_481 .field_2922 img,
                    #kn-scene_481 .field_2924 img,
                    #kn-scene_481 .col-1 img,
                    #kn-scene_481 .col-3 img,
                    #kn-scene_481 .col-5 img,
                    #kn-scene_481 .levels img {
                        max-width: 350px !important;
                    }
                }
                
                @media (max-width: 1200px) {
                    #kn-scene_481 .field_1439 img,
                    #kn-scene_481 .field_2922 img,
                    #kn-scene_481 .field_2924 img,
                    #kn-scene_481 .col-1 img,
                    #kn-scene_481 .col-3 img,
                    #kn-scene_481 .col-5 img,
                    #kn-scene_481 .levels img {
                        max-width: 300px !important;
                    }
                }
                
                @media (max-width: 768px) {
                    #kn-scene_481 .field_1439 img,
                    #kn-scene_481 .field_2922 img,
                    #kn-scene_481 .field_2924 img,
                    #kn-scene_481 .col-1 img,
                    #kn-scene_481 .col-3 img,
                    #kn-scene_481 .col-5 img,
                    #kn-scene_481 .levels img {
                        max-width: 250px !important;
                    }
                }
                
                @media (max-width: 480px) {
                    #kn-scene_481 .field_1439 img,
                    #kn-scene_481 .field_2922 img,
                    #kn-scene_481 .field_2924 img,
                    #kn-scene_481 .col-1 img,
                    #kn-scene_481 .col-3 img,
                    #kn-scene_481 .col-5 img,
                    #kn-scene_481 .levels img {
                        max-width: 200px !important;
                        top: -20px !important; /* Less uplift on mobile */
                    }
                }
                
                /* Remove any pseudo-elements that might create borders */
                #kn-scene_481 .field_1439 img::before,
                #kn-scene_481 .field_1439 img::after,
                #kn-scene_481 .field_2922 img::before,
                #kn-scene_481 .field_2922 img::after,
                #kn-scene_481 .field_2924 img::before,
                #kn-scene_481 .field_2924 img::after,
                #kn-scene_481 .col-1 img::before,
                #kn-scene_481 .col-1 img::after,
                #kn-scene_481 .col-3 img::before,
                #kn-scene_481 .col-3 img::after,
                #kn-scene_481 .col-5 img::before,
                #kn-scene_481 .col-5 img::after,
                #kn-scene_481 .levels img::before,
                #kn-scene_481 .levels img::after {
                    display: none !important;
                    content: none !important;
                }
                
                /* Also clean up parent elements that might have borders */
                #kn-scene_481 .field_1439,
                #kn-scene_481 .field_2922,
                #kn-scene_481 .field_2924,
                #kn-scene_481 .col-1,
                #kn-scene_481 .col-3,
                #kn-scene_481 .col-5,
                #kn-scene_481 .levels {
                    background: none !important;
                    background-image: none !important;
                    border: none !important;
                    outline: none !important;
                    text-align: center !important; /* Center the images within containers */
                }
                
                /* Remove pseudo-elements from parent divs too */
                #kn-scene_481 .field_1439::before,
                #kn-scene_481 .field_1439::after,
                #kn-scene_481 .field_2922::before,
                #kn-scene_481 .field_2922::after,
                #kn-scene_481 .field_2924::before,
                #kn-scene_481 .field_2924::after,
                #kn-scene_481 .col-1::before,
                #kn-scene_481 .col-1::after,
                #kn-scene_481 .col-3::before,
                #kn-scene_481 .col-3::after,
                #kn-scene_481 .col-5::before,
                #kn-scene_481 .col-5::after,
                #kn-scene_481 .levels::before,
                #kn-scene_481 .levels::after {
                    display: none !important;
                    content: none !important;
                }
                
                /* Even fancier hover effect - with glow instead of border */
                #kn-scene_481 .field_1439 img:hover,
                #kn-scene_481 .field_2922 img:hover,
                #kn-scene_481 .field_2924 img:hover,
                #kn-scene_481 .col-1 img:hover,
                #kn-scene_481 .col-3 img:hover,
                #kn-scene_481 .col-5 img:hover,
                #kn-scene_481 .levels img:hover {
                    transform: translateY(-5px) scale(1.05) !important; /* Much less vertical movement */
                    
                    /* Remove the gradient border on hover - just use solid */
                    border: 3px solid #5f497a !important;
                    background-image: none !important;
                    
                    /* Enhanced shadow with purple glow effect */
                    box-shadow: 
                        0 0 30px rgba(95, 73, 122, 0.4),  /* Purple glow */
                        0 0 15px rgba(95, 73, 122, 0.3),  /* Inner glow */
                        0 20px 40px rgba(95, 73, 122, 0.2),
                        0 10px 20px rgba(0,0,0,0.15) !important;
                    
                    /* Slight brightness boost */
                    filter: brightness(1.08) !important;
                }
                
                /* Aggressively clean up any hover effects on parent elements */
                #kn-scene_481 .field_1439:hover,
                #kn-scene_481 .field_2922:hover,
                #kn-scene_481 .field_2924:hover,
                #kn-scene_481 .col-1:hover,
                #kn-scene_481 .col-3:hover,
                #kn-scene_481 .col-5:hover,
                #kn-scene_481 .levels:hover {
                    background: none !important;
                    background-image: none !important;
                    border: none !important;
                    outline: none !important;
                }
                
                /* Force clean all possible image containers on hover */
                #kn-scene_481 .kn-detail:has(img):hover,
                #kn-scene_481 .kn-detail-body:has(img):hover,
                #kn-scene_481 .kn-details-group-column:has(img):hover {
                    background: none !important;
                    background-image: none !important;
                    border: none !important;
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
                    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)) !important;
                    gap: 40px !important;
                    align-items: start !important;
                    justify-items: center !important;
                    padding: 20px 10px !important; /* Less horizontal padding to prevent overflow */
                    width: 100% !important;
                    max-width: 100% !important;
                    box-sizing: border-box !important;
                }
                
                /* Responsive grid adjustments */
                @media (max-width: 1200px) {
                    #kn-scene_481 .kn-details-group-column {
                        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)) !important;
                        gap: 30px !important;
                    }
                }
                
                @media (max-width: 768px) {
                    #kn-scene_481 .kn-details-group-column {
                        grid-template-columns: 1fr !important;
                        gap: 25px !important;
                    }
                }
                

                
                /* Simple container styling */
                #kn-scene_481.kn-scene.kn-container.group-layout-wrapper {
                    max-width: 100% !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                    padding: 20px !important;
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
                
                /* Clean up any extra spacing on mobile */
                @media (max-width: 768px) {
                    #kn-scene_481 .kn-details-group {
                        padding: 20px 15px !important;
                    }
                    
                    #kn-scene_481 #view_1277 {
                        margin-top: 0 !important; /* No negative margin on mobile */
                    }
                }
            `;
        document.head.appendChild(style);
        stylesApplied = true;
        
        // Log successful injection and verify
        console.log('[Scene 481 Fix v6] Styles applied successfully!');
        console.log('[Scene 481 Fix v6] Verify styles by checking for #scene-481-fixes-v6 in <head>');
        
        // Debug: Check if specific styles are working
        setTimeout(() => {
            const testImg = document.querySelector('#kn-scene_481 .field_1439 img, #kn-scene_481 .field_2922 img, #kn-scene_481 .field_2924 img');
            if (testImg) {
                const computedStyle = window.getComputedStyle(testImg);
                console.log('[Scene 481 Fix v6] Book image computed styles:', {
                    border: computedStyle.border,
                    borderRadius: computedStyle.borderRadius,
                    position: computedStyle.position,
                    top: computedStyle.top,
                    maxWidth: computedStyle.maxWidth
                });
            }
        }, 500);
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
        const bookImages = document.querySelectorAll('#kn-scene_481 .field_1439 img, #kn-scene_481 .field_2922 img, #kn-scene_481 .field_2924 img, #kn-scene_481 .col-1 img, #kn-scene_481 .col-3 img, #kn-scene_481 .col-5 img, #kn-scene_481 .levels img');
        
        console.log(`[Scene 481 Fix v6] Found ${bookImages.length} book images to enhance`);
        
        // Debug: Check what selectors we're finding
        const allImagesInView = document.querySelectorAll('#kn-scene_481 img');
        console.log(`[Scene 481 Fix v6] Total images in scene: ${allImagesInView.length}`);
        
        bookImages.forEach((img, index) => {
            console.log(`[Scene 481 Fix v6] Enhancing book image ${index + 1}:`, img.src);
            if (!img.hasAttribute('data-hover-handler-added')) {
                img.style.cursor = 'pointer';
                // DO NOT add click handlers - preserve original Knack navigation!
                
                // Only add hover event listeners to clean up any rogue borders
                img.addEventListener('mouseenter', function() {
                    // Clean up the image itself
                    this.style.backgroundImage = 'none';
                    this.style.background = 'none';
                    
                    // Clean up all parent elements
                    let parent = this.parentElement;
                    while (parent && !parent.id?.includes('kn-scene')) {
                        parent.style.background = 'none';
                        parent.style.backgroundImage = 'none';
                        parent.style.border = 'none';
                        parent = parent.parentElement;
                    }
                });
                
                img.setAttribute('data-hover-handler-added', 'true');
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
        
        // Simply log that initialization is complete
        setTimeout(() => {
            console.log('[Scene 481 Fix v6] Layout fixes applied - books centered');
        }, 1000);
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
    
    // Add global debugging function
    window.debugScene481Styles = function() {
        console.log('=== Scene 481 Style Debug ===');
        
        // Check if our style element exists
        const styleEl = document.getElementById('scene-481-fixes-v6');
        console.log('Style element exists:', !!styleEl);
        
        // Check book images
        const bookImages = document.querySelectorAll('#kn-scene_481 img');
        console.log(`Found ${bookImages.length} images in scene`);
        
        bookImages.forEach((img, i) => {
            console.log(`\nImage ${i + 1}:`);
            console.log('- Parent class:', img.parentElement?.className);
            console.log('- Src:', img.src);
            
            // Check for suspicious styles
            const computedStyle = window.getComputedStyle(img);
            const parentStyle = window.getComputedStyle(img.parentElement);
            
            console.log('- Image background:', computedStyle.background);
            console.log('- Image background-image:', computedStyle.backgroundImage);
            console.log('- Parent background:', parentStyle.background);
            console.log('- Parent ::before:', window.getComputedStyle(img.parentElement, '::before').content);
            console.log('- Parent ::after:', window.getComputedStyle(img.parentElement, '::after').content);
            
            // Try to manually apply styles with simple border
            img.style.cssText = `
                width: 100% !important;
                max-width: 420px !important;
                border: 2px solid rgba(95, 73, 122, 0.3) !important;
                border-radius: 12px !important;
                box-shadow: 0 8px 24px rgba(0,0,0,0.15) !important;
                position: relative !important;
                top: 0 !important;
                cursor: pointer !important;
                transition: all 0.3s ease !important;
                background: none !important;
                background-image: none !important;
                display: block !important;
                margin: 10px auto !important;
            `;
            
            // Also clean up parent elements
            if (img.parentElement) {
                img.parentElement.style.background = 'none';
                img.parentElement.style.backgroundImage = 'none';
                img.parentElement.style.position = 'relative';
            }
            
            console.log('- Manual styles applied!');
        });
        
        // Check view positioning
        const bookView = document.querySelector('#kn-scene_481 #view_1277');
        if (bookView) {
            console.log('\nBook view found, applying positioning...');
            bookView.style.marginTop = '-40px';
            bookView.style.position = 'relative';
            bookView.style.zIndex = '10';
        }
        
        console.log('\n=== Debug complete. Check if styles are now visible ===');
    };
    
    console.log('[Scene 481 Fix v6] Debug function available: window.debugScene481Styles()');
    
    // Add function to find the culprit element creating the border
    window.findBorderCulprit = function() {
        console.log('=== Finding Border Culprit ===');
        
        // Get all elements in the scene
        const allElements = document.querySelectorAll('#kn-scene_481 *');
        const suspiciousElements = [];
        
        allElements.forEach(el => {
            const style = window.getComputedStyle(el);
            const beforeStyle = window.getComputedStyle(el, '::before');
            const afterStyle = window.getComputedStyle(el, '::after');
            
            // Check for gradient backgrounds or borders
            if (style.backgroundImage && style.backgroundImage !== 'none' && style.backgroundImage.includes('gradient')) {
                suspiciousElements.push({
                    element: el,
                    reason: 'Has gradient background',
                    style: style.backgroundImage
                });
            }
            
            if (beforeStyle.content && beforeStyle.content !== 'none') {
                suspiciousElements.push({
                    element: el,
                    reason: 'Has ::before pseudo-element',
                    content: beforeStyle.content
                });
            }
            
            if (afterStyle.content && afterStyle.content !== 'none') {
                suspiciousElements.push({
                    element: el,
                    reason: 'Has ::after pseudo-element',
                    content: afterStyle.content
                });
            }
        });
        
        console.log('Found suspicious elements:', suspiciousElements);
        
        // Highlight suspicious elements
        suspiciousElements.forEach(item => {
            item.element.style.outline = '3px dashed red';
            console.log('Element:', item.element, 'Reason:', item.reason);
        });
        
        console.log('\nTo remove highlights, refresh the page');
    };
    
    console.log('[Scene 481 Fix v6] Border detective available: window.findBorderCulprit()');
    
    // Add function to find what's causing horizontal scroll
    window.findScrollCulprit = function() {
        console.log('=== Finding Horizontal Scroll Culprit ===');
        
        const docWidth = document.documentElement.scrollWidth;
        const viewWidth = document.documentElement.clientWidth;
        
        console.log(`Document width: ${docWidth}px`);
        console.log(`Viewport width: ${viewWidth}px`);
        console.log(`Overflow: ${docWidth - viewWidth}px`);
        
        const allElements = document.querySelectorAll('*');
        const overflowingElements = [];
        
        allElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.right > viewWidth || rect.left < 0) {
                overflowingElements.push({
                    element: el,
                    rect: rect,
                    overflow: rect.right - viewWidth,
                    className: el.className,
                    id: el.id
                });
            }
        });
        
        console.log('\nElements causing horizontal overflow:');
        overflowingElements.forEach(item => {
            console.log(`- ${item.element.tagName}${item.id ? '#' + item.id : ''} (${item.className})`);
            console.log(`  Right edge: ${item.rect.right}px, Overflow: ${item.overflow}px`);
            item.element.style.outline = '3px solid red';
        });
        
        // Also check computed styles on body and html
        console.log('\nBody/HTML styles:');
        console.log('HTML overflow-x:', getComputedStyle(document.documentElement).overflowX);
        console.log('Body overflow-x:', getComputedStyle(document.body).overflowX);
        
        console.log('\nTo remove highlights, refresh the page');
    };
    
    console.log('[Scene 481 Fix v6] Scroll detective available: window.findScrollCulprit()');
})(); 

