export const PRICE_UNAVAILABLE = "Price unavailable";

export const formatCurrency = (amount: number, currency = "PHP") =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);

// Null-safe: a missing price is "Price unavailable", never 0.00.
export const formatPrice = (amount: number | null, currency = "PHP") =>
  amount === null ? PRICE_UNAVAILABLE : formatCurrency(amount, currency);

const parse = (iso: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Falls back to the raw string if it isn't a parseable date.
export const formatDateTime = (iso: string) => {
  const d = parse(iso);
  return d
    ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short" }).format(d)
    : iso;
};

export const formatDate = (iso: string | null) => {
  const d = parse(iso);
  return d ? new Intl.DateTimeFormat("en-PH", { dateStyle: "medium" }).format(d) : iso ?? "";
};