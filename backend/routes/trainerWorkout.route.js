import express from "express";
import {
  fetchWorkoutByRecord,
  fetchWorkoutByDay,
} from "../controllers/workout.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/record", verifyJWT, fetchWorkoutByRecord);
router.get("/day", verifyJWT, fetchWorkoutByDay);

export default router;
