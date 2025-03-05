/*
 * Iftar Scheduler - Main JavaScript
 */

// Debug information
console.log(`Script loaded at: ${new Date().toLocaleString()}`);
console.log('Script version: 2.3.7');

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

// Initialize global variables
initializeGlobalVariables();

// Add cache-busting query parameter to force reload
if (window.location.search.indexOf('nocache') === -1 && window.location.search.indexOf('session') === -1) {
  const cacheBuster = new Date().getTime();
  const separator = window.location.search ? '&' : '?';
  window.location.href = window.location.href + separator + 'nocache=' + cacheBuster;
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
  if (prevMonthButton) {
    prevMonthButton.addEventListener('click', () => navigateMonth(-1));
  }
  
  if (nextMonthButton) {
    nextMonthButton.addEventListener('click', () => navigateMonth(1));
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
  
  // Mark the app as initialized
  window.appInitialized = true;
  
  // Check for URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const sharedSessionId = urlParams.get('session');
  
  if (sharedSessionId) {
    // User is accessing a shared session
    console.log("Found shared session ID in URL:", sharedSessionId);
    
    // Migrate the session ID if needed
    (async () => {
      sessionId = await migrateSessionId(sharedSessionId);
      console.log("Using migrated session ID:", sessionId);
      
      // Store the session ID in localStorage and window object
      localStorage.setItem('sessionId', sessionId);
      window.sessionId = sessionId;
      
      // Try to load data from Firebase
      if (database) {
        console.log("Firebase available, loading shared session");
        isSyncing = true;
        updateOnlineStatus();
        
        loadDataFromFirebase(sessionId)
          .then(success => {
            console.log("Firebase data load result for shared session:", success);
            
            if (success) {
              // Data loaded successfully
              setupRealtimeListeners(sessionId);
              updateParticipantList();
              updateAvailabilityTable();
              updateDishList();
              
              // Show notification
              showNotification("Loaded shared plan successfully!");
            } else {
              // No data found for this session ID
              console.log("No data found for shared session, creating new session");
              isSyncing = false;
              updateOnlineStatus();
              
              // Try to load from localStorage as fallback
              loadFromLocalStorage(sessionId);
              updateParticipantList();
              updateAvailabilityTable();
              updateDishList();
            }
          })
          .catch(error => {
            console.error("Error loading shared session:", error);
            isSyncing = false;
            updateOnlineStatus();
            
            // Fallback to localStorage if Firebase fails
            loadFromLocalStorage(sessionId);
            updateParticipantList();
            updateAvailabilityTable();
            updateDishList();
            showNotification("Could not load shared plan. Starting with local data.");
          });
      } else {
        console.log("Firebase not available, loading from localStorage");
        loadFromLocalStorage(sessionId);
        updateParticipantList();
        updateAvailabilityTable();
        updateDishList();
        isSyncing = false;
        updateOnlineStatus();
        
        // Clear the timeout since we're not using Firebase
        clearTimeout(firebaseInitTimeout);
      }
    })();
  } else {
    // No shared session, check for existing session in localStorage
    const savedSessionId = localStorage.getItem('sessionId');
    
    if (savedSessionId) {
      console.log("Found existing session ID in localStorage:", savedSessionId);
      
      (async () => {
        sessionId = await migrateSessionId(savedSessionId);
        console.log("Using migrated session ID:", sessionId);
        
        // Store the session ID in localStorage and window object
        localStorage.setItem('sessionId', sessionId);
        window.sessionId = sessionId;
        
        // Try to load data from Firebase
        if (database) {
          console.log("Firebase available, loading existing session");
          isSyncing = true;
          updateOnlineStatus();
          
          loadDataFromFirebase(sessionId)
            .then(success => {
              console.log("Firebase data load result for existing session:", success);
              
              if (!success) {
                // If we couldn't load data with the current session ID, generate a new one
                // that's guaranteed to be Firebase-safe
                console.log("Generating new Firebase-safe session ID");
                const newSessionId = 'fb' + Math.random().toString(36).substring(2, 8);
                console.log("New Firebase-safe session ID:", newSessionId);
                
                // Store the new session ID in localStorage and window object
                sessionId = newSessionId;
                localStorage.setItem('sessionId', sessionId);
                window.sessionId = sessionId;
                
                // Try to load from localStorage with the old session ID
                loadFromLocalStorage(savedSessionId);
                
                // Set up Firebase with the new session ID
                setupRealtimeListeners(sessionId);
                
                // Save the data to Firebase with the new session ID
                saveToFirebase(sessionId);
              } else {
                // Data loaded successfully, set up listeners
                setupRealtimeListeners(sessionId);
              }
              
              // Render the UI
              updateParticipantList();
              updateAvailabilityTable();
              updateDishList();
            })
            .catch(error => {
              console.error("Error loading existing session:", error);
              isSyncing = false;
              updateOnlineStatus();
              
              // Generate a new Firebase-safe session ID
              console.log("Generating new Firebase-safe session ID after error");
              const newSessionId = 'fb' + Math.random().toString(36).substring(2, 8);
              console.log("New Firebase-safe session ID:", newSessionId);
              
              // Store the new session ID in localStorage and window object
              sessionId = newSessionId;
              localStorage.setItem('sessionId', sessionId);
              window.sessionId = sessionId;
              
              // Try to load from localStorage with the old session ID
              loadFromLocalStorage(savedSessionId);
              
              // Set up Firebase with the new session ID
              setupRealtimeListeners(sessionId);
              
              // Save the data to Firebase with the new session ID
              saveToFirebase(sessionId);
              
              // Render the UI
              updateParticipantList();
              updateAvailabilityTable();
              updateDishList();
            });
        } else {
          // No shared session, check for existing session in localStorage
          const savedSessionId = localStorage.getItem('sessionId');
          
          if (savedSessionId) {
            console.log("Found existing session ID in localStorage:", savedSessionId);
            sessionId = migrateSessionId(savedSessionId);
            console.log("Using migrated session ID:", sessionId);
            
            // Try to load from Firebase first if available
            if (database && firebaseInitialized) {
              loadDataFromFirebase(sessionId)
                .then(dataLoaded => {
                  console.log("Firebase data load result for existing session:", dataLoaded);
                  isSyncing = false;
                  updateOnlineStatus();
                  
                  // Clear the timeout since we've successfully loaded data
                  clearTimeout(firebaseInitTimeout);
                  
                  if (!dataLoaded) {
                    // If no data in Firebase, load from localStorage
                    loadFromLocalStorage(sessionId);
                    updateParticipantList();
                    updateAvailabilityTable();
                    updateDishList();
                  }
                })
                .catch(error => {
                  console.error("Error loading existing session:", error);
                  isSyncing = false;
                  updateOnlineStatus();
                  
                  // Fallback to localStorage
                  loadFromLocalStorage(sessionId);
                  updateParticipantList();
                  updateAvailabilityTable();
                  updateDishList();
                });
            } else {
              console.log("Firebase not available, loading from localStorage");
              loadFromLocalStorage(sessionId);
              updateParticipantList();
              updateAvailabilityTable();
              updateDishList();
              isSyncing = false;
              updateOnlineStatus();
              
              // Clear the timeout since we're not using Firebase
              clearTimeout(firebaseInitTimeout);
            }
          } else {
            // New user, generate session ID and load from localStorage
            console.log("No existing session, creating new session");
            sessionId = generateSessionId();
            localStorage.setItem('sessionId', sessionId);
            window.sessionId = sessionId;
            loadFromLocalStorage(sessionId);
            updateParticipantList();
            updateAvailabilityTable();
            updateDishList();
            
            // Save initial data to Firebase
            if (database && firebaseInitialized) {
              saveToFirebase(sessionId)
                .then(() => {
                  console.log("Initial data saved to Firebase successfully");
                })
                .catch(error => {
                  console.error("Error saving initial data to Firebase:", error);
                });
            }
            
            // Clear the timeout since we're not using Firebase for initial load
            clearTimeout(firebaseInitTimeout);
            
            // Reset syncing state
            isSyncing = false;
            updateOnlineStatus();
          }
        }
      })();
    } else {
      // New user, generate session ID and load from localStorage
      console.log("No existing session, creating new session");
      sessionId = generateSessionId();
      localStorage.setItem('sessionId', sessionId);
      window.sessionId = sessionId;
      loadFromLocalStorage(sessionId);
      updateParticipantList();
      updateAvailabilityTable();
      updateDishList();
      
      // Save initial data to Firebase
      if (database && firebaseInitialized) {
        saveToFirebase(sessionId)
          .then(() => {
            console.log("Initial data saved to Firebase successfully");
          })
          .catch(error => {
            console.error("Error saving initial data to Firebase:", error);
          });
      }
      
      // Clear the timeout since we're not using Firebase for initial load
      clearTimeout(firebaseInitTimeout);
      
      // Reset syncing state
      isSyncing = false;
      updateOnlineStatus();
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
  selectDateButton.addEventListener('click', handleSelectFinalDate);
  closeModalButton.addEventListener('click', () => shareModal.style.display = 'none');
  copyLinkButton.addEventListener('click', handleCopyLink);
  
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
      
      // Remove existing entries for this participant
      window.availabilityData[date][timeSlot] = window.availabilityData[date][timeSlot].filter(
        p => p.toLowerCase() !== participantName.toLowerCase()
      );
      
      // Add participant to this date and time slot
      window.availabilityData[date][timeSlot].push(participantName);
    });
  });
  
  // Save to Firebase and localStorage
  saveToFirebase();
  
  // Update UI
  updateParticipantList();
  updateAvailabilityTable();
  
  // Reset form
  participantNameInput.value = '';
  scheduleNotesInput.value = '';
  selectedDates = [];
  selectedTimeSlots = [];
  
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
  saveToFirebase();
  
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

