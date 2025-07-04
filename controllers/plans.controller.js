const {
  ref,
  set,
  get,
  update,
  remove,
} = require("firebase/database");
const { database } = require("../firebaseConfig.js");

// 🔹 GET /plans — جلب جميع الخطط
const getAllPlans = async (_, res) => {
  try {
    const snapshot = await get(ref(database, "subscriptionPlans"));
    const plans = snapshot.val() || {};
    return res.status(200).json(plans);
  } catch (error) {
    return res.status(500).json({ message: "خطأ أثناء جلب الخطط", error });
  }
};

// 🔹 POST /plans — إنشاء خطة جديدة
const createPlan = async (req, res) => {
  try {
    const { key, name, duration, price, description } = req.body;

    if (!key || !name || !duration || !price)
      return res.status(400).json({ message: "الحقول المطلوبة ناقصة" });

    const planData = {
      name,
      duration,
      price,
      description: description || ""
    };

    await set(ref(database, `subscriptionPlans/${key}`), planData);
    return res.status(201).json({ message: "تم إنشاء الخطة", plan: planData });
  } catch (error) {
    return res.status(500).json({ message: "خطأ أثناء إنشاء الخطة", error });
  }
};

// 🔹 PUT /plans/:key — تعديل خطة
const updatePlan = async (req, res) => {
  try {
    const { key } = req.params;
    const { name, duration, price, description } = req.body;

    const updates = {};
    if (name) updates.name = name;
    if (duration) updates.duration = duration;
    if (price) updates.price = price;
    if (description !== undefined) updates.description = description;

    await update(ref(database, `subscriptionPlans/${key}`), updates);
    return res.status(200).json({ message: "تم التعديل", updates });
  } catch (error) {
    return res.status(500).json({ message: "خطأ أثناء التعديل", error });
  }
};

// 🔹 DELETE /plans/:key — حذف خطة
const deletePlan = async (req, res) => {
  try {
    const { key } = req.params;
    await remove(ref(database, `subscriptionPlans/${key}`));
    return res.status(200).json({ message: "تم حذف الخطة" });
  } catch (error) {
    return res.status(500).json({ message: "خطأ أثناء الحذف", error });
  }
};

module.exports = {
    getAllPlans,
    createPlan,
    updatePlan,
    deletePlan,
}
