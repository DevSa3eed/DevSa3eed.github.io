// Iftar Scheduler - Main JavaScript

// DOM Elements - General
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const shareButton = document.getElementById('share-button');
const printButton = document.getElementById('print-button');
const clearAllButton = document.getElementById('clear-all');
const shareModal = document.getElementById('share-modal');
const closeModalButton = document.querySelector('.close');
const shareLinkInput = document.getElementById('share-link');
const copyLinkButton = document.getElementById('copy-link');

// DOM Elements - Schedule Tab
const participantNameInput = document.getElementById('participant-name');
const prevMonthButton = document.getElementById('prev-month');
const nextMonthButton = document.getElementById('next-month');
const currentMonthDisplay = document.getElementById('current-month');
const calendarDaysContainer = document.getElementById('calendar-days');
const timeSlotCheckboxes = document.querySelectorAll('input[name="time-slot"]');
const scheduleNotesInput = document.getElementById('schedule-notes');
const submitAvailabilityButton = document.getElementById('submit-availability');
const availabilityCalendar = document.getElementById('availability-calendar');
const participantsList = document.getElementById('participants');
const bestTimesList = document.getElementById('best-times-list');
const totalParticipantsElement = document.getElementById('total-participants');
const selectDateButton = document.getElementById('select-date');
const finalDateDisplay = document.getElementById('final-date');

// DOM Elements - Dishes Tab
const dishForm = document.getElementById('dish-form');
const dishNameInput = document.getElementById('dish-name');
const contributorInput = document.getElementById('contributor');
const categorySelect = document.getElementById('category');
const filterSelect = document.getElementById('filter');
const dishesList = document.getElementById('dishes-list');
const totalDishesElement = document.getElementById('total-dishes');

// State
let dishes = JSON.parse(localStorage.getItem('dishes')) || [];
let participants = JSON.parse(localStorage.getItem('participants')) || [];
let availabilityData = JSON.parse(localStorage.getItem('availabilityData')) || {};
let currentDate = new Date();
let selectedDates = [];
let selectedTimeSlots = [];
let selectedFinalDate = localStorage.getItem('selectedFinalDate') || null;

// Initialize
function initializeApp() {
    // Set up tabs
    setupTabs();
    
    // Schedule tab initialization
    initializeCalendar();
    renderAvailabilityResults();
    updateSummary();
    
    // Dishes tab initialization
    renderDishes();
    
    // Event Listeners - General
    shareButton.addEventListener('click', handleShare);
    printButton.addEventListener('click', handlePrint);
    clearAllButton.addEventListener('click', handleClearAll);
    closeModalButton.addEventListener('click', () => shareModal.style.display = 'none');
    copyLinkButton.addEventListener('click', handleCopyLink);
    
    // Event Listeners - Schedule Tab
    prevMonthButton.addEventListener('click', () => navigateMonth(-1));
    nextMonthButton.addEventListener('click', () => navigateMonth(1));
    submitAvailabilityButton.addEventListener('click', handleSubmitAvailability);
    selectDateButton.addEventListener('click', handleSelectFinalDate);
    
    // Event Listeners - Dishes Tab
    dishForm.addEventListener('submit', handleAddDish);
    filterSelect.addEventListener('change', renderDishes);
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === shareModal) {
            shareModal.style.display = 'none';
        }
    });
    
    // Update final date display
    if (selectedFinalDate) {
        finalDateDisplay.textContent = selectedFinalDate;
        selectDateButton.textContent = 'Change Date';
    }
}

// Tab Navigation
function setupTabs() {
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            
            // Toggle active class on tab buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Show selected tab content
            tabContents.forEach(content => {
                if (content.id === tabId) {
                    content.classList.remove('hidden');
                } else {
                    content.classList.add('hidden');
                }
            });
        });
    });
}

// Calendar Functions
function initializeCalendar() {
    updateCalendarHeader();
    renderCalendar();
}

