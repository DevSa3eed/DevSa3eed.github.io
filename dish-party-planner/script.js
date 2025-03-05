// Iftar Scheduler - Main JavaScript

// Debug information
console.log("Script loaded: " + new Date().toISOString());
console.log("Script version: 1.0.2"); // Increment this when making changes

// Add cache-busting query parameter to force reload
if (window.location.search.indexOf('nocache') === -1 && window.location.search.indexOf('session') === -1) {
  const cacheBuster = new Date().getTime();
  const separator = window.location.search ? '&' : '?';
  window.location.href = window.location.href + separator + 'nocache=' + cacheBuster;
}

// Firebase access
let database;
let firebaseInitialized = false;

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
let dishes = [];
let participants = [];
let availabilityData = {};
let currentDate = new Date();
let selectedDates = [];
let selectedTimeSlots = [];
let selectedFinalDate = null;
let isSharedSession = false;
let sessionId = '';
let isOnline = navigator.onLine;
let isSyncing = false;
let collaborationStatusElement = document.getElementById('collaboration-status');
let statusIndicator = document.querySelector('.status-indicator');
let statusText = document.querySelector('.status-text');

// Initialize
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Generate a unique session ID
function generateSessionId() {
  // Use only lowercase letters and numbers, start with 'p' for maximum compatibility
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const timestamp = Date.now().toString(36).slice(-4); // Last 4 chars of base36 timestamp
  let randomPart = '';
  for (let i = 0; i < 3; i++) {
    randomPart += chars[Math.floor(Math.random() * chars.length)];
  }
  // Format: p{timestamp4}{random3} - guaranteed to be valid Firebase path
  return `p${timestamp}${randomPart}`;
}

// Migrate old session ID to new format
function migrateSessionId(oldSessionId) {
  // Check if the session ID matches our new format (starts with 'p' followed by only lowercase letters and numbers)
  if (!oldSessionId || !/^p[a-z0-9]+$/.test(oldSessionId)) {
    console.log("Migrating old session ID to new format");
    const newSessionId = generateSessionId();
    console.log("Generated new session ID:", newSessionId);
    localStorage.setItem('sessionId', newSessionId);
    return newSessionId;
  }
  return oldSessionId;
}

