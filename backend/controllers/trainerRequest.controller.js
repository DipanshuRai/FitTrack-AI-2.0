import Trainee from '../models/trainee.model.js';
import Request from '../models/request.model.js';
import Trainer from '../models/trainer.model.js';
import Group from "../models/group.model.js";

export const searchTrainee = async(req,res,next)=>{
  try {
    const traineeUsername = req.body.username;

    if (!traineeUsername) {
      return res.status(400).json({message: "Trainee username is required"});
    }

    const trainee = await Trainee.findOne({ username: traineeUsername }).select("-refereshToken");
    if (!trainee) {
      return res.status(400).json({message: "Trainee not found"});
    }

    return res.status(200).json({
      success: true,
      message : "Trainee exists",
      trainee
    });
  } catch (error) {
    console.log("Error in searchTrainee controller: ", error);
    res.status(500).json({message: "Internal server error"});
  }
};

export const sendTrainerRequest = async (req, res, next) => {
  try {    
    const trainerId = req.user._id;
    const traineeUsername = req.body.username;    

    if (!traineeUsername) {
      return res.status(400).json({message: "Trainee username is required"});
    }

    const trainee = await Trainee.findOne({ username: traineeUsername }).select("-refereshToken");
    if (!trainee) {
      return res.status(400).json({message: "Trainee not found"});
    }

    if (trainee.trainer.includes(trainerId)) {
      return res.status(400).json({message: "Already connected"});
    }

    let request = await Request.findOne({ from: trainerId });

    if (request) {
      if (request.to.includes(trainee._id)) {
        return res.status(400).json({message: "Request already sent"});
      }
      request.to.push(trainee._id);
      await request.save();
    } else {      
      request = await Request.create({ from: trainerId, to: [trainee._id] });
    }

    res.status(201).json({
      success: true,
      message: `Request sent to ${trainee.username}.`,
      trainee,
    });
  } catch (error) {
    console.log("Error in sendTrainerRequest controller: ", error);
    res.status(500).json({message: "Internal server error"});
  }
};

export const showConnectedTrainee = async (req, res, next) => {
  try {
    const trainerId = req.user._id;

    if (!trainerId) {
      return res.status(400).json({message: "Please provide trainerId"});
    }

    const trainer = await Trainer.findById(trainerId);
    if (!trainer) {
      return res.status(400).json({message: "Invalid trainer"});
    }

    const group = await Group.findOne({ head: trainerId }).populate('members');
    
    if (!group) {
      return res.status(400).json({message: "No trainees found for this trainer"});
    }

    res.status(200).json({
      success: true,
      message: 'Successfully found trainees',
      trainees: group.members,
    });
  } catch (error) {
    console.log("Error in showConnectedTrainee controller: ", error);
    res.status(500).json({message: "Internal server error"});
  }
};

export const removeTraineeFromTrainer = async (req, res, next) => {
  try {
    const trainerId = req.user._id;
    const traineeUsername = req.body.username;

    if (!trainerId) {   
      return res.status(400).json({message: "Provide trainerId"}); 
    }
    if (!traineeUsername) {
      return res.status(400).json({message: "Provide trainee username"}); 
    }

    const trainee = await Trainee.findOne({ username: traineeUsername });
    if (!trainee) {
      return res.status(400).json({message: "Invalid trainee"}); 
    }

    const trainer = await Trainer.findById(trainerId);
    if (!trainer) {
      return res.status(400).json({message: "Invalid trainer"}); 
    }

    const group = await Group.findOneAndUpdate(
      { head: trainerId },
      { $pull: { members: trainee._id } },
      { new: true }
    );

    if (!group) {
      return res.status(400).json({message: "Trainee not found"}); 
    }

    await Trainee.findByIdAndUpdate(
      trainee._id,
      { $pull: { trainer: trainerId } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Trainee removed",
    });
  } catch (error) {
    console.log("Error in removeTraineeFromTrainer controller: ", error);
    res.status(500).json({message: "Internal server error"});
  }
};
