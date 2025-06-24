// Student Emulator Module - Working Version
// This module allows staff to view the student portal experience in a read-only mode
// Version: Fixed and Complete

(function() {
    'use strict';
    
    // Configuration
    const CONFIG = {
      backendUrl: window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : 'https://vespa-student-emulator-d7e95341ee8b.herokuapp.com',
      students: {
        ks4: {
          name: 'Key Stage 4 Student',
          email: 'gbolton@vespa.academy',
          password: 'Password123',
          description: 'Year 10-11 exemplar student'
        },
        ks5: {
          name: 'Key Stage 5 Student', 
          email: 'aramsey@vespa.academy',
          password: 'Password123',
          description: 'Year 12-13 exemplar student'
        }
      },
      updateInterval: 2000, // 2 seconds
      maxRetries: 3
    };
    
    // Current session state
    let currentSession = {
      active: false,
      sessionId: null,
      updateInterval: null,
      retryCount: 0
    };
    
    // Main Student Emulator object
    window.StudentEmulator = {
      
      // Initialize the module
      init: function() {
        console.log('[Student Emulator] Initializing...');
        this.addStyles();
        this.addToProfileMenu();
      },
      
      // Add to profile menu
      addToProfileMenu: function() {
        // Wait for profile menu to exist
        const checkForMenu = setInterval(() => {
          const profileMenu = document.querySelector('#profile-menu, .kn-profile-menu, [data-kn-slug="profile"]');
          if (profileMenu) {
            clearInterval(checkForMenu);
            
            // Add emulator button
            const emulatorButton = document.createElement('li');
            emulatorButton.innerHTML = `
              <a href="#" onclick="StudentEmulator.show(); return false;" style="color: #0a2b8c;">
                <i class="fas fa-eye" style="margin-right: 8px;"></i>
                Student View Emulator
              </a>
            `;
            profileMenu.appendChild(emulatorButton);
            
            console.log('[Student Emulator] Added to profile menu');
          }
        }, 1000);
        
        // Stop checking after 10 seconds
        setTimeout(() => clearInterval(checkForMenu), 10000);
      },
      
      // Show student selection modal
      show: function() {
        this.createSelectionModal();
      },
      
      // Create selection modal
      createSelectionModal: function() {
        const modalHTML = `
          <div id="student-emulator-modal" class="se-modal">
            <div class="se-modal-content se-selection">
              <div class="se-modal-header">
                <h2><i class="fas fa-eye"></i> Student View Emulator</h2>
                <span class="se-close" onclick="StudentEmulator.closeSelection()">&times;</span>
              </div>
              <div class="se-modal-body">
                <div class="se-warning">
                  <i class="fas fa-exclamation-triangle"></i>
                  <strong>READ-ONLY MODE:</strong> You can view the student experience but cannot make changes or submit forms.
                </div>
                <div class="se-description">
                  <p>Select which student perspective you'd like to view:</p>
                </div>
                <div class="se-student-options">
                  <div class="se-student-btn" onclick="StudentEmulator.startEmulation('ks4')">
                    <i class="fas fa-user-graduate"></i>
                    <h3>${CONFIG.students.ks4.name}</h3>
                    <p>${CONFIG.students.ks4.description}</p>
                    <small>${CONFIG.students.ks4.email}</small>
                  </div>
                  <div class="se-student-btn" onclick="StudentEmulator.startEmulation('ks5')">
                    <i class="fas fa-user-graduate"></i>
                    <h3>${CONFIG.students.ks5.name}</h3>
                    <p>${CONFIG.students.ks5.description}</p>
                    <small>${CONFIG.students.ks5.email}</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
        
        // Remove any existing modal
        const existing = document.getElementById('student-emulator-modal');
        if (existing) existing.remove();
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
      },
      
      // Close selection modal
      closeSelection: function() {
        const modal = document.getElementById('student-emulator-modal');
        if (modal) modal.remove();
      },
      
      // Start emulation session
      startEmulation: async function(studentKey) {
        try {
          console.log(`[Student Emulator] Starting ${studentKey} session...`);
          
          // Close selection modal
          this.closeSelection();
          
          // Show loading modal
          this.showLoadingModal(CONFIG.students[studentKey]);
          
          const response = await fetch(`${CONFIG.backendUrl}/api/student-emulator/start`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ studentKey })
          });
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
            throw new Error(errorData.error || `Server error: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (data.error) {
            throw new Error(data.error);
          }
          
          // Store session info
          currentSession = {
            active: true,
            sessionId: data.sessionId,
            studentKey: studentKey,
            student: CONFIG.students[studentKey],
            updateInterval: null,
            retryCount: 0
          };
          
          // Show the emulator view immediately with the landing page
          this.showEmulatorView(data.screenshot, data.url);
          
          // Start the update loop
          this.startUpdateLoop();
          
          console.log(`[Student Emulator] Session ${data.sessionId} started successfully`);
          
        } catch (error) {
          console.error('[Student Emulator] Error starting session:', error);
          this.showErrorModal(`Failed to start emulation session: ${error.message}`);
        }
      },
      
      // Show loading modal
      showLoadingModal: function(student) {
        const modalHTML = `
          <div id="student-emulator-view" class="se-modal">
            <div class="se-modal-content se-emulation">
              <div class="se-emulation-header">
                <div class="se-header-info">
                  <span class="se-view-label">VIEW ONLY MODE</span>
                  <span class="se-student-info">Loading ${student.name}...</span>
                </div>
                <button class="se-end-btn" onclick="StudentEmulator.endSession()">
                  <i class="fas fa-times"></i> Cancel
                </button>
              </div>
              <div class="se-view-container">
                <div class="se-loading">
                  <i class="fas fa-spinner fa-spin"></i>
                  <p>Starting emulation session...</p>
                  <p class="se-loading-status">Connecting to backend...</p>
                </div>
              </div>
            </div>
          </div>
        `;
        
        // Remove any existing modal
        const existing = document.getElementById('student-emulator-view');
        if (existing) existing.remove();
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
      },
      
      // Show the main emulator view
      showEmulatorView: function(screenshot, url) {
        const modal = document.getElementById('student-emulator-view');
        if (!modal) return;
        
        modal.innerHTML = `
          <div class="se-modal-content se-emulation">
            <div class="se-emulation-header">
              <div class="se-header-info">
                <span class="se-view-label">VIEW ONLY MODE</span>
                <span class="se-student-info">Viewing as: ${currentSession.student.name}</span>
              </div>
              <div class="se-header-actions">
                <button class="se-scroll-btn" onclick="StudentEmulator.scroll('up')" title="Scroll up">
                  <i class="fas fa-chevron-up"></i>
                </button>
                <button class="se-scroll-btn" onclick="StudentEmulator.scroll('down')" title="Scroll down">
                  <i class="fas fa-chevron-down"></i>
                </button>
                <button class="se-refresh-btn" onclick="StudentEmulator.refreshView()" title="Refresh view">
                  <i class="fas fa-sync-alt"></i>
                </button>
                <button class="se-end-btn" onclick="StudentEmulator.endSession()">
                  <i class="fas fa-times"></i> End Session
                </button>
              </div>
            </div>
            <div class="se-view-container">
              <div class="se-screenshot-container">
                <img id="student-view-screenshot" class="se-screenshot" src="${screenshot}" alt="Student Portal View">
                <div class="se-url-bar">
                  <i class="fas fa-globe"></i>
                  <span id="current-url">${url}</span>
                </div>
              </div>
            </div>
            <div class="se-watermark">VIEW ONLY - NO CHANGES WILL BE SAVED</div>
          </div>
        `;
        
        // Set up click handler
        this.setupClickHandler();
      },
      
      // Set up click handling
      setupClickHandler: function() {
        const screenshot = document.getElementById('student-view-screenshot');
        if (!screenshot) return;
        
        screenshot.style.cursor = 'pointer';
        
        screenshot.onclick = async (e) => {
          if (!currentSession.sessionId) return;
          
          // Get click coordinates
          const rect = screenshot.getBoundingClientRect();
          const x = Math.round((e.clientX - rect.left) * (screenshot.naturalWidth / rect.width));
          const y = Math.round((e.clientY - rect.top) * (screenshot.naturalHeight / rect.height));
          
          try {
            const response = await fetch(`${CONFIG.backendUrl}/api/student-emulator/click/${currentSession.sessionId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ x, y })
            });
            
            if (!response.ok) {
              if (response.status === 410) {
                this.endSession('Session expired during click.');
                return;
              }
              throw new Error('Click failed');
            }
            
            const data = await response.json();
            
            // Update view immediately
            const screenshotEl = document.getElementById('student-view-screenshot');
            const urlEl = document.getElementById('current-url');
            
            if (screenshotEl && data.screenshot) {
              screenshotEl.src = data.screenshot;
            }
            if (urlEl && data.url) {
              urlEl.textContent = data.url;
            }
            
          } catch (error) {
            console.error('[Student Emulator] Click error:', error);
          }
        };
      },
      
      // Update the view
      updateView: async function() {
        if (!currentSession.sessionId) return;
        
        try {
          const response = await fetch(`${CONFIG.backendUrl}/api/student-emulator/view/${currentSession.sessionId}`);
          
          if (!response.ok) {
            if (response.status === 410) {
              // Session expired
              this.endSession('Session expired. Please start a new session.');
              return;
            }
            throw new Error('Failed to get view');
          }
          
          const data = await response.json();
          
          // Update screenshot
          const screenshot = document.getElementById('student-view-screenshot');
          const urlDisplay = document.getElementById('current-url');
          
          if (screenshot && data.screenshot) {
            screenshot.src = data.screenshot;
          }
          
          if (urlDisplay && data.url) {
            urlDisplay.textContent = data.url;
          }
          
          // Reset retry count on success
          currentSession.retryCount = 0;
          
        } catch (error) {
          console.error('[Student Emulator] Update error:', error);
          currentSession.retryCount++;
          
          if (currentSession.retryCount >= CONFIG.maxRetries) {
            this.endSession('Connection lost. Please start a new session.');
          }
        }
      },
      
      // Start update loop
      startUpdateLoop: function() {
        if (currentSession.updateInterval) {
          clearInterval(currentSession.updateInterval);
        }
        
        currentSession.updateInterval = setInterval(() => {
          this.updateView();
        }, CONFIG.updateInterval);
      },
      
      // Refresh view
      refreshView: async function() {
        await this.updateView();
      },
      
      // Scroll
      scroll: async function(direction) {
        if (!currentSession.sessionId) return;
        
        try {
          const response = await fetch(`${CONFIG.backendUrl}/api/student-emulator/scroll/${currentSession.sessionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ direction, amount: 300 })
          });
          
          if (response.ok) {
            const data = await response.json();
            
            // Update view
            const screenshot = document.getElementById('student-view-screenshot');
            if (screenshot && data.screenshot) {
              screenshot.src = data.screenshot;
            }
          }
        } catch (error) {
          console.error('[Student Emulator] Scroll error:', error);
        }
      },
      
      // Show error modal
      showErrorModal: function(message) {
        const modalHTML = `
          <div id="student-emulator-error" class="se-modal">
            <div class="se-modal-content se-selection">
              <div class="se-modal-header">
                <h2><i class="fas fa-exclamation-circle" style="color: #ff6b6b;"></i> Error</h2>
                <span class="se-close" onclick="StudentEmulator.closeError()">&times;</span>
              </div>
              <div class="se-modal-body">
                <div class="se-error-message">
                  <p style="color: #ff6b6b; font-weight: bold;">${message}</p>
                  <p>Please try again or contact support if the problem persists.</p>
                </div>
                <div style="text-align: center; margin-top: 20px;">
                  <button onclick="StudentEmulator.closeError()" style="background: #0a2b8c; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
        
        // Remove any existing modals
        const existing = document.getElementById('student-emulator-error');
        if (existing) existing.remove();
        
        // Add error modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
      },
      
      // Close error modal
      closeError: function() {
        const modal = document.getElementById('student-emulator-error');
        if (modal) modal.remove();
      },
      
      // End session
      endSession: async function(message) {
        // Stop update loop
        if (currentSession.updateInterval) {
          clearInterval(currentSession.updateInterval);
          currentSession.updateInterval = null;
        }
        
        // End backend session
        if (currentSession.sessionId) {
          try {
            await fetch(`${CONFIG.backendUrl}/api/student-emulator/session/${currentSession.sessionId}`, {
              method: 'DELETE'
            });
          } catch (error) {
            console.error('[Student Emulator] Error ending session:', error);
          }
        }
        
        // Remove modal
        const modal = document.getElementById('student-emulator-view');
        if (modal) modal.remove();
        
        // Reset session
        currentSession = {
          active: false,
          sessionId: null,
          updateInterval: null,
          retryCount: 0
        };
        
        // Show message if provided
        if (message) {
          setTimeout(() => {
            if (confirm(message + '\n\nWould you like to start a new session?')) {
              this.show();
            }
          }, 100);
        }
      },
      
      // Add CSS styles
      addStyles: function() {
        if (document.getElementById('student-emulator-styles')) return;
        
        const styles = `
          /* Student Emulator Styles */
          .se-modal {
            display: block;
            position: fixed;
            z-index: 100000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            animation: seFadeIn 0.3s;
          }
          
          @keyframes seFadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          .se-modal-content {
            background-color: #fefefe;
            margin: 2% auto;
            border: 1px solid #888;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            animation: seSlideIn 0.3s;
          }
          
          @keyframes seSlideIn {
            from { transform: translateY(-50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          
          /* Selection Modal */
          .se-selection {
            width: 600px;
            max-width: 90%;
          }
          
          .se-modal-header {
            background: linear-gradient(135deg, #0a2b8c 0%, #061a54 100%);
            color: white;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          
          .se-modal-header h2 {
            margin: 0;
            font-size: 24px;
          }
          
          .se-close {
            color: white;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
            transition: transform 0.2s;
          }
          
          .se-close:hover {
            transform: scale(1.2);
          }
          
          .se-modal-body {
            padding: 20px;
          }
          
          .se-warning {
            background-color: #fff3cd;
            border: 1px solid #ffeeba;
            color: #856404;
            padding: 12px;
            border-radius: 4px;
            margin-bottom: 20px;
          }
          
          .se-warning i {
            margin-right: 8px;
          }
          
          .se-description {
            margin-bottom: 20px;
            color: #333;
          }
          
          .se-student-options {
            display: flex;
            gap: 20px;
            justify-content: center;
          }
          
          .se-student-btn {
            flex: 1;
            padding: 20px;
            border: 2px solid #ddd;
            background: white;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s;
            text-align: center;
          }
          
          .se-student-btn:hover {
            border-color: #00e5db;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }
          
          .se-student-btn i {
            font-size: 48px;
            color: #0a2b8c;
            margin-bottom: 10px;
          }
          
          .se-student-btn h3 {
            margin: 10px 0;
            color: #333;
          }
          
          .se-student-btn p {
            margin: 0;
            color: #666;
          }
          
          .se-student-btn small {
            color: #999;
            font-size: 12px;
          }
          
          /* Emulation Modal */
          .se-emulation {
            width: 95%;
            max-width: 1200px;
            height: 90%;
            display: flex;
            flex-direction: column;
          }
          
          .se-emulation-header {
            background: linear-gradient(135deg, #0a2b8c 0%, #061a54 100%);
            color: white;
            padding: 15px 20px;
            border-radius: 8px 8px 0 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-shrink: 0;
          }
          
          .se-view-label {
            background: #ff6b6b;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            margin-right: 10px;
          }
          
          .se-student-info {
            font-size: 16px;
            font-weight: bold;
          }
          
          .se-header-actions {
            display: flex;
            gap: 10px;
            align-items: center;
          }
          
          .se-scroll-btn, .se-refresh-btn, .se-end-btn {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            transition: background 0.2s;
          }
          
          .se-scroll-btn:hover, .se-refresh-btn:hover {
            background: rgba(255, 255, 255, 0.3);
          }
          
          .se-end-btn {
            background: #ff6b6b;
          }
          
          .se-end-btn:hover {
            background: #ff5252;
          }
          
          .se-view-container {
            flex: 1;
            padding: 20px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }
          
          .se-screenshot-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            border: 1px solid #ddd;
            border-radius: 4px;
            overflow: hidden;
          }
          
          .se-screenshot {
            flex: 1;
            width: 100%;
            object-fit: contain;
            background: #f8f9fa;
          }
          
          .se-url-bar {
            background: #f8f9fa;
            padding: 8px 12px;
            border-top: 1px solid #ddd;
            font-size: 12px;
            color: #666;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          
          .se-watermark {
            position: absolute;
            bottom: 20px;
            right: 20px;
            background: rgba(255, 107, 107, 0.9);
            color: white;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
          }
          
          .se-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 200px;
            color: #666;
          }
          
          .se-loading i {
            font-size: 48px;
            margin-bottom: 20px;
            color: #0a2b8c;
          }
          
          .se-loading p {
            margin: 5px 0;
          }
          
          .se-loading-status {
            font-size: 14px;
            color: #999;
          }
          
          .se-error-message {
            text-align: center;
            padding: 20px;
          }
          
          /* Responsive */
          @media (max-width: 768px) {
            .se-student-options {
              flex-direction: column;
            }
            
            .se-emulation {
              width: 98%;
              height: 95%;
            }
            
            .se-header-actions {
              flex-wrap: wrap;
              gap: 5px;
            }
          }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.id = 'student-emulator-styles';
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
      }
    };
    
    // Auto-initialize when script loads
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        if (window.StudentEmulator && window.StudentEmulator.init) {
          window.StudentEmulator.init();
        }
      });
    } else {
      // DOM already loaded
      if (window.StudentEmulator && window.StudentEmulator.init) {
        window.StudentEmulator.init();
      }
    }
    
})();
