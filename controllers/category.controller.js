// category.controller.js

const { getDatabase, ref, update, remove, get, child } = require("firebase/database");
const db = getDatabase();

// 🔹 قراءة جميع الفئات
const getCategories = async (req, res) => {
  try {
    const snapshot = await get(child(ref(db), 'categories/exercise'));

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
const addCategory = async (req, res) => {
  try {
    const { categoryName } = req.body;

    if (!categoryName) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const categoryRef = ref(db, 'categories/exercise');

    await update(categoryRef, {
      [categoryName]: true
    });

    res.status(200).json({ message: `Category '${categoryName}' added successfully` });
  } catch (error) {
    res.status(500).json({ message: "Error adding category", error });
  }
};

// 🔹 حذف فئة موجودة
const deleteCategory = async (req, res) => {
  try {
    const { categoryName } = req.params;

    if (!categoryName) {
      return res.status(400).json({ message: "Category name is required" });
    }

    const categoryRef = ref(db, `categories/exercise/${categoryName}`);
    await remove(categoryRef);

    res.status(200).json({ message: `Category '${categoryName}' removed successfully` });
  } catch (error) {
    res.status(500).json({ message: "Error removing category", error });
  }
};

module.exports = {
  getCategories,
  addCategory,
  deleteCategory
};
