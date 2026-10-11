// Quick-pick companies for the workspace. A pick only fills the merchant field; identification still runs through
// identifyCompany (the same function the server uses). No availability claims here: route and market status
// come from the live check, so a pick for a company with no route still ends in an honest "no".
export const QUICK_PICKS = [
  { ticker: 'AMZN', label: 'Amazon', merchant: 'Amazon' },
  { ticker: 'DIS', label: 'Disney', merchant: 'Disney' },
  { ticker: 'SBUX', label: 'Starbucks', merchant: 'Starbucks' },
  { ticker: 'AAPL', label: 'Apple', merchant: 'Apple' },
  { ticker: 'JNJ', label: 'Johnson & Johnson', merchant: 'Johnson & Johnson' },
] as const;
