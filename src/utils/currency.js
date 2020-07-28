const CURRENCY_INFO = {
  USD: { divisor: 100 },
  EUR: { divisor: 100 },
  GBP: { divisor: 100 },
};

/**
 * Converts an amount in minor units (e.g., cents) to a displayable format.
 * @param {number} amount - The amount in minor units.
 * @param {string} currency - The currency code (eg, 'USD').
 * @returns {number} The amount in major units.
 */
function formatAmount(amount, currency) {
  const currencyInfo = CURRENCY_INFO[currency.toUpperCase()];
  if (!currencyInfo) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
  return amount / currencyInfo.divisor;
}

/**
 * Converts an amount from a displayable format to minor units (e.g., cents).
 * @param {number} displayAmount - The amount in major units.
 * @param {string} currency - The currency code (e.g., 'USD').
 * @returns {number} The amount in minor units.
 */
function toStripeAmount(displayAmount, currency) {
  const currencyInfo = CURRENCY_INFO[currency.toUpperCase()];
  if (!currencyInfo) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
  // To avoid floating point issues, round to nearest integer
  return Math.round(displayAmount * currencyInfo.divisor);
}

module.exports = {
  formatAmount,
  toStripeAmount,
};