// Initialize the application
function initializeApp() {
  console.log("Initializing app");
  
  // Mark app as initialized to prevent duplicate initialization
  window.appInitialized = true;
  
  // Set up event listeners
  setupTabs();
  
  // Set up online/offline detection
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  
  // Initialize collaboration status elements
  collaborationStatusElement = document.getElementById('collaboration-status');
  statusIndicator = collaborationStatusElement.querySelector('.status-indicator');
  statusText = collaborationStatusElement.querySelector('.status-text');
  
  // Check initial online status
  updateOnlineStatus();
  
  // Initialize calendar
  initializeCalendar();
  
  // Check for shared data in URL
  const urlParams = new URLSearchParams(window.location.search);
  const sharedSessionId = urlParams.get('session');
  
  // Set a timeout to detect if Firebase initialization is taking too long
  const firebaseInitTimeout = setTimeout(() => {
    if (!database || !firebaseInitialized) {
      console.log("Firebase initialization timeout reached in initializeApp");
      // Try fallback initialization
      const initResult = tryFallbackFirebaseInit();
      
      if (!initResult) {
        console.error("Firebase initialization failed completely");
        // Force reset syncing state
        isSyncing = false;
        updateOnlineStatus();
        
        // Load from localStorage as fallback
        loadDataFromLocalStorage();
        renderParticipantsList();
        renderAvailabilityResults();
        renderDishes();
        updateSummary();
        showNotification("Could not connect to online database. Working in local mode.");
      }
    }
  }, 8000); // 8 seconds timeout
  
  if (sharedSessionId) {
    console.log("Found shared session ID in URL:", sharedSessionId);
    sessionId = migrateSessionId(sharedSessionId);
    localStorage.setItem('sessionId', sessionId);
    
    // Show loading indicator
    isSyncing = true;
    updateOnlineStatus();
    
    // Load data from Firebase if available, otherwise from localStorage
    if (database && firebaseInitialized) {
      loadDataFromFirebase(sessionId)
        .then(dataLoaded => {
          console.log("Firebase data load result:", dataLoaded);
          isSyncing = false;
          updateOnlineStatus();
          
          // Clear the timeout since we've successfully loaded data
          clearTimeout(firebaseInitTimeout);
          
          if (dataLoaded) {
            showNotification("Loaded shared Iftar plan successfully!");
          } else {
            // If no data found in Firebase, create a new session
            console.log("No data found for shared session, creating new session");
            sessionId = generateSessionId();
            localStorage.setItem('sessionId', sessionId);
            loadDataFromLocalStorage();
            renderParticipantsList();
            renderAvailabilityResults();
            renderDishes();
            updateSummary();
          }
        })
        .catch(error => {
          console.error("Error loading shared session:", error);
          isSyncing = false;
          updateOnlineStatus();
          
          // Fallback to localStorage if Firebase fails
          loadDataFromLocalStorage();
          renderParticipantsList();
          renderAvailabilityResults();
          renderDishes();
          updateSummary();
          showNotification("Could not load shared plan. Starting with local data.");
        });
    } else {
      console.log("Firebase not available, loading from localStorage");
      loadDataFromLocalStorage();
      renderParticipantsList();
      renderAvailabilityResults();
      renderDishes();
      updateSummary();
      isSyncing = false;
      updateOnlineStatus();
      
      // Clear the timeout since we're not using Firebase
      clearTimeout(firebaseInitTimeout);
    }
  } else {
    // No shared session, check for existing session in localStorage
    const savedSessionId = localStorage.getItem('sessionId');
    
    if (savedSessionId) {
      console.log("Found existing session ID in localStorage:", savedSessionId);
      sessionId = migrateSessionId(savedSessionId);
      
      // Show loading indicator
      isSyncing = true;
      updateOnlineStatus();
      
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
              loadDataFromLocalStorage();
              renderParticipantsList();
              renderAvailabilityResults();
              renderDishes();
              updateSummary();
            }
          })
          .catch(error => {
            console.error("Error loading existing session:", error);
            isSyncing = false;
            updateOnlineStatus();
            
            // Fallback to localStorage
            loadDataFromLocalStorage();
            renderParticipantsList();
            renderAvailabilityResults();
            renderDishes();
            updateSummary();
          });
      } else {
        console.log("Firebase not available, loading from localStorage");
        loadDataFromLocalStorage();
        renderParticipantsList();
        renderAvailabilityResults();
        renderDishes();
        updateSummary();
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
      loadDataFromLocalStorage();
      renderParticipantsList();
      renderAvailabilityResults();
      renderDishes();
      updateSummary();
      
      // Save initial data to Firebase
      if (database && firebaseInitialized) {
        saveToFirebase(true)
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
    
    // Check if the planner_data node exists (new structure)
    const plannerDataRef = ref(database, 'planner_data');
    const snapshot = await get(plannerDataRef);
    
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
  console.log('Loading data from Firebase for session:', sessionId);
  
  // Validate session ID format
  if (!sessionId || !/^p[a-z0-9]+$/.test(sessionId)) {
    console.error('Invalid session ID format:', sessionId);
    // Generate a new session ID and migrate
    const newSessionId = generateSessionId();
    console.log('Generated new session ID:', newSessionId);
    localStorage.setItem('sessionId', newSessionId);
    sessionId = newSessionId; // Use the new session ID for this load attempt
  }
  
  try {
    const { ref, get, onValue } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js');
    console.log('Firebase database module imported for data loading');
    
    // Test database connection
    const testRef = ref(database, '.info/connected');
    const testSnapshot = await get(testRef);
    console.log('Database connection test successful');
    
    // Use the same path structure as in saveToFirebase
    const path = 'planner_data/' + sessionId;
    console.log('Attempting to load data from path:', path);
    const sessionRef = ref(database, path);
    const snapshot = await get(sessionRef);
    
    if (snapshot.exists()) {
      const data = snapshot.val();
      console.log('Data loaded from Firebase:', data);
      
      // Update local data
      if (data.dishes) dishes = data.dishes;
      if (data.participants) participants = data.participants;
      if (data.availabilityData) availabilityData = data.availabilityData;
      if (data.selectedFinalDate) selectedFinalDate = data.selectedFinalDate;
      
      // Set up real-time listeners
      setupRealtimeListeners(sessionId);
      
      // Save to localStorage as backup
      saveToLocalStorage(sessionId);
      
      // Update UI
      renderParticipantsList();
      renderAvailabilityResults();
      
      return true;
    } else {
      console.log('No data found in Firebase for this session');
      return false;
    }
  } catch (error) {
    console.error('Error loading data from Firebase:', error);
    console.error('Session ID that caused error:', sessionId);
    console.error('Full error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    return false;
  }
}

// Load data from localStorage (for backward compatibility)
function loadDataFromLocalStorage() {
  console.log("Loading data from localStorage for session:", sessionId);
  
  // Load availability data
  const savedData = localStorage.getItem(`iftar-scheduler-data-${sessionId}`);
  if (savedData) {
    try {
      const parsedData = JSON.parse(savedData);
      console.log("Loaded data from localStorage:", parsedData);
      
      // Update the application data
      availabilityData = parsedData.availability || {};
      selectedDate = parsedData.selectedDate || null;
      selectedTimeSlot = parsedData.selectedTimeSlot || null;
      
      console.log("Updated application data from localStorage");
    } catch (error) {
      console.error("Error parsing data from localStorage:", error);
    }
  } else {
    console.log("No saved data found in localStorage for session:", sessionId);
  }
}

// Set up real-time listeners for Firebase updates
function setupRealtimeListeners(sessionId) {
  import('https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js').then(module => {
    const { ref, onValue } = module;
    
    // Use the same path structure as in loadDataFromFirebase and saveToFirebase
    const path = 'planner_data/' + sessionId;
    console.log('Setting up real-time listeners for path:', path);
    const sessionRef = ref(database, path);
    
    onValue(sessionRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        console.log('Real-time update received:', data);
        
        let hasChanges = false;
        
        if (data.dishes && JSON.stringify(dishes) !== JSON.stringify(data.dishes)) {
          dishes = data.dishes;
          hasChanges = true;
        }
        if (data.participants && JSON.stringify(participants) !== JSON.stringify(data.participants)) {
          participants = data.participants;
          hasChanges = true;
        }
        if (data.availabilityData && JSON.stringify(availabilityData) !== JSON.stringify(data.availabilityData)) {
          availabilityData = data.availabilityData;
          hasChanges = true;
        }
        if (data.selectedFinalDate !== selectedFinalDate) {
          selectedFinalDate = data.selectedFinalDate;
          hasChanges = true;
        }
        
        if (hasChanges) {
          console.log('Changes detected, updating UI');
          saveToLocalStorage(sessionId);
          renderParticipantsList();
          renderAvailabilityResults();
        }
      }
    });
  }).catch(error => {
    console.error('Error setting up real-time listeners:', error);
  });
}