function updateCalendarHeader() {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
    currentMonthDisplay.textContent = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
}

function navigateMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    updateCalendarHeader();
    renderCalendar();
}

function renderCalendar() {
    calendarDaysContainer.innerHTML = '';
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    const startingDayOfWeek = firstDay.getDay(); // 0 (Sunday) to 6 (Saturday)
    
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();
    
    // Create empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day disabled';
        calendarDaysContainer.appendChild(emptyCell);
    }
    
    // Get today's date for highlighting
    const today = new Date();
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;
    
    // Create cells for each day of the month
    for (let day = 1; day <= totalDays; day++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'calendar-day';
        dayCell.textContent = day;
        
        // Add date data attribute
        const dateString = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        dayCell.dataset.date = dateString;
        
        // Highlight today
        if (isCurrentMonth && day === today.getDate()) {
            dayCell.classList.add('today');
        }
        
        // Highlight selected dates
        if (selectedDates.includes(dateString)) {
            dayCell.classList.add('selected');
        }
        
        // Add availability indicator if data exists
        if (availabilityData[dateString]) {
            const indicator = document.createElement('div');
            indicator.className = 'availability-indicator';
            dayCell.appendChild(indicator);
        }
        
        // Add click event to select/deselect date
        dayCell.addEventListener('click', () => {
            const dateIndex = selectedDates.indexOf(dateString);
            if (dateIndex > -1) {
                selectedDates.splice(dateIndex, 1);
                dayCell.classList.remove('selected');
            } else {
                selectedDates.push(dateString);
                dayCell.classList.add('selected');
            }
        });
        
        calendarDaysContainer.appendChild(dayCell);
    }
}

// Handle availability submission
function handleSubmitAvailability() {
    const name = participantNameInput.value.trim();
    
    if (!name) {
        showNotification('Please enter your name');
        return;
    }
    
    if (selectedDates.length === 0) {
        showNotification('Please select at least one date');
        return;
    }
    
    // Get selected time slots
    selectedTimeSlots = Array.from(timeSlotCheckboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);
    
    if (selectedTimeSlots.length === 0) {
        showNotification('Please select at least one time slot');
        return;
    }
    
    // Create participant object
    const participant = {
        id: Date.now().toString(),
        name: name,
        dates: selectedDates,
        timeSlots: selectedTimeSlots,
        notes: scheduleNotesInput.value.trim(),
        timestamp: new Date().toISOString()
    };
    
    // Check if participant already exists
    const existingParticipantIndex = participants.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
    
    if (existingParticipantIndex > -1) {
        participants[existingParticipantIndex] = participant;
    } else {
        participants.push(participant);
    }
    
    // Update availability data
    updateAvailabilityData();
    
    // Save to localStorage
    saveParticipants();
    
    // Reset form
    participantNameInput.value = '';
    scheduleNotesInput.value = '';
    selectedDates = [];
    timeSlotCheckboxes.forEach(checkbox => checkbox.checked = false);
    
    // Rerender calendar and availability results
    renderCalendar();
    renderAvailabilityResults();
    updateSummary();
    
    showNotification('Availability submitted successfully!');
}

// Update availability data for calendar heatmap
function updateAvailabilityData() {
    availabilityData = {};
    
    participants.forEach(participant => {
        participant.dates.forEach(date => {
            if (!availabilityData[date]) {
                availabilityData[date] = {
                    date: date,
                    participants: [],
                    timeSlots: {},
                    total: 0
                };
            }
            
            // Add participant to date
            availabilityData[date].participants.push(participant.name);
            availabilityData[date].total = availabilityData[date].participants.length;
            
            // Track time slots
            participant.timeSlots.forEach(slot => {
                if (!availabilityData[date].timeSlots[slot]) {
                    availabilityData[date].timeSlots[slot] = 0;
                }
                availabilityData[date].timeSlots[slot]++;
            });
        });
    });
    
    // Save availability data
    localStorage.setItem('availabilityData', JSON.stringify(availabilityData));
}

