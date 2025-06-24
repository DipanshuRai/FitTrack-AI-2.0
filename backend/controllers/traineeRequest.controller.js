import Trainee from "../models/trainee.model.js";
import Request from "../models/request.model.js";
import Group from "../models/group.model.js";
import Trainer from "../models/trainer.model.js";

export const showRequest = async (req, res, next) => {
  try {
    const userId = req.user._id;
    if (!userId) {
      return res.status(400).json({message: "User ID is required"});
    }

    const requests = await Request.find({ to: userId }).populate("from", "name username email"); // Populate trainer details only

    if (!requests)
      return res.status(400).json({message: "No trainer requests found for this trainee."});

    const trainers = requests.map((request) => request.from);

    res.status(200).json({
      success: true,
      message: "Trainer requests fetched successfully.",
      trainers,
    });
  } catch (error) {
    console.log("Error in showRequest controller: ",error);
    return res.status(500).json({message: "Internal server error"});
  }
};

export const showConnectedTrainers = async (req, res, next) => {  
  try {
    const userId = req.user._id;  
    if (!userId) {
      res.status(400).json({message: "userId is required"});
    }

    //  Find the trainee and populate the trainer field to get trainer details (excluding password & refresh token)
    const trainee = await Trainee.findById(userId).populate("trainer", "username name email gender");

    if (!trainee) {
      res.status(400).json({message: "Trainee not found"});
    }

    res.status(200).json({
      success: true,
      message: "Successfully fetched trainers",
      trainers: trainee.trainer.length > 0 ? trainee.trainer : [],
    });
  } catch (error) {
    console.log("Error in showConnectedTrainers controller: ", error);
    res.status(500).json({message: "Internal server error"});
  }
};

export const acceptTrainerRequest = async (req, res, next) => {
  try {
    const traineeId = req.user._id;    
    const trainerUsername = req.body.username;

    if (!trainerUsername) {
      return res.status(400).json({message: "Trainer username is required"});
    }

    const trainer = await Trainer.findOne({ username: trainerUsername });
    if (!trainer) {
      return res.status(400).json({message: "Trainer not found"});
    }

    const trainerId = trainer._id;
    const trainee = await Trainee.findById(traineeId);

    if (trainee.trainer.includes(trainerId)) {
      return res.status(400).json({message: "Trainer already added"});
    }

    const updatedRequest = await Request.findOneAndUpdate(
      { from: trainerId },
      { $pull: { to: traineeId } },
      { new: true }
    );

    if (!updatedRequest) {
      return res.status(400).json({message: "No request found"});
    }

    if (updatedRequest.to.length === 0) {
      await Request.deleteOne({ from: trainerId });
    }

    trainee.trainer.push(trainerId);
    await trainee.save();

    let group = await Group.findOne({ head: trainerId });

    if (!group) {
      group = await Group.create({head: trainerId, members: [traineeId]});
    } else if (!group.members.includes(traineeId)) {
      group.members.push(traineeId);
      await group.save();
    }

    res.status(200).json({
      success: true,
      message: "Trainer request accepted",
    });
  } catch (error) {
    console.log("Error in acceptTrainerRequest controller: ", error);
    res.status(500).json({message: "Internal server error"});
  }
};

export const rejectTrainerRequest = async (req, res, next) => {
  try {
    const traineeId = req.user._id;
    const trainerUsername = req.body.username;

    if (!trainerUsername) {
      return res.status(400).json({message: "Trainer username is required"});
    }

    const trainer = await Trainer.findOne({ username: trainerUsername });

    if (!trainer) {
      return res.status(400).json({message: "Trainer not found"});
    }

    const trainerId = trainer._id;

    let request = await Request.findOne({ from: trainerId });

    if (!request) {
      return res.status(400).json({message: "No request found"});
    }

    request.to = request.to.filter((id) => !id.equals(traineeId));
    await request.save();

    if (request.to.length === 0) {
      await Request.deleteOne({ _id: request._id });
    }

    res.status(200).json({
      success: true,
      message: "Trainer request rejected",
    });
  } catch (error) {
    console.log("Error in rejectTrainerRequest controller: ", error);
    res.status(500).json({message: "Internal server error"});
  }
};

export const removeTrainerFromTrainee = async function (req, res, next) {
  try {
    const traineeId = req.user._id;
    if (!traineeId) {
      return res.status(400).json({message: "Trainee ID is required"});
    }

    const trainee = await Trainee.findById(traineeId);
    if (!trainee) {
      return res.status(400).json({message: "Invalid trainee"});
    }

    const trainerUsername = req.body.username;
    if (!trainerUsername) {
      return res.status(400).json({message: "Provide trainer username"});
    }

    const trainer = await Trainer.findOne({ username: trainerUsername });
    if (!trainer) {
      return res.status(400).json({message: "Trainer not found"});
    }

    trainee.trainer = trainee.trainer.filter(
      (id) => id.toString() !== trainer._id.toString()
    );
    await trainee.save();

    await Group.updateMany(
      { head: trainer._id },
      { $pull: { members: trainee._id } }
    );

    res.status(200).json({
      success: true,
      message: "Trainer removed",
    });
  } catch (error) {
    console.log("Error in removeTrainerFromTrainee controller: ", error);
    res.status(500).json({message: "Internal server error"});
  }
};