// Sync local data with Firebase
function syncWithFirebase() {
  if (!navigator.onLine || !sessionId || !database) {
    updateOnlineStatus();
    return Promise.reject(new Error("Cannot sync: offline, no sessionId, or database not initialized"));
  }

  console.log("Starting sync with Firebase for session:", sessionId);
  updateSyncStatus("syncing");
  
  // Set a timeout for the sync operation
  const syncTimeout = setTimeout(() => {
    console.warn("Firebase sync operation timed out after 15 seconds");
    updateSyncStatus("error");
    return Promise.reject(new Error("Sync operation timed out"));
  }, 15000);

  return new Promise((resolve, reject) => {
    try {
      // Import needed Firebase functions
      import('https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js').then(module => {
        console.log("Firebase database module imported for sync");
        const { ref, get, set } = module;
        
        let sessionRef;
        try {
          if (typeof database.ref === 'function') {
            // Compatibility mode
            sessionRef = database.ref(`sessions/${sessionId}`);
          } else {
            // Modular API
            sessionRef = ref(database, `sessions/${sessionId}`);
          }
          
          // First, check if the session exists
          const checkSession = () => {
            try {
              if (typeof sessionRef.once === 'function') {
                // Compatibility mode
                return sessionRef.once('value');
              } else {
                // Modular API
                return get(sessionRef);
              }
            } catch (error) {
              console.error("Error checking session existence:", error);
              throw error;
            }
          };

          checkSession()
            .then((snapshot) => {
              const sessionData = snapshot.val();
              
              if (!sessionData) {
                console.log("Session does not exist, creating new session:", sessionId);
                // Create the session with initial data
                return saveToFirebase(true);
              } else {
                console.log("Session exists, loading data:", sessionId);
                // Session exists, load the data
                const data = sessionData || {};
                
                // Update local storage with the data from Firebase
                localStorage.setItem(`iftar-scheduler-data-${sessionId}`, JSON.stringify(data));
                
                // Update the application data
                if (data.dishes) dishes = data.dishes;
                if (data.participants) participants = data.participants;
                if (data.availabilityData) availabilityData = data.availabilityData;
                if (data.selectedFinalDate) selectedFinalDate = data.selectedFinalDate;
                
                return Promise.resolve();
              }
            })
            .then(() => {
              clearTimeout(syncTimeout);
              updateSyncStatus("synced");
              console.log("Sync with Firebase completed successfully");
              resolve();
            })
            .catch((error) => {
              console.error("Error during sync with Firebase:", error);
              clearTimeout(syncTimeout);
              updateSyncStatus("error");
              reject(error);
            });
        } catch (error) {
          console.error("Error creating session reference:", error);
          clearTimeout(syncTimeout);
          updateSyncStatus("error");
          reject(error);
        }
      }).catch(error => {
        console.error("Error importing Firebase modules:", error);
        clearTimeout(syncTimeout);
        updateSyncStatus("error");
        reject(error);
      });
    } catch (error) {
      console.error("Unexpected error in syncWithFirebase:", error);
      clearTimeout(syncTimeout);
      updateSyncStatus("error");
      reject(error);
    }
  });
}

