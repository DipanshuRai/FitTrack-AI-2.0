import express from "express";
import {
  postWorkoutRecord,
  fetchWorkoutByRecord,
  fetchWorkoutByDay,
} from "../controllers/workout.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", verifyJWT, postWorkoutRecord);
router.get("/record", verifyJWT, fetchWorkoutByRecord);
router.get("/day", verifyJWT, fetchWorkoutByDay);

export default router;
