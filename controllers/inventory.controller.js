const { randomUUID } = require("crypto");
const { ref, get, set, update } = require("firebase/database");
const { database } = require("../firebaseConfig.js");

const ITEM_ROOT = "inventoryItems";
const MOVEMENT_ROOT = "inventoryMovements";

const MOVEMENT_TYPES = ["in", "out", "adjust"];
const MOVEMENT_CLASSES = ["purchase", "sale", "adjustment", "waste", "return"];

const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundAmount = (value) => {
  const parsed = asNumber(value, 0);
  return Number(parsed.toFixed(4));
};

const asNonNegative = (value, fallback = 0) => {
  const parsed = asNumber(value, fallback);
  return parsed < 0 ? fallback : parsed;
};

const normalizeString = (value, fallback = "") => {
  if (typeof value !== "string") return fallback;
  const next = value.trim();
  return next || fallback;
};

const normalizeSku = (value) => normalizeString(value).toUpperCase();

const normalizeCurrency = (value, fallback = "SYP") => {
  if (typeof value !== "string") return fallback;
  const next = value.trim().toUpperCase();
  return next || fallback;
};

const parseCurrencyInput = (value) => {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: undefined };
  }

  if (typeof value !== "string") {
    return { ok: false, message: "Invalid currency format" };
  }

  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z]{3,6}$/.test(normalized)) {
    return { ok: false, message: "Invalid currency code" };
  }

  return { ok: true, value: normalized };
};

const parseNumberInput = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
    return { ok: true, value: undefined };
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return { ok: false, message: `${fieldName} must be a valid number` };
  }

  if (parsed < 0) {
    return { ok: false, message: `${fieldName} cannot be negative` };
  }

  return { ok: true, value: parsed };
};

const inferMovementClass = (type) => {
  if (type === "in") return "purchase";
  if (type === "out") return "sale";
  return "adjustment";
};

const allowedClassesByType = {
  in: ["purchase", "return"],
  out: ["sale", "waste"],
  adjust: ["adjustment"],
};

const normalizeItem = (item = {}, id = "") => {
  const createdAt = item.createdAt || new Date().toISOString();
  const updatedAt = item.updatedAt || createdAt;

  const quantityOnHand = asNonNegative(item.quantityOnHand, 0);
  const costPrice = roundAmount(asNonNegative(item.costPrice, 0));
  const avgUnitCost = roundAmount(asNonNegative(item.avgUnitCost, costPrice));
  const stockValue = roundAmount(
    item.stockValue === undefined || item.stockValue === null
      ? quantityOnHand * avgUnitCost
      : asNonNegative(item.stockValue, quantityOnHand * avgUnitCost)
  );

  return {
    id: id || item.id || randomUUID(),
    sku: normalizeSku(item.sku),
    name: normalizeString(item.name),
    category: normalizeString(item.category),
    unit: normalizeString(item.unit, "piece"),
    currency: normalizeCurrency(item.currency, "SYP"),
    costPrice,
    sellPrice:
      item.sellPrice === undefined || item.sellPrice === null || item.sellPrice === ""
        ? null
        : roundAmount(asNonNegative(item.sellPrice, 0)),
    avgUnitCost,
    stockValue,
    quantityOnHand,
    lowStockThreshold: asNonNegative(item.lowStockThreshold, 0),
    isActive: item.isActive !== false,
    createdAt,
    updatedAt,
    createdBy: item.createdBy || "system",
    updatedBy: item.updatedBy || item.createdBy || "system",
  };
};

