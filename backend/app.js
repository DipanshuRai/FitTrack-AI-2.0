import express from 'express';
import { createServer } from "http";
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { config } from 'dotenv';
config(); // Load environment variables first

import authRoutes from './routes/auth.route.js'
import trainerRequest from './routes/trainerRequest.route.js';
import traineeRequest from './routes/traineeRequest.route.js';
import traineeWorkout from "./routes/traineeWorkout.route.js";
import trainerWorkout from "./routes/trainerWorkout.route.js";
import messageRoutes from "./routes/message.route.js"
import connectToDB from './configs/dbconnection.js';
import { initializeSocketIO } from './utils/socketHandler.js';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(morgan('dev'));
app.use(cookieParser());

// API Routes
app.get('/ping', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/trainee/request', traineeRequest);
app.use('/api/trainer/request', trainerRequest);
app.use('/api/trainee/workout', traineeWorkout);
app.use('/api/trainer/workout', trainerWorkout);
app.use("/api/messages", messageRoutes);

// Error Handling
app.all('*', (_req, res) => res.status(404).send('OOPS!!! 404 Page Not Found'));

// Initialize Socket.IO and attach it to the HTTP server
initializeSocketIO(httpServer);

httpServer.listen(PORT, "0.0.0.0", async () => {
  try {
    await connectToDB();
    console.log(`Server is running at http://localhost:${PORT}`);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
});
