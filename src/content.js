console.log('Content script loaded and running');

let orders = [];

function scrapeOrders() {
  orders = [];
  const orderElements = document.querySelectorAll('.order-card.js-order-card'); // General selector to target order cards

  console.log(`Found ${orderElements.length} order elements`);

  orderElements.forEach(orderElement => {
    const dateElement = orderElement.querySelector('.a-column.a-span3 .a-row .a-size-base.a-color-secondary'); // Selector for order date
    const totalElement = orderElement.querySelector('.a-column.a-span2 .a-row .a-size-base.a-color-secondary'); // Selector for total amount
    const invoiceElement = orderElement.querySelector('span.a-color-secondary[dir="ltr"]'); // Selector for invoice number
    const itemElements = orderElement.querySelectorAll('.yohtmlc-product-title'); // Selector for items

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
  chrome.runtime.sendMessage({ action: "updateOrders", orders: orders });
}

function observePageChanges() {
  const targetNode = document.body;
  const config = { childList: true, subtree: true };
  const callback = function(mutationsList, observer) {
    for (let mutation of mutationsList) {
      if (mutation.type === 'childList') {
        scrapeOrders();
        break;
      }
    }
  };
  const observer = new MutationObserver(callback);
  observer.observe(targetNode, config);
}

scrapeOrders();
observePageChanges();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in content script:', request);
  if (request.action === 'fetchOrders') {
    console.log('fetchOrders request received in content script');
    scrapeOrders();
    sendResponse({ success: true, orders: orders });
  }
});
