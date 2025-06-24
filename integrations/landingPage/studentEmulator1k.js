// Student Emulator Module - Optimized Version
// This module allows staff to view the student portal experience in a read-only mode
// Version 2.0

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
      updateInterval: 2000, // Update less frequently for better performance
      maxRetries: 3,
      retryDelay: 1000
    };
    
    // Track current session
    let currentSession = {
      active: false,
      sessionId: null,
      updateInterval: null,
      retryCount: 0
    };
    
    // Create the Student Emulator object
    window.StudentEmulator = {
      // Initialize the emulator
      init: function() {
        console.log('[Student Emulator] Initialized');
        // Add styles on init
        if (!document.getElementById('student-emulator-styles')) {
          this.addStyles();
        }
      },
      
      // Show the emulator modal
      show: function() {
        if (currentSession.active) {
          alert('A student emulation session is already active. Please close it before starting a new one.');
          return;
        }
        
        // Create and show the selection modal
        this.createSelectionModal();
      },
      
      // Create the selection modal
      createSelectionModal: function() {
        // Remove any existing modal
        const existingModal = document.getElementById('student-emulator-modal');
        if (existingModal) existingModal.remove();
        
        // Create modal HTML
        const modalHTML = `
          <div id="student-emulator-modal" class="se-modal">
            <div class="se-modal-content se-selection">
              <div class="se-modal-header">
                <h2>Student View Emulator</h2>
                <span class="se-close" onclick="StudentEmulator.closeSelection()">&times;</span>
              </div>
              <div class="se-modal-body">
                <p class="se-warning">
                  <i class="fas fa-exclamation-triangle"></i>
                  <strong>Important:</strong> This is a VIEW-ONLY mode. You cannot modify any student data.
                </p>
                <p class="se-description">Select a student profile to view their portal experience:</p>
                <div class="se-student-options">
                  <button class="se-student-btn" onclick="StudentEmulator.startEmulation('ks4')">
                    <i class="fas fa-user-graduate"></i>
                    <h3>${CONFIG.students.ks4.name}</h3>
                    <p>${CONFIG.students.ks4.description}</p>
                  </button>
                  <button class="se-student-btn" onclick="StudentEmulator.startEmulation('ks5')">
                    <i class="fas fa-user-graduate"></i>
                    <h3>${CONFIG.students.ks5.name}</h3>
                    <p>${CONFIG.students.ks5.description}</p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
        
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
          showLoading(`Starting ${CONFIG.students[studentKey].name} session...`);
          
          const response = await fetch(`${CONFIG.backendUrl}/api/student-emulator/start`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ studentKey })
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          
          if (data.error) {
            throw new Error(data.error);
          }
          
          // Store session info
          currentSession = {
            sessionId: data.sessionId,
            studentKey: studentKey,
            student: CONFIG.students[studentKey]
          };
          
          // Show the emulator view immediately with the landing page
          showEmulatorView(data.screenshot, data.url);
          showStatus(`✅ ${data.message || 'Session ready'}`);
          
          // Start the update loop
          startUpdateLoop();
          
        } catch (error) {
          console.error('[Student Emulator] Error starting session:', error);
          showError(`Failed to start emulation session: ${error.message}`);
          hideLoading();
        }
      },
      
      // Create loading modal
      createLoadingModal: function(student) {
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
      
      // Perform login
      performLogin: async function() {
        if (!currentSession.sessionId) return;
        
        try {
          const statusEl = document.querySelector('.se-loading-status');
          if (statusEl) statusEl.textContent = 'Logging in as student...';
          
          const response = await fetch(`${CONFIG.backendUrl}/api/student-emulator/login/${currentSession.sessionId}`, {
            method: 'POST'
          });
          
          if (!response.ok) {
            const error = await response.json();
            
            // Show debug screenshot if available
            if (error.debugScreenshot) {
              this.showDebugScreenshot(error);
              return;
            }
            
            throw new Error(error.error || 'Login failed');
          }
          
          await this.showEmulationView();
          
        } catch (error) {
          console.error('[Student Emulator] Login error:', error);
          this.showError('Login failed: ' + error.message);
        }
      },
      
      // Show the main emulation view
      showEmulationView: async function() {
        if (!currentSession.sessionId) return;
        
        // Update the modal to show the view
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
                <img id="student-view-screenshot" class="se-screenshot" alt="Student Portal View">
                <div class="se-url-bar">
                  <i class="fas fa-globe"></i>
                  <span id="current-url">Loading...</span>
                </div>
              </div>
            </div>
            <div class="se-watermark">VIEW ONLY - NO CHANGES WILL BE SAVED</div>
          </div>
        `;
        
        // Get initial view
        await this.updateView();
        
        // Set up click handler
        this.setupClickHandler();
        
        // Start update loop
        this.startUpdateLoop();
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
      
      // Show error
      showError: function(message) {
        const loadingEl = document.querySelector('.se-loading');
        if (loadingEl) {
          loadingEl.innerHTML = `
            <i class="fas fa-exclamation-circle" style="color: #ff6b6b;"></i>
            <p style="color: #ff6b6b;">${message}</p>
            <button onclick="StudentEmulator.endSession()" style="margin-top: 10px;">Close</button>
          `;
        } else {
          alert(message);
          this.endSession();
        }
      },
      
      // Show debug screenshot
      showDebugScreenshot: function(errorData) {
        const loadingEl = document.querySelector('.se-loading');
        if (loadingEl) {
          loadingEl.innerHTML = `
            <p style="color: #ff6b6b;">Login failed: ${errorData.error || 'Unknown error'}</p>
            <img src="${errorData.debugScreenshot}" style="max-width: 100%; max-height: 400px; border: 1px solid #ccc;">
            <p style="font-size: 12px; color: #666;">Current URL: ${errorData.currentUrl || 'Unknown'}</p>
            <button onclick="StudentEmulator.endSession()" style="margin-top: 10px;">Close</button>
          `;
        }
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
        const styles = `
          /* Student Emulator Styles - Optimized */
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
            font-size: 14px;
          }
          
          /* Emulation Modal */
          .se-emulation {
            width: 95%;
            height: 90vh;
            display: flex;
            flex-direction: column;
          }
          
          .se-emulation-header {
            background: #333;
            color: white;
            padding: 10px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-radius: 8px 8px 0 0;
          }
          
          .se-header-info {
            display: flex;
            align-items: center;
            gap: 20px;
          }
          
          .se-view-label {
            background: #ff4444;
            padding: 4px 12px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 14px;
          }
          
          .se-student-info {
            font-size: 14px;
          }
          
          .se-header-actions {
            display: flex;
            gap: 10px;
          }
          
          .se-refresh-btn, .se-end-btn, .se-scroll-btn {
            background: #555;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background 0.2s;
          }
          
          .se-scroll-btn {
            padding: 8px 12px;
            background: #4a90e2;
          }
          
          .se-scroll-btn:hover {
            background: #5ba0f2;
          }
          
          .se-refresh-btn:hover {
            background: #666;
          }
          
          .se-end-btn {
            background: #ff4444;
          }
          
          .se-end-btn:hover {
            background: #ff5555;
          }
          
          .se-view-container {
            flex: 1;
            position: relative;
            background: white;
            overflow: auto;
            display: flex;
            flex-direction: column;
          }
          
          .se-loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            color: #666;
          }
          
          .se-loading i {
            font-size: 48px;
            margin-bottom: 10px;
          }
          
          .se-loading-status {
            font-size: 14px;
            color: #999;
            margin-top: 5px;
          }
          
          .se-screenshot-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            position: relative;
          }
          
          .se-screenshot {
            width: 100%;
            height: auto;
            border: none;
            display: block;
          }
          
          .se-url-bar {
            background: #f5f5f5;
            padding: 8px 12px;
            border-top: 1px solid #ddd;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 14px;
            color: #666;
          }
          
          .se-url-bar i {
            color: #999;
          }
          
          .se-watermark {
            position: absolute;
            bottom: 20px;
            right: 20px;
            background: rgba(255, 0, 0, 0.8);
            color: white;
            padding: 8px 16px;
            font-weight: bold;
            border-radius: 4px;
            pointer-events: none;
            z-index: 1000;
          }
          
          /* Responsive */
          @media (max-width: 768px) {
            .se-student-options {
              flex-direction: column;
            }
            
            .se-emulation {
              width: 100%;
              height: 100vh;
              margin: 0;
            }
          }
        `;
        
        const styleElement = document.createElement('style');
        styleElement.id = 'student-emulator-styles';
        styleElement.textContent = styles;
        document.head.appendChild(styleElement);
      }
    };
    
    // Auto-initialize when the script loads
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        window.StudentEmulator.init();
      });
    } else {
      window.StudentEmulator.init();
    }
    
    console.log('[Student Emulator] Module loaded and ready (v2.0)');
})();
