const bilateralPairs = new Set(["97019981", "97019980"]); // Sciatic nerve left and right

// Helper function to capitalize the first letter of each word
function capitalizeWords(str) {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Toggle Disclaimer function
function toggleDisclaimer() {
  const disclaimerContent = document.querySelector('.disclaimer-content');
  if (disclaimerContent.style.display === 'none' || disclaimerContent.style.display === '') {
    disclaimerContent.style.display = 'block';
  } else {
    disclaimerContent.style.display = 'none';
  }
}

// Navigation functions
function showMainPage() {
  document.getElementById('mainPage').style.display = 'block';
  document.getElementById('termsPage').style.display = 'none';
}

function showTermsPage() {
  document.getElementById('mainPage').style.display = 'none';
  document.getElementById('termsPage').style.display = 'block';
}

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
  // Bind toggle event
  document.getElementById('disclaimerToggle').addEventListener('click', toggleDisclaimer);

  // Bind navigation events
  const termsLink = document.getElementById('termsLink');
  if (termsLink) {
    termsLink.addEventListener('click', (e) => {
      e.preventDefault();
      showTermsPage();
    });
  } else {
    console.error("Terms link not found!");
  }

  const backButton = document.getElementById('backButton');
  if (backButton) {
    backButton.addEventListener('click', (e) => {
      e.preventDefault();
      showMainPage();
    });
  } else {
    console.error("Back button not found!");
  }

  // Get references to elements
  const statusDiv = document.getElementById("status");
  const errorDiv = document.getElementById("errorMessage");
  const loggedOutMessage = document.getElementById("loggedOutMessage");
  const serviceTable = document.getElementById("serviceConnectedTable");
  const nonServiceTable = document.getElementById("nonServiceConnectedTable");
  const combinedRatingDiv = document.getElementById("combinedRating");

  // Automatically start the fetch process when the popup opens
  console.log("Sending fetchApiData message...");
  chrome.runtime.sendMessage({ action: "fetchApiData" }, (response) => {
    if (chrome.runtime.lastError) {
      const errorMessage = chrome.runtime.lastError.message || JSON.stringify(chrome.runtime.lastError);
      console.error("Failed to send message:", errorMessage);
      errorDiv.classList.remove("hidden");
      errorDiv.textContent = `Error: Failed to fetch data: ${errorMessage}`;
      statusDiv.classList.add("hidden");
      loggedOutMessage.classList.add("hidden");
    } else {
      console.log("Message sent successfully, response:", response);
       loggedOutMessage.classList.add("hidden");
    }
  });

  // Set default state: hide loggedOutMessage, show loading message, hide others
  statusDiv.classList.remove("hidden");
  errorDiv.classList.add("hidden");
  loggedOutMessage.classList.add("hidden");
  serviceTable.classList.add("hidden");
  nonServiceTable.classList.add("hidden");
  combinedRatingDiv.classList.add("hidden");
});

// Keep the popup open by adding a dummy event listener
document.addEventListener("mousemove", () => {}, true);

// Listen for messages to display the table or errors
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Popup received message:", request);

  const serviceTableBody = document.getElementById("serviceConnectedBody");
  const nonServiceTableBody = document.getElementById("nonServiceConnectedBody");


  if (request.action === "displayTable") {
    console.log("Popup received data:", request.data);
    statusDiv.classList.add("hidden");
    errorDiv.classList.add("hidden");
    loggedOutMessage.classList.add("hidden");
    serviceTable.classList.remove("hidden");
    nonServiceTable.classList.remove("hidden");
    combinedRatingDiv.classList.remove("hidden");

    // Clear previous table contents
    serviceTableBody.innerHTML = '';
    nonServiceTableBody.innerHTML = '';

    const data = request.data.data.attributes;
    const individualRatings = data.individual_ratings;

    // Populate Combined Rating Section
    document.getElementById("combinedRatingValue").textContent = data.combined_disability_rating;
    document.getElementById("effectiveDate").textContent = data.legal_effective_date || "N/A";

    // Calculate Permanent & Total
    const serviceConnected = individualRatings.filter(item => item.decision === "Service Connected");
    const allStatic = serviceConnected.every(item => item.static_ind === true);
    document.getElementById("permanentTotal").textContent = allStatic ? "Yes" : "No";

    // Separate service-connected and non-service-connected disabilities
    const nonServiceConnected = individualRatings.filter(item => item.decision === "Not Service Connected");

    // Sort by effective date (newest to oldest)
    serviceConnected.sort((a, b) => {
      const dateA = a.effective_date ? new Date(a.effective_date) : new Date(0);
      const dateB = b.effective_date ? new Date(b.effective_date) : new Date(0);
      return dateB - dateA;
    });
    nonServiceConnected.sort((a, b) => {
      const dateA = a.effective_date ? new Date(a.effective_date) : new Date(0);
      const dateB = b.effective_date ? new Date(b.effective_date) : new Date(0);
      return dateB - dateA;
    });

    // Populate service-connected table
    serviceConnected.forEach(item => {
      const isBilateral = bilateralPairs.has(item.disability_rating_id);
      const row = serviceTableBody.insertRow();
      if (isBilateral) row.className = "bilateral";
      const conditionCell = row.insertCell();
      const fullConditionText = capitalizeWords(item.diagnostic_text);
      conditionCell.innerText = fullConditionText;
      conditionCell.setAttribute("data-full-text", fullConditionText);
      row.insertCell().innerText = item.diagnostic_type_code || "N/A";
      row.insertCell().innerText = item.rating_percentage || "N/A";
      row.insertCell().innerText = item.effective_date || "N/A";
      row.insertCell().innerText = item.static_ind ? "Yes" : "No";
      row.insertCell().innerText = item.static_ind === false && item.rating_end_date ? item.rating_end_date : "N/A";
    });

    // Populate non-service-connected table
    nonServiceConnected.forEach(item => {
      const isBilateral = bilateralPairs.has(item.disability_rating_id);
      const row = nonServiceTableBody.insertRow();
      if (isBilateral) row.className = "bilateral";
      const conditionCell = row.insertCell();
      const fullConditionText = capitalizeWords(item.diagnostic_text);
      conditionCell.innerText = fullConditionText;
      conditionCell.setAttribute("data-full-text", fullConditionText);
      row.insertCell().innerText = item.diagnostic_type_code || "N/A";
      row.insertCell().innerText = item.rating_percentage || "N/A";
      row.insertCell().innerText = item.effective_date || "N/A";
      row.insertCell().innerText = "N/A";
      row.insertCell().innerText = item.rating_end_date || "N/A";
    });

    // Hide the non-service-connected table if empty
    if (nonServiceConnected.length === 0) {
      nonServiceTable.parentElement.style.display = "none";
    }
  } else if (request.action === "displayError") {
    console.log("Popup received error:", request.message);
    statusDiv.classList.add("hidden");
    errorDiv.classList.remove("hidden");
    loggedOutMessage.classList.add("hidden");
    serviceTable.classList.add("hidden");
    nonServiceTable.classList.add("hidden");
    combinedRatingDiv.classList.add("hidden");
    errorDiv.textContent = request.message;
  } else if (request.action === "loggedOut") {
    console.log("User is logged out, displaying logged-out message.");  
    statusDiv.classList.add("hidden");
    errorDiv.classList.add("hidden");
    loggedOutMessage.textContent = "Please log in to va.gov to view your VA Disability Static List.";
    loggedOutMessage.classList.remove("hidden");
    serviceTable.classList.add("hidden");
    nonServiceTable.classList.add("hidden");
    combinedRatingDiv.classList.add("hidden");
  }
});