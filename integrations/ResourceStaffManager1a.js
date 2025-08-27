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
        const customerField = currentUser.values?.field_122 || currentUser.field_122;
        const schoolId = currentUser.values?.field_126 || currentUser.field_126;
        
        log('Current user:', { email: userEmail, customer: customerField, schoolId: schoolId });
        
        // Vue App Instance
        let app = null;
        
        // Initialize the app
        async function init() {
            log('Starting initialization...');
            
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
                                        <span>{{ formatDate(summary.subscriptionStart) }}</span>
                                    </div>
                                </div>
                                <div class="rsm-card">
                                    <div class="rsm-card-icon"><i class="fas fa-calendar-check"></i></div>
                                    <div class="rsm-card-content">
                                        <label>Renewal Date</label>
                                        <span>{{ formatDate(summary.renewalDate) }}</span>
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
                                                <span v-if="staff.group" class="rsm-badge">{{ staff.group }}</span>
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
                                        <td>{{ formatDate(staff.dateAdded) }}</td>
                                        <td>{{ staff.lastLogin ? formatDate(staff.lastLogin) : 'Never' }}</td>
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
                        editingStaff: null,
                        staffToDelete: null,
                        bulkDeleteMode: false,
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
                            const filters = [
                                {
                                    field: 'field_44',
                                    operator: 'is',
                                    value: customerField
                                }
                            ];
                            
                            const response = await this.apiRequest('GET', 'objects/object_2/records', {
                                filters: filters
                            });
                            
                            if (response.records && response.records.length > 0) {
                                const customer = response.records[0];
                                this.summary = {
                                    subscriptionStart: customer.field_2997,
                                    renewalDate: customer.field_1622,
                                    coordinator: this.formatName(customer.field_49_raw || customer.field_49),
                                    accountsUsed: parseInt(customer.field_1564) || 0,
                                    accountsRemaining: parseInt(customer.field_1508) || 0,
                                    totalAccounts: (parseInt(customer.field_1564) || 0) + (parseInt(customer.field_1508) || 0),
                                    limitReached: customer.field_1481 === 'Yes' || customer.field_1481 === true
                                };
                            }
                        } catch (error) {
                            console.error('Error loading customer summary:', error);
                        }
                    },
                    
                    // Load staff list
                    async loadStaffList() {
                        try {
                            const filters = [
                                {
                                    field: 'field_122',
                                    operator: 'is',
                                    value: customerField
                                },
                                {
                                    field: 'field_441',
                                    operator: 'contains',
                                    value: 'RESOURCE'
                                },
                                {
                                    field: 'field_73',
                                    operator: 'contains',
                                    value: 'Tutor'
                                }
                            ];
                            
                            const response = await this.apiRequest('GET', 'objects/object_3/records', {
                                filters: filters,
                                rows_per_page: 1000
                            });
                            
                            if (response.records) {
                                this.staffList = response.records.map(record => ({
                                    id: record.id,
                                    name: this.formatName(record.field_69_raw || record.field_69),
                                    firstName: record.field_69_raw?.first || '',
                                    lastName: record.field_69_raw?.last || '',
                                    prefix: record.field_69_raw?.title || '',
                                    email: record.field_70_raw?.[0]?.email || record.field_70,
                                    hasLoggedIn: record.field_189 === 'Yes' || record.field_189 === true,
                                    dateAdded: record.field_549,
                                    lastLogin: record.field_575, // You'll need to confirm this field number
                                    pageViews: parseInt(record.field_3201) || 0,
                                    loginCount: parseInt(record.field_3208) || 0,
                                    group: record.field_216 || '',
                                    yearGroup: record.field_550 || ''
                                }));
                                
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
                        } else if (method !== 'GET') {
                            options.body = JSON.stringify(data);
                        }
                        
                        const response = await fetch(url, options);
                        if (!response.ok) {
                            throw new Error(`API request failed: ${response.statusText}`);
                        }
                        
                        return await response.json();
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
                    formatDate(dateString) {
                        if (!dateString) return '';
                        const date = new Date(dateString);
                        return date.toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                        });
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
                        
                        // Create Object_3 record
                        const accountData = {
                            field_122: [customerField], // Connected VESPA Customer
                            field_69: {
                                title: this.staffForm.prefix,
                                first: this.staffForm.firstName,
                                last: this.staffForm.lastName
                            },
                            field_73: ['Tutor'], // User Role
                            field_216: this.staffForm.group, // Group
                            field_70: this.staffForm.email, // Email
                            field_441: 'RESOURCE PORTAL', // Account Type
                            field_1493: 'Level 2 & 3', // Account Level
                            field_126: schoolId, // School ID
                            field_71: tempPassword, // Password
                            field_550: this.staffForm.yearGroup // Year Group
                        };
                        
                        const response = await this.apiRequest('POST', 'objects/object_3/records', accountData);
                        
                        // Update the auto-created Tutor record
                        await this.updateTutorRecord(this.staffForm.email);
                        
                        // Send welcome email
                        await this.sendWelcomeEmail({
                            email: this.staffForm.email,
                            name: `${this.staffForm.firstName} ${this.staffForm.lastName}`,
                            password: tempPassword
                        });
                        
                        this.showMessage('Staff member added successfully. Welcome email sent.', 'success');
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
                    async updateTutorRecord(email) {
                        try {
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
                                
                                // Update tutor record
                                const updateData = {
                                    field_220: [customerField], // VESPA Customer
                                    field_225: [userEmail], // Staff Admin email
                                    field_216: this.staffForm.group, // Group
                                    field_562: this.staffForm.yearGroup // Year Group
                                };
                                
                                await this.apiRequest('PUT', `objects/object_7/records/${tutorId}`, updateData);
                            }
                        } catch (error) {
                            console.error('Error updating tutor record:', error);
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
                            await this.sendPasswordResetEmail({
                                email: staff.email,
                                name: staff.name,
                                password: newPassword
                            });
                            
                            this.showMessage('Password reset successfully. Email sent to staff member.', 'success');
                        } catch (error) {
                            this.showMessage('Error resetting password: ' + error.message, 'error');
                        }
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
                            const emailData = {
                                to: data.email,
                                templateId: 'd-29e82dfb3bd14de6815f4b225b9ef7b3',
                                dynamicTemplateData: {
                                    name: data.name.split(' ')[0], // First name only
                                    email: data.email,
                                    password: data.password,
                                    loginUrl: 'https://vespaacademy.knack.com/vespa-academy#home/'
                                }
                            };
                            
                            const response = await fetch('https://vespa-sendgrid-proxy-660b8a5a8d51.herokuapp.com/api/send-email', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(emailData)
                            });
                            
                            if (!response.ok) {
                                throw new Error('Failed to send email');
                            }
                        } catch (error) {
                            console.error('Error sending welcome email:', error);
                        }
                    },
                    
                    // Send password reset email
                    async sendPasswordResetEmail(data) {
                        // Similar to sendWelcomeEmail but with different template if needed
                        await this.sendWelcomeEmail(data);
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
                    /* Container */
                    .resource-staff-manager-container {
                        padding: 20px;
                        max-width: 1400px;
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
                        padding: 8px;
                        background: transparent;
                        border: none;
                        color: #6c757d;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        border-radius: 4px;
                    }
                    
                    .rsm-btn-icon:hover {
                        background: #f0f0f0;
                        color: #079baa;
                    }
                    
                    .rsm-btn-icon-danger:hover {
                        background: #fee;
                        color: #dc3545;
                    }
                    
                    /* Table */
                    .rsm-table-container {
                        padding: 30px;
                        overflow-x: auto;
                    }
                    
                    .rsm-table {
                        width: 100%;
                        border-collapse: collapse;
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
                    }
                    
                    .rsm-table td {
                        padding: 12px;
                        border-bottom: 1px solid #e9ecef;
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
                    
                    .rsm-badge {
                        display: inline-block;
                        padding: 2px 8px;
                        background: #e7f5ff;
                        color: #079baa;
                        border-radius: 4px;
                        font-size: 11px;
                        font-weight: 600;
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
