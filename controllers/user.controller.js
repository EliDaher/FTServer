const { ref, update, get, set, remove } = require("firebase/database");
const { database } = require('../firebaseConfig.js')



// add height
const addHeight = async (req, res) => {
    try {
        const { username, height } = req.body;

        if (!username || !height) {
            return res.status(400).json({ error: "All fields are required." });
        }

        const UserRef = ref(database, `users/${username}`);
        const snapshot = await get(UserRef);

        if (!snapshot.exists()) {
            return res.status(400).json({ error: "Username Didn't exists." });
        }

        await update(UserRef, {
            height: height
        });

        return res.status(200).json({ success: true, message: "height Added successfully." });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// add gender
const addGender = async (req, res) => {
    try {
        const { username, gender } = req.body;

        if (!username || !gender) {
            return res.status(400).json({ error: "All fields are required." });
        }

        const UserRef = ref(database, `users/${username}`);
        const snapshot = await get(UserRef);

        if (!snapshot.exists()) {
            return res.status(400).json({ error: "Username Didn't exists." });
        }

        await update(UserRef, {
            gender: gender
        });

        return res.status(200).json({ success: true, message: "gender Added successfully." });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// add weight
const addWeight = async (req, res) => {
    try {
        const { username, weight } = req.body;

        if (!username || !weight) {
            return res.status(400).json({ error: "All fields are required." });
        }

        const UserRef = ref(database, `users/${username}`);
        const snapshot = await get(UserRef);

        if (!snapshot.exists()) {
            return res.status(400).json({ error: "Username Didn't exists." });
        }

        await update(UserRef, {
            weight: weight
        });

        return res.status(200).json({ success: true, message: "Weight Added successfully." });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// update personal details
const updatePersonalDetails = async (req, res) => {
    try {
        const { username, address, job, date, bloodType, healthConditions } = req.body;

        if (!username || !address || !job || !date ) {
            return res.status(400).json({ error: "All fields are required." });
        }

        const UserRef = ref(database, `users/${username}`);
        const snapshot = await get(UserRef);

        if (!snapshot.exists()) {
            return res.status(400).json({ error: "Username Didn't exists." });
        }

        await update(UserRef, {
            username: username,
            address: address,
            job: job,
            date: date,
            bloodType: bloodType || '',
            healthConditions: healthConditions || ''
        });

        return res.status(200).json({ success: true, message: "Data Updated Successfully." });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};


// update personal details from the admin
const adminUpdateUserDetails = async (req, res) => {
    try {
        const { username, job, fullname, bloodType, healthConditions, password, weight, height } = req.body;

        if (!username || !fullname || !password ) {
            return res.status(400).json({ error: "All fields are required." });
        }

        const UserRef = ref(database, `users/${username}`);
        const snapshot = await get(UserRef);

        if (!snapshot.exists()) {
            return res.status(400).json({ error: "Username Didn't exists." });
        }

        await update(UserRef, {
            username: username,
            fullname: fullname,
            password: password,
            job: job || '',
            bloodType: bloodType || '',
            weight: weight || 0,
            height: height || 0,
            healthConditions: healthConditions || ''
        });

        return res.status(200).json({ success: true, message: "Data Updated Successfully." });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

// get user data
const getUserData = async (req, res) => {
    try {
        const { username } = req.body;

        if (!username) {
            return res.status(400).json({ error: "username is required." });
        }

        const UserRef = ref(database, `users/${username}`);
        const snapshot = await get(UserRef);

        if (!snapshot.exists()) {
            return res.status(400).json({ error: "Username Didn't exists." });
        }

        const userData = snapshot.val();

        return res.status(200).json({ success: true, userData: userData });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

//get all users
const getAllUsers = async (req, res) => {
    try {
        const UserRef = ref(database, `users`);
        const snapshot = await get(UserRef);

        const usersData = snapshot.val();

        return res.status(200).json({ usersData: usersData });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}

const modifyUserWorkout = async (req, res) => {
    try {
      const { updatedWorkout, username } = req.body;
  
      if (!username || !updatedWorkout) {
        return res.status(400).json({ error: "Username and update data are required." });
      }
  
      const userRef = ref(database, `users/${username}`);
      const snapshot = await get(userRef);
  
      // التأكد من وجود بيانات المستخدم
      if (!snapshot.exists()) {
        return res.status(404).json({ error: "User not found." });
      }
  
      const userData = snapshot.val();
      const today = new Date().toISOString().slice(0, 10); // تاريخ اليوم بصيغة yyyy-mm-dd
  
      // التأكد من وجود lastWorkoutIndex و lastWorkoutDate
      if (userData.lastWorkoutIndex === undefined || userData.lastWorkoutDate === undefined) {
        // إذا لم تكن موجودة، قم بتعيين القيم الافتراضية
        await update(userRef, {
          lastWorkoutIndex: 0,      // التمرين الأول
          lastWorkoutDate: today,   // تاريخ اليوم
        });
      }
  
      // تحديث التمرين
      const workoutRef = ref(database, `users/${username}/workouts`);
      await set(workoutRef, updatedWorkout);
  
      return res.status(200).json({ success: true, message: "Workout updated successfully." });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
};
  

const modifyUserNutrition = async (req, res) => {
    try {
      const { updatedNutrition, username } = req.body;
  
      if (!username || !updatedNutrition) {
        return res.status(400).json({ error: "Username and update data are required." });
      }
  
      const userRef = ref(database, `users/${username}`);
      const snapshot = await get(userRef);
  
      // التأكد من وجود بيانات المستخدم
      if (!snapshot.exists()) {
        return res.status(404).json({ error: "User not found." });
      }

      // تحديث التمرين
      const nutritionRef = ref(database, `users/${username}/nutrition`);
      await set(nutritionRef, updatedNutrition);
  
      return res.status(200).json({ success: true, message: "Nutrition program updated successfully." });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
};
  


const getUserWorkout = async (req, res) => {
    try {
        const { username } = req.body;
        
        if (!username) {
          return res.status(400).json({ error: "Username is required." });
        }
      
        // مراجع المسارات في قاعدة البيانات
        const userRef = ref(database, `users/${username}`);
        const snapshot = await get(userRef);
      
        if (!snapshot.exists()) {
          return res.status(404).json({ error: "User not found." });
        }
      
        const userData = snapshot.val();
        console.log(userData)
        const workouts = userData.workouts || [];
      
        if (workouts.length === 0) {
          return res.status(200).json({ success: true, workout: null, message: "No workouts found." });
        }
      
        const lastIndex = userData.lastWorkoutIndex ?? -1;
        const lastDate = userData.lastWorkoutDate ?? "";
        const today = new Date().toISOString().slice(0, 10);
      
        let newIndex = lastIndex;
      
        if (lastDate !== today) {
          newIndex = (lastIndex + 1) % workouts.length;
        
          // تحديث التاريخ والمؤشر في قاعدة البيانات
          await update(ref(database, `users/${username}`), {
            lastWorkoutIndex: newIndex,
            lastWorkoutDate: today
          });
        }

      
        const todayWorkoutRef = ref(database, `fullWorkout/${userData.workouts[0].id}/workouts/${newIndex}`);
        const resSnapshot = await get(todayWorkoutRef) 
        console.log(resSnapshot)
        const finalWorkout = resSnapshot.val();
        console.log(finalWorkout)
      
        return res.status(200).json({ success: true, workout: finalWorkout.workout });
  
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const skipOrStartNewWorkout = async (req, res) => {
    try {
        const { username } = req.body;

        if (!username) {
            return res.status(400).json({ error: "Username is required." });
        }

        const userRef = ref(database, `users/${username}`);
        const snapshot = await get(userRef);

        if (!snapshot.exists()) {
            return res.status(404).json({ error: "User not found." });
        }

        const userData = snapshot.val();
        const today = new Date().toISOString().slice(0, 10);

        if (!userData.workouts || userData.workouts.length === 0) {
            return res.status(200).json({ success: true, message: "No workouts assigned to user." });
        }

        const fullWorkoutId = userData.workouts[0].id;
        const fullWorkoutRef = ref(database, `fullWorkout/${fullWorkoutId}/workouts`);
        const fullWorkoutSnapshot = await get(fullWorkoutRef);

        if (!fullWorkoutSnapshot.exists()) {
            return res.status(404).json({ error: "Workout data not found in fullWorkout." });
        }

        const allWorkouts = fullWorkoutSnapshot.val();
        const totalWorkouts = Object.keys(allWorkouts).length;

        const currentIndex = userData.lastWorkoutIndex ?? -1;
        const newIndex = (currentIndex + 1) % totalWorkouts;

        await update(userRef, {
            lastWorkoutIndex: newIndex,
            lastWorkoutDate: today,
        });

        const workoutRef = ref(database, `fullWorkout/${fullWorkoutId}/workouts/${newIndex}`);
        const workoutSnapshot = await get(workoutRef);
        const workout = workoutSnapshot.val();

        return res.status(200).json({ success: true, workout: workout?.workout || workout });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
  

const deleteUsername = async (req, res) => {
    try {
      const { username } = req.body;
  
      if (!username) {
        return res.status(400).json({ error: "username is required." });
      }
  
      const userRef = ref(database, `users/${username}`);
      const snapshot = await get(userRef);
  
      if (!snapshot.exists()) {
        return res.status(404).json({ error: "username does not exist." });
      }
  
      await remove(userRef);
  
      return res.status(200).json({ success: true, message: "username deleted successfully." });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
};



module.exports = { 
    addWeight, 
    addHeight, 
    addGender, 
    getUserData, 
    updatePersonalDetails,
    getAllUsers,
    modifyUserWorkout,
    getUserWorkout,
    skipOrStartNewWorkout,
    adminUpdateUserDetails,
    deleteUsername,
    modifyUserNutrition
    
};
