import asyncio
import socketio
import cv2
import numpy as np
from aiortc import RTCPeerConnection, RTCSessionDescription, MediaStreamTrack, RTCIceCandidate
from aiortc.contrib.media import MediaRelay
from av import VideoFrame

from pushup import PushUpExerciseProcessor
from crunch import CrunchExerciseProcessor
from pullup import PullUpExerciseProcessor
from squat import SquatExerciseProcessor
from bicepcurl import BicepCurlExerciseProcessor

sio = socketio.AsyncClient(logger=True, engineio_logger=True)

pc = None
relay = MediaRelay()

def get_exercise_processor(exercise_type):
    processors = {
        "crunch": CrunchExerciseProcessor,
        "pullup": PullUpExerciseProcessor,
        "bicepcurl": BicepCurlExerciseProcessor,
        "squat": SquatExerciseProcessor,
        "pushup": PushUpExerciseProcessor
    }
    return processors.get(exercise_type.lower(), PushUpExerciseProcessor)()

class VideoProcessTrack(MediaStreamTrack):
    kind = "video"

    def __init__(self, track, exercise_type):
        super().__init__()
        self.track = relay.subscribe(track)
        self.processor = get_exercise_processor(exercise_type)
        self.last_feedback_time = 0
        self.frame_count = 0

    def update_exercise(self, new_exercise_type):
        print(f"Switching exercise processor to: {new_exercise_type}")
        self.processor = get_exercise_processor(new_exercise_type)

    async def recv(self):
        try:
            frame = await asyncio.wait_for(self.track.recv(), timeout=5.0)
        except asyncio.TimeoutError:
            print("Timeout waiting for frame from client.")
            blank_img = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(blank_img, "Video signal lost...", (50, 240),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
            return VideoFrame.from_ndarray(blank_img, format="bgr24")

        img = frame.to_ndarray(format="bgr24")

        processed_img, landmarks = self.processor.process_frame(img)
        
        # Analyze landmarks to get feedback
        analysis = self.processor.analyze_exercise(landmarks)

        rep_count = analysis.get('repCount', 0)
        position = analysis.get('position', 'unknown')
        cv2.putText(processed_img, f"Reps: {rep_count}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2, cv2.LINE_AA)
        cv2.putText(processed_img, f"Position: {position}", (10, 70),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 0, 255), 2, cv2.LINE_AA)

        # Send feedback over WebSocket periodically
        current_time = asyncio.get_event_loop().time()
        if current_time - self.last_feedback_time > 0.5: 
            self.last_feedback_time = current_time
            await sio.emit("exercise-feedback", analysis)

        # Return the processed frame
        new_frame = VideoFrame.from_ndarray(processed_img, format="bgr24")
        new_frame.pts = frame.pts
        new_frame.time_base = frame.time_base
        return new_frame

async def cleanup_pc():
    global pc
    if pc and pc.connectionState != "closed":
        await pc.close()
        pc = None
        print("Previous PeerConnection closed.")

@sio.event
async def connect():
    print("Connected to Node.js server.")
    await sio.emit("connect-python")

@sio.event
async def disconnect():
    print("Disconnected from Node.js server.")
    await cleanup_pc()

@sio.on("webrtc-offer")
async def on_offer(data):
    global pc
    await cleanup_pc()

    pc = RTCPeerConnection()
    exercise_type = data.get("exerciseType", "pushup")

    @pc.on("track")
    def on_track(track):
        if track.kind == "video":
            print("Video track received from client.")
            processed_track = VideoProcessTrack(track, exercise_type)
            pc.addTrack(processed_track)
            # Store track reference to allow updates
            pc.video_processor_track = processed_track
            
    @pc.on("connectionstatechange")
    async def on_connectionstatechange():
        print(f"PC Connection State: {pc.connectionState}")
        if pc.connectionState == "failed" or pc.connectionState == "closed":
            await cleanup_pc()

    offer = RTCSessionDescription(sdp=data["sdp"], type=data["type"])
    await pc.setRemoteDescription(offer)
    
    answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    
    await sio.emit("webrtc-answer", {
        "type": "answer", 
        "sdp": pc.localDescription.sdp
    })

# --- CRITICAL FIX ---
@sio.on("ice-candidate")
async def on_ice_candidate(data):
    if pc and data and data.get('candidate'):
        try:
            # Refactored: Construct RTCIceCandidate directly from the dictionary.
            # No brittle string parsing needed. This is the correct way.
            candidate = RTCIceCandidate(
                sdpMid=data.get('sdpMid'),
                sdpMLineIndex=data.get('sdpMLineIndex'),
                candidate=data.get('candidate')
            )
            await pc.addIceCandidate(candidate)
        except Exception as e:
            print(f"Error adding ICE candidate: {e}")

@sio.on("client-disconnected")
async def on_client_disconnected():
    print("Client disconnected notification received.")
    await cleanup_pc()

@sio.on("exercise-change")
async def on_exercise_change(data):
    global pc
    if pc and hasattr(pc, 'video_processor_track'):
        new_exercise = data.get("exerciseType", "pushup")
        pc.video_processor_track.update_exercise(new_exercise)

async def main():
    while True:
        try:
            await sio.connect("http://localhost:5000", socketio_path="/socket.io/")
            await sio.wait()
        except socketio.exceptions.ConnectionError as e:
            print(f"Connection failed: {e}. Retrying in 10 seconds...")
            await asyncio.sleep(10)
        except asyncio.CancelledError:
            print("Main task cancelled.")
            break
        finally:
            if sio.connected:
                await sio.disconnect()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Script interrupted by user.")