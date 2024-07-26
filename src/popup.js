console.log('Popup script loaded');

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM content loaded');

  chrome.runtime.sendMessage({ action: "testConnection" }, response => {
    console.log('Test connection response:', response);
  });

  const exportButton = document.getElementById('exportData');
  console.log('Export button:', exportButton);
  if (exportButton) {
    exportButton.addEventListener('click', exportData);
  } else {
    console.error('Export button not found');
  }
});

function exportData() {
  console.log('Export button clicked');

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) {
      console.error('No active tabs found');
      alert('No active Amazon tab found. Please open Amazon orders page.');
      return;
    }

    console.log('Sending message to content script in tab:', tabs[0].id);
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      files: ['content.js']
    }, () => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'fetchOrders' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Error sending message:', chrome.runtime.lastError);
          alert('Failed to fetch Amazon orders. Please try again.');
        } else if (response && response.success) {
          console.log('Orders fetched successfully:', response.orders);
          const csvData = convertOrdersToCSV(response.orders);
          sendExportRequest(csvData);
        } else {
          console.error('Fetch orders failed:', response ? response.error : 'Unknown error');
          alert('Failed to fetch Amazon orders. Please try again.');
        }
      });
    });
  });
}

function convertOrdersToCSV(orders) {
  const csvRows = ['Date,Total,Invoice,Items'];
  orders.forEach(order => {
    csvRows.push(`${order.date},${order.total},${order.invoice},${order.items}`);
  });
  return csvRows.join('\n');
}

function sendExportRequest(csvData) {
  chrome.runtime.sendMessage({
    action: "exportData",
    data: csvData
  }, response => {
    console.log('Export response:', response);
    if (chrome.runtime.lastError) {
      console.error('Error sending message:', chrome.runtime.lastError);
    } else if (response && response.success) {
      console.log('Export successful');
      alert('Data exported successfully. Check your downloads folder.');

      const link = document.createElement('a');
      link.href = response.url;
      link.download = 'amazon_orders.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      console.error('Export failed:', response ? response.error : 'Unknown error');
      alert('Export failed. Please try again.');
    }
  });
}

window.onerror = function(message, source, lineno, colno, error) {
  console.error('Unhandled error:', message, 'at', source, ':', lineno, ':', colno, error);
};
