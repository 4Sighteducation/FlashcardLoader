/**
 * Scene 43 Student Report Mobile Optimization
 * Optimizes the VESPA report display for mobile devices only
 * Version 1.0
 */

(function() {
    'use strict';
    
    console.log('[Student Report Mobile Fix v1.0] Script loaded');
    
    let stylesApplied = false;
    
    function fixStudentReportMobile() {
        // Check if we're on scene_43
        const currentScene = window.location.hash;
        if (!currentScene.includes('scene_43')) {
            return;
        }
        
        // Check if the report container exists
        const reportContainer = document.querySelector('#view_3041 #report-container');
        if (!reportContainer) {
            console.log('[Student Report Mobile Fix] Report container not found, waiting...');
            return;
        }
        
        console.log('[Student Report Mobile Fix] Applying mobile optimizations');
        
        // Apply CSS fixes (only once)
        if (!stylesApplied) {
            applyMobileStyles();
        }
        
        // Apply DOM fixes if needed
        setTimeout(() => {
            applyDOMFixes();
        }, 300);
    }
    
    function applyMobileStyles() {
        const styleId = 'student-report-mobile-fixes-v1';
        
        // Remove any existing style to force refresh
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) {
            existingStyle.remove();
        }
        
        const style = document.createElement('style');
        style.id = styleId;
        
        // Only apply styles on mobile devices
        style.textContent = `
            /* Mobile-only styles for Student Report */
            @media (max-width: 768px) {
                /* Overall container adjustments */
                #view_3041 #report-container {
                    padding: 10px !important;
                    overflow-x: hidden !important;
                }
                
                /* Header optimizations */
                #report-header-container {
                    padding: 15px !important;
                }
                
                #header-title {
                    flex-direction: column !important;
                    align-items: center !important;
                    gap: 10px !important;
                }
                
                #title-text {
                    font-size: 20px !important;
                    text-align: center !important;
                    margin: 10px 0 !important;
                }
                
                /* Student info section - stack vertically */
                #student-info {
                    flex-direction: column !important;
                    align-items: flex-start !important;
                    gap: 10px !important;
                    width: 100% !important;
                }
                
                .info-container {
                    width: 100% !important;
                    margin: 5px 0 !important;
                }
                
                /* Cycle buttons - make more touch-friendly */
                #cycle-buttons {
                    display: flex !important;
                    align-items: center !important;
                    gap: 10px !important;
                    flex-wrap: wrap !important;
                }
                
                #cycle-buttons .p-button {
                    min-width: 40px !important;
                    min-height: 40px !important;
                    font-size: 16px !important;
                }
                
                /* View Answers button - full width on mobile */
                #answers-button .p-button {
                    width: 100% !important;
                    margin-top: 10px !important;
                    padding: 12px 20px !important;
                    font-size: 14px !important;
                }
                
                /* Chart container - responsive sizing */
                #chart-container {
                    width: 100% !important;
                    height: auto !important;
                    margin: 15px 0 !important;
                }
                
                #chart-container canvas {
                    width: 100% !important;
                    height: auto !important;
                    max-width: 100% !important;
                }
                
                /* Bottom header container - stack vertically */
                #bottom-report-header-container {
                    flex-direction: column !important;
                    gap: 20px !important;
                }
                
                /* Introductory questions - better readability */
                #introductory-questions-container {
                    padding: 15px !important;
                    font-size: 14px !important;
                }
                
                #introductory-questions-container ul {
                    padding-left: 20px !important;
                }
                
                #introductory-questions-container li {
                    margin-bottom: 10px !important;
                    line-height: 1.5 !important;
                }
                
                /* VESPA Report sections - mobile optimization */
                .vespa-report {
                    display: flex !important;
                    flex-direction: column !important;
                    margin-bottom: 20px !important;
                    border-radius: 8px !important;
                    overflow: hidden !important;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
                }
                
                .vespa-report-score {
                    display: flex !important;
                    flex-direction: row !important;
                    justify-content: space-between !important;
                    align-items: center !important;
                    padding: 15px !important;
                    min-height: auto !important;
                }
                
                .vespa-report-score p:first-child {
                    font-size: 18px !important;
                    font-weight: bold !important;
                    margin: 0 !important;
                }
                
                .vespa-report-score p:nth-child(2) {
                    display: none !important; /* Hide "Score" label on mobile */
                }
                
                .vespa-report-score p:last-child {
                    font-size: 24px !important;
                    font-weight: bold !important;
                    margin: 0 !important;
                }
                
                .vespa-report-comments,
                .vespa-report-coaching-questions {
                    padding: 15px !important;
                    font-size: 14px !important;
                    line-height: 1.6 !important;
                }
                
                .vespa-report-coaching-questions ol {
                    padding-left: 20px !important;
                    margin: 10px 0 !important;
                }
                
                .vespa-report-coaching-questions li {
                    margin-bottom: 10px !important;
                }
                
                /* Suggested activities links */
                .vespa-report-coaching-questions a {
                    display: inline-block !important;
                    margin: 5px 5px 5px 0 !important;
                    padding: 8px 12px !important;
                    background-color: #f0f0f0 !important;
                    border-radius: 20px !important;
                    text-decoration: none !important;
                    font-size: 13px !important;
                    color: #333 !important;
                    transition: background-color 0.3s ease !important;
                }
                
                .vespa-report-coaching-questions a:hover {
                    background-color: #e0e0e0 !important;
                }
                
                /* Comments section optimization */
                #report-comment-container {
                    padding: 15px !important;
                    margin-top: 20px !important;
                }
                
                .comment-section {
                    margin-bottom: 20px !important;
                    padding: 15px !important;
                    background-color: #f9f9f9 !important;
                    border-radius: 8px !important;
                }
                
                .comment-title-container {
                    margin-bottom: 10px !important;
                }
                
                .comment-title {
                    font-size: 16px !important;
                    font-weight: bold !important;
                }
                
                /* Buttons - make more touch-friendly */
                .p-button {
                    min-height: 44px !important; /* iOS touch target size */
                    font-size: 14px !important;
                    padding: 10px 20px !important;
                }
                
                /* Print button - position fixed at top for easy access */
                #print-button {
                    position: fixed !important;
                    top: 10px !important;
                    right: 10px !important;
                    z-index: 1000 !important;
                    background-color: #fff !important;
                    color: #333 !important;
                    border: 1px solid #ddd !important;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1) !important;
                }
                
                /* Info icons - make larger and more touchable */
                .info-icon {
                    font-size: 20px !important;
                    padding: 5px !important;
                    cursor: pointer !important;
                }
                
                /* Title sections */
                #vespa-report-title {
                    flex-direction: column !important;
                    gap: 10px !important;
                    margin-bottom: 20px !important;
                }
                
                .icon-container {
                    display: flex !important;
                    align-items: center !important;
                    justify-content: space-between !important;
                    width: 100% !important;
                    padding: 10px !important;
                    background-color: #f0f0f0 !important;
                    border-radius: 8px !important;
                }
                
                /* Ensure text doesn't overflow */
                #view_3041 p, #view_3041 li {
                    word-wrap: break-word !important;
                    overflow-wrap: break-word !important;
                }
                
                /* Hide logos on very small screens to save space */
                @media (max-width: 480px) {
                    .image-logo {
                        display: none !important;
                    }
                    
                    #title-text {
                        font-size: 18px !important;
                    }
                    
                    .vespa-report-score p:first-child {
                        font-size: 16px !important;
                    }
                    
                    .vespa-report-score p:last-child {
                        font-size: 20px !important;
                    }
                }
                
                /* Ensure proper spacing at the bottom */
                #view_3041 {
                    padding-bottom: 60px !important;
                }
            }
            
            /* Print styles - ensure report prints well */
            @media print {
                #print-button {
                    display: none !important;
                }
                
                #view_3041 #report-container {
                    padding: 0 !important;
                }
                
                .vespa-report {
                    page-break-inside: avoid !important;
                }
            }
        `;
        
        document.head.appendChild(style);
        stylesApplied = true;
        
        console.log('[Student Report Mobile Fix] Mobile styles applied successfully!');
    }
    
    function applyDOMFixes() {
        // Add viewport meta tag if not present (important for mobile)
        if (!document.querySelector('meta[name="viewport"]')) {
            const viewport = document.createElement('meta');
            viewport.name = 'viewport';
            viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
            document.head.appendChild(viewport);
        }
        
        // Make chart responsive
        const canvas = document.querySelector('#chart-container canvas');
        if (canvas) {
            canvas.style.maxWidth = '100%';
            canvas.style.height = 'auto';
        }
        
        console.log('[Student Report Mobile Fix] DOM fixes applied');
    }
    
    // Initialize
    setTimeout(() => {
        fixStudentReportMobile();
    }, 500);
    
    // Re-apply on scene render
    $(document).on('knack-scene-render.scene_43', function() {
        console.log('[Student Report Mobile Fix] Scene 43 rendered');
        setTimeout(() => {
            fixStudentReportMobile();
        }, 300);
    });
    
    // Re-apply on view render
    $(document).on('knack-view-render.view_3041', function() {
        console.log('[Student Report Mobile Fix] View 3041 rendered');
        setTimeout(() => {
            fixStudentReportMobile();
        }, 300);
    });
    
    // Also watch for any view render in scene_43
    $(document).on('knack-view-render.any', function(event, view) {
        if (window.location.hash.includes('scene_43')) {
            console.log(`[Student Report Mobile Fix] View ${view.key} rendered in scene_43`);
            setTimeout(() => {
                fixStudentReportMobile();
            }, 200);
        }
    });
    
    console.log('[Student Report Mobile Fix v1.0] Initialization complete');
})();
