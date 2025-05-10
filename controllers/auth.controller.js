const { ref, set, get } = require("firebase/database");
const { database } = require('../firebaseConfig.js');

// Sign Up
const SignUp = async (req, res) => {
    try {
        const { email, password, username, fullname } = req.body;

        if (!email || !password || !username || !fullname) {
            return res.status(400).json({ error: "All fields are required." });
        }

        const UserRef = ref(database, `users/${username}`);
        const snapshot = await get(UserRef);

        if (snapshot.exists()) {
            return res.status(400).json({ error: "Username already exists." });
        }

        await set(UserRef, {
            fullname,
            username,
            password, // لاحقاً سنشفره!
            email,
        });

        return res.status(200).json({ success: true, message: "User created successfully." });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// Login
const Login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required." });
        }

        const UserRef = ref(database, `users/${username}`);
        const snapshot = await get(UserRef);

        if (!snapshot.exists()) {
            return res.status(404).json({ error: "User not found." });
        }

        const userData = snapshot.val();

        if (userData.password !== password) {
            return res.status(401).json({ error: "Invalid credentials." });
        }

        return res.status(200).json({ success: true, message: "Logged in successfully.", userData: userData });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

module.exports = { SignUp, Login };
