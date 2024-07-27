console.log('Content script loaded and running');

let orders = [];

function scrapeOrders() {
  orders = [];
  const orderElements = document.querySelectorAll('.order-card.js-order-card');

  console.log(`Found ${orderElements.length} order elements`);

  orderElements.forEach(orderElement => {
    const dateElement = orderElement.querySelector('.a-column.a-span3 .a-row .a-size-base.a-color-secondary');
    const totalElement = orderElement.querySelector('.a-column.a-span2 .a-row .a-size-base.a-color-secondary');
    const invoiceElement = orderElement.querySelector('span.a-color-secondary[dir="ltr"]');
    const itemElements = orderElement.querySelectorAll('.yohtmlc-product-title');

    console.log({
      dateElement: dateElement ? dateElement.textContent.trim() : 'Not found',
      totalElement: totalElement ? totalElement.textContent.trim() : 'Not found',
      invoiceElement: invoiceElement ? invoiceElement.textContent.trim() : 'Not found',
      itemElements: itemElements.length ? Array.from(itemElements).map(item => item.textContent.trim()).join('; ') : 'Not found'
    });

    if (dateElement && totalElement && invoiceElement && itemElements.length > 0) {
      const items = Array.from(itemElements).map(item => item.textContent.trim()).join('; ');
      orders.push({
        date: dateElement.textContent.trim(),
        total: totalElement.textContent.trim(),
        invoice: invoiceElement.textContent.trim(),
        items: items
      });
    } else {
      console.log('Missing elements:', {
        dateElement,
        totalElement,
        invoiceElement,
        itemElements
      });
    }
  });

  console.log('Orders scraped:', orders);
}

function observePageChanges() {
  const targetNode = document.body;
  const config = { childList: true, subtree: true };

  const callback = function(mutationsList, observer) {
    for (let mutation of mutationsList) {
      if (mutation.type === 'childList') {
        try {
          scrapeOrders();
        } catch (error) {
          console.error('Error during scraping:', error);
        }
        break;
      }
    }
  };

  const observer = new MutationObserver(callback);
  observer.observe(targetNode, config);

  window.addEventListener('beforeunload', () => {
    observer.disconnect();
    console.log('Observer disconnected.');
  });
}

document.addEventListener('DOMContentLoaded', (event) => {
  console.log('DOM fully loaded and parsed');
  scrapeOrders();
  observePageChanges();
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in content script:', request);
  if (request.action === 'fetchOrders') {
    console.log('fetchOrders request received in content script');
    scrapeOrders();
    sendResponse({ success: true, orders: orders });
  }
});
