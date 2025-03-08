/*
 * Iftar Scheduler - Main JavaScript
 */

// Debug information
console.log(`Script loaded at: ${new Date().toLocaleString()}`);
console.log('Script version: 2.5.1');

// Global variables
window.dishes = [];
window.participants = [];
window.availabilityData = {};
window.selectedFinalDate = null;
window.selectedDate = null;

// Variables for date selection
let currentDate = new Date();
let selectedDates = [];
let selectedTimeSlots = [];

// Initialize selectedDates in the window object for global access
window.selectedDates = selectedDates;
window.currentDate = currentDate;
window.selectedTimeSlots = selectedTimeSlots;
window.dishes = window.dishes || [];

// Initialize global variables
initializeGlobalVariables();

// Add cache-busting query parameter to force reload
if (window.location.search.indexOf('nocache') === -1) {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionParam = urlParams.get('session');
  
  const cacheBuster = new Date().getTime();
  let newUrl = window.location.pathname + '?nocache=' + cacheBuster;
  
  // Preserve the session parameter if it exists
  if (sessionParam) {
    newUrl += '&session=' + sessionParam;
  }
  
  window.location.href = window.location.origin + newUrl;
}

// Firebase access
let database;
let firebaseInitialized = false;
let isOnline = navigator.onLine;
let isSyncing = false;
let sessionId = '';

// Listen for Firebase initialization events
document.addEventListener('firebase-ready', (event) => {
  console.log("Received firebase-ready event");
  
  // Prevent multiple initializations
  if (window.firebaseInitInProgress) {
    console.log("Firebase initialization already in progress, skipping");
    return;
  }
  window.firebaseInitInProgress = true;
  
  database = event.detail.database;
  firebaseInitialized = true;
  
  // Import Firebase functions for connection monitoring
  import('https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js').then(module => {
    const { ref, onValue } = module;
    
    // Add connection monitoring
    const connectedRef = ref(database, '.info/connected');
    onValue(connectedRef, (snap) => {
      const connected = snap.val();
      console.log('Firebase connection state:', connected ? 'connected' : 'disconnected');
      if (connected) {
        showNotification('Connected to Firebase database');
        
        // Try to auto-migrate data when connected
        setTimeout(autoMigrateData, 2000);
      } else {
        showNotification('Disconnected from Firebase database');
      }
    });
    
    // Initialize database structure
    initializeDatabaseStructure()
      .then(() => {
        console.log("Database structure initialization completed");
        
        // Initialize the app if it hasn't been initialized yet
        if (!window.appInitialized) {
          initializeApp();
        }
        window.firebaseInitInProgress = false;
      })
      .catch(error => {
        console.error("Database structure initialization failed:", error);
        window.firebaseInitInProgress = false;
        
        // Initialize the app anyway, it will fall back to localStorage
        if (!window.appInitialized) {
          initializeApp();
        }
      });
  }).catch(error => {
    console.error("Error importing Firebase database module:", error);
    window.firebaseInitInProgress = false;
    // Initialize the app anyway, it will fall back to localStorage
    if (!window.appInitialized) {
      initializeApp();
    }
  });
});

document.addEventListener('firebase-error', (event) => {
  console.error("Received firebase-error event:", event.detail.error);
  // Try fallback initialization
  tryFallbackFirebaseInit();
});

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
  
  // Set up tab switching
  const tabButtons = document.querySelectorAll('.tab-btn');
  if (tabButtons.length > 0) {
    console.log(`Found ${tabButtons.length} tab buttons`);
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Remove active class from all buttons
        tabButtons.forEach(btn => btn.classList.remove('active'));
        
        // Add active class to clicked button
        button.classList.add('active');
        
        // Hide all tab contents
        const tabContents = document.querySelectorAll('.tab-content');
        tabContents.forEach(content => content.classList.add('hidden'));
        
        // Show the corresponding tab content
        const tabId = button.getAttribute('data-tab');
        console.log(`Switching to tab: ${tabId}`);
        const tabContent = document.getElementById(tabId);
        if (tabContent) {
          tabContent.classList.remove('hidden');
          console.log(`Switched to tab: ${tabId}`);
        } else {
          console.error(`Tab content not found for id: ${tabId}`);
        }
      });
    });
  } else {
    console.error('No tab buttons found');
  }
  
  // Set up filter functionality for dishes
  const filterSelect = document.getElementById('filter');
  if (filterSelect) {
    console.log('Initializing filter select');
    filterSelect.addEventListener('change', () => {
      const filterValue = filterSelect.value;
      console.log(`Filtering dishes by: ${filterValue}`);
      updateDishList(filterValue);
    });
  } else {
    console.error('Filter select not found');
  }
});

// Fallback Firebase initialization for compatibility
function tryFallbackFirebaseInit() {
  console.log("Attempting fallback Firebase initialization");
  
  // Clear any existing database reference
  database = null;
  
  try {
    // Check if Firebase is available globally
    if (typeof firebase !== 'undefined') {
      console.log("Firebase global object found, checking if already initialized");
      
      // Check if Firebase is already initialized
      try {
        const existingApps = firebase.apps;
        if (existingApps && existingApps.length > 0) {
          console.log("Firebase already initialized, using existing app");
          database = firebase.database();
          window.firebaseDatabase = database;
          firebaseInitialized = true;
          return true;
        }
      } catch (error) {
        console.warn("Error checking existing Firebase apps:", error);
      }
      
      // Your web app's Firebase configuration
      const firebaseConfig = {
        apiKey: "AIzaSyCeEW1P6kUbFPLYcIeKQeh7UAVtp8KjQAM",
        authDomain: "scheduler-79bb6.firebaseapp.com",
        projectId: "scheduler-79bb6",
        storageBucket: "scheduler-79bb6.firebasestorage.app",
        messagingSenderId: "414053080251",
        appId: "1:414053080251:web:f12e93dfcdd93f0739dd9e",
        measurementId: "G-JZBFLDS406",
        databaseURL: "https://scheduler-79bb6-default-rtdb.asia-southeast1.firebasedatabase.app"
      };
      
      // Initialize Firebase
      try {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        window.firebaseDatabase = database;
        firebaseInitialized = true;
        console.log("Firebase initialized successfully with fallback method");
        
        // Test database connection
        database.ref().child('.info/connected').on('value', (snap) => {
          if (snap.val() === true) {
            console.log("Connected to Firebase database");
            isOnline = true;
            isSyncing = false;
            updateOnlineStatus();
          } else {
            console.log("Disconnected from Firebase database");
            isOnline = navigator.onLine;
            updateOnlineStatus();
          }
        });
        
        return true;
      } catch (error) {
        console.error("Error initializing Firebase with fallback method:", error);
        return false;
      }
    } else {
      console.error("Firebase global object not available");
      
      // Try to load Firebase dynamically
      const script1 = document.createElement('script');
      script1.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js';
      script1.onload = () => {
        console.log("Firebase app script loaded dynamically");
        
        const script2 = document.createElement('script');
        script2.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-database-compat.js';
        script2.onload = () => {
          console.log("Firebase database script loaded dynamically");
          
          // Try initialization again after scripts are loaded
          setTimeout(() => {
            tryFallbackFirebaseInit();
          }, 1000);
        };
        script2.onerror = (error) => {
          console.error("Error loading Firebase database script dynamically:", error);
        };
        document.head.appendChild(script2);
      };
      script1.onerror = (error) => {
        console.error("Error loading Firebase app script dynamically:", error);
      };
      document.head.appendChild(script1);
      
      return false;
    }
  } catch (error) {
    console.error("Exception during fallback Firebase initialization:", error);
    return false;
  }
}

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
let isSharedSession = false;
let collaborationStatusElement = document.getElementById('collaboration-status');
let statusIndicator = document.querySelector('.status-indicator');
let statusText = document.querySelector('.status-text');

