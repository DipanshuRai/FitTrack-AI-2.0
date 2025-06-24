import Message from "../models/message.model.js";
import {io} from "../utils/socketHandler.js"
import Trainer from "../models/trainer.model.js";
import {userSocketMap} from '../utils/socketHandler.js';

const getReceiverSocketId = (userId) => {
    return userSocketMap.get(userId);
};

export const getMessages = async (req, res)=>{
    try {
        const {id:userToChatId}=req.params;
        const myId=req.user._id;

        const messages=await Message.find({
            $or: [
                {senderId: myId, receiverId: userToChatId},
                {senderId: userToChatId, receiverId: myId}
            ]
        }).sort({ createdAt: 1 });

        res.status(200).json(messages);
    } catch (error) {
        console.log("Error in getMessages controller: ", error.message);
        res.status(500).json({message: "Internal server error"});
    }
};

export const sendMessage = async (req, res)=>{
    try {
        const {text}=req.body;
        const {id:receiverId}=req.params;
        const senderId=req.user._id;

        const senderModel = req.user.modelType || (await Trainer.findById(senderId) ? 'Trainer' : 'Trainee');
        const receiverModel = await Trainer.findById(receiverId) ? 'Trainer' : 'Trainee';

        const newMessage = new Message({
            senderId,
            senderModel,
            receiverId,
            receiverModel,
            text,
        });

        await newMessage.save();

        // Populate sender info to avoid extra frontend lookups
        await newMessage.populate({
            path: 'senderId',
            select: 'name' // Add any other fields you need like 'avatar'
        });

        // Emit the message to the specific receiver if they are online
        const receiverSocketId=getReceiverSocketId(receiverId);
        if(receiverSocketId){
            io.to(receiverSocketId).emit("newMessage", newMessage);
        }

        res.status(201).json(newMessage);
    } catch (error) {
        console.log("Error in sendMessage controller: ", error.message);
        res.status(500).json({message: "Internal server error"});
    }
}
