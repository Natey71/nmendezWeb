import express from 'express';
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
// Initialize Express app
// Set view engine to EJS (you can use Pug or just static HTML if preferred)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
//dotenv.config();
const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));
app.use(express.json({ limit: '200mb' }));

// get secret
// Routes
// Use routes
import homeRoutes from './routes/index.js';
import gamesRoutes from './routes/games.js';

app.use('/', homeRoutes);
app.use('/games', gamesRoutes);
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


async function startServer() {
  try {

  } catch (error) {
    console.error("Failed to retrieve secret:", error);
  }

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0');
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