// Save data to localStorage and Firebase
function saveData() {
  console.log("Saving data to localStorage and Firebase");
  
  // Save to localStorage
  localStorage.setItem('dishes', JSON.stringify(dishes));
  localStorage.setItem('participants', JSON.stringify(participants));
  localStorage.setItem('availabilityData', JSON.stringify(availabilityData));
  localStorage.setItem('selectedFinalDate', selectedFinalDate);
  
  // Sync with Firebase if online
  if (isOnline && sessionId) {
    console.log("Syncing with Firebase after saving data");
    syncWithFirebase()
      .then(() => {
        console.log("Successfully synced data with Firebase");
      })
      .catch(error => {
        console.error("Error syncing data with Firebase:", error);
      });
  } else {
    console.log("Not syncing with Firebase: online =", isOnline, "sessionId =", sessionId);
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

// Handle submit availability form
function handleSubmitAvailability() {
  const participantName = participantNameInput.value.trim();
  if (!participantName) {
    showNotification("Please enter your name");
    return;
  }
  
  if (selectedDates.length === 0) {
    showNotification("Please select at least one date");
    return;
  }
  
  const selectedTimeSlots = [];
  timeSlotCheckboxes.forEach(checkbox => {
    if (checkbox.checked) {
      selectedTimeSlots.push(checkbox.value);
    }
  });
  
  if (selectedTimeSlots.length === 0) {
    showNotification("Please select at least one time slot");
    return;
  }
  
  const notes = scheduleNotesInput.value.trim();
  
  // Update availability data
  selectedDates.forEach(date => {
    if (!availabilityData[date]) {
      availabilityData[date] = {};
    }
    
    selectedTimeSlots.forEach(timeSlot => {
      if (!availabilityData[date][timeSlot]) {
        availabilityData[date][timeSlot] = [];
      }
      
      // Check if participant already exists
      const existingIndex = availabilityData[date][timeSlot].findIndex(
        p => p.name === participantName
      );
      
      if (existingIndex >= 0) {
        // Update existing participant
        availabilityData[date][timeSlot][existingIndex] = {
          name: participantName,
          notes: notes,
          timestamp: new Date().toISOString()
        };
      } else {
        // Add new participant
        availabilityData[date][timeSlot].push({
          name: participantName,
          notes: notes,
          timestamp: new Date().toISOString()
        });
      }
    });
  });
  
  // Save to localStorage
  saveData();
  
  // Sync with Firebase if online
  if (navigator.onLine && database) {
    saveToFirebase()
      .then(() => {
        console.log("Availability data saved to Firebase");
      })
      .catch(error => {
        console.error("Error saving availability data to Firebase:", error);
      });
  }
  
  // Update UI
  renderHeatmapCalendar();
  renderBestTimes();
  
  // Reset form
  selectedDates = [];
  timeSlotCheckboxes.forEach(checkbox => {
    checkbox.checked = false;
  });
  scheduleNotesInput.value = '';
  
  // Show confirmation
  showNotification("Your availability has been submitted!");
}

// Show share reminder
function showShareReminder() {
    const reminder = document.createElement('div');
    reminder.className = 'share-reminder';
    reminder.innerHTML = `
        <div class="share-reminder-content">
            <p>Don't forget to share this plan with others!</p>
            <button class="btn-primary share-now-btn">
                <i class="fas fa-share-alt"></i> Share Now
            </button>
        </div>
    `;
    
    document.body.appendChild(reminder);
    
    // Add event listener
    reminder.querySelector('.share-now-btn').addEventListener('click', () => {
        reminder.remove();
        handleShare();
    });
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (document.body.contains(reminder)) {
            reminder.remove();
        }
    }, 10000);
}

