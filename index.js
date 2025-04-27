const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const { ref, get, child, query, orderByChild, equalTo, push, set, limitToLast } = require("firebase/database");
const { database } = require('./firebaseConfig.js');
const http = require('http');
require('dotenv').config(); // تحميل متغيرات البيئة
const { Server } = require("socket.io");
const cron = require("node-cron");






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






app.post("/SignUp", async (req, res) => {
    try {
        const { email, password, username, fullname } = req.body;


        console.log(email + "  //  "+ password + "  //  " + username + "  //  " + fullname)
        console.log("done")
      
        const date = new Date().toISOString().split("T")[0];
        const InvoiceRef = ref(database, `users/${username}`);
        const newInvoiceRef = push(InvoiceRef);

        await set(newInvoiceRef, {
            fullname,
            username,
            password,
            email,
        });    

        await calcTotalFund(true);

        console.log('added')

        res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });  
    }  
});    







const PORT = process.env.PORT || 1337;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