// Function to directly migrate data from a specific old session ID to a new one
async function migrateSpecificSession(oldSessionId) {
  console.log(`Attempting to migrate specific session: ${oldSessionId}`);
  
  // Generate a new Firebase-safe session ID
  const newSessionId = generateSessionId();
  console.log(`Generated new Firebase-safe session ID: ${newSessionId}`);
  
  // Try to migrate the data
  const success = await migrateDataFromOldSession(oldSessionId, newSessionId);
  
  if (success) {
    console.log(`Successfully migrated data from ${oldSessionId} to ${newSessionId}`);
    
    // Update the current session ID in both local variable and window object
    sessionId = newSessionId;
    window.sessionId = newSessionId;
    localStorage.setItem('sessionId', newSessionId);
    
    // Store the mapping
    const migrationMap = JSON.parse(localStorage.getItem('sessionIdMigrationMap') || '{}');
    migrationMap[oldSessionId] = newSessionId;
    localStorage.setItem('sessionIdMigrationMap', JSON.stringify(migrationMap));
    
    // Set up listeners for the new session
    await setupRealtimeListeners(newSessionId);
    
    // Reload the UI
    updateDishList();
    updateParticipantList();
    updateAvailabilityTable();
    
    showNotification(`Successfully migrated data to new session ID: ${newSessionId}`);
    return true;
  } else {
    console.log(`Failed to migrate data from ${oldSessionId}`);
    showNotification(`Could not find data for session: ${oldSessionId}`);
    return false;
  }
}