// Render availability results
function renderAvailabilityResults() {
    if (participants.length === 0) {
        availabilityCalendar.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <p>No availability submitted yet. Be the first to add yours!</p>
            </div>
        `;
        participantsList.innerHTML = '';
        bestTimesList.innerHTML = '';
        return;
    }
    
    // Render heatmap calendar
    renderHeatmapCalendar();
    
    // Render participants list
    renderParticipantsList();
    
    // Render best times
    renderBestTimes();
}

// Render heatmap calendar
function renderHeatmapCalendar() {
    // Get all dates with availability data
    const availableDates = Object.keys(availabilityData).sort();
    
    if (availableDates.length === 0) {
        availabilityCalendar.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <p>No dates selected yet. Submit your availability!</p>
            </div>
        `;
        return;
    }
    
    // Get min and max date to determine range
    const minDate = new Date(availableDates[0]);
    const maxDate = new Date(availableDates[availableDates.length - 1]);
    
    // Build calendar layout
    const calendar = document.createElement('div');
    calendar.className = 'heatmap-calendar';
    
    // Create header with weekdays
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    weekdays.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'weekday-header';
        dayHeader.textContent = day;
        calendar.appendChild(dayHeader);
    });
    
    // Create calendar grid with actual dates
    const startDate = new Date(minDate);
    startDate.setDate(startDate.getDate() - startDate.getDay()); // Start from the last Sunday
    
    const endDate = new Date(maxDate);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay())); // End on the next Saturday
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateString = d.toISOString().split('T')[0];
        const dayCell = document.createElement('div');
        dayCell.className = 'heatmap-day';
        
        // Date number
        const dateNumber = document.createElement('div');
        dateNumber.className = 'date-number';
        dateNumber.textContent = d.getDate();
        dayCell.appendChild(dateNumber);
        
        // If date has availability data
        if (availabilityData[dateString]) {
            const data = availabilityData[dateString];
            
            // Add availability count
            const countElement = document.createElement('div');
            countElement.className = 'availability-count';
            countElement.textContent = `${data.total}`;
            dayCell.appendChild(countElement);
            
            // Add color based on availability level
            const maxParticipants = Math.max(...Object.values(availabilityData).map(d => d.total));
            const level = Math.ceil((data.total / maxParticipants) * 4);
            dayCell.classList.add(`level-${level}`);
            
            // Add click event to show details
            dayCell.addEventListener('click', () => {
                showDateDetails(dateString, data);
            });
            
            // Mark as selected if it's the final date
            if (selectedFinalDate && selectedFinalDate.includes(dateString)) {
                dayCell.classList.add('selected');
            }
        } else {
            dayCell.classList.add('disabled');
        }
        
        calendar.appendChild(dayCell);
    }
    
    availabilityCalendar.innerHTML = '';
    availabilityCalendar.appendChild(calendar);
}

// Show date details in a tooltip/popup
function showDateDetails(dateString, data) {
    // Format the date
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
    });
    
    // Simple alert for now, but could be enhanced with a custom modal
    let message = `Date: ${formattedDate}\n`;
    message += `Available participants (${data.participants.length}): ${data.participants.join(', ')}\n\n`;
    
    message += `Time slots availability:\n`;
    for (const [slot, count] of Object.entries(data.timeSlots)) {
        const slotName = slot === 'sunset' ? 'Sunset (Maghrib - around 6:00 PM)' : 
                        slot === 'dinner' ? 'Dinner (8:00 PM)' : 
                        'Late Night (11:00 PM onwards)';
        message += `- ${slotName}: ${count} people\n`;
    }
    
    alert(message);
}

// Render participants list
function renderParticipantsList() {
    participantsList.innerHTML = participants.map(participant => `
        <li>
            ${participant.name}
            <small>(${participant.dates.length} dates available)</small>
        </li>
    `).join('');
}

