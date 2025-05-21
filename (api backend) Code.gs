var globalNewToken;

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    var gmail = e.parameter.gmail;
    var password = e.parameter.password;
    var token = e.parameter.token;
    var create = e.parameter.create;
    var action = e.parameter.action;

    if (!gmail) return jsonResponse(400, "Missing gmail parameter");
    
    var normalizedGmail = gmail.toLowerCase().replace(/@gmail\.com$/, "");
    var ss = SpreadsheetApp.openById("1yDAuDF-r_XvK4S5rIId8G_vLmcoHbHU1htqzTlyD7C8");
    var targetSheet = ss.getSheets().find(sheet => sheet.getName().toLowerCase() === normalizedGmail);

    if (action === "forget") {
      if (!targetSheet) return jsonResponse(404, "User not found");
      return forgetpassword(targetSheet, gmail);
    }
    

    //login or create account through google 
    if (action === 'google') {
      if (!token) return jsonResponse(400, 'Missing Google ID token');

      try {
        const gmail = verifyGoogleIdToken(token); // ✅ Step 1: Verify token and get Gmail
        return loginOrCreateGoogleUser(gmail);       // ✅ Step 2: Check sheet or create user
      } catch (error) {
        return jsonResponse(401, 'Google token verification failed: ' + error.message);
      }
    }
    
    

    // Handle account creation
    if (create) {
      if (!password) return jsonResponse(400, "Missing password for account creation");
      if (targetSheet) return jsonResponse(409, "User already exists",);

      var newSheet = ss.insertSheet(normalizedGmail);
      newSheet.getRange("A1").setValue(password);
      var newToken = generateAlphanumericToken(6);
      globalNewToken = newToken;
      newSheet.getRange("B1").setValue(newToken);

      newSheet.getRange('A3').setValue('Name');
      newSheet.getRange('B3').setValue('Rating');
      newSheet.getRange('C3').setValue('Downloaded');
      newSheet.getRange('D3').setValue('Watched');
      newSheet.getRange('E3').setValue('Poster');
      newSheet.getRange('F3').setValue('Seasons');
      newSheet.getRange('G3').setValue('Added on');

      return jsonResponse(201, "User created successfully", newToken);
    }

    if (!targetSheet) return jsonResponse(402, "User not found");

    if (!password && !token) return jsonResponse(400, "Missing password or token");

    var sheetPassword = targetSheet.getRange("A1").getValue();
    var sheetToken = targetSheet.getRange("B1").getValue();

    if (password && password !== sheetPassword) return jsonResponse(403, "Invalid password");
    if (token && token !== sheetToken) return jsonResponse(403, "Invalid token");

    var newToken = generateAlphanumericToken(6);
    targetSheet.getRange("B1").setValue(newToken);

    if (action) {
      var postData = e.parameter;
      if (action === "create") return handleCreate(targetSheet, postData, newToken);
      if (action === "fetch") {
        const headerRow = 3;
        const lastRow = targetSheet.getLastRow();
        const totalRows = lastRow - headerRow;

        if (totalRows < 1) {
          return jsonResponse(302, "Entry not found", newToken);
        }

        return handleRead(targetSheet, e.parameter.id, newToken);
      }

      if (action === "update") return handleUpdate(targetSheet, postData, newToken);
      if (action === "delete") return handleDelete(targetSheet, postData, newToken);
      if (action === "logout") return logged_out(targetSheet);
      if (action === "password") return password_change(targetSheet, postData, newToken);
      return jsonResponse(400, "Invalid action", newToken);
    }

    // Fallback if no action was passed: fetch all movies
    const headerRow = 3;
    const dataStartRow = headerRow + 1;
    const lastRow = targetSheet.getLastRow();
    const totalRows = lastRow - headerRow;

    Logger.log("Header Row: " + headerRow);
    Logger.log("Last Row: " + lastRow);
    Logger.log("Calculated total data rows: " + totalRows);

    if (totalRows < 1) {
      return jsonResponse(302, "Entry not found", newToken);
    }

    try {
      const data = targetSheet.getRange(dataStartRow, 1, totalRows, 7).getValues();
      const moviesData = data.map((row, index) => rowToObject(row, index + 1));
      return jsonResponse(302, "User verified, new token generated", newToken, moviesData);
    } catch (e) {
      return jsonResponse(500, "Range Fetch Failed: " + e.message, newToken);
    }



  } catch (err) {
    return jsonResponse(500, "Error: " + err.message,newToken);
  }
}