// Initialize
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Generate a unique session ID
function generateSessionId() {
  // Create a timestamp in base36 (alphanumeric) format
  const timestamp = Date.now().toString(36);
  
  // Create a random part (4 characters)
  const randomPart = Math.random().toString(36).substring(2, 6);
  
  // Combine with a prefix that's guaranteed to be Firebase-safe
  // Firebase doesn't allow ., $, #, [, ], / in keys
  // Using 'fb' as a prefix ensures it's a valid Firebase path
  const sessionId = `fb${timestamp}${randomPart}`;
  
  console.log(`Generated new Firebase-safe session ID: ${sessionId}`);
  return sessionId;
}

// Migrate old session ID formats to new format
async function migrateSessionId(oldSessionId) {
  if (!oldSessionId) {
    console.error('Cannot migrate null or undefined session ID');
    return generateSessionId();
  }
  
  // Ensure oldSessionId is a string
  oldSessionId = String(oldSessionId);
  
  // Check if the session ID is already in the new format (starts with 'fb')
  if (oldSessionId.startsWith('fb') && /^fb[a-z0-9]+$/.test(oldSessionId)) {
    console.log('Session ID already in new format:', oldSessionId);
    return oldSessionId;
  }
  
  // For any other format, generate a new Firebase-safe session ID
  console.log('Migrating old session ID format to new format:', oldSessionId);
  const newSessionId = generateSessionId();
  console.log('New Firebase-safe session ID:', newSessionId);
  
  // Store the mapping in localStorage for reference
  const migrationMap = JSON.parse(localStorage.getItem('sessionIdMigrationMap') || '{}');
  migrationMap[oldSessionId] = newSessionId;
  localStorage.setItem('sessionIdMigrationMap', JSON.stringify(migrationMap));
  
  // Try to migrate data from the old session ID to the new one
  if (database) {
    try {
      const migrationSuccess = await migrateDataFromOldSession(oldSessionId, newSessionId);
      if (migrationSuccess) {
        console.log(`Successfully migrated data from ${oldSessionId} to ${newSessionId}`);
      } else {
        console.log(`No data found to migrate from ${oldSessionId}`);
      }
    } catch (error) {
      console.error(`Error during data migration: ${error.message}`);
    }
  }
  
  return newSessionId;
}

// Create a Firebase-safe key from any session ID
function createFirebaseSafeKey(sessionId) {
  if (!sessionId) return 'default';
  
  // Create a simple hash of the session ID
  // This ensures the key is always valid for Firebase
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    const char = sessionId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert to a positive number and then to base36 (alphanumeric)
  const safeKey = Math.abs(hash).toString(36);
  
  console.log('Original session ID:', sessionId);
  console.log('Firebase-safe key:', safeKey);
  
  return safeKey;
}

