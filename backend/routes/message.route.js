import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getMessages, sendMessage } from "../controllers/message.controller.js";

const router=express.Router();

router.get("/:id", verifyJWT, getMessages);
router.post("/send/:id", verifyJWT, sendMessage);

export default router;