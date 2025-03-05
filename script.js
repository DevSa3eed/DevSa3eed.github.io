// Iftar Scheduler - Main JavaScript

// Debug information
console.log('Script loaded:', new Date().toISOString());
console.log('Script version: 1.7.0');

// Show a notification message
function showNotification(message, type = 'info') {
  console.log(`Notification: ${message} (${type})`);
  
  // Create notification element if it doesn't exist
  let notificationContainer = document.getElementById('notification-container');
  
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'notification-container';
    notificationContainer.style.position = 'fixed';
    notificationContainer.style.top = '20px';
    notificationContainer.style.right = '20px';
    notificationContainer.style.zIndex = '9999';
    document.body.appendChild(notificationContainer);
  }
  
  // Create notification
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.style.backgroundColor = type === 'error' ? '#f44336' : '#4CAF50';
  notification.style.color = 'white';
  notification.style.padding = '15px';
  notification.style.marginBottom = '10px';
  notification.style.borderRadius = '5px';
  notification.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  notification.style.minWidth = '250px';
  notification.style.opacity = '0';
  notification.style.transition = 'opacity 0.3s ease-in-out';
  
  // Add message
  notification.innerHTML = `
    <span style="margin-right: 10px;">
      <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
    </span>
    <span>${message}</span>
    <span style="float: right; cursor: pointer;" onclick="this.parentElement.style.opacity = '0'; setTimeout(() => this.parentElement.remove(), 300);">
      &times;
    </span>
  `;
  
  // Add to container
  notificationContainer.appendChild(notification);
  
  // Show notification
  setTimeout(() => {
    notification.style.opacity = '1';
  }, 10);
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      try {
        notification.remove();
      } catch (e) {
        console.log('Notification already removed');
      }
    }, 300);
  }, 5000);
}

// Show the current session ID in the UI
function showSessionId() {
  console.log('Showing session ID in UI');
  
  // Get the current session ID
  const currentSessionId = localStorage.getItem('sessionId') || window.location.hash.substring(1);
  
  if (!currentSessionId) {
    console.log('No session ID found');
    return;
  }
  
  // Create session ID display if it doesn't exist
  let sessionIdDisplay = document.getElementById('session-id-display');
  
  if (!sessionIdDisplay) {
    sessionIdDisplay = document.createElement('div');
    sessionIdDisplay.id = 'session-id-display';
    sessionIdDisplay.style.position = 'fixed';
    sessionIdDisplay.style.bottom = '20px';
    sessionIdDisplay.style.left = '20px';
    sessionIdDisplay.style.backgroundColor = '#f8f9fa';
    sessionIdDisplay.style.padding = '10px';
    sessionIdDisplay.style.borderRadius = '5px';
    sessionIdDisplay.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
    sessionIdDisplay.style.fontSize = '12px';
    sessionIdDisplay.style.zIndex = '9999';
    document.body.appendChild(sessionIdDisplay);
  }
  
  // Update session ID display
  sessionIdDisplay.innerHTML = `
    <div>
      <strong>Session ID:</strong> ${currentSessionId}
      <button onclick="copyToClipboard('${currentSessionId}')" style="margin-left: 5px; border: none; background: none; cursor: pointer;">
        <i class="fas fa-copy"></i>
      </button>
    </div>
    <div>
      <button onclick="debugFirebasePaths('${currentSessionId}')" style="margin-top: 5px; border: none; background: none; cursor: pointer; color: #007bff;">
        Debug Firebase Paths
      </button>
    </div>
  `;
  
  // Add copy to clipboard function if it doesn't exist
  if (typeof window.copyToClipboard !== 'function') {
    window.copyToClipboard = function(text) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showNotification('Session ID copied to clipboard');
    };
  }
}

// Call this function after the app is initialized
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    showSessionId();
    showNotification('Application initialized successfully');
  }, 3000);
});

// Mark the app as ready
if (typeof window.appReady === 'function') {
  console.log('Calling appReady function to hide loading message');
  window.appReady();
  
  // Show session ID and notification
  showSessionId();
  showNotification('Application initialized successfully');
} else {
  console.log('appReady function not found');
}

