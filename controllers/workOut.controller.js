const { ref, set, get } = require("firebase/database");
const { database } = require('../firebaseConfig.js');
const { v4: uuidv4 } = require('uuid');

// addWorkOut controller
const addWorkOut = async (req, res) => {
  try {
    const { newWorkOut } = req.body;

    if (!newWorkOut || !newWorkOut.title) {
      return res.status(400).json({ error: "Workout data and title are required." });
    }

    const workoutId = workOutRef.id; 
    const workOutRef = ref(database, `workOuts/${workoutId}`);

    const workoutData = {
      ...newWorkOut,
      id: workoutId,
      createdAt: new Date().toISOString()
    };

    await set(workOutRef, workoutData);

    return res.status(200).json({ success: true, message: "Workout added successfully.", id: workoutId });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Get All WorkOuts
const getAllWorkOuts = async (req, res) => {
  try {
    const workOutRef = ref(database, `workOuts`);
    const snapshot = await get(workOutRef);

    if (!snapshot.exists()) {
      return res.status(404).json({ error: "Workout not found." });
    }

    return res.status(200).json({ success: true, workOuts: snapshot.val() });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Get WorkOut by ID
const getWorkOut = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Workout ID is required." });
    }

    const workOutRef = ref(database, `workOuts/${id}`);
    const snapshot = await get(workOutRef);

    if (!snapshot.exists()) {
      return res.status(404).json({ error: "Workout not found." });
    }

    return res.status(200).json({ success: true, workOut: snapshot.val() });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Update WorkOut by ID
const updateWorkOut = async (req, res) => {
  try {
    const { id } = req.params;
    const { updatedWorkOut } = req.body;

    if (!id || !updatedWorkOut) {
      return res.status(400).json({ error: "Workout ID and update data are required." });
    }

    const workOutRef = ref(database, `workOuts/${id}`);
    await update(workOutRef, updatedWorkOut);

    return res.status(200).json({ success: true, message: "Workout updated successfully." });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

module.exports = { 
  addWorkOut,
  getWorkOut,
  updateWorkOut,
  getAllWorkOuts,
};
