/**
 * Indian Rupee money utility functions.
 * All monetary amounts are stored internally as integer paise (1 Rupee = 100 paise).
 * Never use floating-point arithmetic for totals.
 */

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const inrWithPaiseFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format integer paise into Indian currency string (e.g. 10000000 paise -> ₹1,00,000)
 */
export function formatPaise(paise: number = 0, showDecimalsIfZero: boolean = false): string {
  if (isNaN(paise) || paise === null || paise === undefined) return "₹0";
  const rupees = paise / 100;
  if (!showDecimalsIfZero && paise % 100 === 0) {
    return inrFormatter.format(rupees);
  }
  return inrWithPaiseFormatter.format(rupees);
}

/**
 * Convert user entered Rupees into integer paise for database storage.
 */
export function rupeesToPaise(rupees: number | string): number {
  if (typeof rupees === "string") {
    const cleaned = rupees.replace(/[^0-9.]/g, "");
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) return 0;
    return Math.round(parsed * 100);
  }
  if (isNaN(rupees)) return 0;
  return Math.round(rupees * 100);
}

/**
 * Convert integer paise to Rupees for input fields and calculations.
 */
export function paiseToRupees(paise: number = 0): number {
  if (!paise || isNaN(paise)) return 0;
  return Math.round(paise) / 100;
}