// Initialize the application
function initializeApp() {
  console.log("Initializing app");
  
  // Initialize global variables
  initializeGlobalVariables();
  
  // Check for session ID in URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const sharedSessionId = urlParams.get('session');
  
  if (sharedSessionId) {
    console.log(`Found shared session ID in URL: ${sharedSessionId}`);
    
    // Use the shared session ID
    (async () => {
      try {
        const migratedSessionId = await migrateSessionId(sharedSessionId);
        console.log(`Using migrated shared session ID: ${migratedSessionId}`);
        
        // Store the migrated session ID
        window.sessionId = migratedSessionId;
        localStorage.setItem('sessionId', migratedSessionId);
        
        // Load data from Firebase
        if (database && firebaseInitialized) {
          console.log("Firebase available, loading shared session");
          
          const loadResult = await loadDataFromFirebase(migratedSessionId);
          console.log(`Firebase data load result for shared session: ${loadResult}`);
          
          // Set up real-time listeners
          await setupRealtimeListeners(migratedSessionId);
          
          // Update UI
          updateParticipantList();
          updateAvailabilityTable();
          updateDishList();
          updateSummaryStats();
          
          // Automatically select the best date
          autoSelectBestDate();
          
          showNotification('Loaded shared plan successfully!', 'success');
        } else {
          console.log("Firebase not available, loading from localStorage");
          loadFromLocalStorage(migratedSessionId);
          updateParticipantList();
          updateAvailabilityTable();
          updateDishList();
          updateSummaryStats();
          
          // Automatically select the best date
          autoSelectBestDate();
        }
      } catch (error) {
        console.error("Error loading shared session:", error);
        
        // Fallback to localStorage
        loadFromLocalStorage(sharedSessionId);
        updateParticipantList();
        updateAvailabilityTable();
        updateDishList();
        updateSummaryStats();
        
        // Automatically select the best date
        autoSelectBestDate();
      }
    })();
  } else {
    // Check for existing session ID in localStorage
    const existingSessionId = localStorage.getItem('sessionId');
    
    if (existingSessionId) {
      console.log(`Found existing session ID in localStorage: ${existingSessionId}`);
      
      // Migrate the session ID if needed
      (async () => {
        try {
          const migratedSessionId = await migrateSessionId(existingSessionId);
          console.log(`Using migrated session ID: ${migratedSessionId}`);
          
          // Store the migrated session ID
          window.sessionId = migratedSessionId;
          
          // Check if Firebase is available
          if (database && firebaseInitialized) {
            console.log("Firebase available, loading existing session");
            
            // Load data from Firebase
            const loadResult = await loadDataFromFirebase(migratedSessionId);
            console.log(`Firebase data load result for existing session: ${loadResult}`);
            
            // Set up real-time listeners
            await setupRealtimeListeners(migratedSessionId);
            
            // Auto-migrate data from old paths
            await autoMigrateData();
            
            // Update summary stats
            updateSummaryStats();
            
            // Automatically select the best date
            autoSelectBestDate();
          } else {
            console.log("Firebase not available, loading from localStorage");
            loadFromLocalStorage(migratedSessionId);
            updateParticipantList();
            updateAvailabilityTable();
            updateDishList();
            updateSummaryStats();
            
            // Automatically select the best date
            autoSelectBestDate();
          }
        } catch (error) {
          console.error("Error during session initialization:", error);
          
          // Fallback to localStorage
          loadFromLocalStorage(existingSessionId);
          updateParticipantList();
          updateAvailabilityTable();
          updateDishList();
          updateSummaryStats();
          
          // Automatically select the best date
          autoSelectBestDate();
        }
      })();
    } else {
      // New user, generate session ID
      console.log("No existing session, creating new session");
      const newSessionId = generateSessionId();
      localStorage.setItem('sessionId', newSessionId);
      window.sessionId = newSessionId;
      
      // Initialize empty data
      window.participants = [];
      window.availabilityData = {};
      window.dishes = [];
      
      // Update summary stats
      updateSummaryStats();
    }
  }
  
  // Set up event listeners for UI interactions
  prevMonthButton.addEventListener('click', () => navigateMonth(-1));
  nextMonthButton.addEventListener('click', () => navigateMonth(1));
  submitAvailabilityButton.addEventListener('click', handleSubmitAvailability);
  dishForm.addEventListener('submit', handleAddDish);
  shareButton.addEventListener('click', handleShare);
  printButton.addEventListener('click', handlePrint);
  clearAllButton.addEventListener('click', handleClearAll);
  closeModalButton.addEventListener('click', () => shareModal.style.display = 'none');
  copyLinkButton.addEventListener('click', handleCopyLink);
  
  // Add event listeners for time slot checkboxes
  const timeSlotCheckboxes = document.querySelectorAll('input[name="time-slot"]');
  if (timeSlotCheckboxes.length > 0) {
    console.log(`Found ${timeSlotCheckboxes.length} time slot checkboxes`);
    timeSlotCheckboxes.forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        // Update selectedTimeSlots array when checkboxes change
        selectedTimeSlots = [];
        document.querySelectorAll('input[name="time-slot"]:checked').forEach(cb => {
          selectedTimeSlots.push(cb.value);
        });
        window.selectedTimeSlots = selectedTimeSlots;
        console.log('Selected time slots:', selectedTimeSlots);
      });
    });
  } else {
    console.error('No time slot checkboxes found');
  }
  
  // Close modal when clicking outside
  window.addEventListener('click', (event) => {
    if (event.target === shareModal) {
      shareModal.style.display = 'none';
    }
  });
  
  // Mark the app as ready
  if (typeof window.appReady === 'function') {
    console.log('Calling appReady function to hide loading message');
    window.appReady();
  } else {
    console.log('appReady function not found');
  }
}

// Automatically select the best date
function autoSelectBestDate() {
  console.log('Automatically selecting the best date');
  
  // Get the best date-time options
  const bestOptions = getBestDateTimeOptions();
  
  if (bestOptions.length === 0) {
    console.log('No availability data to select from');
    return;
  }
  
  // Use the best option
  const bestOption = bestOptions[0];
  const dateObj = new Date(bestOption.date);
  const formattedDate = dateObj.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  });
  
  // Format the final date
  const finalDate = `${formattedDate} at ${formatTimeSlot(bestOption.timeSlot)}`;
  
  // Update the final date
  window.selectedFinalDate = finalDate;
  window.selectedDateData = {
    date: bestOption.date,
    timeSlot: bestOption.timeSlot,
    attendees: bestOption.people
  };
  
  // Update UI
  safeUpdateUI('final-date', (element) => {
    element.textContent = finalDate;
  });
  
  safeUpdateUI('final-date-details', (element) => {
    element.style.display = 'block';
  });
  
  // Update attendees list
  updateDateAttendeesList(bestOption.people);
  
  // Update dishes list
  updateDateDishesList();
  
  // Save to Firebase and localStorage
  saveToFirebase(window.sessionId);
  
  console.log('Best date selected automatically:', finalDate);
}

// Handle submit availability
function handleSubmitAvailability() {
  const participantName = participantNameInput.value.trim();
  
  if (!participantName) {
    showNotification('Please enter your name', 'error');
    return;
  }
  
  if (selectedDates.length === 0) {
    showNotification('Please select at least one date', 'error');
    return;
  }
  
  // Collect selected time slots before validation
  selectedTimeSlots = [];
  document.querySelectorAll('input[name="time-slot"]:checked').forEach(checkbox => {
    selectedTimeSlots.push(checkbox.value);
  });
  
  if (selectedTimeSlots.length === 0) {
    showNotification('Please select at least one time slot', 'error');
    return;
  }
  
  // Create availability entry
  const availabilityEntry = {
    name: participantName,
    dates: selectedDates,
    timeSlots: selectedTimeSlots,
    notes: scheduleNotesInput.value.trim(),
    timestamp: new Date().toISOString()
  };
  
  // Add to participants list if not already present
  const existingParticipantIndex = window.participants.findIndex(p => p.name.toLowerCase() === participantName.toLowerCase());
  
  if (existingParticipantIndex >= 0) {
    // Update existing participant
    window.participants[existingParticipantIndex] = availabilityEntry;
  } else {
    // Add new participant
    window.participants.push(availabilityEntry);
  }
  
  // Update availability data
  selectedDates.forEach(date => {
    if (!window.availabilityData[date]) {
      window.availabilityData[date] = {};
    }
    
    selectedTimeSlots.forEach(timeSlot => {
      if (!window.availabilityData[date][timeSlot]) {
        window.availabilityData[date][timeSlot] = [];
      }
      
      // Add participant to this date and time slot if not already present
      if (!window.availabilityData[date][timeSlot].includes(participantName)) {
        window.availabilityData[date][timeSlot].push(participantName);
      }
    });
  });
  
  // Save to Firebase and localStorage using the current session ID
  saveToFirebase(window.sessionId);
  
  // Update UI
  updateParticipantList();
  updateAvailabilityTable();
  
  // Automatically select the best date
  autoSelectBestDate();
  
  // Reset form
  participantNameInput.value = '';
  scheduleNotesInput.value = '';
  selectedDates = [];
  window.selectedDates = [];
  selectedTimeSlots = [];
  window.selectedTimeSlots = [];
  
  // Uncheck all date checkboxes
  document.querySelectorAll('.date-checkbox').forEach(checkbox => {
    checkbox.checked = false;
  });
  
  // Uncheck all time slot checkboxes
  timeSlotCheckboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
  
  showNotification('Availability submitted successfully', 'success');
}

