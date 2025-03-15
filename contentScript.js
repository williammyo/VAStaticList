if (window.location.hostname === "va.gov" || window.location.hostname === "api.va.gov") {
  console.log("Content script running on", window.location.hostname);
  // Automatically trigger the API fetch and table display
  chrome.runtime.sendMessage({ action: "fetchApiData" });
}