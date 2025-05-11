const { ref, set, get, update, remove } = require("firebase/database");
const { database } = require('../firebaseConfig.js');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// إعداد Cloudinary
cloudinary.config({
    cloud_name: 'dbz4tyulh',      // استبدلها بـ اسم حسابك في Cloudinary
    api_key: '931519516189279',       // API Key من Cloudinary
    api_secret: '5lRhswZI92JB_NbY7Lq0AbcN32w'       // API Secret من Cloudinary
});

// إعداد multer مع Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'exerciseImages',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
        transformation: [
            { width: 500, height: 500, crop: 'limit', flags: 'animated' } // لدعم gif المتحركة
        ],
    },
});

const upload = multer({ storage });

const createExercise = async (req, res) => {
    upload.single('imageFile')(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: 'Multer error', details: err.message });
        } else if (err) {
            return res.status(500).json({ error: 'Server error', details: err.message });
        }

        const {
            exerciseName,
            category,
            bodyPart,
            difficulty,
            description,
            commonMistakes
        } = req.body;

        // 🔄 استخدم صورة افتراضية إذا لم يتم رفع صورة
        const imageUrl = req.file && req.file.path 
            ? req.file.path 
            : ''; // رابط صورة افتراضية مناسبة

        const ExerciseRef = ref(database, `exercise/${exerciseName}`);
        const snapshot = await get(ExerciseRef);

        if (snapshot.exists()) {
            return res.status(400).json({ error: "Exercise already exists." });
        }

        await set(ExerciseRef, {
            exerciseName,
            category,
            bodyPart,
            difficulty,
            description,
            commonMistakes,
            imageUrl
        });

        console.log('تم استلام التمرين:', {
            exerciseName,
            category,
            bodyPart,
            difficulty,
            description,
            commonMistakes,
            imageUrl
        });

        return res.status(201).json({
            message: 'تم حفظ التمرين بنجاح!',
            data: {
                exerciseName,
                category,
                bodyPart,
                difficulty,
                description,
                commonMistakes,
                imageUrl
            }
        });
    });
};

// دالة جلب كل التمارين
const getAllExercises = async (req, res) => {
    const exerciseRef = ref(database, `exercise`);
    const snapshot = await get(exerciseRef);

    if (!snapshot.exists()) {
        return res.status(404).json({ error: "exercises not found." });
    }

    const exerciseData = snapshot.val();
    return res.status(200).json({ exercises: exerciseData });
};


// جلب تمرين حسب اسم التمرين
// GET /exercise?name=pushup
const getExerciseByName = async (req, res) => {
    const { name } = req.query;

    if (!name) {
        return res.status(400).json({ error: "Missing exercise name" });
    }

    const exerciseRef = ref(database, `exercise/${name}`);
    const snapshot = await get(exerciseRef);

    if (!snapshot.exists()) {
        return res.status(404).json({ error: "Exercise not found." });
    }

    const exerciseData = snapshot.val();
    return res.status(200).json({ exercise: exerciseData });
};

const updateExercise = async (req, res) => {

    try {
        const { editedData, name } = req.body;

        if ( !editedData ) {
            return res.status(400).json({ error: "All fields are required." });
        }

        const UserRef = ref(database, `exercise/${name}`);
        const snapshot = await get(UserRef);

        if (!snapshot.exists()) {
            return res.status(400).json({ error: "Exercise Didn't exists." });
        }

        await update(UserRef, editedData);

        return res.status(200).json({ success: true, message: "Data Updated Successfully." });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }

}

const deleteExercise = async (req, res) => {
    try {
      const { name } = req.body;
  
      if (!name) {
        return res.status(400).json({ error: "Exercise name is required." });
      }
  
      const exerciseRef = ref(database, `exercise/${name}`);
      const snapshot = await get(exerciseRef);
  
      if (!snapshot.exists()) {
        return res.status(404).json({ error: "Exercise does not exist." });
      }
  
      await remove(exerciseRef);
  
      return res.status(200).json({ success: true, message: "Exercise deleted successfully." });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
};
  
module.exports = {
    createExercise,
    getAllExercises,
    getExerciseByName,
    updateExercise,
    deleteExercise,
};
