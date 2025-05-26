const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const http = require('http');
require('dotenv').config(); // تحميل متغيرات البيئة
const { Server } = require("socket.io");
const cron = require("node-cron");
const { Login, SignUp } = require('./controllers/auth.controller')
const { 
    getAllUsers,
    addWeight, 
    addHeight, 
    addGender, 
    getUserData, 
    updatePersonalDetails,
    modifyUserWorkout,
    getUserWorkout,
    skipOrStartNewWorkout,
    adminUpdateUserDetails,
    deleteUsername,
    modifyUserNutrition
} = require('./controllers/user.controller')

const { createExercise, 
    getAllExercises, 
    getExerciseByName, 
    updateExercise, 
    deleteExercise 
} = require('./controllers/exercise.controller');

const {
    addWorkOut,
    getWorkOut,
    updateWorkOut,
    getAllWorkOuts,
    deleteWorkOut,
    getAllFullWorkout,
    deleteFullWorkout
    
} = require('./controllers/workOut.controller')

const {
    AddNutritionProgram,
    getAllNutritionPrograms,
    getNutritionProgramById,
    updateNutritionProgram,
    deleteNutritionProgram,
} = require('./controllers/nutritionPrograms.controller')






const app = express();

const server = http.createServer(app); // Create HTTP server
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    }
});


// السماح بالوصول من الشبكة المحلية
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json()); // لمعالجة بيانات JSON في الطلبات POST





app.get("/", (req, res) => {
    res.send("Server is alive!");
});

app.post("/SignUp", SignUp);  

app.post("/login", Login);  

app.post("/addWeight", addWeight);  

app.post("/addHeight", addHeight); 

app.post("/addGender", addGender);    


//اعادة كل المستخدمين
app.get(`/getAllUsers`, getAllUsers)

// تقديم الصور
app.use('/assets', express.static('assets'));

// نقطة الإدخال
app.post('/api/exercises', createExercise);

// اعادة كل التمارين
app.post('/getAllExercises', getAllExercises);

// اعادة تمرين حسب اسمه
app.get('/getExerciseByName', getExerciseByName);

// اعادة بيانات المشترك
app.post('/getUserData', getUserData);

// تحديث بيانات المستخدم
app.post('/updatePersonalDetails', updatePersonalDetails);

// تحديث بيانات المستخدم
app.post('/adminUpdateUserDetails', adminUpdateUserDetails);

// تعديل التمرين
app.post('/updateExercise', updateExercise);

// حذف التمرين
app.post('/deleteExercise', deleteExercise);

// حذف مستخدم
app.post('/deleteUsername', deleteUsername);

// اضافة برنامج تدريبي
app.post("/addWorkOut", addWorkOut);

// اعادة كل التمارين
app.post("/getAllWorkOuts", getAllWorkOuts);

// اعادة برنامج تدريبي محدد
app.get("/workout/:id", getWorkOut);

// تعديل برنامج رياضي
app.put("/workout/:id", updateWorkOut);

// تعديل برنامج رياضي
app.put("/deleteWorkout/:id", deleteWorkOut);

//حزف برنامج تدريبي
app.delete("/deleteFullWorkout/:id", deleteFullWorkout);

// تعديل البرنامج التدريبي للمستخدم
app.post("/modifyUserWorkout", modifyUserWorkout);

//تعديل البرنامج الغذائي للمستخدم
app.post("/modifyUserNutrition", modifyUserNutrition);

// جلب تمارين المستخدم
app.post("/getUserWorkout", getUserWorkout)

// انهاء او تخطي تمرين
app.post("/skipOrStartNewWorkout", skipOrStartNewWorkout)

// اعادة كل البرامج الغذائية
app.get("/getAllNutritionPrograms", getAllNutritionPrograms)

//اضافة برنامج غذائي
app.post("/AddNutritionProgram", AddNutritionProgram)

//جلب برنامج غذائي محدد
app.get("/getNutritionProgramById/:id", getNutritionProgramById)

//تعديل برنامج غذائي
app.put("/updateNutritionProgram/:id", updateNutritionProgram)

//حزف برنامج غذائي
app.delete("/deleteNutritionProgram/:id", deleteNutritionProgram)

// اعادة كل البرامج 
app.get('/getAllFullWorkout', getAllFullWorkout)


const PORT = process.env.PORT || 1337;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
