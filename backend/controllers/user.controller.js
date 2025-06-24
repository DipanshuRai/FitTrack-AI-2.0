import jwt from "jsonwebtoken";
import Trainee from "../models/trainee.model.js";
import Trainer from "../models/trainer.model.js";

const generateAccessAndRefreshTokens = async (userId, modelType) => {
  try {
    const UserClass = modelType === "Trainer" ? Trainer : Trainee;
    const user = await UserClass.findById(userId);

    if (!user) {
      res.status(500).json({message: "User not found"});
    }

    const accessToken = user.generateAccessToken();
    const newRefreshToken = user.generateRefreshToken();

    // Update the new refresh token in the user's database record
    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, newRefreshToken };
  } catch (error) {
    console.log("Error in generateAccessAndRefreshTokens controller: ", error);
        res.status(500).json({message: "Internal server error"});
  }
};

export const refreshAccessToken = async (req, res) => {
  try {
    const incomingRefreshToken = req.cookies.refreshToken;    

    if (!incomingRefreshToken) {
      return res.status(400).json({message: "Unauthorized request"});
    }

    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const { _id, modelType } = decodedToken;

    if (!modelType || !["Trainee", "Trainer"].includes(modelType)) {
      return res.status(400).json({message: "Invalid refresh token: Missing or invalid user type"});
    }

    const UserClass = modelType === "Trainer" ? Trainer : Trainee;
    const user = await UserClass.findById(_id);

    if (!user) {
      return res.status(400).json({message: "Invalid refresh token: User not found"});
    }

    if (incomingRefreshToken !== user.refreshToken) {
      return res.status(400).json({message: "Invalid refresh token"});
    }

    const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(
      user._id,
      modelType
    );

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    return res.status(200).cookie("refreshToken", newRefreshToken, options).json({
      user,
      success: true,
      message: "Access token refreshed successfully",
      accessToken,
    });
  } catch (error) {
    console.log("Error in refreshAccessToken controller: ", error);
    res.status(500).json({message: "Internal server error"});
  }
};

export const register = async (req, res, next) => {
  try {
    const { username, name, email, password, age, height, weight, gender, userType } = req.body;  

    if ( !username || !email || !password || !age || !height || !weight || !name || !gender || !userType ) {    
      return res.status(400).json({message: "All fields are required"});
    }

    const userByUsername = await (Trainee.findOne({ username }) || Trainer.findOne({ username }));
    if (userByUsername) return res.status(400).json({message: "Username already exists"});

    const userByEmail = await (Trainee.findOne({ email }) || Trainer.findOne({ email }));
    if (userByEmail) return res.status(400).json({message: "Email already exists"});

    const newUser = await (userType === "trainee" ? Trainee : Trainer).create({
        username,
        name,
        email,
        password,
        age,
        height,
        weight,
        gender,
      });

    if (!newUser) {
      return res.status(400).json({message: `${userType.charAt(0).toUpperCase() + userType.slice(1)} registration failed`});
    }

    const modelType = newUser instanceof Trainer ? "Trainer" : "Trainee";
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(newUser._id, modelType);

    newUser.password = undefined;  

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    return res
    .status(200)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .cookie("accessToken", accessToken, {...cookieOptions, maxAge: 15 * 60 * 1000}) // 15m
    .json({
      success: true,
      message: "Registration successfully",
      user: newUser,
      accessToken,
    });
  } catch (error) {
    console.log("Error in register controller: ", error);
    res.status(500).json({message: "Internal server error"});
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({message: "Email and password are required"});
    }

    const trainee = await Trainee.findOne({ email }).select("+password");
    const trainer = await Trainer.findOne({ email }).select("+password");
    const user = trainee || trainer;
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({message: "Email or password does not match"});
    }

    const modelType = user instanceof Trainer ? "Trainer" : "Trainee";
    const { accessToken, newRefreshToken } = await generateAccessAndRefreshTokens(user._id, modelType);
    
    user.password = undefined;

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7d
    };
    
    res
    .status(200)
    .cookie("accessToken", accessToken, {...cookieOptions, maxAge: 15 * 60 * 1000}) // 15‑min expiry
    .cookie("refreshToken", newRefreshToken, cookieOptions)
    .json({
      success: true,
      message: "Logged in successfully",
      user,
      accessToken,
    }); 
  } catch (error) {
    console.log("Error in login controller: ", error);
    res.status(500).json({message: "Internal server error"});
  } 
};

export const logout = async (req, res, next) => {  
  try {
    const { _id, userType } = req.user;

    const Model = userType === "trainer" ? Trainer : Trainee;

    await Model.findByIdAndUpdate(
      _id,
      { $unset: { refreshToken: 1 } },
      { new: true }
    );

    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "Strict",
    };  

    return res
      .status(200)
      .clearCookie("accessToken", cookieOptions)
      .clearCookie("refreshToken", cookieOptions)
      .json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller: ", error);
    res.status(500).json({message: "Internal server error"});
  }
};
