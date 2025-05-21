
<script>
// Global variables
let currentUser = {
  gmail: '',
  token: ''
};
let mediaList = [];
let currentMediaId = null;
let activeFilters = {
  watched: null,
  downloaded: null,
  searchText: '',
  minRating: '',
  maxRating: '',
  addedAfter: '',
  addedBefore: ''
};

// Toast notification system
function showToast(message, type = 'info', duration = 3000) {
  // Create toast container if it doesn't exist
  let toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toastContainer';
    document.body.appendChild(toastContainer);
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  // Create toast content
  let icon = '';
  switch(type) {
    case 'success':
      icon = 'check_circle';
      break;
    case 'error':
      icon = 'error';
      break;
    case 'info':
    default:
      icon = 'info';
      break;
  }
  
  toast.innerHTML = `
    <div class="toast-content">
      <i class="material-icons toast-icon">${icon}</i>
      <div class="toast-message">${message}</div>
    </div>
    <div class="toast-progress"></div>
  `;
  
  // Add to container
  toastContainer.appendChild(toast);
  
  // Show the toast with animation
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Auto remove after duration
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, duration);
}

// Function to ensure header actions (Add New and Logout buttons) are always visible
function updateHeaderActionsVisibility() {
  const headerActions = document.querySelector('.header-actions');
  if (headerActions) {
    // Always make them visible, regardless of view
    headerActions.style.display = 'flex';
  }
}

// Function to check if an element exists in the DOM
function elementExists(id) {
  const element = document.getElementById(id);
  if (!element) {
    console.error(`Element with ID '${id}' does not exist in the DOM`);
    return false;
  }
  return true;
}

// DOM ready function - this runs when the page loads
function onLoad() {
  console.log("App starting...");
  
  // Add toast container to body
  const toastContainer = document.createElement('div');
  toastContainer.id = 'toastContainer';
  document.body.appendChild(toastContainer);
  
  // Check if essential UI elements exist
  const essentialElements = ['welcomeScreen', 'loginCard', 'appContainer', 'listView', 'detailView'];
  const missingElements = essentialElements.filter(id => !elementExists(id));
  
  if (missingElements.length > 0) {
    console.error("Missing essential UI elements:", missingElements);
    alert("App initialization error: Missing UI elements. Please contact support.");
    return;
  }
  
  // Initialize welcome screen
  setTimeout(() => {
    document.getElementById('welcomeScreen').style.display = 'none';
    console.log("Welcome screen hidden");
    
    // Check for stored credentials
    const storedGmail = localStorage.getItem('movieVault_gmail');
    const storedToken = localStorage.getItem('movieVault_token');
    
    if (storedGmail && storedToken) {
      // Try to auto-login with stored token
      console.log("Stored credentials found, attempting auto-login");
      currentUser.gmail = storedGmail;
      currentUser.token = storedToken;
      validateSession();
    } else {
      // Show login form
      console.log("No stored credentials, showing login screen");
      document.getElementById('loginCard').style.display = 'block';
    }
  }, 2000);
  
  // Initialize event listeners
  console.log("Setting up event listeners");
  setupEventListeners();
}

// Set up all event listeners
function setupEventListeners() {
  // Authentication related
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('createForm').addEventListener('submit', handleCreateAccount);
  document.getElementById('forgetForm').addEventListener('submit', handleForgotPassword);
  document.getElementById('create').addEventListener('click', showCreateAccount);
  document.getElementById('forget').addEventListener('click', showForgotPassword);
  document.getElementById('backToLogin').addEventListener('click', showLogin);
  document.getElementById('forgetBackToLogin').addEventListener('click', showLogin);
  document.getElementById('logoutBtn').addEventListener('click', handleLogout);
  
  // Media operations
  document.getElementById('addNewBtn').addEventListener('click', showAddNewForm);
  document.getElementById('mediaForm').addEventListener('submit', handleSaveMedia);
  document.getElementById('backToListBtn').addEventListener('click', showListView);
  document.getElementById('editEntryBtn').addEventListener('click', handleEditMedia);
  document.getElementById('deleteEntryBtn').addEventListener('click', handleDeleteMedia);
  document.getElementById('cancelFormBtn').addEventListener('click', closeModal);
  
  // Filter operations
  document.getElementById('filterToggleBtn').addEventListener('click', toggleFilters);
  document.getElementById('applyFiltersBtn').addEventListener('click', applyFilters);
  document.getElementById('resetFiltersBtn').addEventListener('click', resetFilters);
  
  // Search input should update searchText in activeFilters directly
  document.getElementById('searchInput').addEventListener('input', function() {
    // Update the search filter and redisplay media
    handleSearch();
  });
  
  // Modal closing
  document.querySelectorAll('.modal-close').forEach(closeBtn => {
    closeBtn.addEventListener('click', closeModal);
  });
  
  // Change all rating inputs to accept any step value instead of just 0.5
  const ratingInputs = document.querySelectorAll('input[type="number"][min="0"][max="10"]');
  ratingInputs.forEach(input => {
    input.setAttribute('step', 'any');
  });
}

// Validate stored session
function validateSession() {
  console.log("Validating session for:", currentUser.gmail);
  google.script.run
    .withSuccessHandler(handleSessionValidation)
    .withFailureHandler(handleApiError)
    .getAllMedia(currentUser.gmail, currentUser.token);
}