// Handle add dish
function handleAddDish(event) {
  event.preventDefault();
  
  // Ensure form elements exist
  if (!dishNameInput || !contributorInput || !categorySelect) {
    console.error('Dish form elements not found');
    showNotification('Error: Form elements not found', 'error');
    return;
  }
  
  const dishName = dishNameInput.value.trim();
  const contributor = contributorInput.value.trim();
  const category = categorySelect.value;
  
  if (!dishName) {
    showNotification('Please enter a dish name', 'error');
    return;
  }
  
  if (!contributor) {
    showNotification('Please enter your name', 'error');
    return;
  }
  
  if (!category) {
    showNotification('Please select a category', 'error');
    return;
  }
  
  // Ensure dishes array exists
  if (!window.dishes) {
    window.dishes = [];
  }
  
  // Create dish entry
  const dishEntry = {
    name: dishName,
    contributor: contributor,
    category: category,
    timestamp: new Date().toISOString()
  };
  
  // Add to dishes list
  window.dishes.push(dishEntry);
  
  // Save to Firebase and localStorage
  saveToFirebase(window.sessionId);
  
  // Update UI
  updateDishList();
  
  // Reset form
  dishNameInput.value = '';
  contributorInput.value = '';
  categorySelect.value = 'main';
  
  showNotification('Dish added successfully', 'success');
}

// Update sync status indicator
function updateSyncStatus(status) {
  if (!statusIndicator || !statusText) {
    statusIndicator = document.querySelector('.status-indicator');
    statusText = document.querySelector('.status-text');
    
    if (!statusIndicator || !statusText) {
      console.warn('Status indicators not found in the DOM');
      return;
    }
  }
  
  // Clear any existing timeout
  if (window.syncStatusTimeout) {
    clearTimeout(window.syncStatusTimeout);
    window.syncStatusTimeout = null;
  }
  
  switch (status) {
    case 'syncing':
      statusIndicator.style.backgroundColor = '#FFA000'; // Amber
      statusText.textContent = 'Syncing...';
      break;
    case 'synced':
      statusIndicator.style.backgroundColor = '#4CAF50'; // Green
      statusText.textContent = 'Synced';
      
      // Hide the status after 3 seconds
      window.syncStatusTimeout = setTimeout(() => {
        statusIndicator.style.backgroundColor = '#4CAF50';
        statusText.textContent = 'Synced';
        window.syncStatusTimeout = null;
      }, 3000);
      break;
    case 'offline':
      statusIndicator.style.backgroundColor = '#9E9E9E'; // Grey
      statusText.textContent = 'Offline';
      break;
    case 'error':
      statusIndicator.style.backgroundColor = '#F44336'; // Red
      statusText.textContent = 'Sync Error';
      break;
    default:
      statusIndicator.style.backgroundColor = '#2196F3'; // Blue
      statusText.textContent = 'Unknown';
  }
}

// Update online status indicator
function updateOnlineStatus() {
  const isOnline = navigator.onLine;
  console.log(`Online status: ${isOnline ? 'Online' : 'Offline'}`);
  
  if (!isOnline) {
    updateSyncStatus('offline');
    return;
  }
  
  // If we're online but don't have Firebase initialized
  if (!database || !firebaseInitialized) {
    updateSyncStatus('error');
    return;
  }
  
  // If we're online and not currently syncing
  if (!window.syncStatusTimeout) {
    updateSyncStatus('synced');
  }
}

// Initialize database structure
async function initializeDatabaseStructure() {
  console.log("Initializing database structure");
  
  try {
    const { ref, get } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js');
    
    // Check if the sessions node exists (original structure)
    const sessionsRef = ref(database, 'sessions');
    const snapshot = await get(sessionsRef);
    
    if (!snapshot.exists()) {
      console.log("Creating initial database structure");
      // Structure will be created automatically when first data is saved
      return true;
    }
    
    console.log("Database structure already exists");
    return true;
  } catch (error) {
    console.error("Error initializing database structure:", error);
    return false;
  }
}

// Load data from Firebase
async function loadDataFromFirebase(sessionId) {
  console.log(`Loading data from Firebase for session: ${sessionId}`);
  
  if (!sessionId || sessionId === '') {
    console.log('No session ID provided, generating a new one');
    sessionId = generateSessionId();
    window.location.hash = sessionId;
  }
  
  // Migrate session ID if it contains underscores
  try {
    sessionId = await migrateSessionId(sessionId);
    console.log(`Using migrated session ID for Firebase load: ${sessionId}`);
  } catch (error) {
    console.error(`Error migrating session ID: ${error.message}`);
    // Continue with the original session ID
  }
  
  try {
    const { ref, get } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js');
    
    // First try the new path structure
    let sessionRef = ref(database, `data/${sessionId}`);
    console.log(`Attempting to load from path: data/${sessionId}`);
    
    try {
      let snapshot = await get(sessionRef);
      
      // If no data found in the first path, try the old path
      if (!snapshot.exists()) {
        console.log(`No data found at data/${sessionId}, trying sessions/${sessionId}`);
        sessionRef = ref(database, `sessions/${sessionId}`);
        snapshot = await get(sessionRef);
      }
      
      if (snapshot.exists()) {
        console.log('Data found in Firebase');
        const data = snapshot.val();
        
        // Update the UI with the loaded data
        if (data.dishes) {
          window.dishes = data.dishes;
          updateDishList();
        }
        
        if (data.participants) {
          window.participants = data.participants;
          updateParticipantList();
        }
        
        if (data.availabilityData) {
          window.availabilityData = data.availabilityData;
          updateAvailabilityTable();
        }
        
        if (data.selectedFinalDate) {
          window.selectedFinalDate = data.selectedFinalDate;
          safeUpdateUI('finalDateDisplay', (element) => {
            element.textContent = window.selectedFinalDate;
          });
          safeUpdateUI('finalDateSection', (element) => {
            element.style.display = 'block';
          });
        }
        
        return true;
      } else {
        console.log('No saved data found in Firebase');
        return false;
      }
    } catch (error) {
      console.error(`Error loading data from Firebase: ${error}`);
      
      // Try loading from localStorage as a fallback
      console.log('Attempting to load from localStorage as fallback');
      return loadFromLocalStorage(sessionId);
    }
  } catch (error) {
    console.error(`Error importing Firebase modules: ${error.message}`);
    
    // Try loading from localStorage as a fallback
    console.log('Attempting to load from localStorage as fallback');
    return loadFromLocalStorage(sessionId);
  }
}

