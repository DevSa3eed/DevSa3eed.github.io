// Calendar rendering functions

// Render the heatmap calendar
function renderHeatmapCalendar() {
  console.log("Rendering heatmap calendar");
  const calendarContainer = document.getElementById('availability-calendar');
  if (!calendarContainer) return;
  
  // Clear previous content
  calendarContainer.innerHTML = '';
  
  // Check if there's any availability data
  if (Object.keys(availabilityData).length === 0) {
    calendarContainer.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-users"></i>
        <p>No availability submitted yet. Be the first to add yours!</p>
      </div>
    `;
    return;
  }
  
  // Get all dates from availability data
  const dates = Object.keys(availabilityData).sort();
  if (dates.length === 0) return;
  
  // Calculate date range
  const firstDate = new Date(dates[0]);
  const lastDate = new Date(dates[dates.length - 1]);
  
  // Calculate the start of the week for the first date
  const startDate = new Date(firstDate);
  startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from Sunday
  
  // Calculate the end of the week for the last date
  const endDate = new Date(lastDate);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // End on Saturday
  
  // Create calendar header
  const calendarHeader = document.createElement('div');
  calendarHeader.className = 'heatmap-header';
  calendarHeader.innerHTML = `
    <div class="heatmap-cell header">Sun</div>
    <div class="heatmap-cell header">Mon</div>
    <div class="heatmap-cell header">Tue</div>
    <div class="heatmap-cell header">Wed</div>
    <div class="heatmap-cell header">Thu</div>
    <div class="heatmap-cell header">Fri</div>
    <div class="heatmap-cell header">Sat</div>
  `;
  calendarContainer.appendChild(calendarHeader);
  
  // Create calendar grid
  const calendarGrid = document.createElement('div');
  calendarGrid.className = 'heatmap-grid';
  
  // Generate calendar cells
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateString = formatDateForStorage(currentDate);
    const dayOfWeek = currentDate.getDay();
    
    // Create cell
    const cell = document.createElement('div');
    cell.className = 'heatmap-cell';
    cell.dataset.date = dateString;
    
    // Add date number
    const dateNumber = document.createElement('div');
    dateNumber.className = 'date-number';
    dateNumber.textContent = currentDate.getDate();
    cell.appendChild(dateNumber);
    
    // Check if this date has availability data
    if (availabilityData[dateString]) {
      // Calculate total participants for this date
      let totalParticipants = 0;
      let uniqueParticipants = new Set();
      
      Object.keys(availabilityData[dateString]).forEach(timeSlot => {
        availabilityData[dateString][timeSlot].forEach(participant => {
          uniqueParticipants.add(participant.name);
          totalParticipants++;
        });
      });
      
      // Add heat level based on number of participants
      const heatLevel = Math.min(5, uniqueParticipants.size);
      cell.classList.add(`heat-level-${heatLevel}`);
      
      // Add participant count
      const participantCount = document.createElement('div');
      participantCount.className = 'participant-count';
      participantCount.textContent = uniqueParticipants.size;
      cell.appendChild(participantCount);
      
      // Add click event to show details
      cell.addEventListener('click', () => showDateDetails(dateString));
    }
    
    // Add to grid
    calendarGrid.appendChild(cell);
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  calendarContainer.appendChild(calendarGrid);
}

// Render the best times list
function renderBestTimes() {
  console.log("Rendering best times");
  const bestTimesList = document.getElementById('best-times-list');
  if (!bestTimesList) return;
  
  // Clear previous content
  bestTimesList.innerHTML = '';
  
  // Check if there's any availability data
  if (Object.keys(availabilityData).length === 0) {
    bestTimesList.innerHTML = '<li class="empty-message">No availability data yet</li>';
    return;
  }
  
  // Calculate scores for each date and time slot
  const scores = [];
  
  Object.keys(availabilityData).forEach(date => {
    Object.keys(availabilityData[date]).forEach(timeSlot => {
      // Count unique participants
      const uniqueParticipants = new Set();
      availabilityData[date][timeSlot].forEach(participant => {
        uniqueParticipants.add(participant.name);
      });
      
      scores.push({
        date,
        timeSlot,
        score: uniqueParticipants.size,
        participants: Array.from(uniqueParticipants)
      });
    });
  });
  
  // Sort by score (highest first)
  scores.sort((a, b) => b.score - a.score);
  
  // Take top 5
  const topScores = scores.slice(0, 5);
  
  // Render the list
  if (topScores.length === 0) {
    bestTimesList.innerHTML = '<li class="empty-message">No availability data yet</li>';
    return;
  }
  
  topScores.forEach(item => {
    const listItem = document.createElement('li');
    listItem.className = 'best-time-item';
    
    // Create content
    listItem.innerHTML = `
      <div class="best-time-date">${formatDate(item.date)}</div>
      <div class="best-time-slot">${item.timeSlot}</div>
      <div class="best-time-score">${item.score} people</div>
    `;
    
    // Add click event to select this date/time
    listItem.addEventListener('click', () => selectThisDate(item.date, item.timeSlot));
    
    bestTimesList.appendChild(listItem);
  });
}

// Show details for a specific date
function showDateDetails(date) {
  console.log("Showing details for date:", date);
  
  // Check if this date has availability data
  if (!availabilityData[date]) {
    showNotification("No availability data for this date");
    return;
  }
  
  // Format date for display
  const formattedDate = formatDate(date);
  
  // Build message
  let message = `<h3>${formattedDate}</h3>`;
  
  // Get all time slots for this date
  const timeSlots = Object.keys(availabilityData[date]);
  
  // Track all unique participants
  const allParticipants = new Set();
  
  // Add details for each time slot
  timeSlots.forEach(timeSlot => {
    const participants = availabilityData[date][timeSlot];
    const participantNames = participants.map(p => p.name);
    
    // Add participants to the set
    participantNames.forEach(name => allParticipants.add(name));
    
    message += `<p><strong>${timeSlot}</strong>: ${participantNames.join(', ')}</p>`;
  });
  
  // Add total participants
  message += `<p class="total-participants">Total: ${allParticipants.size} participants</p>`;
  
  // Add button to select this date
  message += `<button class="btn-primary select-date-btn" onclick="selectThisDate('${date}', '${timeSlots[0]}')">Select This Date</button>`;
  
  // Show notification with details
  const notification = document.createElement('div');
  notification.className = 'date-details-popup';
  notification.innerHTML = message;
  
  // Add close button
  const closeButton = document.createElement('button');
  closeButton.className = 'close-popup-btn';
  closeButton.innerHTML = '&times;';
  closeButton.addEventListener('click', () => {
    document.body.removeChild(notification);
  });
  notification.appendChild(closeButton);
  
  // Add to body
  document.body.appendChild(notification);
}

// Select a specific date and time slot
function selectThisDate(date, timeSlot) {
  console.log("Selecting date:", date, "time slot:", timeSlot);
  
  // Update selected date and time slot
  selectedDate = date;
  selectedTimeSlot = timeSlot;
  
  // Update UI
  document.getElementById('selected-date-display').textContent = 
    `Selected: ${formatDate(date)} at ${timeSlot}`;
  
  // Save to localStorage
  saveToLocalStorage();
  
  // Sync with Firebase if online
  if (navigator.onLine && database) {
    saveToFirebase()
      .then(() => {
        console.log("Selected date saved to Firebase");
      })
      .catch(error => {
        console.error("Error saving selected date to Firebase:", error);
      });
  }
  
  // Show confirmation
  showNotification(`Selected ${formatDate(date)} at ${timeSlot}`);
  
  // Close popup if it exists
  const popup = document.querySelector('.date-details-popup');
  if (popup) {
    document.body.removeChild(popup);
  }
}

// Format a date string for display
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
}

// Format a date object for storage
function formatDateForStorage(date) {
  return date.toISOString().split('T')[0];
} 