const normalizeMovement = (movement = {}, item = null) => {
  const movementType = MOVEMENT_TYPES.includes(movement.type) ? movement.type : "adjust";
  const movementClass = MOVEMENT_CLASSES.includes(movement.movementClass)
    ? movement.movementClass
    : inferMovementClass(movementType);

  return {
    id: movement.id || randomUUID(),
    itemId: movement.itemId || item?.id || "",
    type: movementType,
    movementClass,
    quantity: asNumber(movement.quantity, 0),
    unitCost:
      movement.unitCost === undefined || movement.unitCost === null || movement.unitCost === ""
        ? null
        : roundAmount(asNonNegative(movement.unitCost, 0)),
    unitSalePrice:
      movement.unitSalePrice === undefined || movement.unitSalePrice === null || movement.unitSalePrice === ""
        ? null
        : roundAmount(asNonNegative(movement.unitSalePrice, 0)),
    reason: normalizeString(movement.reason),
    note: normalizeString(movement.note),
    currency: normalizeCurrency(movement.currency, item?.currency || "SYP"),
    balanceBefore: asNonNegative(movement.balanceBefore, 0),
    balanceAfter: asNonNegative(movement.balanceAfter, 0),
    stockValueBefore: roundAmount(asNonNegative(movement.stockValueBefore, 0)),
    stockValueAfter: roundAmount(asNonNegative(movement.stockValueAfter, 0)),
    avgCostBefore: roundAmount(asNonNegative(movement.avgCostBefore, item?.avgUnitCost || 0)),
    avgCostAfter: roundAmount(asNonNegative(movement.avgCostAfter, item?.avgUnitCost || 0)),
    purchaseAmount: roundAmount(asNonNegative(movement.purchaseAmount, 0)),
    cogsAmount: roundAmount(asNonNegative(movement.cogsAmount, 0)),
    revenueAmount: roundAmount(asNonNegative(movement.revenueAmount, 0)),
    grossProfit: roundAmount(asNumber(movement.grossProfit, 0)),
    linkedUserId: normalizeString(movement.linkedUserId) || null,
    linkedSubscriptionId: normalizeString(movement.linkedSubscriptionId) || null,
    createdBy: movement.createdBy || "system",
    createdAt: movement.createdAt || new Date().toISOString(),
  };
};

const decorateItem = (item) => ({
  ...item,
  isLowStock: item.quantityOnHand <= item.lowStockThreshold,
});

const getItemsMap = async () => {
  const snap = await get(ref(database, ITEM_ROOT));
  return snap.val() || {};
};

const ensureSkuUnique = (itemsMap, sku, excludedItemId = "") => {
  const normalizedSku = normalizeSku(sku);
  if (!normalizedSku) return false;

  return !Object.entries(itemsMap).some(([itemId, raw]) => {
    if (excludedItemId && itemId === excludedItemId) return false;
    const candidate = normalizeItem(raw, itemId);
    return normalizeSku(candidate.sku) === normalizedSku;
  });
};

const parseDateBoundary = (value, endOfDay = false) => {
  if (!value) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;

  const hasTime = normalized.includes("T");
  const target = hasTime
    ? new Date(normalized)
    : new Date(`${normalized}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`);

  return Number.isNaN(target.getTime()) ? null : target;
};

const isBetween = (value, fromDate, toDate) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  const time = date.getTime();
  if (fromDate && time < fromDate.getTime()) return false;
  if (toDate && time > toDate.getTime()) return false;
  return true;
};

const getInventoryItems = async (req, res) => {
  try {
    const itemsMap = await getItemsMap();
    const search = normalizeString(req.query.search).toLowerCase();
    const category = normalizeString(req.query.category).toLowerCase();
    const lowStock = String(req.query.lowStock || "").toLowerCase() === "true";
    const currencyFilter = normalizeString(req.query.currency).toUpperCase();

    let items = Object.entries(itemsMap)
      .map(([id, raw]) => normalizeItem(raw, id))
      .map(decorateItem)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

    if (search) {
      items = items.filter((item) => {
        const haystack = `${item.name} ${item.sku} ${item.category}`.toLowerCase();
        return haystack.includes(search);
      });
    }

    if (category) {
      items = items.filter((item) => item.category.toLowerCase() === category);
    }

    if (currencyFilter) {
      items = items.filter((item) => item.currency === currencyFilter);
    }

    if (lowStock) {
      items = items.filter((item) => item.isLowStock);
    }

    return res.status(200).json({ items });
  } catch (error) {
    console.error("getInventoryItems failed:", error);
    return res.status(500).json({ message: "Failed to fetch inventory items" });
  }
};