// Load data from localStorage
function loadFromLocalStorage(sessionId) {
  console.log(`Loading data from localStorage for session: ${sessionId}`);
  
  if (!sessionId || sessionId === '') {
    console.log('No session ID provided, checking for default session');
    sessionId = localStorage.getItem('sessionId');
    
    if (!sessionId) {
      console.log('No default session found, returning false');
      return false;
    }
  }
  
  try {
    const savedData = localStorage.getItem(`iftar-scheduler-data-${sessionId}`);
    
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      console.log('Data loaded from localStorage:', parsedData);
      
      // Update application data
      if (parsedData.dishes) window.dishes = parsedData.dishes;
      if (parsedData.participants) window.participants = parsedData.participants;
      if (parsedData.availabilityData) window.availabilityData = parsedData.availabilityData;
      if (parsedData.selectedFinalDate) window.selectedFinalDate = parsedData.selectedFinalDate;
      
      // Update UI
      updateDishList();
      updateParticipantList();
      updateAvailabilityTable();
      
      if (window.selectedFinalDate) {
        safeUpdateUI('finalDateDisplay', (element) => {
          element.textContent = window.selectedFinalDate;
        });
        
        safeUpdateUI('finalDateSection', (element) => {
          element.style.display = 'block';
        });
      }
      
      console.log('Data successfully loaded from localStorage');
      return true;
    } else {
      console.log(`No saved data found in localStorage for session: ${sessionId}`);
      return false;
    }
  } catch (error) {
    console.error(`Error loading from localStorage: ${error.message}`);
    return false;
  }
}

// Set up real-time listeners for Firebase updates
async function setupRealtimeListeners(sessionId) {
  // Migrate the session ID if it contains underscores or hyphens
  sessionId = await migrateSessionId(sessionId);
  console.log('Setting up listeners with migrated session ID:', sessionId);
  
  try {
    const { ref, onValue } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js');
    
    try {
      // Use a simpler path structure
      console.log(`Setting up listeners with path: data/${sessionId}`);
      const sessionRef = ref(database, `data/${sessionId}`);
      
      onValue(sessionRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          console.log('Real-time update received:', data);
          
          let hasChanges = false;
          
          // Update dishes if they've changed
          if (data.dishes && JSON.stringify(data.dishes) !== JSON.stringify(window.dishes)) {
            window.dishes = data.dishes;
            hasChanges = true;
            console.log('Updated dishes from real-time data');
          }
          
          // Update participants if they've changed
          if (data.participants && JSON.stringify(data.participants) !== JSON.stringify(window.participants)) {
            window.participants = data.participants;
            hasChanges = true;
            console.log('Updated participants from real-time data');
          }
          
          // Update availability data if it's changed
          if (data.availabilityData && JSON.stringify(data.availabilityData) !== JSON.stringify(window.availabilityData)) {
            window.availabilityData = data.availabilityData;
            hasChanges = true;
            console.log('Updated availability data from real-time data');
          }
          
          // Update selected final date if it's changed
          if (data.selectedFinalDate !== window.selectedFinalDate) {
            window.selectedFinalDate = data.selectedFinalDate;
            hasChanges = true;
            console.log('Updated selected final date from real-time data');
          }
          
          // If any data has changed, update the UI
          if (hasChanges) {
            console.log('Changes detected, updating UI');
            saveToLocalStorage(sessionId);
            updateDishList();
            updateParticipantList();
            updateAvailabilityTable();
            
            // Update final date display if needed
            if (window.selectedFinalDate) {
              safeUpdateUI('finalDateDisplay', (element) => {
                element.textContent = window.selectedFinalDate;
              });
              safeUpdateUI('finalDateSection', (element) => {
                element.style.display = 'block';
              });
            }
          }
        }
      });
    } catch (error) {
      console.error('Error setting up real-time listeners:', error);
    }
  } catch (error) {
    console.error('Error setting up real-time listeners:', error);
  }
}

// Automatically try to migrate data when the app loads
async function autoMigrateData() {
  console.log('Auto-migrating data from old paths to new paths');
  
  try {
    const { ref, get, set } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js');
    
    // Get the current session ID
    const currentSessionId = localStorage.getItem('sessionId') || window.location.hash.substring(1);
    
    if (!currentSessionId) {
      console.log('No session ID found, cannot migrate data');
      return false;
    }
    
    console.log(`Checking for data to migrate for session: ${currentSessionId}`);
    
    // Check if data exists in the old path
    const oldPathRef = ref(database, `sessions/${currentSessionId}`);
    const oldSnapshot = await get(oldPathRef);
    
    if (oldSnapshot.exists()) {
      console.log(`Found data in old path: sessions/${currentSessionId}`);
      
      // Get the data
      const data = oldSnapshot.val();
      
      // Create the new path
      const newPathRef = ref(database, `dish-party/${currentSessionId}`);
      
      // Save to the new path
      await set(newPathRef, data);
      console.log(`Migrated data to new path: dish-party/${currentSessionId}`);
      
      // Delete the old data
      await set(oldPathRef, null);
      console.log(`Deleted data from old path: sessions/${currentSessionId}`);
      
      showNotification('Data migrated successfully', 'success');
      return true;
    } else {
      console.log(`No data found in old path: sessions/${currentSessionId}`);
      return false;
    }
  } catch (error) {
    console.error('Error during auto-migration:', error);
    return false;
  }
}

// Migrate data from an old session ID to a new one in Firebase
async function migrateDataFromOldSession(oldSessionId, newSessionId) {
  console.log(`Migrating data from ${oldSessionId} to ${newSessionId}`);
  
  try {
    const { ref, get, set } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js');
    
    // First try to get data from the old session ID
    try {
      // Try both path structures
      let oldSessionRef = ref(database, `sessions/${oldSessionId}`);
      let snapshot = await get(oldSessionRef);
      
      // If no data found in the first path, try the second path
      if (!snapshot.exists()) {
        console.log(`No data found at sessions/${oldSessionId}, trying data/${oldSessionId}`);
        oldSessionRef = ref(database, `data/${oldSessionId}`);
        snapshot = await get(oldSessionRef);
      }
      
      if (snapshot.exists()) {
        console.log(`Found data for old session ID: ${oldSessionId}`);
        const data = snapshot.val();
        
        // Now save this data to the new session ID
        const newSessionRef = ref(database, `data/${newSessionId}`);
        await set(newSessionRef, data);
        console.log(`Successfully migrated data to new session ID: ${newSessionId}`);
        
        return true;
      } else {
        console.log(`No data found for old session ID: ${oldSessionId}`);
        return false;
      }
    } catch (error) {
      console.error(`Error accessing old session data: ${error.message}`);
      return false;
    }
  } catch (error) {
    console.error(`Error importing Firebase modules: ${error.message}`);
    return false;
  }
}

