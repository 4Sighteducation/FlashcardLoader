/**
 * Scene 43 Student Report Mobile Optimization
 * Optimizes the VESPA report display for mobile devices only
 * Version 3.0 - Minimal approach: hide unnecessary elements, bigger text areas, hide rich text toolbar
 */

(function() {
    'use strict';
    
    console.log('[Student Report Mobile Fix v3.0] Script loaded');
    
    let stylesApplied = false;
    
    function fixStudentReportMobile() {
        // Check if we're on the student report page
        const currentScene = window.location.hash;
        if (!currentScene.includes('scene_43') && !currentScene.includes('my-report') && !currentScene.includes('vespa-results')) {
            console.log('[Student Report Mobile Fix] Not on student report page, skipping');
            return;
        }
        
        // Check if the report container exists
        const reportContainer = document.querySelector('#view_3041 #report-container');
        if (!reportContainer) {
            console.log('[Student Report Mobile Fix] Report container not found, waiting...');
            return;
        }
        
        console.log('[Student Report Mobile Fix] Report container found! Applying mobile optimizations');
        
        // Apply CSS fixes (only once)
        if (!stylesApplied) {
            applyMobileStyles();
        }
        
        // Enable pinch-to-zoom
        enableZoom();
    }
    
    function enableZoom() {
        // Remove or update viewport meta to allow zooming
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.content = 'width=device-width, initial-scale=1.0';
            console.log('[Student Report Mobile Fix] Zoom enabled');
        }
    }
    
    function applyMobileStyles() {
        const styleId = 'student-report-mobile-fixes-v3';
        
        // Remove any existing style to force refresh
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) {
            existingStyle.remove();
        }
        
        const style = document.createElement('style');
        style.id = styleId;
        
        // Minimal mobile-optimized styles
        style.textContent = `
            /* Mobile-only styles for Student Report - Minimal v3.0 */
            @media (max-width: 768px) {
                /* Hide chart, introductory questions, and logo */
                #view_3041 #chart-container,
                #view_3041 #bottom-report-header-container,
                #view_3041 #introductory-questions-container,
                #view_3041 .image-logo,
                #view_3041 img[alt="Logo"],
                #view_3041 img[src*="logo"] {
                    display: none !important;
                }
                
                /* Make text areas much bigger */
                #view_3041 textarea,
                #view_3041 .ql-editor,
                #view_3041 .ql-container,
                #view_3041 [contenteditable="true"] {
                    min-height: 150px !important;
                    height: auto !important;
                    font-size: 16px !important; /* Prevent iOS zoom on focus */
                }
                
                /* Rich text editor specific adjustments */
                #view_3041 .ql-container {
                    min-height: 200px !important;
                }
                
                #view_3041 .ql-editor {
                    min-height: 180px !important;
                    padding: 12px !important;
                }
                
                /* Hide the rich text toolbar to maximize writing space */
                #view_3041 .ql-toolbar,
                #view_3041 .ql-snow .ql-toolbar {
                    display: none !important;
                }
                
                /* Adjust container to compensate for hidden toolbar */
                #view_3041 .ql-container.ql-snow {
                    border-top: 1px solid #ccc !important;
                    border-radius: 4px !important;
                }
                
                /* Make all text inputs bigger */
                #view_3041 input[type="text"],
                #view_3041 input[type="email"],
                #view_3041 input[type="number"] {
                    height: 44px !important;
                    font-size: 16px !important;
                    padding: 10px !important;
                }
                
                /* Touch-friendly buttons */
                #view_3041 button,
                #view_3041 .p-button,
                #view_3041 input[type="submit"],
                #view_3041 input[type="button"] {
                    min-height: 44px !important;
                    padding: 12px 20px !important;
                }
                
                /* Hide print button on very small screens */
                @media (max-width: 480px) {
                    #view_3041 #print-button {
                        display: none !important;
                    }
                }
                
                /* Ensure proper scrolling */
                body {
                    overflow-x: hidden !important;
                    -webkit-overflow-scrolling: touch !important;
                }
            }
        `;
        
        document.head.appendChild(style);
        stylesApplied = true;
        
        console.log('[Student Report Mobile Fix] Mobile styles applied successfully!');
    }
    
    // Initialize with a delay to ensure Vue app is loaded
    setTimeout(() => {
        console.log('[Student Report Mobile Fix] Initial check...');
        fixStudentReportMobile();
    }, 1000);
    
    // Re-apply on scene render
    $(document).on('knack-scene-render.scene_43', function() {
        console.log('[Student Report Mobile Fix] Scene 43 rendered');
        setTimeout(() => {
            fixStudentReportMobile();
        }, 500);
    });
    
    // Re-apply on view render
    $(document).on('knack-view-render.view_3041', function() {
        console.log('[Student Report Mobile Fix] View 3041 rendered');
        setTimeout(() => {
            fixStudentReportMobile();
        }, 500);
    });
    
    // Also watch for any view render in scene_43 or vespa-results
    $(document).on('knack-view-render.any', function(event, view) {
        if (window.location.hash.includes('scene_43') || window.location.hash.includes('my-report') || window.location.hash.includes('vespa-results')) {
            console.log(`[Student Report Mobile Fix] View ${view.key} rendered on report page`);
            setTimeout(() => {
                fixStudentReportMobile();
            }, 300);
        }
    });
    
    // Check on hash change
    window.addEventListener('hashchange', function() {
        console.log('[Student Report Mobile Fix] Hash changed, checking...');
        setTimeout(() => {
            fixStudentReportMobile();
        }, 500);
    });
    
    console.log('[Student Report Mobile Fix v3.0] Initialization complete');
})();