const createInventoryItem = async (req, res) => {
  try {
    const payload = req.body || {};

    const sku = normalizeSku(payload.sku);
    const name = normalizeString(payload.name);
    if (!sku || !name) {
      return res.status(400).json({ message: "sku and name are required" });
    }

    const currencyInput = parseCurrencyInput(payload.currency);
    if (!currencyInput.ok) {
      return res.status(400).json({ message: currencyInput.message });
    }

    const costPriceInput = parseNumberInput(payload.costPrice, "costPrice");
    const sellPriceInput = parseNumberInput(payload.sellPrice, "sellPrice");
    const quantityInput = parseNumberInput(payload.quantityOnHand, "quantityOnHand");
    const lowStockInput = parseNumberInput(payload.lowStockThreshold, "lowStockThreshold");
    const avgCostInput = parseNumberInput(payload.avgUnitCost, "avgUnitCost");

    const invalid = [costPriceInput, sellPriceInput, quantityInput, lowStockInput, avgCostInput].find((entry) => !entry.ok);
    if (invalid) {
      return res.status(400).json({ message: invalid.message });
    }

    const itemsMap = await getItemsMap();
    if (!ensureSkuUnique(itemsMap, sku)) {
      return res.status(409).json({ message: "SKU already exists" });
    }

    const itemId = randomUUID();
    const now = new Date().toISOString();

    const quantityOnHand = quantityInput.value ?? 0;
    const costPrice = costPriceInput.value ?? 0;
    const avgUnitCost = avgCostInput.value ?? costPrice;

    const item = normalizeItem(
      {
        ...payload,
        id: itemId,
        sku,
        name,
        currency: currencyInput.value || "SYP",
        quantityOnHand,
        costPrice,
        avgUnitCost,
        stockValue: roundAmount(quantityOnHand * avgUnitCost),
        lowStockThreshold: lowStockInput.value ?? 0,
        sellPrice: payload.sellPrice === null || payload.sellPrice === "" ? null : sellPriceInput.value,
        createdAt: now,
        updatedAt: now,
        createdBy: req.userId,
        updatedBy: req.userId,
      },
      itemId
    );

    await set(ref(database, `${ITEM_ROOT}/${itemId}`), item);
    return res.status(201).json({ item: decorateItem(item) });
  } catch (error) {
    console.error("createInventoryItem failed:", error);
    return res.status(500).json({ message: "Failed to create inventory item" });
  }
};

const updateInventoryItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    if (!itemId) return res.status(400).json({ message: "itemId is required" });

    const itemSnap = await get(ref(database, `${ITEM_ROOT}/${itemId}`));
    if (!itemSnap.exists()) return res.status(404).json({ message: "Item not found" });

    const current = normalizeItem(itemSnap.val(), itemId);
    const payload = req.body || {};

    if (payload.quantityOnHand !== undefined && asNumber(payload.quantityOnHand, current.quantityOnHand) !== current.quantityOnHand) {
      return res.status(400).json({ message: "quantityOnHand must be changed through inventory movements" });
    }

    const currencyInput = parseCurrencyInput(payload.currency);
    if (!currencyInput.ok) {
      return res.status(400).json({ message: currencyInput.message });
    }

    const costPriceInput = parseNumberInput(payload.costPrice, "costPrice");
    const sellPriceInput = parseNumberInput(payload.sellPrice, "sellPrice");
    const lowStockInput = parseNumberInput(payload.lowStockThreshold, "lowStockThreshold");
    const avgCostInput = parseNumberInput(payload.avgUnitCost, "avgUnitCost");

    const invalid = [costPriceInput, sellPriceInput, lowStockInput, avgCostInput].find((entry) => !entry.ok);
    if (invalid) {
      return res.status(400).json({ message: invalid.message });
    }

    const nextSku = payload.sku !== undefined ? normalizeSku(payload.sku) : current.sku;
    const nextName = payload.name !== undefined ? normalizeString(payload.name) : current.name;

    if (!nextSku || !nextName) {
      return res.status(400).json({ message: "sku and name are required" });
    }

    const itemsMap = await getItemsMap();
    if (!ensureSkuUnique(itemsMap, nextSku, itemId)) {
      return res.status(409).json({ message: "SKU already exists" });
    }

    const nextAvg = avgCostInput.value ?? current.avgUnitCost;

    const nextItem = normalizeItem(
      {
        ...current,
        ...payload,
        sku: nextSku,
        name: nextName,
        currency: currencyInput.value || current.currency,
        costPrice: costPriceInput.value ?? current.costPrice,
        sellPrice: payload.sellPrice === null || payload.sellPrice === "" ? null : sellPriceInput.value ?? current.sellPrice,
        lowStockThreshold: lowStockInput.value ?? current.lowStockThreshold,
        avgUnitCost: nextAvg,
        stockValue: roundAmount(current.quantityOnHand * nextAvg),
        updatedAt: new Date().toISOString(),
        updatedBy: req.userId,
      },
      itemId
    );

    await update(ref(database, `${ITEM_ROOT}/${itemId}`), nextItem);
    return res.status(200).json({ item: decorateItem(nextItem) });
  } catch (error) {
    console.error("updateInventoryItem failed:", error);
    return res.status(500).json({ message: "Failed to update inventory item" });
  }
};