// Add a migration button to the UI
function addMigrationButton() {
  // Check if the button already exists
  if (document.getElementById('migrate-button')) {
    return;
  }
  
  // Create the button
  const button = document.createElement('button');
  button.id = 'migrate-button';
  button.className = 'action-button';
  button.innerHTML = '<i class="fas fa-sync"></i> Migrate Data';
  button.style.backgroundColor = '#4a6da7';
  button.style.color = 'white';
  button.style.padding = '8px 16px';
  button.style.border = 'none';
  button.style.borderRadius = '4px';
  button.style.cursor = 'pointer';
  button.style.margin = '10px 0';
  button.style.display = 'block';
  
  // Add click event
  button.addEventListener('click', async () => {
    // Show a loading indicator
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Migrating...';
    button.disabled = true;
    
    try {
      // Try to migrate from the known session ID
      const success = await migrateSpecificSession('iftarx31pu1w8g9ol8');
      
      if (!success) {
        // If that fails, try other known session IDs
        const otherIds = ['m7w45qzy-bynp0r', 'iftar-uulxr0cqo525q0srnl62n'];
        
        for (const id of otherIds) {
          const result = await migrateSpecificSession(id);
          if (result) {
            break;
          }
        }
      }
    } catch (error) {
      console.error('Error during migration:', error);
      showNotification('Error during migration. Please try again.');
    } finally {
      // Reset the button
      button.innerHTML = '<i class="fas fa-sync"></i> Migrate Data';
      button.disabled = false;
    }
  });
  
  // Add the button to the UI
  const container = document.querySelector('.party-summary') || document.body;
  container.prepend(button);
}

