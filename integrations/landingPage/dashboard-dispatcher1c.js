(function() {
    // --- Configuration ---
    const KNACK_API_CONFIG = {
        appId: '5ee90912c38ae7001510c1a9',
        apiKey: '8f733aa5-dd35-4464-8348-64824d1f5f0d',
    };

    const SCRIPT_URLS = {
        coaching: 'https://cdn.jsdelivr.net/gh/4Sighteducation/FlashcardLoader@main/integrations/landingPage/staffHomepage5d.js',
        resource: 'https://cdn.jsdelivr.net/gh/4Sighteducation/vespa-dashboard@main/integrations/landingPage/ResourceDashboard.js',
    };

    const FIELD_IDS = {
        staffLoginEmail: 'field_91',
        staffToCustomerConnection: 'field_122',
        customerAccountType: 'field_63',
    };

    const OBJECT_KEYS = {
        staff: 'object_3',
        customers: 'object_2',
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
            .done(() => log(`Successfully loaded script: ${url}`))
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
        if (!user || !user.email) {
            errorLog('Could not find logged-in user email.');
            return null;
        }

        try {
            // 1. Find the staff record using the user's email.
            const staffFilters = encodeURIComponent(JSON.stringify({
                match: 'and',
                rules: [{
                    field: FIELD_IDS.staffLoginEmail,
                    operator: 'is',
                    value: user.email
                }]
            }));
            const staffResponse = await makeKnackRequest(`objects/${OBJECT_KEYS.staff}/records?filters=${staffFilters}`);
            const staffRecord = staffResponse.records[0];

            if (!staffRecord) {
                errorLog('Staff record not found for email:', user.email);
                return null;
            }

            // 2. Get the connected VESPA Customer ID.
            const customerConnection = staffRecord[`${FIELD_IDS.staffToCustomerConnection}_raw`];
            const customerId = customerConnection && customerConnection.length > 0 ? customerConnection[0].id : null;

            if (!customerId) {
                errorLog('VESPA Customer connection not found on staff record.');
                return null;
            }

            // 3. Fetch the VESPA Customer record.
            const customerRecord = await makeKnackRequest(`objects/${OBJECT_KEYS.customers}/records/${customerId}`);
            
            // 4. Return the Account Type.
            const accountType = customerRecord[FIELD_IDS.customerAccountType];
            log('Successfully determined Account Type:', accountType);
            return accountType;

        } catch (err) {
            errorLog('An error occurred while fetching the account type.', err);
            return null;
        }
    }

    // --- Main Execution ---
    async function main() {
        log('Starting dashboard dispatch...');
        const accountType = await getAccountType();

        // Default to the coaching dashboard if the type is not 'RESOURCE PORTAL' or an error occurs.
        if (accountType && accountType.toUpperCase() === 'RESOURCE PORTAL') {
            loadScript(SCRIPT_URLS.resource);
        } else {
            loadScript(SCRIPT_URLS.coaching);
        }
    }

    // Delay execution slightly to ensure Knack environment is fully loaded.
    $(function() {
        setTimeout(main, 500);
    });

})(); 
