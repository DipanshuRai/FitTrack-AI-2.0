import { useRef, useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useSocket } from "../context/SocketProvider";
import toast from "react-hot-toast";
import useAuth from "../hooks/useAuth";
import PeerService from "../service/peer";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import "./styles/WorkoutStudio.css";

const exercises = [
  { id: "pushup", name: "Push-ups" },
  { id: "pullup", name: "Pull-ups" },
  { id: "squat", name: "Squats" },
  { id: "crunch", name: "Crunches" },
  { id: "bicepcurl", name: "Bicep Curls" },
];

const WorkoutStudio = () => {
  const { auth } = useAuth();
  const socket = useSocket();
  const axiosPrivate = useAxiosPrivate();

  const webcamRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // State for WebRTC and UI 
  const [isRecording, setIsRecording] = useState(false);
  const [currentExercise, setCurrentExercise] = useState("pushup");
  const [connectionState, setConnectionState] = useState("disconnected");
  const [error, setError] = useState(null);
  const [showRemoteVideo, setShowRemoteVideo] = useState(true);

  // State for Workout Data
  const [feedback, setFeedback] = useState(null);
  const [sessionRepCount, setSessionRepCount] = useState(0);
  const [totalReps, setTotalReps] = useState(0);
  const [startTime, setStartTime] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const handleWebRtcAnswer = async (answer) => {
      await PeerService.setRemoteAnswer(answer);
    };
    const handleIceCandidate = async (candidate) => {
      if (PeerService.peer) {
        await PeerService.peer.addIceCandidate(new RTCIceCandidate(candidate));
      }
    };
    const handleExerciseFeedback = (data) => {
      setFeedback(data.feedback);
      setSessionRepCount(data.repCount);
    };
    const handlePythonDisconnected = () => {
      setError("AI processing server has disconnected.");
      stopRecording();
    };
    const handleErrorMessage = (data) => {
      setError(data.message);
      stopRecording();
    };

    socket.on("webrtc-answer", handleWebRtcAnswer);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("exercise-feedback", handleExerciseFeedback);
    socket.on("python-disconnected", handlePythonDisconnected);
    socket.on("error-message", handleErrorMessage);

    return () => {
      socket.off("webrtc-answer", handleWebRtcAnswer);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("exercise-feedback", handleExerciseFeedback);
      socket.off("python-disconnected", handlePythonDisconnected);
      socket.off("error-message", handleErrorMessage);
    };
  }, [socket]);

  useEffect(() => {
    if (isRecording && socket) {
      socket.emit("exercise-change", { exerciseType: currentExercise });
    }
  }, [currentExercise, isRecording, socket]);

  const setupPeerListeners = () => {
    PeerService.peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", event.candidate);
      }
    };
    PeerService.peer.onconnectionstatechange = () => {
      const state = PeerService.peer.connectionState;
      setConnectionState(state);
      if (["failed", "disconnected", "closed"].includes(state)) {
        setError(`WebRTC Connection ${state}. Please restart.`);
        stopRecording();
      }
    };
    PeerService.peer.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
  };

  const startRecording = async () => {
    setError(null);
    setFeedback(null);
    setIsRecording(true);
    setConnectionState("connecting");
    setSessionRepCount(0);
    if (startTime === null) {
      setStartTime(new Date());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });
      webcamRef.current.srcObject = stream;
      const peer = PeerService.init();
      setupPeerListeners(peer);
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      const offer = await PeerService.getOffer();
      socket.emit("webrtc-offer", { ...offer, exerciseType: currentExercise });
    } catch (err) {
      setError(`Failed to start session: ${err.message}`);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (!isRecording && !PeerService.peer) return;
    setIsRecording(false);

    setTotalReps(prevTotal => prevTotal + sessionRepCount);

    if (socket) socket.emit("stop-webrtc-session");
    if (webcamRef.current?.srcObject) {
      webcamRef.current.srcObject.getTracks().forEach((track) => track.stop());
      webcamRef.current.srcObject = null;
    }
    PeerService.cleanup();
    setConnectionState("disconnected");
  };

  const resetWorkout = () => {
    setTotalReps(0);
    setSessionRepCount(0);
    setStartTime(null);
    setFeedback(null);
    setError(null);
  };

  const saveWorkout = async () => {
    if (totalReps === 0 || !startTime) {
      setError("No workout data to save.");
      return;
    }
    const workoutData = {
      exercise: currentExercise,
      count: totalReps,
      startTime: startTime.toISOString(),
      stopTime: new Date().toISOString(),
    };

    try {
      await axiosPrivate.post("/api/trainee/workout", workoutData);
      toast.success("Workout saved successfully")
      resetWorkout();
    } catch (err) {
      setError("Failed to save workout. Please try again.");
      toast.error("Failed to save workout");
    }
  };

  useEffect(() => () => stopRecording(), []);

  if (auth?.user?.userType !== "trainee") {
    return <Navigate to="/access-denied" replace />;
  }

  return (
    <div className="video-feed">
      <div className="video-container">
        <div className="exercise-selector">
          <label htmlFor="exercise">Select Exercise:</label>
          <select
            className="exercise-select" id="exercise" value={currentExercise}
            onChange={(e) => setCurrentExercise(e.target.value)} disabled={isRecording}
          >
            {exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
          </select>
        </div>

        <div className="webcam-container">
          <video ref={webcamRef} autoPlay playsInline muted className="webcam" style={{ display: showRemoteVideo ? "none" : "block" }} />
          <video ref={remoteVideoRef} autoPlay playsInline className="remote-video" style={{ display: showRemoteVideo ? "block" : "none" }} />
          <div className="diagnostic-overlay"><p>Status: {connectionState}</p></div>
          {error && <div className="error-overlay"><p>{error}</p></div>}
        </div>

        <div className="controls">
          {!isRecording ? (
            <button className="btn-start" onClick={startRecording} disabled={isRecording}>Start Recording</button>
          ) : (
            <button className="btn-stop" onClick={stopRecording}>Stop Recording</button>
          )}
          <button className="btn-toggle" onClick={() => setShowRemoteVideo(!showRemoteVideo)} disabled={!isRecording}>
            {showRemoteVideo ? "Show Camera" : "Show Processed"}
          </button>
          
          {!isRecording && totalReps > 0 && (
            <>
              <button className="btn-start" onClick={resetWorkout}>Reset</button>
              <button className="btn-start" onClick={saveWorkout}>Save Record</button>
            </>
          )}
        </div>
      </div>

      <div className="stats-panel">
        <div className="stat-item">
          <h3>Exercise</h3>
          <p>{exercises.find((e) => e.id === currentExercise)?.name}</p>
        </div>
        <div className="stat-item">
          <h3>Total Reps</h3>
          <p className="rep-count">{totalReps}</p>
        </div>
        <div className="stat-item">
          <h3>Reps This Session</h3>
          <p>{sessionRepCount}</p>
        </div>
        <div className="stat-item">
          <h3>Connection</h3>
          <p className={connectionState === "connected" ? "connected" : "disconnected"}>
            {connectionState}
          </p>
        </div>
      </div>
    </div>
  );
};

export default WorkoutStudio;