const addInventoryMovement = async (req, res) => {
  try {
    const { itemId } = req.params;
    if (!itemId) return res.status(400).json({ message: "itemId is required" });

    const itemSnap = await get(ref(database, `${ITEM_ROOT}/${itemId}`));
    if (!itemSnap.exists()) return res.status(404).json({ message: "Item not found" });

    const current = normalizeItem(itemSnap.val(), itemId);
    const payload = req.body || {};

    const type = normalizeString(payload.type).toLowerCase();
    if (!MOVEMENT_TYPES.includes(type)) {
      return res.status(400).json({ message: "Invalid movement type" });
    }

    const movementClass = normalizeString(payload.movementClass, inferMovementClass(type)).toLowerCase();
    if (!MOVEMENT_CLASSES.includes(movementClass)) {
      return res.status(400).json({ message: "Invalid movement class" });
    }

    if (!allowedClassesByType[type].includes(movementClass)) {
      return res.status(400).json({ message: `movementClass ${movementClass} is not valid for type ${type}` });
    }

    const reason = normalizeString(payload.reason);
    if (!reason) {
      return res.status(400).json({ message: "reason is required" });
    }

    const rawQuantity = asNumber(payload.quantity, NaN);
    if (!Number.isFinite(rawQuantity)) {
      return res.status(400).json({ message: "quantity is required" });
    }

    if ((type === "in" || type === "out") && rawQuantity <= 0) {
      return res.status(400).json({ message: "quantity must be greater than 0" });
    }

    if (type === "adjust" && rawQuantity < 0) {
      return res.status(400).json({ message: "adjust quantity cannot be negative" });
    }

    const currencyInput = parseCurrencyInput(payload.currency);
    if (!currencyInput.ok) {
      return res.status(400).json({ message: currencyInput.message });
    }
    if (currencyInput.value && currencyInput.value !== current.currency) {
      return res.status(400).json({ message: "Movement currency must match the item currency" });
    }

    const unitCostInput = parseNumberInput(payload.unitCost, "unitCost");
    const unitSalePriceInput = parseNumberInput(payload.unitSalePrice, "unitSalePrice");
    if (!unitCostInput.ok) {
      return res.status(400).json({ message: unitCostInput.message });
    }
    if (!unitSalePriceInput.ok) {
      return res.status(400).json({ message: unitSalePriceInput.message });
    }

    const balanceBefore = asNonNegative(current.quantityOnHand, 0);
    const avgCostBefore = asNonNegative(current.avgUnitCost, current.costPrice);
    const stockValueBefore = roundAmount(current.stockValue);

    const quantity = rawQuantity;
    let balanceAfter = balanceBefore;
    let avgCostAfter = avgCostBefore;
    let stockValueAfter = stockValueBefore;

    let effectiveUnitCost = unitCostInput.value;
    let effectiveSalePrice = unitSalePriceInput.value;

    let purchaseAmount = 0;
    let cogsAmount = 0;
    let revenueAmount = 0;
    let grossProfit = 0;

    if (type === "in") {
      effectiveUnitCost = effectiveUnitCost ?? current.costPrice ?? avgCostBefore;
      if (!Number.isFinite(effectiveUnitCost) || effectiveUnitCost < 0) {
        return res.status(400).json({ message: "Valid unitCost is required for inbound valuation" });
      }

      balanceAfter = balanceBefore + quantity;
      const inboundValue = quantity * effectiveUnitCost;
      purchaseAmount = movementClass === "purchase" ? inboundValue : 0;
      stockValueAfter = stockValueBefore + inboundValue;
      avgCostAfter = balanceAfter > 0 ? stockValueAfter / balanceAfter : avgCostBefore;
    } else if (type === "out") {
      if (quantity > balanceBefore) {
        return res.status(400).json({ message: "Insufficient stock" });
      }

      balanceAfter = balanceBefore - quantity;
      cogsAmount = quantity * avgCostBefore;
      stockValueAfter = stockValueBefore - cogsAmount;
      if (stockValueAfter < 0) stockValueAfter = 0;
      avgCostAfter = balanceAfter > 0 ? stockValueAfter / balanceAfter : avgCostBefore;

      if (movementClass === "sale") {
        effectiveSalePrice = effectiveSalePrice ?? current.sellPrice;
        if (effectiveSalePrice === null || effectiveSalePrice === undefined || !Number.isFinite(effectiveSalePrice)) {
          return res.status(400).json({ message: "unitSalePrice is required for sale movements" });
        }

        revenueAmount = quantity * effectiveSalePrice;
        grossProfit = revenueAmount - cogsAmount;
      }
    } else {
      balanceAfter = quantity;

      if (effectiveUnitCost !== undefined) {
        avgCostAfter = effectiveUnitCost;
      }

      stockValueAfter = balanceAfter * avgCostAfter;
    }

    const now = new Date().toISOString();
    const movementId = randomUUID();

    const movement = normalizeMovement(
      {
        id: movementId,
        itemId,
        type,
        movementClass,
        quantity,
        unitCost: effectiveUnitCost,
        unitSalePrice: movementClass === "sale" ? effectiveSalePrice : null,
        reason,
        note: normalizeString(payload.note),
        currency: current.currency,
        balanceBefore,
        balanceAfter,
        stockValueBefore,
        stockValueAfter,
        avgCostBefore,
        avgCostAfter,
        purchaseAmount,
        cogsAmount,
        revenueAmount,
        grossProfit,
        linkedUserId: normalizeString(payload.linkedUserId) || null,
        linkedSubscriptionId: normalizeString(payload.linkedSubscriptionId) || null,
        createdBy: req.userId,
        createdAt: now,
      },
      current
    );

    const nextItem = normalizeItem(
      {
        ...current,
        quantityOnHand: roundAmount(balanceAfter),
        avgUnitCost: roundAmount(avgCostAfter),
        stockValue: roundAmount(stockValueAfter),
        updatedAt: now,
        updatedBy: req.userId,
      },
      itemId
    );

    const rootRef = ref(database);
    await update(rootRef, {
      [`${MOVEMENT_ROOT}/${itemId}/${movementId}`]: movement,
      [`${ITEM_ROOT}/${itemId}/quantityOnHand`]: nextItem.quantityOnHand,
      [`${ITEM_ROOT}/${itemId}/avgUnitCost`]: nextItem.avgUnitCost,
      [`${ITEM_ROOT}/${itemId}/stockValue`]: nextItem.stockValue,
      [`${ITEM_ROOT}/${itemId}/updatedAt`]: nextItem.updatedAt,
      [`${ITEM_ROOT}/${itemId}/updatedBy`]: nextItem.updatedBy,
    });

    return res.status(201).json({
      item: decorateItem(nextItem),
      movement,
    });
  } catch (error) {
    console.error("addInventoryMovement failed:", error);
    return res.status(500).json({ message: "Failed to add inventory movement" });
  }
};

