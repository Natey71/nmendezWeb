import { getSessionSecret } from './secrets.js';
import express from 'express';
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import  bodyParser from 'body-parser';
import session from 'express-session';
// Initialize Express app
// Set view engine to EJS (you can use Pug or just static HTML if preferred)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
//dotenv.config();
const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// get secret
const secret = await getSessionSecret();
app.use(session({
  secret: secret || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'development',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
// Routes
// Use routes
import homeRoutes from './routes/index.js';
import openaiRoutes from './routes/openaiRoute.js';
import energyTransmission from './routes/energyTransmissionRoute.js';
import dropDown from './routes/dropDown.js';
app.use('/', homeRoutes);
app.use('/', openaiRoutes);
app.use('/', energyTransmission);
app.use('/', dropDown);
// Middleware handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: 'Something went wrong!' });
});
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});
// Middleware for serving static files (CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


async function startServer() {
  try {

  } catch (error) {
    console.error("Failed to retrieve secret:", error);
  }

  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();

// Start server
