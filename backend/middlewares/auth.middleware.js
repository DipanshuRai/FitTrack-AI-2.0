import jwt from "jsonwebtoken";
import Trainee from "../models/trainee.model.js";
import Trainer from "../models/trainer.model.js";

export const verifyJWT = async (req, res, next) => {    
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        if (!token) {
            return res.status(400).json({message: "Unauthorized request"});
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        
        let user = await Trainee.findById(decodedToken?._id).select("-password -refreshToken");
        let modelType = 'Trainee';

        if (!user) {
            user = await Trainer.findById(decodedToken?._id).select("-password -refreshToken");
            modelType = 'Trainer';
        }

        if (!user) {
            return res.status(400).json({message: "User not found"});
        }

        req.user = user;
        req.user.modelType = modelType;
        next();
    } catch (error) {       
        console.log("Error in verifyJWT middleware: ",error);
        return res.status(500).json({message: "Internal server error"});
    }
};
