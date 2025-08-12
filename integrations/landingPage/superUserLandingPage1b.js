// Super User Landing Page - v1.0
// Simple landing page with 4 app buttons for super users
(function() {
    const DEBUG_MODE = false;
    
    function log(message, data) {
        if (DEBUG_MODE) {
            console.log(`[Super User Landing] ${message}`, data || '');
        }
    }
    
    function initializeSuperUserLanding() {
        log('Initializing Super User Landing Page');
        
        // Wait for the scene to be ready
        const checkSceneReady = () => {
            const sceneElement = document.querySelector('#kn-scene_1268');
            if (sceneElement) {
                log('Scene ready, rendering super user page');
                renderSuperUserPage();
            } else {
                log('Scene not ready, retrying...');
                setTimeout(checkSceneReady, 100);
            }
        };
        
        checkSceneReady();
    }
    
    function renderSuperUserPage() {
        const sceneElement = document.querySelector('#kn-scene_1268');
        if (!sceneElement) {
            log('Scene element not found');
            return;
        }
        
        // Clear existing content
        sceneElement.innerHTML = '';
        
        // Create the super user page HTML
        const pageHTML = `
            <div class="super-user-container">
                <div class="super-user-header">
                    <h1><i class="fa fa-shield"></i> Super User Dashboard</h1>
                    <p>Access administrative tools and management functions</p>
                </div>
                
                <div class="super-user-apps">
                    <div class="app-button-grid">
                        <a href="https://vespaacademy.knack.com/vespa-academy#upload-manager" class="app-button upload-manager">
                            <div class="app-icon">
                                <i class="fa fa-upload"></i>
                            </div>
                            <div class="app-content">
                                <h3>Upload Manager</h3>
                                <p>Manage file uploads and data imports</p>
                            </div>
                        </a>
                        
                        <a href="https://vespaacademy.knack.com/vespa-academy#dashboard" class="app-button result-dashboard">
                            <div class="app-icon">
                                <i class="fa fa-tachometer"></i>
                            </div>
                            <div class="app-content">
                                <h3>Result Dashboard</h3>
                                <p>View analytics and performance metrics</p>
                            </div>
                        </a>
                        
                        <a href="https://vespaacademy.knack.com/vespa-academy#vespa-customers/" class="app-button crm">
                            <div class="app-icon">
                                <i class="fa fa-users"></i>
                            </div>
                            <div class="app-content">
                                <h3>CRM</h3>
                                <p>Manage customer relationships and data</p>
                            </div>
                        </a>
                        
                        <a href="https://vespaacademy.knack.com/vespa-academy#report-printing" class="app-button report-printing">
                            <div class="app-icon">
                                <i class="fa fa-print"></i>
                            </div>
                            <div class="app-content">
                                <h3>Report Printing</h3>
                                <p>Generate and print reports</p>
                            </div>
                        </a>
                    </div>
                </div>
            </div>
        `;
        
        // Inject the HTML
        sceneElement.innerHTML = pageHTML;
        
        // Add custom styles
        addCustomStyles();
        
        log('Super user page rendered successfully');
    }
    
    function addCustomStyles() {
        // Check if styles already exist
        if (document.getElementById('super-user-styles')) {
            return;
        }
        
        const styles = `
            <style id="super-user-styles">
                .super-user-container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 40px 20px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                
                .super-user-header {
                    text-align: center;
                    margin-bottom: 50px;
                }
                
                .super-user-header h1 {
                    color: #2a3c7a;
                    font-size: 2.5rem;
                    font-weight: 700;
                    margin-bottom: 15px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 15px;
                }
                
                .super-user-header h1 i {
                    color: #079baa;
                    font-size: 2.2rem;
                }
                
                .super-user-header p {
                    color: #5899a8;
                    font-size: 1.2rem;
                    font-weight: 400;
                    margin: 0;
                }
                
                .app-button-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 30px;
                    margin-top: 40px;
                }
                
                .app-button {
                    background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
                    border: 2px solid #e0e0e0;
                    border-radius: 16px;
                    padding: 30px 25px;
                    text-decoration: none;
                    color: inherit;
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                    position: relative;
                    overflow: hidden;
                }
                
                .app-button:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
                    text-decoration: none;
                    color: inherit;
                }
                
                .app-button.upload-manager:hover {
                    border-color: #079baa;
                    background: linear-gradient(135deg, #ffffff 0%, #f0fdfe 100%);
                }
                
                .app-button.result-dashboard:hover {
                    border-color: #2f8dcb;
                    background: linear-gradient(135deg, #ffffff 0%, #f0f7ff 100%);
                }
                
                .app-button.crm:hover {
                    border-color: #5899a8;
                    background: linear-gradient(135deg, #ffffff 0%, #f5f9fa 100%);
                }
                
                .app-button.report-printing:hover {
                    border-color: #00e5db;
                    background: linear-gradient(135deg, #ffffff 0%, #f0fffe 100%);
                }
                
                .app-icon {
                    flex-shrink: 0;
                    width: 60px;
                    height: 60px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                    color: white;
                }
                
                .upload-manager .app-icon {
                    background: linear-gradient(135deg, #079baa 0%, #62d1d2 100%);
                }
                
                .result-dashboard .app-icon {
                    background: linear-gradient(135deg, #2f8dcb 0%, #7bd8d0 100%);
                }
                
                .crm .app-icon {
                    background: linear-gradient(135deg, #5899a8 0%, #00e5db 100%);
                }
                
                .report-printing .app-icon {
                    background: linear-gradient(135deg, #00e5db 0%, #62d1d2 100%);
                }
                
                .app-content h3 {
                    color: #2a3c7a;
                    font-size: 1.4rem;
                    font-weight: 600;
                    margin: 0 0 8px 0;
                    line-height: 1.3;
                }
                
                .app-content p {
                    color: #5899a8;
                    font-size: 0.95rem;
                    margin: 0;
                    line-height: 1.4;
                }
                
                /* Responsive design */
                @media (max-width: 768px) {
                    .super-user-container {
                        padding: 30px 15px;
                    }
                    
                    .super-user-header h1 {
                        font-size: 2rem;
                        flex-direction: column;
                        gap: 10px;
                    }
                    
                    .super-user-header p {
                        font-size: 1.1rem;
                    }
                    
                    .app-button-grid {
                        grid-template-columns: 1fr;
                        gap: 20px;
                    }
                    
                    .app-button {
                        padding: 25px 20px;
                        gap: 15px;
                    }
                    
                    .app-icon {
                        width: 50px;
                        height: 50px;
                        font-size: 20px;
                    }
                    
                    .app-content h3 {
                        font-size: 1.2rem;
                    }
                    
                    .app-content p {
                        font-size: 0.9rem;
                    }
                }
                
                /* Ensure proper spacing from header */
                body.has-general-header .super-user-container {
                    padding-top: 60px;
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', styles);
    }
    
    // Export the initializer
    window.initializeSuperUserLanding = initializeSuperUserLanding;
    
    log('Super User Landing Page script loaded');
})();