function verifyGoogleIdToken(idToken) {
  const response = UrlFetchApp.fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
  );
  const payload = JSON.parse(response.getContentText());

  if (!payload || !payload.email || payload.aud !== '824858639291-08t3t2oo4aab2ekrv0o9jtdgpfivonjd.apps.googleusercontent.com') {
    throw new Error('Invalid or untrusted Google token');
  }

  return payload.email.toLowerCase();
}

function loginOrCreateGoogleUser(gmail) {
  const ss = SpreadsheetApp.openById("1yDAuDF-r_XvK4S5rIId8G_vLmcoHbHU1htqzTlyD7C8");
  const normalized = gmail.replace(/@gmail\.com$/, '');
  let sheet = ss.getSheetByName(normalized);

  if (!sheet) {
    // New user: create sheet
    sheet = ss.insertSheet(normalized);
    sheet.getRange("A1").setValue("google-login");
    sheet.getRange("A3").setValue("Name");
    sheet.getRange("B3").setValue("Rating");
    sheet.getRange("C3").setValue("Downloaded");
    sheet.getRange("D3").setValue("Watched");
    sheet.getRange("E3").setValue("Poster");
    sheet.getRange("F3").setValue("Seasons");
    sheet.getRange("G3").setValue("Added on");
  }

  // Always generate a fresh app session token
  const newToken = generateAlphanumericToken(6);
  sheet.getRange("B1").setValue(newToken);

  return jsonResponse(200, "Signed in with Google", newToken);
}


function forgetpassword(sheet, gmail) {
  try {
    var newToken = generateAlphanumericToken(6);
    var userPassword = sheet.getRange("A1").getValue();/* 
    var userToken = sheet.getRange("B1").getValue();
    Logger.log("Forget Password Email: " + gmail);
    Logger.log("Forget Password Password: " + userPassword);
    Logger.log("Forget Password Token: " + userToken); */

    if (!gmail) return jsonResponse(400, "Missing gmail");
    if (!userPassword) return jsonResponse(400, "Missing pass");/* 
    if (!userToken) return jsonResponse(400,'Missing token'); */

    sheet.getRange("B1").setValue(newToken);
    return sendPasswordRecoveryEmail(gmail, userPassword, newToken);
  } catch (error) {
    return jsonResponse(500, "Error while handling forget password: " + error.message);
  }
}


