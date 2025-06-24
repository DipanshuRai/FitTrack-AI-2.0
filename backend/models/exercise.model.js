import { Schema, model } from "mongoose";

const exerciseSchema = new Schema(
  {
    name: { type: String, required: true },
    count: { type: Number, required: true },
    duration: { type: Number, required: true }, // e.g., "5 min"
    date: { type: Date, default: Date.now },
    user: { type: Schema.Types.ObjectId, ref: "Trainee", required: true },
  },
  { timestamps: true }
);

const Exercise = model("Exercise", exerciseSchema);
export default Exercise;
