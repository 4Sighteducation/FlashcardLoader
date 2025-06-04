// dashboard1f.js
// @ts-nocheck

// Ensure this matches the initializerFunctionName in WorkingBridge.js
function initializeDashboardApp() {
    // Get the configuration set by WorkingBridge.js
    const config = window.DASHBOARD_CONFIG;
    if (!config) {
        console.error("DASHBOARD_CONFIG not found. Dashboard cannot initialize.");
        return;
    }

    console.log("Initializing Dashboard App with config:", config);
    
    // Get logged in user email from config or Knack directly
    let loggedInUserEmail = config.loggedInUserEmail;
    
    // If not in config, try to get from Knack
    if (!loggedInUserEmail && typeof Knack !== 'undefined' && Knack.getUserAttributes) {
        try {
            const userAttributes = Knack.getUserAttributes();
            loggedInUserEmail = userAttributes.email || userAttributes.values?.email;
            console.log("Got user email from Knack:", loggedInUserEmail);
        } catch (e) {
            console.error("Failed to get user email from Knack:", e);
        }
    }
    
    // If still no email, try alternative Knack method
    if (!loggedInUserEmail && typeof Knack !== 'undefined' && Knack.session && Knack.session.user) {
        try {
            loggedInUserEmail = Knack.session.user.email;
            console.log("Got user email from Knack session:", loggedInUserEmail);
        } catch (e) {
            console.error("Failed to get user email from Knack session:", e);
        }
    }
    
    const {
        knackAppId,
        knackApiKey,
        debugMode,
        sceneKey,
        viewKey,
        elementSelector,
        herokuAppUrl, // Your Heroku backend URL
        objectKeys,
        themeColors
    } = config;

    // Add Super User state variables
    let isSuperUser = false;
    let superUserRecordId = null;
    let selectedEstablishmentId = null;
    let selectedEstablishmentName = null;

    // --- Helper Functions (General) ---
    function log(message, data) {
        if (debugMode) {
            console.log(`[Dashboard App] ${message}`, data === undefined ? '' : data);
        }
    }

    function errorLog(message, error) {
        console.error(`[Dashboard App ERROR] ${message}`, error);
    }

    // --- Knack API Helper ---
    // You'll need functions to fetch data from Knack.
    // These will typically use your Heroku app as a proxy to securely call the Knack API.
    // Example:
    async function fetchDataFromKnack(objectKey, filters = [], options = {}) {
        let url = `${config.herokuAppUrl}/api/knack-data?objectKey=${objectKey}&filters=${encodeURIComponent(JSON.stringify(filters))}`;
        
        // Append options to URL if they exist
        if (options.rows_per_page) {
            url += `&rows_per_page=${options.rows_per_page}`;
        }
        if (options.sort_field) {
            url += `&sort_field=${options.sort_field}`;
        }
        if (options.sort_order) {
            url += `&sort_order=${options.sort_order}`;
        }

        log("Fetching from backend URL:", url); 
        try {
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `Knack API request via backend failed with status ${response.status}` }));
                throw new Error(errorData.message || `Knack API request via backend failed with status ${response.status}`);
            }
            const data = await response.json();
            return data.records; // The backend now wraps records in a 'records' key
        } catch (error) {
            errorLog(`Failed to fetch data for ${objectKey}`, error);
            throw error; // Re-throw to be handled by the caller
        }
    }

    // New function to check if user is a Super User (from object_21)
    async function checkSuperUserStatus(userEmail) {
        if (!userEmail) {
            errorLog("User email not provided to checkSuperUserStatus.");
            return null;
        }

        const filters = [{
            field: 'field_86', // Assuming email field in object_21 is also field_86
            operator: 'is',
            value: userEmail
        }];

        try {
            log(`Checking Super User status for email: ${userEmail}`);
            const superUserRecords = await fetchDataFromKnack(objectKeys.superUserRoles || 'object_21', filters);
            if (superUserRecords && superUserRecords.length > 0) {
                log("Found Super User record:", superUserRecords[0]);
                return superUserRecords[0].id;
            } else {
                log("No Super User record found for email:", userEmail);
                return null;
            }
        } catch (error) {
            errorLog(`Error checking Super User status for email ${userEmail}:`, error);
            return null;
        }
    }

    // New function to get all unique establishments
    async function getAllEstablishments() {
        try {
            log("Fetching establishments from dedicated endpoint");
            
            // Use the new establishments endpoint
            const url = `${config.herokuAppUrl}/api/establishments`;
            log("Fetching from establishments endpoint:", url);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch establishments: ${response.status}`);
            }
            
            const data = await response.json();
            log(`Fetched ${data.total} establishments from ${data.source_object}`);
            
            if (data.partial) {
                log("Note: Partial establishment list due to size limits");
            }
            
            return data.establishments || [];
            
        } catch (error) {
            errorLog("Failed to fetch establishments", error);
            
            // Fallback to the old method with better error handling
            try {
                log("Falling back to extracting establishments from VESPA results");
                const establishmentMap = new Map();
                
                // Just fetch first page to avoid timeout
                const vespaRecords = await fetchDataFromKnack(
                    objectKeys.vespaResults, 
                    [], 
                    { rows_per_page: 100 }
                );
                
                if (vespaRecords && vespaRecords.length > 0) {
                    vespaRecords.forEach(record => {
                        if (record.field_133_raw && record.field_133) {
                            if (Array.isArray(record.field_133_raw)) {
                                record.field_133_raw.forEach((id, index) => {
                                    if (id && !establishmentMap.has(id)) {
                                        const displayName = Array.isArray(record.field_133) ? 
                                            record.field_133[index] : record.field_133;
                                        establishmentMap.set(id, displayName || id);
                                    }
                                });
                            } else if (typeof record.field_133_raw === 'string' && record.field_133_raw.trim()) {
                                const id = record.field_133_raw.trim();
                                const name = record.field_133 || id;
                                if (!establishmentMap.has(id)) {
                                    establishmentMap.set(id, name);
                                }
                            }
                        }
                    });
                }
                
                const establishments = Array.from(establishmentMap.entries())
                    .map(([id, name]) => ({ id, name }))
                    .sort((a, b) => a.name.localeCompare(b.name));
                
                log(`Found ${establishments.length} establishments (limited sample)`);
                return establishments;
                
            } catch (fallbackError) {
                errorLog("Fallback method also failed", fallbackError);
                return [];
            }
        }
    }

    // New function to get Staff Admin Record ID (from object_5) by User Email
    async function getStaffAdminRecordIdByEmail(userEmail) {
        if (!userEmail) {
            errorLog("User email not provided to getStaffAdminRecordIdByEmail.");
            return null;
        }
        if (!objectKeys.staffAdminRoles) {
            errorLog("staffAdminRoles object key not configured in DASHBOARD_CONFIG.objectKeys");
            return null;
        }

        const filters = [{
            field: 'field_86', // Email field in object_5 (Staff Admin Roles object)
            operator: 'is',
            value: userEmail
        }];

        try {
            log(`Fetching Staff Admin record from ${objectKeys.staffAdminRoles} for email: ${userEmail}`);
            const staffAdminRecords = await fetchDataFromKnack(objectKeys.staffAdminRoles, filters);
            if (staffAdminRecords && staffAdminRecords.length > 0) {
                if (staffAdminRecords.length > 1) {
                    log("Warning: Multiple Staff Admin records found for email:", userEmail, "Using the first one.");
                }
                log("Found Staff Admin record:", staffAdminRecords[0]);
                return staffAdminRecords[0].id; // Return the Record ID of the object_5 record
            } else {
                errorLog(`No Staff Admin record found in ${objectKeys.staffAdminRoles} for email: ${userEmail}`);
                return null;
            }
        } catch (error) {
            errorLog(`Error fetching Staff Admin record for email ${userEmail}:`, error);
            return null;
        }
    }

    // --- UI Rendering ---
    function renderDashboardUI(container, showSuperUserControls = false) {
        log("Rendering Dashboard UI into:", container);
        
        // Add styles for the filters and super user controls
        const style = document.createElement('style');
        style.textContent = `
            /* Super User Controls */
            .super-user-controls {
                background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 215, 0, 0.05));
                border: 2px solid rgba(255, 215, 0, 0.3);
                border-radius: 12px;
                padding: 20px;
                margin: 20px auto;
                max-width: 1200px;
                box-shadow: 0 4px 20px rgba(255, 215, 0, 0.2);
                animation: slideDown 0.3s ease-out;
            }
            
            .super-user-header {
                display: flex;
                align-items: center;
                gap: 15px;
                margin-bottom: 15px;
            }
            
            .super-user-badge {
                background: linear-gradient(135deg, #ffd700, #ffed4e);
                color: #0f0f23;
                padding: 8px 16px;
                border-radius: 20px;
                font-weight: 700;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 1px;
                box-shadow: 0 2px 10px rgba(255, 215, 0, 0.4);
            }
            
            .super-user-title {
                color: #ffd700;
                font-size: 18px;
                font-weight: 600;
            }
            
            .super-user-form {
                display: flex;
                gap: 15px;
                align-items: center;
                flex-wrap: wrap;
            }
            
            .super-user-form label {
                color: #a8b2d1;
                font-weight: 600;
                font-size: 14px;
            }
            
            .super-user-form select,
            .super-user-form input {
                padding: 10px 15px;
                border: 2px solid rgba(255, 215, 0, 0.3);
                background: rgba(0, 0, 0, 0.5);
                color: #ffffff;
                border-radius: 8px;
                font-size: 14px;
                min-width: 250px;
                transition: all 0.3s ease;
            }
            
            .super-user-form select:focus,
            .super-user-form input:focus {
                outline: none;
                border-color: #ffd700;
                box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.2);
            }
            
            .super-user-form button {
                padding: 10px 24px;
                background: linear-gradient(135deg, #ffd700, #ffed4e);
                color: #0f0f23;
                border: none;
                border-radius: 8px;
                font-weight: 700;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.3s ease;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .super-user-form button:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
            }
            
            .current-viewing {
                margin-top: 15px;
                padding: 10px 15px;
                background: rgba(255, 215, 0, 0.1);
                border-radius: 8px;
                color: #ffd700;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .current-viewing strong {
                color: #ffffff;
            }
            
            .filters-container {
                display: flex;
                flex-wrap: wrap;
                gap: 15px;
                margin: 20px 0;
                padding: 20px;
                background-color: rgba(255, 255, 255, 0.05);
                border-radius: 8px;
                border: 1px solid rgba(255, 255, 255, 0.1);
            }
            
            .filter-item {
                display: flex;
                flex-direction: column;
                min-width: 150px;
                flex: 1;
            }
            
            .filter-item label {
                color: #a8b2d1;
                font-size: 12px;
                margin-bottom: 5px;
                font-weight: 600;
            }
            
            .filter-item input,
            .filter-item select {
                padding: 8px 12px;
                border: 1px solid rgba(255, 255, 255, 0.2);
                background-color: rgba(0, 0, 0, 0.3);
                color: #ffffff;
                border-radius: 4px;
                font-size: 14px;
            }
            
            .filter-item input:focus,
            .filter-item select:focus {
                outline: none;
                border-color: #86b4f0;
                background-color: rgba(0, 0, 0, 0.5);
            }
            
            .filter-item button {
                padding: 8px 16px;
                margin-right: 10px;
                border: none;
                border-radius: 4px;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            #apply-filters-btn {
                background-color: #86b4f0;
                color: #0f0f23;
                font-weight: 600;
            }
            
            #apply-filters-btn:hover {
                background-color: #6a9bd8;
            }
            
            #clear-filters-btn {
                background-color: rgba(255, 255, 255, 0.1);
                color: #a8b2d1;
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            #clear-filters-btn:hover {
                background-color: rgba(255, 255, 255, 0.2);
            }
            
            .filter-item:last-child {
                flex-direction: row;
                align-items: flex-end;
                min-width: auto;
            }
        `;
        document.head.appendChild(style);
        
        // Build the HTML with conditional Super User controls
        let superUserControlsHTML = '';
        if (showSuperUserControls) {
            superUserControlsHTML = `
                <div class="super-user-controls">
                    <div class="super-user-header">
                        <span class="super-user-badge">⚡ Super User Mode</span>
                        <span class="super-user-title">Establishment Emulator</span>
                    </div>
                    <div class="super-user-form">
                        <label for="establishment-select">Select Establishment:</label>
                        <select id="establishment-select">
                            <option value="">Loading establishments...</option>
                        </select>
                        <input type="text" id="establishment-search" placeholder="Search establishments..." />
                        <button id="load-establishment-btn">Load Dashboard</button>
                    </div>
                    <div id="current-establishment-viewing" class="current-viewing" style="display: none;">
                        <span>Currently viewing:</span> <strong id="current-establishment-name">-</strong>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = `
            <div id="dashboard-container">
                ${superUserControlsHTML}
                <header>
                    <h1>VESPA Performance Dashboard</h1>
                </header>
                <section id="overview-section" style="${showSuperUserControls ? 'display: none;' : ''}">
                    <h2>School Overview & Benchmarking</h2>
                    <div class="controls">
                        <label for="cycle-select">Select Cycle:</label>
                        <select id="cycle-select">
                            <option value="1">Cycle 1</option>
                            <option value="2">Cycle 2</option>
                            <option value="3">Cycle 3</option>
                        </select>
                        <div class="response-stats-card">
                            <div class="response-stats-content">
                                <div class="stat-item">
                                    <span class="stat-label">Responses</span>
                                    <span class="stat-value" id="cycle-responses">-</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Total Students</span>
                                    <span class="stat-value" id="total-students">-</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Completion Rate</span>
                                    <span class="stat-value" id="completion-rate">-</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div id="eri-speedometer-container">
                        <!-- ERI Speedometer will be rendered here -->
                    </div>
                    <div id="active-filters-display" style="display:none;">
                        <div class="active-filters-header">
                            <h3>Currently Viewing:</h3>
                            <div id="active-filters-list"></div>
                        </div>
                    </div>
                    <div class="filters-container">
                        <div class="filter-item">
                            <label for="student-search">Student:</label>
                            <input type="text" id="student-search" placeholder="Search by name..." />
                        </div>
                        <div class="filter-item">
                            <label for="group-filter">Group:</label>
                            <select id="group-filter">
                                <option value="">All Groups</option>
                            </select>
                        </div>
                        <div class="filter-item">
                            <label for="course-filter">Course:</label>
                            <select id="course-filter">
                                <option value="">All Courses</option>
                            </select>
                        </div>
                        <div class="filter-item">
                            <label for="year-group-filter">Year Group:</label>
                            <select id="year-group-filter">
                                <option value="">All Year Groups</option>
                            </select>
                        </div>
                        <div class="filter-item">
                            <label for="faculty-filter">Faculty:</label>
                            <select id="faculty-filter">
                                <option value="">All Faculties</option>
                            </select>
                        </div>
                        <div class="filter-item">
                            <button id="apply-filters-btn">Apply Filters</button>
                            <button id="clear-filters-btn">Clear Filters</button>
                        </div>
                    </div>
                   <div id="loading-indicator" style="display:none;">
                        <p>Loading chart data...</p>
                        <div class="spinner"></div>
                    </div>
                    <div class="dashboard-content-wrapper">
                        <div id="averages-summary-container" class="vespa-scores-grid">
                            <!-- Scorecards will be dynamically inserted here -->
                        </div>
                        <div id="distribution-charts-container">
                            <!-- Containers for Vision, Effort, Systems, Practice, Attitude, Overall -->
                            <div class="chart-wrapper">
                                <canvas id="vision-distribution-chart"></canvas>
                            </div>
                            <div class="chart-wrapper">
                                <canvas id="effort-distribution-chart"></canvas>
                            </div>
                            <div class="chart-wrapper">
                                <canvas id="systems-distribution-chart"></canvas>
                            </div>
                            <div class="chart-wrapper">
                                <canvas id="practice-distribution-chart"></canvas>
                            </div>
                            <div class="chart-wrapper">
                                <canvas id="attitude-distribution-chart"></canvas>
                            </div>
                            <div class="chart-wrapper">
                                <canvas id="overall-distribution-chart"></canvas>
                            </div>
                        </div>
                    </div>
                </section>
                <section id="qla-section" style="${showSuperUserControls ? 'display: none;' : ''}">
                    <h2>Question Level Analysis</h2>
                    <div id="qla-controls">
                        <select id="qla-question-dropdown"></select>
                        <input type="text" id="qla-chat-input" placeholder="Ask about the question data...">
                        <button id="qla-chat-submit">Ask AI</button>
                    </div>
                    <div id="qla-ai-response"></div>
                    <div id="qla-top-bottom-questions">
                        <h3>Top 5 Questions</h3>
                        <ul id="qla-top-5"></ul>
                        <h3>Bottom 5 Questions</h3>
                        <ul id="qla-bottom-5"></ul>
                    </div>
                    <div id="qla-stats">
                        <!-- Other interesting statistical info -->
                    </div>
                </section>
                <section id="student-insights-section" style="${showSuperUserControls ? 'display: none;' : ''}">
                    <h2>Student Comment Insights</h2>
                    <div id="word-cloud-container"></div>
                    <div id="common-themes-container"></div>
                </section>
            </div>
        `;
        
        // Add event listeners for UI elements
        document.getElementById('qla-chat-submit')?.addEventListener('click', handleQLAChatSubmit);
        
        // Add Super User specific event listeners
        if (showSuperUserControls) {
            const establishmentSelect = document.getElementById('establishment-select');
            const establishmentSearch = document.getElementById('establishment-search');
            const loadEstablishmentBtn = document.getElementById('load-establishment-btn');
            
            if (loadEstablishmentBtn) {
                loadEstablishmentBtn.addEventListener('click', handleEstablishmentLoad);
            }
            
            if (establishmentSearch) {
                establishmentSearch.addEventListener('input', (e) => {
                    const searchTerm = e.target.value.toLowerCase();
                    filterEstablishmentDropdown(searchTerm);
                });
            }
            
            // Load establishments
            loadEstablishmentsDropdown();
        }
    }
    
    // New function to handle establishment selection and loading
    async function handleEstablishmentLoad() {
        const establishmentSelect = document.getElementById('establishment-select');
        const selectedOption = establishmentSelect.selectedOptions[0];
        
        if (!establishmentSelect.value) {
            alert('Please select an establishment first.');
            return;
        }
        
        selectedEstablishmentId = establishmentSelect.value;
        selectedEstablishmentName = selectedOption.textContent;
        
        log(`Loading dashboard for establishment: ${selectedEstablishmentName} (${selectedEstablishmentId})`);
        
        // Update the current viewing display
        const currentViewingDiv = document.getElementById('current-establishment-viewing');
        const currentNameSpan = document.getElementById('current-establishment-name');
        if (currentViewingDiv) currentViewingDiv.style.display = 'flex';
        if (currentNameSpan) currentNameSpan.textContent = selectedEstablishmentName;
        
        // Show all sections
        document.getElementById('overview-section').style.display = 'block';
        document.getElementById('qla-section').style.display = 'block';
        document.getElementById('student-insights-section').style.display = 'block';
        
        // Load data with establishment filter
        await loadDashboardWithEstablishment(selectedEstablishmentId, selectedEstablishmentName);
    }
    
    // New function to load establishments dropdown
    async function loadEstablishmentsDropdown() {
        const establishmentSelect = document.getElementById('establishment-select');
        if (!establishmentSelect) return;
        
        establishmentSelect.innerHTML = '<option value="">Loading VESPA Customers...</option>';
        establishmentSelect.disabled = true; // Disable during loading
        
        try {
            const establishments = await getAllEstablishments();
            
            if (establishments.length === 0) {
                establishmentSelect.innerHTML = '<option value="">No active VESPA Customers found</option>';
                log("No establishments found");
                return;
            }
            
            establishmentSelect.innerHTML = '<option value="">Select a VESPA Customer...</option>';
            establishments.forEach(est => {
                const option = document.createElement('option');
                option.value = est.id;
                option.textContent = est.name;
                // Add data attribute for status if available
                if (est.status) {
                    option.setAttribute('data-status', est.status);
                }
                establishmentSelect.appendChild(option);
            });
            
            establishmentSelect.disabled = false; // Re-enable after loading
            log(`Loaded ${establishments.length} VESPA Customers in dropdown`);
            
        } catch (error) {
            errorLog("Failed to load establishments", error);
            establishmentSelect.innerHTML = '<option value="">Error loading VESPA Customers - Please refresh</option>';
            establishmentSelect.disabled = false;
        }
    }
    
    // New function to filter establishment dropdown
    function filterEstablishmentDropdown(searchTerm) {
        const establishmentSelect = document.getElementById('establishment-select');
        if (!establishmentSelect) return;
        
        const options = establishmentSelect.querySelectorAll('option');
        options.forEach(option => {
            if (option.value === '') return; // Keep the placeholder
            
            const text = option.textContent.toLowerCase();
            if (text.includes(searchTerm)) {
                option.style.display = '';
            } else {
                option.style.display = 'none';
            }
        });
    }
    
    // New function to load dashboard with establishment filter
    async function loadDashboardWithEstablishment(establishmentId, establishmentName) {
        log(`Loading dashboard data for VESPA Customer: ${establishmentName} (${establishmentId})`);
        
        // Note: establishmentId is now a VESPA Customer record ID from object_2
        // When filtering VESPA Results (object_10), field_133 contains the connected VESPA Customer
        
        // Populate filter dropdowns using establishment filter
        await populateFilterDropdowns(null, establishmentId);
        
        // Load initial data
        const cycleSelectElement = document.getElementById('cycle-select');
        const initialCycle = cycleSelectElement ? parseInt(cycleSelectElement.value, 10) : 1;
        
        // Load data with establishment filter (VESPA Customer ID)
        await loadOverviewData(null, initialCycle, [], establishmentId);
        await loadQLAData(null, establishmentId);
        await loadStudentCommentInsights(null, establishmentId);
        
        // Update event listeners to use establishment filter
        if (cycleSelectElement) {
            // Remove old listeners
            const newCycleSelect = cycleSelectElement.cloneNode(true);
            cycleSelectElement.parentNode.replaceChild(newCycleSelect, cycleSelectElement);
            
            newCycleSelect.addEventListener('change', (event) => {
                const selectedCycle = parseInt(event.target.value, 10);
                log(`Cycle changed to: ${selectedCycle}`);
                const activeFilters = getActiveFilters();
                loadOverviewData(null, selectedCycle, activeFilters, establishmentId);
            });
        }
        
        // Update filter buttons
        const applyFiltersBtn = document.getElementById('apply-filters-btn');
        if (applyFiltersBtn) {
            const newApplyBtn = applyFiltersBtn.cloneNode(true);
            applyFiltersBtn.parentNode.replaceChild(newApplyBtn, applyFiltersBtn);
            
            newApplyBtn.addEventListener('click', () => {
                const selectedCycle = document.getElementById('cycle-select') ? 
                    parseInt(document.getElementById('cycle-select').value, 10) : 1;
                const activeFilters = getActiveFilters();
                log("Applying filters:", activeFilters);
                loadOverviewData(null, selectedCycle, activeFilters, establishmentId);
            });
        }
        
        const clearFiltersBtn = document.getElementById('clear-filters-btn');
        if (clearFiltersBtn) {
            const newClearBtn = clearFiltersBtn.cloneNode(true);
            clearFiltersBtn.parentNode.replaceChild(newClearBtn, clearFiltersBtn);
            
            newClearBtn.addEventListener('click', () => {
                // Clear all filter inputs
                document.getElementById('student-search').value = '';
                document.getElementById('group-filter').value = '';
                document.getElementById('course-filter').value = '';
                document.getElementById('year-group-filter').value = '';
                document.getElementById('faculty-filter').value = '';
                
                // Clear the active filters display
                updateActiveFiltersDisplay([]);
                
                // Reload data without filters
                const selectedCycle = document.getElementById('cycle-select') ? 
                    parseInt(document.getElementById('cycle-select').value, 10) : 1;
                log("Clearing all filters");
                loadOverviewData(null, selectedCycle, [], establishmentId);
            });
        }
    }

    // --- Filter Management Functions ---
    function getActiveFilters() {
        const filters = [];
        const activeFilterDisplay = [];
        
        // Student search filter
        const studentSearch = document.getElementById('student-search')?.value.trim();
        if (studentSearch) {
            activeFilterDisplay.push({ type: 'Student', value: studentSearch, priority: true });
            // For name fields in Knack, we typically need to search both first and last name
            filters.push({
                match: 'or',
                rules: [
                    {
                        field: 'field_187', // Student name field
                        operator: 'contains',
                        value: studentSearch,
                        field_name: 'first' // Search in first name
                    },
                    {
                        field: 'field_187',
                        operator: 'contains', 
                        value: studentSearch,
                        field_name: 'last' // Search in last name
                    }
                ]
            });
        }
        
        // Group filter - could be text or connection field
        const groupFilter = document.getElementById('group-filter')?.value;
        const groupText = document.getElementById('group-filter')?.selectedOptions[0]?.textContent;
        if (groupFilter && groupText !== 'All Groups') {
            activeFilterDisplay.push({ type: 'Group', value: groupText });
            // Check if the value looks like an object ID (for connected fields)
            // Otherwise treat as text field
            const isObjectId = /^[a-f0-9]{24}$/i.test(groupFilter);
            filters.push({
                field: 'field_223',
                operator: isObjectId ? 'contains' : 'is',
                value: groupFilter
            });
        }
        
        // Course filter
        const courseFilter = document.getElementById('course-filter')?.value;
        const courseText = document.getElementById('course-filter')?.selectedOptions[0]?.textContent;
        if (courseFilter && courseText !== 'All Courses') {
            activeFilterDisplay.push({ type: 'Course', value: courseText });
            filters.push({
                field: 'field_2299',
                operator: 'is',
                value: courseFilter
            });
        }
        
        // Year Group filter
        const yearGroupFilter = document.getElementById('year-group-filter')?.value;
        const yearGroupText = document.getElementById('year-group-filter')?.selectedOptions[0]?.textContent;
        if (yearGroupFilter && yearGroupText !== 'All Year Groups') {
            activeFilterDisplay.push({ type: 'Year Group', value: yearGroupText });
            filters.push({
                field: 'field_144',
                operator: 'is',
                value: yearGroupFilter
            });
        }
        
        // Faculty filter
        const facultyFilter = document.getElementById('faculty-filter')?.value;
        const facultyText = document.getElementById('faculty-filter')?.selectedOptions[0]?.textContent;
        if (facultyFilter && facultyText !== 'All Faculties') {
            activeFilterDisplay.push({ type: 'Faculty', value: facultyText });
            filters.push({
                field: 'field_782',
                operator: 'is',
                value: facultyFilter
            });
        }
        
        // Update the active filters display
        updateActiveFiltersDisplay(activeFilterDisplay);
        
        return filters;
    }

    function updateActiveFiltersDisplay(activeFilters) {
        const displayContainer = document.getElementById('active-filters-display');
        const filtersList = document.getElementById('active-filters-list');
        
        if (!displayContainer || !filtersList) return;
        
        if (activeFilters.length === 0) {
            displayContainer.style.display = 'none';
            return;
        }
        
        displayContainer.style.display = 'block';
        filtersList.innerHTML = '';
        
        // Sort filters to show priority (student) first
        activeFilters.sort((a, b) => {
            if (a.priority && !b.priority) return -1;
            if (!a.priority && b.priority) return 1;
            return 0;
        });
        
        activeFilters.forEach(filter => {
            const filterTag = document.createElement('div');
            filterTag.className = 'active-filter-tag';
            if (filter.priority) filterTag.classList.add('priority');
            
            filterTag.innerHTML = `
                <span class="filter-type">${filter.type}:</span>
                <span class="filter-value">${filter.value}</span>
            `;
            
            filtersList.appendChild(filterTag);
        });
    }

    async function populateFilterDropdowns(staffAdminId, establishmentId = null) {
        log("Populating filter dropdowns");
        
        try {
            // Fetch all records based on mode
            let allRecords = [];
            const filters = [];
            
            if (establishmentId) {
                // Super User mode - filter by establishment
                filters.push({
                    field: 'field_133',
                    operator: 'is',
                    value: establishmentId
                });
            } else if (staffAdminId) {
                // Normal mode - filter by staff admin
                filters.push({
                    field: 'field_439',
                    operator: 'is',
                    value: staffAdminId
                });
            }
            
            if (filters.length > 0) {
                allRecords = await fetchDataFromKnack(objectKeys.vespaResults, filters);
            }
            
            if (!allRecords || allRecords.length === 0) {
                log("No records found to populate filters");
                return;
            }
            
            log(`Processing ${allRecords.length} records for filter values`);
            
            // Extract unique values for each filter
            const groups = new Set();
            const courses = new Set();
            const yearGroups = new Set();
            const faculties = new Set();
            
            // Debug: Log first record to see field structure
            if (allRecords.length > 0) {
                log("Sample record for debugging:", {
                    field_223: allRecords[0].field_223,
                    field_223_raw: allRecords[0].field_223_raw,
                    field_2299: allRecords[0].field_2299,
                    field_2299_raw: allRecords[0].field_2299_raw,
                    field_144_raw: allRecords[0].field_144_raw,
                    field_782_raw: allRecords[0].field_782_raw
                });
            }
            
            allRecords.forEach((record, index) => {
                // Group (field_223) - Handle as text field
                // Try both field_223_raw and field_223 as Knack might store text fields differently
                const groupFieldValue = record.field_223_raw || record.field_223;
                if (groupFieldValue) {
                    if (index < 3) { // Log first few records for debugging
                        log(`Record ${index} - Group field_223_raw:`, record.field_223_raw, "field_223:", record.field_223);
                    }
                    // If it's an array (connected field), handle differently
                    if (Array.isArray(groupFieldValue)) {
                        groupFieldValue.forEach((groupId, idx) => {
                            if (groupId) {
                                // Try to get display value
                                let displayValue = record.field_223 || groupId;
                                if (Array.isArray(record.field_223)) {
                                    displayValue = record.field_223[idx] || groupId;
                                }
                                groups.add(JSON.stringify({ id: groupId, name: displayValue }));
                            }
                        });
                    } else if (typeof groupFieldValue === 'object' && groupFieldValue !== null) {
                        // Sometimes Knack returns objects for connected fields
                        if (groupFieldValue.id) {
                            groups.add(JSON.stringify({ 
                                id: groupFieldValue.id, 
                                name: groupFieldValue.identifier || groupFieldValue.value || groupFieldValue.id 
                            }));
                        }
                    } else {
                        // It's a text field - use the value directly
                        const groupValue = groupFieldValue.toString().trim();
                        if (groupValue && groupValue !== 'null' && groupValue !== 'undefined') {
                            groups.add(groupValue);
                        }
                    }
                }
                
                // Course (field_2299) - Handle both text and connected fields
                const courseFieldValue = record.field_2299_raw || record.field_2299;
                if (courseFieldValue) {
                    if (index < 3) { // Log first few records for debugging
                        log(`Record ${index} - Course field_2299_raw:`, record.field_2299_raw, "field_2299:", record.field_2299);
                    }
                    if (Array.isArray(courseFieldValue)) {
                        // Connected field
                        courseFieldValue.forEach((courseId, idx) => {
                            if (courseId) {
                                let displayValue = record.field_2299 || courseId;
                                if (Array.isArray(record.field_2299)) {
                                    displayValue = record.field_2299[idx] || courseId;
                                }
                                courses.add(JSON.stringify({ id: courseId, name: displayValue }));
                            }
                        });
                    } else if (typeof courseFieldValue === 'object' && courseFieldValue !== null) {
                        // Sometimes Knack returns objects for connected fields
                        if (courseFieldValue.id) {
                            courses.add(JSON.stringify({ 
                                id: courseFieldValue.id, 
                                name: courseFieldValue.identifier || courseFieldValue.value || courseFieldValue.id 
                            }));
                        }
                    } else {
                        // Text field
                        const courseValue = courseFieldValue.toString().trim();
                        if (courseValue && courseValue !== 'null' && courseValue !== 'undefined') {
                            courses.add(courseValue);
                        }
                    }
                }
                
                // Year Group (field_144)
                if (record.field_144_raw) {
                    const yearGroupValue = record.field_144_raw.toString().trim();
                    if (yearGroupValue) {
                        yearGroups.add(yearGroupValue);
                    }
                }
                
                // Faculty (field_782)
                if (record.field_782_raw) {
                    const facultyValue = record.field_782_raw.toString().trim();
                    if (facultyValue) {
                        faculties.add(facultyValue);
                    }
                }
            });
            
            // Debug: Log collected values
            log("Collected filter values:", {
                groups: Array.from(groups),
                courses: Array.from(courses),
                yearGroups: Array.from(yearGroups),
                faculties: Array.from(faculties)
            });
            
            // Populate dropdowns
            // Process groups - could be strings or JSON objects
            const groupItems = Array.from(groups).map(g => {
                try {
                    return JSON.parse(g);
                } catch (e) {
                    // It's a plain string, not JSON
                    return g;
                }
            }).sort((a, b) => {
                const aName = typeof a === 'object' ? a.name : a;
                const bName = typeof b === 'object' ? b.name : b;
                return aName.localeCompare(bName);
            });
            
            // Process courses - could be strings or JSON objects
            const courseItems = Array.from(courses).map(c => {
                try {
                    return JSON.parse(c);
                } catch (e) {
                    // It's a plain string, not JSON
                    return c;
                }
            }).sort((a, b) => {
                const aName = typeof a === 'object' ? a.name : a;
                const bName = typeof b === 'object' ? b.name : b;
                return aName.localeCompare(bName);
            });
            
            populateDropdown('group-filter', groupItems, 'name', 'id');
            populateDropdown('course-filter', courseItems, 'name', 'id');
            populateDropdown('year-group-filter', Array.from(yearGroups).sort());
            populateDropdown('faculty-filter', Array.from(faculties).sort());
            
        } catch (error) {
            errorLog("Failed to populate filter dropdowns", error);
        }
    }
    
    function populateDropdown(dropdownId, items, displayProperty = null, valueProperty = null) {
        const dropdown = document.getElementById(dropdownId);
        if (!dropdown) return;
        
        // Keep the "All" option
        const allOption = dropdown.querySelector('option[value=""]');
        dropdown.innerHTML = '';
        if (allOption) dropdown.appendChild(allOption);
        
        items.forEach(item => {
            const option = document.createElement('option');
            if (typeof item === 'object' && item !== null) {
                // It's an object
                if (displayProperty && item[displayProperty] !== undefined) {
                    option.textContent = item[displayProperty];
                    option.value = valueProperty && item[valueProperty] !== undefined ? item[valueProperty] : item[displayProperty];
                } else {
                    // Fallback if properties don't exist
                    option.value = JSON.stringify(item);
                    option.textContent = JSON.stringify(item);
                }
            } else {
                // It's a simple value (string/number)
                option.value = item;
                option.textContent = item;
            }
            dropdown.appendChild(option);
        });
        
        log(`Populated ${dropdownId} with ${items.length} items`);
    }

    // --- Section 1: Overview and Benchmarking ---
    // --- ERI (Exam Readiness Index) Functions ---
    async function calculateSchoolERI(staffAdminId, cycle, additionalFilters = [], establishmentId = null) {
        log(`Fetching School ERI for Cycle ${cycle} from backend`);
        
        try {
            // Build URL with parameters
            let url = `${config.herokuAppUrl}/api/calculate-eri?cycle=${cycle}`;
            
            if (establishmentId) {
                url += `&establishmentId=${establishmentId}`;
            } else if (staffAdminId) {
                url += `&staffAdminId=${staffAdminId}`;
            } else {
                log("No Staff Admin ID or Establishment ID provided for ERI calculation");
                return null;
            }
            
            // Note: Additional filters would need to be handled server-side if needed
            // For now, the backend calculates ERI for all records matching the establishment/staff admin
            
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `ERI calculation failed with status ${response.status}` }));
                throw new Error(errorData.message || `ERI calculation failed with status ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.school_eri === null || data.school_eri === undefined) {
                log("No ERI data returned from backend");
                return null;
            }
            
            log(`Received School ERI: ${data.school_eri} from ${data.response_count} responses`);
            
            return {
                value: data.school_eri,
                responseCount: data.response_count
            };
            
        } catch (error) {
            errorLog("Failed to fetch school ERI from backend", error);
            return null;
        }
    }
    
    async function getNationalERI(cycle) {
        log(`Fetching National ERI for Cycle ${cycle} from backend`);
        
        try {
            const url = `${config.herokuAppUrl}/api/national-eri?cycle=${cycle}`;
            
            const response = await fetch(url);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: `National ERI fetch failed with status ${response.status}` }));
                throw new Error(errorData.message || `National ERI fetch failed with status ${response.status}`);
            }
            
            const data = await response.json();
            
            log(`Received National ERI: ${data.national_eri} (${data.source})`);
            if (data.message) {
                log(`National ERI message: ${data.message}`);
            }
            
            return data.national_eri;
            
        } catch (error) {
            errorLog("Failed to fetch national ERI from backend", error);
            // Return fallback value
            return 3.5;
        }
    }
    
    function renderERISpeedometer(schoolERI, nationalERI, cycle) {
        const container = document.getElementById('eri-speedometer-container');
        if (!container) {
            errorLog("ERI speedometer container not found");
            return;
        }
        
        // Clear previous content
        container.innerHTML = '';
        
        // Create the main ERI card
        const eriCard = document.createElement('div');
        eriCard.className = 'eri-speedometer-card';
        
        // Determine color based on ERI value
        let colorClass = 'eri-low';
        let interpretation = 'Low Readiness';
        let colorHex = '#ef4444'; // red
        
        if (schoolERI && schoolERI.value) {
            if (schoolERI.value >= 4) {
                colorClass = 'eri-excellent';
                interpretation = 'Excellent Readiness';
                colorHex = '#3b82f6'; // blue
            } else if (schoolERI.value >= 3) {
                colorClass = 'eri-good';
                interpretation = 'Good Readiness';
                colorHex = '#10b981'; // green
            } else if (schoolERI.value >= 2) {
                colorClass = 'eri-below-average';
                interpretation = 'Below Average';
                colorHex = '#f59e0b'; // orange
            }
        }
        
        eriCard.classList.add(colorClass);
        
        // Build the card HTML
        eriCard.innerHTML = `
            <div class="eri-header">
                <h3>Exam Readiness Index (ERI) - Cycle ${cycle}</h3>
                <button class="eri-info-btn" onclick="window.showERIInfoModal()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12" y2="8"></line>
                    </svg>
                </button>
            </div>
            <div class="eri-content">
                <div class="eri-gauge-container">
                    <canvas id="eri-gauge-chart"></canvas>
                </div>
                <div class="eri-stats">
                    <div class="eri-stat-item">
                        <span class="eri-stat-label">Your School</span>
                        <span class="eri-stat-value" style="color: ${colorHex}">
                            ${schoolERI ? schoolERI.value.toFixed(1) : 'N/A'}
                        </span>
                    </div>
                    <div class="eri-stat-item">
                        <span class="eri-stat-label">National Average</span>
                        <span class="eri-stat-value">
                            ${nationalERI ? nationalERI.toFixed(1) : 'N/A'}
                        </span>
                    </div>
                    <div class="eri-stat-item">
                        <span class="eri-stat-label">Difference</span>
                        <span class="eri-stat-value ${schoolERI && nationalERI && schoolERI.value >= nationalERI ? 'positive' : 'negative'}">
                            ${schoolERI && nationalERI ? 
                                ((schoolERI.value > nationalERI ? '+' : '') + ((schoolERI.value - nationalERI) / nationalERI * 100).toFixed(1) + '%') 
                                : 'N/A'}
                        </span>
                    </div>
                </div>
                <div class="eri-interpretation">
                    <strong>${interpretation}</strong>
                    ${getERIInterpretationText(schoolERI ? schoolERI.value : null)}
                </div>
            </div>
        `;
        
        container.appendChild(eriCard);
        
        // Create the gauge chart
        setTimeout(() => {
            createERIGaugeChart(schoolERI ? schoolERI.value : null, nationalERI);
        }, 100);
    }
    
    function createERIGaugeChart(schoolValue, nationalValue) {
        const canvas = document.getElementById('eri-gauge-chart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // Destroy previous chart if exists
        if (window.eriGaugeChart) {
            window.eriGaugeChart.destroy();
        }
        
        // Create data for the gauge (using doughnut chart)
        const gaugeData = schoolValue || 0;
        const remainingData = 5 - gaugeData;
        
        // Color segments based on value ranges
        const backgroundColors = [
            '#ef4444', // 0-1: Red
            '#f59e0b', // 1-2: Orange
            '#10b981', // 2-3: Green
            '#3b82f6', // 3-4: Blue
            '#1e40af'  // 4-5: Dark Blue
        ];
        
        // Determine which color to use for the filled portion
        let fillColor = backgroundColors[0];
        if (gaugeData >= 4) fillColor = backgroundColors[4];
        else if (gaugeData >= 3) fillColor = backgroundColors[3];
        else if (gaugeData >= 2) fillColor = backgroundColors[2];
        else if (gaugeData >= 1) fillColor = backgroundColors[1];
        
        window.eriGaugeChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [gaugeData, remainingData],
                    backgroundColor: [fillColor, 'rgba(255, 255, 255, 0.1)'],
                    borderWidth: 0,
                    circumference: 180,
                    rotation: 270
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: false
                    },
                    datalabels: {
                        display: false
                    }
                }
            },
            plugins: [{
                id: 'eri-text',
                afterDraw: function(chart) {
                    const ctx = chart.ctx;
                    const width = chart.width;
                    const height = chart.height;
                    
                    ctx.save();
                    
                    // Draw scale labels
                    ctx.fillStyle = '#64748b';
                    ctx.font = '10px Inter';
                    ctx.textAlign = 'center';
                    
                    // Position labels around the arc
                    const centerX = width / 2;
                    const centerY = height - 10;
                    const radius = Math.min(width, height) / 2 - 20;
                    
                    // Draw scale numbers (1-5)
                    for (let i = 0; i <= 4; i++) {
                        const angle = (Math.PI) * (i / 4); // 0 to PI (180 degrees)
                        const x = centerX - radius * Math.cos(angle);
                        const y = centerY - radius * Math.sin(angle);
                        ctx.fillText((i + 1).toString(), x, y);
                    }
                    
                    // Draw center value
                    if (schoolValue) {
                        ctx.font = 'bold 24px Inter';
                        ctx.fillStyle = fillColor;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(schoolValue.toFixed(1), centerX, centerY - 10);
                    }
                    
                    // Draw national average marker if available
                    if (nationalValue) {
                        // Calculate angle for national value position
                        // The gauge goes from 1 to 5, displayed as a 180-degree arc
                        // Angle calculation: PI (leftmost) to 0 (rightmost)
                        const valueRange = 5 - 1; // 4
                        const normalizedValue = (nationalValue - 1) / valueRange; // 0 to 1
                        const nationalAngle = Math.PI * (1 - normalizedValue); // PI to 0
                        
                        const markerRadius = radius - 15;
                        const markerX = centerX + markerRadius * Math.cos(nationalAngle);
                        const markerY = centerY - markerRadius * Math.sin(nationalAngle);
                        
                        // Draw marker line
                        ctx.strokeStyle = '#ffd93d';
                        ctx.lineWidth = 3;
                        ctx.setLineDash([5, 3]);
                        ctx.beginPath();
                        
                        // Draw radial line from inner to outer edge
                        const innerRadius = markerRadius - 10;
                        const outerRadius = markerRadius + 10;
                        ctx.moveTo(centerX + innerRadius * Math.cos(nationalAngle), 
                                  centerY - innerRadius * Math.sin(nationalAngle));
                        ctx.lineTo(centerX + outerRadius * Math.cos(nationalAngle), 
                                  centerY - outerRadius * Math.sin(nationalAngle));
                        ctx.stroke();
                        
                        // Draw label
                        ctx.setLineDash([]);
                        ctx.fillStyle = '#ffd93d';
                        ctx.font = 'bold 10px Inter';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'bottom';
                        ctx.fillText('Nat', markerX, markerY - 15);
                    }
                    
                    ctx.restore();
                }
            }]
        });
    }
    
    function getERIInterpretationText(eriValue) {
        if (!eriValue) {
            return '<p>No ERI data available. Complete psychometric assessments to see your readiness index.</p>';
        }
        
        if (eriValue >= 4) {
            return '<p>Students feel highly supported, well-prepared, and confident about their exam performance.</p>';
        } else if (eriValue >= 3) {
            return '<p>Students generally feel ready for exams but there\'s room for improvement in support or preparation.</p>';
        } else if (eriValue >= 2) {
            return '<p>Students show concerns about exam readiness. Consider enhancing support systems and preparation strategies.</p>';
        } else {
            return '<p>Urgent attention needed. Students feel unprepared and lack confidence. Implement comprehensive support interventions.</p>';
        }
    }
    
    // Make ERI info modal function globally accessible
    window.showERIInfoModal = function() {
        let modal = document.querySelector('.eri-info-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'eri-info-modal';
            modal.innerHTML = `
                <div class="eri-info-content">
                    <div class="eri-info-header">
                        <h3>Understanding the Exam Readiness Index (ERI)</h3>
                        <button class="eri-info-close" onclick="window.hideERIInfoModal()">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    <div class="eri-info-body">
                        <div class="eri-section" style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem;">
                            <h4 style="color: #f59e0b; margin-top: 0;">⚠️ Development Notice</h4>
                            <p style="margin-bottom: 0;">The ERI is in early stages of development. We are continuously analyzing data and refining the methodology to improve its accuracy and predictive value. Current results should be interpreted as indicative rather than definitive.</p>
                        </div>
                        
                        <div class="eri-section">
                            <h4>What is ERI?</h4>
                            <p>The Exam Readiness Index (ERI) is a composite measure that gauges how prepared students feel for their exams. It combines three key psychological factors that research shows correlate with exam performance.</p>
                        </div>
                        
                        <div class="eri-section">
                            <h4>Questions Used</h4>
                            <p>The ERI is calculated from responses to three psychometric questions:</p>
                            <ol style="padding-left: 1.5rem;">
                                <li style="margin-bottom: 0.5rem;"><strong>Support Awareness:</strong><br/>
                                    <em>"I know where to get support if I need it"</em><br/>
                                    <span style="color: var(--text-muted); font-size: 0.9rem;">Measures whether students are aware of available support systems</span>
                                </li>
                                <li style="margin-bottom: 0.5rem;"><strong>Exam Preparedness:</strong><br/>
                                    <em>"I feel prepared for my exams"</em><br/>
                                    <span style="color: var(--text-muted); font-size: 0.9rem;">Assesses students' perceived readiness for assessments</span>
                                </li>
                                <li style="margin-bottom: 0.5rem;"><strong>Achievement Confidence:</strong><br/>
                                    <em>"I feel I will achieve my potential"</em><br/>
                                    <span style="color: var(--text-muted); font-size: 0.9rem;">Evaluates students' belief in their ability to succeed</span>
                                </li>
                            </ol>
                        </div>
                        
                        <div class="eri-section">
                            <h4>Calculation Method</h4>
                            <div style="background: rgba(255, 255, 255, 0.05); padding: 1rem; border-radius: 8px; font-family: monospace;">
                                ERI = (Support + Preparedness + Confidence) / 3
                            </div>
                            <p style="margin-top: 1rem;">Each question is answered on a 1-5 scale:</p>
                            <ul>
                                <li>1 = Strongly Disagree</li>
                                <li>2 = Disagree</li>
                                <li>3 = Neutral</li>
                                <li>4 = Agree</li>
                                <li>5 = Strongly Agree</li>
                            </ul>
                            <p>The three scores are averaged to produce an overall ERI score between 1 and 5.</p>
                        </div>
                        
                        <div class="eri-section">
                            <h4>Rationale</h4>
                            <p>These three factors were selected because they represent:</p>
                            <ul>
                                <li><strong>Environmental factors:</strong> Access to support (external resources)</li>
                                <li><strong>Cognitive factors:</strong> Preparation level (knowledge and skills)</li>
                                <li><strong>Affective factors:</strong> Confidence (emotional readiness)</li>
                            </ul>
                            <p>Together, they provide a holistic view of exam readiness that goes beyond academic ability alone.</p>
                        </div>
                        
                        <div class="eri-section">
                            <h4>Score Interpretation</h4>
                            <div class="eri-score-guide">
                                <div class="score-range excellent">
                                    <span class="range">4.0 - 5.0</span>
                                    <span class="label">Excellent Readiness</span>
                                    <p>Students are confident, well-prepared, and know where to find help.</p>
                                </div>
                                <div class="score-range good">
                                    <span class="range">3.0 - 3.9</span>
                                    <span class="label">Good Readiness</span>
                                    <p>Most students feel ready, but some areas could be strengthened.</p>
                                </div>
                                <div class="score-range below-average">
                                    <span class="range">2.0 - 2.9</span>
                                    <span class="label">Below Average</span>
                                    <p>Significant concerns exist. Focus on support systems and preparation.</p>
                                </div>
                                <div class="score-range low">
                                    <span class="range">1.0 - 1.9</span>
                                    <span class="label">Low Readiness</span>
                                    <p>Urgent intervention needed across all three areas.</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="eri-section">
                            <h4>Using ERI Results</h4>
                            <ul>
                                <li><strong>Low Support Scores:</strong> Improve visibility of support services, implement peer mentoring, increase teacher availability</li>
                                <li><strong>Low Preparedness:</strong> Review revision strategies, provide study resources, increase practice opportunities</li>
                                <li><strong>Low Confidence:</strong> Build self-efficacy through achievable goals, positive feedback, and success experiences</li>
                            </ul>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    window.hideERIInfoModal();
                }
            });
        }
        
        // Ensure modal shows with animation
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);
    };
    
    window.hideERIInfoModal = function() {
        const modal = document.querySelector('.eri-info-modal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    };

    async function loadOverviewData(staffAdminId, cycle = 1, additionalFilters = [], establishmentId = null) {
        log(`Loading overview data with Staff Admin ID: ${staffAdminId}, Establishment ID: ${establishmentId} for Cycle: ${cycle}`);
        const loadingIndicator = document.getElementById('loading-indicator');
        const averagesContainer = document.getElementById('averages-summary-container');
        const distributionContainer = document.getElementById('distribution-charts-container');

        if (loadingIndicator) loadingIndicator.style.display = 'block';
        if (averagesContainer) averagesContainer.style.display = 'none'; // Hide while loading
        if (distributionContainer) distributionContainer.style.display = 'none'; // Hide while loading

        try {
            let schoolVespaResults = [];
            
            // Build filters based on whether we're in Super User mode or normal mode
            const filters = [];
            
            if (establishmentId) {
                // Super User mode - filter by establishment
                filters.push({
                    field: 'field_133',
                    operator: 'is',
                    value: establishmentId
                });
            } else if (staffAdminId) {
                // Normal mode - filter by staff admin
                filters.push({
                    field: 'field_439',
                    operator: 'is',
                    value: staffAdminId
                });
            }
            
            // Add any additional filters
            if (additionalFilters && additionalFilters.length > 0) {
                filters.push(...additionalFilters);
            }
            
            if (filters.length > 0) {
                schoolVespaResults = await fetchDataFromKnack(objectKeys.vespaResults, filters);
                log("Fetched School VESPA Results (filtered):", schoolVespaResults ? schoolVespaResults.length : 0);
            } else {
                log("No Staff Admin ID or Establishment ID provided to loadOverviewData. Cannot filter school-specific data.");
            }

            // Fetch National Benchmark Data from Object_120
            let nationalBenchmarkRecord = null;
            if (objectKeys.nationalBenchmarkData) {
                // Fetch only the latest record, sorted by field_3307 (Date Time) in descending order
                const nationalDataResults = await fetchDataFromKnack(
                    objectKeys.nationalBenchmarkData, 
                    [], // No specific filters for national data
                    { rows_per_page: 1, sort_field: 'field_3307', sort_order: 'desc' } // Options for fetching latest
                );

                if (nationalDataResults && nationalDataResults.length > 0) {
                    // No need to sort here anymore as we requested sorted data and only one record
                    nationalBenchmarkRecord = nationalDataResults[0];
                    log("Fetched latest National Benchmark Record (Object_120 - actually object_10 for national):", nationalBenchmarkRecord);
                } else {
                    log("No National Benchmark Data (Object_120 - object_10 for national) found or objectKey not configured.");
                }
            } else {
                log("nationalBenchmarkData object key not configured in DASHBOARD_CONFIG.objectKeys");
            }

            const schoolAverages = calculateSchoolVespaAverages(schoolVespaResults, cycle);
            log(`School Averages (Cycle ${cycle}):`, schoolAverages);

            let nationalAverages = { vision: 0, effort: 0, systems: 0, practice: 0, attitude: 0, overall: 0 };
            let nationalDistributions = null; // Will hold parsed JSON distribution data
            
            if (nationalBenchmarkRecord) {
                nationalAverages = getNationalVespaAveragesFromRecord(nationalBenchmarkRecord, cycle);
                log("Processed National Averages for charts:", nationalAverages);
                
                // Parse national distribution JSON data
                const distributionFieldMap = {
                    1: 'field_3409', // distribution_json_cycle1
                    2: 'field_3410', // distribution_json_cycle2
                    3: 'field_3411'  // distribution_json_cycle3
                };
                
                const distributionField = distributionFieldMap[cycle];
                if (distributionField && nationalBenchmarkRecord[distributionField + '_raw']) {
                    try {
                        nationalDistributions = JSON.parse(nationalBenchmarkRecord[distributionField + '_raw']);
                        log(`Parsed National Distribution data for Cycle ${cycle}:`, nationalDistributions);
                    } catch (e) {
                        errorLog(`Failed to parse national distribution JSON for cycle ${cycle}:`, e);
                    }
                }
            } else {
                log("National benchmark record was null, nationalAverages will be default/empty.");
            }
            log(`National Averages (Cycle ${cycle}):`, nationalAverages); // This log was already there, good.
            
            // Update response statistics
            await updateResponseStats(staffAdminId, cycle, additionalFilters, establishmentId);
            
            // Calculate and render ERI
            const schoolERI = await calculateSchoolERI(staffAdminId, cycle, additionalFilters, establishmentId);
            const nationalERI = await getNationalERI(cycle);
            renderERISpeedometer(schoolERI, nationalERI, cycle);
            
            renderAveragesChart(schoolAverages, nationalAverages, cycle);
            renderDistributionCharts(schoolVespaResults, nationalAverages, themeColors, cycle, nationalDistributions);

        } catch (error) {
            errorLog("Failed to load overview data", error);
            const overviewSection = document.getElementById('overview-section');
            if(overviewSection) overviewSection.innerHTML = "<p>Error loading overview data. Please check console.</p>";
        } finally {
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            if (averagesContainer) averagesContainer.style.display = 'block'; // Show again
            if (distributionContainer) distributionContainer.style.display = 'block'; // Show again
        }
    }

    // Renamed to be specific for school data and to potentially handle cycles
    function calculateSchoolVespaAverages(results, cycle) {
        log(`Calculating School VESPA averages for Cycle ${cycle} using historical fields.`);
        
        const averages = { vision: 0, effort: 0, systems: 0, practice: 0, attitude: 0, overall: 0 };
        let validRecordsCount = 0;

        if (!Array.isArray(results) || results.length === 0) {
            log("calculateSchoolVespaAverages: Input is not a valid array or is empty", results);
            return averages;
        }

        const fieldMappings = {
            cycle1: { v: 'field_155', e: 'field_156', s: 'field_157', p: 'field_158', a: 'field_159', o: 'field_160' },
            cycle2: { v: 'field_161', e: 'field_162', s: 'field_163', p: 'field_164', a: 'field_165', o: 'field_166' },
            cycle3: { v: 'field_167', e: 'field_168', s: 'field_169', p: 'field_170', a: 'field_171', o: 'field_172' }
        };

        const currentCycleFields = fieldMappings[`cycle${cycle}`];

        if (!currentCycleFields) {
            errorLog(`Invalid cycle number ${cycle} for school VESPA averages field mapping.`);
            return averages; // Return default if cycle is invalid
        }

        results.forEach(record => {
            // Read scores from the specific historical fields for the given cycle
            const v = parseFloat(record[currentCycleFields.v + '_raw']);
            const e = parseFloat(record[currentCycleFields.e + '_raw']);
            const s = parseFloat(record[currentCycleFields.s + '_raw']);
            const p = parseFloat(record[currentCycleFields.p + '_raw']);
            const a = parseFloat(record[currentCycleFields.a + '_raw']);
            const o = parseFloat(record[currentCycleFields.o + '_raw']);

            if (!isNaN(o)) { // Using overall score to validate the record for this cycle
                if (!isNaN(v)) averages.vision += v;
                if (!isNaN(e)) averages.effort += e;
                if (!isNaN(s)) averages.systems += s;
                if (!isNaN(p)) averages.practice += p;
                if (!isNaN(a)) averages.attitude += a;
                averages.overall += o;
                validRecordsCount++;
            }
        });

        if (validRecordsCount > 0) {
            for (const key in averages) {
                averages[key] = parseFloat((averages[key] / validRecordsCount).toFixed(2));
            }
        }
        return averages;
    }

    // Function to calculate and update response statistics
    async function updateResponseStats(staffAdminId, cycle, additionalFilters = [], establishmentId = null) {
        log(`Updating response statistics for Cycle ${cycle}`);
        
        try {
            // Get all records based on whether we're in Super User mode or normal mode
            let allStudentRecords = [];
            const baseFilters = [];
            
            if (establishmentId) {
                // Super User mode - filter by establishment
                baseFilters.push({
                    field: 'field_133',
                    operator: 'is',
                    value: establishmentId
                });
            } else if (staffAdminId) {
                // Normal mode - filter by staff admin
                baseFilters.push({
                    field: 'field_439',
                    operator: 'is',
                    value: staffAdminId
                });
            }
            
            if (baseFilters.length > 0) {
                allStudentRecords = await fetchDataFromKnack(objectKeys.vespaResults, baseFilters);
            }
            
            const totalStudents = allStudentRecords ? allStudentRecords.length : 0;
            
            // Get filtered records if there are additional filters
            let filteredRecords = allStudentRecords;
            if (additionalFilters && additionalFilters.length > 0) {
                const filters = [...baseFilters, ...additionalFilters];
                filteredRecords = await fetchDataFromKnack(objectKeys.vespaResults, filters);
            }
            
            // Count responses where vision score (V1) is not empty for the selected cycle
            const fieldMappings = {
                cycle1: { v: 'field_155' },
                cycle2: { v: 'field_161' },
                cycle3: { v: 'field_167' }
            };
            
            const visionField = fieldMappings[`cycle${cycle}`]?.v;
            if (!visionField) {
                errorLog(`Invalid cycle number ${cycle} for response counting.`);
                return;
            }
            
            let responseCount = 0;
            if (filteredRecords && Array.isArray(filteredRecords)) {
                filteredRecords.forEach(record => {
                    const visionScore = record[visionField + '_raw'];
                    if (visionScore !== null && visionScore !== undefined && visionScore !== '') {
                        responseCount++;
                    }
                });
            }
            
            // Calculate completion rate
            const completionRate = totalStudents > 0 
                ? ((responseCount / totalStudents) * 100).toFixed(1) 
                : '0.0';
            
            // Update the UI
            const cycleResponsesElement = document.getElementById('cycle-responses');
            const totalStudentsElement = document.getElementById('total-students');
            const completionRateElement = document.getElementById('completion-rate');
            
            if (cycleResponsesElement) cycleResponsesElement.textContent = responseCount.toLocaleString();
            if (totalStudentsElement) totalStudentsElement.textContent = totalStudents.toLocaleString();
            if (completionRateElement) completionRateElement.textContent = `${completionRate}%`;
            
            log(`Response Stats - Total Students: ${totalStudents}, Responses: ${responseCount}, Completion: ${completionRate}%`);
            
        } catch (error) {
            errorLog("Failed to update response statistics", error);
            // Reset to dashes on error
            const cycleResponsesElement = document.getElementById('cycle-responses');
            const totalStudentsElement = document.getElementById('total-students');
            const completionRateElement = document.getElementById('completion-rate');
            
            if (cycleResponsesElement) cycleResponsesElement.textContent = '-';
            if (totalStudentsElement) totalStudentsElement.textContent = '-';
            if (completionRateElement) completionRateElement.textContent = '-';
        }
    }

    function getNationalVespaAveragesFromRecord(record, cycle) {
        const nationalAverages = { vision: 0, effort: 0, systems: 0, practice: 0, attitude: 0, overall: 0 };
        if (!record) return nationalAverages;

        const fieldMappings = {
            cycle1: { v: 'field_3292', e: 'field_3293', s: 'field_3294', p: 'field_3295', a: 'field_3296', o: 'field_3406' },
            cycle2: { v: 'field_3297', e: 'field_3298', s: 'field_3299', p: 'field_3300', a: 'field_3301', o: 'field_3407' },
            cycle3: { v: 'field_3302', e: 'field_3303', s: 'field_3304', p: 'field_3305', a: 'field_3306', o: 'field_3408' }
        };

        const currentCycleFields = fieldMappings[`cycle${cycle}`];
        if (!currentCycleFields) {
            errorLog(`Invalid cycle number ${cycle} for national VESPA averages.`);
            return nationalAverages;
        }

        nationalAverages.vision = parseFloat(record[currentCycleFields.v + '_raw']) || 0;
        nationalAverages.effort = parseFloat(record[currentCycleFields.e + '_raw']) || 0;
        nationalAverages.systems = parseFloat(record[currentCycleFields.s + '_raw']) || 0;
        nationalAverages.practice = parseFloat(record[currentCycleFields.p + '_raw']) || 0;
        nationalAverages.attitude = parseFloat(record[currentCycleFields.a + '_raw']) || 0;
        nationalAverages.overall = parseFloat(record[currentCycleFields.o + '_raw']) || 0;
        
        log(`Parsed National Averages from Object_120 for Cycle ${cycle}:`, nationalAverages);
        return nationalAverages;
    }

    function renderAveragesChart(schoolData, nationalData, cycle) {
        const container = document.getElementById('averages-summary-container');
        if (!container) {
            errorLog("Averages summary container not found");
            return;
        }
        container.innerHTML = ''; // Clear previous content

        log(`Rendering averages scorecards for Cycle ${cycle}. School:`, schoolData, "National:", nationalData);

        const elementsToDisplay = [
            { key: 'vision', name: 'VISION' },
            { key: 'effort', name: 'EFFORT' },
            { key: 'systems', name: 'SYSTEMS' },
            { key: 'practice', name: 'PRACTICE' },
            { key: 'attitude', name: 'ATTITUDE' },
            { key: 'overall', name: 'OVERALL' } // Assuming 'overall' is available in schoolData and nationalData
        ];

        const defaultThemeColors = {
            vision: '#ff8f00',
            effort: '#86b4f0',
            systems: '#72cb44',
            practice: '#7f31a4',
            attitude: '#f032e6',
            overall: '#ffd93d'
        };

        const currentThemeColors = config.themeColors || defaultThemeColors;

        elementsToDisplay.forEach(element => {
            const schoolScore = schoolData[element.key];
            const nationalScore = nationalData[element.key];

            const card = document.createElement('div');
            card.className = 'vespa-score-card';
            // Remove inline backgroundColor style to let CSS handle the colors via nth-child

            let percentageDiffText = '';
            let arrow = '';
            let arrowClass = '';

            if (nationalScore !== null && typeof nationalScore !== 'undefined' && nationalScore > 0 && schoolScore !== null && typeof schoolScore !== 'undefined') {
                const diff = ((schoolScore - nationalScore) / nationalScore) * 100;
                arrow = diff >= 0 ? '↑' : '↓';
                arrowClass = diff >= 0 ? 'up' : 'down';
                percentageDiffText = `${diff.toFixed(1)}%`;
            } else if (schoolScore !== null && typeof schoolScore !== 'undefined') {
                if (nationalScore === 0) {
                    percentageDiffText = 'Nat Avg 0';
                } else {
                    percentageDiffText = 'Nat N/A';
                }
            }

            // Determine if overall score should have different decimal places (e.g., 1 vs 2 for others)
            // The image shows scores like 6, 6.3, 5.4, 6.1, 5.9 - mostly one decimal place.
            const scoreToDisplay = (typeof schoolScore === 'number') ? schoolScore.toFixed(1) : 'N/A';
            const nationalScoreToDisplay = (typeof nationalScore === 'number') ? nationalScore.toFixed(1) : 'N/A';

            card.innerHTML = `
                <h3>${element.name}</h3>
                <div class="score-value">${scoreToDisplay}</div>
                <div class="national-comparison">
                    National: ${nationalScoreToDisplay} <span class="arrow ${arrowClass}">${arrow}</span> ${percentageDiffText}
                </div>
                <button class="advanced-stats-btn" data-element="${element.key}" data-cycle="${cycle}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 3v18h18M9 17V9m4 8V5m4 12V11"/>
                    </svg>
                </button>
            `;
            container.appendChild(card);
        });
        
        // Add event listeners for advanced stats buttons
        container.querySelectorAll('.advanced-stats-btn').forEach(btn => {
            btn.addEventListener('click', handleAdvancedStatsClick);
        });
    }

    // --- Advanced Statistics Functions ---
    function calculateStatistics(values) {
        if (!values || values.length === 0) {
            return null;
        }

        // Sort values for percentile calculations
        const sorted = values.slice().sort((a, b) => a - b);
        const n = sorted.length;

        // Calculate mean
        const mean = values.reduce((sum, val) => sum + val, 0) / n;

        // Calculate standard deviation
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
        const stdDev = Math.sqrt(variance);

        // Calculate percentiles
        const percentile = (p) => {
            const index = (p / 100) * (n - 1);
            const lower = Math.floor(index);
            const upper = Math.ceil(index);
            const weight = index % 1;
            return sorted[lower] * (1 - weight) + sorted[upper] * weight;
        };

        // Calculate skewness (simplified)
        const skewness = n > 2 ? 
            (values.reduce((sum, val) => sum + Math.pow((val - mean) / stdDev, 3), 0) / n) : 0;

        // Calculate confidence intervals (95%)
        const confidenceInterval = 1.96 * (stdDev / Math.sqrt(n));

        return {
            mean: parseFloat(mean.toFixed(2)),
            std_dev: parseFloat(stdDev.toFixed(2)),
            min: Math.min(...values),
            max: Math.max(...values),
            percentile_25: parseFloat(percentile(25).toFixed(2)),
            percentile_50: parseFloat(percentile(50).toFixed(2)),
            percentile_75: parseFloat(percentile(75).toFixed(2)),
            confidence_interval_lower: parseFloat((mean - confidenceInterval).toFixed(2)),
            confidence_interval_upper: parseFloat((mean + confidenceInterval).toFixed(2)),
            skewness: parseFloat(skewness.toFixed(3)),
            count: n
        };
    }

    function calculateSchoolStatistics(schoolResults, cycle, elementKey) {
        const fieldMappings = {
            cycle1: { 
                vision: 'field_155', effort: 'field_156', systems: 'field_157', 
                practice: 'field_158', attitude: 'field_159', overall: 'field_160' 
            },
            cycle2: { 
                vision: 'field_161', effort: 'field_162', systems: 'field_163', 
                practice: 'field_164', attitude: 'field_165', overall: 'field_166' 
            },
            cycle3: { 
                vision: 'field_167', effort: 'field_168', systems: 'field_169', 
                practice: 'field_170', attitude: 'field_171', overall: 'field_172' 
            }
        };

        const cycleFields = fieldMappings[`cycle${cycle}`];
        if (!cycleFields || !cycleFields[elementKey]) {
            return null;
        }

        const fieldKey = cycleFields[elementKey] + '_raw';
        const values = [];

        schoolResults.forEach(record => {
            const value = parseFloat(record[fieldKey]);
            if (!isNaN(value)) {
                values.push(value);
            }
        });

        return calculateStatistics(values);
    }

    async function handleAdvancedStatsClick(event) {
        const button = event.currentTarget;
        const elementKey = button.dataset.element;
        const cycle = parseInt(button.dataset.cycle);

        log(`Opening advanced stats for ${elementKey} - Cycle ${cycle}`);

        // Show loading state
        showStatsPanel(elementKey, cycle, true);

        try {
            // Get current school results (filtered)
            const activeFilters = getActiveFilters();
            let schoolResults = [];
            
            const staffAdminId = await getStaffAdminRecordIdByEmail(loggedInUserEmail);
            if (staffAdminId) {
                const filters = [{
                    field: 'field_439',
                    operator: 'is',
                    value: staffAdminId
                }, ...activeFilters];
                
                schoolResults = await fetchDataFromKnack(objectKeys.vespaResults, filters);
            }

            // Calculate school statistics
            const schoolStats = calculateSchoolStatistics(schoolResults, cycle, elementKey);

            // Fetch national statistics
            let nationalStats = null;
            if (objectKeys.nationalBenchmarkData) {
                const nationalData = await fetchDataFromKnack(
                    objectKeys.nationalBenchmarkData, 
                    [], 
                    { rows_per_page: 1, sort_field: 'field_3307', sort_order: 'desc' }
                );

                if (nationalData && nationalData.length > 0) {
                    const statsFieldMap = {
                        1: 'field_3429',
                        2: 'field_3430',
                        3: 'field_3421'  // Note: You mentioned field_3421 for cycle 3
                    };
                    
                    const statsField = statsFieldMap[cycle];
                    if (statsField && nationalData[0][statsField + '_raw']) {
                        try {
                            const allStats = JSON.parse(nationalData[0][statsField + '_raw']);
                            // Get stats for the specific element (capitalize first letter)
                            const elementName = elementKey.charAt(0).toUpperCase() + elementKey.slice(1);
                            nationalStats = allStats[elementName];
                        } catch (e) {
                            errorLog(`Failed to parse national statistics for cycle ${cycle}:`, e);
                        }
                    }
                }
            }

            // Update panel with data
            updateStatsPanel(elementKey, cycle, schoolStats, nationalStats);

        } catch (error) {
            errorLog("Error loading advanced statistics:", error);
            updateStatsPanel(elementKey, cycle, null, null, error.message);
        }
    }

    function showStatsPanel(elementKey, cycle, isLoading = false) {
        // Create panel HTML if it doesn't exist
        let overlay = document.querySelector('.stats-panel-overlay');
        let panel = document.querySelector('.stats-panel');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'stats-panel-overlay';
            overlay.addEventListener('click', hideStatsPanel);
            document.body.appendChild(overlay);
        }
        
        if (!panel) {
            panel = document.createElement('div');
            panel.className = 'stats-panel';
            document.body.appendChild(panel);
        }

        // Set initial content
        const elementColors = {
            vision: 'var(--vision-color)',
            effort: 'var(--effort-color)',
            systems: 'var(--systems-color)',
            practice: 'var(--practice-color)',
            attitude: 'var(--attitude-color)',
            overall: 'var(--overall-color)'
        };

        const elementName = elementKey.charAt(0).toUpperCase() + elementKey.slice(1);
        const color = elementColors[elementKey] || 'var(--accent-primary)';

        panel.innerHTML = `
            <div class="stats-panel-header">
                <div class="stats-panel-title">
                    <h3>
                        Advanced Statistics
                        <span class="stats-element-badge" style="background-color: ${color}">
                            ${elementName} - Cycle ${cycle}
                        </span>
                    </h3>
                    <div style="display: flex; align-items: center;">
                        <button class="stats-info-btn" onclick="showStatsInfoModal()">
                            i
                        </button>
                        <button class="stats-close-btn" onclick="hideStatsPanel()">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
            <div class="stats-panel-content">
                ${isLoading ? '<div class="stats-loading"><div class="spinner"></div><p>Calculating statistics...</p></div>' : ''}
            </div>
        `;

        // Show panel with animation
        requestAnimationFrame(() => {
            overlay.classList.add('active');
            panel.classList.add('active');
        });
    }

    function updateStatsPanel(elementKey, cycle, schoolStats, nationalStats, error = null) {
        const panel = document.querySelector('.stats-panel');
        const content = panel.querySelector('.stats-panel-content');
        
        if (error) {
            content.innerHTML = `
                <div class="stats-section">
                    <p style="color: var(--accent-danger); text-align: center;">
                        Error loading statistics: ${error}
                    </p>
                </div>
            `;
            return;
        }

        if (!schoolStats && !nationalStats) {
            content.innerHTML = `
                <div class="stats-section">
                    <p style="color: var(--text-muted); text-align: center;">
                        No statistical data available.
                    </p>
                </div>
            `;
            return;
        }

        // Generate comparison HTML
        content.innerHTML = `
            <div class="stats-comparison">
                ${schoolStats ? generateStatsSection('Your School', schoolStats, nationalStats, 'school') : ''}
                ${nationalStats ? generateStatsSection('National Benchmark', nationalStats, null, 'national') : ''}
                ${schoolStats && nationalStats ? generateInsights(schoolStats, nationalStats, elementKey) : ''}
            </div>
        `;

        // Add box plot visualization if both datasets exist
        if (schoolStats && nationalStats) {
            // You could add a box plot here using Chart.js or D3.js
        }
    }

    function generateStatsSection(title, stats, compareStats, type) {
        const formatDiff = (value, compareValue) => {
            if (!compareStats || compareValue === undefined) return '';
            const diff = value - compareValue;
            const percentage = compareValue !== 0 ? (diff / compareValue * 100).toFixed(1) : 0;
            const isPositive = diff > 0;
            const className = isPositive ? 'positive' : 'negative';
            const sign = isPositive ? '+' : '';
            return '<span class="stat-diff ' + className + '">' + sign + percentage + '%</span>';
        };

        let meanDiff = '';
        let stdDevDiff = '';
        
        if (compareStats && typeof compareStats.mean === 'number') {
            meanDiff = formatDiff(stats.mean, compareStats.mean);
        }
        
        if (compareStats && typeof compareStats.std_dev === 'number') {
            stdDevDiff = formatDiff(stats.std_dev, compareStats.std_dev);
        }

        return `
            <div class="stats-section">
                <h4>${title}</h4>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-label">Mean</div>
                        <div class="stat-value">
                            ${stats.mean}
                            ${meanDiff}
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Standard Deviation</div>
                        <div class="stat-value">
                            ${stats.std_dev}
                            ${stdDevDiff}
                        </div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">25th Percentile</div>
                        <div class="stat-value">${stats.percentile_25}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Median (50th)</div>
                        <div class="stat-value">${stats.percentile_50}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">75th Percentile</div>
                        <div class="stat-value">${stats.percentile_75}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Sample Size</div>
                        <div class="stat-value">${stats.count.toLocaleString()}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Range</div>
                        <div class="stat-value">${stats.min} - ${stats.max}</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-label">Confidence Interval</div>
                        <div class="stat-value" style="font-size: 1rem;">
                            ${stats.confidence_interval_lower} - ${stats.confidence_interval_upper}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }


    function generateInsights(schoolStats, nationalStats, elementKey) {
        const insights = [];
        
        // Compare mean
        if (schoolStats.mean > nationalStats.mean) {
            const diff = ((schoolStats.mean - nationalStats.mean) / nationalStats.mean * 100).toFixed(1);
            insights.push({
                type: 'success',
                text: `Your school's average is ${diff}% above the national average`
            });
        } else if (schoolStats.mean < nationalStats.mean) {
            const diff = ((nationalStats.mean - schoolStats.mean) / nationalStats.mean * 100).toFixed(1);
            insights.push({
                type: 'warning',
                text: `Your school's average is ${diff}% below the national average`
            });
        }

        // Variability comparison
        if (schoolStats.std_dev > nationalStats.std_dev * 1.2) {
            insights.push({
                type: 'info',
                text: 'Higher variability than national - consider targeted interventions'
            });
        } else if (schoolStats.std_dev < nationalStats.std_dev * 0.8) {
            insights.push({
                type: 'success',
                text: 'More consistent scores than national average'
            });
        }

        // Percentile position
        if (schoolStats.mean > nationalStats.percentile_75) {
            insights.push({
                type: 'success',
                text: 'Performance in top quartile nationally'
            });
        } else if (schoolStats.mean < nationalStats.percentile_25) {
            insights.push({
                type: 'warning',
                text: 'Performance in bottom quartile nationally'
            });
        }

        // Sample size
        if (schoolStats.count < 30) {
            insights.push({
                type: 'info',
                text: 'Small sample size - interpret with caution'
            });
        }

        return `
            <div class="stats-insights">
                <h5>Key Insights</h5>
                ${insights.map(insight => `
                    <div class="insight-item">
                        <div class="insight-icon ${insight.type}">
                            ${insight.type === 'success' ? '✓' : insight.type === 'warning' ? '!' : 'i'}
                        </div>
                        <div class="insight-text">${insight.text}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Make hideStatsPanel globally accessible
    window.hideStatsPanel = function() {
        const overlay = document.querySelector('.stats-panel-overlay');
        const panel = document.querySelector('.stats-panel');
        
        if (overlay) overlay.classList.remove('active');
        if (panel) panel.classList.remove('active');
        
        // Remove elements after animation
        setTimeout(() => {
            if (overlay && !overlay.classList.contains('active')) {
                overlay.remove();
            }
            if (panel && !panel.classList.contains('active')) {
                panel.remove();
            }
        }, 400);
    };

    // Stats Info Modal Functions
    window.showStatsInfoModal = function() {
        // Create modal if it doesn't exist
        let modal = document.querySelector('.stats-info-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.className = 'stats-info-modal';
            modal.innerHTML = `
                <div class="stats-info-content">
                    <div class="stats-info-header">
                        <h3>Understanding Your Statistics</h3>
                        <button class="stats-info-close" onclick="hideStatsInfoModal()">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 6L6 18M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                    <div class="stats-info-body">
                        <div class="stats-term">
                            <h4>Mean (Average)</h4>
                            <p>The average score calculated by adding all scores and dividing by the number of responses. This gives you the central tendency of your data.</p>
                            <div class="example">Example: If your school's mean is 6.2 and the national mean is 5.8, your students are performing above the national average.</div>
                        </div>
                        
                        <div class="stats-term">
                            <h4>Standard Deviation</h4>
                            <p>Measures how spread out the scores are from the average. A lower value means scores are more consistent, while a higher value indicates more variability.</p>
                            <div class="example">Example: A standard deviation of 1.5 means most scores fall within 1.5 points of the average.</div>
                        </div>
                        
                        <div class="stats-term">
                            <h4>Percentiles (25th, 50th, 75th)</h4>
                            <p>Shows the score below which a certain percentage of students fall. The 50th percentile is the median.</p>
                            <div class="example">Example: A 75th percentile of 8 means 75% of students scored 8 or below.</div>
                        </div>
                        
                        <div class="stats-term">
                            <h4>Confidence Interval</h4>
                            <p>The range where we're 95% confident the true average lies. Narrower intervals indicate more precise estimates.</p>
                            <div class="example">Example: A confidence interval of 5.8-6.2 means we're 95% confident the true average is between these values.</div>
                        </div>
                        
                        <div class="stats-term">
                            <h4>Sample Size</h4>
                            <p>The number of students included in the calculation. Larger sample sizes generally provide more reliable statistics.</p>
                            <div class="example">Note: Results based on fewer than 30 students should be interpreted with caution.</div>
                        </div>
                        
                        <div class="stats-term">
                            <h4>Range (Min-Max)</h4>
                            <p>Shows the lowest and highest scores in your data. A wider range indicates more diverse performance levels.</p>
                            <div class="example">Example: A range of 2-10 shows significant variation in student responses.</div>
                        </div>
                        
                        <div class="stats-term">
                            <h4>Percentage Differences</h4>
                            <p>Green percentages show where your school exceeds national averages, while red indicates areas below national performance.</p>
                            <div class="example">Tip: Focus improvement efforts on areas with negative percentages while maintaining strengths.</div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Add click outside to close
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    hideStatsInfoModal();
                }
            });
        }
        
        // Show modal with animation
        requestAnimationFrame(() => {
            modal.classList.add('active');
        });
    };

    window.hideStatsInfoModal = function() {
        const modal = document.querySelector('.stats-info-modal');
        if (modal) {
            modal.classList.remove('active');
            // Remove after animation
            setTimeout(() => {
                modal.remove();
            }, 300);
        }
    };

    let vespaDistributionChartInstances = {}; // To store multiple chart instances

    function renderDistributionCharts(schoolResults, nationalAveragesData, themeColorsConfig, cycle, nationalDistributions) {
        const container = document.getElementById('distribution-charts-container');
        if (!container) {
            errorLog("Distribution charts container not found");
            return;
        }
        log(`Rendering distribution charts for Cycle ${cycle}.`);

        // VESPA elements and their corresponding field prefixes in Object_10 for historical data
        const vespaElements = [
            { name: 'Vision', key: 'vision', color: themeColorsConfig?.vision || '#ff8f00', fieldCycle1: 'field_155', fieldCycle2: 'field_161', fieldCycle3: 'field_167' },
            { name: 'Effort', key: 'effort', color: themeColorsConfig?.effort || '#86b4f0', fieldCycle1: 'field_156', fieldCycle2: 'field_162', fieldCycle3: 'field_168' },
            { name: 'Systems', key: 'systems', color: themeColorsConfig?.systems || '#72cb44', fieldCycle1: 'field_157', fieldCycle2: 'field_163', fieldCycle3: 'field_169' },
            { name: 'Practice', key: 'practice', color: themeColorsConfig?.practice || '#7f31a4', fieldCycle1: 'field_158', fieldCycle2: 'field_164', fieldCycle3: 'field_170' },
            { name: 'Attitude', key: 'attitude', color: themeColorsConfig?.attitude || '#f032e6', fieldCycle1: 'field_159', fieldCycle2: 'field_165', fieldCycle3: 'field_171' },
            { name: 'Overall', key: 'overall', color: themeColorsConfig?.overall || '#ffd93d', fieldCycle1: 'field_160', fieldCycle2: 'field_166', fieldCycle3: 'field_172' }
        ];

        vespaElements.forEach(element => {
            const scoreDistribution = Array(11).fill(0); // For scores 0-10
            let scoreFieldKey = element[`fieldCycle${cycle}`] + '_raw';

            if (!schoolResults || schoolResults.length === 0) {
                log(`No school results to process for ${element.name} distribution.`);
            } else {
                schoolResults.forEach(record => {
                    const score = parseFloat(record[scoreFieldKey]);
                    if (!isNaN(score) && score >= 0 && score <= 10) {
                        scoreDistribution[Math.round(score)]++; // Round score in case of decimals, though they should be whole numbers
                    }
                });
            }
            
            const nationalAverageForElement = nationalAveragesData ? nationalAveragesData[element.key] : null;
            const canvasId = `${element.key}-distribution-chart`;
            let chartTitle = `${element.name} Score Distribution - Cycle ${cycle}`;

            log(`For ${element.name} Distribution - National Avg: ${nationalAverageForElement}`); // Log national average for this element

            createSingleHistogram(canvasId, chartTitle, scoreDistribution, nationalAverageForElement, element.color, cycle, element.key, nationalDistributions);
        });
    }

    function createSingleHistogram(canvasId, title, schoolScoreDistribution, nationalAverageScore, color, cycle, elementKey, nationalDistributions) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            errorLog(`Canvas element ${canvasId} not found for histogram.`);
            return;
        }
        const ctx = canvas.getContext('2d');

        // Destroy previous chart instance if it exists
        if (vespaDistributionChartInstances[canvasId]) {
            vespaDistributionChartInstances[canvasId].destroy();
        }

        const labels = Array.from({ length: 11 }, (_, i) => i.toString()); // Scores 0-10

        // Prepare national distribution data if available
        let nationalDistributionData = null;
        let nationalPatternData = null; // Scaled pattern for display
        if (nationalDistributions && elementKey) {
            // Map element key to the name used in the JSON (e.g., 'vision' -> 'Vision')
            const elementNameMap = {
                'vision': 'Vision',
                'effort': 'Effort',
                'systems': 'Systems',
                'practice': 'Practice',
                'attitude': 'Attitude',
                'overall': 'Overall'
            };
            
            const elementName = elementNameMap[elementKey];
            if (elementName && nationalDistributions[elementName]) {
                // Convert the distribution object to an array for Chart.js
                nationalDistributionData = labels.map(label => {
                    return nationalDistributions[elementName][label] || 0;
                });
                
                // Option 1: Scale national data to match school data range for pattern comparison
                const schoolMax = Math.max(...schoolScoreDistribution);
                const nationalMax = Math.max(...nationalDistributionData);
                
                // Option 2: Convert to percentages (uncomment to use this approach instead)
                // const schoolTotal = schoolScoreDistribution.reduce((sum, val) => sum + val, 0);
                // const nationalTotal = nationalDistributionData.reduce((sum, val) => sum + val, 0);
                // if (schoolTotal > 0 && nationalTotal > 0) {
                //     schoolScoreDistribution = schoolScoreDistribution.map(val => (val / schoolTotal) * 100);
                //     nationalPatternData = nationalDistributionData.map(val => (val / nationalTotal) * 100);
                //     // Would also need to update y-axis label to "Percentage of Students"
                // }
                
                // Using Option 1: Scale to match
                if (nationalMax > 0 && schoolMax > 0) {
                    // Scale national data to match school's maximum, preserving the pattern
                    const scaleFactor = schoolMax / nationalMax * 0.8; // 0.8 to keep it slightly below school max
                    nationalPatternData = nationalDistributionData.map(value => value * scaleFactor);
                    log(`Scaled national pattern for ${elementName} with factor ${scaleFactor}`);
                } else {
                    nationalPatternData = nationalDistributionData;
                }
            }
        }

        const datasets = [{
            label: 'School Score Distribution',
            data: schoolScoreDistribution,
            backgroundColor: color || 'rgba(75, 192, 192, 0.8)',
            borderColor: color || 'rgba(75, 192, 192, 1)',
            borderWidth: 2,
            order: 2 // Draw bars first
        }];

        // Add national distribution pattern as a line if data is available
        if (nationalPatternData) {
            datasets.push({
                label: 'National Pattern',
                data: nationalPatternData,
                type: 'line',
                borderColor: 'rgba(255, 217, 61, 0.5)', // More subtle golden yellow
                backgroundColor: 'rgba(255, 217, 61, 0.05)',
                borderWidth: 2,
                borderDash: [8, 4], // Longer dashes for pattern indication
                pointRadius: 2, // Smaller points
                pointBackgroundColor: 'rgba(255, 217, 61, 0.5)',
                pointBorderColor: 'rgba(255, 217, 61, 0.7)',
                tension: 0.4, // Smoother curve to emphasize pattern
                order: 1 // Draw line on top
            });
        }

        const chartConfig = {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.5,
                plugins: {
                    title: {
                        display: true,
                        text: title,
                        color: '#ffffff',
                        font: {
                            size: 16,
                            weight: 'bold'
                        }
                    },
                    legend: {
                        display: nationalPatternData ? true : false, // Show legend only if we have national data
                        labels: {
                            color: '#a8b2d1',
                            usePointStyle: true,
                            padding: 10,
                            font: {
                                size: 11
                            },
                            generateLabels: function(chart) {
                                const defaultLabels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                                // Customize the national pattern label
                                defaultLabels.forEach(label => {
                                    if (label.text === 'National Pattern') {
                                        label.text = 'National Pattern (scaled for comparison)';
                                    }
                                });
                                return defaultLabels;
                            }
                        }
                    },
                    datalabels: {
                        display: false // Disable data labels on bars and line points
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: color,
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const datasetLabel = context.dataset.label;
                                const value = context.raw;
                                if (datasetLabel === 'School Score Distribution') {
                                    return `Your School: ${value} students`;
                                } else if (datasetLabel === 'National Pattern') {
                                    // For national pattern, show it as a relative indicator
                                    const scoreIndex = parseInt(context.label);
                                    const nationalValue = nationalDistributionData ? nationalDistributionData[scoreIndex] : 0;
                                    return `National Pattern (${nationalValue.toLocaleString()} students nationally)`;
                                }
                                return `${datasetLabel}: ${value}`;
                            }
                        }
                    },
                    annotation: { // Annotation plugin configuration
                        annotations: {}
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            borderColor: 'rgba(255, 255, 255, 0.2)'
                        },
                        title: {
                            display: true,
                            text: 'Number of Students',
                            color: '#a8b2d1'
                        },
                        ticks: { // Ensure y-axis ticks are integers
                            color: '#a8b2d1',
                            stepSize: 1,
                            callback: function(value) { if (Number.isInteger(value)) { return value; } }
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            borderColor: 'rgba(255, 255, 255, 0.2)'
                        },
                        title: {
                            display: true,
                            text: 'Score (0-10)',
                            color: '#a8b2d1'
                        },
                        ticks: {
                            color: '#a8b2d1'
                        }
                    }
                }
            }
        };

        // Check for Annotation plugin specifically before trying to use its options
        let annotationPluginAvailable = false;
        if (typeof Annotation !== 'undefined') annotationPluginAvailable = true;
        else if (typeof Chart !== 'undefined' && Chart.Annotation) annotationPluginAvailable = true;
        else if (typeof window !== 'undefined' && window.ChartAnnotation) annotationPluginAvailable = true;
        else if (typeof Chart !== 'undefined' && Chart.registry && Chart.registry.getPlugin && Chart.registry.getPlugin('annotation')) annotationPluginAvailable = true;

        if (nationalAverageScore !== null && typeof nationalAverageScore !== 'undefined' && annotationPluginAvailable) {
            chartConfig.options.plugins.annotation.annotations[`nationalAvgLine-${elementKey}`] = {
                type: 'line',
                xMin: nationalAverageScore,
                xMax: nationalAverageScore,
                borderColor: '#ffd93d',
                borderWidth: 3,
                borderDash: [8, 4], // Dashed line
                label: {
                    enabled: true,
                    content: `Nat Avg: ${nationalAverageScore.toFixed(1)}`,
                    position: 'start',
                    backgroundColor: 'rgba(255, 217, 61, 0.9)',
                    font: { 
                        weight: 'bold',
                        size: 12
                    },
                    color: '#0f0f23',
                    padding: 4
                }
            };
        } else if (nationalAverageScore !== null && typeof nationalAverageScore !== 'undefined') {
            // Fallback: add to title if annotation plugin is not available
            chartConfig.options.plugins.title.text += ` (Nat Avg: ${nationalAverageScore.toFixed(2)})`;
        }

        log(`Creating histogram for ${canvasId} with title: '${chartConfig.options.plugins.title.text}'`); // Log final title

        try {
            vespaDistributionChartInstances[canvasId] = new Chart(ctx, chartConfig);
        } catch (e) {
            errorLog(`Error creating histogram for ${canvasId}:`, e);
        }
    }

    // --- Section 2: Question Level Analysis (QLA) ---
    let allQuestionResponses = []; // Cache for QLA data
    let questionMappings = { id_to_text: {}, psychometric_details: {} }; // Cache for mappings

    async function loadQLAData(staffAdminId, establishmentId = null) {
        log(`Loading QLA data with Staff Admin ID: ${staffAdminId}, Establishment ID: ${establishmentId}`);
        try {
            // Fetch question mappings first
            try {
                const mappingResponse = await fetch(`${config.herokuAppUrl}/api/question-mappings`);
                if (!mappingResponse.ok) {
                    const errorData = await mappingResponse.json().catch(() => ({}));
                    throw new Error(errorData.message || `Failed to fetch question mappings: ${mappingResponse.status}`);
                }
                questionMappings = await mappingResponse.json();
                log("Question mappings loaded:", questionMappings);
            } catch (mapError) {
                errorLog("Failed to load question mappings", mapError);
                // Proceeding without mappings might make QLA less user-friendly
                // but some parts might still work if IDs are used.
            }


            // Fetch all records from Object_29 (Questionnaire Qs)
            // Filter by Staff Admin ID or Establishment (VESPA Customer)
            let qlaFilters = [];
            
            if (establishmentId) {
                // Super User mode - filter by VESPA Customer (field_1821) which links to establishment
                // Note: establishmentId is now a VESPA Customer ID from object_2
                qlaFilters.push({
                    field: 'field_1821', 
                    operator: 'is',
                    value: establishmentId
                });
                allQuestionResponses = await fetchDataFromKnack(objectKeys.questionnaireResponses, qlaFilters);
                log("Fetched QLA Responses (filtered by VESPA Customer):", allQuestionResponses ? allQuestionResponses.length : 0);
            } else if (staffAdminId) {
                // Normal mode - filter by Staff Admin
                qlaFilters.push({
                    field: 'field_2069', 
                    operator: 'is', // For array connections, 'is' often works like 'contains this ID' in Knack.
                    value: staffAdminId
                });
                allQuestionResponses = await fetchDataFromKnack(objectKeys.questionnaireResponses, qlaFilters);
                log("Fetched QLA Responses (filtered by Staff Admin ID):", allQuestionResponses ? allQuestionResponses.length : 0);
            } else { 
                log("No Staff Admin ID or Establishment ID provided to loadQLAData. Cannot filter QLA data. Attempting to fetch all.");
                allQuestionResponses = await fetchDataFromKnack(objectKeys.questionnaireResponses, []); // Fetch all if no filter
            }
            // log("QLA data loaded:", allQuestionResponses.length, "responses"); // Already logged above if filtered

            populateQLAQuestionDropdown();
            displayTopBottomQuestions(allQuestionResponses);
            displayQLAStats(allQuestionResponses);

        } catch (error) {
            errorLog("Failed to load QLA data", error);
            const qlaSection = document.getElementById('qla-section');
            if(qlaSection) qlaSection.innerHTML = "<p>Error loading Question Level Analysis data. Please check console.</p>";
        }
    }


    async function populateQLAQuestionDropdown() {
        const dropdown = document.getElementById('qla-question-dropdown');
        if (!dropdown) return;

        try {
            const response = await fetch(`${config.herokuAppUrl}/api/interrogation-questions`); 
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch interrogation questions');
            }
            const questions = await response.json(); 

            dropdown.innerHTML = '<option value="">Select a question...</option>'; // Clear previous/add default
            questions.forEach(qObj => { // Assuming backend sends array of {id, question}
                const option = document.createElement('option');
                option.value = qObj.question; // Use the question text itself as value, or qObj.id if you prefer
                option.textContent = qObj.question;
                dropdown.appendChild(option);
            });
            log("Populated QLA question dropdown.");
        } catch (error) {
            errorLog("Failed to populate QLA question dropdown", error);
            dropdown.innerHTML = "<option>Error loading questions</option>";
        }
    }
    
    function calculateAverageScoresForQuestions(responses) {
        const questionScores = {};
        const questionCounts = {};
        const currentQuestionTextMapping = questionMappings.id_to_text || {};

        if (!Array.isArray(responses) || responses.length === 0) {
            log("calculateAverageScoresForQuestions: Input is not a valid array or is empty", responses);
            return {}; // Return empty object if no valid responses
        }

        responses.forEach(record => {
            for (const fieldKeyInRecord in record) {
                // fieldKeyInRecord is like 'field_794_raw'
                if (fieldKeyInRecord.startsWith('field_') && fieldKeyInRecord.endsWith('_raw')) {
                    const baseFieldId = fieldKeyInRecord.replace('_raw', ''); // e.g., field_794
                    
                    // Check if this field is a known question from our mapping
                    if (currentQuestionTextMapping[baseFieldId] || (questionMappings.psychometric_details && isFieldInPsychometricDetails(baseFieldId, questionMappings.psychometric_details))) {
                        const score = parseInt(record[fieldKeyInRecord], 10);
                        if (!isNaN(score) && score >= 1 && score <= 5) { // Assuming 1-5 scale from README for Object_29
                            questionScores[baseFieldId] = (questionScores[baseFieldId] || 0) + score;
                            questionCounts[baseFieldId] = (questionCounts[baseFieldId] || 0) + 1;
                        }
                    }
                }
            }
        });

        const averageScores = {};
        for (const qId in questionScores) {
            if (questionCounts[qId] > 0) {
                averageScores[qId] = parseFloat((questionScores[qId] / questionCounts[qId]).toFixed(2));
            }
        }
        return averageScores; 
    }

    // Helper to check if a fieldId is part of the psychometric question details
    function isFieldInPsychometricDetails(fieldId, psychometricDetailsArray) {
        if (!psychometricDetailsArray || !Array.isArray(psychometricDetailsArray)) return false;
        // psychometric_question_details.json is an array of objects,
        // each object has a 'currentCycleFieldId' property.
        return psychometricDetailsArray.some(qDetail => qDetail.currentCycleFieldId === fieldId);
    }

    // Helper function to get question text mapping
    async function getQuestionTextMapping() {
        // Return the cached mapping or fetch it if needed
        if (questionMappings.id_to_text && Object.keys(questionMappings.id_to_text).length > 0) {
            return questionMappings.id_to_text;
        }
        
        // If not cached, return an empty object (the mapping should have been loaded in loadQLAData)
        return {};
    }

    async function displayTopBottomQuestions(responses) {
        if (!responses || responses.length === 0) return;
        
        const averageScores = calculateAverageScoresForQuestions(responses);
        const questionTextMapping = await getQuestionTextMapping();

        const sortedQuestions = Object.entries(averageScores)
            .map(([fieldId, avgScore]) => ({
                id: fieldId,
                text: questionTextMapping[fieldId] || `Unknown Question (${fieldId})`,
                score: avgScore
            }))
            .sort((a, b) => b.score - a.score);

        const top5 = sortedQuestions.slice(0, 5);
        const bottom5 = sortedQuestions.slice(-5).reverse(); // Reverse to show lowest score first if desired

        const top5ul = document.getElementById('qla-top-5');
        const bottom5ul = document.getElementById('qla-bottom-5');

        if (top5ul) {
            top5ul.innerHTML = top5.map(q => `<li>${q.text} (Avg: ${q.score})</li>`).join('');
        }
        if (bottom5ul) {
            bottom5ul.innerHTML = bottom5.map(q => `<li>${q.text} (Avg: ${q.score})</li>`).join('');
        }
        log("Displayed Top/Bottom 5 questions.");
    }


    function displayQLAStats(responses) {
        // Calculate and display other stats:
        // - Overall response distribution for key questions
        // - Percentage agreement/disagreement for certain statements
        const statsContainer = document.getElementById('qla-stats');
        if (statsContainer) {
            statsContainer.innerHTML = "<p>Other QLA stats will go here.</p>";
        }
    }

    async function handleQLAChatSubmit() {
        const inputElement = document.getElementById('qla-chat-input');
        const dropdownElement = document.getElementById('qla-question-dropdown');
        const responseContainer = document.getElementById('qla-ai-response');

        if (!inputElement || !dropdownElement || !responseContainer) return;

        const userQuery = inputElement.value.trim();
        const selectedQuestion = dropdownElement.value;
        let queryForAI = userQuery;

        if (!queryForAI && selectedQuestion) {
            queryForAI = selectedQuestion; // Use dropdown question if input is empty
        }

        if (!queryForAI) {
            responseContainer.textContent = "Please type a question or select one from the dropdown.";
            return;
        }

        responseContainer.textContent = "Thinking...";
        log("Sending QLA query to AI:", queryForAI);

        try {
            // This is where you'd make a call to your Heroku backend
            // The backend would then use the OpenAI API with the relevant question data context.
            const aiResponse = await fetch(`${config.herokuAppUrl}/api/qla-chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Send the query AND relevant context (e.g., data for the specific question or all QLA data)
                // Your Heroku app will need to be smart about how it uses this data with the OpenAI prompt.
                body: JSON.stringify({ query: queryForAI, questionData: allQuestionResponses /* or more filtered data */ })
            });

            if (!aiResponse.ok) {
                const errorData = await aiResponse.json();
                throw new Error(errorData.message || `AI request failed with status ${aiResponse.status}`);
            }

            const result = await aiResponse.json();
            responseContainer.textContent = result.answer; // Assuming your Heroku app returns { answer: "..." }
            log("AI Response for QLA:", result.answer);

        } catch (error) {
            errorLog("Error with QLA AI chat:", error);
            responseContainer.textContent = `Error: ${error.message}`;
        }
    }


    // --- Section 3: Student Comment Insights ---
    async function loadStudentCommentInsights(staffAdminId, establishmentId = null) {
        log(`Loading student comment insights with Staff Admin ID: ${staffAdminId}, Establishment ID: ${establishmentId}`);
        try {
            let vespaResults = []; // Initialize as empty array
            const filters = [];
            
            if (establishmentId) {
                // Super User mode - filter by establishment
                filters.push({
                    field: 'field_133',
                    operator: 'is',
                    value: establishmentId
                });
                vespaResults = await fetchDataFromKnack(objectKeys.vespaResults, filters);
                log("Fetched VESPA Results for comments (filtered by Establishment):", vespaResults ? vespaResults.length : 0);
            } else if (staffAdminId) {
                // Normal mode - filter by staff admin
                filters.push({
                    field: 'field_439', 
                    operator: 'is',
                    value: staffAdminId
                });
                vespaResults = await fetchDataFromKnack(objectKeys.vespaResults, filters);
                log("Fetched VESPA Results for comments (filtered by Staff Admin ID):", vespaResults ? vespaResults.length : 0);
            } else {
                 log("No Staff Admin ID or Establishment ID provided to loadStudentCommentInsights. Cannot filter comments.");
            }
            
            if (!Array.isArray(vespaResults)) {
                errorLog("loadStudentCommentInsights: vespaResults is not an array after fetch.", vespaResults);
                vespaResults = []; // Ensure it's an array to prevent further errors
            }

            const allComments = [];
            if (vespaResults.length > 0) { // Only proceed if we have results
                vespaResults.forEach(record => {
                    if (record.field_2302_raw) allComments.push(record.field_2302_raw); // RRC1
                    if (record.field_2303_raw) allComments.push(record.field_2303_raw); // RRC2
                    if (record.field_2304_raw) allComments.push(record.field_2304_raw); // RRC3
                    if (record.field_2499_raw) allComments.push(record.field_2499_raw); // GOAL1
                    if (record.field_2493_raw) allComments.push(record.field_2493_raw); // GOAL2
                    if (record.field_2494_raw) allComments.push(record.field_2494_raw); // GOAL3
                });
            }

            log("Total comments extracted:", allComments.length);

            // Render Word Cloud
            renderWordCloud(allComments);

            // Identify and Display Common Themes (this is more complex, might need NLP on Heroku)
            identifyCommonThemes(allComments);

        } catch (error) {
            errorLog("Failed to load student comment insights", error);
        }
    }

    function renderWordCloud(comments) {
        const container = document.getElementById('word-cloud-container');
        if (!container) return;
        log("Rendering word cloud.");
        // Use a library like WordCloud.js (https://wordcloud2.js.org/) or similar.
        // You'll need to process the text: concatenate, remove stop words, count frequencies.
        // Example (conceptual):
        // const textBlob = comments.join(" ");
        // const wordFrequencies = calculateWordFrequencies(textBlob);
        // WordCloud(container, { list: wordFrequencies });
        container.innerHTML = "<p>Word cloud will go here.</p>";

    }

    function identifyCommonThemes(comments) {
        const container = document.getElementById('common-themes-container');
        if (!container) return;
        log("Identifying common themes.");
        // This is a more advanced NLP task.
        // Simplistic: Count occurrences of keywords.
        // Advanced: Use your Heroku backend + OpenAI to summarize themes.
        // Example:
        // Send comments to Heroku -> Heroku uses OpenAI to extract themes -> display themes.
        container.innerHTML = "<p>Common themes will be listed here.</p>";
    }

    // --- Initialization ---
    async function initializeFullDashboard() {
        const targetElement = document.querySelector(elementSelector);
        if (!targetElement) {
            errorLog(`Target element "${elementSelector}" not found for dashboard.`);
            return;
        }

        // Get logged in user email from config or Knack directly
        let loggedInUserEmail = config.loggedInUserEmail;
    
        // If not in config, try to get from Knack
        if (!loggedInUserEmail && typeof Knack !== 'undefined' && Knack.getUserAttributes) {
            try {
                const userAttributes = Knack.getUserAttributes();
                loggedInUserEmail = userAttributes.email || userAttributes.values?.email;
                console.log("Got user email from Knack:", loggedInUserEmail);
            } catch (e) {
                console.error("Failed to get user email from Knack:", e);
            }
        }
    
        // If still no email, try alternative Knack method
        if (!loggedInUserEmail && typeof Knack !== 'undefined' && Knack.session && Knack.session.user) {
            try {
                loggedInUserEmail = Knack.session.user.email;
                console.log("Got user email from Knack session:", loggedInUserEmail);
            } catch (e) {
                console.error("Failed to get user email from Knack session:", e);
            }
        }

        if (!loggedInUserEmail) {
            errorLog("No loggedInUserEmail found in config. Cannot check user status.");
            renderDashboardUI(targetElement); // Render basic UI
            document.getElementById('overview-section').innerHTML = "<p>Cannot load dashboard: User email not found.</p>";
            document.getElementById('qla-section').innerHTML = "<p>Cannot load dashboard: User email not found.</p>";
            document.getElementById('student-insights-section').innerHTML = "<p>Cannot load dashboard: User email not found.</p>";
            return;
        }

        // --- New Logic: Prioritize Staff Admin check ---
        let staffAdminRecordId = null;
        let isStaffAdmin = false;

        try {
            staffAdminRecordId = await getStaffAdminRecordIdByEmail(loggedInUserEmail);
            if (staffAdminRecordId) {
                isStaffAdmin = true;
                log("User is a Staff Admin! Staff Admin Record ID:", staffAdminRecordId);
            } else {
                log("User is NOT a Staff Admin.");
            }
        } catch (e) {
            errorLog("Error checking Staff Admin status:", e);
        }

        // Only check Super User status if not already a Staff Admin
        if (!isStaffAdmin) {
            const checkSuperUser = await checkSuperUserStatus(loggedInUserEmail);
            if (checkSuperUser) {
                superUserRecordId = checkSuperUser;
                isSuperUser = true;
                log("User is a Super User!");
            } else {
                log("User is NOT a Super User.");
            }
        } else {
             log("User is a Staff Admin, skipping Super User check for primary role determination.");
        }

        renderDashboardUI(targetElement, isSuperUser); // Render main structure with Super User controls if applicable

        // Attempt to register Chart.js plugins globally if they are loaded
        if (typeof Chart !== 'undefined') {
            if (typeof ChartDataLabels !== 'undefined') {
                Chart.register(ChartDataLabels);
                log("ChartDataLabels plugin registered globally.");
            } else {
                log("ChartDataLabels plugin not found globally during init.");
            }
            
            // Attempt to register Annotation plugin (checking common global names)
            let annotationPlugin = null;
            if (typeof Annotation !== 'undefined') { // Direct global name
                annotationPlugin = Annotation;
            } else if (typeof Chart !== 'undefined' && Chart.Annotation) { // Often attached to Chart object
                annotationPlugin = Chart.Annotation;
            } else if (typeof window !== 'undefined' && window.ChartAnnotation) { // Another common global pattern
                annotationPlugin = window.ChartAnnotation;
            }

            if (annotationPlugin) {
                try {
                    Chart.register(annotationPlugin);
                    log("Annotation plugin registered globally.");
                } catch (e) {
                    errorLog("Error registering Annotation plugin globally: ", e)
                }
            } else {
                log("Annotation plugin not found globally (checked Annotation, Chart.Annotation, window.ChartAnnotation) during init. National average lines on histograms may not appear.");
            }
        } else {
            log("Chart.js core (Chart) not found globally during init. All charts will fail.");
        }

        // Load data based on role
        if (isStaffAdmin) {
            log("Loading dashboard for Staff Admin:", staffAdminRecordId);
            
            // Populate filter dropdowns
            await populateFilterDropdowns(staffAdminRecordId);
            
            // Initial data load (defaulting to cycle 1 or what's selected)
            const cycleSelectElement = document.getElementById('cycle-select');
            const initialCycle = cycleSelectElement ? parseInt(cycleSelectElement.value, 10) : 1;
            loadOverviewData(staffAdminRecordId, initialCycle);
            loadQLAData(staffAdminRecordId);
            loadStudentCommentInsights(staffAdminRecordId);

            // Add event listener for cycle selector
            if (cycleSelectElement) {
                cycleSelectElement.addEventListener('change', (event) => {
                    const selectedCycle = parseInt(event.target.value, 10);
                    log(`Cycle changed to: ${selectedCycle}`);
                    const activeFilters = getActiveFilters();
                    loadOverviewData(staffAdminRecordId, selectedCycle, activeFilters);
                    // Potentially re-load or filter QLA and Comment data too if they become cycle-dependent
                    // loadQLAData(staffAdminRecordId, selectedCycle);
                    // loadStudentCommentInsights(staffAdminRecordId, selectedCycle);
                });
            }
            
            // Add event listeners for filter buttons
            const applyFiltersBtn = document.getElementById('apply-filters-btn');
            if (applyFiltersBtn) {
                applyFiltersBtn.addEventListener('click', () => {
                    const selectedCycle = cycleSelectElement ? parseInt(cycleSelectElement.value, 10) : 1;
                    const activeFilters = getActiveFilters();
                    log("Applying filters:", activeFilters);
                    loadOverviewData(staffAdminRecordId, selectedCycle, activeFilters);
                });
            }
            
            const clearFiltersBtn = document.getElementById('clear-filters-btn');
            if (clearFiltersBtn) {
                clearFiltersBtn.addEventListener('click', () => {
                    // Clear all filter inputs
                    document.getElementById('student-search').value = '';
                    document.getElementById('group-filter').value = '';
                    document.getElementById('course-filter').value = '';
                    document.getElementById('year-group-filter').value = '';
                    document.getElementById('faculty-filter').value = '';
                    
                    // Clear the active filters display
                    updateActiveFiltersDisplay([]);
                    
                    // Reload data without filters
                    const selectedCycle = cycleSelectElement ? parseInt(cycleSelectElement.value, 10) : 1;
                    log("Clearing all filters");
                    loadOverviewData(staffAdminRecordId, selectedCycle, []);
                });
            }

        } else if (isSuperUser) {
            log("Super User mode active. Waiting for establishment selection.");
            document.getElementById('overview-section').style.display = 'none'; // Hide if super user and waiting for selection
            document.getElementById('qla-section').style.display = 'none';
            document.getElementById('student-insights-section').style.display = 'none';
            return; // Exit here for Super Users if they are not Staff Admins
        } else {
            errorLog("Neither Staff Admin nor Super User role found. Cannot load dashboard.");
            document.getElementById('overview-section').innerHTML = "<p>Cannot load dashboard: Your account does not have the required Staff Admin or Super User role.</p>";
            document.getElementById('qla-section').innerHTML = "<p>Cannot load dashboard: Your account does not have the required Staff Admin or Super User role.</p>";
            document.getElementById('student-insights-section').innerHTML = "<p>Cannot load dashboard: Your account does not have the required Staff Admin or Super User role.</p>";
        }
    }
    
    initializeFullDashboard(); // Call the main async initialization function
}

// Defensive check: If jQuery is used by Knack/other scripts, ensure this script runs after.
// However, the loader script (WorkingBridge.js) should handle calling initializeDashboardApp
// at the appropriate time.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // initializeDashboardApp(); // Not strictly necessary if WorkingBridge calls it
    });
} else {
    // initializeDashboardApp(); // Or call if DOM is already ready, though WorkingBridge is preferred.
}

// Make sure initializeDashboardApp is globally accessible if WorkingBridge.js calls it.
// If it's not already, you might need:
// window.initializeDashboardApp = initializeDashboardApp;
// However, since it's a top-level function in the script, it should be.