// Handle session validation response
function handleSessionValidation(response) {
  hideLoading();
  console.log("Session validation response:", response);

  if (response.status && response.status.new_token) {
    currentUser.token = response.status.new_token;
    localStorage.setItem('movieVault_token', currentUser.token);
  }

  if (response.status && 
      (response.status.code === 200 || 
       response.status.code === 302 || 
       (response.status.code >= 200 && response.status.code < 300))) {

    showApp();
    console.log("showApp function has been called from handleSessionValidation");

    if (response.data) {
      activeFilters = {
        watched: null,
        downloaded: null,
        searchText: '',
        minRating: '',
        maxRating: '',
        addedAfter: '',
        addedBefore: ''
      };
      displayMediaList(response.data);
    } else {
      console.log("No media data in response");
      document.getElementById('mediaGrid').innerHTML = '<div class="empty-state"><i class="material-icons" style="font-size: 48px; margin-bottom: 16px; opacity: 0.6">movie</i><div>No movies found. Add your first movie!</div></div>';
    }
  } else {
    localStorage.removeItem('movieVault_gmail');
    localStorage.removeItem('movieVault_token');
    showToast('Your session has expired. Please log in again.', 'error');
    showLogin();
  }
}

// Handle login form submission
function handleLogin(event) {
  event.preventDefault();
  
  const gmail = document.getElementById('gmail').value;
  const password = document.getElementById('password').value;
  
  if (!gmail || !password) {
    showToast('Please enter both email and password', 'error');
    return;
  }
  
  showToast('Logging in...', 'info');
  console.log("Attempting login for:", gmail);
  google.script.run
    .withSuccessHandler(handleLoginResponse)
    .withFailureHandler(handleApiError)
    .authenticateUser(gmail, password);
}

// Handle login API response
function handleLoginResponse(response) {
  hideLoading();
  console.log("Login response received:", response);

  // ✅ Always update token if provided
  if (response.status && response.status.new_token) {
    currentUser.token = response.status.new_token;
    localStorage.setItem('movieVault_token', currentUser.token);
  }

  if (response.status &&
      (response.status.code === 200 || 
       response.status.code === 302 || 
       (response.status.code >= 200 && response.status.code < 300))) {

    currentUser.gmail = document.getElementById('gmail').value;
    localStorage.setItem('movieVault_gmail', currentUser.gmail);

    showToast('Login successful!', 'success');
    console.log("Login successful, showing app interface");

    document.getElementById('loginWrapper').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';

    showApp();
    console.log("showApp function has been called");

    activeFilters = {
      watched: null,
      downloaded: null,
      searchText: '',
      minRating: '',
      maxRating: '',
      addedAfter: '',
      addedBefore: ''
    };

    fetchMediaList();
  } else {
    showToast(response.status ? response.status.message : 'Login failed', 'error');
  }
}

// Function to fetch media list
function fetchMediaList() {
  console.log("Fetching media list for:", currentUser.gmail);
  google.script.run
    .withSuccessHandler(function(response) {
      hideLoading();
      console.log("Media list fetched:", response);

      // ✅ Always update token
      if (response.status && response.status.new_token) {
        currentUser.token = response.status.new_token;
        localStorage.setItem('movieVault_token', currentUser.token);
      }

      if (response.data) {
        activeFilters = {
          watched: null,
          downloaded: null,
          searchText: '',
          minRating: '',
          maxRating: '',
          addedAfter: '',
          addedBefore: ''
        };
        displayMediaList(response.data);
      } else {
        console.log("No media data returned");
        document.getElementById('mediaGrid').innerHTML = '<div class="empty-state"><i class="material-icons" style="font-size: 48px; margin-bottom: 16px; opacity: 0.6">movie</i><div>No movies found. Add your first movie!</div></div>';
      }
    })
    .withFailureHandler(handleApiError)
    .getAllMedia(currentUser.gmail, currentUser.token);
}

// Handle create account form submission
function handleCreateAccount(event) {
  event.preventDefault();

  const gmail = document.getElementById('createGmail').value.trim();
  const password = document.getElementById('createPassword').value.trim();

  if (!gmail || !password) {
    showToast('Please enter both email and password', 'error');
    return;
  }

  showToast('Creating account...', 'info');

  // Call server-side Apps Script to handle API request
  google.script.run
    .withSuccessHandler(function (response) {

      if (response.status) {
        if (response.status.code === 201) {
          // ✅ Account created successfully
          const token = response.status.new_token;

          if (!token) {
            showToast('Account created but no token received. Please log in manually.', 'error');
            return;
          }

          currentUser.gmail = gmail;
          currentUser.token = token;
          localStorage.setItem('movieVault_gmail', gmail);
          localStorage.setItem('movieVault_token', token);

          showToast('Account created & logged in successfully!', 'success');
          switchToAppMode();
          showApp();
          fetchMediaList();
        } else if (response.status.code === 409) {
          // ⚠️ User already exists
          showToast('User already exists. Please log in instead.', 'error');
          showLogin(); // Optionally switch to login view
        } else {
          // ❌ Other server-side errors
          showToast(response.status.message || 'Account creation failed', 'error');
        }
      } else {
        showToast('Invalid response from server', 'error');
      }

    })
    .withFailureHandler(function (error) {
      hideLoading();
      console.error("Create account error:", error);
      showToast('Server error occurred', 'error');
    })
    .createUser(gmail, password); // 👈 Calls your Code.gs function
}

// Handle create account API response
function handleCreateResponse(response) {
  hideLoading();
  
  if (response.status && response.status.code === 201) {
    showToast('Account created successfully! You can now log in.', 'success');
    document.getElementById('gmail').value = document.getElementById('createGmail').value;
    showLogin();
  } else {
    showToast(response.status ? response.status.message : 'Failed to create account', 'error');
  }
}

//Event listener for forget password to auto-correct the user input gmail
document.getElementById('forgetGmail').addEventListener('blur', function () {
  let val = this.value.trim().toLowerCase();

  val = val
    .replace(/@gamil\.com$/, '@gmail.com')
    .replace(/@gmai\.com$/, '@gmail.com')
    .replace(/@gmial\.com$/, '@gmail.com')
    .replace(/@gmaill\.com$/, '@gmail.com');

  if (!val.endsWith('@gmail.com')) {
    val = val.replace(/@.*/, '') + '@gmail.com';
  }

  this.value = val;
});

