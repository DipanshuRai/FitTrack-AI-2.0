// A cleaner, more focused PeerService class

class PeerService {
  constructor() {
    this.peer = null;
  }

  /**
   * Initializes a new RTCPeerConnection, cleaning up any old one.
   * This is the correct way to get a peer instance for a new session.
   * @returns {RTCPeerConnection} The newly created peer connection.
   */
  init() {
    if (this.peer) {
      this.cleanup();
    }
    
    this.peer = new RTCPeerConnection({
      iceServers: [
        {
          urls: [
            "stun:stun.l.google.com:19302",
            "stun:stun1.l.google.com:19302",
          ]
        }
      ],
    });
    
    console.log("PeerService initialized a new RTCPeerConnection.");
    return this.peer;
  }

  /**
   * Creates an SDP offer and sets it as the local description.
   * @returns {Promise<RTCSessionDescriptionInit>} The offer.
   */
  async getOffer() {
    if (!this.peer) {
      throw new Error("Peer connection not initialized. Call init() first.");
    }
    
    const offer = await this.peer.createOffer();
    await this.peer.setLocalDescription(new RTCSessionDescription(offer));
    return offer;
  }
  
  /**
   * Sets the remote SDP answer received from the other peer.
   * @param {RTCSessionDescriptionInit} answer The answer from the signaling server.
   */
  async setRemoteAnswer(answer) {
    if (!this.peer) {
      throw new Error("Peer connection not initialized. Call init() first.");
    }
    await this.peer.setRemoteDescription(new RTCSessionDescription(answer));
  }

  /**
   * Closes the connection and cleans up resources.
   */
  cleanup() {
    if (this.peer) {
      this.peer.close();
      this.peer = null;
      console.log("PeerService connection cleaned up.");
    }
  }
}

// Export a singleton instance so the whole app shares the same service
export default new PeerService();