// Call this function after the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(addMigrationButton, 1000); // Add a delay to ensure the UI is fully loaded
});

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
      const data = oldSnapshot.val();
      
      // Save to the new path
      const newPathRef = ref(database, `data/${currentSessionId}`);
      await set(newPathRef, data);
      console.log(`Successfully migrated data to new path: data/${currentSessionId}`);
      
      // Show notification
      showNotification('Data migrated to new path structure');
      
      return true;
    } else {
      console.log(`No data found in old path: sessions/${currentSessionId}`);
      return false;
    }
  } catch (error) {
    console.error(`Error auto-migrating data: ${error.message}`);
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
    console.log('No session ID provided, generating a new one');
    sessionId = generateSessionId();
    window.location.hash = sessionId;
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
    
    // Create a data object with all the current state
    const data = {
      dishes: window.dishes,
      participants: window.participants,
      availabilityData: window.availabilityData,
      selectedFinalDate: window.selectedFinalDate,
      lastUpdated: new Date().toISOString()
    };
    
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

// Debug Firebase paths
async function debugFirebasePaths(sessionId) {
  console.log(`Debugging Firebase paths for session: ${sessionId}`);
  
  try {
    const { ref, get } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js');
    
    // Check both path structures
    const paths = [
      `sessions/${sessionId}`,
      `data/${sessionId}`
    ];
    
    for (const path of paths) {
      try {
        console.log(`Checking path: ${path}`);
        const pathRef = ref(database, path);
        const snapshot = await get(pathRef);
        
        if (snapshot.exists()) {
          console.log(`Data found at path: ${path}`);
          console.log('Data:', snapshot.val());
        } else {
          console.log(`No data found at path: ${path}`);
        }
      } catch (error) {
        console.error(`Error accessing path ${path}: ${error.message}`);
      }
    }
    
    // Check root paths
    try {
      console.log('Checking root paths');
      const rootRef = ref(database, '/');
      const snapshot = await get(rootRef);
      
      if (snapshot.exists()) {
        console.log('Root data structure:');
        const data = snapshot.val();
        
        // Log the top-level keys
        console.log('Top-level keys:', Object.keys(data));
        
        // Check if 'sessions' exists
        if (data.sessions) {
          console.log('Sessions keys:', Object.keys(data.sessions));
        }
        
        // Check if 'data' exists
        if (data.data) {
          console.log('Data keys:', Object.keys(data.data));
        }
      } else {
        console.log('No data found at root');
      }
    } catch (error) {
      console.error(`Error accessing root: ${error.message}`);
    }
    
    return true;
  } catch (error) {
    console.error(`Error importing Firebase modules: ${error.message}`);
    return false;
  }
}

// Initialize global variables if they don't exist
function initializeGlobalVariables() {
  console.log('Initializing global variables');
  
  // Initialize selectedDate if it doesn't exist
  if (typeof window.selectedDate === 'undefined') {
    console.log('selectedDate is undefined, initializing it');
    window.selectedDate = null;
  }
  
  // Initialize other variables if needed
  if (typeof window.dishes === 'undefined') {
    console.log('dishes is undefined, initializing it');
    window.dishes = [];
  }
  
  if (typeof window.participants === 'undefined') {
    console.log('participants is undefined, initializing it');
    window.participants = [];
  }
  
  if (typeof window.availabilityData === 'undefined') {
    console.log('availabilityData is undefined, initializing it');
    window.availabilityData = {};
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
function updateDishList() {
  console.log('Updating dish list');
  safeUpdateUI('dishes-list', (element) => {
    // Clear the current list
    element.innerHTML = '';
    
    // Add each dish to the list
    window.dishes.forEach((dish, index) => {
      const dishItem = document.createElement('div');
      dishItem.className = 'dish-item';
      dishItem.innerHTML = `
        <h3>${dish.name}</h3>
        <p>Contributed by: ${dish.contributor}</p>
        <p>Category: ${dish.category}</p>
        <button class="remove-dish-btn" data-index="${index}">Remove</button>
      `;
      element.appendChild(dishItem);
    });
    
    // Update total dishes count if the element exists
    const totalDishesElement = document.getElementById('total-dishes');
    if (totalDishesElement) {
      totalDishesElement.textContent = window.dishes.length;
    }
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-dish-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const index = e.target.getAttribute('data-index');
        window.dishes.splice(index, 1);
        updateDishList();
        saveToFirebase(sessionId);
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
    
    // Update total participants count if the element exists
    const totalParticipantsElement = document.getElementById('total-participants');
    if (totalParticipantsElement) {
      totalParticipantsElement.textContent = window.participants.length;
    }
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-participant-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const index = e.target.getAttribute('data-index');
        window.participants.splice(index, 1);
        updateParticipantList();
        saveToFirebase(sessionId);
      });
    });
  });
}

