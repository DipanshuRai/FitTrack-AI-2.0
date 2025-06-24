import express from "express";
import {
  sendTrainerRequest,
  searchTrainee,
  showConnectedTrainee,
  removeTraineeFromTrainer,
} from "../controllers/trainerRequest.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/search-trainee", verifyJWT, searchTrainee);
router.post("/send-request", verifyJWT, sendTrainerRequest);
router.post("/remove-trainee", verifyJWT, removeTraineeFromTrainer);
router.get("/connected-trainees", verifyJWT, showConnectedTrainee);

export default router;
