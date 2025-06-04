const { ref, set, get, push } = require("firebase/database");
const { database } = require('../firebaseConfig.js');

// إضافة set جديد
const addSets = async (req, res) => {
    try {
        const { title, value } = req.body;

        if (!title || !value) {
            return res.status(400).json({ error: "All fields are required." });
        }

        const setsRef = ref(database, 'sets');
        const snapshot = await get(setsRef);

        // التحقق إذا كان هناك عنوان مكرر
        if (snapshot.exists()) {
            const data = snapshot.val();
            const exists = Object.values(data).some(set => set.title === title);
            if (exists) {
                return res.status(400).json({ error: "Title already exists." });
            }
        }

        // إضافة العنصر
        await push(setsRef, { title, value });

        return res.status(200).json({ success: true, message: "Set added successfully." });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// جلب كل الـ sets
const getSets = async (req, res) => {
    try {
        const setsRef = ref(database, 'sets');
        const snapshot = await get(setsRef);

        if (!snapshot.exists()) {
            return res.status(404).json({ error: "No sets found." });
        }

        const userData = snapshot.val();

        return res.status(200).json({
            success: true,
            message: "Sets retrieved successfully.",
            userData: JSON.parse(JSON.stringify(userData))
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

module.exports = { addSets, getSets };
