const express = require('express');
const dotenv = require('dotenv').config();
const path = require('path');
const bodyParser = require('body-parser');
// Initialize Express app
// Set view engine to EJS (you can use Pug or just static HTML if preferred)
const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Use routes
const userRoutes = require('./routes/userRoutes');
const homeRoutes = require('./routes/index');
const openaiRoutes = require('./routes/openaiRoute');
const energyTransmission = require('./routes/energyTransmissionRoute');
const dropDown = require('./routes/dropDown');
app.use('/', homeRoutes);
app.use('/', openaiRoutes);
app.use('/', energyTransmission);
app.use('/', dropDown);
app.use('/users', userRoutes);

// Middleware handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: 'Something went wrong!' });
});

// Middleware for serving static files (CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/scripts', express.static(path.join(__dirname, 'node_modules')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Start server
const PORT = dotenv.PORT || 3000;
console.log(PORT);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
