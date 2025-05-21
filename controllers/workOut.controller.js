const { ref, set, get, update, remove } = require("firebase/database");
const { database } = require('../firebaseConfig.js');

// Add Workout
const addWorkOut = async (req, res) => {
  try {
    const { newWorkOut } = req.body;

    // تحقق من وجود البيانات الأساسية
    if (!newWorkOut || !newWorkOut.id || !newWorkOut.title) {
      return res.status(400).json({ error: "Workout data, id, and title are required." });
    }
    if (!Array.isArray(newWorkOut.workouts)) {
      return res.status(400).json({ error: "Workouts array is required." });
    }

    const workoutId = newWorkOut.id;
    const fullWorkoutRef = ref(database, `fullWorkout/${workoutId}`);
    const snapshot = await get(fullWorkoutRef);

    if (snapshot.exists()) {
      return res.status(400).json({ error: "Workout with this ID already exists." });
    }

    // حذف "اليوم 0"
    const filteredWorkouts = newWorkOut.workouts.filter(w => w.workoutName !== "اليوم 0");

    // تحقق من صحة كل تمرين فرعي
    for (const workoutObj of filteredWorkouts) {
      if (!workoutObj.workout || !workoutObj.workout.id) {
        return res.status(400).json({ error: "Each workout must contain a valid 'workout' object with an 'id'." });
      }
    }

    // حفظ التمارين بشكل مستقل بشكل متوازٍ
    await Promise.all(
      filteredWorkouts.map(workoutObj => {
        const workoutData = {
          ...workoutObj.workout,
          createdAt: workoutObj.workout.createdAt || new Date().toISOString(),
        };
        const singleWorkoutRef = ref(database, `workOuts/${workoutData.id}`);
        return set(singleWorkoutRef, workoutData);
      })
    );

    // تحضير نسخة لـ fullWorkout مع تحويل كل workout إلى ID فقط
    const fullWorkoutData = {
      ...newWorkOut,
      workouts: filteredWorkouts.map(w => w.workout.id),
      createdAt: newWorkOut.createdAt || new Date().toISOString(),
    };

    // حفظ النسخة المجمعة
    await set(fullWorkoutRef, fullWorkoutData);

    return res.status(200).json({
      success: true,
      message: "Workout added successfully.",
      id: workoutId
    });

  } catch (error) {
    console.error("Error in addWorkOut:", error);
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

// Delete Workout
const deleteWorkOut = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Workout ID is required." });
    }

    const workOutRef = ref(database, `workOuts/${id}`);
    await remove(workOutRef);

    return res.status(200).json({ success: true, message: "Workout deleted successfully." });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};


//اعادة البرامج التدريبية كاملة
const getAllFullWorkout = async (req, res) => {
  try {

    const workOutRef = ref(database, `fullWorkout`);
    const snapshot = await get(workOutRef);

    if (!snapshot.exists()) {
      return res.status(404).json({ error: "Workout not found." });
    }

    return res.status(200).json({ fullWorkouts: snapshot.val() });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

// حزف برناج تدريبي 
const deleteFullWorkout = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Workout ID is required." });
    }

    const workOutRef = ref(database, `fullWorkout/${id}`);
    await remove(workOutRef);

    return res.status(200).json({ success: true, message: "Workout deleted successfully." });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

module.exports = {
  addWorkOut,
  getAllWorkOuts,
  getWorkOut,
  updateWorkOut,
  deleteWorkOut,
  getAllFullWorkout,
  deleteFullWorkout,
  
};
