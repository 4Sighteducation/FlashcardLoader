// ===== STAFF STUDENT EMULATION SETUP INTEGRATION =====
// Add this code to CopyofstaffHomepage5f.js

// 1. Add this near the top of the file, after the initial configuration:
function loadStudentEmulationModule() {
  const script = document.createElement('script');
  // Update this URL to point to your hosted file
  script.src = '/staff-student-emulation-setup.js';
  script.async = true;
  script.onload = function() {
    console.log('[Staff Homepage] Student emulation setup module loaded successfully');
  };
  script.onerror = function() {
    console.error('[Staff Homepage] Failed to load student emulation setup module');
  };
  document.head.appendChild(script);
}

// 2. Call the loader function when the page loads
// Add this at the end of your existing jQuery ready function:
$(document).ready(function() {
  // ... existing code ...
  
  // Load the student emulation module
  loadStudentEmulationModule();
});

// 3. Modify your renderHomepage function to include the setup call
// Find the renderHomepage function (around line 4547) and add this after getting profileData:

async function renderHomepage() {
  // ... existing code to get container and show loading ...
  
  try {
    // Get staff profile data
    const profileData = await getStaffProfileData();
    if (!profileData) {
      // ... existing error handling ...
      return;
    }
    
    // === ADD THIS SECTION ===
    // Initialize student emulation setup
    if (window.StaffStudentEmulationSetup && profileData.email) {
      console.log('[Staff Homepage] Initializing student emulation setup...');
      
      try {
        const emulationResult = await window.StaffStudentEmulationSetup.setup(
          profileData.email,
          profileData.userId
        );
        
        if (emulationResult.success) {
          console.log('[Staff Homepage] Student emulation setup completed:', emulationResult.message);
          
          // Optionally refresh profile data if roles were updated
          if (emulationResult.message !== 'User already has Student role') {
            // Re-fetch profile data to get updated roles
            const updatedProfile = await getStaffProfileData();
            if (updatedProfile) {
              profileData.roles = updatedProfile.roles;
            }
          }
        } else {
          console.error('[Staff Homepage] Student emulation setup failed:', emulationResult.error);
        }
      } catch (setupError) {
        console.error('[Staff Homepage] Error during student emulation setup:', setupError);
        // Continue with homepage rendering even if setup fails
      }
    }
    // === END OF ADDITION ===
    
    // Continue with existing code...
    const hasAdminRole = isStaffAdmin(profileData.roles);
    // ... rest of the function ...
  } catch (error) {
    // ... existing error handling ...
  }
}

// 4. Alternative: If you want to trigger the setup from trackUserLogin instead:
// Modify the trackUserLogin function (around line 1233):

async function trackUserLogin() {
  try {
    // ... existing login tracking code ...
    
    // After successful login tracking, add:
    if (window.StaffStudentEmulationSetup && user.email) {
      // Run setup asynchronously without blocking login
      window.StaffStudentEmulationSetup.setup(user.email, user.id)
        .then(result => {
          if (result.success) {
            console.log('[Staff Homepage] Student emulation setup completed during login');
          }
        })
        .catch(error => {
          console.error('[Staff Homepage] Student emulation setup error during login:', error);
        });
    }
    
    return true;
  } catch (error) {
    // ... existing error handling ...
  }
} 
