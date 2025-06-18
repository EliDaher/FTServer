import { Request, Response } from "express";
import { db } from "../firebase";

// 🔹 GET /plans — جلب جميع الخطط
export const getAllPlans = async (_, res) => {
  try {
    const snapshot = await db.ref("subscriptionPlans").once("value");
    const plans = snapshot.val() || {};
    return res.status(200).json(plans);
  } catch (error) {
    return res.status(500).json({ message: "خطأ أثناء جلب الخطط", error });
  }
};

// 🔹 POST /plans — إنشاء خطة جديدة
export const createPlan = async (req, res) => {
  try {
    const { key, name, durationDays, price, description } = req.body;

    if (!key || !name || !durationDays || !price)
      return res.status(400).json({ message: "الحقول المطلوبة ناقصة" });

    const planData = {
      name,
      durationDays,
      price,
      description: description || ""
    };

    await db.ref(`subscriptionPlans/${key}`).set(planData);
    return res.status(201).json({ message: "تم إنشاء الخطة", plan: planData });
  } catch (error) {
    return res.status(500).json({ message: "خطأ أثناء إنشاء الخطة", error });
  }
};

// 🔹 PUT /plans/:key — تعديل خطة
export const updatePlan = async (req, res) => {
  try {
    const { key } = req.params;
    const { name, durationDays, price, description } = req.body;

    const updates = {};
    if (name) updates.name = name;
    if (durationDays) updates.durationDays = durationDays;
    if (price) updates.price = price;
    if (description !== undefined) updates.description = description;

    await db.ref(`subscriptionPlans/${key}`).update(updates);
    return res.status(200).json({ message: "تم التعديل", updates });
  } catch (error) {
    return res.status(500).json({ message: "خطأ أثناء التعديل", error });
  }
};

// 🔹 DELETE /plans/:key — حذف خطة
export const deletePlan = async (req, res) => {
  try {
    const { key } = req.params;
    await db.ref(`subscriptionPlans/${key}`).remove();
    return res.status(200).json({ message: "تم حذف الخطة" });
  } catch (error) {
    return res.status(500).json({ message: "خطأ أثناء الحذف", error });
  }
};
