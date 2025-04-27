const { ref, update, get } = require("firebase/database");
const { database } = require('../firebaseConfig.js')



// add height
const addHeight = async (req, res) => {
    try {
        const { username, height } = req.body;

        if (!username || !height) {
            return res.status(400).json({ error: "All fields are required." });
        }

        const UserRef = ref(database, `users/${username}`);
        const snapshot = await get(UserRef);

        if (!snapshot.exists()) {
            return res.status(400).json({ error: "Username Didn't exists." });
        }

        await update(UserRef, {
            height: height
        });

        return res.status(200).json({ success: true, message: "height Added successfully." });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// add gender
const addGender = async (req, res) => {
    try {
        const { username, gender } = req.body;

        if (!username || !gender) {
            return res.status(400).json({ error: "All fields are required." });
        }

        const UserRef = ref(database, `users/${username}`);
        const snapshot = await get(UserRef);

        if (!snapshot.exists()) {
            return res.status(400).json({ error: "Username Didn't exists." });
        }

        await update(UserRef, {
            gender: gender
        });

        return res.status(200).json({ success: true, message: "gender Added successfully." });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

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

module.exports = { addWeight, addHeight, addGender };