// Handle forgot password form submission
function handleForgotPassword(event) {
  event.preventDefault();

  let gmailInput = document.getElementById('forgetGmail');
  let gmail = gmailInput.value.trim().toLowerCase();

  // Auto-correct common typos
  gmail = gmail
    .replace(/@gamil\.com$/, '@gmail.com')
    .replace(/@gmai\.com$/, '@gmail.com')
    .replace(/@gmial\.com$/, '@gmail.com')
    .replace(/@gmaill\.com$/, '@gmail.com');

  if (!gmail.endsWith('@gmail.com')) {
    gmail = gmail.replace(/@.*/, '') + '@gmail.com';
  }

  // Show corrected email in the input box
  gmailInput.value = gmail;

  if (!gmail) {
    showToast('Please enter your email', 'error');
    return;
  }

  showToast('Processing your request...', 'info');

  google.script.run
    .withSuccessHandler(handleForgetResponse)
    .withFailureHandler(handleApiError)
    .forgotPassword(gmail);
}



// Handle forgot password API response
function handleForgetResponse(response) {
  hideLoading();

  if (response.status && response.status.code === 200) {
    const gmail = document.getElementById('forgetGmail').value.trim().toLowerCase();

    showToast(
      `📧 Password recovery email has been sent to <b>${gmail}</b>.<br><br>
      <span style="font-size: 0.85rem; color: #ccc;">If you don’t see it in your inbox, check your <b>Spam</b> or <b>Promotions</b> folder.</span>`,
      'success',5000
    );

    showLogin(); // Return to login view
  } else {
    showToast(response.status ? response.status.message : 'Failed to process request', 'error');
  }
}




// Handle logout button click
function handleLogout() {
  showToast('Logging out...', 'info');
  google.script.run
    .withSuccessHandler(handleLogoutResponse)
    .withFailureHandler(handleApiError)
    .logout(currentUser.gmail, currentUser.token);
}

// Handle logout API response
function handleLogoutResponse(response) {
  hideLoading();
  
  // Clear stored credentials regardless of response
  localStorage.removeItem('movieVault_gmail');
  localStorage.removeItem('movieVault_token');
  currentUser = { gmail: '', token: '' };
  showToast('Logged out successfully', 'success');
  switchToLoginMode() ;
  resetLogoStylesToCSS();
  // Show login screen
  document.getElementById('appContainer').style.display = 'none';
   document.getElementById('loginWrapper').style.display = 'flex'; 
  showLogin();
}

// Show the create account form
function showCreateAccount(event) {
  event.preventDefault();
  document.getElementById('loginCard').style.display = 'none';
  document.getElementById('createCard').style.display = 'block';
}

// Show the forgot password form
function showForgotPassword(event) {
  event.preventDefault();
  document.getElementById('loginCard').style.display = 'none';
  document.getElementById('forgetCard').style.display = 'block';
}

// Show the login form
function showLogin() {
  document.getElementById('createCard').style.display = 'none';
  document.getElementById('forgetCard').style.display = 'none';
  document.getElementById('loginCard').style.display = 'block';
  
  // Show the forget password link if previously hidden
  document.getElementById('forget').style.display = 'block';
}

// Show the main app
function showApp() {
  console.log("Showing main app - Function entered");
  
  // Debugging HTML structure
  console.log("DOM structure check:", {
    appContainer: document.getElementById('appContainer'),
    listView: document.getElementById('listView'),
    detailView: document.getElementById('detailView')
  });
  
  // Hide all authentication cards
  if (elementExists('loginCard')) document.getElementById('loginCard').style.display = 'none';
  if (elementExists('createCard')) document.getElementById('createCard').style.display = 'none';
  if (elementExists('forgetCard')) document.getElementById('forgetCard').style.display = 'none';
  
  // Show the app container with explicit display setting
  const appContainer = document.getElementById('appContainer');
  if (appContainer) {
    appContainer.style.display = 'block';
    document.querySelector('header').style.display = 'flex';

  applyLogoStyles();
  switchToAppMode();


    console.log("App container display set to: block");
    
    // Force repaint to ensure visibility
    void appContainer.offsetHeight;
  } else {
    console.error("CRITICAL ERROR: App container not found!");
    alert("Error: Main application container not found!");
    return;
  }
  
  // Make sure we're showing the list view
  const listView = document.getElementById('listView');
  const detailView = document.getElementById('detailView');
  
  if (listView && detailView) {
    listView.classList.remove('hidden');
    detailView.classList.add('hidden');
    console.log("List view should be visible, detail view hidden");
    
    
    // Force repaint
    void listView.offsetHeight;
  } else {
    console.error("List view or detail view elements not found!");
    if (!listView) console.error("List view element missing");
    if (!detailView) console.error("Detail view element missing");
  }
  
  // Ensure buttons are always visible
  updateHeaderActionsVisibility();
  
  console.log("Main app interface should now be visible");
}

// Helper function to check if filters are empty
function isEmptyFilters() {
  // Check if activeFilters object is empty or has no meaningful filters
  if (!activeFilters) return true;
  
  // Check if any meaningful filter is set
  const hasMinRating = activeFilters.minRating && activeFilters.minRating.trim() !== '';
  const hasMaxRating = activeFilters.maxRating && activeFilters.maxRating.trim() !== '';
  const hasWatched = activeFilters.watched !== null && activeFilters.watched !== undefined;
  const hasDownloaded = activeFilters.downloaded !== null && activeFilters.downloaded !== undefined;
  const hasAddedAfter = activeFilters.addedAfter && activeFilters.addedAfter.trim() !== '';
  const hasAddedBefore = activeFilters.addedBefore && activeFilters.addedBefore.trim() !== '';
  
  // Check search text separately - Use the search text from activeFilters instead
  const searchText = activeFilters.searchText || '';
  const hasSearchText = searchText !== '';
  
  return !hasMinRating && !hasMaxRating && !hasWatched && !hasDownloaded && 
         !hasAddedAfter && !hasAddedBefore && !hasSearchText;
}

