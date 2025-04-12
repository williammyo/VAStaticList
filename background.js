// Fallback message for when data cannot be fetched
const fallbackData = {
  "message": "Error fetching data. Please try again later."
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