function sendPasswordRecoveryEmail(recipientEmail, originalPassword, resetToken) {
   if (!recipientEmail.includes("@")) {
    recipientEmail += "@gmail.com";
  }
  try {
    if (!recipientEmail || !originalPassword || !resetToken) {
      return jsonResponse(400, "Missing recipientEmail, originalPassword, or resetToken");
    }

    var subject = "Your Movie Vault Account Recovery";
    var siteUrl = "https://script.google.com/macros/s/AKfycbxdqor1SpIHFUEu96QAofcDrLwwJFUgs58EiML5efKKQaALKfrz0Nbp9TjoMR0JiA66Tw/exec"; // Replace with your Movie Vault app URL
    var resetLink = siteUrl + "?gmail=" + encodeURIComponent(recipientEmail) + "&token=" + encodeURIComponent(resetToken) + "&action=fetch";

    var htmlBody = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>Password Recovery for <span style="color: #FF5722;">Movie Vault</span> 🎬</h2>
        <p>Dear User,</p>
        <p>We received a request to recover your password. Here are your original account details:</p>
        <ul>
          <li><strong>Email:</strong> ${recipientEmail}</li>
          <li><strong>Original Password:</strong> ${originalPassword}</li>
        </ul>
        <p>You can use the above password to log in directly to your Movie Vault account.</p>

        <p>If you’d prefer to access your account now, click the button below:</p>
        
        <p style="margin-top: 20px;">a
          <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #FF5722; color: #fff; text-decoration: none; border-radius: 5px;">
            🔑 Gain Access to Your Account
          </a>
        </p>

        <hr>
        <h4>Important Notes:</h4>
        <ol>
          <li>You can <strong>log in</strong> directly using the credentials provided above.</li>
          <li>Clicking the <strong>Gain Access to Your Account</strong> button above will allow you to log in immediately. However, the link will only be valid once. After you use it, it will expire.</li>
          <li>If you have any issues or need another recovery email, please contact support.</li>
        </ol>

        <p style="color: #888; font-size: 12px;">This is an automated email from Movie Vault. Do not reply directly.</p>
      </div>
    `;

    GmailApp.sendEmail(recipientEmail, subject, "Your browser does not support HTML emails. Please use a modern email client.", {
      htmlBody: htmlBody
    });

    return jsonResponse(200, "Password recovery email sent successfully to " + recipientEmail);

  } catch (error) {
    return jsonResponse(500, "Failed to send email: " + error.message);
  }
}


function password_change(sheet, data, newToken) {
  var userpassword = sheet.getRange("A1");
  var newPassword = data.newpassword;

  if (!newPassword) return jsonResponse(400, "New password is required", newToken);

  if (userpassword.getValue() === newPassword) {
    return jsonResponse(400, "New password cannot be the same as the old password", newToken);
  }

  userpassword.setValue(newPassword);
  return jsonResponse(200, "Password has been changed successfully", newToken);
}



function logged_out(sheet) {
  sheet.getRange("B1").setValue("");  // Clear the token
  return jsonResponse(200, "Logout successful");
}


function handleRead(sheet, id, newToken) {
  var data = sheet.getRange(4, 1, sheet.getLastRow() - 3, 7).getValues();
  if (id) {
    var rowIndex = parseInt(id);
    if (rowIndex > 0 && rowIndex <= data.length) {
      return jsonResponse(200, "Entry fetched successfully", newToken, [rowToObject(data[rowIndex - 1], rowIndex)]);
    } else {
      return jsonResponse(404, "Entry not found", newToken);
    }
  } else {
    var result = data.map((row, index) => rowToObject(row, index + 1));
    return jsonResponse(200, "All entries fetched", newToken, result);
  }
}

function handleCreate(sheet, data, newToken) {
  if (!data.Name) return jsonResponse(400, "Name is required", newToken);

  var formattedName = capitalizeWords(data.Name.trim());

  
  var lastRow = sheet.getLastRow();
  var existingNames = [];

  if (lastRow > 3) {
    existingNames = sheet.getRange(4, 1, lastRow - 3, 1).getValues();
  }


  var isNamePresent = existingNames.some(function (row) {
    return row[0].toLowerCase() === formattedName.toLowerCase();
  });

  if (isNamePresent) {
    return jsonResponse(409, "Movie name already exists", newToken);
  }

  var omdb = fetchOmdbData(formattedName);

  var newRow = [
    omdb.name,
    omdb.rating,
    data.Downloaded === true || data.Downloaded === "true",
    data.Watched === true || data.Watched === "true",
    omdb.poster,
    omdb.seasons,
    omdb.date
  ];
  sheet.appendRow(newRow);
  return jsonResponse(201, "Entry created", newToken, { id: sheet.getLastRow() - 3, ...rowToObject(newRow, sheet.getLastRow() - 3) });
}

function handleUpdate(sheet, data, newToken) {
  if (!data.id) return jsonResponse(400, "ID is required", newToken);

  var rowIndex = parseInt(data.id) + 3;
  if (rowIndex <= 3 || rowIndex > sheet.getLastRow()) return jsonResponse(404, "Entry not found", newToken);

  var currentData = sheet.getRange(rowIndex, 1, 1, 7).getValues()[0];

  var updatedRow = currentData.slice(); // start with current data

  var changes = 0; // Track changes

  if (data.Name) {
    var formattedName = capitalizeWords(data.Name.trim());
    if (formattedName !== currentData[0]) {
      var omdb = fetchOmdbData(formattedName);
      updatedRow[0] = omdb.name;
      updatedRow[1] = omdb.rating;
      updatedRow[4] = omdb.poster;
      updatedRow[5] = omdb.seasons;
      updatedRow[6] = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MMMM/yyyy");
      changes++;
    }
  }

  if (data.Downloaded !== undefined) {
    var newDownloaded = data.Downloaded === true || data.Downloaded === "true";
    if (newDownloaded !== currentData[2]) {
      updatedRow[2] = newDownloaded;
      changes++;
    }
  }

  if (data.Watched !== undefined) {
    var newWatched = data.Watched === true || data.Watched === "true";
    if (newWatched !== currentData[3]) {
      updatedRow[3] = newWatched;
      changes++;
    }
  }

  // You can add manual updates for Rating, Poster, Seasons if needed:
  if (data.Rating && data.Rating !== currentData[1]) {
    updatedRow[1] = data.Rating;
    changes++;
  }
  if (data.Poster && data.Poster !== currentData[4]) {
    updatedRow[4] = data.Poster;
    changes++;
  }
  if (data.Seasons && data.Seasons !== currentData[5]) {
    updatedRow[5] = data.Seasons;
    changes++;
  }

  if (changes === 0) {
    return jsonResponse(400, "No changes detected", newToken);
  }

  sheet.getRange(rowIndex, 1, 1, 7).setValues([updatedRow]);
  return jsonResponse(200, "Entry updated successfully", newToken, { id: data.id, ...rowToObject(updatedRow, data.id) });
}


function handleDelete(sheet, data, newToken) {
  if (!data.id) return jsonResponse(400, "ID is required", newToken);

  var rowIndex = parseInt(data.id) + 3;
  if (rowIndex <= 3 || rowIndex > sheet.getLastRow()) return jsonResponse(404, "Entry not found", newToken);

  sheet.deleteRow(rowIndex);
  return jsonResponse(200, "Entry deleted", newToken);
}

function rowToObject(row, index) {
  let formattedDate = row[6];
  if (formattedDate instanceof Date) {
    formattedDate = Utilities.formatDate(formattedDate, Session.getScriptTimeZone(), "dd/MMM/yyyy"); // Change format here
  }
  return {
    id: index,
    Name: row[0],
    Rating: row[1],
    Downloaded: row[2],
    Watched: row[3],
    Poster: row[4],
    Seasons: row[5],
    "Added on": formattedDate
  };
}


function generateAlphanumericToken(length) {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
}

function jsonResponse(code, message, newToken = null, data = null) {
  var response = { status: { code: code, message: message } };
  if (newToken) response.status.new_token = newToken;
  if (data !== null) response.data = data;
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

function fetchOmdbData(name) {
  var apiKey = "bc9e8d6c";
  var url = "https://www.omdbapi.com/?t=" + encodeURIComponent(name) + "&apikey=" + apiKey;
  try {
    var response = UrlFetchApp.fetch(url);
    var data = JSON.parse(response.getContentText());
    if (data.Response === "True") {
      return {
        name: name,
        rating: data.imdbRating || "N/A",
        poster: data.Poster || "N/A",
        seasons: data.totalSeasons || "N/A",
        date: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MMMM/yyyy")
      };
    }
  } catch (e) {
    Logger.log("OMDb fetch error: " + e);
  }
  return {
    name: name,
    rating: "Error",
    poster: "Error",
    seasons: "N/A",
    date: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MMMM/yyyy")
  };
}

function capitalizeWords(str) {
  return str.toLowerCase().split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
