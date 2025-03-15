// Hard-coded JSON data as a fallback
const fallbackData = {
  "data": {
    "id": "",
    "type": "disability_ratings",
    "attributes": {
      "combined_disability_rating": 100,
      "combined_effective_date": "2023-12-01",
      "legal_effective_date": "2023-11-06",
      "individual_ratings": [
        {"decision": "Service Connected", "effective_date": "2023-09-05", "rating_end_date": null, "rating_percentage": 50, "diagnostic_type_code": "6847", "diagnostic_type_name": "Sleep Apnea Syndromes", "diagnostic_text": "obstructive sleep apnea", "disability_rating_id": "93958278", "static_ind": true},
        {"decision": "Service Connected", "effective_date": "2023-11-06", "rating_end_date": null, "rating_percentage": 10, "diagnostic_type_code": "8520", "diagnostic_type_name": "Paralysis of the sciatic nerve", "diagnostic_text": "radiculopathy, left lower extremity", "disability_rating_id": "97019981", "static_ind": true},
        {"decision": "Service Connected", "effective_date": "2023-09-26", "rating_end_date": null, "rating_percentage": 30, "diagnostic_type_code": "8100", "diagnostic_type_name": "Migraine", "diagnostic_text": "migraine", "disability_rating_id": "94487862", "static_ind": true},
        {"decision": "Service Connected", "effective_date": "2023-11-06", "rating_end_date": null, "rating_percentage": 10, "diagnostic_type_code": "8520", "diagnostic_type_name": "Paralysis of the sciatic nerve", "diagnostic_text": "radiculopathy, right lower extremity", "disability_rating_id": "97019980", "static_ind": true},
        {"decision": "Not Service Connected", "effective_date": null, "rating_end_date": null, "rating_percentage": null, "diagnostic_type_code": "5206", "diagnostic_type_name": "Limited flexion of the forearm", "diagnostic_text": "arm condition, right", "disability_rating_id": "93958274", "static_ind": false},
        {"decision": "Service Connected", "effective_date": "2023-04-17", "rating_end_date": null, "rating_percentage": 20, "diagnostic_type_code": "5261", "diagnostic_type_name": "Limitation of extension, knee", "diagnostic_text": "left knee, patellar tendinitis", "disability_rating_id": "93958277", "static_ind": true},
        {"decision": "Not Service Connected", "effective_date": null, "rating_end_date": null, "rating_percentage": null, "diagnostic_type_code": "5260", "diagnostic_type_name": "Limitation of flexion, knee", "diagnostic_text": "right knee sprain", "disability_rating_id": "93958273", "static_ind": false},
        {"decision": "Not Service Connected", "effective_date": null, "rating_end_date": null, "rating_percentage": null, "diagnostic_type_code": "5271", "diagnostic_type_name": "Limitation of motion of the ankle", "diagnostic_text": "left ankle sprain", "disability_rating_id": "93958275", "static_ind": false},
        {"decision": "Not Service Connected", "effective_date": null, "rating_end_date": null, "rating_percentage": null, "diagnostic_type_code": "5271", "diagnostic_type_name": "Limitation of motion of the ankle", "diagnostic_text": "right ankle sprain", "disability_rating_id": "93958280", "static_ind": false},
        {"decision": "Service Connected", "effective_date": "2023-04-16", "rating_end_date": null, "rating_percentage": 10, "diagnostic_type_code": "6260", "diagnostic_type_name": "Tinnitus", "diagnostic_text": "tinnitus", "disability_rating_id": "93958279", "static_ind": true},
        {"decision": "Not Service Connected", "effective_date": null, "rating_end_date": null, "rating_percentage": null, "diagnostic_type_code": "5206", "diagnostic_type_name": "Limited flexion of the forearm", "diagnostic_text": "arm condition, left", "disability_rating_id": "93958276", "static_ind": false},
        {"decision": "Service Connected", "effective_date": "2023-11-06", "rating_end_date": null, "rating_percentage": 40, "diagnostic_type_code": "5243", "diagnostic_type_name": "Intervertebral Disc Syndrome", "diagnostic_text": "strain and intervertebral disc syndrome, lumbosacral spine", "disability_rating_id": "84648626", "static_ind": true},
        {"decision": "Service Connected", "effective_date": "2023-09-05", "rating_end_date": null, "rating_percentage": 70, "diagnostic_type_code": "9411", "diagnostic_type_name": "Post traumatic stress disorder", "diagnostic_text": "posttraumatic stress disorder with panic attacks, major depressive disorder and alcohol use disorder", "disability_rating_id": "84648624", "static_ind": true},
        {"decision": "Not Service Connected", "effective_date": null, "rating_end_date": null, "rating_percentage": null, "diagnostic_type_code": "6002", "diagnostic_type_name": "Scleritis", "diagnostic_text": "vision", "disability_rating_id": "93958281", "static_ind": true}
      ]
    }
  }
};

