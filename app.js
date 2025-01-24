const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const bodyParser = require('body-parser');
dotenv.config();
// Initialize Express app
const app = express();
// Set view engine to EJS (you can use Pug or just static HTML if preferred)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware for serving static files (CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/scripts', express.static(path.join(__dirname, 'node_modules')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
// Import routes
const homeRoutes = require('./routes/index');
const openaiRoutes = require('./routes/openaiRoute');
const energyTransmission = require('./routes/energyTransmissionRoute');
const dropDown = require('./routes/dropDown');
// app.js
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Use routes
app.use('/', homeRoutes);
app.use('/', openaiRoutes);
app.use('/', energyTransmission);
app.use('/', dropDown);
// Start server
const PORT = process.env.PORT;
console.log(PORT);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
