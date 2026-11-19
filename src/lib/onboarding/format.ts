const pounds = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const wholePounds = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 });

/** Sums in pence so £24.10 + £38.20 never drifts to £62.300000001. */
export function sum(amounts: number[]) {
  return amounts.reduce((total, amount) => total + Math.round(amount * 100), 0) / 100;
}

export const yearly = (monthly: number) => sum(Array.from({ length: 12 }, () => monthly));

/** "£1,150.00" */
export const formatMoney = (amount: number) => pounds.format(amount);

/** Balances: "£2,184", "−£320" (a true minus sign). */
export const formatBalance = (amount: number) => wholePounds.format(amount).replace("-", "\u2212");

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2021-03" to "Mar 2021". Fixed names, since en-GB Intl writes "Sept". */
export function formatMonth(yearMonth: string) {
  const [year, month] = yearMonth.split("-");
  return `${months[Number(month) - 1]} ${year}`;
}
