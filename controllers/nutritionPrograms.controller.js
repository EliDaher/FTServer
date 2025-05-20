const { ref, set, get } = require("firebase/database");
const { database } = require('../firebaseConfig.js');

// add nutrition program
const AddNutritionProgram = async (req, res) => {
    try {
        const program = req.body;
        const db = getDatabase();
        const newRef = push(ref(db, "nutritionPrograms"));

        await set(newRef, {
          ...program,
          createdAt: new Date().toISOString(),
        });

        res.status(201).json({ message: "تمت الإضافة بنجاح" });
    } catch (error) {
        console.error("فشل الإضافة:", error);
        res.status(500).json({ error: "حدث خطأ في السيرفر" });
    }
};

// get all nutrition programs
const getAllNutritionPrograms = async (req, res) => {
    try {

        const nutritionRef = ref(database, `nutritionPrograms`);
        const snapshot = await get(nutritionRef);

        if (!snapshot.exists()) {
            return res.status(404).json({ error: "User not found." });
        }

        const nutritionData = snapshot.val();

        return res.status(200).json({ success: true, message: "Logged in successfully.", nutritionData: JSON.parse(JSON.stringify(nutritionData)) });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

module.exports = { AddNutritionProgram, getAllNutritionPrograms };
