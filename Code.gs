const API_URL = "https://script.google.com/macros/s/AKfycbzuxi1LJf6CUjSNBqbt5f0EzSnlEIj2R3dOnwrD4V50fAhra5vU-RkmhcXLMssBIt9I/exec";

function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Movie Vault')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

//Google login/create/forget password
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function googleLogin(gmail, token) {
  try {
    // Normalize Gmail
    if (!gmail.includes('@')) {
      gmail += '@gmail.com';
    }

    const apiUrl = `${API_URL}?gmail=${encodeURIComponent(gmail)}&token=${encodeURIComponent(token)}&action=google`;

    const response = UrlFetchApp.fetch(apiUrl);
    return JSON.parse(response.getContentText());
  } catch (error) {
    return {
      status: {
        code: 500,
        message: 'Error during Google login: ' + error.toString()
      }
    };
  }
}


// Authentication functions
function authenticateUser(gmail, password) {
  try {
    // Make sure gmail has @gmail.com
    if (!gmail.includes('@')) {
      gmail = gmail + '@gmail.com';
    }
    
    const response = UrlFetchApp.fetch(`${API_URL}?gmail=${encodeURIComponent(gmail)}&password=${encodeURIComponent(password)}`);
    const result = JSON.parse(response.getContentText());
    
    // Log the entire response for debugging
    Logger.log("Auth response: " + JSON.stringify(result));
    
    return result;
  } catch (error) {
    Logger.log("Auth error: " + error.toString());
    return { 
      status: { 
        code: 500, 
        message: "Error connecting to the server: " + error.toString()
      }
    };
  }
}

function createUser(gmail, password) {
  try {
    // Make sure gmail has @gmail.com
    if (!gmail.includes('@')) {
      gmail = gmail + '@gmail.com';
    }
    
    const response = UrlFetchApp.fetch(`${API_URL}?gmail=${encodeURIComponent(gmail)}&password=${encodeURIComponent(password)}&create=1`);
    return JSON.parse(response.getContentText());
  } catch (error) {
    return { 
      status: { 
        code: 500, 
        message: "Error creating user: " + error.toString() 
      }
    };
  }
}

function forgotPassword(gmail) {
  try {
    if (!gmail) {
      return {
        status: {
          code: 400,
          message: "Gmail is required"
        }
      };
    }

    // 🔐 Normalize Gmail: strip extra @gmail.com if user entered it
    gmail = gmail.toLowerCase().replace(/@gmail\.com$/, '') + '@gmail.com';

    const apiUrl = `${API_URL}?gmail=${encodeURIComponent(gmail)}&action=forget`;

    const response = UrlFetchApp.fetch(apiUrl);
    const json = JSON.parse(response.getContentText());

    // Optional: log for debug
    // Logger.log("Forget password response: " + JSON.stringify(json));

    return json;
  } catch (error) {
    return {
      status: {
        code: 500,
        message: "Error processing forgot password request: " + error.toString()
      }
    };
  }
}



// Media operations
function getAllMedia(gmail, token) {
  try {
    // Make sure gmail has @gmail.com
    if (!gmail.includes('@')) {
      gmail = gmail + '@gmail.com';
    }
    
    const response = UrlFetchApp.fetch(`${API_URL}?gmail=${encodeURIComponent(gmail)}&token=${encodeURIComponent(token)}&action=fetch`);
    const result = JSON.parse(response.getContentText());
    
    // Log the entire response for debugging
    Logger.log("GetAllMedia response: " + JSON.stringify(result));
    
    return result;
  } catch (error) {
    Logger.log("GetAllMedia error: " + error.toString());
    return { 
      status: { 
        code: 500, 
        message: "Error fetching media: " + error.toString() 
      }
    };
  }
}

function getMediaById(gmail, token, id) {
  try {
    // Make sure gmail has @gmail.com
    if (!gmail.includes('@')) {
      gmail = gmail + '@gmail.com';
    }
    
    const response = UrlFetchApp.fetch(`${API_URL}?gmail=${encodeURIComponent(gmail)}&token=${encodeURIComponent(token)}&action=fetch&id=${id}`);
    return JSON.parse(response.getContentText());
  } catch (error) {
    return { 
      status: { 
        code: 500, 
        message: "Error fetching media details: " + error.toString() 
      }
    };
  }
}

function createMedia(gmail, token, mediaData) {
  try {
    // Make sure gmail has @gmail.com
    if (!gmail.includes('@')) {
      gmail = gmail + '@gmail.com';
    }
    
    let url = `${API_URL}?gmail=${encodeURIComponent(gmail)}&token=${encodeURIComponent(token)}&action=create`;
    
    // Add each property to the URL
    Object.keys(mediaData).forEach(key => {
      url += `&${encodeURIComponent(key)}=${encodeURIComponent(mediaData[key])}`;
    });
    
    const response = UrlFetchApp.fetch(url);
    return JSON.parse(response.getContentText());
  } catch (error) {
    return { 
      status: { 
        code: 500, 
        message: "Error creating media: " + error.toString() 
      }
    };
  }
}

function updateMedia(gmail, token, mediaData) {
  try {
    // Make sure gmail has @gmail.com
    if (!gmail.includes('@')) {
      gmail = gmail + '@gmail.com';
    }
    
    let url = `${API_URL}?gmail=${encodeURIComponent(gmail)}&token=${encodeURIComponent(token)}&action=update`;
    
    // Add each property to the URL
    Object.keys(mediaData).forEach(key => {
      url += `&${encodeURIComponent(key)}=${encodeURIComponent(mediaData[key])}`;
    });
    
    const response = UrlFetchApp.fetch(url);
    return JSON.parse(response.getContentText());
  } catch (error) {
    return { 
      status: { 
        code: 500, 
        message: "Error updating media: " + error.toString() 
      }
    };
  }
}

function deleteMedia(gmail, token, id) {
  try {
    // Make sure gmail has @gmail.com
    if (!gmail.includes('@')) {
      gmail = gmail + '@gmail.com';
    }
    
    const response = UrlFetchApp.fetch(`${API_URL}?gmail=${encodeURIComponent(gmail)}&token=${encodeURIComponent(token)}&action=delete&id=${id}`);
    return JSON.parse(response.getContentText());
  } catch (error) {
    return { 
      status: { 
        code: 500, 
        message: "Error deleting media: " + error.toString() 
      }
    };
  }
}

function changePassword(gmail, token, newPassword) {
  try {
    // Make sure gmail has @gmail.com
    if (!gmail.includes('@')) {
      gmail = gmail + '@gmail.com';
    }
    
    const response = UrlFetchApp.fetch(`${API_URL}?gmail=${encodeURIComponent(gmail)}&token=${encodeURIComponent(token)}&action=password&newpassword=${encodeURIComponent(newPassword)}`);
    return JSON.parse(response.getContentText());
  } catch (error) {
    return { 
      status: { 
        code: 500, 
        message: "Error changing password: " + error.toString() 
      }
    };
  }
}

function logout(gmail, token) {
  try {
    // Make sure gmail has @gmail.com
    if (!gmail.includes('@')) {
      gmail = gmail + '@gmail.com';
    }
    
    const response = UrlFetchApp.fetch(`${API_URL}?gmail=${encodeURIComponent(gmail)}&token=${encodeURIComponent(token)}&action=logout`);
    return JSON.parse(response.getContentText());
  } catch (error) {
    return { 
      status: { 
        code: 500, 
        message: "Error during logout: " + error.toString() 
      }
    };
  }
}