// Update availability table safely
function updateAvailabilityTable() {
  console.log('Updating availability table');
  safeUpdateUI('availability-calendar', (element) => {
    // Implementation depends on your specific UI structure
    // This is a placeholder for the actual implementation
    console.log('Availability data:', window.availabilityData);
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

// Utility functions
function showNotification(message, type = 'info') {
  console.log(`Notification (${type}): ${message}`);
  
  // Create notification element if it doesn't exist
  let notification = document.getElementById('notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'notification';
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.padding = '10px 20px';
    notification.style.borderRadius = '4px';
    notification.style.color = 'white';
    notification.style.fontWeight = 'bold';
    notification.style.zIndex = '1000';
    notification.style.transition = 'opacity 0.5s ease-in-out';
    document.body.appendChild(notification);
  }
  
  // Set notification style based on type
  switch (type) {
    case 'success':
      notification.style.backgroundColor = '#4CAF50';
      break;
    case 'error':
      notification.style.backgroundColor = '#F44336';
      break;
    case 'warning':
      notification.style.backgroundColor = '#FF9800';
      break;
    default:
      notification.style.backgroundColor = '#2196F3';
  }
  
  // Set message and show notification
  notification.textContent = message;
  notification.style.opacity = '1';
  
  // Hide notification after 3 seconds
  setTimeout(() => {
    notification.style.opacity = '0';
  }, 3000);
}

// Handle share button click
function handleShare() {
  // Generate a shareable link
  const shareableLink = `${window.location.origin}${window.location.pathname}?session=${sessionId}`;
  
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

// Handle select final date button click
function handleSelectFinalDate() {
  // Get the selected date from the UI
  const selectedDateInput = document.getElementById('selected-date');
  const selectedTimeInput = document.getElementById('selected-time');
  
  if (!selectedDateInput || !selectedTimeInput) {
    showNotification('Date selection inputs not found', 'error');
    return;
  }
  
  const selectedDate = selectedDateInput.value;
  const selectedTime = selectedTimeInput.value;
  
  if (!selectedDate) {
    showNotification('Please select a date', 'error');
    return;
  }
  
  if (!selectedTime) {
    showNotification('Please select a time', 'error');
    return;
  }
  
  // Format the final date
  const finalDate = `${selectedDate} at ${selectedTime}`;
  
  // Update the final date
  window.selectedFinalDate = finalDate;
  
  // Update UI
  safeUpdateUI('finalDateDisplay', (element) => {
    element.textContent = finalDate;
  });
  
  safeUpdateUI('finalDateSection', (element) => {
    element.style.display = 'block';
  });
  
  // Save to Firebase and localStorage
  saveToFirebase(sessionId);
  
  showNotification('Final date selected', 'success');
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