// Display media list in the grid
function displayMediaList(data) {
  console.log("Displaying media list:", data);
  console.log("Current active filters:", activeFilters);
  
  // Always ensure the header actions are visible
  updateHeaderActionsVisibility();

  // Update the global mediaList variable - critical for navigation
  mediaList = data;
  
  const mediaGrid = document.getElementById('mediaGrid');
  if (!mediaGrid) {
    console.error("Cannot find mediaGrid element to display media list");
    return;
  }
  
  mediaGrid.innerHTML = '';
  
  // Check if we have an empty data array
  if (!data || data.length === 0) {
    mediaGrid.innerHTML = '<div class="empty-state"><i class="material-icons" style="font-size: 48px; margin-bottom: 16px; opacity: 0.6">movie</i><div>No movies found. Add your first movie!</div></div>';
    return;
  }
  
  // Apply current filters to the data
  const filteredData = applyFiltersToData(data);
  
  if (filteredData.length === 0) {
    mediaGrid.innerHTML = '<div class="empty-state"><i class="material-icons" style="font-size: 48px; margin-bottom: 16px; opacity: 0.6">movie</i><div>No media found matching your criteria</div></div>';
    return;
  }
  
  filteredData.forEach(media => {
    // Create card element
    const card = document.createElement('div');
    card.className = 'media-card';
    card.dataset.id = media.id;
    
    // Add poster image
    const poster = media.Poster && media.Poster !== 'N/A' && media.Poster !== 'Error' 
      ? media.Poster 
      : 'https://via.placeholder.com/300x450?text=No+Image';
    
    // Use the new modern status pill design
    const watchedStatus = media.Watched ? 
      '<div class="status-pill status-watched"><i class="material-icons">visibility</i>Watched</div>' : 
      '<div class="status-pill status-not-watched"><i class="material-icons">visibility_off</i>Not Watched</div>';
    
    const downloadedStatus = media.Downloaded ? 
      '<div class="status-pill status-downloaded"><i class="material-icons">download_done</i>Downloaded</div>' : 
      '<div class="status-pill status-not-downloaded"><i class="material-icons">download</i>Not Downloaded</div>';
    
    card.innerHTML = `
      <div class="media-poster" style="background-image: url('${poster}');">
        <div class="media-status">
          ${watchedStatus}
          ${downloadedStatus}
        </div>
      </div>
      <div class="media-info">
        <h3 class="media-title">${media.Name}</h3>
        <div class="media-meta">
          <div class="media-rating">
            <i class="material-icons">star</i>
            ${media.Rating !== 'N/A' ? media.Rating : 'N/A'}
          </div>
        </div>
      </div>
    `;
    
    // Add click event to show details
    card.addEventListener('click', () => {
      showMediaDetails(media.id);
    });
    
    mediaGrid.appendChild(card);
  });
}

// Show media details
function showMediaDetails(id) {
  // Find the media in our already loaded data instead of requesting it again
  const media = mediaList.find(item => item.id.toString() === id.toString());
  
  if (media) {
    // If we have the data in memory, use it immediately
    displayMediaDetails({
      status: { code: 200 },
      data: [media]
    });
    
    // Add transitioning class to the clicked card
    const clickedCard = document.querySelector(`.media-card[data-id="${id}"]`);
    if (clickedCard) {
      clickedCard.classList.add('card-transitioning');
      setTimeout(() => {
        clickedCard.classList.remove('card-transitioning');
      }, 300); // Remove after transition completes
    }
  } else {
    // Only fetch from server as fallback if not in memory
    // Add transitioning class to the clicked card
    const clickedCard = document.querySelector(`.media-card[data-id="${id}"]`);
    if (clickedCard) {
      clickedCard.classList.add('card-transitioning');
      clickedCard.innerHTML += '<div class="card-loading-indicator"><div class="card-spinner"></div></div>';
    }
    
    google.script.run
      .withSuccessHandler(function(response) {
        // Remove transitioning class
        if (clickedCard) {
          clickedCard.classList.remove('card-transitioning');
          // Remove the card loading indicator
          const loadingIndicator = clickedCard.querySelector('.card-loading-indicator');
          if (loadingIndicator) loadingIndicator.remove();
        }
        displayMediaDetails(response);
      })
      .withFailureHandler(function(error) {
        // Remove transitioning class on error too
        if (clickedCard) {
          clickedCard.classList.remove('card-transitioning');
          // Remove the card loading indicator
          const loadingIndicator = clickedCard.querySelector('.card-loading-indicator');
          if (loadingIndicator) loadingIndicator.remove();
        }
        handleApiError(error);
      })
      .getMediaById(currentUser.gmail, currentUser.token, id);
  }
}

