console.log('Service worker loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in service worker:', request);

  if (request.action === "testConnection") {
    console.log('Test connection received');
    sendResponse({ success: true, message: 'Connection successful' });
    return false;
  }

  if (request.action === "startScraping") {
    console.log('Starting scraping process');
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      const activeTab = tabs[0];
      chrome.tabs.sendMessage(activeTab.id, { action: "scrapePage" });
    });
    sendResponse({ success: true, message: 'Scraping process initiated' });
    return false;
  }

  if (request.action === "navigateToNextPage") {
    console.log('Navigating to next page:', request.url);
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      const activeTab = tabs[0];
      chrome.tabs.update(activeTab.id, { url: request.url }, () => {
        chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
          if (tabId === activeTab.id && info.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            setTimeout(() => {
              chrome.tabs.sendMessage(activeTab.id, { action: "scrapePage" });
            }, 2000); // Wait for 2 seconds before scraping the next page
          }
        });
      });
    });
    sendResponse({ success: true, message: 'Navigation initiated' });
    return false;
  }

  if (request.action === "completeFetching") {
    console.log('Completed fetching all orders');
    
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      const activeTab = tabs[0];
      chrome.tabs.sendMessage(activeTab.id, { 
        action: "triggerDownload", 
        csvData: request.csvData,
        filter: request.filter
      });
    });
    
    sendResponse({ success: true, message: 'Download process initiated' });
    return true;
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});