// Save data to Firebase
async function saveToFirebase(sessionIdOrForce) {
  // If a boolean is passed (for backward compatibility), use the current session ID
  let sessionId = typeof sessionIdOrForce === 'boolean' ? window.sessionId : sessionIdOrForce;
  
  console.log(`Saving data to Firebase for session: ${sessionId}`);
  
  if (!sessionId || sessionId === '') {
    console.log('No session ID provided, using current session ID');
    sessionId = window.sessionId;
    
    if (!sessionId) {
      console.log('No current session ID, generating a new one');
      sessionId = generateSessionId();
      window.sessionId = sessionId;
      localStorage.setItem('sessionId', sessionId);
    }
  }
  
  // Migrate session ID if it contains underscores
  try {
    sessionId = await migrateSessionId(sessionId);
    console.log(`Using migrated session ID for Firebase save: ${sessionId}`);
  } catch (error) {
    console.error(`Error migrating session ID: ${error.message}`);
    // Continue with the original session ID
  }
  
  try {
    const { ref, set } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js');
    
    // Ensure all required properties exist and have valid values for Firebase
    if (typeof window.dishes === 'undefined') window.dishes = [];
    if (typeof window.participants === 'undefined') window.participants = [];
    if (typeof window.availabilityData === 'undefined') window.availabilityData = {};
    if (typeof window.selectedFinalDate === 'undefined' || window.selectedFinalDate === undefined) {
      console.log('selectedFinalDate is undefined, setting to null for Firebase compatibility');
      window.selectedFinalDate = null;
    }
    
    // Create a data object with all the current state
    const data = {
      dishes: window.dishes,
      participants: window.participants,
      availabilityData: window.availabilityData,
      selectedFinalDate: window.selectedFinalDate,
      lastUpdated: new Date().toISOString()
    };
    
    // Log the data being saved to help debug
    console.log('Saving data to Firebase:', {
      sessionId,
      hasSelectedFinalDate: window.selectedFinalDate !== undefined,
      selectedFinalDateValue: window.selectedFinalDate,
      participantsCount: window.participants.length,
      dishesCount: window.dishes.length
    });
    
    // Save to the new path structure
    const sessionRef = ref(database, `data/${sessionId}`);
    console.log(`Saving to path: data/${sessionId}`);
    
    await set(sessionRef, data);
    console.log('Data successfully saved to Firebase');
    
    // Also save to localStorage as a backup
    saveToLocalStorage(sessionId);
    
    return true;
  } catch (error) {
    console.error(`Error saving to Firebase: ${error.message}`);
    
    // Save to localStorage as a fallback
    console.log('Saving to localStorage as fallback');
    saveToLocalStorage(sessionId);
    
    return false;
  }
}

// Initialize global variables
function initializeGlobalVariables() {
  console.log('Initializing global variables');
  
  // Initialize data structures
  if (typeof window.participants === 'undefined') {
    console.log('participants is undefined, initializing it');
    window.participants = [];
  }
  
  if (typeof window.availabilityData === 'undefined') {
    console.log('availabilityData is undefined, initializing it');
    window.availabilityData = {};
  }
  
  if (typeof window.dishes === 'undefined') {
    console.log('dishes is undefined, initializing it');
    window.dishes = [];
  }
  
  if (typeof window.selectedFinalDate === 'undefined') {
    console.log('selectedFinalDate is undefined, initializing it');
    window.selectedFinalDate = null;
  }
}

// Safe function to update UI elements
function safeUpdateUI(elementId, updateFunction) {
  const element = document.getElementById(elementId);
  if (element) {
    updateFunction(element);
    return true;
  } else {
    // Only log a warning if we're not in the initialization phase
    if (window.appInitialized) {
      console.warn(`Element with ID '${elementId}' not found`);
    } else {
      console.log(`Element with ID '${elementId}' not found during initialization`);
    }
    return false;
  }
}

// Update dish list safely
function updateDishList(filterValue = 'All') {
  console.log('Updating dish list with filter:', filterValue);
  
  // Ensure dishes array exists
  if (!window.dishes) {
    console.log('Initializing dishes array');
    window.dishes = [];
  }
  
  // Check if dishes-list element exists
  const dishesList = document.getElementById('dishes-list');
  if (!dishesList) {
    console.error('Dishes list element not found');
    return;
  }
  
  safeUpdateUI('dishes-list', (element) => {
    // Clear the current list
    element.innerHTML = '';
    
    // Filter dishes if needed
    const filteredDishes = filterValue === 'All' 
      ? window.dishes 
      : window.dishes.filter(dish => dish.category === filterValue);
    
    if (!filteredDishes || filteredDishes.length === 0) {
      // Show empty state
      element.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-utensils"></i>
          <p>No dishes added yet. Be the first to contribute!</p>
        </div>
      `;
      return;
    }
    
    // Add each dish to the list
    filteredDishes.forEach((dish, index) => {
      const dishItem = document.createElement('div');
      dishItem.className = 'dish-card';
      dishItem.innerHTML = `
        <div class="dish-info">
          <h3>${dish.name}</h3>
          <div class="dish-meta">
            <span><i class="fas fa-user"></i> ${dish.contributor}</span>
            <span><i class="fas fa-tag"></i> ${dish.category}</span>
          </div>
        </div>
        <div class="dish-actions">
          <button class="remove-dish-btn" data-index="${window.dishes.indexOf(dish)}">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;
      element.appendChild(dishItem);
    });
    
    // Update summary stats
    updateSummaryStats();
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-dish-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const index = parseInt(e.target.getAttribute('data-index') || e.target.parentElement.getAttribute('data-index'));
        if (!isNaN(index) && index >= 0 && index < window.dishes.length) {
          window.dishes.splice(index, 1);
          updateDishList(filterValue);
          saveToFirebase(window.sessionId);
          showNotification('Dish removed successfully', 'success');
        }
      });
    });
  });
}

// Update participant list safely
function updateParticipantList() {
  console.log('Updating participant list');
  safeUpdateUI('participants', (element) => {
    // Clear the current list
    element.innerHTML = '';
    
    // Add each participant to the list
    window.participants.forEach((participant, index) => {
      const participantItem = document.createElement('div');
      participantItem.className = 'participant-item';
      participantItem.innerHTML = `
        <p>${participant.name}</p>
        <button class="remove-participant-btn" data-index="${index}">Remove</button>
      `;
      element.appendChild(participantItem);
    });
    
    // Update summary stats
    updateSummaryStats();
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-participant-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const index = e.target.getAttribute('data-index');
        window.participants.splice(index, 1);
        updateParticipantList();
        saveToFirebase(window.sessionId);
      });
    });
  });
}

