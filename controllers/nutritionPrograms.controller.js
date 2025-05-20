const { ref, set, get, push, remove, update, child } = require("firebase/database");
const { database } = require('../firebaseConfig.js');

// ✅ إضافة برنامج غذائي
const AddNutritionProgram = async (req, res) => {
  try {
    const program = req.body;
    const newRef = push(ref(database, "nutritionPrograms"));

    await set(newRef, {
      ...program,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({ message: "تمت الإضافة بنجاح" });
  } catch (error) {
    console.error("فشل الإضافة:", error);
    res.status(500).json({ error: "حدث خطأ في السيرفر" });
  }
};

// ✅ جلب كل البرامج
const getAllNutritionPrograms = async (req, res) => {
  try {
    const nutritionRef = ref(database, "nutritionPrograms");
    const snapshot = await get(nutritionRef);

    if (!snapshot.exists()) {
      return res.status(404).json({ error: "لا توجد بيانات" });
    }

    const nutritionData = snapshot.val();
    res.status(200).json({
      success: true,
      message: "تم جلب البيانات",
      nutritionData: JSON.parse(JSON.stringify(nutritionData)),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ جلب برنامج غذائي حسب ID
const getNutritionProgramById = async (req, res) => {
  try {
    const { id } = req.params;
    const snapshot = await get(child(ref(database), `nutritionPrograms/${id}`));

    if (!snapshot.exists()) {
      return res.status(404).json({ error: "البرنامج غير موجود" });
    }

    res.status(200).json({ data: snapshot.val() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ تعديل برنامج غذائي
const updateNutritionProgram = async (req, res) => {
  try {
    const { id } = req.params;
    const program = req.body;

    const programRef = ref(database, `nutritionPrograms/${id}`);
    await set(programRef, program);

    res.status(200).json({ message: "تم التعديل بنجاح", data: program });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ✅ حذف برنامج غذائي
const deleteNutritionProgram = async (req, res) => {
  try {
    const { id } = req.params;
    await remove(ref(database, `nutritionPrograms/${id}`));
    res.status(200).json({ message: "تم الحذف بنجاح" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  AddNutritionProgram,
  getAllNutritionPrograms,
  getNutritionProgramById,
  updateNutritionProgram,
  deleteNutritionProgram,
};
