const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const http = require('http');
require('dotenv').config(); // تحميل متغيرات البيئة
const { Server } = require("socket.io");
const cron = require("node-cron");
const { Login, SignUp } = require('./controllers/auth.controller')
const { addWeight, addHeight, addGender } = require('./controllers/user.controller')
const { createExercise, getAllExercises, getExerciseByName } = require('./controllers/exercise.controller');






const app = express();

const server = http.createServer(app); // Create HTTP server
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    }
});


// السماح بالوصول من الشبكة المحلية
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
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

// تقديم الصور
app.use('/assets', express.static('assets'));

// نقطة الإدخال
app.post('/api/exercises', createExercise);

// اعادة كل التمارين
app.post('/getAllExercises', getAllExercises);

// اعادة تمرين حسب اسمه
app.get('/getExerciseByName', getExerciseByName);





const PORT = process.env.PORT || 1337;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
