const { randomUUID } = require("crypto");
const { ref, get, set, update } = require("firebase/database");
const { database } = require("../firebaseConfig.js");

const ITEM_ROOT = "inventoryItems";
const MOVEMENT_ROOT = "inventoryMovements";

const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
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

const normalizeItem = (item = {}, id = "") => {
  const createdAt = item.createdAt || new Date().toISOString();
  const updatedAt = item.updatedAt || createdAt;

  const quantityOnHand = asNonNegative(item.quantityOnHand, 0);
  const lowStockThreshold = asNonNegative(item.lowStockThreshold, 0);

  return {
    id: id || item.id || randomUUID(),
    sku: normalizeSku(item.sku),
    name: normalizeString(item.name),
    category: normalizeString(item.category),
    unit: normalizeString(item.unit, "piece"),
    costPrice: asNonNegative(item.costPrice, 0),
    sellPrice: item.sellPrice === undefined || item.sellPrice === null || item.sellPrice === "" ? null : asNonNegative(item.sellPrice, 0),
    quantityOnHand,
    lowStockThreshold,
    isActive: item.isActive !== false,
    createdAt,
    updatedAt,
    createdBy: item.createdBy || "system",
    updatedBy: item.updatedBy || item.createdBy || "system",
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

const getInventoryItems = async (req, res) => {
  try {
    const itemsMap = await getItemsMap();
    const search = normalizeString(req.query.search).toLowerCase();
    const category = normalizeString(req.query.category).toLowerCase();
    const lowStock = String(req.query.lowStock || "").toLowerCase() === "true";

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

    const itemsMap = await getItemsMap();
    if (!ensureSkuUnique(itemsMap, sku)) {
      return res.status(409).json({ message: "SKU already exists" });
    }

    const itemId = randomUUID();
    const now = new Date().toISOString();

    const item = normalizeItem(
      {
        ...payload,
        id: itemId,
        sku,
        name,
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

    const nextSku = payload.sku !== undefined ? normalizeSku(payload.sku) : current.sku;
    const nextName = payload.name !== undefined ? normalizeString(payload.name) : current.name;

    if (!nextSku || !nextName) {
      return res.status(400).json({ message: "sku and name are required" });
    }

    const itemsMap = await getItemsMap();
    if (!ensureSkuUnique(itemsMap, nextSku, itemId)) {
      return res.status(409).json({ message: "SKU already exists" });
    }

    const nextItem = normalizeItem(
      {
        ...current,
        ...payload,
        sku: nextSku,
        name: nextName,
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
    if (!["in", "out", "adjust"].includes(type)) {
      return res.status(400).json({ message: "Invalid movement type" });
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

    const balanceBefore = asNonNegative(current.quantityOnHand, 0);
    let balanceAfter = balanceBefore;

    if (type === "in") {
      balanceAfter = balanceBefore + rawQuantity;
    } else if (type === "out") {
      if (rawQuantity > balanceBefore) {
        return res.status(400).json({ message: "Insufficient stock" });
      }
      balanceAfter = balanceBefore - rawQuantity;
    } else {
      balanceAfter = rawQuantity;
    }

    const now = new Date().toISOString();
    const movementId = randomUUID();

    const movement = {
      id: movementId,
      itemId,
      type,
      quantity: rawQuantity,
      unitCost: payload.unitCost === undefined || payload.unitCost === null || payload.unitCost === "" ? null : asNonNegative(payload.unitCost, 0),
      reason,
      note: normalizeString(payload.note),
      balanceBefore,
      balanceAfter,
      createdBy: req.userId,
      createdAt: now,
    };

    const nextItem = normalizeItem(
      {
        ...current,
        quantityOnHand: balanceAfter,
        updatedAt: now,
        updatedBy: req.userId,
      },
      itemId
    );

    await set(ref(database, `${MOVEMENT_ROOT}/${itemId}/${movementId}`), movement);
    await update(ref(database, `${ITEM_ROOT}/${itemId}`), {
      quantityOnHand: nextItem.quantityOnHand,
      updatedAt: nextItem.updatedAt,
      updatedBy: nextItem.updatedBy,
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

    const movementsSnap = await get(ref(database, `${MOVEMENT_ROOT}/${itemId}`));
    const movementMap = movementsSnap.val() || {};

    const limitValue = asNumber(req.query.limit, 0);

    let movements = Object.values(movementMap).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (limitValue > 0) {
      movements = movements.slice(0, limitValue);
    }

    return res.status(200).json({
      item: decorateItem(normalizeItem(itemSnap.val(), itemId)),
      movements,
    });
  } catch (error) {
    console.error("getInventoryMovements failed:", error);
    return res.status(500).json({ message: "Failed to fetch inventory movements" });
  }
};

const getInventorySummary = async (_, res) => {
  try {
    const itemsMap = await getItemsMap();
    const items = Object.entries(itemsMap).map(([id, raw]) => decorateItem(normalizeItem(raw, id)));
    const activeItems = items.filter((item) => item.isActive);

    const summary = {
      totalItems: activeItems.length,
      lowStockItems: activeItems.filter((item) => item.isLowStock).length,
      totalOnHandUnits: activeItems.reduce((sum, item) => sum + asNonNegative(item.quantityOnHand, 0), 0),
    };

    return res.status(200).json(summary);
  } catch (error) {
    console.error("getInventorySummary failed:", error);
    return res.status(500).json({ message: "Failed to fetch inventory summary" });
  }
};

module.exports = {
  getInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  addInventoryMovement,
  getInventoryMovements,
  getInventorySummary,
};