// Update availability data based on participants
function updateAvailabilityData() {
  console.log("Updating availability data from participants");
  
  // Reset availability data
  availabilityData = {};
  
  // Process each participant's availability
  participants.forEach(participant => {
    // Process each date the participant is available
    Object.keys(participant.dates).forEach(dateString => {
      if (!availabilityData[dateString]) {
        availabilityData[dateString] = {
          sunset: [],
          dinner: [],
          late: []
        };
      }
      
      // Add participant to each time slot they selected
      participant.timeSlots.forEach(timeSlot => {
        if (!availabilityData[dateString][timeSlot].includes(participant.id)) {
          availabilityData[dateString][timeSlot].push(participant.id);
        }
      });
    });
  });
  
  console.log("Updated availability data:", {
    datesCount: Object.keys(availabilityData).length,
    sampleDate: Object.keys(availabilityData).length > 0 ? 
      Object.keys(availabilityData)[0] + ": " + 
      JSON.stringify(availabilityData[Object.keys(availabilityData)[0]]) : 
      "No dates available"
  });
}

// Render availability results
function renderAvailabilityResults() {
  console.log("Rendering availability results");
  
  // Check if there's any availability data
  if (Object.keys(availabilityData).length === 0) {
    availabilityCalendar.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-users"></i>
        <p>No availability submitted yet. Be the first to add yours!</p>
      </div>
    `;
    return;
  }
  
  // Render heatmap calendar
  renderHeatmapCalendar();
  
  // Render best times
  renderBestTimes();
}

// Render heatmap calendar
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

// Render best times
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

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
}

function formatDateForStorage(date) {
  return date.toISOString().split('T')[0];
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
    saveData(); // Use the comprehensive saveData function
    
    // Reset form
    dishForm.reset();
    dishNameInput.focus();
    
    renderDishes();
    updateSummary();
    
    showNotification('Dish added successfully!');
    
    // Update collaboration status
    updateOnlineStatus();
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
        saveData();
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
        saveData();
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

// Handle clearing all data
function handleClearAll() {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
        // Clear all data
        dishes = [];
        participants = [];
        availabilityData = {};
        selectedDates = [];
        selectedTimeSlots = [];
        selectedFinalDate = null;
        
        // Clear from Firebase if online
        if (isOnline) {
            // Import needed Firebase functions
            import('https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js').then(module => {
                const { ref, remove } = module;
                
                remove(ref(database, `sessions/${sessionId}`))
                    .then(() => {
                        showNotification('All data cleared successfully!');
                    })
                    .catch(error => {
                        console.error("Error clearing data from Firebase:", error);
                        showNotification('Error clearing data from Firebase. Some data may remain on the server.');
                    });
            }).catch(error => {
                console.error("Error importing Firebase modules:", error);
                showNotification('Error accessing Firebase. Data cleared locally only.');
            });
        }
        
        // Clear from localStorage
        saveData();
        localStorage.removeItem('selectedFinalDate');
        
        // Generate a new session ID
        sessionId = generateSessionId();
        localStorage.setItem('sessionId', sessionId);
        
        // Reset UI
        renderCalendar();
        renderDishes();
        renderParticipantsList();
        renderAvailabilityResults();
        renderBestTimes();
        updateSummary();
        
        // Reset form fields
        participantNameInput.value = '';
        scheduleNotesInput.value = '';
        dishForm.reset();
        
        // Uncheck all time slots
        timeSlotCheckboxes.forEach(checkbox => checkbox.checked = false);
        
        // Update final date display
        finalDateDisplay.textContent = 'Not yet selected';
        selectDateButton.textContent = 'Select This Date';
        
        showNotification('All data has been cleared');
    }
}

// Handle share functionality
function handleShare() {
    // Make sure data is synced with Firebase before sharing
    if (isOnline) {
        syncWithFirebase().then(() => {
            // Create shareable URL with session ID
            const shareUrl = `${window.location.origin}${window.location.pathname}?session=${sessionId}`;
            
            // Update share link input
            shareLinkInput.value = shareUrl;
            
            // Show modal
            shareModal.style.display = 'flex';
            
            // Select the link text
            shareLinkInput.select();
            
            // Update share options with dynamic links
            updateShareOptions(shareUrl);
            
            // Show notification
            showNotification('Your plan is now collaborative! Share the link with others.');
        }).catch(error => {
            console.error("Error syncing before share:", error);
            showNotification('Error preparing share link. Please try again.');
        });
    } else {
        // Offline fallback - use the old method with encoded data
        const dataToShare = {
            dishes: dishes,
            participants: participants,
            availabilityData: availabilityData,
            selectedFinalDate: selectedFinalDate,
            sessionId: sessionId
        };
        
        // Convert to base64 string
        const encodedData = btoa(JSON.stringify(dataToShare));
        
        // Create shareable URL
        const shareUrl = `${window.location.origin}${window.location.pathname}?share=${encodedData}`;
        
        // Update share link input
        shareLinkInput.value = shareUrl;
        
        // Show modal
        shareModal.style.display = 'flex';
        
        // Select the link text
        shareLinkInput.select();
        
        // Update share options with dynamic links
        updateShareOptions(shareUrl);
        
        // Show notification about offline mode
        showNotification('You are sharing in offline mode. Some features may be limited.');
    }
}

// Update share options with dynamic links
function updateShareOptions(shareUrl) {
    const whatsappBtn = document.querySelector('.share-option.whatsapp');
    const emailBtn = document.querySelector('.share-option.email');
    const messageBtn = document.querySelector('.share-option.message');
    
    // WhatsApp
    whatsappBtn.addEventListener('click', () => {
        const text = encodeURIComponent(`Join our Iftar planning! Click the link to see available dates and add yours: ${shareUrl}`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
    });
    
    // Email
    emailBtn.addEventListener('click', () => {
        const subject = encodeURIComponent('Iftar Planning');
        const body = encodeURIComponent(`Join our Iftar planning!\n\nClick the link below to see available dates and add yours:\n${shareUrl}`);
        window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    });
    
    // SMS/Messages
    messageBtn.addEventListener('click', () => {
        const body = encodeURIComponent(`Join our Iftar planning! Click to see available dates and add yours: ${shareUrl}`);
        window.open(`sms:?&body=${body}`, '_blank');
    });
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
                        <p><small>Available on ${Object.keys(p.dates).length} dates</small></p>
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
  // Create notification element if it doesn't exist
  let notification = document.getElementById('notification');
  if (!notification) {
    notification = document.createElement('div');
    notification.id = 'notification';
    notification.className = 'notification';
    document.body.appendChild(notification);
  }
  
  // Set the message and show the notification
  notification.textContent = message;
  notification.classList.add('show');
  
  // Hide the notification after 3 seconds
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

// Save dishes to localStorage and Firebase
function saveDishes() {
    // This function is now replaced by the more comprehensive saveData function
    saveData();
}

// Update share link with current session ID
function updateShareLink() {
    const shareUrl = `${window.location.origin}${window.location.pathname}?session=${sessionId}`;
    shareLinkInput.value = shareUrl;
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
                    if (data.sessionId) {
                        sessionId = data.sessionId;
                        isSharedSession = true;
                    }
                    
                    saveDishes();
                    localStorage.setItem('availabilityData', JSON.stringify(availabilityData));
                    localStorage.setItem('selectedFinalDate', selectedFinalDate);
                    localStorage.setItem('sessionId', sessionId);
                    
                    renderDishes();
                    renderCalendar();
                    renderAvailabilityResults();
                    updateSummary();
                    
                    showNotification('Shared data loaded successfully! You can now add your availability.');
                    
                    // Scroll to the date picker
                    setTimeout(() => {
                        document.querySelector('.date-picker-container').scrollIntoView({ behavior: 'smooth' });
                    }, 1000);
                }
            }
        } catch (error) {
            console.error('Error parsing shared data:', error);
            showNotification('Error loading shared data. Please try again.');
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

// Force reset the syncing state
function forceResetSync() {
  console.log("Forcing reset of sync state");
  
  // Clear any existing timeout
  if (window.syncStatusTimeout) {
    clearTimeout(window.syncStatusTimeout);
    window.syncStatusTimeout = null;
  }
  
  // Update the status indicator
  updateSyncStatus('synced');
  
  // Show notification
  showNotification("Connection reset. Attempting to reconnect...");
  
  // Try to reinitialize Firebase
  if (!database || !firebaseInitialized) {
    console.log("Attempting to reinitialize Firebase");
    tryFallbackFirebaseInit();
  }
  
  // Load data from localStorage as fallback
  loadDataFromLocalStorage();
  
  // Render the UI
  renderHeatmapCalendar();
  renderBestTimes();
  
  if (selectedDate && selectedTimeSlot) {
    document.getElementById('selected-date-display').textContent = 
      `Selected: ${formatDate(selectedDate)} at ${selectedTimeSlot}`;
  }
  
  // Try to sync with Firebase if online and session ID is available
  if (navigator.onLine && sessionId && database) {
    console.log("Attempting to sync with Firebase after reset");
    syncWithFirebase()
      .then(() => {
        console.log("Sync with Firebase completed successfully after reset");
        showNotification("Reconnected to online database!");
      })
      .catch(error => {
        console.error("Error syncing with Firebase after reset:", error);
        showNotification("Could not reconnect to online database. Working in local mode.");
      });
  }
}

function updateSyncStatus(status) {
  const statusIndicator = document.getElementById('sync-status');
  if (!statusIndicator) return;
  
  // Clear any existing timeout
  if (window.syncStatusTimeout) {
    clearTimeout(window.syncStatusTimeout);
    window.syncStatusTimeout = null;
  }
  
  // Update the status indicator
  switch (status) {
    case 'syncing':
      statusIndicator.textContent = 'Syncing...';
      statusIndicator.className = 'sync-status syncing';
      
      // Set a timeout to reset the status if it takes too long
      window.syncStatusTimeout = setTimeout(() => {
        console.warn("Sync operation taking too long, resetting status");
        updateSyncStatus('error');
        forceResetSync();
      }, 10000); // 10 seconds timeout
      break;
      
    case 'synced':
      statusIndicator.textContent = 'Online';
      statusIndicator.className = 'sync-status synced';
      break;
      
    case 'error':
      statusIndicator.textContent = 'Sync Error';
      statusIndicator.className = 'sync-status error';
      
      // Show a notification
      showNotification("Error syncing with Firebase. Using local data.");
      break;
      
    case 'offline':
      statusIndicator.textContent = 'Offline';
      statusIndicator.className = 'sync-status offline';
      break;
      
    default:
      statusIndicator.textContent = 'Unknown';
      statusIndicator.className = 'sync-status';
  }
}

function saveToLocalStorage(sessionId) {
  console.log("Saving data to localStorage for session:", sessionId);
  
  // Prepare the data to save
  const dataToSave = {
    availability: availabilityData,
    selectedDate: selectedDate,
    selectedTimeSlot: selectedTimeSlot,
    lastUpdated: new Date().toISOString()
  };
  
  // Save to local storage
  localStorage.setItem(`iftar-scheduler-data-${sessionId}`, JSON.stringify(dataToSave));
  console.log("Data saved to localStorage");
}

async function saveToFirebase(isInitialSave = false) {
  console.log('Saving data to Firebase for session:', sessionId);
  
  try {
    const { ref, set } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js');
    console.log('Firebase database module imported for saving');
    
    // Use the same path structure as in loadDataFromFirebase
    const path = 'planner_data/' + sessionId;
    console.log('Attempting to save data to path:', path);
    const sessionRef = ref(database, path);
    
    const data = {
      dishes,
      participants,
      availabilityData,
      selectedFinalDate,
      lastUpdated: new Date().toISOString()
    };
    
    await set(sessionRef, data);
    console.log('Data saved to Firebase successfully');
    showNotification('Changes saved to Firebase');
    return true;
  } catch (error) {
    console.error('Error saving to Firebase:', error);
    showNotification('Error saving to Firebase. Changes saved locally.');
    return false;
  }
}

function renderParticipantsList() {
  console.log("Rendering participants list");
  const participantsList = document.getElementById('participants');
  if (!participantsList) return;
  
  // Clear previous content
  participantsList.innerHTML = '';
  
  // Check if there are any participants
  if (participants.length === 0) {
    participantsList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-users"></i>
        <p>No participants yet. Be the first to join!</p>
      </div>
    `;
    return;
  }
  
  // Sort participants by name
  const sortedParticipants = [...participants].sort((a, b) => a.name.localeCompare(b.name));
  
  // Create list items
  sortedParticipants.forEach(participant => {
    const listItem = document.createElement('div');
    listItem.className = 'participant-item';
    
    // Create content
    listItem.innerHTML = `
      <div class="participant-info">
        <h3>${participant.name}</h3>
        <div class="participant-meta">
          <span>Available on ${Object.keys(participant.dates || {}).length} dates</span>
          ${participant.notes ? `<p class="notes">${participant.notes}</p>` : ''}
        </div>
      </div>
    `;
    
    participantsList.appendChild(listItem);
  });
  
  // Update total count
  if (totalParticipantsElement) {
    totalParticipantsElement.textContent = participants.length;
  }
}