// Wait for Firebase to initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM Content Loaded: " + new Date().toISOString());
  
  // Check if Firebase is already available
  if (window.firebaseDatabase) {
    database = window.firebaseDatabase;
    firebaseInitialized = true;
    console.log("Firebase Realtime Database already initialized");
    initializeApp();
  } else {
    console.log("Firebase Database not available yet. Waiting for initialization...");
    
    // Set a timeout to initialize the app even if Firebase fails
    setTimeout(() => {
      if (!window.appInitialized) {
        console.log("Firebase initialization timeout reached. Initializing app without Firebase.");
        // Try to initialize Firebase directly if the module approach failed
        tryFallbackFirebaseInit();
        initializeApp();
      }
    }, 5000); // 5 seconds timeout
  }
  
  // Initialize the calendar
  updateCalendar();
  
  // Add event listeners for month navigation
  const prevMonthButtons = document.querySelectorAll('#prev-month');
  const nextMonthButtons = document.querySelectorAll('#next-month');
  
  prevMonthButtons.forEach(button => {
    button.addEventListener('click', () => navigateMonth(-1));
  });
  
  nextMonthButtons.forEach(button => {
    button.addEventListener('click', () => navigateMonth(1));
  });
  
  console.log(`Initialized ${prevMonthButtons.length} prev month buttons and ${nextMonthButtons.length} next month buttons`);
});

// Update calendar UI
function updateCalendar() {
  console.log('Updating calendar for', currentDate.toLocaleDateString());
  
  // Update month display
  safeUpdateUI('current-month', (element) => {
    const monthName = currentDate.toLocaleString('default', { month: 'long' });
    const year = currentDate.getFullYear();
    element.textContent = `${monthName} ${year}`;
    console.log('Updated month display to', `${monthName} ${year}`);
  });
  
  // Clear existing calendar days - handle both calendar-days and calendar-days-mobile elements
  const calendarDaysElements = document.querySelectorAll('#calendar-days, #calendar-days-mobile');
  console.log('Found', calendarDaysElements.length, 'calendar-days elements');
  
  if (calendarDaysElements.length === 0) {
    console.warn('No calendar-days elements found');
    return;
  }
  
  // Generate calendar days
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  console.log('Generating calendar for', firstDay.toLocaleDateString(), 'to', lastDay.toLocaleDateString());
  console.log('Month has', lastDay.getDate(), 'days, starting on', ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][startingDayOfWeek]);
  
  // Create calendar days HTML
  let calendarHTML = '';
  
  // Add days of the current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const dateString = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
    
    let dayHTML = `
      <div class="calendar-day">
        <input type="checkbox" class="date-checkbox" value="${dateString}" id="date-${dateString}" 
          ${selectedDates && selectedDates.includes(dateString) ? 'checked' : ''}>
        <label for="date-${dateString}">${i}</label>
    `;
    
    // Add availability indicator if data exists
    if (window.availabilityData && window.availabilityData[dateString]) {
      const uniqueParticipants = new Set();
      Object.values(window.availabilityData[dateString]).forEach(participants => {
        participants.forEach(participant => {
          uniqueParticipants.add(participant);
        });
      });
      
      dayHTML += `
        <div class="availability-indicator">${uniqueParticipants.size}</div>
      `;
    }
    
    dayHTML += `</div>`;
    calendarHTML += dayHTML;
  }
  
  // Update all calendar-days elements
  calendarDaysElements.forEach((element, index) => {
    element.innerHTML = calendarHTML;
    console.log(`Updated calendar-days element ${index + 1} with ${lastDay.getDate()} days`);
    
    // Add event listeners to checkboxes
    const checkboxes = element.querySelectorAll('.date-checkbox');
    console.log(`Added ${checkboxes.length} date checkboxes to element ${index + 1}`);
    
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        if (!window.selectedDates) {
          window.selectedDates = [];
          console.log('Initialized window.selectedDates array');
        }
        
        const dateString = e.target.value;
        
        if (e.target.checked) {
          if (!selectedDates.includes(dateString)) {
            selectedDates.push(dateString);
            console.log('Added date to selection:', dateString);
          }
        } else {
          const index = selectedDates.indexOf(dateString);
          if (index !== -1) {
            selectedDates.splice(index, 1);
            console.log('Removed date from selection:', dateString);
          }
        }
        
        // Update all other checkboxes with the same value
        document.querySelectorAll(`.date-checkbox[value="${dateString}"]`).forEach(cb => {
          if (cb !== e.target) {
            cb.checked = e.target.checked;
          }
        });
      });
    });
  });
  
  console.log('Calendar update completed for', currentDate.toLocaleDateString());
} 