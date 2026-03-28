const { get, ref } = require("firebase/database");
const { database } = require("../firebaseConfig.js");

const ITEM_ROOT = "inventoryItems";
const MOVEMENT_ROOT = "inventoryMovements";
const PAYMENT_ROOT = "payments";
const SUBSCRIPTION_ROOT = "subscriptions";
const TIMEZONE = "Asia/Damascus";

const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundAmount = (value) => Number(asNumber(value, 0).toFixed(4));

const normalizeString = (value, fallback = "") => {
  if (typeof value !== "string") return fallback;
  const next = value.trim();
  return next || fallback;
};

const normalizeCurrency = (value, fallback = "SYP") => {
  const normalized = normalizeString(value, "").toUpperCase();
  return normalized || fallback;
};

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const getDatePartsInTz = (date) => {
  const parts = dateFormatter.formatToParts(date);
  const result = { year: "", month: "", day: "" };

  parts.forEach((part) => {
    if (part.type === "year") result.year = part.value;
    if (part.type === "month") result.month = part.value;
    if (part.type === "day") result.day = part.value;
  });

  return result;
};

const toDateKeyInTz = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const { year, month, day } = getDatePartsInTz(date);
  if (!year || !month || !day) return "";
  return `${year}-${month}-${day}`;
};

const parseDateKeyInput = (value) => {
  if (value === undefined || value === null || value === "") return null;

  const normalized = String(value).trim();
  if (!normalized) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  return toDateKeyInTz(date);
};

