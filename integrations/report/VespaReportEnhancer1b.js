// VespaDirectInjector.js - Direct script to enhance VESPA reports
(function() {
  console.log("[VESPA Direct Injector] Script loaded and running");
  
  // Run on document ready
  $(document).ready(function() {
    // Simple way to check if we're on the right page
    if (window.location.href.includes("mygroup-vespa-results2")) {
      console.log("[VESPA Direct Injector] VESPA results page detected");
      setupEnhancer();
    }
  });
  
  function setupEnhancer() {
    // Find our views
    const profileContainer = document.querySelector('#view_3015 .kn-rich_text__content');
    const reportContainer = document.querySelector('#view_2776 .kn-rich_text__content');
    
    if (!profileContainer || !reportContainer) {
      console.log("[VESPA Direct Injector] Containers not found, retrying in 1s...");
      setTimeout(setupEnhancer, 1000);
      return;
    }
    
    console.log("[VESPA Direct Injector] Views found, setting up enhancer");
    
    // Add a simple message to prove the script works
    profileContainer.innerHTML = `
      <div style="padding: 15px; background-color: #e8f5e9; border-left: 4px solid #4CAF50; margin-bottom: 15px;">
        <h3 style="margin-top: 0; color: #2E7D32;">Profile Enhancer Active</h3>
        <p>When you click a student report button, their profile will appear here.</p>
      </div>
    `;
    
    // Set up a mutation observer to detect when the report table is loaded
    const observer = new MutationObserver(function() {
      // Look for report buttons and add click handlers
      addReportButtonHandlers();
    });
    
    // Start observing
    observer.observe(reportContainer, { 
      childList: true, 
      subtree: true 
    });
    
    // Also try immediately
    addReportButtonHandlers();
  }
  
  function addReportButtonHandlers() {
    // Find all report buttons that don't already have our handler
    const reportButtons = document.querySelectorAll('button.view-report-button:not([data-enhanced="true"])');
    
    if (reportButtons.length > 0) {
      console.log(`[VESPA Direct Injector] Adding handlers to ${reportButtons.length} buttons`);
      
      reportButtons.forEach(button => {
        // Mark as enhanced
        button.setAttribute('data-enhanced', 'true');
        
        // Add click handler
        button.addEventListener('click', function() {
          // Get student name from the row
          const row = this.closest('tr');
          const nameCell = row.cells[0];
          const studentName = nameCell.textContent.trim();
          
          console.log(`[VESPA Direct Injector] Report clicked for: ${studentName}`);
          
          // Show a simple profile
          displaySimpleProfile(studentName);
          
          // Also watch for the back button
          setTimeout(setupBackButtonHandler, 1000);
        });
      });
    }
  }
  
  function setupBackButtonHandler() {
    const backButton = document.querySelector('#studentReports button.p-button-text:not([data-enhanced="true"])');
    
    if (backButton) {
      backButton.setAttribute('data-enhanced', 'true');
      backButton.addEventListener('click', function() {
        console.log("[VESPA Direct Injector] Back button clicked");
        
        // Reset the profile view
        const profileContainer = document.querySelector('#view_3015 .kn-rich_text__content');
        if (profileContainer) {
          profileContainer.innerHTML = `
            <div style="padding: 15px; background-color: #e8f5e9; border-left: 4px solid #4CAF50; margin-bottom: 15px;">
              <h3 style="margin-top: 0; color: #2E7D32;">Profile Enhancer Active</h3>
              <p>When you click a student report button, their profile will appear here.</p>
            </div>
          `;
        }
      });
    }
  }
  
  function displaySimpleProfile(studentName) {
    const profileContainer = document.querySelector('#view_3015 .kn-rich_text__content');
    
    if (profileContainer) {
      profileContainer.innerHTML = `
        <div style="padding: 15px; background-color: #f9f9f9; border-left: 4px solid #2196F3; margin-bottom: 15px;">
          <h3 style="margin-top: 0; color: #0D47A1;">${studentName}</h3>
          <div style="display: flex; flex-wrap: wrap; gap: 10px;">
            <div style="flex: 1; min-width: 150px;">
              <strong>Status:</strong> Student
            </div>
            <div style="flex: 1; min-width: 150px;">
              <strong>Year Group:</strong> 12
            </div>
            <div style="flex: 1; min-width: 150px;">
              <strong>Tutor Group:</strong> 12LC
            </div>
          </div>
        </div>
      `;
    }
  }
})();
