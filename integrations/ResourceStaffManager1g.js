/**
 * Resource Portal Staff Manager
 * Management interface for Staff Admins to manage their resource portal staff accounts
 * Version: 1.0
 */

(function() {
    'use strict';
    
    console.log('[Resource Staff Manager] Script loaded, waiting for initialization...');
    
    function initializeResourceStaffManager() {
        const config = window.RESOURCE_STAFF_MANAGER_CONFIG;
        
        if (!config) {
            console.error('[Resource Staff Manager] Configuration not found');
            return;
        }
        
        console.log('[Resource Staff Manager] Initializing with config:', config);
        
        const DEBUG = config.debugMode || false;
        const API_URL = 'https://api.knack.com/v1';
        const APP_ID = config.knackAppId;
        const API_KEY = config.knackApiKey;
        
        // Helper function for logging
        function log(message, data) {
            if (DEBUG) {
                console.log(`[Resource Staff Manager] ${message}`, data || '');
            }
        }
        
        // Get current user details
        const currentUser = Knack.getUserAttributes();
        const userEmail = currentUser.email;
        
        // Try multiple ways to get the customer field ID
        let customerField = currentUser.values?.field_122 || currentUser.field_122;
        
        // Check if it's an array and extract the ID
        if (Array.isArray(customerField) && customerField.length > 0) {
            console.log('[Resource Staff Manager] Customer field is array:', customerField);
            // If array contains IDs directly
            customerField = customerField[0];
        }
        
        // Check for raw field format (this is the correct ID)
        if (currentUser.values?.field_122_raw) {
            console.log('[Resource Staff Manager] Found field_122_raw:', currentUser.values.field_122_raw);
            if (Array.isArray(currentUser.values.field_122_raw) && currentUser.values.field_122_raw.length > 0) {
                const rawItem = currentUser.values.field_122_raw[0];
                // The ID is what we need for filtering
                customerField = rawItem.id || rawItem;
            }
        } else if (typeof customerField === 'string' && customerField.includes('class=')) {
            // Extract ID from HTML: <span class="603e9f97cb8481001b31183d" ...>VESPA ACADEMY</span>
            const match = customerField.match(/class="([^"]+)"/);
            if (match) {
                customerField = match[1];
                console.log('[Resource Staff Manager] Extracted customer ID from HTML:', customerField);
            }
        }
        
        const schoolId = currentUser.values?.field_126 || currentUser.field_126;
        
        // Debug: Log full user details to understand the structure
        console.log('[Resource Staff Manager] === DEBUGGING CUSTOMER CONNECTION ===');
        console.log('[Resource Staff Manager] Full user attributes:', currentUser);
        console.log('[Resource Staff Manager] All user.values fields:', currentUser.values);
        console.log('[Resource Staff Manager] Final customerField value:', customerField);
        console.log('[Resource Staff Manager] Type of customerField:', typeof customerField);
        console.log('[Resource Staff Manager] Is customerField an array?:', Array.isArray(customerField));
        console.log('[Resource Staff Manager] School ID:', schoolId);
        
        log('Current user:', { email: userEmail, customer: customerField, schoolId: schoolId });
        
        // Vue App Instance
        let app = null;
        
        // Ensure Font Awesome is loaded
        function ensureFontAwesome() {
            if (!document.querySelector('link[href*="font-awesome"], link[href*="fontawesome"]')) {
                const faLink = document.createElement('link');
                faLink.rel = 'stylesheet';
                faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
                faLink.crossOrigin = 'anonymous';
                document.head.appendChild(faLink);
                console.log('[Resource Staff Manager] Font Awesome CSS loaded');
            } else {
                console.log('[Resource Staff Manager] Font Awesome already loaded');
            }
        }
        
        // Initialize the app
        async function init() {
            log('Starting initialization...');
            
            // Ensure Font Awesome is loaded
            ensureFontAwesome();
            
            // Inject styles
            injectStyles();
            
            // Create container
            const container = createContainer();
            if (!container) {
                console.error('[Resource Staff Manager] Failed to create container');
                return;
            }
            
            // Initialize Vue app
            initializeVueApp(container);
            
            // Load initial data
            await loadInitialData();
        }
        
        // Create container for the app
        function createContainer() {
            const targetSelector = config.elementSelector || '#kn-scene_1272';
            const targetElement = document.querySelector(targetSelector);
            
            if (!targetElement) {
                log('Target element not found:', targetSelector);
                return null;
            }
            
            // Clear existing content
            targetElement.innerHTML = '';
            
            // Create app container
            const appContainer = document.createElement('div');
            appContainer.id = 'resource-staff-manager';
            appContainer.className = 'resource-staff-manager-container';
            
            // Add loading state
            appContainer.innerHTML = `
                <div class="rsm-loading">
                    <div class="rsm-spinner"></div>
                    <p>Loading Staff Management...</p>
                </div>
            `;
            
            targetElement.appendChild(appContainer);
            log('Container created successfully');
            
            return appContainer;
        }
        
        // Initialize Vue App
        function initializeVueApp(container) {
            log('Initializing Vue app...');
            
            // Check if Vue is available
            if (typeof Vue === 'undefined') {
                console.error('[Resource Staff Manager] Vue is not loaded! Please ensure Vue.js is loaded before this script.');
                container.innerHTML = `
                    <div class="rsm-error" style="padding: 40px; text-align: center; color: #dc3545;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 20px; display: block;"></i>
                        <h2>Error: Required Library Not Loaded</h2>
                        <p>Vue.js library is not available. Please refresh the page or contact support.</p>
                    </div>
                `;
                return;
            }
            
            log('Vue is available:', typeof Vue);
            
            // Vue component definition
            const ResourceStaffManager = {
                template: `
                    <div class="rsm-app">
                        <!-- Header -->
                        <div class="rsm-header">
                            <h1><i class="fas fa-users-cog"></i> Staff Account Management</h1>
                            <p class="rsm-subtitle">Manage your Resource Portal staff accounts</p>
                        </div>
                        
                        <!-- Account Summary -->
                        <div class="rsm-summary" v-if="summary">
                            <h2><i class="fas fa-chart-line"></i> Account Overview</h2>
                            <div class="rsm-summary-cards">
                                <div class="rsm-card">
                                    <div class="rsm-card-icon"><i class="fas fa-calendar-alt"></i></div>
                                    <div class="rsm-card-content">
                                        <label>Subscription Start</label>
                                        <span>{{ formatDate(summary.subscriptionStartRaw || summary.subscriptionStart, true) }}</span>
                                    </div>
                                </div>
                                <div class="rsm-card">
                                    <div class="rsm-card-icon"><i class="fas fa-calendar-check"></i></div>
                                    <div class="rsm-card-content">
                                        <label>Renewal Date</label>
                                        <span>{{ formatDate(summary.renewalDateRaw || summary.renewalDate, true) }}</span>
                                    </div>
                                </div>
                                <div class="rsm-card">
                                    <div class="rsm-card-icon"><i class="fas fa-user-shield"></i></div>
                                    <div class="rsm-card-content">
                                        <label>VESPA Coordinator</label>
                                        <span>{{ summary.coordinator }}</span>
                                    </div>
                                </div>
                                <div class="rsm-card" :class="{'warning': summary.limitReached}">
                                    <div class="rsm-card-icon"><i class="fas fa-users"></i></div>
                                    <div class="rsm-card-content">
                                        <label>Accounts Used</label>
                                        <span>{{ summary.accountsUsed }} / {{ summary.totalAccounts }}</span>
                                        <div class="rsm-progress">
                                            <div class="rsm-progress-bar" :style="{width: accountUsagePercentage + '%'}"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div v-if="summary.limitReached" class="rsm-alert rsm-alert-warning">
                                <i class="fas fa-exclamation-triangle"></i>
                                Account limit reached. Please contact support to add more accounts.
                            </div>
                        </div>
                        
                        <!-- Action Buttons -->
                        <div class="rsm-actions">
                            <button @click="showAddStaffModal" class="rsm-btn rsm-btn-primary" :disabled="summary?.limitReached">
                                <i class="fas fa-user-plus"></i> Add New Staff Member
                            </button>
                            <button @click="showCsvUploadModal" class="rsm-btn rsm-btn-primary" :disabled="summary?.limitReached" title="Upload multiple staff from CSV">
                                <i class="fas fa-file-csv"></i> CSV Upload
                            </button>
                            <button @click="toggleBulkMode" class="rsm-btn rsm-btn-secondary" v-if="staffList.length > 0">
                                <i class="fas fa-check-square"></i> {{ bulkMode ? 'Cancel Selection' : 'Select Multiple' }}
                            </button>
                            <button @click="bulkDelete" class="rsm-btn rsm-btn-danger" v-if="bulkMode && selectedStaff.length > 0">
                                <i class="fas fa-trash"></i> Delete Selected ({{ selectedStaff.length }})
                            </button>
                            <button @click="bulkResetPassword" class="rsm-btn rsm-btn-warning" v-if="bulkMode && selectedStaff.length > 0">
                                <i class="fas fa-key"></i> Reset Passwords
                            </button>
                            <button @click="refreshData" class="rsm-btn rsm-btn-secondary">
                                <i class="fas fa-sync-alt" :class="{'fa-spin': loading}"></i> Refresh
                            </button>
                        </div>
                        
                        <!-- Staff Table -->
                        <div class="rsm-table-container" v-if="!loading">
                            <table class="rsm-table">
                                <thead>
                                    <tr>
                                        <th v-if="bulkMode" class="rsm-checkbox-col">
                                            <input type="checkbox" @change="selectAll" v-model="allSelected">
                                        </th>
                                        <th>Staff Name</th>
                                        <th>Email</th>
                                        <th class="text-center">Logged In</th>
                                        <th>Date Added</th>
                                        <th>Last Login</th>
                                        <th class="text-center">Page Views</th>
                                        <th class="text-center">Logins</th>
                                        <th class="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="staff in filteredStaffList" :key="staff.id" 
                                        :class="{'rsm-inactive': !staff.hasLoggedIn}">
                                        <td v-if="bulkMode" class="rsm-checkbox-col">
                                            <input type="checkbox" v-model="selectedStaff" :value="staff.id">
                                        </td>
                                        <td>
                                            <div class="rsm-staff-name">
                                                <strong>{{ staff.name }}</strong>
                                                <div class="rsm-badges">
                                                    <span v-if="staff.group" class="rsm-badge">{{ staff.group }}</span>
                                                    <span class="rsm-badge" :class="{'rsm-badge-resource': staff.isResourcePortal, 'rsm-badge-warning': !staff.isResourcePortal}">
                                                        {{ staff.accountType }}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{{ staff.email }}</td>
                                        <td class="text-center">
                                            <span v-if="staff.hasLoggedIn" class="rsm-status-icon rsm-success">
                                                <i class="fas fa-check-circle"></i>
                                            </span>
                                            <span v-else class="rsm-status-icon rsm-danger">
                                                <i class="fas fa-times-circle"></i>
                                            </span>
                                        </td>
                                        <td>{{ formatDate(staff.dateAddedRaw || staff.dateAdded, true) }}</td>
                                        <td>{{ formatDate(staff.lastLoginRaw || staff.lastLogin, true) }}</td>
                                        <td class="text-center">{{ staff.pageViews || 0 }}</td>
                                        <td class="text-center">{{ staff.loginCount || 0 }}</td>
                                        <td class="text-center rsm-actions-cell">
                                            <button @click="editStaff(staff)" class="rsm-btn-icon" title="Edit">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button @click="resetPassword(staff)" class="rsm-btn-icon" title="Reset Password">
                                                <i class="fas fa-key"></i>
                                            </button>
                                            <button @click="deleteStaff(staff)" class="rsm-btn-icon rsm-btn-icon-danger" title="Delete">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                    <tr v-if="filteredStaffList.length === 0">
                                        <td :colspan="bulkMode ? 9 : 8" class="text-center">
                                            <div class="rsm-empty-state">
                                                <i class="fas fa-users fa-3x"></i>
                                                <p>No staff members found</p>
                                                <button @click="showAddStaffModal" class="rsm-btn rsm-btn-primary" v-if="!summary?.limitReached">
                                                    <i class="fas fa-user-plus"></i> Add Your First Staff Member
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        
                        <!-- Loading State -->
                        <div v-if="loading" class="rsm-loading-overlay">
                            <div class="rsm-spinner"></div>
                            <p>Loading staff data...</p>
                        </div>
                        
                        <!-- Add/Edit Staff Modal -->
                        <div v-if="modalVisible" class="rsm-modal-overlay" @click.self="closeModal">
                            <div class="rsm-modal">
                                <div class="rsm-modal-header">
                                    <h3>{{ editingStaff ? 'Edit Staff Member' : 'Add New Staff Member' }}</h3>
                                    <button @click="closeModal" class="rsm-modal-close">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                                <div class="rsm-modal-body">
                                    <form @submit.prevent="saveStaff">
                                        <div class="rsm-form-row">
                                            <div class="rsm-form-group">
                                                <label>Title</label>
                                                <select v-model="staffForm.prefix">
                                                    <option value="">Select...</option>
                                                    <option value="Mr">Mr</option>
                                                    <option value="Mrs">Mrs</option>
                                                    <option value="Ms">Ms</option>
                                                    <option value="Miss">Miss</option>
                                                    <option value="Dr">Dr</option>
                                                </select>
                                            </div>
                                            <div class="rsm-form-group">
                                                <label>First Name <span class="required">*</span></label>
                                                <input type="text" v-model="staffForm.firstName" required>
                                            </div>
                                            <div class="rsm-form-group">
                                                <label>Last Name <span class="required">*</span></label>
                                                <input type="text" v-model="staffForm.lastName" required>
                                            </div>
                                        </div>
                                        <div class="rsm-form-group">
                                            <label>Email Address <span class="required">*</span></label>
                                            <input type="email" v-model="staffForm.email" required :disabled="editingStaff">
                                        </div>
                                        <div class="rsm-form-row">
                                            <div class="rsm-form-group">
                                                <label>Year Group (Optional)</label>
                                                <input type="text" v-model="staffForm.yearGroup" placeholder="e.g., Year 12">
                                            </div>
                                            <div class="rsm-form-group">
                                                <label>Group/Department (Optional)</label>
                                                <input type="text" v-model="staffForm.group" placeholder="e.g., Science">
                                            </div>
                                        </div>
                                        <div class="rsm-modal-footer">
                                            <button type="button" @click="closeModal" class="rsm-btn rsm-btn-secondary">
                                                Cancel
                                            </button>
                                            <button type="submit" class="rsm-btn rsm-btn-primary" :disabled="saving">
                                                <i v-if="saving" class="fas fa-spinner fa-spin"></i>
                                                {{ editingStaff ? 'Update' : 'Add Staff Member' }}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Delete Confirmation Modal -->
                        <div v-if="deleteModalVisible" class="rsm-modal-overlay" @click.self="closeDeleteModal">
                            <div class="rsm-modal rsm-modal-small">
                                <div class="rsm-modal-header rsm-modal-header-danger">
                                    <h3><i class="fas fa-exclamation-triangle"></i> Confirm Deletion</h3>
                                </div>
                                <div class="rsm-modal-body">
                                    <p v-if="!bulkDeleteMode">
                                        Are you sure you want to delete <strong>{{ staffToDelete?.name }}</strong>?
                                        This action cannot be undone.
                                    </p>
                                    <p v-else>
                                        Are you sure you want to delete <strong>{{ selectedStaff.length }}</strong> staff members?
                                        This action cannot be undone.
                                    </p>
                                </div>
                                <div class="rsm-modal-footer">
                                    <button @click="closeDeleteModal" class="rsm-btn rsm-btn-secondary">
                                        Cancel
                                    </button>
                                    <button @click="confirmDelete" class="rsm-btn rsm-btn-danger" :disabled="deleting">
                                        <i v-if="deleting" class="fas fa-spinner fa-spin"></i>
                                        Yes, Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- CSV Upload Modal -->
                        <div v-if="csvModalVisible" class="rsm-modal-overlay" @click.self="closeCsvModal">
                            <div class="rsm-modal">
                                <div class="rsm-modal-header">
                                    <h3>Upload Staff from CSV</h3>
                                    <button @click="closeCsvModal" class="rsm-modal-close">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                                <div class="rsm-modal-body">
                                    <div class="rsm-csv-info">
                                        <p><strong>CSV Format Requirements:</strong></p>
                                        <ul>
                                            <li>Required: First Name, Last Name, Email</li>
                                            <li>Optional: Title, Year Group, Group</li>
                                            <li>Maximum {{ summary?.accountsRemaining || 0 }} staff can be imported</li>
                                        </ul>
                                        <button @click="downloadCsvTemplate" class="rsm-btn rsm-btn-secondary">
                                            <i class="fas fa-download"></i> Download CSV Template
                                        </button>
                                    </div>
                                    
                                    <div class="rsm-form-group" style="margin-top: 20px;">
                                        <label>Select CSV File</label>
                                        <input type="file" 
                                               @change="handleCsvFile" 
                                               accept=".csv" 
                                               ref="csvFileInput"
                                               class="rsm-form-control">
                                    </div>
                                    
                                    <div v-if="csvData.length > 0" class="rsm-csv-preview">
                                        <h4>Preview ({{ csvData.length }} staff to import)</h4>
                                        <table class="rsm-table">
                                            <thead>
                                                <tr>
                                                    <th>Title</th>
                                                    <th>First Name</th>
                                                    <th>Last Name</th>
                                                    <th>Email</th>
                                                    <th>Year Group</th>
                                                    <th>Group</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr v-for="(row, index) in csvData.slice(0, 5)" :key="index">
                                                    <td>{{ row.title || '-' }}</td>
                                                    <td>{{ row.firstName }}</td>
                                                    <td>{{ row.lastName }}</td>
                                                    <td>{{ row.email }}</td>
                                                    <td>{{ row.yearGroup || '-' }}</td>
                                                    <td>{{ row.group || '-' }}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                        <p v-if="csvData.length > 5" style="margin: 10px 0; color: #666;">
                                            ...and {{ csvData.length - 5 }} more staff members
                                        </p>
                                        
                                        <div v-if="csvErrors.length > 0" class="rsm-alert rsm-alert-danger">
                                            <strong>Validation Errors:</strong>
                                            <ul style="margin-top: 10px;">
                                                <li v-for="error in csvErrors" :key="error">{{ error }}</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                                <div class="rsm-modal-footer">
                                    <button @click="closeCsvModal" class="rsm-btn rsm-btn-secondary">Cancel</button>
                                    <button @click="uploadCsvData" 
                                            class="rsm-btn rsm-btn-primary" 
                                            :disabled="csvData.length === 0 || csvErrors.length > 0 || csvUploading">
                                        <i class="fas" :class="csvUploading ? 'fa-spinner fa-spin' : 'fa-upload'"></i>
                                        {{ csvUploading ? 'Uploading (' + csvUploadProgress + '/' + csvData.length + ')...' : 'Import Staff' }}
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Success/Error Messages -->
                        <div v-if="message" class="rsm-message" :class="'rsm-message-' + messageType">
                            <i :class="messageIcon"></i>
                            {{ message }}
                        </div>
                    </div>
                `,
                data() {
                    return {
                        loading: false,
                        saving: false,
                        deleting: false,
                        summary: null,
                        staffList: [],
                        filteredStaffList: [],
                        bulkMode: false,
                        selectedStaff: [],
                        allSelected: false,
                        modalVisible: false,
                        deleteModalVisible: false,
                        csvModalVisible: false,
                        editingStaff: null,
                        staffToDelete: null,
                        bulkDeleteMode: false,
                        csvData: [],
                        csvErrors: [],
                        csvUploading: false,
                        csvUploadProgress: 0,
                        staffForm: {
                            prefix: '',
                            firstName: '',
                            lastName: '',
                            email: '',
                            yearGroup: '',
                            group: ''
                        },
                        message: '',
                        messageType: 'success',
                        messageIcon: 'fas fa-check-circle'
                    };
                },
                computed: {
                    accountUsagePercentage() {
                        if (!this.summary) return 0;
                        const total = this.summary.accountsUsed + this.summary.accountsRemaining;
                        return total > 0 ? (this.summary.accountsUsed / total) * 100 : 0;
                    }
                },
                methods: {
                    // Load initial data
                    async loadData() {
                        this.loading = true;
                        try {
                            // Load customer summary
                            await this.loadCustomerSummary();
                            // Load staff list
                            await this.loadStaffList();
                        } catch (error) {
                            this.showMessage('Error loading data: ' + error.message, 'error');
                        } finally {
                            this.loading = false;
                        }
                    },
                    
                    // Load customer summary
                    async loadCustomerSummary() {
                        try {
                            // Try direct lookup using the customer ID
                            const url = `objects/object_2/records/${customerField}`;
                            
                            try {
                                const customer = await this.apiRequest('GET', url);
                                
                                if (customer && customer.id) {
                                    this.summary = {
                                        subscriptionStart: customer.field_2997,
                                        subscriptionStartRaw: customer.field_2997_raw,
                                        renewalDate: customer.field_1622,
                                        renewalDateRaw: customer.field_1622_raw,
                                        coordinator: this.formatName(customer.field_49_raw || customer.field_49),
                                        accountsUsed: parseInt(customer.field_1564) || 0,
                                        accountsRemaining: parseInt(customer.field_1508) || 0,
                                        totalAccounts: (parseInt(customer.field_1564) || 0) + (parseInt(customer.field_1508) || 0),
                                        limitReached: customer.field_1481 === 'Yes' || customer.field_1481 === true
                                    };
                                    console.log('[Resource Staff Manager] Customer summary loaded via direct ID lookup');
                                }
                            } catch (directError) {
                                console.log('[Resource Staff Manager] Direct customer lookup failed, error:', directError);
                            }
                        } catch (error) {
                            console.error('Error loading customer summary:', error);
                        }
                    },
                    
                    // Load staff list
                    async loadStaffList() {
                        try {
                            console.log('[Resource Staff Manager] === LOADING STAFF LIST ===');
                            console.log('[Resource Staff Manager] CustomerField being used:', customerField);
                            console.log('[Resource Staff Manager] CustomerField type:', typeof customerField);
                            
                            // Use profile_7 for Tutor role, and filter by customer ID
                            const filters = [
                                {
                                    field: 'field_122',
                                    operator: 'is',
                                    value: customerField  // This should be the customer record ID
                                },
                                {
                                    field: 'field_73',
                                    operator: 'contains',
                                    value: 'profile_7'  // This is how Tutor role is stored
                                },
                                {
                                    field: 'field_441',
                                    operator: 'contains',
                                    value: 'RESOURCE PORTAL'  // Full value you set
                                }
                            ];
                            
                            // Note: Tutors need field_122 set to the customer ID to appear
                            
                            console.log('[Resource Staff Manager] Filters being used:', JSON.stringify(filters, null, 2));
                            
                            const response = await this.apiRequest('GET', 'objects/object_3/records', {
                                filters: filters,
                                rows_per_page: 1000
                            });
                            
                            console.log('[Resource Staff Manager] Number of records found:', response.records?.length || 0);
                            
                            // If no records found, try without filters to test API
                            if (!response.records || response.records.length === 0) {
                                console.log('[Resource Staff Manager] No records found with filters. Testing API without filters...');
                                const testResponse = await this.apiRequest('GET', 'objects/object_3/records', {
                                    rows_per_page: 5 // Just get 5 records to test
                                });
                                console.log('[Resource Staff Manager] Test without filters found:', testResponse.records?.length || 0, 'records');
                                if (testResponse.records && testResponse.records.length > 0) {
                                    console.log('[Resource Staff Manager] Sample record from unfiltered test:', testResponse.records[0]);
                                    console.log('[Resource Staff Manager] Sample field_122:', testResponse.records[0].field_122);
                                    console.log('[Resource Staff Manager] Sample field_122_raw:', testResponse.records[0].field_122_raw);
                                }
                            }
                            
                            // Log first record details if any found
                            if (response.records && response.records.length > 0) {
                                console.log('[Resource Staff Manager] First record sample:', response.records[0]);
                                console.log('[Resource Staff Manager] First record field_122:', response.records[0].field_122);
                                console.log('[Resource Staff Manager] First record field_441:', response.records[0].field_441);
                                console.log('[Resource Staff Manager] First record field_73:', response.records[0].field_73);
                            }
                            
                            if (response.records) {
                                this.staffList = response.records.map(record => {
                                    // Extract email from HTML or raw field
                                    let email = '';
                                    if (record.field_70_raw?.email) {
                                        email = record.field_70_raw.email;
                                    } else if (record.field_70) {
                                        // Extract from HTML like <a href="mailto:email@example.com">email@example.com</a>
                                        const match = record.field_70.match(/mailto:([^"]+)"/);
                                        email = match ? match[1] : record.field_70;
                                    }
                                    
                                    return {
                                        id: record.id,
                                        name: this.formatName(record.field_69_raw || record.field_69),
                                        firstName: record.field_69_raw?.first || '',
                                        lastName: record.field_69_raw?.last || '',
                                        prefix: record.field_69_raw?.title || '',
                                        email: email,
                                        hasLoggedIn: record.field_189 === 'Yes' || record.field_189 === true || record.field_189_raw === true,
                                        dateAdded: record.field_549,
                                        dateAddedRaw: record.field_549_raw,
                                        lastLogin: record.field_575,
                                        lastLoginRaw: record.field_575_raw,
                                        pageViews: parseInt(record.field_3201) || 0,
                                        loginCount: parseInt(record.field_3208) || 0,
                                        group: record.field_216 || record.field_550 || '', // Try both fields
                                        yearGroup: record.field_550 || '',
                                        accountType: record.field_441 || 'Not Set', // Show account type
                                        isResourcePortal: record.field_441 && record.field_441.toString().toUpperCase().includes('RESOURCE')
                                    };
                                });
                                
                                this.filteredStaffList = [...this.staffList];
                            }
                        } catch (error) {
                            console.error('Error loading staff list:', error);
                        }
                    },
                    
                    // API Request helper
                    async apiRequest(method, endpoint, data = {}) {
                        const options = {
                            method: method,
                            headers: {
                                'X-Knack-Application-Id': APP_ID,
                                'X-Knack-REST-API-KEY': API_KEY,
                                'Content-Type': 'application/json'
                            }
                        };
                        
                        let url = `${API_URL}/${endpoint}`;
                        
                        if (method === 'GET' && data.filters) {
                            const filters = encodeURIComponent(JSON.stringify(data.filters));
                            url += `?filters=${filters}`;
                            if (data.rows_per_page) {
                                url += `&rows_per_page=${data.rows_per_page}`;
                            }
                            
                            // Debug logging
                            console.log('[Resource Staff Manager] API Request URL:', url);
                            console.log('[Resource Staff Manager] Decoded filters:', data.filters);
                        } else if (method !== 'GET') {
                            options.body = JSON.stringify(data);
                        }
                        
                        const response = await fetch(url, options);
                        
                        // Log response status
                        console.log('[Resource Staff Manager] API Response Status:', response.status, response.statusText);
                        
                        if (!response.ok) {
                            const errorBody = await response.text();
                            console.error('[Resource Staff Manager] API Error Response:', errorBody);
                            throw new Error(`API request failed: ${response.statusText} - ${errorBody}`);
                        }
                        
                        const jsonResponse = await response.json();
                        console.log('[Resource Staff Manager] API Response Data:', jsonResponse);
                        
                        return jsonResponse;
                    },
                    
                    // Format name from raw field
                    formatName(nameField) {
                        if (typeof nameField === 'string') return nameField;
                        if (!nameField) return '';
                        const parts = [];
                        if (nameField.title) parts.push(nameField.title);
                        if (nameField.first) parts.push(nameField.first);
                        if (nameField.last) parts.push(nameField.last);
                        return parts.join(' ');
                    },
                    
                    // Format date
                    formatDate(dateInput, useRaw = false) {
                        if (!dateInput) return 'Never';
                        
                        // If we have a raw date object with timestamp or date
                        if (useRaw && typeof dateInput === 'object') {
                            // Try timestamp first (includes time)
                            if (dateInput.timestamp) {
                                const date = new Date(dateInput.timestamp);
                                if (!isNaN(date.getTime())) {
                                    return date.toLocaleDateString('en-GB', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                    });
                                }
                            }
                            // Try US format date (mm/dd/yyyy)
                            if (dateInput.date) {
                                const date = new Date(dateInput.date);
                                if (!isNaN(date.getTime())) {
                                    return date.toLocaleDateString('en-GB', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                    });
                                }
                            }
                            // Try UK formatted date
                            if (dateInput.date_formatted) {
                                dateInput = dateInput.date_formatted;
                            }
                        }
                        
                        // Handle string dates
                        let dateString = dateInput.toString();
                        
                        // Remove time suffix if present (e.g., "10:27am" from "27/08/2025 10:27am")
                        dateString = dateString.replace(/\s+\d{1,2}:\d{2}[ap]m$/i, '');
                        
                        // Try UK format (dd/mm/yyyy)
                        if (dateString.includes('/')) {
                            const parts = dateString.split('/');
                            if (parts.length === 3) {
                                const date = new Date(parts[2], parts[1] - 1, parts[0]);
                                if (!isNaN(date.getTime()) && date.getFullYear() > 2000) {
                                    return date.toLocaleDateString('en-GB', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric'
                                    });
                                }
                            }
                        }
                        
                        // Try direct parse as last resort
                        const date = new Date(dateString);
                        if (!isNaN(date.getTime()) && date.getFullYear() > 2000) {
                            return date.toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                            });
                        }
                        
                        return 'Never';
                    },
                    
                    // Toggle bulk mode
                    toggleBulkMode() {
                        this.bulkMode = !this.bulkMode;
                        this.selectedStaff = [];
                        this.allSelected = false;
                    },
                    
                    // Select all
                    selectAll() {
                        if (this.allSelected) {
                            this.selectedStaff = this.filteredStaffList.map(s => s.id);
                        } else {
                            this.selectedStaff = [];
                        }
                    },
                    
                    // Show add staff modal
                    showAddStaffModal() {
                        if (this.summary?.limitReached) {
                            this.showMessage('Account limit reached. Please contact support to add more accounts.', 'warning');
                            return;
                        }
                        this.editingStaff = null;
                        this.staffForm = {
                            prefix: '',
                            firstName: '',
                            lastName: '',
                            email: '',
                            yearGroup: '',
                            group: ''
                        };
                        this.modalVisible = true;
                    },
                    
                    // Edit staff
                    editStaff(staff) {
                        this.editingStaff = staff;
                        this.staffForm = {
                            prefix: staff.prefix,
                            firstName: staff.firstName,
                            lastName: staff.lastName,
                            email: staff.email,
                            yearGroup: staff.yearGroup,
                            group: staff.group
                        };
                        this.modalVisible = true;
                    },
                    
                    // Save staff (create or update)
                    async saveStaff() {
                        this.saving = true;
                        try {
                            if (this.editingStaff) {
                                await this.updateStaff();
                            } else {
                                await this.createStaff();
                            }
                            this.closeModal();
                            await this.loadData();
                        } catch (error) {
                            this.showMessage('Error saving staff: ' + error.message, 'error');
                        } finally {
                            this.saving = false;
                        }
                    },
                    
                    // Create new staff member
                    async createStaff() {
                        // Generate temporary password
                        const tempPassword = this.generatePassword();
                        const staffName = `${this.staffForm.firstName} ${this.staffForm.lastName}`;
                        const staffEmail = this.staffForm.email;
                        
                        try {
                            // Create Object_3 record
                            const accountData = {
                                field_122: [customerField], // Connected VESPA Customer - uses the customer record ID
                                field_69: {
                                    title: this.staffForm.prefix,
                                    first: this.staffForm.firstName,
                                    last: this.staffForm.lastName
                                },
                                field_73: ['profile_7'], // User Role - use the profile ID not "Tutor"
                                field_216: this.staffForm.group, // Group
                                field_70: staffEmail, // Email
                                field_441: 'RESOURCE PORTAL', // Account Type
                                field_1493: 'Level 2 & 3', // Account Level
                                field_126: schoolId, // School ID
                                field_71: tempPassword, // Password
                                field_550: this.staffForm.yearGroup // Year Group
                            };
                            
                            const response = await this.apiRequest('POST', 'objects/object_3/records', accountData);
                            
                            // Update the auto-created Tutor record
                            await this.updateTutorRecord(staffEmail, this.staffForm.group, this.staffForm.yearGroup);
                            
                            // Send welcome email
                            let emailSent = false;
                            try {
                                await this.sendWelcomeEmail({
                                    email: staffEmail,
                                    name: staffName,
                                    password: tempPassword
                                });
                                emailSent = true;
                            } catch (emailError) {
                                console.error('[Resource Staff Manager] Failed to send welcome email:', emailError);
                            }
                            
                            // Send admin confirmation email
                            await this.sendAdminConfirmationEmail('Staff Account Created', [
                                `Staff Name: ${staffName}`,
                                `Email: ${staffEmail}`,
                                `Welcome Email: ${emailSent ? 'Sent successfully' : 'Failed to send - manual intervention required'}`
                            ]);
                            
                            this.showMessage(
                                emailSent 
                                    ? 'Staff member added successfully. Welcome email sent.' 
                                    : 'Staff member added but welcome email failed. Please send credentials manually.',
                                emailSent ? 'success' : 'warning'
                            );
                        } catch (error) {
                            console.error('[Resource Staff Manager] Error creating staff:', error);
                            throw error;
                        }
                    },
                    
                    // Update existing staff
                    async updateStaff() {
                        const updateData = {
                            field_69: {
                                title: this.staffForm.prefix,
                                first: this.staffForm.firstName,
                                last: this.staffForm.lastName
                            },
                            field_216: this.staffForm.group,
                            field_550: this.staffForm.yearGroup
                        };
                        
                        await this.apiRequest('PUT', `objects/object_3/records/${this.editingStaff.id}`, updateData);
                        this.showMessage('Staff member updated successfully.', 'success');
                    },
                    
                    // Update tutor record
                    async updateTutorRecord(email, group = '', yearGroup = '') {
                        try {
                            console.log('[Resource Staff Manager] Updating tutor record for:', email);
                            
                            // Get current user's email to find their Staff Admin record
                            const currentUser = Knack.getUserAttributes();
                            const adminEmail = currentUser.email;
                            
                            // Find the Staff Admin record (object_5) by email
                            let staffAdminRecordId = null;
                            try {
                                const adminFilters = [
                                    {
                                        field: 'field_121', // Email field in object_5
                                        operator: 'is',
                                        value: adminEmail
                                    }
                                ];
                                
                                const adminResponse = await this.apiRequest('GET', 'objects/object_5/records', {
                                    filters: adminFilters
                                });
                                
                                if (adminResponse.records && adminResponse.records.length > 0) {
                                    staffAdminRecordId = adminResponse.records[0].id;
                                    console.log('[Resource Staff Manager] Found Staff Admin record ID:', staffAdminRecordId);
                                } else {
                                    console.log('[Resource Staff Manager] No Staff Admin record found for current user, skipping field_225');
                                }
                            } catch (adminError) {
                                console.log('[Resource Staff Manager] Could not find Staff Admin record, skipping field_225:', adminError.message);
                            }
                            
                            // Find the tutor record by email
                            const filters = [
                                {
                                    field: 'field_96',
                                    operator: 'is',
                                    value: email
                                }
                            ];
                            
                            const response = await this.apiRequest('GET', 'objects/object_7/records', {
                                filters: filters
                            });
                            
                            if (response.records && response.records.length > 0) {
                                const tutorId = response.records[0].id;
                                
                                // Build update data
                                const updateData = {
                                    field_220: [customerField], // VESPA Customer
                                    field_216: group || this.staffForm.group, // Group
                                    field_562: yearGroup || this.staffForm.yearGroup // Year Group
                                };
                                
                                // Only add field_225 if we found a valid Staff Admin record
                                if (staffAdminRecordId) {
                                    updateData.field_225 = [staffAdminRecordId];
                                }
                                
                                console.log('[Resource Staff Manager] Updating tutor record with data:', updateData);
                                
                                await this.apiRequest('PUT', `objects/object_7/records/${tutorId}`, updateData);
                                console.log('[Resource Staff Manager] Tutor record updated successfully');
                            } else {
                                console.log('[Resource Staff Manager] No tutor record found for email:', email);
                            }
                        } catch (error) {
                            console.error('[Resource Staff Manager] Error updating tutor record:', error);
                        }
                    },
                    
                    // Delete staff
                    deleteStaff(staff) {
                        this.staffToDelete = staff;
                        this.bulkDeleteMode = false;
                        this.deleteModalVisible = true;
                    },
                    
                    // Bulk delete
                    bulkDelete() {
                        this.bulkDeleteMode = true;
                        this.deleteModalVisible = true;
                    },
                    
                    // Confirm delete
                    async confirmDelete() {
                        this.deleting = true;
                        try {
                            if (this.bulkDeleteMode) {
                                // Delete multiple staff
                                for (const staffId of this.selectedStaff) {
                                    await this.apiRequest('DELETE', `objects/object_3/records/${staffId}`);
                                }
                                this.showMessage(`${this.selectedStaff.length} staff members deleted successfully.`, 'success');
                                this.selectedStaff = [];
                                this.bulkMode = false;
                            } else {
                                // Delete single staff
                                await this.apiRequest('DELETE', `objects/object_3/records/${this.staffToDelete.id}`);
                                this.showMessage('Staff member deleted successfully.', 'success');
                            }
                            
                            this.closeDeleteModal();
                            await this.loadData();
                        } catch (error) {
                            this.showMessage('Error deleting staff: ' + error.message, 'error');
                        } finally {
                            this.deleting = false;
                        }
                    },
                    
                    // Reset password
                    async resetPassword(staff) {
                        if (!confirm(`Reset password for ${staff.name}?`)) return;
                        
                        try {
                            const newPassword = this.generatePassword();
                            
                            await this.apiRequest('PUT', `objects/object_3/records/${staff.id}`, {
                                field_71: newPassword
                            });
                            
                            // Send password reset email
                            let emailSent = false;
                            try {
                                await this.sendPasswordResetEmail({
                                    email: staff.email,
                                    name: staff.name,
                                    password: newPassword
                                });
                                emailSent = true;
                            } catch (emailError) {
                                console.error('[Resource Staff Manager] Failed to send password reset email:', emailError);
                            }
                            
                            // Send admin confirmation email
                            await this.sendAdminConfirmationEmail('Password Reset', [
                                `Staff Name: ${staff.name}`,
                                `Email: ${staff.email}`,
                                `Reset Email: ${emailSent ? 'Sent successfully' : 'Failed to send - please provide password manually'}`
                            ]);
                            
                            // Show success modal with details
                            this.showPasswordResetModal(staff, emailSent, newPassword);
                        } catch (error) {
                            this.showMessage('Error resetting password: ' + error.message, 'error');
                        }
                    },
                    
                    // Show password reset success modal
                    showPasswordResetModal(staff, emailSent, password) {
                        // Create a temporary modal for password reset confirmation
                        this.passwordResetModal = {
                            visible: true,
                            staff: staff,
                            emailSent: emailSent,
                            password: password
                        };
                        
                        this.showMessage(
                            emailSent 
                                ? 'Password reset successfully. Email sent to staff member.' 
                                : 'Password reset but email failed. Please provide credentials manually.',
                            emailSent ? 'success' : 'warning'
                        );
                    },
                    
                    // Bulk reset passwords
                    async bulkResetPassword() {
                        if (!confirm(`Reset passwords for ${this.selectedStaff.length} staff members?`)) return;
                        
                        try {
                            for (const staffId of this.selectedStaff) {
                                const staff = this.staffList.find(s => s.id === staffId);
                                if (staff) {
                                    await this.resetPassword(staff);
                                }
                            }
                            
                            this.selectedStaff = [];
                            this.bulkMode = false;
                        } catch (error) {
                            this.showMessage('Error resetting passwords: ' + error.message, 'error');
                        }
                    },
                    
                    // Generate password
                    generatePassword() {
                        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
                        let password = '';
                        for (let i = 0; i < 12; i++) {
                            password += chars.charAt(Math.floor(Math.random() * chars.length));
                        }
                        return password;
                    },
                    
                    // Send welcome email
                    async sendWelcomeEmail(data) {
                        try {
                            console.log('[Resource Staff Manager] Sending welcome email to:', data.email);
                            
                            // SendGrid API v3 format with personalizations
                            const emailData = {
                                personalizations: [{
                                    to: [{ email: data.email }],
                                    dynamic_template_data: {
                                        name: data.name.split(' ')[0], // First name only
                                        email: data.email,
                                        password: data.password,
                                        loginUrl: 'https://vespaacademy.knack.com/vespa-academy#home/'
                                    }
                                }],
                                from: {
                                    email: 'noreply@vespa.academy',
                                    name: 'VESPA Academy'
                                },
                                template_id: 'd-29e82dfb3bd14de6815f4b225b9ef7b3'
                            };
                            
                            const response = await fetch('https://vespa-sendgrid-proxy-660b8a5a8d51.herokuapp.com/api/send-email', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(emailData)
                            });
                            
                            const responseData = await response.text();
                            
                            if (!response.ok) {
                                console.error('[Resource Staff Manager] Email send failed. Status:', response.status, 'Response:', responseData);
                                throw new Error(`Failed to send email: ${response.status} - ${responseData}`);
                            }
                            
                            console.log('[Resource Staff Manager] Welcome email sent successfully to:', data.email);
                            return true;
                        } catch (error) {
                            console.error('[Resource Staff Manager] Error sending welcome email:', error);
                            throw error; // Re-throw to handle at calling level
                        }
                    },
                    
                    // Send password reset email
                    async sendPasswordResetEmail(data) {
                        try {
                            console.log('[Resource Staff Manager] Sending password reset email to:', data.email);
                            
                            // SendGrid API v3 format with personalizations
                            const emailData = {
                                personalizations: [{
                                    to: [{ email: data.email }],
                                    dynamic_template_data: {
                                        name: data.name.split(' ')[0], // First name only
                                        email: data.email,
                                        password: data.password,
                                        loginUrl: 'https://vespaacademy.knack.com/vespa-academy#home/'
                                    }
                                }],
                                from: {
                                    email: 'noreply@vespa.academy',
                                    name: 'VESPA Academy'
                                },
                                template_id: 'd-29e82dfb3bd14de6815f4b225b9ef7b3'
                            };
                            
                            const response = await fetch('https://vespa-sendgrid-proxy-660b8a5a8d51.herokuapp.com/api/send-email', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(emailData)
                            });
                            
                            const responseData = await response.text();
                            
                            if (!response.ok) {
                                console.error('[Resource Staff Manager] Password reset email failed. Status:', response.status, 'Response:', responseData);
                                throw new Error(`Failed to send password reset email: ${response.status} - ${responseData}`);
                            }
                            
                            console.log('[Resource Staff Manager] Password reset email sent successfully to:', data.email);
                            return true;
                        } catch (error) {
                            console.error('[Resource Staff Manager] Error sending password reset email:', error);
                            throw error;
                        }
                    },
                    
                    // Send confirmation email to staff admin
                    async sendAdminConfirmationEmail(action, details) {
                        try {
                            console.log('[Resource Staff Manager] Sending admin confirmation for:', action);
                            
                            const currentUser = Knack.getUserAttributes();
                            const adminEmail = currentUser.email;
                            const adminName = this.formatName(currentUser.values?.field_69_raw || currentUser.values?.field_69);
                            
                            // Prepare email list for notification
                            const emailList = details.map(item => `• ${item}`).join('<br>');
                            
                            // Send to staff admin - using SendGrid API v3 format
                            const adminEmailData = {
                                personalizations: [{
                                    to: [{ email: adminEmail }],
                                    cc: [{ email: 'admin@vespa.academy' }] // Always CC admin@vespa.academy
                                }],
                                from: {
                                    email: 'noreply@vespa.academy',
                                    name: 'VESPA Academy'
                                },
                                subject: `Resource Portal - ${action} Confirmation`,
                                content: [{
                                    type: 'text/html',
                                    value: `
                                        <p>Hi ${adminName.split(' ')[0] || 'Admin'},</p>
                                        <p>This email confirms the following ${action.toLowerCase()} action(s) in the Resource Portal:</p>
                                        <p><strong>Action Performed:</strong> ${action}</p>
                                        <p><strong>Details:</strong></p>
                                        <div style="margin-left: 20px;">
                                            ${emailList}
                                        </div>
                                        <p>Time: ${new Date().toLocaleString('en-GB')}</p>
                                        <p>If you have any questions, please contact support.</p>
                                        <p>Best regards,<br>VESPA Academy Team</p>
                                    `
                                }]
                            };
                            
                            const response = await fetch('https://vespa-sendgrid-proxy-660b8a5a8d51.herokuapp.com/api/send-email', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(adminEmailData)
                            });
                            
                            if (!response.ok) {
                                const responseData = await response.text();
                                console.error('[Resource Staff Manager] Admin confirmation email failed:', responseData);
                                // Don't throw - this is a non-critical failure
                            } else {
                                console.log('[Resource Staff Manager] Admin confirmation email sent successfully');
                            }
                        } catch (error) {
                            console.error('[Resource Staff Manager] Error sending admin confirmation:', error);
                            // Don't throw - this is a non-critical failure
                        }
                    },
                    
                    // Close modal
                    closeModal() {
                        this.modalVisible = false;
                        this.editingStaff = null;
                        this.staffForm = {
                            prefix: '',
                            firstName: '',
                            lastName: '',
                            email: '',
                            yearGroup: '',
                            group: ''
                        };
                    },
                    
                    // Close delete modal
                    closeDeleteModal() {
                        this.deleteModalVisible = false;
                        this.staffToDelete = null;
                        this.bulkDeleteMode = false;
                    },
                    
                    // Show message
                    showMessage(text, type = 'success') {
                        this.message = text;
                        this.messageType = type;
                        this.messageIcon = type === 'success' ? 'fas fa-check-circle' : 
                                          type === 'error' ? 'fas fa-exclamation-circle' : 
                                          'fas fa-exclamation-triangle';
                        
                        setTimeout(() => {
                            this.message = '';
                        }, 5000);
                    },
                    
                    // Refresh data
                    async refreshData() {
                        await this.loadData();
                        this.showMessage('Data refreshed successfully.', 'success');
                    },
                    
                    // CSV Upload Methods
                    showCsvUploadModal() {
                        this.csvModalVisible = true;
                        this.csvData = [];
                        this.csvErrors = [];
                        this.csvUploadProgress = 0;
                    },
                    
                    closeCsvModal() {
                        this.csvModalVisible = false;
                        this.csvData = [];
                        this.csvErrors = [];
                        this.csvUploadProgress = 0;
                        if (this.$refs.csvFileInput) {
                            this.$refs.csvFileInput.value = '';
                        }
                    },
                    
                    downloadCsvTemplate() {
                        const template = 'Title,First Name,Last Name,Email,Year Group,Group\n' +
                            'Mr,John,Smith,j.smith@school.edu,Year 12,Group A\n' +
                            'Ms,Jane,Doe,j.doe@school.edu,Year 13,Group B';
                        
                        const blob = new Blob([template], { type: 'text/csv' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'staff_template.csv';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                    },
                    
                    handleCsvFile(event) {
                        const file = event.target.files[0];
                        if (!file) return;
                        
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            this.parseCsv(e.target.result);
                        };
                        reader.readAsText(file);
                    },
                    
                    parseCsv(csvText) {
                        this.csvData = [];
                        this.csvErrors = [];
                        
                        // Split into lines and remove empty lines
                        const lines = csvText.split('\n').filter(line => line.trim());
                        if (lines.length < 2) {
                            this.csvErrors.push('CSV file must contain headers and at least one row of data');
                            return;
                        }
                        
                        // Parse headers
                        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                        
                        // Check for required columns
                        const requiredColumns = ['first name', 'last name', 'email'];
                        const missingColumns = requiredColumns.filter(col => !headers.includes(col));
                        if (missingColumns.length > 0) {
                            this.csvErrors.push(`Missing required columns: ${missingColumns.join(', ')}`);
                            return;
                        }
                        
                        // Find column indices
                        const colIndex = {
                            title: headers.indexOf('title'),
                            firstName: headers.indexOf('first name'),
                            lastName: headers.indexOf('last name'),
                            email: headers.indexOf('email'),
                            yearGroup: headers.indexOf('year group'),
                            group: headers.indexOf('group')
                        };
                        
                        // Parse data rows
                        for (let i = 1; i < lines.length; i++) {
                            const values = lines[i].split(',').map(v => v.trim());
                            
                            // Skip empty rows
                            if (!values[colIndex.firstName] && !values[colIndex.lastName] && !values[colIndex.email]) {
                                continue;
                            }
                            
                            const row = {
                                title: colIndex.title >= 0 ? values[colIndex.title] : '',
                                firstName: values[colIndex.firstName] || '',
                                lastName: values[colIndex.lastName] || '',
                                email: values[colIndex.email] || '',
                                yearGroup: colIndex.yearGroup >= 0 ? values[colIndex.yearGroup] : '',
                                group: colIndex.group >= 0 ? values[colIndex.group] : ''
                            };
                            
                            // Validate row
                            if (!row.firstName || !row.lastName || !row.email) {
                                this.csvErrors.push(`Row ${i}: Missing required fields (First Name, Last Name, or Email)`);
                                continue;
                            }
                            
                            // Validate email format
                            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                            if (!emailRegex.test(row.email)) {
                                this.csvErrors.push(`Row ${i}: Invalid email format (${row.email})`);
                                continue;
                            }
                            
                            this.csvData.push(row);
                        }
                        
                        // Check if too many staff
                        if (this.csvData.length > this.summary?.accountsRemaining) {
                            this.csvErrors.push(`Too many staff: ${this.csvData.length} in CSV but only ${this.summary.accountsRemaining} accounts remaining`);
                        }
                        
                        if (this.csvData.length === 0 && this.csvErrors.length === 0) {
                            this.csvErrors.push('No valid data found in CSV file');
                        }
                    },
                    
                    async uploadCsvData() {
                        if (this.csvData.length === 0 || this.csvErrors.length > 0) return;
                        
                        this.csvUploading = true;
                        this.csvUploadProgress = 0;
                        
                        const successfulUploads = [];
                        const failedUploads = [];
                        const emailResults = [];
                        
                        console.log('[Resource Staff Manager] Starting CSV upload for', this.csvData.length, 'staff members');
                        
                        for (let i = 0; i < this.csvData.length; i++) {
                            const staff = this.csvData[i];
                            this.csvUploadProgress = i + 1;
                            
                            try {
                                // Generate password for this staff member
                                const tempPassword = this.generatePassword();
                                const staffName = `${staff.firstName} ${staff.lastName}`;
                                
                                console.log(`[Resource Staff Manager] Creating account ${i + 1}/${this.csvData.length} for:`, staff.email);
                                
                                // Create staff record
                                const accountData = {
                                    field_122: [customerField], // Connected VESPA Customer
                                    field_69: {
                                        title: staff.title,
                                        first: staff.firstName,
                                        last: staff.lastName
                                    },
                                    field_73: ['profile_7'], // User Role
                                    field_216: staff.group, // Group
                                    field_70: staff.email, // Email
                                    field_441: 'RESOURCE PORTAL', // Account Type
                                    field_1493: 'Level 2 & 3', // Account Level
                                    field_126: schoolId, // School ID
                                    field_71: tempPassword, // Password
                                    field_550: staff.yearGroup // Year Group
                                };
                                
                                const response = await this.apiRequest('POST', 'objects/object_3/records', accountData);
                                
                                if (response.id) {
                                    let emailSent = false;
                                    
                                    // Update tutor record
                                    await this.updateTutorRecord(staff.email, staff.group, staff.yearGroup);
                                    
                                    // Send welcome email
                                    try {
                                        await this.sendWelcomeEmail({
                                            name: staffName,
                                            email: staff.email,
                                            password: tempPassword
                                        });
                                        emailSent = true;
                                        emailResults.push(`✓ ${staff.email} - Welcome email sent`);
                                    } catch (emailError) {
                                        console.error(`[Resource Staff Manager] Failed to send email to ${staff.email}:`, emailError);
                                        emailResults.push(`✗ ${staff.email} - Email failed: ${emailError.message}`);
                                    }
                                    
                                    successfulUploads.push({
                                        ...staff,
                                        emailSent: emailSent,
                                        password: emailSent ? null : tempPassword // Only store password if email failed
                                    });
                                }
                            } catch (error) {
                                console.error(`[Resource Staff Manager] Failed to create staff ${staff.email}:`, error);
                                failedUploads.push({
                                    staff: staff,
                                    error: error.message || 'Unknown error'
                                });
                                emailResults.push(`✗ ${staff.email} - Account creation failed: ${error.message}`);
                            }
                        }
                        
                        this.csvUploading = false;
                        this.closeCsvModal();
                        
                        // Send admin confirmation email with detailed results
                        const summaryDetails = [
                            `Total Processed: ${this.csvData.length}`,
                            `Successfully Created: ${successfulUploads.length}`,
                            `Failed: ${failedUploads.length}`,
                            '',
                            'Email Results:'
                        ].concat(emailResults);
                        
                        await this.sendAdminConfirmationEmail('CSV Staff Upload', summaryDetails);
                        
                        // Show results
                        if (successfulUploads.length > 0) {
                            const emailsFailedCount = successfulUploads.filter(s => !s.emailSent).length;
                            let message = `Successfully imported ${successfulUploads.length} staff members`;
                            
                            if (emailsFailedCount > 0) {
                                message += ` (${emailsFailedCount} email(s) failed - check admin email for details)`;
                            }
                            
                            if (failedUploads.length > 0) {
                                message += `, ${failedUploads.length} failed`;
                            }
                            
                            this.showMessage(message + '.', failedUploads.length > 0 || emailsFailedCount > 0 ? 'warning' : 'success');
                            
                            // Reload staff list
                            await this.loadStaffList();
                        } else {
                            this.showMessage('Failed to import staff. Please check your data and try again.', 'error');
                        }
                        
                        // Log summary  
                        console.log('[Resource Staff Manager] CSV Upload Summary:', {
                            total: successfulUploads.length + failedUploads.length,
                            successful: successfulUploads.length,
                            failed: failedUploads.length,
                            emailResults: emailResults
                        });
                        
                        // Log failures for debugging
                        if (failedUploads.length > 0) {
                            console.error('[Resource Staff Manager] Failed uploads:', failedUploads);
                        }
                    }
                },
                mounted() {
                    this.loadData();
                }
            };
            
            // Create Vue instance
            app = Vue.createApp(ResourceStaffManager);
            app.mount(container);
            
            log('Vue app mounted successfully');
        }
        
        // Load initial data
        async function loadInitialData() {
            log('Loading initial data...');
            // Data loading is handled by Vue component
        }
        
        // Inject styles
        function injectStyles() {
            if (document.getElementById('resource-staff-manager-styles')) return;
            
            const styles = `
                <style id="resource-staff-manager-styles">
                    /* Full Width Container Overrides for Knack */
                    #kn-scene_1272 .kn-content {
                        max-width: 100% !important;
                        width: 100% !important;
                    }
                    
                    #kn-scene_1272 .kn-view {
                        max-width: 100% !important;
                        width: 100% !important;
                    }
                    
                    /* Container */
                    .resource-staff-manager-container {
                        padding: 20px;
                        width: calc(100% - 40px);
                        max-width: 1800px;
                        margin: 0 auto;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    }
                    
                    .rsm-app {
                        background: white;
                        border-radius: 12px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                        overflow: hidden;
                    }
                    
                    /* Header */
                    .rsm-header {
                        background: linear-gradient(135deg, #2a3c7a 0%, #5899a8 100%);
                        color: white;
                        padding: 30px;
                    }
                    
                    .rsm-header h1 {
                        margin: 0;
                        font-size: 28px;
                        font-weight: 700;
                        display: flex;
                        align-items: center;
                        gap: 12px;
                    }
                    
                    .rsm-subtitle {
                        margin: 8px 0 0 0;
                        opacity: 0.9;
                        font-size: 16px;
                    }
                    
                    /* Summary Cards */
                    .rsm-summary {
                        padding: 30px;
                        background: #f8f9fa;
                        border-bottom: 1px solid #dee2e6;
                    }
                    
                    .rsm-summary h2 {
                        margin: 0 0 20px 0;
                        color: #2a3c7a;
                        font-size: 20px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    
                    .rsm-summary-cards {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                        gap: 20px;
                    }
                    
                    .rsm-card {
                        background: white;
                        border-radius: 8px;
                        padding: 20px;
                        display: flex;
                        gap: 15px;
                        align-items: flex-start;
                        border: 1px solid #e0e0e0;
                        transition: all 0.3s ease;
                    }
                    
                    .rsm-card:hover {
                        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
                    }
                    
                    .rsm-card.warning {
                        border-color: #ffc107;
                        background: #fffbf0;
                    }
                    
                    .rsm-card-icon {
                        width: 40px;
                        height: 40px;
                        border-radius: 8px;
                        background: linear-gradient(135deg, #079baa 0%, #62d1d2 100%);
                        color: white;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-shrink: 0;
                    }
                    
                    .rsm-card-content {
                        flex: 1;
                    }
                    
                    .rsm-card-content label {
                        display: block;
                        color: #6c757d;
                        font-size: 12px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        margin-bottom: 4px;
                    }
                    
                    .rsm-card-content span {
                        display: block;
                        color: #2a3c7a;
                        font-size: 18px;
                        font-weight: 600;
                    }
                    
                    .rsm-progress {
                        margin-top: 8px;
                        height: 6px;
                        background: #e0e0e0;
                        border-radius: 3px;
                        overflow: hidden;
                    }
                    
                    .rsm-progress-bar {
                        height: 100%;
                        background: linear-gradient(90deg, #079baa 0%, #00e5db 100%);
                        transition: width 0.3s ease;
                    }
                    
                    /* Alert */
                    .rsm-alert {
                        padding: 12px 20px;
                        border-radius: 8px;
                        margin-top: 20px;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    
                    .rsm-alert-warning {
                        background: #fff3cd;
                        color: #856404;
                        border: 1px solid #ffc107;
                    }
                    
                    /* Actions */
                    .rsm-actions {
                        padding: 20px 30px;
                        display: flex;
                        gap: 10px;
                        flex-wrap: wrap;
                        border-bottom: 1px solid #dee2e6;
                    }
                    
                    /* Buttons */
                    .rsm-btn {
                        padding: 10px 20px;
                        border-radius: 6px;
                        border: none;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        font-size: 14px;
                    }
                    
                    .rsm-btn:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }
                    
                    .rsm-btn-primary {
                        background: linear-gradient(135deg, #079baa 0%, #00e5db 100%);
                        color: white;
                    }
                    
                    .rsm-btn-primary:hover:not(:disabled) {
                        transform: translateY(-1px);
                        box-shadow: 0 4px 12px rgba(7, 155, 170, 0.3);
                    }
                    
                    .rsm-btn-secondary {
                        background: #6c757d;
                        color: white;
                    }
                    
                    .rsm-btn-danger {
                        background: #dc3545;
                        color: white;
                    }
                    
                    .rsm-btn-warning {
                        background: #ffc107;
                        color: #212529;
                    }
                    
                    .rsm-btn-icon {
                        padding: 8px 10px;
                        background: transparent;
                        border: 1px solid #dee2e6;
                        color: #6c757d;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        border-radius: 4px;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                        min-width: 36px;
                        height: 36px;
                        font-size: 16px;
                    }
                    
                    .rsm-btn-icon:hover {
                        background: #f0f0f0;
                        color: #079baa;
                        border-color: #079baa;
                    }
                    
                    .rsm-btn-icon-danger:hover {
                        background: #fee;
                        color: #dc3545;
                        border-color: #dc3545;
                    }
                    
                    .rsm-btn-icon i {
                        font-size: 16px;
                    }
                    
                    /* Table */
                    .rsm-table-container {
                        padding: 30px;
                        overflow-x: auto;
                    }
                    
                    .rsm-table {
                        width: 100%;
                        min-width: 1000px;
                        border-collapse: collapse;
                        table-layout: auto;
                    }
                    
                    .rsm-table thead {
                        background: #f8f9fa;
                    }
                    
                    .rsm-table th {
                        padding: 12px;
                        text-align: left;
                        color: #2a3c7a;
                        font-weight: 600;
                        font-size: 13px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        border-bottom: 2px solid #dee2e6;
                        white-space: nowrap;
                    }
                    
                    .rsm-table th:last-child {
                        min-width: 120px;
                        text-align: center;
                    }
                    
                    .rsm-table td {
                        padding: 12px;
                        border-bottom: 1px solid #e9ecef;
                    }
                    
                    .rsm-table td:last-child {
                        padding: 8px;
                    }
                    
                    .rsm-table td .rsm-actions {
                        display: flex;
                        gap: 8px;
                        justify-content: center;
                    }
                    
                    .rsm-table tbody tr {
                        transition: background 0.2s ease;
                    }
                    
                    .rsm-table tbody tr:hover {
                        background: #f8f9fa;
                    }
                    
                    .rsm-table tbody tr.rsm-inactive {
                        opacity: 0.6;
                        background: #fafafa;
                    }
                    
                    .rsm-checkbox-col {
                        width: 40px;
                        text-align: center !important;
                    }
                    
                    .text-center {
                        text-align: center !important;
                    }
                    
                    .rsm-staff-name {
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                    }
                    
                    .rsm-badges {
                        display: flex;
                        gap: 4px;
                        flex-wrap: wrap;
                        margin-top: 4px;
                    }
                    
                    .rsm-badge {
                        display: inline-block;
                        padding: 2px 8px;
                        background: #e7f5ff;
                        color: #079baa;
                        border-radius: 4px;
                        font-size: 11px;
                        font-weight: 600;
                    }
                    
                    .rsm-badge-resource {
                        background: #d4edda;
                        color: #155724;
                    }
                    
                    .rsm-badge-warning {
                        background: #fff3cd;
                        color: #856404;
                    }
                    
                    .rsm-status-icon {
                        font-size: 18px;
                    }
                    
                    .rsm-success {
                        color: #28a745;
                    }
                    
                    .rsm-danger {
                        color: #dc3545;
                    }
                    
                    .rsm-actions-cell {
                        display: flex;
                        gap: 4px;
                        justify-content: center;
                    }
                    
                    /* Empty State */
                    .rsm-empty-state {
                        padding: 60px 20px;
                        text-align: center;
                        color: #6c757d;
                    }
                    
                    .rsm-empty-state i {
                        opacity: 0.2;
                        margin-bottom: 20px;
                    }
                    
                    .rsm-empty-state p {
                        margin: 0 0 20px 0;
                        font-size: 18px;
                    }
                    
                    /* Loading */
                    .rsm-loading,
                    .rsm-loading-overlay {
                        padding: 60px;
                        text-align: center;
                    }
                    
                    .rsm-loading-overlay {
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(255, 255, 255, 0.95);
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        z-index: 100;
                    }
                    
                    .rsm-spinner {
                        width: 40px;
                        height: 40px;
                        border: 4px solid #e0e0e0;
                        border-top-color: #079baa;
                        border-radius: 50%;
                        animation: rsm-spin 1s linear infinite;
                        margin: 0 auto 20px;
                    }
                    
                    @keyframes rsm-spin {
                        to { transform: rotate(360deg); }
                    }
                    
                    /* Modal */
                    .rsm-modal-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0, 0, 0, 0.5);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 1000;
                    }
                    
                    .rsm-modal {
                        background: white;
                        border-radius: 12px;
                        width: 90%;
                        max-width: 600px;
                        max-height: 90vh;
                        overflow: auto;
                        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    }
                    
                    .rsm-modal-small {
                        max-width: 400px;
                    }
                    
                    .rsm-modal-header {
                        padding: 20px;
                        border-bottom: 1px solid #dee2e6;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        background: #f8f9fa;
                    }
                    
                    .rsm-modal-header h3 {
                        margin: 0;
                        color: #2a3c7a;
                        font-size: 20px;
                    }
                    
                    .rsm-modal-header-danger {
                        background: #fee;
                        color: #dc3545;
                    }
                    
                    .rsm-modal-header-danger h3 {
                        color: #dc3545;
                    }
                    
                    .rsm-modal-close {
                        background: none;
                        border: none;
                        font-size: 24px;
                        color: #6c757d;
                        cursor: pointer;
                        padding: 0;
                        width: 30px;
                        height: 30px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 4px;
                        transition: all 0.2s ease;
                    }
                    
                    .rsm-modal-close:hover {
                        background: #e9ecef;
                    }
                    
                    .rsm-modal-body {
                        padding: 30px;
                    }
                    
                    .rsm-modal-footer {
                        padding: 20px 30px;
                        border-top: 1px solid #dee2e6;
                        display: flex;
                        justify-content: flex-end;
                        gap: 10px;
                        background: #f8f9fa;
                    }
                    
                    /* Form */
                    .rsm-form-row {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                        gap: 15px;
                        margin-bottom: 20px;
                    }
                    
                    .rsm-form-group {
                        margin-bottom: 20px;
                    }
                    
                    .rsm-form-group label {
                        display: block;
                        margin-bottom: 8px;
                        color: #495057;
                        font-weight: 600;
                        font-size: 14px;
                    }
                    
                    .rsm-form-group .required {
                        color: #dc3545;
                    }
                    
                    .rsm-form-group input,
                    .rsm-form-group select {
                        width: 100%;
                        padding: 10px 12px;
                        border: 1px solid #ced4da;
                        border-radius: 6px;
                        font-size: 14px;
                        transition: all 0.2s ease;
                    }
                    
                    .rsm-form-group input:focus,
                    .rsm-form-group select:focus {
                        outline: none;
                        border-color: #079baa;
                        box-shadow: 0 0 0 3px rgba(7, 155, 170, 0.1);
                    }
                    
                    .rsm-form-group input:disabled {
                        background: #e9ecef;
                        cursor: not-allowed;
                    }
                    
                    /* Message */
                    .rsm-message {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        padding: 15px 20px;
                        border-radius: 8px;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        z-index: 2000;
                        animation: rsm-slide-in 0.3s ease;
                    }
                    
                    @keyframes rsm-slide-in {
                        from {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }
                    
                    .rsm-message-success {
                        background: #d4edda;
                        color: #155724;
                        border: 1px solid #c3e6cb;
                    }
                    
                    .rsm-message-error {
                        background: #f8d7da;
                        color: #721c24;
                        border: 1px solid #f5c6cb;
                    }
                    
                    .rsm-message-warning {
                        background: #fff3cd;
                        color: #856404;
                        border: 1px solid #ffeeba;
                    }
                    
                    /* Responsive */
                    @media (max-width: 768px) {
                        .resource-staff-manager-container {
                            padding: 10px;
                        }
                        
                        .rsm-header {
                            padding: 20px;
                        }
                        
                        .rsm-header h1 {
                            font-size: 22px;
                        }
                        
                        .rsm-summary {
                            padding: 20px;
                        }
                        
                        .rsm-summary-cards {
                            grid-template-columns: 1fr;
                        }
                        
                        .rsm-actions {
                            padding: 15px 20px;
                        }
                        
                        .rsm-table-container {
                            padding: 20px;
                        }
                        
                        .rsm-modal {
                            width: 95%;
                        }
                        
                        .rsm-modal-body {
                            padding: 20px;
                        }
                        
                        .rsm-actions-cell {
                            flex-direction: column;
                        }
                    }
                    
                    /* Ensure Vue app is visible */
                    [v-cloak] {
                        display: none;
                    }
                </style>
            `;
            
            document.head.insertAdjacentHTML('beforeend', styles);
            log('Styles injected successfully');
        }
        
        // Initialize the app
        init();
    }
    
    // Export the initializer function
    window.initializeResourceStaffManager = initializeResourceStaffManager;
    
    console.log('[Resource Staff Manager] Script setup complete, initializer function ready');
})();
