import { Currency } from '@/contexts/CurrencyContext';

const CONVERSION_RATES = {
  USD: 1,
  INR: 82,
  EUR: 0.92,
};

const CURRENCY_SYMBOLS = {
  USD: '$',
  INR: '₹',
  EUR: '€',
};

const LOCALE_MAP = {
  USD: 'en-US',
  INR: 'en-IN',
  EUR: 'de-DE',
};

export const convertPrice = (priceInUSD: number, targetCurrency: Currency): number => {
  return priceInUSD * CONVERSION_RATES[targetCurrency];
};

export const formatPrice = (price: number, currency: Currency): string => {
  const converted = convertPrice(price, currency);
  const symbol = CURRENCY_SYMBOLS[currency];
  const locale = LOCALE_MAP[currency];
  
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(converted);
  
  return `${symbol}${formatted}`;
};

export const getCurrencySymbol = (currency: Currency): string => {
  return CURRENCY_SYMBOLS[currency];
};
