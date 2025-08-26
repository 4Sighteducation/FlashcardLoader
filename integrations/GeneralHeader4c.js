/**
 * VESPA Universal Header System - Phase 1
 * Loads on all pages and provides context-aware navigation
 */

(function() {
    'use strict';
    
    console.log('[General Header] Script loaded, waiting for initialization...');
    
    function initializeGeneralHeader() {
        const config = window.GENERAL_HEADER_CONFIG;
        
        if (!config) {
            console.error('[General Header] Configuration not found');
            return;
        }
        
        console.log('[General Header] Initializing with config:', config);
        
        // Configuration
        const DEBUG = false; // Disabled to reduce log spam
        const currentScene = config.sceneKey;
        const currentView = config.viewKey;
        const userRoles = config.userRoles || [];
        const userAttributes = config.userAttributes || {};
        
        // Track the last scene for cleanup purposes
        let lastScene = null;
        
        // Helper function for debug logging
        function log(message, data) {
            if (DEBUG) {
                console.log(`[General Header] ${message}`, data || '');
            }
        }
        
        // Detect user type
        // Helper function to determine available roles for super users
        function determineAvailableRoles(hasStaffAdminRole, hasStaffRole, hasStudentRole, isResourceOnly) {
            const roles = [];
            
            // Always add Super User option
            roles.push({
                id: 'superUser',
                label: 'Super User',
                description: 'Full administrative access',
                available: true
            });
            
            // Add Staff Admin options if available
            if (hasStaffAdminRole) {
                if (isResourceOnly) {
                    roles.push({
                        id: 'staffAdminResource',
                        label: 'Staff Admin (Resources)',
                        description: 'Administrative access to resources',
                        available: true
                    });
                } else {
                    roles.push({
                        id: 'staffAdminCoaching',
                        label: 'Staff Admin (Coaching)',
                        description: 'Administrative access to coaching tools',
                        available: true
                    });
                }
            }
            
            // Add Teaching Staff options if available
            if (hasStaffRole) {
                if (isResourceOnly) {
                    roles.push({
                        id: 'staffResource',
                        label: 'Teaching Staff (Resources)',
                        description: 'Access to teaching resources',
                        available: true
                    });
                } else {
                    roles.push({
                        id: 'staffCoaching',
                        label: 'Teaching Staff (Coaching)',
                        description: 'Access to coaching and student management',
                        available: true
                    });
                }
            }
            
            // Add Student option if available
            if (hasStudentRole) {
                roles.push({
                    id: 'student',
                    label: 'Student',
                    description: 'Student learning interface',
                    available: true
                });
            }
            
            return roles;
        }
        
        // Function to show role selection modal
        function showRoleSelectionModal(availableRoles) {
            return new Promise((resolve) => {
                // Check if modal already exists
                if (document.getElementById('roleSelectionModal')) {
                    console.log('[General Header] DEBUG - Modal already exists, not creating another');
                    return;
                }
                
                // Create modal HTML
                const modalHTML = `
                    <div id="roleSelectionModal" class="role-selection-modal-overlay">
                        <div class="role-selection-modal">
                            <div class="modal-header">
                                <h2><i class="fa fa-user-circle"></i> Choose Your Login Mode</h2>
                                <p>You have multiple roles available. Please select how you'd like to access VESPA:</p>
                            </div>
                            <div class="modal-body">
                                <div class="role-options">
                                    ${availableRoles.map(role => `
                                        <button class="role-option ${role.available ? 'available' : 'unavailable'}" 
                                                data-role="${role.id}" 
                                                ${!role.available ? 'disabled' : ''}>
                                            <div class="role-icon">
                                                <i class="fa ${getRoleIcon(role.id)}"></i>
                                            </div>
                                            <div class="role-content">
                                                <h3>${role.label}</h3>
                                                <p>${role.description}</p>
                                            </div>
                                        </button>
                                    `).join('')}
                                </div>
                            </div>
                            <div class="modal-footer">
                                <p class="session-note">
                                    <i class="fa fa-info-circle"></i>
                                    Your selection will be remembered for this session. You can change it by logging out and logging back in.
                                </p>
                            </div>
                        </div>
                    </div>
                `;
                
                // Add modal styles
                const modalStyles = `
                    <style id="roleSelectionModalStyles">
                        .role-selection-modal-overlay {
                            position: fixed;
                            top: 0;
                            left: 0;
                            width: 100%;
                            height: 100%;
                            background: rgba(0, 0, 0, 0.8);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            z-index: 10000;
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        }
                        
                        .role-selection-modal {
                            background: white;
                            border-radius: 16px;
                            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                            max-width: 600px;
                            width: 90%;
                            max-height: 90vh;
                            overflow-y: auto;
                        }
                        
                        .modal-header {
                            padding: 30px 30px 20px;
                            text-align: center;
                            border-bottom: 1px solid #e0e0e0;
                        }
                        
                        .modal-header h2 {
                            color: #2a3c7a;
                            font-size: 1.8rem;
                            font-weight: 700;
                            margin: 0 0 15px 0;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 12px;
                        }
                        
                        .modal-header h2 i {
                            color: #079baa;
                            font-size: 1.6rem;
                        }
                        
                        .modal-header p {
                            color: #5899a8;
                            font-size: 1.1rem;
                            margin: 0;
                            line-height: 1.5;
                        }
                        
                        .modal-body {
                            padding: 30px;
                        }
                        
                        .role-options {
                            display: grid;
                            gap: 15px;
                        }
                        
                        .role-option {
                            display: flex;
                            align-items: center;
                            gap: 20px;
                            padding: 20px;
                            border: 2px solid #e0e0e0;
                            border-radius: 12px;
                            background: white;
                            cursor: pointer;
                            transition: all 0.3s ease;
                            text-align: left;
                            width: 100%;
                        }
                        
                        .role-option.available:hover {
                            border-color: #079baa;
                            background: #f0fdfe;
                            transform: translateY(-2px);
                            box-shadow: 0 4px 12px rgba(7, 155, 170, 0.2);
                        }
                        
                        .role-option.unavailable {
                            opacity: 0.5;
                            cursor: not-allowed;
                            background: #f5f5f5;
                        }
                        
                        .role-icon {
                            flex-shrink: 0;
                            width: 50px;
                            height: 50px;
                            border-radius: 10px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 20px;
                            color: white;
                            background: linear-gradient(135deg, #2a3c7a 0%, #079baa 100%);
                        }
                        
                        .role-option.unavailable .role-icon {
                            background: #ccc;
                        }
                        
                        .role-content h3 {
                            color: #2a3c7a;
                            font-size: 1.2rem;
                            font-weight: 600;
                            margin: 0 0 5px 0;
                        }
                        
                        .role-content p {
                            color: #5899a8;
                            font-size: 0.95rem;
                            margin: 0;
                            line-height: 1.4;
                        }
                        
                        .role-option.unavailable .role-content h3,
                        .role-option.unavailable .role-content p {
                            color: #999;
                        }
                        
                        .modal-footer {
                            padding: 20px 30px 30px;
                            text-align: center;
                            border-top: 1px solid #e0e0e0;
                        }
                        
                        .session-note {
                            color: #5899a8;
                            font-size: 0.9rem;
                            margin: 0;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            gap: 8px;
                        }
                        
                        .session-note i {
                            color: #079baa;
                        }
                        
                        @media (max-width: 768px) {
                            .role-selection-modal {
                                margin: 20px;
                                width: calc(100% - 40px);
                            }
                            
                            .modal-header {
                                padding: 25px 20px 15px;
                            }
                            
                            .modal-header h2 {
                                font-size: 1.5rem;
                                flex-direction: column;
                                gap: 8px;
                            }
                            
                            .modal-body {
                                padding: 20px;
                            }
                            
                            .role-option {
                                padding: 15px;
                                gap: 15px;
                            }
                            
                            .role-icon {
                                width: 40px;
                                height: 40px;
                                font-size: 16px;
                            }
                            
                            .role-content h3 {
                                font-size: 1.1rem;
                            }
                            
                            .role-content p {
                                font-size: 0.9rem;
                            }
                        }
                    </style>
                `;
                
                // Inject styles and modal
                document.head.insertAdjacentHTML('beforeend', modalStyles);
                document.body.insertAdjacentHTML('beforeend', modalHTML);
                
                // Add small delay to ensure modal is fully rendered
                setTimeout(() => {
                    // Add click handlers
                    const modal = document.getElementById('roleSelectionModal');
                    const roleButtons = modal.querySelectorAll('.role-option.available');
                
                    console.log('[General Header] DEBUG - Found role buttons:', roleButtons.length);
                    
                    roleButtons.forEach((button, index) => {
                        console.log('[General Header] DEBUG - Setting up button', index, button.getAttribute('data-role'));
                        
                        // Add multiple event types to ensure click is captured
                        const handleClick = (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            const selectedRole = button.getAttribute('data-role');
                            console.log('[General Header] DEBUG - Button clicked, selected role:', selectedRole);
                            
                            // Clean up
                            modal.remove();
                            document.getElementById('roleSelectionModalStyles')?.remove();
                            
                            // Reset modal flag
                            window._roleModalShowing = false;
                            
                            resolve(selectedRole);
                        };
                        
                        button.addEventListener('click', handleClick);
                        button.addEventListener('mousedown', handleClick);
                        button.addEventListener('touchstart', handleClick);
                        
                        // Also add a direct onclick for backup
                        button.onclick = handleClick;
                    });
                    
                    // Prevent modal from closing when clicking outside
                    modal.addEventListener('click', (e) => {
                        if (e.target === modal) {
                            e.preventDefault();
                            e.stopPropagation();
                        }
                    });
                }, 100); // Small delay to ensure DOM is ready
            });
        }
        
        // Helper function to get role icons
        function getRoleIcon(roleId) {
            const iconMap = {
                'superUser': 'fa-shield',
                'staffAdminResource': 'fa-cog',
                'staffAdminCoaching': 'fa-tachometer-alt',
                'staffResource': 'fa-book',
                'staffCoaching': 'fa-users',
                'student': 'fa-graduation-cap'
            };
            return iconMap[roleId] || 'fa-user';
        }

        function getUserType() {
            log('User attributes:', userAttributes);
            
            // SPECIAL CHECK: If we're in student emulator mode, always return 'student'
            // Check URL parameter or special marker
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('student_emulator') === 'true' || 
                window.location.hash.includes('student_emulator=true')) {
                log('Student emulator mode detected via URL parameter - forcing student view');
                // Store emulator mode in a variable we can check later
                window._isStudentEmulatorMode = true;
                return 'student';
            }
            
            // Not in emulator mode
            window._isStudentEmulatorMode = false;
            
            // Check if user is logged in at all
            if (!userAttributes || (!userAttributes.email && !userAttributes.id)) {
                log('No user attributes found - user might not be logged in');
                return null; // Don't show header if not logged in
            }
            
            // Get the user role from field_73
            let userRole = userAttributes.values?.field_73 || userAttributes.field_73;
            log('User role from field_73:', userRole);
            
            // If no role found, user might not be logged in properly
            if (!userRole) {
                log('No role found in field_73');
                return null;
            }
            
            // Handle different field formats
            let roleText = '';
            
            // If it's an array (like ['profile_6']), get the first element
            if (Array.isArray(userRole) && userRole.length > 0) {
                userRole = userRole[0];
            }
            
            // Check if we have raw field data
            const rawRole = userAttributes.values?.field_73_raw || userAttributes.field_73_raw;
            if (rawRole && rawRole.length > 0) {
                // Try to get the identifier from raw data
                const roleIdentifier = rawRole[0]?.identifier || rawRole[0];
                log('Role identifier from raw:', roleIdentifier);
                roleText = roleIdentifier;
            } else {
                roleText = userRole.toString();
            }
            
            // Profile mapping - map profile IDs to user types (both profile_XX and object_XX formats)
            const profileMapping = {
                'profile_6': 'student',      // Student profile
                'profile_7': 'staff',        // Tutor profile
                'profile_5': 'staffAdmin',   // Staff Admin profile
                'profile_4': 'student',      // Alternative student profile
                'profile_21': 'superUser',   // Super User profile
                'object_6': 'student',       // Student profile (object format)
                'object_7': 'staff',         // Tutor profile (object format)
                'object_5': 'staffAdmin',    // Staff Admin profile (object format)
                'object_4': 'student',       // Alternative student profile (object format)
                'object_21': 'superUser',    // Super User profile (object format)
                // Add more mappings as needed
            };
            
            // Check ALL roles if it's an array (staff might have multiple roles including student)
            let hasStaffRole = false;
            let hasStudentRole = false;
            let hasStaffAdminRole = false;
            let hasSuperUserRole = false;
            
            console.log('[General Header] DEBUG - Raw field_73:', userAttributes.values?.field_73);
            console.log('[General Header] DEBUG - Raw profile_keys:', userAttributes.values?.profile_keys);
            console.log('[General Header] DEBUG - Profile mapping check for profile_21:', profileMapping['profile_21']);
            console.log('[General Header] DEBUG - Profile mapping check for object_21:', profileMapping['object_21']);
            
            // Check both field_73 and profile_keys
            const field73Roles = userAttributes.values?.field_73 ? (Array.isArray(userAttributes.values.field_73) ? userAttributes.values.field_73 : [userAttributes.values.field_73]) : [];
            const profileKeys = userAttributes.values?.profile_keys ? (Array.isArray(userAttributes.values.profile_keys) ? userAttributes.values.profile_keys : [userAttributes.values.profile_keys]) : [];
            const allRoles = [...field73Roles, ...profileKeys];
            
            log('Checking all roles (field_73 + profile_keys):', allRoles);
            
            // If we have roles to check
            if (allRoles.length > 0) {
                
                for (const role of allRoles) {
                    const roleStr = role.toString();
                    console.log('[General Header] DEBUG - Checking role:', roleStr, 'maps to:', profileMapping[roleStr]);
                    
                    if (profileMapping[roleStr] === 'staff') {
                        hasStaffRole = true;
                    } else if (profileMapping[roleStr] === 'student') {
                        hasStudentRole = true;
                    } else if (profileMapping[roleStr] === 'staffAdmin') {
                        hasStaffAdminRole = true;
                    } else if (profileMapping[roleStr] === 'superUser') {
                        console.log('[General Header] DEBUG - Found super user role!');
                        hasSuperUserRole = true;
                    }
                }
            }
            
            // Get account type from field_441
            const accountType = userAttributes.values?.field_441 || userAttributes.field_441;
            log('Account type field_441:', accountType);
            
            // Check if account type contains "RESOURCE" (case-insensitive)
            const isResourceOnly = accountType && accountType.toString().toUpperCase().includes('RESOURCE');
            
            console.log('[General Header] DEBUG - Final role detection results:', {
                hasStaffRole,
                hasStudentRole,
                hasStaffAdminRole,
                hasSuperUserRole,
                accountType,
                isResourceOnly
            });
            
            // PRIORITY: Super User gets role selection modal, then Staff Admin, then regular staff, then student
            if (hasSuperUserRole) {
                console.log('[General Header] DEBUG - Super user role detected!');
                log('User has super user role - checking for role selection');
                
                // Check if user has already selected a role in this session
                const selectedRole = sessionStorage.getItem('selectedUserRole');
                console.log('[General Header] DEBUG - Selected role from session:', selectedRole);
                
                if (selectedRole) {
                    log('Using previously selected role:', selectedRole);
                    return selectedRole;
                }
                
                // Prevent multiple modals
                if (window._roleModalShowing) {
                    console.log('[General Header] DEBUG - Role modal already showing, returning superUser');
                    return 'superUser';
                }
                window._roleModalShowing = true;
                
                // Show role selection modal and return based on available roles
                const availableRoles = determineAvailableRoles(hasStaffAdminRole, hasStaffRole, hasStudentRole, isResourceOnly);
                
                // Show modal immediately and return temporary role
                setTimeout(() => {
                    showRoleSelectionModal(availableRoles).then(chosenRole => {
                        if (chosenRole) {
                            sessionStorage.setItem('selectedUserRole', chosenRole);
                            
                            // Clean up any existing modals before reload
                            const existingModal = document.getElementById('roleSelectionModal');
                            if (existingModal) {
                                existingModal.remove();
                            }
                            const existingStyles = document.getElementById('roleSelectionModalStyles');
                            if (existingStyles) {
                                existingStyles.remove();
                            }
                            
                            // Reload the page to apply the new role
                            window.location.reload();
                        }
                    });
                }, 100);
                
                // Return super user as default while modal is shown
                return 'superUser';
            } else if (hasStaffAdminRole) {
                log('User has staff admin role');
                if (isResourceOnly) {
                    log('Detected as staffAdminResource');
                    return 'staffAdminResource';
                }
                log('Detected as staffAdminCoaching');
                return 'staffAdminCoaching';
            } else if (hasStaffRole) {
                log('User has staff role');
                if (isResourceOnly) {
                    log('Detected as staffResource');
                    return 'staffResource';
                }
                log('Detected as staffCoaching');
                return 'staffCoaching';
            } else if (hasStudentRole) {
                log('User has ONLY student role');
                return 'student';
            }
            
            // Fallback to text comparison if we have actual role text
            if (roleText.toLowerCase() === 'student') {
                log('Detected as student');
                return 'student';
            } else if (roleText.toLowerCase().includes('admin')) {
                log('Detected as staff admin via text');
                if (isResourceOnly) {
                    return 'staffAdminResource';
                }
                return 'staffAdminCoaching';
            } else if (roleText.toLowerCase().includes('staff') || roleText.toLowerCase().includes('tutor') || 
                      roleText.toLowerCase().includes('super')) {
                log(`Detected as staff with role: ${roleText}`);
                if (isResourceOnly) {
                    return 'staffResource';
                }
                return 'staffCoaching';
            }
            
            // Default based on which landing page they can access
            log('Could not determine role from field_73, checking current page');
            const currentUrl = window.location.href;
            if (currentUrl.includes('landing-page') && !currentUrl.includes('staff-landing-page')) {
                log('On student landing page, assuming student');
                return 'student';
            }
            
            log('Defaulting to staff');
            return 'staffCoaching';
        }
        
        // Navigation configurations for different user types
        // All configurations now have Settings and Log Out buttons at the end
        const navigationConfig = {
            student: {
                brand: 'VESPA Student',
                brandIcon: 'fa-graduation-cap',
                color: '#079baa', // Main teal - bright and welcoming for students
                accentColor: '#06206e', // Dark blue for accents
                items: [
                    { label: 'VESPA Questionnaire', icon: 'fa-question-circle', href: '#add-q', scene: 'scene_358' },
                    { label: 'Coaching Report', icon: 'fa-comments', href: '#vespa-results', scene: 'scene_43' },
                    { label: 'My Activities', icon: 'fa-book', href: '#my-vespa-activities', scene: 'scene_1258' },
                    { label: 'Study Planner', icon: 'fa-calendar', href: '#studyplanner', scene: 'scene_1208' },
                    { label: 'Flashcards', icon: 'fa-clone', href: '#flashcards', scene: 'scene_1206' },
                    { label: 'Taskboard', icon: 'fa-clipboard-list-chart', href: '#task-board', scene: 'scene_1188' },
                    { label: 'Settings', icon: 'fa-cog', href: '#account-settings', scene: 'scene_2', isSettings: true },
                    { label: 'Log Out', icon: 'fa-sign-out', href: '#', scene: 'logout', isLogout: true }
                ]
            },
            staffResource: {
                brand: 'VESPA Resources',
                brandIcon: 'fa-book',
                color: '#5899a8', // Muted blue-green - professional yet approachable
                accentColor: '#06206e',
                items: [
                    { label: 'Resources', icon: 'fa-folder-open', href: '#tutor-activities/resources-levels', scene: 'scene_481' },
                    { label: 'Worksheets', icon: 'fa-files-o', href: '#worksheets', scene: 'scene_1169' },
                    { label: 'Curriculum', icon: 'fa-calendar', href: '#suggested-curriculum2', scene: 'scene_1234' },
                    { label: 'Newsletter', icon: 'fa-newspaper-o', href: '#vespa-newsletter', scene: 'scene_1214' },
                    { label: 'Videos', icon: 'fa-book-open', href: '#vespa-videos', scene: 'scene_1266' },
                    { label: 'Settings', icon: 'fa-cog', href: '#account-settings', scene: 'scene_2', isSettings: true },
                    { label: 'Log Out', icon: 'fa-sign-out', href: '#', scene: 'logout', isLogout: true }
                ]
            },
            staffCoaching: {
                brand: 'VESPA Coaching',
                brandIcon: 'fa-users',
                color: '#2f8dcb', // Bright blue - energetic and engaging for coaching
                accentColor: '#06206e',
                items: [
                    { label: 'Coaching', icon: 'fa-comments', href: '#mygroup-vespa-results2/', scene: 'scene_1095' },
                    { label: 'Results', icon: 'fa-bar-chart', href: '#vesparesults', scene: 'scene_1270' },
                    { label: 'Activities', icon: 'fa-book', href: '#activity-manage', scene: 'scene_1256' },
                    { label: 'Study Plans', icon: 'fa-graduation-cap', href: '#student-revision', scene: 'scene_855' },
                    { label: 'Resources', icon: 'fa-folder-open', href: '#tutor-activities/resources-levels', scene: 'scene_481' },
                    { label: 'Worksheets', icon: 'fa-files-o', href: '#worksheets', scene: 'scene_1169' },
                    { label: 'Videos', icon: 'fa-book-open', href: '#vespa-videos', scene: 'scene_1266' },
                    { label: 'Settings', icon: 'fa-cog', href: '#account-settings', scene: 'scene_2', isSettings: true },
                    { label: 'Log Out', icon: 'fa-sign-out', href: '#', scene: 'logout', isLogout: true }
                ]
            },
            staffAdminResource: {
                brand: 'VESPA Admin',
                brandIcon: 'fa-shield',
                color: '#2a3c7a', // Dark blue - authoritative and professional for admins
                accentColor: '#06206e',
                items: [
                    { label: 'Manage', icon: 'fa-cog', href: '#accounts', scene: 'scene_68' },
                    { label: 'Resources', icon: 'fa-folder-open', href: '#tutor-activities/resources-levels', scene: 'scene_481' },
                    { label: 'Worksheets', icon: 'fa-files-o', href: '#worksheets', scene: 'scene_1169' },
                    { label: 'Curriculum', icon: 'fa-calendar', href: '#suggested-curriculum2', scene: 'scene_1234' },
                    { label: 'Newsletter', icon: 'fa-newspaper-o', href: '#vespa-newsletter', scene: 'scene_1214' },
                    { label: 'Videos', icon: 'fa-book-open', href: '#vespa-videos', scene: 'scene_1266' },
                    { label: 'Settings', icon: 'fa-cog', href: '#account-settings', scene: 'scene_2', isSettings: true },
                    { label: 'Log Out', icon: 'fa-sign-out', href: '#', scene: 'logout', isLogout: true }
                ]
            },
            staffAdminCoaching: {
                brand: 'VESPA Admin',
                brandIcon: 'fa-shield',
                color: '#2a3c7a', // Dark blue - authoritative and professional for admins
                accentColor: '#06206e',
                items: [
                    { label: 'Dashboard', icon: 'fa-tachometer-alt', href: '#dashboard', scene: 'scene_1225' },
                    { label: 'Results', icon: 'fa-bar-chart', href: '#vesparesults', scene: 'scene_1270' },
                    { label: 'Coaching', icon: 'fa-comments', href: '#admin-coaching', scene: 'scene_1014' },
                    { label: 'Manage', icon: 'fa-cog', href: '#upload-manager', scene: 'scene_1212' },
                    { label: 'Curriculum', icon: 'fa-calendar', href: '#suggested-curriculum2', scene: 'scene_1234' },
                    { label: 'Worksheets', icon: 'fa-files-o', href: '#worksheets', scene: 'scene_1169' },
                    { label: 'Print Reports', icon: 'fa-print', href: '#report-printing', scene: 'scene_1227' },
                    { label: 'Settings', icon: 'fa-cog', href: '#account-settings', scene: 'scene_2', isSettings: true },
                    { label: 'Log Out', icon: 'fa-sign-out', href: '#', scene: 'logout', isLogout: true }
                ]
            },
            superUser: {
                brand: 'VESPA Super User',
                brandIcon: 'fa-shield',
                color: '#2a3c7a', // Dark blue - authoritative and professional for super users
                accentColor: '#079baa', // Teal accent
                items: [
                    { label: 'Upload Manager', icon: 'fa-upload', href: '#upload-manager', scene: 'scene_1212' },
                    { label: 'Dashboard', icon: 'fa-tachometer-alt', href: '#dashboard', scene: 'scene_1225' },
                    { label: 'CRM', icon: 'fa-users', href: '#vespa-customers/', scene: 'scene_1226' },
                    { label: 'Reports', icon: 'fa-print', href: '#report-printing', scene: 'scene_1227' },
                    { label: 'Settings', icon: 'fa-cog', href: '#account-settings', scene: 'scene_2', isSettings: true },
                    { label: 'Log Out', icon: 'fa-sign-out', href: '#', scene: 'logout', isLogout: true }
                ]
            }
        };
        
        // Create the header HTML
        function createHeaderHTML(userType, currentScene) {
            const navConfig = navigationConfig[userType];
            
            // Debug log for resource type detection
            log(`Creating header for userType: ${userType}, isResource: ${userType.includes('Resource')}`);
            
            // Determine home page based on user type
            let homeHref, homeScene;
            if (userType === 'student') {
                homeHref = '#landing-page/';
                homeScene = 'scene_1210';
            } else if (userType === 'superUser') {
                homeHref = '#oversight-page/';
                homeScene = 'scene_1268';
            } else {
                homeHref = '#staff-landing-page/';
                homeScene = 'scene_1215';
            }
            const isHomePage = currentScene === homeScene;
            
            // Build navigation items
            const navItemsHTML = navConfig.items.map(item => {
                const isActive = currentScene === item.scene && !item.isLogout && !item.isSettings;
                let buttonClass = 'header-nav-button';
                
                // Add special classes for settings and logout buttons
                if (item.isSettings) buttonClass += ' header-settings-button';
                if (item.isLogout) buttonClass += ' header-logout-button';
                if (isActive) buttonClass += ' active';
                
                // HIDE LOGOUT BUTTON IN EMULATOR MODE
                if (item.isLogout && window._isStudentEmulatorMode) {
                    return ''; // Return empty string to hide logout button
                }
                
                // Add data attributes for special buttons
                const dataAttrs = item.isLogout ? 'data-logout="true"' : '';
                
                // Check if this is the questionnaire button and if validator is enabled
                let tooltipText = '';
                if (item.scene === 'scene_358' && userType === 'student') {
                    // Check if questionnaireValidator is enabled
                    const validatorEnabled = window.QUESTIONNAIRE_VALIDATOR_CONFIG && 
                                           window.QUESTIONNAIRE_VALIDATOR_CONFIG.enabled !== false;
                    
                    if (validatorEnabled) {
                        tooltipText = 'title="Click to check questionnaire availability"';
                        log('Questionnaire validator is enabled - button will be intercepted');
                    } else {
                        tooltipText = 'title="Click to go to questionnaire page"';
                        log('Questionnaire validator is disabled - normal navigation to scene_358');
                    }
                }
                
                return `
                    <a href="${item.href}" 
                       class="${buttonClass}" 
                       data-scene="${item.scene}"
                       ${dataAttrs}
                       ${tooltipText}>
                        <i class="fa ${item.icon}"></i>
                        <span>${item.label}</span>
                    </a>
                `;
            }).join('');
            
            // Add Translation button before Settings
            const translationButton = `
                <button id="translation-menu-button" 
                        class="header-nav-button header-translation-button"
                        title="Translate page content">
                    <i class="fa fa-globe"></i>
                    <span>Translate</span>
                </button>
            `;
            
            // Insert translation button before settings in navigation
            const settingsIndex = navItemsHTML.lastIndexOf('header-settings-button');
            let finalNavHTML = navItemsHTML;
            if (settingsIndex > -1) {
                // Find where the settings button starts
                const beforeSettings = navItemsHTML.substring(0, navItemsHTML.lastIndexOf('<a', settingsIndex));
                const fromSettings = navItemsHTML.substring(navItemsHTML.lastIndexOf('<a', settingsIndex));
                finalNavHTML = beforeSettings + translationButton + fromSettings;
            } else {
                // If no settings button, add before the last item
                finalNavHTML = navItemsHTML + translationButton;
            }
            
            return `
                <div id="vespaGeneralHeader" class="vespa-general-header ${userType}">
                    <div class="header-content">
                        <div class="header-top-row">
                            <div class="header-brand">
                                <a href="https://www.vespa.academy" target="_blank" class="logo-link">
                                    <img src="https://vespa.academy/_astro/vespalogo.BGrK1ARl.png" alt="VESPA Academy" class="vespa-logo">
                                </a>
                                <span>${navConfig.brand}</span>
                            </div>
                            <nav class="header-navigation">
                                ${finalNavHTML}
                            </nav>
                            <button class="mobile-menu-toggle" aria-label="Toggle menu">
                                <i class="fa fa-bars"></i>
                            </button>
                        </div>
                    </div>
                    ${!isHomePage ? `
                    <div class="header-breadcrumb">
                        <a href="${homeHref}" class="breadcrumb-back">
                            <i class="fa fa-arrow-left"></i>
                            Back to Home
                        </a>
                    </div>
                    ` : ''}
                </div>
                <div class="mobile-nav-overlay"></div>
                <!-- Hidden Translation Container -->
                <div id="translation-modal" class="translation-modal" style="display: none;">
                    <div class="translation-modal-content">
                        <div class="translation-modal-header">
                            <h3><i class="fa fa-globe"></i> Select Language</h3>
                            <button class="translation-modal-close">&times;</button>
                        </div>
                        <div class="translation-modal-body">
                            <div id="google_translate_element" style="position: absolute; opacity: 0.01; height: 1px; width: 1px; overflow: hidden; pointer-events: none;"></div>
                            <div class="language-buttons">
                                <button class="lang-select-btn" data-lang="">🇬🇧 English</button>
                                <button class="lang-select-btn" data-lang="cy">🏴󠁧󠁢󠁷󠁬󠁳󠁿 Cymraeg (Welsh)</button>
                                <button class="lang-select-btn" data-lang="pl">🇵🇱 Polski (Polish)</button>
                                <button class="lang-select-btn" data-lang="es">🇪🇸 Español (Spanish)</button>
                                <button class="lang-select-btn" data-lang="fr">🇫🇷 Français (French)</button>
                                <button class="lang-select-btn" data-lang="de">🇩🇪 Deutsch (German)</button>
                            </div>
                        </div>
                    </div>
                </div>
                <style>
                    /* Hide entire Knack header */
                    .knHeader {
                        display: none !important;
                    }
                    
                    /* Hide original user info container */
                    body.has-general-header .kn-info,
                    body.has-general-header .kn-current_user {
                        display: none !important;
                        visibility: hidden !important;
                    }
                    
                    /* Base Header Styles */
                    .vespa-general-header {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        background-color: ${navConfig.color};
                        color: white;
                        z-index: 9999;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        transition: all 0.3s ease;
                    }
                    
                    .header-content {
                        max-width: 1400px;
                        margin: 0 auto;
                        padding: 0 20px;
                    }
                    
                    .header-top-row {
                        height: 65px;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    }
                    
                    .header-brand {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        font-size: 20px;
                        font-weight: 600;
                        letter-spacing: -0.5px;
                    }
                    
                    .logo-link {
                        display: flex;
                        align-items: center;
                        text-decoration: none;
                        transition: opacity 0.2s ease;
                    }
                    
                    .logo-link:hover {
                        opacity: 0.85;
                    }
                    
                    .vespa-logo {
                        height: 45px;
                        width: auto;
                    }
                    
                    .header-navigation {
                        display: flex;
                        gap: 8px;
                        align-items: center;
                        flex: 1;
                        justify-content: center;
                        max-width: 1100px;
                        margin: 0 20px;
                    }
                    
                    .header-nav-button {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        padding: 8px 14px;
                        background: rgba(255,255,255,0.15);
                        color: white;
                        text-decoration: none;
                        border-radius: 6px;
                        transition: all 0.2s ease;
                        font-size: 13px;
                        font-weight: 500;
                        white-space: nowrap;
                        border: 1px solid rgba(255,255,255,0.1);
                        position: relative;
                        overflow: hidden;
                        text-transform: none;
                        letter-spacing: 0.2px;
                        min-width: 90px;
                        justify-content: center;
                    }
                    
                    .header-nav-button:hover {
                        background: rgba(255,255,255,0.25);
                        transform: translateY(-1px);
                        box-shadow: 0 3px 12px rgba(0,0,0,0.2);
                        border-color: rgba(255,255,255,0.25);
                    }
                    
                    .header-nav-button.active {
                        background: rgba(255,255,255,0.3);
                        box-shadow: 0 2px 10px rgba(0,0,0,0.15);
                        border-color: rgba(255,255,255,0.35);
                        color: white;
                        font-weight: 600;
                    }
                    
                    .header-nav-button i {
                        font-size: 16px;
                        opacity: 0.95;
                    }
                    
                    /* Special styling for settings and logout buttons */
                    .header-settings-button,
                    .header-logout-button {
                        background: rgba(0,0,0,0.15);
                        border-color: rgba(255,255,255,0.08);
                        min-width: auto;
                        padding: 8px 12px;
                    }
                    
                    .header-settings-button:hover,
                    .header-logout-button:hover {
                        background: rgba(0,0,0,0.25);
                        border-color: rgba(255,255,255,0.15);
                    }
                    
                    .header-logout-button {
                        margin-left: auto;
                    }
                    
                    /* Mobile menu toggle */
                    .mobile-menu-toggle {
                        display: none;
                        background: none;
                        border: none;
                        color: white;
                        font-size: 22px;
                        cursor: pointer;
                        padding: 8px;
                        border-radius: 6px;
                        transition: background-color 0.2s ease;
                    }
                    
                    .mobile-menu-toggle:hover {
                        background-color: rgba(255,255,255,0.1);
                    }
                    
                    /* Breadcrumb styles */
                    .header-breadcrumb {
                        background-color: rgba(0,0,0,0.08);
                        padding: 8px 0;
                    }
                    
                    .breadcrumb-back {
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        color: rgba(255,255,255,0.9);
                        text-decoration: none;
                        font-size: 13px;
                        padding: 4px 20px;
                        max-width: 1400px;
                        margin: 0 auto;
                        transition: all 0.2s ease;
                    }
                    
                    .breadcrumb-back:hover {
                        color: white;
                    }
                    
                    .breadcrumb-back i {
                        font-size: 12px;
                    }
                    
                    /* Adjust body for header */
                    body.has-general-header {
                        padding-top: 65px !important;
                    }
                    
                    body.has-general-header:has(.header-breadcrumb) {
                        padding-top: 105px !important;
                    }
                    
                    /* Hide Knack's default navigation but keep user info initially */
                    body.has-general-header .kn-menu.kn-view {
                        display: none !important;
                    }
                    
                    /* Ensure content is visible */
                    .kn-scene {
                        min-height: calc(100vh - 97px);
                    }
                    
                    /* Mobile Styles */
                    @media (max-width: 992px) {
                        .header-navigation {
                            gap: 4px;
                            margin: 0 10px;
                        }
                        
                        .header-nav-button {
                            padding: 5px 8px;
                            font-size: 11px;
                        }
                        
                        .header-nav-button i {
                            font-size: 12px;
                        }
                        
                        .header-brand {
                            font-size: 18px;
                        }
                        
                        .vespa-logo {
                            height: 40px;
                        }
                        

                    }
                    
                    @media (max-width: 768px) {
                        .header-top-row {
                            height: 56px;
                        }
                        
                        .header-brand span {
                            font-size: 16px;
                        }
                        
                        .vespa-logo {
                            height: 36px;
                        }
                        
                        .header-navigation {
                            position: fixed;
                            top: 56px;
                            right: -280px;
                            width: 280px;
                            max-height: calc(100vh - 56px);
                            background-color: ${navConfig.color};
                            flex-direction: column;
                            justify-content: flex-start;
                            padding: 16px;
                            gap: 8px;
                            transition: right 0.3s ease;
                            box-shadow: -2px 0 10px rgba(0,0,0,0.2);
                            margin: 0;
                            overflow-y: auto;
                            /* Remove fixed height to allow natural sizing */
                        }
                        
                        .header-navigation.mobile-open {
                            right: 0;
                        }
                        
                        .header-nav-button {
                            width: 100%;
                            justify-content: flex-start;
                            padding: 12px 16px;
                            font-size: 15px;
                            background: rgba(255,255,255,0.08);
                            min-width: auto;
                        }
                        
                        .header-nav-button i {
                            font-size: 18px;
                            width: 24px;
                            text-align: center;
                        }
                        
                        /* Settings and Logout buttons - distinct styling on mobile */
                        .header-settings-button,
                        .header-logout-button {
                            margin-left: 0;
                            margin-top: 16px; /* Small gap before these buttons */
                            background: rgba(0,0,0,0.25); /* Darker background */
                            border: 1px solid rgba(255,255,255,0.2);
                        }
                        
                        .header-settings-button:hover,
                        .header-logout-button:hover {
                            background: rgba(0,0,0,0.35);
                            border-color: rgba(255,255,255,0.3);
                        }
                        
                        /* Add a separator before settings/logout on mobile */
                        .header-settings-button {
                            position: relative;
                            padding-top: 24px;
                        }
                        
                        .header-settings-button::before {
                            content: '';
                            position: absolute;
                            top: 0;
                            left: 20%;
                            right: 20%;
                            height: 1px;
                            background: rgba(255,255,255,0.2);
                        }
                        
                        .header-logout-button {
                            margin-top: 8px; /* Smaller gap between settings and logout */
                        }
                        
                        .mobile-menu-toggle {
                            display: block;
                        }
                        
                        .mobile-nav-overlay {
                            display: none;
                            position: fixed;
                            top: 56px;
                            left: 0;
                            right: 0;
                            bottom: 0;
                            background-color: rgba(0,0,0,0.4);
                            z-index: 9998;
                            backdrop-filter: blur(2px);
                        }
                        
                        .mobile-nav-overlay.active {
                            display: block;
                        }
                        
                        body.has-general-header {
                            padding-top: 56px !important;
                        }
                        
                        body.has-general-header:has(.header-breadcrumb) {
                            padding-top: 96px !important;
                        }
                        
                        .header-breadcrumb {
                            padding: 6px 0;
                        }
                        
                        .breadcrumb-back {
                            font-size: 12px;
                            padding: 4px 16px;
                        }
                    }
                    
                    @media (max-width: 480px) {
                        .header-brand span {
                            display: none;
                        }
                    }
                    
                    /* Specific background colors for different user types */
                    .vespa-general-header.student {
                        background-color: ${navigationConfig.student.color};
                    }
                    
                    .vespa-general-header.staffResource {
                        background-color: ${navigationConfig.staffResource.color};
                    }
                    
                    .vespa-general-header.staffCoaching {
                        background-color: ${navigationConfig.staffCoaching.color};
                    }
                    
                    .vespa-general-header.staffAdminResource,
                    .vespa-general-header.staffAdminCoaching {
                        background-color: ${navigationConfig.staffAdminResource.color};
                    }
                    
                    .vespa-general-header.superUser {
                        background-color: ${navigationConfig.superUser.color};
                    }
                    
                    /* Smooth transitions */
                    * {
                        -webkit-font-smoothing: antialiased;
                        -moz-osx-font-smoothing: grayscale;
                    }
                    
                    /* Focus styles for accessibility */
                    .header-nav-button:focus,
                    #vespaGeneralHeader .mobile-menu-toggle:focus,
                    #vespaGeneralHeader .breadcrumb-back:focus {
                        outline: 2px solid rgba(255,255,255,0.5);
                        outline-offset: 2px;
                    }
                    
                    /* SIMPLIFIED STYLING APPROACH
                     * With uniform button count (7 buttons), all account types now use the same clean styling.
                     * No special cases or overrides needed - just consistent, maintainable CSS!
                     * Using unique class name .header-nav-button to prevent conflicts with other components.
                     */
                </style>
            `;
        }
        
        // Function to inject the header
        function injectHeader() {
            // Check if header already exists
            if (document.getElementById('vespaGeneralHeader')) {
                log('Header already exists, checking if it should be removed');
                const userType = getUserType();
                if (!userType) {
                    // User is not logged in, remove header
                    log('User not logged in, removing header');
                    const existingHeader = document.getElementById('vespaGeneralHeader');
                    if (existingHeader) existingHeader.remove();
                    // Reset body padding
                    document.body.classList.remove('has-general-header');
                    document.body.style.paddingTop = '';
                }
                return;
            }
            
            const userType = getUserType();
            log('Detected user type:', userType);
            
            // Don't show header if user is not logged in
            if (!userType) {
                log('User not logged in, not showing header');
                return;
            }
            
            // Create and inject the header
            const headerHTML = createHeaderHTML(userType, currentScene);
            document.body.insertAdjacentHTML('afterbegin', headerHTML);
            document.body.classList.add('has-general-header');
            
            log('Header injected successfully');
            
            // Setup event listeners
            setupEventListeners();
            
            // Track current page
            trackPageView(userType, currentScene);
            
            // DEBUG: Watch for style changes on nav buttons
            const navButtons = document.querySelectorAll('#vespaGeneralHeader .header-nav-button');
            navButtons.forEach((button, index) => {
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                            log(`DEBUG: Style attribute changed on nav button ${index}:`, {
                                oldValue: mutation.oldValue,
                                newValue: button.getAttribute('style'),
                                userType: getUserType()
                            });
                        }
                    });
                });
                
                observer.observe(button, {
                    attributes: true,
                    attributeOldValue: true,
                    attributeFilter: ['style']
                });
            });
        }
        
        // Setup event listeners
        function setupEventListeners() {
            // Mobile menu toggle
            const mobileToggle = document.querySelector('.mobile-menu-toggle');
            const navigation = document.querySelector('.header-navigation');
            const overlay = document.querySelector('.mobile-nav-overlay');
            
            // DEBUG: Log nav button styles after setup
            setTimeout(() => {
                const navButtons = document.querySelectorAll('#vespaGeneralHeader .header-nav-button');
                if (navButtons.length > 0) {
                    const firstButton = navButtons[0];
                    const computedStyle = window.getComputedStyle(firstButton);
                    log('DEBUG: Nav button computed styles after setup:', {
                        padding: computedStyle.padding,
                        fontSize: computedStyle.fontSize,
                        width: firstButton.offsetWidth,
                        userType: getUserType()
                    });
                }
            }, 100);
            
            if (mobileToggle) {
                mobileToggle.addEventListener('click', function() {
                    navigation.classList.toggle('mobile-open');
                    overlay.classList.toggle('active');
                });
            }
            
            if (overlay) {
                overlay.addEventListener('click', function() {
                    navigation.classList.remove('mobile-open');
                    overlay.classList.remove('active');
                });
            }
            
            // Navigation click handling
            const navLinks = document.querySelectorAll('#vespaGeneralHeader a.header-nav-button, #vespaGeneralHeader .breadcrumb-back');
            navLinks.forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    
                    // Check if this is the logout button
                    if (this.getAttribute('data-logout') === 'true') {
                        log('Logout button clicked');
                        
                        // Clear role selection from session storage
                        sessionStorage.removeItem('selectedUserRole');
                        log('Cleared role selection from session storage');
                        
                        // FIRST: Navigate to home page immediately
                        log('Navigating to home page first');
                        window.location.href = 'https://vespaacademy.knack.com/vespa-academy#home/';
                        
                        // THEN: Trigger logout after a small delay to allow navigation to start
                        setTimeout(() => {
                            log('Now triggering logout');
                            // Trigger Knack logout
                            const logoutLink = document.querySelector('.kn-log-out');
                            if (logoutLink) {
                                logoutLink.click();
                            } else {
                                // Fallback: try to find and click any logout link
                                const altLogout = document.querySelector('a[href*="logout"]');
                                if (altLogout) altLogout.click();
                            }
                        }, 100); // Small delay to ensure navigation starts first
                        
                        return;
                    }
                    
                    const href = this.getAttribute('href');
                    if (href && href.startsWith('#')) {
                        // Close mobile menu if open
                        navigation.classList.remove('mobile-open');
                        overlay.classList.remove('active');
                        // Navigate using Knack
                        window.location.hash = href;
                    }
                });
            });
        }
        
        // Track page views for analytics
        function trackPageView(userType, scene) {
            log('Page view tracked:', { userType, scene });
            // You can add analytics tracking here if needed
        }
        
        // Lightweight DOM cleanup function - only clean up what's actually needed
        function cleanupPageContent(newScene) {
            log('Starting lightweight DOM cleanup for scene change to:', newScene);
            
            // Only clean up if we're leaving a homepage scene
            const homepageScenes = ['scene_1210', 'scene_1215', 'scene_1252'];
            const wasOnHomepage = homepageScenes.includes(lastScene);
            const isGoingToHomepage = homepageScenes.includes(newScene);
            
            if (!wasOnHomepage) {
                log('Not leaving a homepage scene, skipping cleanup');
                return;
            }
            
            log(`Leaving homepage scene ${lastScene}, going to ${newScene}`);
            
            // Remove scene-level containers only from homepage scenes
            const sceneContainers = document.querySelectorAll('[id^="scene-level-container"]');
            sceneContainers.forEach(container => {
                log('Removing scene container:', container.id);
                container.remove();
            });
            
            // Remove homepage-specific styles only
            const homepageStyles = document.querySelectorAll('style[id*="homepage"], style[id*="resource-dashboard"], style[id*="staff-homepage"], style[id*="student-homepage"]');
            homepageStyles.forEach(style => {
                log('Removing homepage style:', style.id);
                style.remove();
            });
            
            // Reset body background styles only if leaving homepage
            document.body.classList.remove('landing-page-scene', 'dashboard-scene');
            const landingPageClasses = Array.from(document.body.classList).filter(cls => cls.startsWith('landing-page-'));
            landingPageClasses.forEach(cls => document.body.classList.remove(cls));
            
            document.body.style.backgroundColor = '';
            document.body.style.backgroundImage = '';
            document.body.style.backgroundAttachment = '';
            document.body.style.minHeight = '';
            
            // Call cleanup functions only if we have them
            if (typeof window.cleanupResourceDashboard === 'function') {
                log('Calling ResourceDashboard cleanup');
                window.cleanupResourceDashboard();
            }
            
            log('Lightweight DOM cleanup completed');
        }
        
        // Translation Functions - Simplified modal-based approach
        function initializeTranslation() {
            // Don't initialize on login pages
            const loginScenes = ['scene_1', 'scene_2', 'scene_3', 'scene_4', 'scene_5'];
            if (loginScenes.includes(currentScene)) {
                log('On login scene, not initializing translation');
                return;
            }
            
            // Check if already initialized
            if (window._translationInitialized) {
                log('Translation already initialized');
                return;
            }
            
            log('Initializing translation system');
            
            // Check if Google Translate is already loaded by the separate loader
            if (window.googleTranslateSelector) {
                console.log('[Translation] Google Translate already loaded by external loader');
                window._translationInitialized = true;
                setupTranslationHandlers();
                restoreLanguagePreference();
                $(document).trigger('vespa-translation-ready');
                return; // Exit early since it's already loaded
            }
            
            // Listen for Google Translate to be ready from external loader
            window.addEventListener('googleTranslateReady', function() {
                console.log('[Translation] Google Translate ready event received from external loader');
                window._translationInitialized = true;
                setupTranslationHandlers();
                restoreLanguagePreference();
                $(document).trigger('vespa-translation-ready');
            });
            
            // Disable GeneralHeader's fallback Google Translate loader to avoid conflicts
            if (false && !window.googleTranslateElementInit && !document.querySelector('script[src*="translate.google.com"]')) {
                function ensureTranslateHost() {
                    let host = document.getElementById('google_translate_element');
                    const modal = document.querySelector('.translation-modal');
                    const modalHidden = modal && getComputedStyle(modal).display === 'none';
                    if (!host) {
                        host = document.createElement('div');
                        host.id = 'google_translate_element';
                        document.body.appendChild(host);
                    } else if (modalHidden || host.offsetParent === null) {
                        document.body.appendChild(host);
                    }
                    host.style.position = 'absolute';
                    host.style.opacity = '0.01';
                    host.style.height = '1px';
                    host.style.width = '1px';
                    host.style.overflow = 'hidden';
                    host.style.pointerEvents = 'none';
                    host.style.zIndex = '1';
                }

                window.googleTranslateElementInit = function() {
                    console.log('[Translation] googleTranslateElementInit called (fallback)!');
                    log('Google Translate Element initializing (fallback mode)');
                    try { ensureTranslateHost(); } catch(e) { /* no-op */ }
                    
                    try {
                        new google.translate.TranslateElement({
                            pageLanguage: 'en',
                            includedLanguages: 'en,cy,pl,es,fr,de,it,pt,ar,ur,zh-CN,hi,ga',
                            layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
                            autoDisplay: false,
                            multilanguagePage: true,
                            gaTrack: false
                        }, 'google_translate_element');
                        
                        console.log('[Translation] Google Translate Element created successfully (fallback)');
                    } catch (error) {
                        console.error('[Translation] Error creating Google Translate Element (fallback):', error);
                    }
                    
                    // Aggressively remove banner and setup handlers
                    setTimeout(() => {
                        removeGoogleBanner();
                        setupTranslationHandlers();
                        restoreLanguagePreference();
                        
                        // Check if selector was created
                        const selector = document.querySelector('.goog-te-combo');
                        if (selector) {
                            console.log('[Translation] SUCCESS - Google Translate selector found:', selector);
                            console.log('[Translation] Selector options:', selector.options.length);
                        } else {
                            console.error('[Translation] WARNING - Google Translate selector NOT found after initialization');
                            // Try to find any Google Translate elements
                            const googleElements = document.querySelectorAll('[class*="goog"]');
                            console.log('[Translation] Found Google elements:', googleElements.length, googleElements);
                        }
                        
                        console.log('[Translation] Google Translate initialized successfully');
                    }, 500); // Increased delay to give more time
                    
                    // Remove banner periodically but with a flag to prevent infinite loops
                    let bannerCheckCount = 0;
                    const bannerCheckInterval = setInterval(() => {
                        removeGoogleBanner();
                        bannerCheckCount++;
                        if (bannerCheckCount > 10) { // Stop after 10 attempts (10 seconds)
                            clearInterval(bannerCheckInterval);
                        }
                    }, 1000);
                    
                    window.vespaTranslationAvailable = true;
                    window._translationInitialized = true;
                    $(document).trigger('vespa-translation-ready');
                };
                
                const script = document.createElement('script');
                script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
                script.async = true;
                
                // Add load and error handlers
                script.onload = function() {
                    console.log('[Translation] Google Translate script loaded successfully');
                };
                
                script.onerror = function() {
                    console.error('[Translation] Failed to load Google Translate script');
                    alert('Translation service failed to load. This might be due to network issues or browser restrictions.');
                };
                
                document.head.appendChild(script);
                console.log('[Translation] Google Translate script tag added to page (fallback)');
            } else {
                console.log('[Translation] Google Translate already loading or loaded, waiting for it...');
                // Check periodically if selector becomes available
                let checkCount = 0;
                const checkInterval = setInterval(() => {
                    const selector = document.querySelector('.goog-te-combo') || window.googleTranslateSelector;
                    if (selector) {
                        console.log('[Translation] Google Translate selector found!');
                        clearInterval(checkInterval);
                        window._translationInitialized = true;
                        setupTranslationHandlers();
                        restoreLanguagePreference();
                        $(document).trigger('vespa-translation-ready');
                    }
                    checkCount++;
                    if (checkCount > 30) { // Stop after 15 seconds
                        clearInterval(checkInterval);
                        console.error('[Translation] Google Translate failed to initialize after 15 seconds');
                    }
                }, 500);
            }
        }
        
        // Setup translation button and modal handlers
        function setupTranslationHandlers() {
            log('Setting up translation handlers');
            
            // CRITICAL FIX: Prevent Google Translate widget from causing page reloads
            $(document).on('click', '.goog-te-gadget, .goog-te-gadget-simple, .goog-te-gadget-icon, .goog-te-menu-value, .goog-te-menu-frame', function(e) {
                console.log('[Translation] Preventing Google Translate reload - intercepted click on:', e.target);
                e.preventDefault();
                e.stopPropagation();
                // Let the event continue to Google's handlers
                return true;
            });
            
            // Also prevent form submission if Google Translate is in a form
            $(document).on('submit', 'form:has(.goog-te-gadget)', function(e) {
                console.log('[Translation] Preventing form submission from Google Translate');
                e.preventDefault();
                return false;
            });
            
            // Remove any existing handlers first to prevent duplicates
            $(document).off('click', '#translation-menu-button');
            $(document).off('click', '.translation-modal-close');
            $(document).off('click', '.translation-modal');
            $(document).off('click', '.lang-select-btn');
            
            // Handle translation button click
            $(document).on('click', '#translation-menu-button', function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (typeof e.stopImmediatePropagation === 'function') {
                    e.stopImmediatePropagation();
                }
                log('Translation button clicked');
                console.log('[Translation] Button clicked - opening modal');
                const modal = document.getElementById('translation-modal');
                if (modal) {
                    modal.style.display = 'block';
                    removeGoogleBanner(); // Remove banner when showing modal
                    console.log('[Translation] Modal opened');
                } else {
                    console.error('[Translation] Modal not found!');
                }
            });
            
            // Handle modal close
            $(document).on('click', '.translation-modal-close', function(e) {
                e.preventDefault();
                e.stopPropagation();
                log('Close button clicked');
                const modal = document.getElementById('translation-modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
            
            // Handle clicking outside modal to close
            $(document).on('click', '.translation-modal', function(e) {
                if (e.target === this) {
                    this.style.display = 'none';
                }
            });
            
            // Handle language button clicks
            $(document).on('click', '.lang-select-btn', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const $clickedButton = $(this); // Store reference to clicked button
                const lang = $(this).data('lang');
                log('Language selected:', lang);
                console.log('[Translation] Language selected:', lang);
                
                // Wait a moment for the selector to be available if it's not ready yet
                const checkAndTranslate = (attempts = 0) => {
                    // Check both possible selectors (from external loader or local)
                    const selector = document.querySelector('.goog-te-combo') || window.googleTranslateSelector;
                    if (selector) {
                        selector.value = lang;
                        const evt = document.createEvent('HTMLEvents');
                        evt.initEvent('change', true, true);
                        selector.dispatchEvent(evt);
                        
                        // Save preference
                        saveLanguagePreference(lang);
                        
                        // Update button states
                        $('.lang-select-btn').removeClass('active');
                        $clickedButton.addClass('active');
                        
                        // Close modal after selection
                        setTimeout(() => {
                            document.getElementById('translation-modal').style.display = 'none';
                            removeGoogleBanner(); // Remove banner after translation
                        }, 500);
                    } else if (attempts < 10) {
                        // Try again after a short delay
                        console.log(`[Translation] Waiting for Google Translate to initialize... attempt ${attempts + 1}`);
                        setTimeout(() => checkAndTranslate(attempts + 1), 500);
                    } else {
                        console.error('[Translation] Google Translate selector not found after 10 attempts!');
                        alert('Translation service is still loading. Please try again in a moment.');
                    }
                };
                
                // Start checking for the selector
                checkAndTranslate();
            });
            
            console.log('[Translation] Handlers setup complete');
        }
        
        // Expose functions globally for debugging
        window.vespaTranslation = {
            setupHandlers: setupTranslationHandlers,
            removeGoogleBanner: removeGoogleBanner,
            initialize: initializeTranslation,
            addStyles: addTranslationStyles
        };
        
        // Save and restore language preferences
        function saveLanguagePreference(language) {
            if (language && language !== '') {
                localStorage.setItem('vespaPreferredLanguage', language);
                log('Saved language preference:', language);
            }
        }
        
        function restoreLanguagePreference() {
            const savedLanguage = localStorage.getItem('vespaPreferredLanguage');
            if (savedLanguage && savedLanguage !== 'en') {
                log('Restoring saved language preference:', savedLanguage);
                // Check both possible selectors (from external loader or local)
                const selector = document.querySelector('.goog-te-combo') || window.googleTranslateSelector;
                if (selector) {
                    // Wait a bit for Google Translate to fully initialize
                    setTimeout(() => {
                        selector.value = savedLanguage;
                        const evt = document.createEvent('HTMLEvents');
                        evt.initEvent('change', false, true);
                        selector.dispatchEvent(evt);
                        // Show refresh button for non-English languages
                        const refreshBtn = document.getElementById('translation-refresh-btn');
                        if (refreshBtn) refreshBtn.style.display = 'block';
                    }, 500);
                }
            }
        }
        

        
        // Force remove Google Translate banner
        function removeGoogleBanner() {
            // Only hide visible banner frames; do not remove body > .skiptranslate
            const selectors = [
                '.goog-te-banner-frame',
                '.goog-te-banner',
                '.goog-te-balloon-frame'
            ];
            selectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => {
                    try { el.style.display = 'none'; } catch(e) {}
                });
            });
            log('Google Translate banner hidden');
        }
        
        function addTranslationStyles() {
            // Add modal and translation styles
            if (document.getElementById('translation-modal-styles')) return;
            
            const style = document.createElement('style');
            style.id = 'translation-modal-styles';
            style.textContent = `
                /* Translation Modal Styles */
                .translation-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0, 0, 0, 0.8);
                    z-index: 100000;
                    display: none;
                    align-items: center;
                    justify-content: center;
                }
                
                .translation-modal-content {
                    background: #2a3c7a;
                    border-radius: 12px;
                    width: 90%;
                    max-width: 500px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
                    color: white;
                }
                
                .translation-modal-header {
                    padding: 20px;
                    border-bottom: 1px solid rgba(255,255,255,0.1);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .translation-modal-header h3 {
                    margin: 0;
                    font-size: 20px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .translation-modal-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 28px;
                    cursor: pointer;
                    padding: 0;
                    width: 30px;
                    height: 30px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 4px;
                    transition: background 0.2s;
                }
                
                .translation-modal-close:hover {
                    background: rgba(255,255,255,0.1);
                }
                
                .translation-modal-body {
                    padding: 20px;
                }
                
                .language-buttons {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }
                
                .lang-select-btn {
                    background: rgba(255,255,255,0.1);
                    border: 2px solid rgba(255,255,255,0.2);
                    color: white;
                    padding: 12px 16px;
                    border-radius: 8px;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.3s;
                    text-align: left;
                }
                
                .lang-select-btn:hover {
                    background: rgba(0, 229, 219, 0.2);
                    border-color: rgba(0, 229, 219, 0.5);
                    transform: translateY(-2px);
                }
                
                .lang-select-btn.active {
                    background: rgba(0, 229, 219, 0.3);
                    border-color: rgba(0, 229, 219, 0.6);
                }
                
                @media (max-width: 480px) {
                    .language-buttons {
                        grid-template-columns: 1fr;
                    }
                }
                
                /* AGGRESSIVELY HIDE GOOGLE TRANSLATE BANNER */
                .goog-te-banner-frame,
                .goog-te-banner-frame.skiptranslate,
                body > .skiptranslate,
                iframe.skiptranslate,
                .goog-te-banner {
                    display: none !important;
                    visibility: hidden !important;
                    height: 0 !important;
                    width: 0 !important;
                    line-height: 0 !important;
                    font-size: 0 !important;
                    position: absolute !important;
                    top: -9999px !important;
                    left: -9999px !important;
                    opacity: 0 !important;
                    pointer-events: none !important;
                }
                
                /* Fix body positioning - FORCE it */
                body {
                    top: 0 !important;
                    position: relative !important;
                    margin-top: 0 !important;
                    padding-top: 65px !important; /* Keep our header spacing */
                }
                
                body.translated-ltr,
                body.translated-rtl,
                body.translated {
                    top: 0 !important;
                    position: relative !important;
                    margin-top: 0 !important;
                }
                
                /* Ensure our header stays on top */
                .vespa-general-header {
                    z-index: 99999 !important;
                }
                

                
                /* Make Google Translate element invisible but functional */
                #google_translate_element {
                    position: absolute !important;
                    opacity: 0.01 !important;
                    height: 1px !important;
                    width: 1px !important;
                    overflow: hidden !important;
                    pointer-events: none !important;
                    z-index: -1 !important;
                    /* Tiny and nearly invisible but still exists in DOM for initialization */
                }
                
                /* Style when modal is open */
                .translation-modal[style*="display: block"] {
                    display: flex !important;
                }
            `;
            document.head.appendChild(style);
            
            // Remove Google Translate banner and fix body
            setTimeout(() => {
                const banner = document.querySelector('.goog-te-banner-frame');
                if (banner) banner.style.display = 'none';
                document.body.style.top = '0px';
                document.body.style.position = 'relative';
                document.body.classList.add('translated');
            }, 100);
            
            log('Translation widget styled successfully');
        }
        
        // Function to refresh translations after dynamic content loads
        // This is exposed globally so any app can call window.refreshTranslations()
        // Used by: knackAppLoader (auto), manual refresh button, and can be called by any app
        window.refreshTranslations = function() {
            // Trigger Google Translate to re-scan the page
            const evt = document.createEvent('HTMLEvents');
            evt.initEvent('change', false, true);
            // Check both possible selectors (from external loader or local)
            const selector = document.querySelector('.goog-te-combo') || window.googleTranslateSelector;
            if (selector) {
                const currentLang = selector.value;
                if (currentLang && currentLang !== 'en' && currentLang !== '') {
                    log(`Refreshing translations for language: ${currentLang}`);
                    // Briefly switch to English and back to refresh
                    selector.value = 'en';
                    selector.dispatchEvent(evt);
                    setTimeout(() => {
                        selector.value = currentLang;
                        selector.dispatchEvent(evt);
                        // Also try to translate embedded content
                        translateEmbeddedContent(currentLang);
                        // Always remove banner after refresh
                        removeGoogleBanner();
                        // Trigger event for apps that need to know
                        $(document).trigger('vespa-translation-refreshed', { language: currentLang });
                    }, 100);
                } else {
                    log('No active translation to refresh (currently in English)');
                }
            }
        };
        
        // Function to add translation notice for Slides.com embeds
        function addSlidesTranslationNotice(iframe, targetLang) {
            const wrapper = document.createElement('div');
            wrapper.className = 'slides-translate-notice';
            wrapper.style.cssText = `
                position: relative;
                display: inline-block;
                width: 100%;
            `;
            
            // Create notice overlay
            const notice = document.createElement('div');
            notice.className = 'translation-notice-overlay';
            notice.innerHTML = `
                <div style="
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: rgba(0, 229, 219, 0.95);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 600;
                    z-index: 1000;
                    cursor: pointer;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                " onclick="this.style.display='none'">
                    <i class="fa fa-info-circle"></i>
                    <span>Slides cannot auto-translate</span>
                    <i class="fa fa-times" style="margin-left: 8px; opacity: 0.8;"></i>
                </div>
            `;
            
            // Wrap the iframe
            iframe.parentNode.insertBefore(wrapper, iframe);
            wrapper.appendChild(iframe);
            wrapper.appendChild(notice);
            
            // Language-specific messages
            const messages = {
                'cy': 'Ni all sleidiau gyfieithu\'n awtomatig', // Welsh
                'pl': 'Slajdy nie mogą być automatycznie tłumaczone', // Polish
                'es': 'Las diapositivas no se pueden traducir automáticamente', // Spanish
                'fr': 'Les diapositives ne peuvent pas être traduites automatiquement', // French
                'de': 'Folien können nicht automatisch übersetzt werden' // German
            };
            
            if (messages[targetLang]) {
                notice.querySelector('span').textContent = messages[targetLang];
            }
            
            // Add option to open slides in new tab
            const openButton = document.createElement('button');
            openButton.style.cssText = `
                position: absolute;
                bottom: 10px;
                right: 10px;
                background: rgba(42, 60, 122, 0.9);
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                font-size: 11px;
                cursor: pointer;
                z-index: 1000;
                display: flex;
                align-items: center;
                gap: 4px;
            `;
            openButton.innerHTML = '<i class="fa fa-external-link-alt"></i> Open in new tab for manual translation';
            openButton.onclick = function() {
                window.open(iframe.src, '_blank');
            };
            wrapper.appendChild(openButton);
            
            // Auto-hide notice after 10 seconds
            setTimeout(() => {
                if (notice.querySelector('div')) {
                    notice.querySelector('div').style.display = 'none';
                }
            }, 10000);
        }
        
        // Function to handle embedded content translation
        function translateEmbeddedContent(targetLang) {
            // Handle iframes (slides, embedded documents)
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                try {
                    // Check if we can access the iframe (same-origin policy)
                    if (iframe.contentDocument) {
                        // Add Google Translate to the iframe
                        const iframeDoc = iframe.contentDocument;
                        if (!iframeDoc.querySelector('.goog-te-banner-frame')) {
                            // Inject translate element into iframe
                            const translateDiv = iframeDoc.createElement('div');
                            translateDiv.id = 'google_translate_element_iframe';
                            translateDiv.className = 'notranslate';
                            iframeDoc.body.appendChild(translateDiv);
                            
                            // Try to trigger translation in iframe
                            log('Attempting to translate iframe content');
                        }
                    }
                } catch (e) {
                    // Cross-origin iframe - try alternative approach
                    // Add translate attribute to iframe
                    iframe.setAttribute('translate', 'yes');
                    iframe.className = iframe.className.replace('notranslate', '');
                    
                    // For Google Slides/Docs, try to append language parameter
                    if (iframe.src && iframe.src.includes('docs.google.com')) {
                        const langMap = {
                            'cy': 'cy', // Welsh
                            'pl': 'pl', // Polish
                            'es': 'es', // Spanish
                            'fr': 'fr', // French
                            'de': 'de', // German
                            'ar': 'ar', // Arabic
                            'zh-CN': 'zh-CN' // Chinese
                        };
                        
                        if (langMap[targetLang] && !iframe.src.includes('hl=')) {
                            // Add language parameter to Google Docs/Slides URL
                            const separator = iframe.src.includes('?') ? '&' : '?';
                            iframe.src = iframe.src + separator + 'hl=' + langMap[targetLang];
                            log('Updated Google Slides URL with language parameter:', targetLang);
                        }
                    }
                    
                    // Handle Slides.com embeds - limited options
                    if (iframe.src && iframe.src.includes('slides.com')) {
                        // Mark for special handling
                        iframe.setAttribute('data-translate-attempt', 'true');
                        iframe.setAttribute('data-target-lang', targetLang);
                        
                        // Add a translation notice/button overlay
                        if (!iframe.parentElement.querySelector('.slides-translate-notice')) {
                            addSlidesTranslationNotice(iframe, targetLang);
                        }
                        
                        log('Slides.com embed detected - added translation notice');
                    }
                }
            });
            
            // Handle embedded PDFs and other objects
            const embeds = document.querySelectorAll('embed, object');
            embeds.forEach(embed => {
                // Remove notranslate class if present
                embed.className = embed.className.replace('notranslate', '');
            });
        }
        
        // Initialize the header
        function init() {
            log('Starting General Header initialization...');
            
            // Check if we're on a login page
            const loginScenes = ['scene_1', 'scene_2', 'scene_3', 'scene_4', 'scene_5']; // Add your actual login scene IDs
            const loginPages = ['login', 'sign-in', 'register', 'forgot-password'];
            const currentUrl = window.location.href.toLowerCase();
            
            const isLoginPage = loginScenes.includes(currentScene) || 
                               loginPages.some(page => currentUrl.includes(page));
            
            // Also check for home page redirect
            $(document).on('knack-scene-render.scene_1', function() {
                // If we're on the home/login page and we came from a logout
                if (window.location.hash === '#home/' || window.location.hash === '#home' || 
                    window.location.pathname.endsWith('/vespa-academy/') ||
                    window.location.pathname.endsWith('/vespa-academy')) {
                    log('On home page after potential logout');
                    // Ensure header is removed
                    const existingHeader = document.getElementById('vespaGeneralHeader');
                    if (existingHeader) {
                        existingHeader.remove();
                        document.body.classList.remove('has-general-header');
                        document.body.style.paddingTop = '';
                    }
                }
            });
            
            if (isLoginPage) {
                log('On login page, not showing header');
                return;
            }
            
            // Inject header immediately for scenes with loading screens, with delay for others
            if (currentScene === 'scene_1014' || currentScene === 'scene_1095') {
                // For scenes with loading screen, inject immediately
                injectHeader();
                // Initialize translation system
                log('Initializing translation system for loading screen scene');
                setTimeout(() => {
                    addTranslationStyles();
                    initializeTranslation();
                    // Ensure handlers are set up
                    setTimeout(setupTranslationHandlers, 100);
                }, 500);
            } else {
                // For other scenes, slight delay to allow other apps to load
                setTimeout(() => {
                    injectHeader();
                    // Initialize translation system
                    log('Initializing translation system for regular scene');
                    setTimeout(() => {
                        addTranslationStyles();
                        initializeTranslation();
                        // Ensure handlers are set up
                        setTimeout(setupTranslationHandlers, 100);
                    }, 500);
                }, 250);
            }
            
            // Re-inject on scene changes in case it gets removed - BUT ONLY IF HEADER IS MISSING
            $(document).on('knack-scene-render.any', function(event, scene) {
                log('Scene rendered, checking header...', scene.key);
                
                // AGGRESSIVE CLEANUP: If scene changed, clean up previous page content
                if (lastScene && lastScene !== scene.key) {
                    log(`Scene changed from ${lastScene} to ${scene.key} - performing cleanup`);
                    cleanupPageContent(scene.key);
                }
                lastScene = scene.key;
                
                // Check if this is a login scene
                const isNowLoginPage = loginScenes.includes(scene.key) || 
                                      loginPages.some(page => window.location.href.toLowerCase().includes(page));
                
                if (isNowLoginPage) {
                    log('Navigated to login page, removing header');
                    const existingHeader = document.getElementById('vespaGeneralHeader');
                    if (existingHeader) existingHeader.remove();
                    document.body.classList.remove('has-general-header');
                    document.body.style.paddingTop = '';
                    // Clear the global loaded flag
                    window._generalHeaderLoaded = false;
                    return;
                }
                
                // ALWAYS check for translation widget on non-login pages
                const existingHeader = document.getElementById('vespaGeneralHeader');
                if (!existingHeader) {
                    const userType = getUserType();
                    if (userType) {
                        log('Header missing and user logged in, re-injecting after delay');
                        // Longer delay for scene changes to ensure other apps load first
                        setTimeout(() => {
                                                    // Double-check header is still missing before injecting
                        if (!document.getElementById('vespaGeneralHeader')) {
                            injectHeader();
                            // Initialize translation system after header re-injection
                            log('Initializing translation system after header injection');
                            setTimeout(() => {
                                addTranslationStyles();
                                initializeTranslation();
                                // Ensure handlers are set up
                                setTimeout(setupTranslationHandlers, 100);
                            }, 500);
                        }
                        }, 300);
                    }
                } else {
                    log('Header exists, checking translation system');
                    // ALWAYS ensure translation system is initialized on non-login pages
                    setTimeout(() => {
                        if (!window._translationInitialized) {
                            log('Translation system not initialized, initializing now!');
                            addTranslationStyles();
                            initializeTranslation();
                            // Ensure handlers are set up
                            setTimeout(setupTranslationHandlers, 100);
                        } else {
                            log('Translation system already initialized');
                            // Force remove banner just in case
                            removeGoogleBanner();
                            // Re-setup handlers in case they were lost
                            setupTranslationHandlers();
                        }
                    }, 1000); // Give page time to settle
                }
            });
            
            // Listen for logout events
            $(document).on('knack-user-logout.any', function() {
                log('User logged out, removing header and clearing flag');
                const existingHeader = document.getElementById('vespaGeneralHeader');
                if (existingHeader) existingHeader.remove();
                document.body.classList.remove('has-general-header');
                document.body.style.paddingTop = '';
                // Clear the global loaded flag
                window._generalHeaderLoaded = false;
                // Clear session storage flag
                sessionStorage.removeItem('_generalHeaderLoadedSession');
                // Clear language preference on logout
                localStorage.removeItem('vespaPreferredLanguage');
                log('Cleared language preference on logout');
                
                // Since we navigate BEFORE logout, user should already be on home page
                log('Logout complete - user should already be on home page');
            });
        }
        
        // Global cleanup function for role selection modals
        window.cleanupRoleSelectionModal = function() {
            const existingModal = document.getElementById('roleSelectionModal');
            if (existingModal) {
                existingModal.remove();
            }
            const existingStyles = document.getElementById('roleSelectionModalStyles');
            if (existingStyles) {
                existingStyles.remove();
            }
            // Reset modal flag
            window._roleModalShowing = false;
        };
        
        // Start initialization
        init();
    }
    
    // Export the initializer function
    window.initializeGeneralHeader = initializeGeneralHeader;
    
    console.log('[General Header] Script setup complete, initializer function ready');
})();
