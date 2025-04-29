const path = require('path');
const fs = require('fs');
const multer = require('multer');

// 1. إعداد مجلد الحفظ
const uploadDir = path.join(__dirname, '..', 'assets', 'exerciseImages');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 2. إعداد multer داخليًا
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({ storage });

// 3. دالة المعالجة
const createExercise = async (req, res) => {
    upload.single('imageFile')(req, res, function (err) {
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

        if (!req.file) {
            return res.status(400).json({ error: 'Image file is required.' });
        }

        const imageUrl = `/assets/exerciseImages/${req.file.filename}`;

        // هنا يمكنك حفظ التمرين في قاعدة بيانات
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

module.exports = {
    createExercise
};
