import express from "express";
import {
  rejectTrainerRequest,
  acceptTrainerRequest,
  showConnectedTrainers,
  showRequest,
  removeTrainerFromTrainee,
} from "../controllers/traineeRequest.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/connected-trainers", verifyJWT, showConnectedTrainers);
router.post("/reject", verifyJWT, rejectTrainerRequest);
router.post("/accept", verifyJWT, acceptTrainerRequest);
router.get("/show-request", verifyJWT, showRequest);
router.post("/remove-trainer", verifyJWT, removeTrainerFromTrainee);

export default router;
