const express = require('express');
const { google } = require('googleapis');
const cors = require('cors');
const http = require('http');
require('dotenv').config();
const { Server } = require("socket.io");
const cron = require("node-cron");

const { Login, SignUp } = require('./controllers/auth.controller');
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
  modifyUserNutrition,
} = require('./controllers/user.controller');

const {
  createExercise,
  getAllExercises,
  getExerciseByName,
  updateExercise,
  deleteExercise,
} = require('./controllers/exercise.controller');

const {
  addWorkOut,
  getWorkOut,
  updateWorkOut,
  getAllWorkOuts,
  deleteWorkOut,
  getAllFullWorkout,
  deleteFullWorkout,
  getWorkoutCategories,
  addWorkoutCategory,
  getFullWorkoutById,
} = require('./controllers/workOut.controller');

const {
  AddNutritionProgram,
  getAllNutritionPrograms,
  getNutritionProgramById,
  updateNutritionProgram,
  deleteNutritionProgram,
} = require('./controllers/nutritionPrograms.controller');

const { addSets, getSets } = require('./controllers/sets.controller');
const { getCategories, addCategory } = require('./controllers/category.controller');
const {
  createSubscription,
  getAllSubscriptions,
  getSubscriptionsByUser,
  addPayment,
  getSubscriptionPayments,
  renewSubscription,
  deleteSubscription,
  getUserDueAmount,
  getUserBillingSummary,
  getAllBillingSummary,
  runDailyCycleGeneration,
} = require('./controllers/subscrptions.controller');
const { getAllPlans, createPlan, updatePlan, deletePlan } = require('./controllers/plans.controller');
const {
  getInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  addInventoryMovement,
  getInventoryMovements,
  getInventorySummary,
  getInventoryAccountingSummary,
} = require('./controllers/inventory.controller');
const { getProjectBalanceReport } = require('./controllers/balance.controller');
const { attachRequestUser, requireAdmin, requireSelfOrAdmin } = require('./controllers/accountingAuth');

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-user', 'x-username'],
    credentials: true,
  },
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-user', 'x-username'],
  credentials: true,
}));

app.use(express.json());

app.get('/', (_, res) => {
  res.send('Server is alive!');
});

app.post('/SignUp', SignUp);
app.post('/login', Login);

app.post('/addWeight', addWeight);
app.post('/addHeight', addHeight);
app.post('/addGender', addGender);
app.get('/getAllUsers', getAllUsers);

app.use('/assets', express.static('assets'));

app.post('/api/exercises', createExercise);
app.post('/getAllExercises', getAllExercises);
app.get('/getExerciseByName', getExerciseByName);

app.post('/getUserData', getUserData);
app.post('/updatePersonalDetails', updatePersonalDetails);
app.post('/adminUpdateUserDetails', adminUpdateUserDetails);

app.post('/updateExercise', updateExercise);
app.post('/deleteExercise', deleteExercise);
app.post('/deleteUsername', deleteUsername);

app.post('/addWorkOut', addWorkOut);
app.post('/getAllWorkOuts', getAllWorkOuts);
app.get('/workout/:id', getWorkOut);
app.get('/getFullWorkoutById/:id', getFullWorkoutById);
app.put('/workout/:id', updateWorkOut);
app.put('/deleteWorkout/:id', deleteWorkOut);
app.delete('/deleteFullWorkout/:id', deleteFullWorkout);
app.get('/getAllFullWorkout', getAllFullWorkout);

app.post('/modifyUserWorkout', modifyUserWorkout);
app.post('/modifyUserNutrition', modifyUserNutrition);
app.post('/getUserWorkout', getUserWorkout);
app.post('/skipOrStartNewWorkout', skipOrStartNewWorkout);

app.get('/getAllNutritionPrograms', getAllNutritionPrograms);
app.post('/AddNutritionProgram', AddNutritionProgram);
app.get('/getNutritionProgramById/:id', getNutritionProgramById);
app.put('/updateNutritionProgram/:id', updateNutritionProgram);
app.delete('/deleteNutritionProgram/:id', deleteNutritionProgram);

app.post('/addSets', addSets);
app.get('/getSets', getSets);

app.get('/exerciseCategories', getCategories);
app.post('/AddExerciseCategories', addCategory);
app.get('/workoutCategories', getWorkoutCategories);
app.post('/AddWorkoutCategories', addWorkoutCategory);

app.get('/getAllPlans', attachRequestUser, requireAdmin, getAllPlans);
app.post('/createPlan', attachRequestUser, requireAdmin, createPlan);
app.put('/updatePlan/:key', attachRequestUser, requireAdmin, updatePlan);
app.delete('/deletePlan/:key', attachRequestUser, requireAdmin, deletePlan);

app.post('/createSubscription', attachRequestUser, requireAdmin, createSubscription);
app.get('/getAllSubscriptions', attachRequestUser, requireAdmin, getAllSubscriptions);
app.get('/getAllBillingSummary', attachRequestUser, requireAdmin, getAllBillingSummary);
app.get('/getSubscriptionsByUser/:userId', attachRequestUser, requireSelfOrAdmin('userId'), getSubscriptionsByUser);
app.get('/getUserDueAmount/:userId', attachRequestUser, requireSelfOrAdmin('userId'), getUserDueAmount);
app.get('/getUserBillingSummary/:userId', attachRequestUser, requireSelfOrAdmin('userId'), getUserBillingSummary);
app.get('/getSubscriptionPayments/:subId', attachRequestUser, getSubscriptionPayments);
app.post('/addPayment/:subId/payments', attachRequestUser, requireAdmin, addPayment);
app.post('/renewSubscription/:subId', attachRequestUser, requireAdmin, renewSubscription);
app.delete('/deleteSubscription/:subId', attachRequestUser, requireAdmin, deleteSubscription);

app.get('/getInventoryItems', attachRequestUser, requireAdmin, getInventoryItems);
app.post('/createInventoryItem', attachRequestUser, requireAdmin, createInventoryItem);
app.put('/updateInventoryItem/:itemId', attachRequestUser, requireAdmin, updateInventoryItem);
app.post('/addInventoryMovement/:itemId/movements', attachRequestUser, requireAdmin, addInventoryMovement);
app.get('/getInventoryMovements/:itemId', attachRequestUser, requireAdmin, getInventoryMovements);
app.get('/getInventorySummary', attachRequestUser, requireAdmin, getInventorySummary);
app.get('/getInventoryAccountingSummary', attachRequestUser, requireAdmin, getInventoryAccountingSummary);
app.get('/getProjectBalanceReport', attachRequestUser, requireAdmin, getProjectBalanceReport);

cron.schedule('0 2 * * *', async () => {
  await runDailyCycleGeneration();
});

const PORT = process.env.PORT || 1337;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});



