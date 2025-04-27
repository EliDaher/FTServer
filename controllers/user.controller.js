const { ref, set, get } = require("firebase/database");
const { database } = require('../firebaseConfig.js');

// add weight
const addWeight = async (req, res) => {
    try {
        const { username, weight } = req.body;

        if (!username || !weight) {
            return res.status(400).json({ error: "All fields are required." });
        }

        const UserRef = ref(database, `users/${username}`);
        const snapshot = await get(UserRef);

        if (!snapshot.exists()) {
            return res.status(400).json({ error: "Username Didn't exists." });
        }

        await update(UserRef, {
            weight: weight
        });

        return res.status(200).json({ success: true, message: "Weight Added successfully." });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

module.exports = { addWeight };