// Update availability table safely
function updateAvailabilityTable() {
  console.log('Updating availability table');
  safeUpdateUI('availability-calendar', (element) => {
    // Clear the current content
    element.innerHTML = '';
    
    // Check if there's any availability data
    const availabilityDates = Object.keys(window.availabilityData);
    
    if (availabilityDates.length === 0) {
      // Show empty state
      element.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-users"></i>
          <p>No availability submitted yet. Be the first to add yours!</p>
        </div>
      `;
      return;
    }
    
    // Create a table to display availability
    const table = document.createElement('table');
    table.className = 'availability-table';
    
    // Create header row with dates
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = '<th>Date</th><th>Time</th><th>Available People</th>';
    table.appendChild(headerRow);
    
    // Sort dates chronologically
    availabilityDates.sort();
    
    // For each date in the availability data
    availabilityDates.forEach(date => {
      const dateObj = new Date(date);
      const formattedDate = dateObj.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
      
      // Get time slots for this date
      const timeSlots = Object.keys(window.availabilityData[date]);
      
      // For each time slot
      timeSlots.forEach((timeSlot, index) => {
        // Get people available at this time
        const people = window.availabilityData[date][timeSlot];
        
        // Create a row for this date and time
        const row = document.createElement('tr');
        
        // Only show the date in the first row for this date
        if (index === 0) {
          row.innerHTML = `
            <td rowspan="${timeSlots.length}">${formattedDate}</td>
            <td>${formatTimeSlot(timeSlot)}</td>
            <td>${formatPeopleList(people)}</td>
          `;
        } else {
          row.innerHTML = `
            <td>${formatTimeSlot(timeSlot)}</td>
            <td>${formatPeopleList(people)}</td>
          `;
        }
        
        table.appendChild(row);
      });
    });
    
    // Add the table to the element
    element.appendChild(table);
    
    // Update best times list
    updateBestTimesList();
  });
}

// Format time slot for display
function formatTimeSlot(timeSlot) {
  switch (timeSlot) {
    case 'sunset':
      return 'Sunset (Maghrib - around 6:00 PM)';
    case 'dinner':
      return 'Dinner (8:00 PM)';
    case 'late':
      return 'Late Night (11:00 PM onwards)';
    default:
      return timeSlot;
  }
}

// Format people list for display
function formatPeopleList(people) {
  if (!people || people.length === 0) {
    return 'No one available';
  }
  
  return people.map(person => `<span class="available-person">${person}</span>`).join(', ');
}

// Update best times list
function updateBestTimesList() {
  safeUpdateUI('best-times-list', (element) => {
    // Clear the current list
    element.innerHTML = '';
    
    // Get all date-time combinations
    const dateTimeCombinations = [];
    
    // For each date in the availability data
    Object.keys(window.availabilityData).forEach(date => {
      // For each time slot
      Object.keys(window.availabilityData[date]).forEach(timeSlot => {
        // Get people available at this time
        const people = window.availabilityData[date][timeSlot];
        
        // Add to the list
        dateTimeCombinations.push({
          date,
          timeSlot,
          people,
          count: people.length
        });
      });
    });
    
    // Sort by number of people available (descending)
    dateTimeCombinations.sort((a, b) => b.count - a.count);
    
    // Take the top 3
    const bestOptions = dateTimeCombinations.slice(0, 3);
    
    if (bestOptions.length === 0) {
      // Show empty state
      element.innerHTML = '<li class="empty-state">No availability data yet</li>';
      return;
    }
    
    // Add each option to the list
    bestOptions.forEach(option => {
      const dateObj = new Date(option.date);
      const formattedDate = dateObj.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
      
      const li = document.createElement('li');
      li.className = 'best-time-option';
      li.innerHTML = `
        <div class="best-time-date">${formattedDate}</div>
        <div class="best-time-slot">${formatTimeSlot(option.timeSlot)}</div>
        <div class="best-time-people">
          <span class="people-count">${option.count} people</span>
          <span class="people-list">${formatPeopleList(option.people)}</span>
        </div>
      `;
      
      element.appendChild(li);
    });
  });
}

// Save data to localStorage
function saveToLocalStorage(sessionIdOrForce) {
  // If a boolean is passed (for backward compatibility), use the current session ID
  let sessionId = typeof sessionIdOrForce === 'boolean' ? window.sessionId : sessionIdOrForce;
  
  console.log(`Saving data to localStorage for session: ${sessionId}`);
  
  if (!sessionId || sessionId === '') {
    console.log('No session ID provided, generating a new one');
    sessionId = generateSessionId();
    localStorage.setItem('sessionId', sessionId);
  }
  
  // Ensure sessionId is a string
  sessionId = String(sessionId);
  
  try {
    // Create a data object with all the current state
    const data = {
      dishes: window.dishes || [],
      participants: window.participants || [],
      availabilityData: window.availabilityData || {},
      selectedFinalDate: window.selectedFinalDate || null,
      lastUpdated: new Date().toISOString()
    };
    
    // Save to localStorage
    localStorage.setItem(`iftar-scheduler-data-${sessionId}`, JSON.stringify(data));
    console.log('Data successfully saved to localStorage');
    
    return true;
  } catch (error) {
    console.error(`Error saving to localStorage: ${error.message}`);
    return false;
  }
}

// Show notification
function showNotification(message, type = 'info') {
  console.log(`Notification (${type}): ${message}`);
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas ${getIconForNotificationType(type)}"></i>
      <span>${message}</span>
    </div>
    <button class="close-notification">×</button>
  `;
  
  // Add to document
  document.body.appendChild(notification);
  
  // Add event listener to close button
  notification.querySelector('.close-notification').addEventListener('click', () => {
    notification.classList.add('fade-out');
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 300);
  });
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (document.body.contains(notification)) {
      notification.classList.add('fade-out');
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }
  }, 5000);
}

// Get icon for notification type
function getIconForNotificationType(type) {
  switch (type) {
    case 'success':
      return 'fa-check-circle';
    case 'error':
      return 'fa-exclamation-circle';
    case 'warning':
      return 'fa-exclamation-triangle';
    case 'info':
    default:
      return 'fa-info-circle';
  }
}