const getInventoryMovements = async (req, res) => {
  try {
    const { itemId } = req.params;
    if (!itemId) return res.status(400).json({ message: "itemId is required" });

    const itemSnap = await get(ref(database, `${ITEM_ROOT}/${itemId}`));
    if (!itemSnap.exists()) return res.status(404).json({ message: "Item not found" });

    const item = normalizeItem(itemSnap.val(), itemId);
    const movementsSnap = await get(ref(database, `${MOVEMENT_ROOT}/${itemId}`));
    const movementMap = movementsSnap.val() || {};

    const limitValue = asNumber(req.query.limit, 0);

    let movements = Object.values(movementMap)
      .map((entry) => normalizeMovement(entry, item))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    if (limitValue > 0) {
      movements = movements.slice(0, limitValue);
    }

    return res.status(200).json({
      item: decorateItem(item),
      movements,
    });
  } catch (error) {
    console.error("getInventoryMovements failed:", error);
    return res.status(500).json({ message: "Failed to fetch inventory movements" });
  }
};

const getInventorySummary = async (req, res) => {
  try {
    const itemsMap = await getItemsMap();
    const currencyFilter = normalizeString(req.query.currency).toUpperCase();

    let items = Object.entries(itemsMap).map(([id, raw]) => decorateItem(normalizeItem(raw, id)));
    if (currencyFilter) {
      items = items.filter((item) => item.currency === currencyFilter);
    }

    const activeItems = items.filter((item) => item.isActive);

    const summary = {
      totalItems: activeItems.length,
      lowStockItems: activeItems.filter((item) => item.isLowStock).length,
      totalOnHandUnits: roundAmount(activeItems.reduce((sum, item) => sum + asNonNegative(item.quantityOnHand, 0), 0)),
      totalStockValue: roundAmount(activeItems.reduce((sum, item) => sum + asNonNegative(item.stockValue, 0), 0)),
    };

    return res.status(200).json(summary);
  } catch (error) {
    console.error("getInventorySummary failed:", error);
    return res.status(500).json({ message: "Failed to fetch inventory summary" });
  }
};

