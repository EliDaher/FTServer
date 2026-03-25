const { ref, set, get, update, remove } = require("firebase/database");
const { database } = require("../firebaseConfig.js");

const normalizeCurrency = (currency) => {
  if (typeof currency !== "string") return "SYP";
  const value = currency.trim().toUpperCase();
  return value || "SYP";
};

const normalizePlan = (plan = {}, key = "") => ({
  key,
  name: plan.name || key,
  duration: Number(plan.duration || 0),
  price: Number(plan.price || 0),
  description: plan.description || "",
  currency: normalizeCurrency(plan.currency),
});

const getAllPlans = async (_, res) => {
  try {
    const snapshot = await get(ref(database, "subscriptionPlans"));
    const rawPlans = snapshot.val() || {};

    const normalizedPlans = Object.entries(rawPlans).reduce((acc, [key, value]) => {
      acc[key] = normalizePlan(value, key);
      return acc;
    }, {});

    return res.status(200).json(normalizedPlans);
  } catch (error) {
    return res.status(500).json({ message: "??? ????? ??? ?????", error: error.message });
  }
};

const createPlan = async (req, res) => {
  try {
    const { key, name, duration, price, description, currency } = req.body;

    if (!key || !name || duration === undefined || price === undefined) {
      return res.status(400).json({ message: "?????? ???????? ?????" });
    }

    const planData = normalizePlan({ name, duration, price, description, currency }, key);
    await set(ref(database, `subscriptionPlans/${key}`), planData);

    return res.status(201).json({ message: "?? ????? ?????", plan: planData });
  } catch (error) {
    return res.status(500).json({ message: "??? ????? ????? ?????", error: error.message });
  }
};

const updatePlan = async (req, res) => {
  try {
    const { key } = req.params;
    const { name, duration, price, description, currency } = req.body;

    const existingSnapshot = await get(ref(database, `subscriptionPlans/${key}`));
    if (!existingSnapshot.exists()) {
      return res.status(404).json({ message: "????? ??? ??????" });
    }

    const current = normalizePlan(existingSnapshot.val(), key);
    const nextPlan = normalizePlan(
      {
        ...current,
        name: name ?? current.name,
        duration: duration ?? current.duration,
        price: price ?? current.price,
        description: description ?? current.description,
        currency: currency ?? current.currency,
      },
      key
    );

    await update(ref(database, `subscriptionPlans/${key}`), nextPlan);
    return res.status(200).json({ message: "?? ???????", plan: nextPlan });
  } catch (error) {
    return res.status(500).json({ message: "??? ????? ???????", error: error.message });
  }
};

const deletePlan = async (req, res) => {
  try {
    const { key } = req.params;
    await remove(ref(database, `subscriptionPlans/${key}`));
    return res.status(200).json({ message: "?? ??? ?????" });
  } catch (error) {
    return res.status(500).json({ message: "??? ????? ?????", error: error.message });
  }
};

module.exports = {
  getAllPlans,
  createPlan,
  updatePlan,
  deletePlan,
};
