(function() {
    console.log('[Dashboard Dispatcher v1d] Starting execution...');
    
    // --- Configuration ---
    const KNACK_API_CONFIG = {
        appId: '5ee90912c38ae7001510c1a9',
        apiKey: '8f733aa5-dd35-4464-8348-64824d1f5f0d',
    };

    const SCRIPT_URLS = {
        coaching: 'https://cdn.jsdelivr.net/gh/4Sighteducation/FlashcardLoader@main/integrations/landingPage/staffHomepage5e.js',
        resource: 'https://cdn.jsdelivr.net/gh/4Sighteducation/vespa-dashboard@main/integrations/landingPage/ResourceDashboard.js',
    };

    const FIELD_IDS = {
        userAccountType: 'field_441', // Account type field on the user record
    };

    const OBJECT_KEYS = {
        users: 'object_3', // Users object
    };

    // --- Helper Functions ---
    function log(message, ...args) {
        console.log(`[Dashboard Dispatcher] ${message}`, ...args);
    }

    function errorLog(message, ...args) {
        console.error(`[Dashboard Dispatcher] ${message}`, ...args);
    }

    function loadScript(url) {
        log(`Loading script: ${url}`);
        $.getScript(url)
            .done(() => {
                log(`Successfully loaded script: ${url}`);
                
                // After loading, check if we need to call an initializer
                if (url === SCRIPT_URLS.resource && typeof window.initializeResourceDashboard === 'function') {
                    log('Calling initializeResourceDashboard');
                    window.initializeResourceDashboard();
                } else if (url === SCRIPT_URLS.coaching && typeof window.initializeStaffHomepage === 'function') {
                    log('Calling initializeStaffHomepage');
                    window.initializeStaffHomepage();
                } else {
                    log('No initializer function found for loaded script');
                }
            })
            .fail((jqxhr, settings, exception) => errorLog(`Failed to load script: ${url}`, exception));
    }

    async function makeKnackRequest(endpoint, method = 'GET', data = null) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: `https://api.knack.com/v1/${endpoint}`,
                type: method,
                headers: {
                    'X-Knack-Application-Id': KNACK_API_CONFIG.appId,
                    'X-Knack-REST-API-Key': KNACK_API_CONFIG.apiKey,
                    'Authorization': Knack.getUserToken(),
                    'Content-Type': 'application/json',
                },
                data: data ? JSON.stringify(data) : null,
                success: resolve,
                error: (err) => {
                    errorLog(`API request failed for endpoint: ${endpoint}`, err);
                    reject(err);
                },
            });
        });
    }

    async function getAccountType() {
        const user = Knack.getUserAttributes();
        if (!user || !user.id) {
            errorLog('Could not find logged-in user.');
            return null;
        }

        try {
            // Fetch the user record to get the account type field
            const userRecord = await makeKnackRequest(`objects/${OBJECT_KEYS.users}/records/${user.id}`);
            
            // Get the account type from field_441
            const accountTypeValue = userRecord[FIELD_IDS.userAccountType];
            log('User account type field value:', accountTypeValue);
            
            // Check if the field contains "RESOURCES"
            const isResourcesAccount = accountTypeValue && 
                                     accountTypeValue.toString().toUpperCase().includes('RESOURCES');
            
            log('Is Resources Account:', isResourcesAccount);
            return isResourcesAccount ? 'RESOURCES' : 'COACHING';

        } catch (err) {
            errorLog('An error occurred while fetching the account type.', err);
            return null;
        }
    }

    // --- Main Execution ---
    async function main() {
        log('Starting dashboard dispatch...');
        
        // Check if required dependencies are available
        if (typeof $ === 'undefined' || typeof Knack === 'undefined') {
            errorLog('Required dependencies (jQuery or Knack) not available');
            return;
        }
        
        // Log the config if available
        if (window.STAFFHOMEPAGE_CONFIG) {
            log('STAFFHOMEPAGE_CONFIG available:', window.STAFFHOMEPAGE_CONFIG);
        }
        
        const accountType = await getAccountType();

        // Load appropriate dashboard based on account type
        if (accountType === 'RESOURCES') {
            log('User has RESOURCES account type, loading resource dashboard');
            loadScript(SCRIPT_URLS.resource);
        } else {
            log('Loading coaching dashboard (default or non-RESOURCES account)');
            loadScript(SCRIPT_URLS.coaching);
        }
    }

    // Execute immediately - no delay needed
    log('Dispatcher loaded, executing main function...');
    main();

})(); 

