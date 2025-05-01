const { ref, set, get } = require("firebase/database");
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
        allowed_formats: ['jpg', 'jpeg', 'png'],
        transformation: [{ width: 500, height: 500, crop: 'limit' }],
    },
});

const upload = multer({ storage });

// دالة إنشاء تمرين
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

        if (!req.file || !req.file.path) {
            return res.status(400).json({ error: 'Image file is required.' });
        }

        const imageUrl = req.file.path; // رابط Cloudinary النهائي

        // التحقق من وجود التمرين
        const ExerciseRef = ref(database, `exercise/${exerciseName}`);
        const snapshot = await get(ExerciseRef);

        if (snapshot.exists()) {
            return res.status(400).json({ error: "Exercise already exists." });
        }

        // الحفظ في قاعدة البيانات
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
    return res.status(200).json({ success: true, exercises: exerciseData });
};


// جلب تمرين حسب اسم التمرين
const getExerciseByName = async (req, res) => {

    
    const {
        exerciseName,
    } = req.body;

    const exerciseRef = ref(database, `exercise/${exerciseName}`);
    const snapshot = await get(exerciseRef);

    if (!snapshot.exists()) {
        return res.status(404).json({ error: "exercise not found." });
    }

    const exerciseData = snapshot.val();
    return res.status(200).json({ success: true, exercise: exerciseData });
};

module.exports = {
    createExercise,
    getAllExercises,
    getExerciseByName
};