// Render best times
function renderBestTimes() {
    // Get dates sorted by most available participants
    const sortedDates = Object.values(availabilityData)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5); // Top 5 dates
    
    if (sortedDates.length === 0) {
        bestTimesList.innerHTML = `<li>No dates available yet</li>`;
        return;
    }
    
    bestTimesList.innerHTML = sortedDates.map(data => {
        const date = new Date(data.date);
        const formattedDate = date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric'
        });
        
        // Find best time slot
        let bestSlot = '';
        let bestSlotCount = 0;
        
        for (const [slot, count] of Object.entries(data.timeSlots)) {
            if (count > bestSlotCount) {
                bestSlotCount = count;
                bestSlot = slot === 'sunset' ? 'Sunset (6:00 PM)' : 
                          slot === 'dinner' ? 'Dinner (8:00 PM)' : 
                          'Late Night (11:00 PM)';
            }
        }
        
        return `
            <li data-date="${data.date}" data-time="${bestSlot}">
                <span>${formattedDate} - ${bestSlot}</span>
                <div class="date-votes">
                    <span class="vote-count">${data.total}</span>
                    <button class="select-this-date btn-secondary" onclick="selectThisDate('${data.date}', '${bestSlot}')">
                        Select
                    </button>
                </div>
            </li>
        `;
    }).join('');
    
    // Add click events to select buttons
    document.querySelectorAll('.select-this-date').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const li = button.closest('li');
            selectThisDate(li.dataset.date, li.dataset.time);
        });
    });
}

// Select a date as the final date
function selectThisDate(date, timeSlot) {
    const dateObj = new Date(date);
    const formattedDate = dateObj.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
    });
    
    selectedFinalDate = `${formattedDate} at ${timeSlot} time`;
    finalDateDisplay.textContent = selectedFinalDate;
    selectDateButton.textContent = 'Change Date';
    
    localStorage.setItem('selectedFinalDate', selectedFinalDate);
    
    showNotification('Final date selected!');
    
    // Rerender availability to highlight selected date
    renderAvailabilityResults();
}

// Handle selecting final date
function handleSelectFinalDate() {
    // Switch to schedule tab
    tabButtons.forEach(btn => {
        if (btn.dataset.tab === 'schedule-tab') {
            btn.click();
        }
    });
    
    // Scroll to best times section
    document.querySelector('.best-times').scrollIntoView({ behavior: 'smooth' });
}

// Handle adding a new dish
function handleAddDish(event) {
    event.preventDefault();
    
    const newDish = {
        id: Date.now().toString(),
        name: dishNameInput.value.trim(),
        contributor: contributorInput.value.trim(),
        category: categorySelect.value,
        timestamp: new Date().toISOString()
    };
    
    dishes.unshift(newDish);
    saveDishes();
    
    // Reset form
    dishForm.reset();
    dishNameInput.focus();
    
    renderDishes();
    updateSummary();
    
    showNotification('Dish added successfully!');
}