// Handle share button click
function handleShare() {
  // Generate a shareable link
  const shareableLink = `${window.location.origin}${window.location.pathname}?session=${window.sessionId}`;
  
  // Update the share link input
  safeUpdateUI('share-link', (element) => {
    element.value = shareableLink;
  });
  
  // Show the share modal
  safeUpdateUI('share-modal', (element) => {
    element.style.display = 'block';
  });
  
  showNotification('Share link generated', 'success');
}

// Handle copy link button click
function handleCopyLink() {
  // Get the share link input
  const shareLinkInput = document.getElementById('share-link');
  
  if (shareLinkInput) {
    // Select the text
    shareLinkInput.select();
    shareLinkInput.setSelectionRange(0, 99999); // For mobile devices
    
    // Copy the text
    try {
      document.execCommand('copy');
      showNotification('Link copied to clipboard', 'success');
    } catch (err) {
      // Fallback for modern browsers
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareLinkInput.value)
          .then(() => {
            showNotification('Link copied to clipboard', 'success');
          })
          .catch(err => {
            showNotification('Failed to copy link', 'error');
            console.error('Could not copy text: ', err);
          });
      } else {
        showNotification('Failed to copy link', 'error');
        console.error('Could not copy text: ', err);
      }
    }
  } else {
    showNotification('Share link not found', 'error');
  }
}

// Handle print button click
function handlePrint() {
  window.print();
}

// Handle clear all button click
function handleClearAll() {
  if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
    // Clear all data
    window.dishes = [];
    window.participants = [];
    window.availabilityData = {};
    window.selectedFinalDate = null;
    
    // Update UI
    updateDishList();
    updateParticipantList();
    updateAvailabilityTable();
    
    // Hide final date section
    safeUpdateUI('finalDateSection', (element) => {
      element.style.display = 'none';
    });
    
    // Save to Firebase and localStorage
    saveToFirebase();
    
    showNotification('All data cleared', 'success');
  }
}

// Get best date-time options
function getBestDateTimeOptions() {
  // Get all date-time combinations
  const dateTimeCombinations = [];
  
  // For each date in the availability data
  Object.keys(window.availabilityData).forEach(date => {
    // For each time slot
    Object.keys(window.availabilityData[date]).forEach(timeSlot => {
      // Get people available at this time
      const people = window.availabilityData[date][timeSlot];
      
      // Add to the list
      dateTimeCombinations.push({
        date,
        timeSlot,
        people,
        count: people.length
      });
    });
  });
  
  // Sort by number of people available (descending)
  dateTimeCombinations.sort((a, b) => b.count - a.count);
  
  return dateTimeCombinations;
}

// Update date attendees list
function updateDateAttendeesList(attendees) {
  safeUpdateUI('date-attendees-list', (element) => {
    // Clear the current list
    element.innerHTML = '';
    
    if (!attendees || attendees.length === 0) {
      element.innerHTML = '<li class="no-items">No attendees yet</li>';
      return;
    }
    
    // Add each attendee to the list
    attendees.forEach(attendee => {
      const li = document.createElement('li');
      li.innerHTML = `<i class="fas fa-user"></i> ${attendee}`;
      element.appendChild(li);
    });
  });
}

// Update date dishes list
function updateDateDishesList() {
  safeUpdateUI('date-dishes-list', (element) => {
    // Clear the current list
    element.innerHTML = '';
    
    if (!window.dishes || window.dishes.length === 0) {
      element.innerHTML = '<li class="no-items">No dishes planned yet</li>';
      return;
    }
    
    // Add each dish to the list
    window.dishes.forEach(dish => {
      const li = document.createElement('li');
      li.innerHTML = `
        <i class="fas fa-utensils"></i>
        <span>${dish.name} by ${dish.contributor}</span>
        <span class="dish-category">${dish.category}</span>
      `;
      element.appendChild(li);
    });
  });
}

// Update summary stats
function updateSummaryStats() {
  // Update total participants
  safeUpdateUI('total-participants', (element) => {
    element.textContent = window.participants ? window.participants.length : 0;
  });
  
  // Update total dishes
  safeUpdateUI('total-dishes', (element) => {
    element.textContent = window.dishes ? window.dishes.length : 0;
  });
  
  // Update total dates available
  safeUpdateUI('total-dates', (element) => {
    const totalDates = window.availabilityData ? Object.keys(window.availabilityData).length : 0;
    element.textContent = totalDates;
  });
}

// Navigate month in the calendar
function navigateMonth(direction) {
  // Update the current date
  currentDate = new Date(currentDate);
  currentDate.setMonth(currentDate.getMonth() + direction);
  
  // Update the calendar UI
  updateCalendar();
  
  // Show notification
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();
  showNotification(`Navigated to ${monthName} ${year}`, 'info');
}

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
  
  // Clear existing calendar days - handle multiple calendar-days elements
  const calendarDaysElements = [
    ...document.querySelectorAll('#calendar-days'),
    ...document.querySelectorAll('#calendar-days-mobile')
  ];
  console.log('Found', calendarDaysElements.length, 'calendar days elements');
  
  if (calendarDaysElements.length === 0) {
    console.warn('No calendar days elements found');
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
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarHTML += '<div class="calendar-day empty"></div>';
  }
  
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
    console.log(`Updated calendar days element ${index + 1} with ${lastDay.getDate()} days`);
    
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

async function migrateSpecificSession(oldSessionId) {
  console.log(`Attempting to migrate specific session: ${oldSessionId}`);
  
  if (!oldSessionId) {
    console.log('No session ID provided for migration');
    return false;
  }
  
  try {
    // Import Firebase functions
    const { ref, get, set } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js');
    
    // Check if data exists in the old path
    const oldPathRef = ref(database, `sessions/${oldSessionId}`);
    const oldSnapshot = await get(oldPathRef);
    
    if (oldSnapshot.exists()) {
      console.log(`Found data in old path: sessions/${oldSessionId}`);
      
      // Get the data
      const data = oldSnapshot.val();
      
      // Create a new session ID without underscores
      const newSessionId = oldSessionId.replace(/_/g, '-');
      
      // Create the new path
      const newPathRef = ref(database, `dish-party/${newSessionId}`);
      
      // Save to the new path
      await set(newPathRef, data);
      console.log(`Migrated data to new path: dish-party/${newSessionId}`);
      
      // Update the UI with the migrated data
      updateDishList();
      updateParticipantList();
      updateAvailabilityTable();
      
      // Show notification
      showNotification(`Successfully migrated data from ${oldSessionId} to ${newSessionId}`, 'success');
      
      return true;
    } else {
      console.log(`No data found in old path: sessions/${oldSessionId}`);
      return false;
    }
  } catch (error) {
    console.error(`Error migrating session: ${error.message}`);
    return false;
  }
}

// Call this function after the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // No migration button needed
});