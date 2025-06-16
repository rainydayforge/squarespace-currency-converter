document.addEventListener("DOMContentLoaded", function () {
  const baseCurrency = 'CAD';
  const supportedCurrencies = { 'CA': 'CAD', 'US': 'USD' };
  const exchangeApiUrl = 'https://open.er-api.com/v6/latest/CAD';
  const geoApiUrl = 'https://ipwho.is/';
  const currencySymbols = { 'CAD': 'C$', 'USD': '$' };

  async function getUserCountry() {
    try {
      const res = await fetch(geoApiUrl);
      const data = await res.json();
      if (data && data.country_code) {
        return data.country_code;
      }
      return 'CA';
    } catch (error) {
      console.error('Geo API failed:', error);
      return 'CA';
    }
  }

  async function getExchangeRates() {
    try {
      const cachedRates = localStorage.getItem('exchangeRates');
      const cachedTime = localStorage.getItem('exchangeRatesTime');
      const oneDay = 24 * 60 * 60 * 1000;

      if (cachedRates && cachedTime && (Date.now() - cachedTime < oneDay)) {
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
        if (el.getAttribute('data-converted')) return;
        const priceText = el.textContent.replace(/[^0-9.]/g, '');
        const priceValue = parseFloat(priceText);
        if (!isNaN(priceValue)) {
          let convertedPrice = priceValue * rate;
          convertedPrice = Math.round(convertedPrice) - 0.01;
          convertedPrice = convertedPrice.toFixed(2);
          el.textContent = `${currencySymbols[currency]}${convertedPrice} ${currency}`;
          el.setAttribute('data-converted', 'true');
        }
      });
    });
  }

  async function main() {
    const country = await getUserCountry();
    const currency = supportedCurrencies[country] || baseCurrency;
    if (currency === baseCurrency) return;

    const rates = await getExchangeRates();
    if (!rates || !rates[currency]) return;

    const rate = rates[currency];

    // Retry loop logic for Fluid Engine lazy loading
    let attempts = 0;
    const maxAttempts = 20;
    const interval = setInterval(() => {
      convertPrices(rate, currency);
      attempts++;
      if (document.querySelector('.product-price') && attempts >= 3) {
        clearInterval(interval); // stop after prices have loaded and conversion applied
      }
      if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 500);
  }

  main();
});