// Render dishes based on filter
function renderDishes() {
    const filter = filterSelect.value;
    let filteredDishes = [...dishes];
    
    if (filter !== 'All') {
        filteredDishes = dishes.filter(dish => dish.category === filter);
    }
    
    if (filteredDishes.length === 0) {
        dishesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-utensils"></i>
                <p>${dishes.length === 0 ? 'No dishes added yet. Start planning your party!' : 'No dishes match your filter.'}</p>
            </div>
        `;
        return;
    }
    
    dishesList.innerHTML = filteredDishes.map(dish => `
        <div class="dish-card" data-id="${dish.id}">
            <div class="dish-info">
                <h3>${dish.name}</h3>
                <div class="dish-meta">
                    <span>By: ${dish.contributor}</span>
                    <span class="dish-category">${dish.category}</span>
                </div>
            </div>
            <div class="dish-actions">
                <button class="edit" title="Edit dish">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete" title="Remove dish">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    // Add event listeners to action buttons
    document.querySelectorAll('.dish-card .delete').forEach(button => {
        button.addEventListener('click', handleDeleteDish);
    });
    
    document.querySelectorAll('.dish-card .edit').forEach(button => {
        button.addEventListener('click', handleEditDish);
    });
}

// Handle dish deletion
function handleDeleteDish(event) {
    const dishCard = event.target.closest('.dish-card');
    const dishId = dishCard.dataset.id;
    
    if (confirm('Are you sure you want to remove this dish?')) {
        dishes = dishes.filter(dish => dish.id !== dishId);
        saveDishes();
        renderDishes();
        updateSummary();
        showNotification('Dish removed successfully!');
    }
}

// Handle dish editing
function handleEditDish(event) {
    const dishCard = event.target.closest('.dish-card');
    const dishId = dishCard.dataset.id;
    const dish = dishes.find(d => d.id === dishId);
    
    if (dish) {
        // For simplicity, we'll just populate the form and remove the old dish
        dishNameInput.value = dish.name;
        contributorInput.value = dish.contributor;
        categorySelect.value = dish.category;
        
        // Remove the dish and update
        dishes = dishes.filter(d => d.id !== dishId);
        saveDishes();
        renderDishes();
        updateSummary();
        
        // Scroll to form
        dishForm.scrollIntoView({ behavior: 'smooth' });
    }
}

// Update summary statistics
function updateSummary() {
    // Update UI
    totalParticipantsElement.textContent = participants.length;
    totalDishesElement.textContent = dishes.length;
}

// Handle clear all
function handleClearAll() {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
        dishes = [];
        participants = [];
        availabilityData = {};
        selectedFinalDate = null;
        
        saveDishes();
        saveParticipants();
        localStorage.removeItem('availabilityData');
        localStorage.removeItem('selectedFinalDate');
        
        // Reset displays
        finalDateDisplay.textContent = 'Not yet selected';
        selectDateButton.textContent = 'Select This Date';
        
        renderDishes();
        renderCalendar();
        renderAvailabilityResults();
        updateSummary();
        
        showNotification('All data cleared!');
    }
}

// Handle share functionality
function handleShare() {
    // Generate a shareable link (in a real app, this would create a unique URL)
    const shareData = btoa(JSON.stringify({
        dishes,
        participants,
        availabilityData,
        selectedFinalDate
    }));
    
    const shareLink = `${window.location.origin}${window.location.pathname}?share=${shareData}`;
    
    shareLinkInput.value = shareLink;
    shareModal.style.display = 'flex';
}

// Handle copy link
function handleCopyLink() {
    shareLinkInput.select();
    document.execCommand('copy');
    showNotification('Link copied to clipboard!');
}

