console.log('Service worker loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in service worker:', request);

  if (request.action === "testConnection") {
    console.log('Test connection received');
    sendResponse({ success: true, message: 'Connection successful' });
    return true;
  }

  if (request.action === "exportData") {
    console.log('Export data request received');
    if (!request.data) {
      console.error('No data received for export');
      sendResponse({ success: false, error: 'No data received for export' });
      return true;
    }

    try {
      const header = "Date,Total,Invoice,Items\n";
      const csvContent = header + request.data.map(order => 
        `${order.date},${order.total},${order.invoice},"${order.items}"`
      ).join("\n");

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      console.log('Blob created:', blob);

      const reader = new FileReader();
      reader.onloadend = () => {
        console.log('Blob read as data URL:', reader.result);
        sendResponse({ success: true, url: reader.result });
      };
      reader.onerror = (error) => {
        console.error('Error reading blob:', error);
        sendResponse({ success: false, error: error.message });
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Error in export process:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true; // Indicates that the response is sent asynchronously
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

self.addEventListener('error', function(event) {
  console.error('Unhandled error:', event.message, 'at', event.filename, ':', event.lineno, ':', event.colno, event.error);
});
