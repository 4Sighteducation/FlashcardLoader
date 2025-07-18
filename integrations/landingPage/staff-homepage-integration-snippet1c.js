/**
 * Staff Student Emulation Setup Module
 * This module handles the automatic setup of student emulation capabilities for staff members
 * It ensures staff have the necessary "Student" role and creates required database records
 * 
 * @module StaffStudentEmulationSetup
 * @version 1.0.0
 */

(function() {
    'use strict';
    
    // Debug log to check what's available when module loads
    console.log('[Student Emulation Setup] Module loading...');
    console.log('[Student Emulation Setup] STAFFHOMEPAGE_CONFIG available:', !!window.STAFFHOMEPAGE_CONFIG);
    console.log('[Student Emulation Setup] Knack object available:', !!window.Knack);
    
    // Configuration
    const CONFIG = {
      KNACK_API_URL: 'https://api.knack.com/v1',
      get APP_ID() {
        // First try to get from STAFFHOMEPAGE_CONFIG (set by knackbridge.js)
        if (window.STAFFHOMEPAGE_CONFIG && window.STAFFHOMEPAGE_CONFIG.knackAppId) {
          return window.STAFFHOMEPAGE_CONFIG.knackAppId;
        }
        // Then try global variables
        if (window.KNACK_APP_ID) {
          return window.KNACK_APP_ID;
        }
        // Then try Knack object
        if (window.Knack && window.Knack.application_id) {
          return window.Knack.application_id;
        }
        // No fallback - credentials must be provided by the parent application
        console.error('[Student Emulation Setup] No App ID found. Credentials must be provided by the parent application.');
        return null;
      },
      get API_KEY() {
        // First try to get from STAFFHOMEPAGE_CONFIG (set by knackbridge.js)
        if (window.STAFFHOMEPAGE_CONFIG && window.STAFFHOMEPAGE_CONFIG.knackApiKey) {
          return window.STAFFHOMEPAGE_CONFIG.knackApiKey;
        }
        // Then try global variables
        if (window.KNACK_API_KEY) {
          return window.KNACK_API_KEY;
        }
        // Then try Knack object
        if (window.Knack && window.Knack.api_key) {
          return window.Knack.api_key;
        }
        // No fallback - credentials must be provided by the parent application
        console.error('[Student Emulation Setup] No API Key found. Credentials must be provided by the parent application.');
        return null;
      },
      MAX_RETRIES: 3,
      RETRY_DELAY: 1000
    };
  
    // Field mappings
    const FIELDS = {
      OBJECT_3: {
        EMAIL: 'field_70',
        USER_ROLES: 'field_73'
      },
      OBJECT_6: {
        EMAIL: 'field_20',
        ACCOUNT_STATUS: 'field_18',
        USER_ROLE: 'field_46',
        GROUP: 'field_565',
        OBJECT_10_CONNECTION: 'field_182'
      },
      OBJECT_10: {
        EMAIL: 'field_197',
        GROUP: 'field_223'
      },
      OBJECT_29: {
        EMAIL: 'field_2732',
        GROUP: 'field_1824',
        OBJECT_10_CONNECTION: 'field_792'
      }
    };
  
    // Helper function to get API headers
    function getHeaders() {
      // Log the credentials being used for debugging
      const appId = CONFIG.APP_ID;
      const apiKey = CONFIG.API_KEY;
      
      // Check if credentials are available
      if (!appId || !apiKey) {
        throw new Error('API credentials not available. The module requires proper Knack credentials from the parent application.');
      }
      
      console.log('[Student Emulation Setup] Using App ID:', appId);
      
      return {
        'X-Knack-Application-Id': appId,
        'X-Knack-REST-API-Key': apiKey,
        'Content-Type': 'application/json'
      };
    }
  
    // Helper function for API calls with retry logic
    async function apiCall(options, retries = CONFIG.MAX_RETRIES) {
      // Check if jQuery is available
      if (typeof $ === 'undefined' || typeof $.ajax === 'undefined') {
        throw new Error('jQuery is not available. The module requires jQuery to make API calls.');
      }
      
      try {
        const response = await $.ajax({
          url: options.url,
          type: options.method || 'GET',
          headers: options.headers || getHeaders(),
          data: options.data ? JSON.stringify(options.data) : undefined,
          contentType: 'application/json',
          dataType: 'json'
        });
        return response;
      } catch (error) {
        console.error('[Student Emulation Setup] API call failed:', {
          status: error.status,
          statusText: error.statusText,
          responseText: error.responseText,
          url: options.url,
          appId: CONFIG.APP_ID
        });
        
        if (retries > 0 && error.status !== 400) {
          console.log(`[Student Emulation Setup] Retrying API call, ${retries} attempts remaining`);
          await new Promise(resolve => setTimeout(resolve, CONFIG.RETRY_DELAY));
          return apiCall(options, retries - 1);
        }
        throw error;
      }
    }
  
    // Main setup function
    async function setupStudentEmulation(userEmail, userId) {
      console.log('[Student Emulation Setup] Starting setup for:', userEmail);
      
      // Wait for STAFFHOMEPAGE_CONFIG if it's not available yet
      let waitAttempts = 0;
      while (!window.STAFFHOMEPAGE_CONFIG && waitAttempts < 50) { // Max 5 seconds wait
        console.log('[Student Emulation Setup] Waiting for STAFFHOMEPAGE_CONFIG...');
        await new Promise(resolve => setTimeout(resolve, 100));
        waitAttempts++;
      }
      
      if (!window.STAFFHOMEPAGE_CONFIG) {
        console.warn('[Student Emulation Setup] STAFFHOMEPAGE_CONFIG not found after waiting. Using fallback credentials.');
      }
      
      try {
        // Step 1: Check if user already has Student role
        const hasStudentRole = await checkStudentRole(userEmail);
        
        if (hasStudentRole) {
          console.log('[Student Emulation Setup] User already has Student role. Skipping setup.');
          return { success: true, message: 'User already has Student role' };
        }
  
        console.log('[Student Emulation Setup] User does not have Student role. Proceeding with setup...');
  
        // Step 2: Add Student role to user
        await addStudentRole(userEmail);
  
        // Step 3: Create Object_10 record
        const object10Record = await createObject10Record(userEmail);
  
        // Step 4: Create Object_29 record
        await createObject29Record(userEmail, object10Record.id);
  
        // Step 5: Create/Update Object_6 record
        await setupObject6Record(userEmail, object10Record.id);
  
        console.log('[Student Emulation Setup] Setup completed successfully!');
        return { success: true, message: 'Student emulation setup completed' };
  
      } catch (error) {
        console.error('[Student Emulation Setup] Error during setup:', error);
        return { success: false, error: error.message || 'Unknown error occurred' };
      }
    }
  
    // Check if user has Student role
    async function checkStudentRole(userEmail) {
      const filters = encodeURIComponent(JSON.stringify({
        match: 'and',
        rules: [{ field: FIELDS.OBJECT_3.EMAIL, operator: 'is', value: userEmail }]
      }));
  
      const response = await apiCall({
        url: `${CONFIG.KNACK_API_URL}/objects/object_3/records?filters=${filters}`,
        method: 'GET'
      });
  
      if (!response.records || response.records.length === 0) {
        throw new Error('Staff record not found');
      }
  
      const staffRecord = response.records[0];
      const roles = staffRecord[FIELDS.OBJECT_3.USER_ROLES] || [];
      
      // Check if "Student" is in the roles array
      return roles.includes('Student') || roles.includes('profile_6');
    }
  
    // Add Student role to user
    async function addStudentRole(userEmail) {
      // First, get the current user record
      const filters = encodeURIComponent(JSON.stringify({
        match: 'and',
        rules: [{ field: FIELDS.OBJECT_3.EMAIL, operator: 'is', value: userEmail }]
      }));
  
      const response = await apiCall({
        url: `${CONFIG.KNACK_API_URL}/objects/object_3/records?filters=${filters}`,
        method: 'GET'
      });
  
      if (!response.records || response.records.length === 0) {
        throw new Error('Staff record not found');
      }
  
      const staffRecord = response.records[0];
      let currentRoles = staffRecord[FIELDS.OBJECT_3.USER_ROLES] || [];
      
      // Ensure currentRoles is an array
      if (!Array.isArray(currentRoles)) {
        currentRoles = [currentRoles];
      }
  
      // Add Student role if not present
      if (!currentRoles.includes('Student') && !currentRoles.includes('profile_6')) {
        currentRoles.push('Student');
      }
  
      // Update the user record with new roles
      console.log('[Student Emulation Setup] Adding Student role to user...');
      await apiCall({
        url: `${CONFIG.KNACK_API_URL}/objects/object_3/records/${staffRecord.id}`,
        method: 'PUT',
        data: {
          [FIELDS.OBJECT_3.USER_ROLES]: currentRoles
        }
      });
    }
  
    // Create Object_10 record
    async function createObject10Record(userEmail) {
      console.log('[Student Emulation Setup] Creating Object_10 record...');
      
      // Check if record already exists
      const filters = encodeURIComponent(JSON.stringify({
        match: 'and',
        rules: [{ field: FIELDS.OBJECT_10.EMAIL, operator: 'is', value: userEmail }]
      }));
  
      const existingResponse = await apiCall({
        url: `${CONFIG.KNACK_API_URL}/objects/object_10/records?filters=${filters}`,
        method: 'GET'
      });
  
      if (existingResponse.records && existingResponse.records.length > 0) {
        console.log('[Student Emulation Setup] Object_10 record already exists');
        return existingResponse.records[0];
      }
  
      // Create new record
      const response = await apiCall({
        url: `${CONFIG.KNACK_API_URL}/objects/object_10/records`,
        method: 'POST',
        data: {
          [FIELDS.OBJECT_10.EMAIL]: userEmail,
          [FIELDS.OBJECT_10.GROUP]: 'STAFF'
        }
      });
  
      return response;
    }
  
    // Create Object_29 record
    async function createObject29Record(userEmail, object10Id) {
      console.log('[Student Emulation Setup] Creating Object_29 record...');
      
      // Check if record already exists
      const filters = encodeURIComponent(JSON.stringify({
        match: 'and',
        rules: [{ field: FIELDS.OBJECT_29.EMAIL, operator: 'is', value: userEmail }]
      }));
  
      const existingResponse = await apiCall({
        url: `${CONFIG.KNACK_API_URL}/objects/object_29/records?filters=${filters}`,
        method: 'GET'
      });
  
      if (existingResponse.records && existingResponse.records.length > 0) {
        console.log('[Student Emulation Setup] Object_29 record already exists');
        return existingResponse.records[0];
      }
  
      // Create new record
      const response = await apiCall({
        url: `${CONFIG.KNACK_API_URL}/objects/object_29/records`,
        method: 'POST',
        data: {
          [FIELDS.OBJECT_29.EMAIL]: userEmail,
          [FIELDS.OBJECT_29.GROUP]: 'STAFF',
          [FIELDS.OBJECT_29.OBJECT_10_CONNECTION]: [object10Id]
        }
      });
  
      return response;
    }
  
    // Create or update Object_6 record
    async function setupObject6Record(userEmail, object10Id) {
      console.log('[Student Emulation Setup] Setting up Object_6 record...');
      
      // Check if record already exists
      const filters = encodeURIComponent(JSON.stringify({
        match: 'and',
        rules: [{ field: FIELDS.OBJECT_6.EMAIL, operator: 'is', value: userEmail }]
      }));
  
      const existingResponse = await apiCall({
        url: `${CONFIG.KNACK_API_URL}/objects/object_6/records?filters=${filters}`,
        method: 'GET'
      });
  
      if (existingResponse.records && existingResponse.records.length > 0) {
        // Update existing record
        console.log('[Student Emulation Setup] Updating existing Object_6 record');
        const recordId = existingResponse.records[0].id;
        
        await apiCall({
          url: `${CONFIG.KNACK_API_URL}/objects/object_6/records/${recordId}`,
          method: 'PUT',
          data: {
            [FIELDS.OBJECT_6.GROUP]: 'STAFF',
            [FIELDS.OBJECT_6.OBJECT_10_CONNECTION]: [object10Id]
          }
        });
      } else {
        // Create new record
        console.log('[Student Emulation Setup] Creating new Object_6 record');
        await apiCall({
          url: `${CONFIG.KNACK_API_URL}/objects/object_6/records`,
          method: 'POST',
          data: {
            [FIELDS.OBJECT_6.EMAIL]: userEmail,
            [FIELDS.OBJECT_6.ACCOUNT_STATUS]: 'Active',
            [FIELDS.OBJECT_6.USER_ROLE]: 'Student',
            [FIELDS.OBJECT_6.GROUP]: 'STAFF',
            [FIELDS.OBJECT_6.OBJECT_10_CONNECTION]: [object10Id]
          }
        });
      }
    }
  
    // Integration function to be called from the main homepage
    window.StaffStudentEmulationSetup = {
      setup: async function(userEmail, userId) {
        if (!userEmail) {
          console.error('[Student Emulation Setup] No user email provided');
          return { success: false, error: 'No user email provided' };
        }
  
        return await setupStudentEmulation(userEmail, userId);
      },
      
      // Expose configuration for potential overrides
      config: CONFIG
    };
  
    // Wait a bit to ensure STAFFHOMEPAGE_CONFIG is available
    setTimeout(() => {
      console.log('[Student Emulation Setup] Checking configuration after delay:');
      console.log('[Student Emulation Setup] STAFFHOMEPAGE_CONFIG:', window.STAFFHOMEPAGE_CONFIG);
      console.log('[Student Emulation Setup] App ID will be:', CONFIG.APP_ID);
      console.log('[Student Emulation Setup] Module ready for use');
    }, 100);
    
    console.log('[Student Emulation Setup] Module loaded successfully');
  })(); 
