const { ref, set, get, update, remove, child } = require("firebase/database");
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

    // حذف "اليوم 0" فقط
    const filteredWorkouts = newWorkOut.workouts.filter(w => w.workoutName !== "اليوم 0");

    // إنشاء نسخة جديدة من newWorkOut مع حذف اليوم 0
    const cleanedWorkout = {
      ...newWorkOut,
      workouts: filteredWorkouts,
      createdAt: newWorkOut.createdAt || new Date().toISOString()
    };

    // حفظ الكائن كما هو
    await set(fullWorkoutRef, cleanedWorkout);

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

const getWorkoutCategories = async (req, res) => {
  try {
    const snapshot = await get(child(ref(database), 'categories/workout'));

    if (snapshot.exists()) {
      const data = snapshot.val();
      const categoriesArray = Object.keys(data); // نحولها إلى مصفوفة
      res.status(200).json(categoriesArray);
    } else {
      res.status(200).json([]);
    }
  } catch (error) {
    res.status(500).json({ message: "Error fetching categories", error });
  }
};

// 🔹 إضافة فئة جديدة
const addWorkoutCategory = async (req, res) => {
  try {
    const { categoryName } = req.body;

    if (!categoryName) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const categoryRef = ref(database, 'categories/workout');

    await update(categoryRef, {
      [categoryName]: true
    });

    res.status(200).json({ message: `Category '${categoryName}' added successfully` });
  } catch (error) {
    res.status(500).json({ message: "Error adding category", error });
  }
};

const getFullWorkoutById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Workout ID is required." });
    }

    const workOutRef = ref(database, `fullWorkout/${id}`);
    const snapshot = await get(workOutRef);

    if (!snapshot.exists()) {
      return res.status(404).json({ error: "Workout not found." });
    }

    return res.status(200).json({ success: true, workout: snapshot.val() });
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
  addWorkoutCategory,
  getWorkoutCategories,
  getFullWorkoutById,
  
};
