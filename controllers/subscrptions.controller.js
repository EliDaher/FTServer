import { Request, Response } from "express";
import { db } from "../firebase";
import { v4 as uuidv4 } from "uuid";

// Helper to calculate end date
function calculateEndDate(start, days) {
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  return end.toISOString().slice(0, 10);
}

// POST /subscriptions
export const createSubscription = async (req, res) => {
  try {
    const { userId, planKey } = req.body;
    if (!userId || !planKey) return res.status(400).send("Missing data");

    const plansSnap = await db.ref("subscriptionPlans").once("value");
    const plans = plansSnap.val();
    const plan = plans[planKey];

    if (!plan) return res.status(400).send("Invalid plan");

    const startDate = new Date();
    const endDate = calculateEndDate(startDate, plan.durationDays);
    const subId = uuidv4();

    const newSub = {
      id: subId,
      userId,
      planName: plan.name,
      startDate: startDate.toISOString().slice(0, 10),
      endDate,
      amount: plan.price,
      amountPaid: 0,
      paymentStatus: "unpaid",
      createdAt: new Date().toISOString()
    };

    await db.ref(`subscriptions/${subId}`).set(newSub);
    await db.ref(`users/${userId}/currentSubscriptionId`).set(subId);

    return res.status(201).json({ id: subId, ...newSub });
  } catch (err) {
    return res.status(500).send("Error creating subscription");
  }
};

// GET /subscriptions
export const getAllSubscriptions = async (_, res) => {
  try {
    const snapshot = await db.ref("subscriptions").once("value");
    return res.status(200).json(snapshot.val() || {});
  } catch (err) {
    return res.status(500).send("Error fetching subscriptions");
  }
};

// GET /subscriptions/user/:userId
export const getSubscriptionsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const snapshot = await db.ref("subscriptions").orderByChild("userId").equalTo(userId).once("value");
    return res.status(200).json(snapshot.val() || {});
  } catch (err) {
    return res.status(500).send("Error fetching user subscriptions");
  }
};

// POST /subscriptions/:subId/payments
export const addPayment = async (req, res) => {
  try {
    const { subId } = req.params;
    const { amount, method, note } = req.body;

    if (!amount || !method) return res.status(400).send("Missing payment data");

    const subRef = db.ref(`subscriptions/${subId}`);
    const subSnap = await subRef.once("value");
    if (!subSnap.exists()) return res.status(404).send("Subscription not found");

    const paymentId = uuidv4();
    const payment = {
      paymentDate: new Date().toISOString().slice(0, 10),
      amount,
      method,
      note: note || ""
    };

    // Add payment
    await db.ref(`payments/${subId}/${paymentId}`).set(payment);

    // Update subscription status
    const subscription = subSnap.val();
    const newAmountPaid = (subscription.amountPaid || 0) + amount;
    let status = "partial";
    if (newAmountPaid >= subscription.amount) status = "paid";
    else if (newAmountPaid === 0) status = "unpaid";

    await subRef.update({
      amountPaid: newAmountPaid,
      paymentStatus: status
    });

    return res.status(200).json({ success: true, payment });
  } catch (err) {
    return res.status(500).send("Error adding payment");
  }
};

// DELETE /subscriptions/:subId
export const deleteSubscription = async (req, res) => {
  try {
    const { subId } = req.params;
    await db.ref(`subscriptions/${subId}`).remove();
    await db.ref(`payments/${subId}`).remove();
    return res.status(200).send("Subscription deleted");
  } catch (err) {
    return res.status(500).send("Error deleting subscription");
  }
};


export const getUserDueAmount = async (req, res) => {
  const { userId } = req.params;
  try {
    const snapshot = await db
      .ref("subscriptions")
      .orderByChild("userId")
      .equalTo(userId)
      .once("value");

    const subs = snapshot.val();
    if (!subs) return res.status(404).send("لا يوجد اشتراكات");

    const result = Object.values(subs).map((sub) => ({
      subscriptionId: sub.id,
      planName: sub.planName,
      amount: sub.amount,
      amountPaid: sub.amountPaid || 0,
      remaining: sub.amount - (sub.amountPaid || 0),
      paymentStatus: sub.paymentStatus
    }));

    return res.json(result);
  } catch (error) {
    return res.status(500).send("خطأ أثناء الحساب");
  }
};
