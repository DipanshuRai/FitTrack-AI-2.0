import mongoose from "mongoose";
import Exercise from "../models/exercise.model.js";
import Trainee from "../models/trainee.model.js";

const fillMissingDays = (records, startDate, endDate) => {
  const recordsMap = {};

  // Create a map of existing records by date string
  records.forEach((record) => {
    recordsMap[record._id] = record;
  });

  const filledRecords = [];
  const currentDate = new Date(startDate);

  // Loop through each day in the range
  while (currentDate <= endDate) {
    // Format date consistent with the _id format from MongoDB aggregation
    const dateString = currentDate.toISOString().split("T")[0]; // YYYY-MM-DD

    if (recordsMap[dateString]) {
      // Use existing record if available
      filledRecords.push(recordsMap[dateString]);
    } else {
      // Create a placeholder record with zeros
      filledRecords.push({
        _id: dateString,
        createdAt: new Date(currentDate),
        totalDuration: 0,
        totalCount: 0,
        recordCount: 0,
        date: currentDate.toLocaleDateString("en-IN", {
          year: "numeric",
          month: "long",
          day: "numeric",
          timeZone: "Asia/Kolkata",
        }),
      });
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return filledRecords;
};

export const postWorkoutRecord = async (req, res, next) => {
  try {
    // console.log(req.body);
    
    const { exercise, count, startTime, stopTime } = req.body;
    const userId = req.user._id;    

    if (!userId) {
      return res.status(400).json({message: "User ID is required"});
    }

    if (!exercise || !count || !startTime || !stopTime) {
      return res.status(400).json({message: "Invalid Inputs"});
    }

    // Convert startTime and stopTime to Date objects and calculate duration
    const start = new Date(startTime);
    const stop = new Date(stopTime);
    const duration = (stop - start) / (1000 * 60); // Converts to minutes

    const createRecord = await Exercise.create({
      name: exercise,
      count: count,
      duration: duration,
      date: Date.now(),
      user: userId
    });

    await createRecord.save();

    res.status(201).json({ record: createRecord });
  } catch (error) {
    console.log("Error in postWorkoutRecord controller: ", error);
    res.status(500).json({message: "Internal server error"});
  }
};

export const fetchWorkoutByRecord = async (req, res, next) => {
  try {
    const { exercise, count, username } = req.query;
    if (!exercise || !username) {
      return res.status(400).json({message: "Exercise name is required"});
    }

    const trainee = await Trainee.findOne({ username: username });
    if (!trainee) {
      return res.status(400).json({message: "User not found"});
    }

    const records = await Exercise.find({ name: exercise, user: trainee._id })
      .sort({ date: -1 })
      .limit(parseInt(count) || 30);

    const formattedRecords = records.map((record) => ({
      ...record._doc,
      date: new Date(record.date).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }),
    }));

    res.status(200).json({ records: formattedRecords });
  } catch (error) {
    console.log("Error in fetchWorkoutByRecord controller: ", error);
    res.status(500).json({message: "Internal server error"});
  }
};

export const fetchWorkoutByDay = async (req, res, next) => {
  try {
    const { exercise, count, username, fillEmptyDays } = req.query;    

    if (!exercise || !username) {
      return res.status(400).json({message: "Exercise name and username are required"});
    }

    const daysCount = parseInt(count) || 7; // Default to 7 if not provided
    const shouldFillEmptyDays = fillEmptyDays === "true"; // Parse query parameter

    const trainee = await Trainee.findOne({ username }).exec();
    if (!trainee) {
      return res.status(400).json({message: "User not found"});
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysCount);

    const records = await Exercise.aggregate([
      {
        $match: {
          name: exercise,
          user: new mongoose.Types.ObjectId(trainee._id),
          date: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$date" },
          },
          createdAt: { $first: "$date" },
          totalDuration: { $sum: "$duration" },
          totalCount: { $sum: "$count" },
          recordCount: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 }, // Sort by date ascending
      },
      {
        $project: {
          _id: 1,
          createdAt: 1,
          totalDuration: 1,
          totalCount: 1,
          recordCount: 1,
          date: {
            $dateToString: {
              format: "%B %d, %Y",
              date: "$createdAt",
              timezone: "Asia/Kolkata",
            },
          },
        },
      },
    ]).exec();

    const responseRecords = shouldFillEmptyDays
      ? fillMissingDays(records, startDate, endDate)
      : records;

    res.status(200).json({ records: responseRecords });
  } catch (error) {
    console.log("Error in fetchWorkoutByDay controller: ", error);
    res.status(500).json({message: "Internal server error"});
  }
};