// Handle print functionality
function handlePrint() {
    // Create a printable version
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Iftar Scheduler - Details</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', 'Helvetica Neue', sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                }
                h1, h2, h3 {
                    color: #166088;
                }
                .section {
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #eee;
                }
                .date-info {
                    background-color: #f8f9fa;
                    padding: 15px;
                    border-radius: 8px;
                    margin: 20px 0;
                }
                .participant {
                    margin-bottom: 10px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid #eee;
                }
                .dish {
                    margin-bottom: 15px;
                    padding-bottom: 15px;
                    border-bottom: 1px solid #eee;
                }
                .dish h3 {
                    margin-bottom: 5px;
                    color: #4a6fa5;
                }
                .contributor {
                    font-style: italic;
                    color: #666;
                }
                .category {
                    margin-top: 25px;
                }
                @media print {
                    body {
                        font-size: 12pt;
                    }
                    .no-print {
                        display: none;
                    }
                }
            </style>
        </head>
        <body>
            <h1>Iftar Scheduler</h1>
            
            <div class="date-info">
                <h2>Event Details</h2>
                <p><strong>Date & Time:</strong> ${selectedFinalDate || 'Not yet selected'}</p>
                <p><strong>Total Participants:</strong> ${participants.length}</p>
                <p><strong>Total Dishes:</strong> ${dishes.length}</p>
            </div>
            
            <div class="section">
                <h2>Participants</h2>
                ${participants.length > 0 ? participants.map(p => `
                    <div class="participant">
                        <p><strong>${p.name}</strong></p>
                        <p><small>Available on ${p.dates.length} dates</small></p>
                        ${p.notes ? `<p>Notes: ${p.notes}</p>` : ''}
                    </div>
                `).join('') : '<p>No participants yet</p>'}
            </div>
    `);
    
    // Group dishes by category
    const categories = ['Appetizer', 'Main Course', 'Side Dish', 'Dessert', 'Beverage'];
    
    printWindow.document.write(`
            <div class="section">
                <h2>Menu</h2>
    `);
    
    if (dishes.length === 0) {
        printWindow.document.write('<p>No dishes added yet</p>');
    } else {
        categories.forEach(category => {
            const categoryDishes = dishes.filter(dish => dish.category === category);
            
            if (categoryDishes.length > 0) {
                printWindow.document.write(`
                    <div class="category">
                        <h3>${category}s</h3>
                `);
                
                categoryDishes.forEach(dish => {
                    printWindow.document.write(`
                        <div class="dish">
                            <h4>${dish.name}</h4>
                            <p class="contributor">Brought by: ${dish.contributor}</p>
                        </div>
                    `);
                });
                
                printWindow.document.write(`</div>`);
            }
        });
    }
    
    printWindow.document.write(`
            </div>
            
            <div class="no-print" style="margin-top: 30px; text-align: center;">
                <button onclick="window.print();" style="padding: 10px 20px; background: #4fc3a1; color: white; border: none; border-radius: 4px; cursor: pointer;">Print</button>
                <button onclick="window.close();" style="padding: 10px 20px; background: #f8f9fa; color: #333; border: 1px solid #dee2e6; border-radius: 4px; margin-left: 10px; cursor: pointer;">Close</button>
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
}

// Show notification
function showNotification(message) {
    // Simple notification implementation
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: var(--accent-color);
        color: white;
        padding: 12px 20px;
        border-radius: var(--border-radius);
        box-shadow: var(--shadow);
        z-index: 1000;
        opacity: 0;
        transform: translateY(10px);
        transition: opacity 0.3s, transform 0.3s;
    `;
    
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 10);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(10px)';
        
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Save dishes to localStorage
function saveDishes() {
    localStorage.setItem('dishes', JSON.stringify(dishes));
}

// Save participants to localStorage
function saveParticipants() {
    localStorage.setItem('participants', JSON.stringify(participants));
}

// Check for shared data in URL
function checkForSharedData() {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedData = urlParams.get('share');
    
    if (sharedData) {
        try {
            const data = JSON.parse(atob(sharedData));
            
            if (data) {
                if (confirm('Would you like to load the shared Iftar plan?')) {
                    if (data.dishes) dishes = data.dishes;
                    if (data.participants) participants = data.participants;
                    if (data.availabilityData) availabilityData = data.availabilityData;
                    if (data.selectedFinalDate) {
                        selectedFinalDate = data.selectedFinalDate;
                        finalDateDisplay.textContent = selectedFinalDate;
                        selectDateButton.textContent = 'Change Date';
                    }
                    
                    saveDishes();
                    saveParticipants();
                    localStorage.setItem('availabilityData', JSON.stringify(availabilityData));
                    localStorage.setItem('selectedFinalDate', selectedFinalDate);
                    
                    renderDishes();
                    renderCalendar();
                    renderAvailabilityResults();
                    updateSummary();
                    
                    showNotification('Shared data loaded successfully!');
                }
            }
        } catch (error) {
            console.error('Error parsing shared data:', error);
        }
    }
}

// Make selectThisDate function global for direct HTML onclick
window.selectThisDate = selectThisDate;

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    checkForSharedData();
});