const getInventoryAccountingSummary = async (req, res) => {
  try {
    const fromDate = req.query.from ? parseDateBoundary(req.query.from, false) : null;
    const toDate = req.query.to ? parseDateBoundary(req.query.to, true) : null;

    if (req.query.from && !fromDate) {
      return res.status(400).json({ message: "Invalid from date" });
    }
    if (req.query.to && !toDate) {
      return res.status(400).json({ message: "Invalid to date" });
    }

    const currencyFilter = normalizeString(req.query.currency).toUpperCase();
    const categoryFilter = normalizeString(req.query.category).toLowerCase();

    const itemsMap = await getItemsMap();
    const normalizedItems = Object.entries(itemsMap).map(([id, raw]) => decorateItem(normalizeItem(raw, id)));

    const matchedItems = normalizedItems.filter((item) => {
      if (currencyFilter && item.currency !== currencyFilter) return false;
      if (categoryFilter && item.category.toLowerCase() !== categoryFilter) return false;
      return true;
    });

    const matchedById = matchedItems.reduce((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});

    const movementRootSnap = await get(ref(database, MOVEMENT_ROOT));
    const movementRoot = movementRootSnap.val() || {};

    const filteredMovements = [];
    Object.entries(movementRoot).forEach(([itemId, movementMap]) => {
      const item = matchedById[itemId];
      if (!item) return;

      Object.values(movementMap || {}).forEach((entry) => {
        const movement = normalizeMovement(entry, item);
        if (!isBetween(movement.createdAt, fromDate, toDate)) return;
        filteredMovements.push(movement);
      });
    });

    const totals = filteredMovements.reduce(
      (acc, movement) => {
        acc.totalPurchasesValue += movement.movementClass === "purchase" ? movement.purchaseAmount : 0;
        acc.totalCogs += movement.cogsAmount;
        acc.totalRevenue += movement.revenueAmount;
        acc.totalGrossProfit += movement.grossProfit;
        acc.movementsCount += 1;
        if (movement.movementClass === "sale") acc.salesCount += 1;
        if (movement.movementClass === "purchase") acc.purchasesCount += 1;
        return acc;
      },
      {
        totalPurchasesValue: 0,
        totalCogs: 0,
        totalRevenue: 0,
        totalGrossProfit: 0,
        movementsCount: 0,
        salesCount: 0,
        purchasesCount: 0,
      }
    );

    const currencyBreakdown = matchedItems.reduce((acc, item) => {
      const code = item.currency;
      if (!acc[code]) acc[code] = { stockValue: 0, totalItems: 0 };
      acc[code].stockValue += item.stockValue;
      acc[code].totalItems += 1;
      return acc;
    }, {});

    Object.keys(currencyBreakdown).forEach((code) => {
      currencyBreakdown[code] = {
        stockValue: roundAmount(currencyBreakdown[code].stockValue),
        totalItems: currencyBreakdown[code].totalItems,
      };
    });

    return res.status(200).json({
      from: req.query.from || null,
      to: req.query.to || null,
      currency: currencyFilter || null,
      category: categoryFilter || null,
      totalItems: matchedItems.length,
      lowStockItems: matchedItems.filter((item) => item.isLowStock).length,
      currentInventoryValue: roundAmount(matchedItems.reduce((sum, item) => sum + item.stockValue, 0)),
      totalPurchasesValue: roundAmount(totals.totalPurchasesValue),
      totalCogs: roundAmount(totals.totalCogs),
      totalRevenue: roundAmount(totals.totalRevenue),
      totalGrossProfit: roundAmount(totals.totalGrossProfit),
      movementsCount: totals.movementsCount,
      salesCount: totals.salesCount,
      purchasesCount: totals.purchasesCount,
      isMixedCurrency: Object.keys(currencyBreakdown).length > 1,
      currencyBreakdown,
    });
  } catch (error) {
    console.error("getInventoryAccountingSummary failed:", error);
    return res.status(500).json({ message: "Failed to fetch inventory accounting summary" });
  }
};

module.exports = {
  getInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  addInventoryMovement,
  getInventoryMovements,
  getInventorySummary,
  getInventoryAccountingSummary,
};
