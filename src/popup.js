console.log('Popup script loaded');

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM content loaded');
  
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
  
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs.length === 0) {
      console.error('No active tab found.');
      alert('No active tab found. Please open the Amazon orders page and try again.');
      return;
    }

    chrome.tabs.sendMessage(tabs[0].id, {action: "fetchOrders"}, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error fetching orders:', chrome.runtime.lastError);
        alert('Error fetching orders. Please try again.');
      } else if (response && response.success) {
        console.log('Orders fetched successfully:', response.orders);

        chrome.runtime.sendMessage({
          action: "exportData",
          data: response.orders
        }, exportResponse => {
          if (chrome.runtime.lastError) {
            console.error('Error exporting data:', chrome.runtime.lastError);
            alert('Error exporting data. Please try again.');
          } else {
            console.log('Export response:', exportResponse);
            if (exportResponse.success) {
              console.log('Export successful');
              alert('Data exported successfully. Check your downloads folder.');
            } else {
              console.error('Export failed:', exportResponse.error);
              alert('Export failed. Please try again.');
            }
          }
        });
      } else {
        console.error('Fetch orders failed:', response ? response.error : 'Unknown error');
        alert('Failed to fetch Amazon orders. Please try again.');
      }
    });
  });
}
