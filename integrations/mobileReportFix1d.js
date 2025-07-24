/**
 * Scene 43 Student Report Mobile Optimization
 * Optimizes the VESPA report display for mobile devices only
 * Version 2.1 - Simplified approach: bigger text areas, smaller fonts, zoom enabled, hide chart/intro
 */

(function() {
    'use strict';
    
    console.log('[Student Report Mobile Fix v2.0] Script loaded');
    
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
        const styleId = 'student-report-mobile-fixes-v2';
        
        // Remove any existing style to force refresh
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) {
            existingStyle.remove();
        }
        
        const style = document.createElement('style');
        style.id = styleId;
        
        // Mobile-optimized styles
        style.textContent = `
            /* Mobile-only styles for Student Report - Simplified v2.0 */
            @media (max-width: 768px) {
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
                    font-size: 14px !important;
                }
                
                /* Adjust overall text sizes - smaller but readable */
                #view_3041 {
                    font-size: 14px !important;
                }
                
                #view_3041 h1 {
                    font-size: 20px !important;
                }
                
                #view_3041 h2 {
                    font-size: 18px !important;
                }
                
                #view_3041 h3 {
                    font-size: 16px !important;
                }
                
                #view_3041 p,
                #view_3041 li {
                    font-size: 14px !important;
                    line-height: 1.5 !important;
                }
                
                /* Better spacing */
                #view_3041 #report-container {
                    padding: 10px !important;
                }
                
                /* VESPA score sections - improve spacing */
                #view_3041 .vespa-report {
                    margin-bottom: 20px !important;
                    padding: 15px !important;
                }
                
                #view_3041 .vespa-report-score {
                    margin-bottom: 15px !important;
                }
                
                /* Comment sections - better spacing */
                #view_3041 .comment-section {
                    margin-bottom: 20px !important;
                    padding: 15px !important;
                    background: #f5f5f5 !important;
                    border-radius: 8px !important;
                }
                
                /* Make "Add Comment" buttons more prominent */
                #view_3041 .add-new-comment button,
                #view_3041 .add-new-comment .p-button {
                    width: 100% !important;
                    background-color: #1a4d4d !important;
                    color: white !important;
                    font-weight: 500 !important;
                }
                
                /* Hide chart and introductory questions on mobile */
                #view_3041 #chart-container,
                #view_3041 #bottom-report-header-container,
                #view_3041 #introductory-questions-container {
                    display: none !important;
                }
                
                /* Hide print button on mobile */
                @media (max-width: 480px) {
                    #view_3041 #print-button {
                        display: none !important;
                    }
                }
                
                /* Fix any overflow issues */
                #view_3041 * {
                    max-width: 100% !important;
                    word-wrap: break-word !important;
                }
                
                /* Ensure proper scrolling */
                body {
                    overflow-x: hidden !important;
                    -webkit-overflow-scrolling: touch !important;
                }
                
                /* Rich text toolbar - make it wrap on mobile */
                #view_3041 .ql-toolbar {
                    flex-wrap: wrap !important;
                }
                
                /* Submit/Cancel button improvements */
                #view_3041 button[type="submit"],
                #view_3041 button:contains("Submit"),
                #view_3041 .p-button-primary {
                    background-color: #007bff !important;
                    border-color: #007bff !important;
                }
                
                #view_3041 button:contains("Cancel"),
                #view_3041 .p-button-secondary {
                    background-color: #6c757d !important;
                    border-color: #6c757d !important;
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
    
    console.log('[Student Report Mobile Fix v2.0] Initialization complete');
})();