// Display media details in the detail view
function displayMediaDetails(response) {
  hideLoading();
  
  if (!response.data || response.data.length === 0) {
    showToast('Failed to load media details', 'error');
    return;
  }
  
  // Get the media data
  const media = response.data[0];
  currentMediaId = media.id;
  
  // Update token if new one was provided
  if (response.status && response.status.new_token) {
    currentUser.token = response.status.new_token;
    localStorage.setItem('movieVault_token', currentUser.token);
  }
  
  // Set title
  document.getElementById('detailTitle').textContent = media.Name;
  
  // Build detail content
  const detailContent = document.getElementById('detailContent');
  
  const poster = media.Poster && media.Poster !== 'N/A' && media.Poster !== 'Error' 
    ? media.Poster 
    : 'https://via.placeholder.com/300x450?text=No+Image';
  
  // Prepare status badges
  const watchedBadge = media.Watched ? 
    '<div class="status-pill status-watched"><i class="material-icons">visibility</i>Watched</div>' : 
    '<div class="status-pill status-not-watched"><i class="material-icons">visibility_off</i>Not Watched</div>';
  
  const downloadedBadge = media.Downloaded ? 
    '<div class="status-pill status-downloaded"><i class="material-icons">download_done</i>Downloaded</div>' : 
    '<div class="status-pill status-not-downloaded"><i class="material-icons">download</i>Not Downloaded</div>';
  
  detailContent.innerHTML = `
    <div class="detail-layout">
      <div class="${poster === 'https://via.placeholder.com/300x450?text=No+Image' ? 'detail-poster no-image' : 'detail-poster'}" 
           style="background-image: url('${poster}');">
        ${poster === 'https://via.placeholder.com/300x450?text=No+Image' ? '<i class="material-icons">movie</i>' : ''}
      </div>
      <div class="detail-info">
        <div class="status-badges">
          ${watchedBadge}
          ${downloadedBadge}
        </div>
        <div class="detail-meta">
          <div class="meta-item">
            <div class="meta-label">Rating</div>
            <div class="meta-value">
              <div class="star-rating">
                <i class="material-icons">star</i>
                ${media.Rating !== 'N/A' ? media.Rating : 'Not rated'}
              </div>
            </div>
          </div>
          
          ${media.Seasons && media.Seasons !== 'N/A' ? `
          <div class="meta-item">
            <div class="meta-label">Seasons</div>
            <div class="meta-value">${media.Seasons}</div>
          </div>
          ` : ''}
          
          <div class="meta-item">
            <div class="meta-label">Added on</div>
            <div class="meta-value">${media['Added on'] || 'Unknown'}</div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Set up transition animation for views
  document.getElementById('listView').classList.add('list-view-exiting');
  document.getElementById('detailView').classList.add('detail-view-prepare');
  document.getElementById('detailView').classList.remove('hidden');
  
  setTimeout(() => {
    document.getElementById('listView').classList.add('hidden');
    document.getElementById('listView').classList.remove('list-view-exiting');
    document.getElementById('detailView').classList.add('detail-view-entering');
    document.getElementById('detailView').classList.remove('detail-view-prepare');
    
    // Always ensure the header buttons are visible
    updateHeaderActionsVisibility();
  }, 10);
}

// Show the list view
function showListView() {
  // Set up transition animation
  document.getElementById('detailView').classList.add('detail-view-exiting');
  document.getElementById('listView').classList.add('list-view-prepare');
  document.getElementById('listView').classList.remove('hidden');
  
  setTimeout(() => {
    document.getElementById('detailView').classList.add('hidden');
    document.getElementById('detailView').classList.remove('detail-view-exiting');
    document.getElementById('listView').classList.add('list-view-entering');
    document.getElementById('listView').classList.remove('list-view-prepare');
    
    // Remove any transition classes after animation completes
    setTimeout(() => {
      document.getElementById('listView').classList.remove('list-view-entering');
    }, 300);
    
    // Always ensure the header actions buttons are visible
    updateHeaderActionsVisibility();
    
    // Ensure media list is displayed when returning to list view
    if (mediaList && mediaList.length > 0) {
      displayMediaList(mediaList);
    } else {
      // If no media in memory, refresh from server
      refreshMediaList();
    }
  }, 10);
  
  currentMediaId = null;
}

// Open the form modal for adding new media
function showAddNewForm() {
  // Reset form
  document.getElementById('mediaForm').reset();
  document.getElementById('modalTitle').textContent = 'Add New Entry';
  document.getElementById('mediaId').value = '';
  
  // Show modal
  document.getElementById('formModal').style.display = 'block';
}

// Handle media form submission (create/update)
function handleSaveMedia(event) {
  event.preventDefault();
  
  const mediaId = document.getElementById('mediaId').value;
  const name = document.getElementById('mediaName').value;
  
  if (!name) {
    showToast('Name is required', 'error');
    return;
  }
  
  const mediaData = {
    Name: name,
    Downloaded: document.getElementById('mediaDownloaded').checked,
    Watched: document.getElementById('mediaWatched').checked,
    Rating: document.getElementById('mediaRating').value || '',
    Poster: document.getElementById('mediaPoster').value || '',
    Seasons: document.getElementById('mediaSeasons').value || ''
  };
  
  // If mediaType exists in the form, include it
  const mediaTypeElement = document.getElementById('mediaType');
  if (mediaTypeElement) {
    mediaData.Type = mediaTypeElement.value;
  }
  
  if (mediaId) {
    // Update existing media
    mediaData.id = mediaId;
    showToast('Updating media...', 'info');
    google.script.run
      .withSuccessHandler(handleMediaUpdateResponse)
      .withFailureHandler(handleApiError)
      .updateMedia(currentUser.gmail, currentUser.token, mediaData);
  } else {
    // Create new media
    showToast('Creating new media...', 'info');
    google.script.run
      .withSuccessHandler(handleMediaCreateResponse)
      .withFailureHandler(handleApiError)
      .createMedia(currentUser.gmail, currentUser.token, mediaData);
  }
}

// Handle media creation response
function handleMediaCreateResponse(response) {
  hideLoading();
  closeModal();
  
  // Update token if new one was provided
  if (response.status && response.status.new_token) {
    currentUser.token = response.status.new_token;
    localStorage.setItem('movieVault_token', currentUser.token);
  }
  
  if (response.status && response.status.code >= 200 && response.status.code < 300) {
    showToast('Media created successfully', 'success');
    refreshMediaList();  // 🔥 This ensures you always get the correct and full list
    
    if (response.data) {
      // Use the data directly from the API response
      mediaList = response.data; // Update the global media list
      activeFilters = {
        watched: null,
        downloaded: null,
        searchText: '',
        minRating: '',
        maxRating: '',
        addedAfter: '',
        addedBefore: ''
      }; // Reset filters
      displayMediaList(response.data);
    } else {
      // Fall back to refreshing from server if no data in response
      refreshMediaList();
    }
  } else {
    showToast('Failed to create media: ' + (response.status ? response.status.message : 'Unknown error'), 'error');
  }
}

// Handle media update response
function handleMediaUpdateResponse(response) {
  hideLoading();
  closeModal();
  
  // Update token if new one was provided
  if (response.status && response.status.new_token) {
    currentUser.token = response.status.new_token;
    localStorage.setItem('movieVault_token', currentUser.token);
  }
  
  if (response.status && response.status.code >= 200 && response.status.code < 300) {
    showToast('Media updated successfully', 'success');
    
    if (response.data) {
      // Check if response.data is an array
      if (Array.isArray(response.data)) {
        // Update the global media list variable with the new data
        mediaList = response.data;
        
        // Reset filters
        activeFilters = {
          watched: null,
          downloaded: null,
          searchText: '',
          minRating: '',
          maxRating: '',
          addedAfter: '',
          addedBefore: ''
        };
        
        // If in detail view, update the details with the updated media
        if (currentMediaId) {
          const updatedMedia = response.data.find(item => item.id.toString() === currentMediaId.toString());
          if (updatedMedia) {
            // Create a response-like object for displayMediaDetails
            displayMediaDetails({
              status: response.status,
              data: [updatedMedia]
            });
          }
        }
        
        // Make sure the mediaList is being displayed in list view
        if (!document.getElementById('listView').classList.contains('hidden')) {
          displayMediaList(response.data);
        }
      } else if (typeof response.data === 'object' && response.data !== null) {
        // If response.data is just a single media object (not an array)
        // This happens when the API returns just the updated media item
        
        // If we have the current media id and it matches the updated one
        if (currentMediaId && response.data.id && response.data.id.toString() === currentMediaId.toString()) {
          // Update the media details view with the updated media
          displayMediaDetails({
            status: response.status,
            data: [response.data]  // Wrap in array as displayMediaDetails expects an array
          });
          
          // Also update this item in the global mediaList array
          if (Array.isArray(mediaList)) {
            // Find and replace the updated media in our list
            const index = mediaList.findIndex(item => item.id.toString() === currentMediaId.toString());
            if (index !== -1) {
              mediaList[index] = response.data;
              
              // If in list view, refresh the display
              if (!document.getElementById('listView').classList.contains('hidden')) {
                displayMediaList(mediaList);
              }
            }
          }
        } else {
          // If we're not currently viewing the updated media or the data structure is unexpected,
          // refresh the entire media list to be safe
          refreshMediaList();
        }
      } else {
        // If response.data is neither an array nor an object, fallback to refreshing the list
        refreshMediaList();
      }
    } else {
      // Fall back to refreshing from server if no data in response
      refreshMediaList();
    }
  } else {
    showToast('Failed to update media: ' + (response.status ? response.status.message : 'Unknown error'), 'error');
  }
}

// Open the form modal for editing media
function handleEditMedia() {
  if (!currentMediaId) return;
  
  // Find the media in our list
  const media = mediaList.find(item => item.id.toString() === currentMediaId.toString());
  if (!media) return;
  
  // Populate form fields
  document.getElementById('mediaName').value = media.Name || '';
  document.getElementById('mediaRating').value = media.Rating !== 'N/A' ? media.Rating : '';
  document.getElementById('mediaDownloaded').checked = media.Downloaded || false;
  document.getElementById('mediaWatched').checked = media.Watched || false;
  document.getElementById('mediaPoster').value = media.Poster !== 'N/A' ? media.Poster : '';
  document.getElementById('mediaSeasons').value = media.Seasons !== 'N/A' ? media.Seasons : '';
  document.getElementById('mediaId').value = media.id;
  
  // If mediaType exists in the form, set its value
  const mediaTypeElement = document.getElementById('mediaType');
  if (mediaTypeElement && media.Type) {
    mediaTypeElement.value = media.Type;
  }
  
  // Set modal title
  document.getElementById('modalTitle').textContent = 'Edit ' + media.Name;
  
  // Show modal
  document.getElementById('formModal').style.display = 'block';
}

// Handle delete media button click
function handleDeleteMedia() {
  if (!currentMediaId) return;
  
  if (confirm('Are you sure you want to delete this media?')) {
    showToast('Deleting media...', 'info');
    google.script.run
      .withSuccessHandler(handleDeleteResponse)
      .withFailureHandler(handleApiError)
      .deleteMedia(currentUser.gmail, currentUser.token, currentMediaId);
  }
}

// Handle media deletion response
function handleDeleteResponse(response) {
  hideLoading();

  // Update token if provided
  if (response.status && response.status.new_token) {
    currentUser.token = response.status.new_token;
    localStorage.setItem('movieVault_token', currentUser.token);
  }

  if (response.status && response.status.code >= 200 && response.status.code < 300) {
    showToast('Media deleted successfully', 'success');
    currentMediaId = null;

    // ✅ Re-fetch media list and store new token if backend provides one
    google.script.run
      .withSuccessHandler(function(response) {
        // 🔁 Update token again if provided in this response
        if (response.status && response.status.new_token) {
          currentUser.token = response.status.new_token;
          localStorage.setItem('movieVault_token', currentUser.token);
        }

        if (response.data) {
          mediaList = response.data;
          displayMediaList(mediaList);  // filters applied internally
        } else {
          mediaList = [];
          displayMediaList([]);
        }

        showListView();
      })
      .withFailureHandler(handleApiError)
      .getAllMedia(currentUser.gmail, currentUser.token);
  } else {
    showToast('Failed to delete media: ' + (response.status ? response.status.message : 'Unknown error'), 'error');
  }
}

// Refresh the media list
function refreshMediaList() {
  google.script.run
    .withSuccessHandler(response => {
      
      // Update token if new one was provided
      if (response.status && response.status.new_token) {
        currentUser.token = response.status.new_token;
        localStorage.setItem('movieVault_token', currentUser.token);
      }
      
      if (response.data) {
        // Update the global mediaList variable
        mediaList = response.data;
        
        // Reset filters
        activeFilters = {
          watched: null,
          downloaded: null,
          searchText: '',
          minRating: '',
          maxRating: '',
          addedAfter: '',
          addedBefore: ''
        };
        
        // Display the media
        displayMediaList(response.data);
      } else {
        // Clear the media grid if no data
        document.getElementById('mediaGrid').innerHTML = 
          '<div class="empty-state"><i class="material-icons" style="font-size: 48px; margin-bottom: 16px; opacity: 0.6">movie</i><div>No movies found. Add your first movie!</div></div>';
      }
    })
    .withFailureHandler(handleApiError)
    .getAllMedia(currentUser.gmail, currentUser.token);
}

// Toggle the advanced filters visibility
function toggleFilters() {
  const filtersEl = document.getElementById('advancedFilters');
  filtersEl.classList.toggle('hidden');
  
  // Update button state
  const filterBtn = document.getElementById('filterToggleBtn');
  if (filtersEl.classList.contains('hidden')) {
    filterBtn.classList.remove('active');
  } else {
    filterBtn.classList.add('active');
    showToast('Filters shown', 'info');
  }
}

// Apply filters to the media list
function applyFilters() {
  // Collect filter values
  activeFilters = {
    minRating: document.getElementById('minRating').value || '',
    maxRating: document.getElementById('maxRating').value || '',
    watched: getWatchedFilter(),
    downloaded: getDownloadedFilter(),
    addedAfter: document.getElementById('addedAfter')?.value || '',
    addedBefore: document.getElementById('addedBefore')?.value || '',
    searchText: activeFilters.searchText || ''
  };
  
  // Display active filters
  displayActiveFilters();
  
  // Apply filters and display results
  displayMediaList(mediaList);
  
  // Hide the filter panel
  document.getElementById('advancedFilters').classList.add('hidden');
  document.getElementById('filterToggleBtn').classList.remove('active');
  
  showToast('Filters applied', 'success');
}

// Get the selected watched filter value
function getWatchedFilter() {
  if (document.getElementById('filterWatchedAll').checked) return null;
  if (document.getElementById('filterWatched').checked) return true;
  if (document.getElementById('filterNotWatched').checked) return false;
  return null;
}

// Get the selected downloaded filter value
function getDownloadedFilter() {
  const filterDownloadedAll = document.getElementById('filterDownloadedAll');
  const filterDownloaded = document.getElementById('filterDownloaded');
  const filterNotDownloaded = document.getElementById('filterNotDownloaded');
  
  if (filterDownloadedAll && filterDownloadedAll.checked) return null;
  if (filterDownloaded && filterDownloaded.checked) return true;
  if (filterNotDownloaded && filterNotDownloaded.checked) return false;
  return null;
}

// Display active filters as tags
function displayActiveFilters() {
  const activeFiltersEl = document.getElementById('activeFilters');
  activeFiltersEl.innerHTML = '';
  
  let hasActiveFilters = false;
  
  // Rating filter
  if (activeFilters.minRating || activeFilters.maxRating) {
    hasActiveFilters = true;
    const ratingText = activeFilters.minRating && activeFilters.maxRating 
      ? `Rating: ${activeFilters.minRating} - ${activeFilters.maxRating}`
      : activeFilters.minRating 
        ? `Rating: >= ${activeFilters.minRating}`
        : `Rating: <= ${activeFilters.maxRating}`;
    
    addFilterTag(ratingText, 'rating', () => {
      document.getElementById('minRating').value = '';
      document.getElementById('maxRating').value = '';
      applyFilters();
    });
  }
  
  // Watched filter
  if (activeFilters.watched !== null) {
    hasActiveFilters = true;
    addFilterTag(
      activeFilters.watched ? 'Watched' : 'Not Watched', 
      activeFilters.watched ? 'watched' : 'not-watched', 
      () => {
        document.getElementById('filterWatchedAll').checked = true;
        applyFilters();
      }
    );
  }
  
  // Downloaded filter
  if (activeFilters.downloaded !== null) {
    hasActiveFilters = true;
    addFilterTag(
      activeFilters.downloaded ? 'Downloaded' : 'Not Downloaded', 
      activeFilters.downloaded ? 'downloaded' : 'not-downloaded', 
      () => {
        if (document.getElementById('filterDownloadedAll')) {
          document.getElementById('filterDownloadedAll').checked = true;
          applyFilters();
        }
      }
    );
  }
  
  // Date filters
  if (activeFilters.addedAfter || activeFilters.addedBefore) {
    hasActiveFilters = true;
    let dateText = 'Added: ';
    if (activeFilters.addedAfter) dateText += `after ${activeFilters.addedAfter}`;
    if (activeFilters.addedAfter && activeFilters.addedBefore) dateText += ' and ';
    if (activeFilters.addedBefore) dateText += `before ${activeFilters.addedBefore}`;
    
    addFilterTag(dateText, 'date', () => {
      if (document.getElementById('addedAfter')) document.getElementById('addedAfter').value = '';
      if (document.getElementById('addedBefore')) document.getElementById('addedBefore').value = '';
      applyFilters();
    });
  }
  
  // Search text - Use activeFilters.searchText
  if (activeFilters.searchText && activeFilters.searchText.trim() !== '') {
    hasActiveFilters = true;
    addFilterTag(`Search: ${activeFilters.searchText}`, 'search', () => {
      document.getElementById('searchInput').value = '';
      activeFilters.searchText = '';
      handleSearch();
    });
  }
}

// Add a filter tag to the active filters section
function addFilterTag(text, type, clearFn) {
  const tagsContainer = document.getElementById('activeFilters');
  
  const tagEl = document.createElement('div');
  tagEl.className = `active-filter-tag ${type}`;
  tagEl.innerHTML = `
    ${text}
    <div class="remove-filter">
      <i class="material-icons">close</i>
    </div>
  `;
  
  tagEl.querySelector('.remove-filter').addEventListener('click', clearFn);
  tagsContainer.appendChild(tagEl);
}

// Reset all filters
function resetFilters() {
  // Clear form inputs
  document.getElementById('minRating').value = '';
  document.getElementById('maxRating').value = '';
  document.getElementById('filterWatchedAll').checked = true;
  
  if (document.getElementById('filterDownloadedAll')) {
    document.getElementById('filterDownloadedAll').checked = true;
  }
  
  if (document.getElementById('addedAfter')) {
    document.getElementById('addedAfter').value = '';
  }
  
  if (document.getElementById('addedBefore')) {
    document.getElementById('addedBefore').value = '';
  }
  
  document.getElementById('searchInput').value = '';
  
  // Clear active filters - properly initialize all filter values
  activeFilters = {
    minRating: '',
    maxRating: '',
    watched: null,
    downloaded: null,
    addedAfter: '',
    addedBefore: '',
    searchText: ''
  };
  
  document.getElementById('activeFilters').innerHTML = '';
  
  // Update display
  displayMediaList(mediaList);
  
  showToast('Filters reset', 'info');
}

// Handle search input changes
function handleSearch() {
  // Update activeFilters with search text
  activeFilters.searchText = document.getElementById('searchInput').value.trim();
  
  // Display active filters to show the search term as a filter
  displayActiveFilters();
  
  // We just need to redisplay the media with current filters
  displayMediaList(mediaList);
}

// Apply all filters to the data
function applyFiltersToData(data) {
  if (!data) return [];
  
  // If no filters are active, return all data
  if (isEmptyFilters()) {
    return data;
  }
  
  return data.filter(media => {
    // Check search text directly from activeFilters
    if (activeFilters.searchText && activeFilters.searchText !== '' && 
        !media.Name.toLowerCase().includes(activeFilters.searchText.toLowerCase())) {
      return false;
    }
    
    // Check rating range
    if (activeFilters.minRating && activeFilters.minRating !== '' && 
        parseFloat(media.Rating) < parseFloat(activeFilters.minRating)) {
      return false;
    }
    
    if (activeFilters.maxRating && activeFilters.maxRating !== '' && 
        parseFloat(media.Rating) > parseFloat(activeFilters.maxRating)) {
      return false;
    }
    
    // Check watched status
    if (activeFilters.watched !== null && media.Watched !== activeFilters.watched) {
      return false;
    }
    
    // Check downloaded status
    if (activeFilters.downloaded !== null && media.Downloaded !== activeFilters.downloaded) {
      return false;
    }
    
    // Check dates - this is more complex and would need parsing of the date format in your data
    // Implement if date filtering is critical
    
    return true;
  });
}

// Close the modal
function closeModal() {
  document.getElementById('formModal').style.display = 'none';
}

// Show loading spinner
function showLoading() {
  // Create loading overlay if it doesn't exist
  let loadingEl = document.getElementById('loadingOverlay');
  if (!loadingEl) {
    loadingEl = document.createElement('div');
    loadingEl.id = 'loadingOverlay';
    loadingEl.className = 'loading-overlay';
    loadingEl.innerHTML = '<div class="loading-spinner"><div class="spinner"></div></div>';
    document.body.appendChild(loadingEl);
  } else {
    loadingEl.style.display = 'flex';
  }
}

// Hide loading spinner
function hideLoading() {
  const loadingEl = document.getElementById('loadingOverlay');
  if (loadingEl) {
    loadingEl.style.display = 'none';
  }
}

// Handle API errors
function handleApiError(error) {
  hideLoading();
  console.error('API Error:', error);
  showToast(error.message || 'An error occurred', 'error');
}

// Initialize on load
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM fully loaded - Initializing app");
  const warning = document.getElementById('warning-banner-bar');
  if (warning) warning.style.display = 'none';
  onLoad();
});

window.onload = function() {
  console.log("Window loaded - Making sure initialization happens");
  // Double check if onLoad needs to be called
  if (!document.getElementById('toastContainer')) {
    console.log("Running onLoad() again from window.onload because initialization seems incomplete");
    onLoad();
  }
};

function switchToAppMode() {
  document.getElementById('loginWrapper').style.display = 'none';
  document.getElementById('appContainer').style.display = 'block';

  // reset body for app layout
  document.body.style.display = 'block';
  document.body.style.height = 'auto';
  document.body.style.overflowY = 'auto';
}

function switchToLoginMode() {
  document.getElementById('loginWrapper').style.display = 'flex';
  document.getElementById('appContainer').style.display = 'none';

  // reset body layout for login centering
  document.body.style.display = 'flex';
  document.body.style.justifyContent = 'center';
  document.body.style.alignItems = 'center';
  document.body.style.height = '100vh';
  document.body.style.overflow = 'hidden';

  // show login card, hide others
  document.getElementById('loginCard').style.display = 'block';
  document.getElementById('createCard').style.display = 'none';
  document.getElementById('forgetCard').style.display = 'none'; 
}

// Apply styles dynamically
function applyLogoStyles() {
  const logo = document.querySelector('#appContainer .logo');
  const logoImg = document.querySelector('#appContainer .logo-img');
  const logoH1 = document.querySelector('#appContainer .logo h1');

  if (logo) {
    logo.style.display = 'flex';
    logo.style.alignItems = 'center';
    logo.style.color = '#5199FF';
    logo.style.margin = '0'; // Remove auto centering
  }
  if (logoImg) {
    logoImg.style.height = '40px';
    logoImg.style.marginRight = '10px';
    logoImg.style.display = 'inline-block';
    logoImg.style.verticalAlign = 'middle';
  }
  if (logoH1) {
    // You did not specify changes for h1 in modified styles, so keep default or reset if needed
  }
}

// Reset back to CSS styles
function resetLogoStylesToCSS() {
  const logo = document.querySelector('#appContainer .logo');
  const logoImg = document.querySelector('#appContainer .logo-img');
  const logoH1 = document.querySelector('#appContainer .logo h1');

  if (logo) logo.removeAttribute('style');
  if (logoImg) logoImg.removeAttribute('style');
  if (logoH1) logoH1.removeAttribute('style');
}


</script>
