const baseCurrency = 'CAD';
const supportedCurrencies = { 'CAD': 'CAD', 'USD': 'USD' };
const exchangeApiUrl = 'https://open.er-api.com/v6/latest/CAD';
const currencySymbols = { 'CAD': 'C$', 'USD': '$' };

function injectCurrencySwitcher(currentCurrency) {
  const switcher = document.createElement('div');
  switcher.innerHTML = `
    <label for="currencySelect" style="font-weight:bold;">Currency:</label>
    <select id="currencySelect">
      <option value="CAD" ${currentCurrency === 'CAD' ? 'selected' : ''}>CAD</option>
      <option value="USD" ${currentCurrency === 'USD' ? 'selected' : ''}>USD</option>
    </select>
  `;
  Object.assign(switcher.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: '9999',
    background: '#fff',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '5px',
  });
  document.body.appendChild(switcher);

  document.getElementById('currencySelect').addEventListener('change', function () {
    localStorage.setItem('selectedCurrency', this.value);
    location.reload();
  });
}

async function getExchangeRates() {
  try {
    const cachedRates = localStorage.getItem('exchangeRates');
    const cachedTime = localStorage.getItem('exchangeRatesTime');
    const oneDay = 86400000;
    if (cachedRates && cachedTime && Date.now() - cachedTime < oneDay) {
      return JSON.parse(cachedRates);
    }
    const res = await fetch(exchangeApiUrl);
    const data = await res.json();
    localStorage.setItem('exchangeRates', JSON.stringify(data.rates));
    localStorage.setItem('exchangeRatesTime', Date.now());
    return data.rates;
  } catch (error) {
    console.error('Exchange API failed:', error);
    return null;
  }
}

function convertPrices(rate, currency) {
  const selectors = [
    '.sqs-money-native',
    '.ProductItem-details .ProductItem-price',
    '.price',
    '.ProductItem-price .sqs-money-element',
    '.CartItem-price',
    '.OrderSummary-price',
    '.SummaryItem-price',
    '.ProductList-price',
    '.ProductItem-price-regular',
    '.product-price'
  ];
  selectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      if (el.getAttribute('data-converted') === currency) return;
      const priceText = el.textContent.replace(/[^0-9.]/g, '');
      const priceValue = parseFloat(priceText);
      if (!isNaN(priceValue)) {
        let convertedPrice = currency !== baseCurrency ? priceValue * rate : priceValue;
        convertedPrice = Math.round(convertedPrice) - 0.01;
        el.textContent = `${currencySymbols[currency]}${convertedPrice.toFixed(2)} ${currency}`;
        el.setAttribute('data-converted', currency);
      }
    });
  });
}

window.main = async function () {
  const userCurrency = localStorage.getItem('selectedCurrency') || baseCurrency;
  injectCurrencySwitcher(userCurrency);
  if (userCurrency === baseCurrency) return;
  const rates = await getExchangeRates();
  if (!rates || !rates[userCurrency]) return;
  const rate = rates[userCurrency];
  let attempts = 0;
  const maxAttempts = 30;
  const interval = setInterval(() => {
    convertPrices(rate, userCurrency);
    attempts++;
    if (document.querySelector('.product-price') && attempts >= 3) {
      clearInterval(interval);
    }
    if (attempts >= maxAttempts) {
      clearInterval(interval);
    }
  }, 500);
};

if (document.readyState === "complete") {
  main();
} else {
  window.addEventListener("load", main);
}
 