const shiftDateKey = (dateKey, offsetDays) => {
  const parsed = new Date(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return dateKey;
  parsed.setUTCDate(parsed.getUTCDate() + offsetDays);
  return parsed.toISOString().slice(0, 10);
};

const enumerateDateKeys = (fromKey, toKey) => {
  if (!fromKey || !toKey || fromKey > toKey) return [];

  const result = [];
  let cursor = fromKey;
  while (cursor <= toKey) {
    result.push(cursor);
    cursor = shiftDateKey(cursor, 1);
  }
  return result;
};

const shiftMonthKey = (monthKey, offsetMonths) => {
  const parsed = new Date(`${monthKey}-01T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return monthKey;
  parsed.setUTCMonth(parsed.getUTCMonth() + offsetMonths);
  return parsed.toISOString().slice(0, 7);
};

const recentMonthKeys = (currentMonthKey, count = 6) => {
  const total = Math.max(1, asNumber(count, 6));
  const list = [];
  for (let i = total - 1; i >= 0; i -= 1) {
    list.push(shiftMonthKey(currentMonthKey, -i));
  }
  return list;
};

const resolvePaymentDateKey = (payment) => {
  const byPaymentDate = parseDateKeyInput(payment?.paymentDate);
  if (byPaymentDate) return byPaymentDate;

  const byCreatedAt = parseDateKeyInput(payment?.createdAt);
  if (byCreatedAt) return byCreatedAt;

  return "";
};

const resolveMovementDateKey = (movement) => {
  const byCreatedAt = parseDateKeyInput(movement?.createdAt);
  if (byCreatedAt) return byCreatedAt;
  return "";
};

const createCurrencyBucket = () => ({
  todayIncome: 0,
  cashIn: 0,
  cashOut: 0,
  currentBalance: 0,
  periodRevenue: 0,
  periodCogs: 0,
  periodGrossProfit: 0,
  currentInventoryValue: 0,
  lowStockCount: 0,
  totalItems: 0,
});

const ensureCurrencyBucket = (map, currency) => {
  const code = normalizeCurrency(currency);
  if (!map[code]) map[code] = createCurrencyBucket();
  return map[code];
};

const ensureDailyRow = (map, date, currency) => {
  const key = `${date}|${currency}`;
  if (!map[key]) {
    map[key] = {
      date,
      currency,
      subscriptionIncome: 0,
      inventorySalesIncome: 0,
      totalIncome: 0,
    };
  }
  return map[key];
};

const ensureMonthlyRow = (map, month, currency) => {
  const key = `${month}|${currency}`;
  if (!map[key]) {
    map[key] = {
      month,
      currency,
      cashIn: 0,
      cashOut: 0,
      revenue: 0,
      cogs: 0,
      grossProfit: 0,
    };
  }
  return map[key];
};

const finalizeKpis = (kpisMap) => {
  const output = {};

  Object.entries(kpisMap).forEach(([currency, value]) => {
    const currentBalance = value.cashIn - value.cashOut;
    const periodGrossProfit = value.periodRevenue - value.periodCogs;

    output[currency] = {
      todayIncome: roundAmount(value.todayIncome),
      cashIn: roundAmount(value.cashIn),
      cashOut: roundAmount(value.cashOut),
      currentBalance: roundAmount(currentBalance),
      periodRevenue: roundAmount(value.periodRevenue),
      periodCogs: roundAmount(value.periodCogs),
      periodGrossProfit: roundAmount(periodGrossProfit),
      currentInventoryValue: roundAmount(value.currentInventoryValue),
      lowStockCount: asNumber(value.lowStockCount, 0),
      totalItems: asNumber(value.totalItems, 0),
    };
  });

  return output;
};

const inRange = (dateKey, fromKey, toKey) => dateKey >= fromKey && dateKey <= toKey;

const getProjectBalanceReport = async (req, res) => {
  try {
    const now = new Date();
    const todayKey = toDateKeyInTz(now);

    const fromInput = req.query.from;
    const toInput = req.query.to;

    const parsedFrom = parseDateKeyInput(fromInput);
    const parsedTo = parseDateKeyInput(toInput);

    if (fromInput && !parsedFrom) {
      return res.status(400).json({ message: "Invalid from date" });
    }

    if (toInput && !parsedTo) {
      return res.status(400).json({ message: "Invalid to date" });
    }

    const toKey = parsedTo || todayKey;
    const fromKey = parsedFrom || shiftDateKey(toKey, -29);

    if (fromKey > toKey) {
      return res.status(400).json({ message: "from date cannot be greater than to date" });
    }

    const currencyFilter = normalizeString(req.query.currency).toUpperCase();

    const [itemsSnap, movementSnap, paymentsSnap, subscriptionsSnap] = await Promise.all([
      get(ref(database, ITEM_ROOT)),
      get(ref(database, MOVEMENT_ROOT)),
      get(ref(database, PAYMENT_ROOT)),
      get(ref(database, SUBSCRIPTION_ROOT)),
    ]);

    const itemsMap = itemsSnap.val() || {};
    const movementRoot = movementSnap.val() || {};
    const paymentRoot = paymentsSnap.val() || {};
    const subscriptionsMap = subscriptionsSnap.val() || {};

    const kpisByCurrencyMap = {};
    if (currencyFilter) {
      ensureCurrencyBucket(kpisByCurrencyMap, currencyFilter);
    }

    const dailyMap = {};
    const monthlyMap = {};
    const todayTransactions = [];

    const currentMonthKey = todayKey.slice(0, 7);
    const targetMonths = recentMonthKeys(currentMonthKey, 6);
    const targetMonthSet = new Set(targetMonths);

    Object.values(itemsMap).forEach((rawItem) => {
      const item = rawItem || {};
      const isActive = item.isActive !== false;
      if (!isActive) return;

      const currency = normalizeCurrency(item.currency, "SYP");
      if (currencyFilter && currency !== currencyFilter) return;

      const quantityOnHand = asNumber(item.quantityOnHand, 0);
      const avgUnitCost = asNumber(item.avgUnitCost, asNumber(item.costPrice, 0));
      const stockValue = asNumber(item.stockValue, quantityOnHand * avgUnitCost);
      const lowStockThreshold = asNumber(item.lowStockThreshold, 0);
      const isLowStock = quantityOnHand <= lowStockThreshold;

      const bucket = ensureCurrencyBucket(kpisByCurrencyMap, currency);
      bucket.currentInventoryValue += stockValue;
      bucket.totalItems += 1;
      if (isLowStock) bucket.lowStockCount += 1;
    });

    Object.entries(paymentRoot).forEach(([subId, paymentMap]) => {
      Object.values(paymentMap || {}).forEach((rawPayment) => {
        const payment = rawPayment || {};
        const amount = asNumber(payment.amount, 0);
        if (amount <= 0) return;

        const dateKey = resolvePaymentDateKey(payment);
        if (!dateKey) return;

        const fallbackCurrency = subscriptionsMap?.[subId]?.currency || "SYP";
        const currency = normalizeCurrency(payment.currency, fallbackCurrency);
        if (currencyFilter && currency !== currencyFilter) return;

        const bucket = ensureCurrencyBucket(kpisByCurrencyMap, currency);
        bucket.cashIn += amount;

        const monthKey = dateKey.slice(0, 7);
        if (targetMonthSet.has(monthKey)) {
          const monthly = ensureMonthlyRow(monthlyMap, monthKey, currency);
          monthly.cashIn += amount;
          monthly.revenue += amount;
        }

        if (dateKey === todayKey) {
          bucket.todayIncome += amount;
          todayTransactions.push({
            id: payment.id || `${subId}-${dateKey}-${amount}`,
            type: "subscription_payment",
            currency,
            amount: roundAmount(amount),
            referenceId: subId,
            method: normalizeString(payment.method),
            note: normalizeString(payment.note),
            date: dateKey,
            createdAt: payment.createdAt || `${dateKey}T00:00:00.000Z`,
          });
        }

        if (inRange(dateKey, fromKey, toKey)) {
          bucket.periodRevenue += amount;
          const daily = ensureDailyRow(dailyMap, dateKey, currency);
          daily.subscriptionIncome += amount;
          daily.totalIncome += amount;
        }
      });
    });

    Object.entries(movementRoot).forEach(([itemId, movementMap]) => {
      const fallbackCurrency = normalizeCurrency(itemsMap?.[itemId]?.currency, "SYP");

      Object.values(movementMap || {}).forEach((rawMovement) => {
        const movement = rawMovement || {};
        const dateKey = resolveMovementDateKey(movement);
        if (!dateKey) return;

        const currency = normalizeCurrency(movement.currency, fallbackCurrency);
        if (currencyFilter && currency !== currencyFilter) return;

        const movementClass = normalizeString(movement.movementClass).toLowerCase();
        const saleRevenue = movementClass === "sale" ? asNumber(movement.revenueAmount, 0) : 0;
        const purchaseValue = movementClass === "purchase" ? asNumber(movement.purchaseAmount, 0) : 0;
        const cogsValue = asNumber(movement.cogsAmount, 0);

        const bucket = ensureCurrencyBucket(kpisByCurrencyMap, currency);
        bucket.cashIn += saleRevenue;
        bucket.cashOut += purchaseValue;

        const monthKey = dateKey.slice(0, 7);
        if (targetMonthSet.has(monthKey)) {
          const monthly = ensureMonthlyRow(monthlyMap, monthKey, currency);
          monthly.cashIn += saleRevenue;
          monthly.cashOut += purchaseValue;
          monthly.revenue += saleRevenue;
          monthly.cogs += cogsValue;
        }

        if (dateKey === todayKey && saleRevenue > 0) {
          bucket.todayIncome += saleRevenue;
          todayTransactions.push({
            id: movement.id || `${itemId}-${dateKey}-${saleRevenue}`,
            type: "inventory_sale",
            currency,
            amount: roundAmount(saleRevenue),
            referenceId: itemId,
            method: "inventory",
            note: normalizeString(movement.note || movement.reason),
            date: dateKey,
            createdAt: movement.createdAt || `${dateKey}T00:00:00.000Z`,
          });
        }

        if (inRange(dateKey, fromKey, toKey)) {
          bucket.periodRevenue += saleRevenue;
          bucket.periodCogs += cogsValue;

          if (saleRevenue > 0) {
            const daily = ensureDailyRow(dailyMap, dateKey, currency);
            daily.inventorySalesIncome += saleRevenue;
            daily.totalIncome += saleRevenue;
          }
        }
      });
    });

    const kpisByCurrency = finalizeKpis(kpisByCurrencyMap);
    const currencies = Object.keys(kpisByCurrency).sort((a, b) => a.localeCompare(b));

    const dailyDates = enumerateDateKeys(fromKey, toKey);
    const dailyIncomeTrend = [];
    dailyDates.forEach((date) => {
      currencies.forEach((currency) => {
        const row = ensureDailyRow(dailyMap, date, currency);
        dailyIncomeTrend.push({
          date: row.date,
          currency: row.currency,
          subscriptionIncome: roundAmount(row.subscriptionIncome),
          inventorySalesIncome: roundAmount(row.inventorySalesIncome),
          totalIncome: roundAmount(row.totalIncome),
        });
      });
    });

    const monthlySummary = [];
    targetMonths.forEach((month) => {
      currencies.forEach((currency) => {
        const row = ensureMonthlyRow(monthlyMap, month, currency);
        const grossProfit = row.revenue - row.cogs;
        monthlySummary.push({
          month,
          currency,
          cashIn: roundAmount(row.cashIn),
          cashOut: roundAmount(row.cashOut),
          revenue: roundAmount(row.revenue),
          cogs: roundAmount(row.cogs),
          grossProfit: roundAmount(grossProfit),
        });
      });
    });

    todayTransactions.sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return bTime - aTime;
    });

    return res.status(200).json({
      timezone: TIMEZONE,
      generatedAt: now.toISOString(),
      filters: {
        from: fromKey,
        to: toKey,
        currency: currencyFilter || null,
      },
      currencies,
      kpisByCurrency,
      dailyIncomeTrend,
      monthlySummary,
      todayTransactions,
    });
  } catch (error) {
    console.error("getProjectBalanceReport failed:", error);
    return res.status(500).json({ message: "Failed to fetch project balance report" });
  }
};

module.exports = {
  getProjectBalanceReport,
};
