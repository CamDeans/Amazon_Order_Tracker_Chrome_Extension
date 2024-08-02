console.log('Content script loaded and running');

let isFetching = false;
let pageCount = 0;
const MAX_PAGES = 100; // Safeguard against infinite loops

function addLog(message) {
  console.log(message);
  chrome.storage.local.get('scrapeLog', (result) => {
    let log = result.scrapeLog || [];
    log.push({ timestamp: new Date().toISOString(), message: message });
    chrome.storage.local.set({ scrapeLog: log });
  });
}

function scrapeOrders() {
  return new Promise((resolve, reject) => {
    try {
      const orders = [];
      const orderElements = document.querySelectorAll('.order-card.js-order-card');
      
      addLog(`Found ${orderElements.length} order elements on this page`);

      orderElements.forEach((orderElement, index) => {
        const dateElement = orderElement.querySelector('.a-column.a-span3 .a-row .a-size-base.a-color-secondary');
        const totalElement = orderElement.querySelector('.a-column.a-span2 .a-row .a-size-base.a-color-secondary');
        const invoiceElement = orderElement.querySelector('span.a-color-secondary[dir="ltr"]');
        const itemElements = orderElement.querySelectorAll('.yohtmlc-product-title');

        if (dateElement && totalElement && invoiceElement && itemElements.length > 0) {
          const date = dateElement.textContent.trim();
          const total = totalElement.textContent.trim();
          const invoice = invoiceElement.textContent.trim().replace('Order #', '');
          const items = Array.from(itemElements).map(item => item.textContent.trim()).join('; ');
          
          orders.push({
            date: date,
            price: total,
            invoice: invoice,
            order: items
          });
        } else {
          addLog(`Missing elements for order ${index + 1}`);
        }
      });

      addLog(`Scraped ${orders.length} orders from current page`);
      resolve(orders);
    } catch (error) {
      addLog(`Error scraping orders: ${error.message}`);
      reject(error);
    }
  });
}

function getNextPageUrl() {
  const nextButton = document.querySelector('.a-pagination .a-last a');
  if (nextButton && !nextButton.classList.contains('a-disabled')) {
    return nextButton.href;
  }
  return null;
}

function getCurrentFilterValue() {
  const filterSelect = document.querySelector('#time-filter');
  return filterSelect ? filterSelect.value : 'All orders';
}

function generateCSV(data) {
  const header = ['Date', 'Price', 'Invoice #', 'Order'];
  const rows = data.map(order => [
    order.date,
    order.price,
    order.invoice,
    order.order
  ]);
  return [header.join(','), ...rows.map(row => row.map(field => `"${field}"`).join(','))].join('\n');
}

async function scrapePage() {
  if (isFetching) {
    addLog('Already fetching, skipping this call');
    return;
  }
  isFetching = true;
  pageCount++;

  addLog(`Starting to scrape page ${pageCount}`);
  if (pageCount > MAX_PAGES) {
    addLog('Reached maximum page limit, stopping');
    completeScraping();
    return;
  }

  try {
    const orders = await scrapeOrders();

    chrome.storage.local.get(['allOrders', 'currentFilter'], (result) => {
      let allOrders = result.allOrders || [];
      let currentFilter = result.currentFilter || getCurrentFilterValue();

      const updatedOrders = allOrders.concat(orders);
      const nextPageUrl = getNextPageUrl();

      addLog(`Current filter: ${currentFilter}`);
      addLog(`Next page URL: ${nextPageUrl || 'None'}`);

      chrome.storage.local.set({
        allOrders: updatedOrders,
        currentFilter: currentFilter,
        totalOrdersScraped: updatedOrders.length
      }, () => {
        addLog(`Total orders scraped so far: ${updatedOrders.length}`);
        if (nextPageUrl) {
          addLog(`Navigating to next page: ${nextPageUrl}`);
          chrome.runtime.sendMessage({ action: "navigateToNextPage", url: nextPageUrl });
        } else {
          addLog('No more pages to scrape');
          completeScraping();
        }
        isFetching = false;
      });
    });
  } catch (error) {
    addLog(`Error in scrapePage: ${error.message}`);
    isFetching = false;
    completeScraping();
  }
}

function completeScraping() {
  chrome.storage.local.get(['allOrders', 'currentFilter'], (result) => {
    const allOrders = result.allOrders || [];
    const currentFilter = result.currentFilter || 'All orders';
    addLog(`Scraping complete. Total orders: ${allOrders.length}`);
    const csvData = generateCSV(allOrders);
    chrome.runtime.sendMessage({ 
      action: "completeFetching", 
      totalOrders: allOrders.length, 
      csvData: csvData,
      filter: currentFilter
    });
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  addLog(`Message received in content script: ${JSON.stringify(request)}`);
  if (request.action === 'scrapePage') {
    addLog('Scrape page request received in content script');
    scrapePage().then(() => {
      sendResponse({ success: true, message: 'Page scraped successfully' });
    }).catch((error) => {
      sendResponse({ success: false, message: 'Error scraping page', error: error.message });
    });
    return true; // Indicates that the response is sent asynchronously
  }
  
  if (request.action === "triggerDownload") {
    const filename = `amazon_orders_${request.filter.replace(/\s+/g, '_')}.csv`;
    const blob = new Blob([request.csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addLog('Download initiated from content script');
    sendResponse({ success: true, message: 'Download initiated' });
  }
});