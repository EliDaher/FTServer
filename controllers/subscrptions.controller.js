const {
  ref,
  set,
  get,
  update,
  remove,
  query,
  orderByChild,
  equalTo
} = require("firebase/database");
const { database } = require("../firebaseConfig.js");
const { v4: uuidv4 } = require("uuid");

// Helper to calculate end date
function calculateEndDate(start, days) {
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  return end.toISOString().slice(0, 10);
}

// POST /subscriptions
const createSubscription = async (req, res) => {
  try {
    const { userId, planKey } = req.body;
    if (!userId || !planKey) return res.status(400).send("Missing data");

    const plansSnap = await get(ref(database, "subscriptionPlans"));
    const plans = plansSnap.val();
    const plan = plans?.[planKey];

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

    await set(ref(database, `subscriptions/${subId}`), newSub);
    await set(ref(database, `users/${userId}/currentSubscriptionId`), subId);

    return res.status(201).json({ id: subId, ...newSub });
  } catch (err) {
    console.error(err);
    return res.status(500).send("Error creating subscription");
  }
};

// GET /subscriptions
const getAllSubscriptions = async (_, res) => {
  try {
    const snapshot = await get(ref(database, "subscriptions"));
    return res.status(200).json(snapshot.val() || {});
  } catch (err) {
    return res.status(500).send("Error fetching subscriptions");
  }
};

// GET /subscriptions/user/:userId
const getSubscriptionsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const snapshot = await get(
      query(ref(database, "subscriptions"), orderByChild("userId"), equalTo(userId))
    );
    return res.status(200).json(snapshot.val() || {});
  } catch (err) {
    return res.status(500).send("Error fetching user subscriptions");
  }
};

// POST /subscriptions/:subId/payments
const addPayment = async (req, res) => {
  try {
    const { subId } = req.params;
    const { amount, method, note } = req.body;

    if (!amount || !method) return res.status(400).send("Missing payment data");

    const subSnap = await get(ref(database, `subscriptions/${subId}`));
    if (!subSnap.exists()) return res.status(404).send("Subscription not found");

    const subscription = subSnap.val();
    const paymentId = uuidv4();

    const payment = {
      paymentDate: new Date().toISOString().slice(0, 10),
      amount,
      method,
      note: note || ""
    };

    // Add payment
    await set(ref(database, `payments/${subId}/${paymentId}`), payment);

    // Update subscription
    const newAmountPaid = (subscription.amountPaid || 0) + amount;
    let status = "partial";
    if (newAmountPaid >= subscription.amount) status = "paid";
    else if (newAmountPaid === 0) status = "unpaid";

    await update(ref(database, `subscriptions/${subId}`), {
      amountPaid: newAmountPaid,
      paymentStatus: status
    });

    return res.status(200).json({ success: true, payment });
  } catch (err) {
    console.error(err);
    return res.status(500).send("Error adding payment");
  }
};

// DELETE /subscriptions/:subId
const deleteSubscription = async (req, res) => {
  try {
    const { subId } = req.params;
    await remove(ref(database, `subscriptions/${subId}`));
    await remove(ref(database, `payments/${subId}`));
    return res.status(200).send("Subscription deleted");
  } catch (err) {
    return res.status(500).send("Error deleting subscription");
  }
};

// GET /subscriptions/due/:userId
const getUserDueAmount = async (req, res) => {
  const { userId } = req.params;
  try {
    const snapshot = await get(
      query(ref(database, "subscriptions"), orderByChild("userId"), equalTo(userId))
    );
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

// Exports
module.exports = {
  createSubscription,
  getAllSubscriptions,
  getSubscriptionsByUser,
  addPayment,
  deleteSubscription,
  getUserDueAmount
};
