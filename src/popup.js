console.log('Popup script loaded');

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM content loaded');

  const exportButton = document.getElementById('exportData');
  const statusElement = document.getElementById('status');
  const logElement = document.getElementById('log');
  
  if (exportButton) {
    exportButton.addEventListener('click', () => startScraping(statusElement));
  } else {
    console.error('Export button not found');
  }

  // Set up log refresh
  setInterval(refreshLog, 1000);
  setInterval(updateStatus, 1000);
});

function startScraping(statusElement) {
  console.log('Export button clicked');
  chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
    const activeTab = tabs[0];
    if (activeTab.url.includes('amazon.ca/your-orders')) {
      chrome.storage.local.set({ 
        allOrders: [], 
        currentFilter: null,
        totalOrdersScraped: 0,
        scrapeLog: []
      }, () => {
        chrome.runtime.sendMessage({ action: "startScraping" });
        setStatus(statusElement, 'Scraping started...', 'info');
      });
    } else {
      setStatus(statusElement, 'Please navigate to an Amazon orders page', 'error');
    }
  });
}

function setStatus(statusElement, message, type = 'info') {
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.className = type;
  }
}

function updateStatus() {
  const statusElement = document.getElementById('status');
  chrome.storage.local.get(['totalOrdersScraped', 'currentFilter'], (result) => {
    if (result.totalOrdersScraped !== undefined) {
      setStatus(statusElement, `Scraped ${result.totalOrdersScraped} orders (Filter: ${result.currentFilter || 'All orders'})`, 'info');
    }
  });
}

function refreshLog() {
  chrome.storage.local.get('scrapeLog', (result) => {
    const logElement = document.getElementById('log');
    if (logElement) {
      logElement.innerHTML = (result.scrapeLog || []).map(entry => 
        `<div>[${new Date(entry.timestamp).toLocaleTimeString()}] ${entry.message}</div>`
      ).join('');
      logElement.scrollTop = logElement.scrollHeight;
    }
  });
}

chrome.runtime.sendMessage({ action: "testConnection" }, response => {
  console.log('Test connection response:', response);
});