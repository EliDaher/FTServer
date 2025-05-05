const { ref, set, get, update } = require("firebase/database");
const { database } = require('../firebaseConfig.js');

// Add Workout
const addWorkOut = async (req, res) => {
  try {
    const { newWorkOut } = req.body;

    if (!newWorkOut || !newWorkOut.id || !newWorkOut.title) {
      return res.status(400).json({ error: "Workout data, id, and title are required." });
    }

    const workoutId = newWorkOut.id;
    const workOutRef = ref(database, `workOuts/${workoutId}`);
    const snapshot = await get(workOutRef);

    if (snapshot.exists()) {
      return res.status(400).json({ error: "Workout with this ID already exists." });
    }

    const workoutData = {
      ...newWorkOut,
      createdAt: newWorkOut.createdAt || new Date().toISOString(),
    };

    await set(workOutRef, workoutData);
    return res.status(200).json({ success: true, message: "Workout added successfully.", id: workoutId });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Get All Workouts
const getAllWorkOuts = async (req, res) => {
  try {
    const workOutRef = ref(database, `workOuts`);
    const snapshot = await get(workOutRef);

    if (!snapshot.exists()) {
      return res.status(404).json({ error: "No workouts found." });
    }

    const data = snapshot.val();
    const workoutsArray = Object.values(data);

    return res.status(200).json({ success: true, workOuts: workoutsArray });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

// Get Workout by ID
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

// Update Workout
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
  getAllWorkOuts,
  getWorkOut,
  updateWorkOut,
};