// Log when the background script is loaded
console.log("Background script loaded.");

let apiTabId = null;

// Log when the message listener is set up
console.log("Setting up message listener...");
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Background script received message:", request);

  if (request.action === "fetchApiData") {
    // First, try fetching the data directly from the background script
    console.log("Attempting to fetch data directly...");
    fetch("https://api.va.gov/v0/rated_disabilities", {
      method: "GET",
      credentials: "include" // Include session cookies
    })
      .then(response => {
        if (!response.ok) {
          if (response.status === 401) {
            // User is logged out (401 Unauthorized)
            console.log("User is logged out (401 Unauthorized).");
            chrome.runtime.sendMessage({ action: "loggedOut" });
            sendResponse({ status: "loggedOut" });
            return;
          }
          throw new Error("HTTP error " + response.status);
        }
        return response.json();
      })
      .then(data => {
        console.log("Data fetched directly:", data);
        chrome.runtime.sendMessage({ action: "displayTable", data: data });
        sendResponse({ status: "success" });
      })
      .catch(error => {
        console.log("Direct fetch failed:", error.message);
        // If direct fetch fails due to login issue, we already handled it above
        if (error.message.includes("401")) {
          return; // Already sent loggedOut message
        }
        // Otherwise, fall back to opening a new tab
        console.log("Falling back to opening new tab...");
        try {
          chrome.tabs.create({ url: "https://api.va.gov/v0/rated_disabilities" }, (tab) => {
            if (chrome.runtime.lastError) {
              console.error("Failed to create tab:", chrome.runtime.lastError.message);
              // If tab creation fails, use hard-coded data as a last resort
              console.log("Falling back to hard-coded data...");
              chrome.runtime.sendMessage({ action: "displayTable", data: fallbackData });
              sendResponse({ status: "fallback" });
              return;
            }

            console.log("New tab opened with ID:", tab.id);
            apiTabId = tab.id; // Store the tab ID to close it later

            // Listen for the tab to load and fetch the data
            chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
              if (tabId === tab.id && changeInfo.status === "complete") {
                console.log("Tab loaded, injecting script to fetch data...");
                chrome.scripting.executeScript({
                  target: { tabId: tab.id },
                  function: fetchApiData
                }, (results) => {
                  if (results && results[0] && results[0].result) {
                    const data = results[0].result;
                    console.log("Data fetched successfully:", data);
                    chrome.runtime.sendMessage({ action: "displayTable", data: data });
                    // Close the API tab
                    if (apiTabId) {
                      chrome.tabs.remove(apiTabId, () => {
                        console.log("API tab closed.");
                        apiTabId = null;
                      });
                    }
                    sendResponse({ status: "success" });
                  } else {
                    console.log("Failed to fetch data from API page.");
                    chrome.runtime.sendMessage({ action: "displayError", message: "Failed to fetch data from API." });
                    // Close the API tab even if there's an error
                    if (apiTabId) {
                      chrome.tabs.remove(apiTabId, () => {
                        console.log("API tab closed (on error).");
                        apiTabId = null;
                      });
                    }
                    sendResponse({ status: "error" });
                  }
                });
                // Remove the listener after execution
                chrome.tabs.onUpdated.removeListener(listener);
              }
            });
          });
        } catch (tabError) {
          console.error("Tab creation error:", tabError.message);
          // If tab creation fails, use hard-coded data
          console.log("Falling back to hard-coded data...");
          chrome.runtime.sendMessage({ action: "displayTable", data: fallbackData });
          sendResponse({ status: "fallback" });
        }
      });

    return true; // Keep the message channel open for async response
  }
});

// Function to inject into the API page to fetch JSON data
function fetchApiData() {
  try {
    // The API page should return JSON as raw text in the body
    const jsonText = document.body.innerText;
    console.log("Raw JSON text from API page:", jsonText);
    const data = JSON.parse(jsonText);
    return data;
  } catch (error) {
    console.error("Error parsing JSON:", error.message);
    return null;
  }
}