import { useState, useEffect } from "react";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import { Search, UserPlus, UserMinus, Check, X } from "lucide-react";
import toast from "react-hot-toast";
import useAuth from "../hooks/useAuth";
import "./styles/Profile.css";

const Profile = () => {
  const { auth } = useAuth();
  const axiosPrivate = useAxiosPrivate();
  
  const [userInfo, setUserInfo] = useState({
    name: auth?.user?.name,
    userType: auth?.user?.userType,
    email: auth?.user?.email,
    age: auth?.user?.age,
    weight: auth?.user?.weight,
    height: auth?.user?.height,
    gender: auth?.user?.gender,
  });

  const [connectedTrainers, setConnectedTrainers] = useState([]);
  const [connectedTrainees, setConnectedTrainees] = useState([]);
  const [trainerRequests, setTrainerRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (userInfo?.userType === "trainee") {
      const fetchConnectedTrainers = async () => {
        try {
          const response = await axiosPrivate.get(
            "/api/trainee/request/connected-trainers"
          );
          setConnectedTrainers(response.data.trainers || []);
        } catch (error) {
          console.error("Error fetching connected trainers:", error);
        }
      };

      const fetchTrainerRequests = async () => {
        try {
          const response = await axiosPrivate.get(
            "/api/trainee/request/show-request"
          );
          setTrainerRequests(response.data.trainers || []);
        } catch (error) {
          console.error("Error fetching trainer requests:", error);
        }
      };

      fetchConnectedTrainers();
      fetchTrainerRequests();
    }

    if (userInfo?.userType === "trainer") {
      const fetchConnectedTrainees = async () => {
        try {
          const response = await axiosPrivate.get(
            "/api/trainer/request/connected-trainees"
          );
          setConnectedTrainees(response.data.trainees || []);
        } catch (error) {
          console.error("Error fetching connected trainees:", error);
        }
      };

      fetchConnectedTrainees();
    }
  }, [userInfo?.userType, axiosPrivate]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const response = await axiosPrivate.post(
        `/api/trainer/request/search-trainee`,
        { username: searchQuery }
      );

      if (response.data && response.data.trainee) {
        setSearchResults([response.data.trainee]);
      }
    } catch (error) {
      setSearchResults([]);
      toast.error(error.response.data.message);
    }
  };

  const handleSendRequest = async (traineeUsername) => {
    try {
      const response=await axiosPrivate.post("/api/trainer/request/send-request", {
        username: traineeUsername,
      });      
      setSearchResults([]);
      setSearchQuery("");      
      toast.success(response.data.message);   
    } catch (error) {
      toast.error(error.response.data.message);      
    }
  };

  const handleAcceptRequest = async (trainerUsername) => {
    try {
      const response=await axiosPrivate.post("/api/trainee/request/accept", {
        username: trainerUsername,
      });

      const acceptedTrainer = trainerRequests.find(
        (request) => request.username === trainerUsername
      );

      setTrainerRequests((prevRequests) =>
        prevRequests.filter((request) => request.username !== trainerUsername)
      );

      if (acceptedTrainer) {
        setConnectedTrainers((prevTrainers) => [
          ...prevTrainers,
          acceptedTrainer,
        ]);
      }

      toast.success(response.data.message);
    } catch (error) {
      toast.error(error.response.data.message);
    }
  };

  const handleRejectRequest = async (trainerUsername) => {
    try {
      const response=await axiosPrivate.post("/api/trainee/request/reject", {
        username: trainerUsername,
      });

      setTrainerRequests((prevRequests) =>
        prevRequests.filter((request) => request.username !== trainerUsername)
      );

      toast.success(response.data.message);
    } catch (error) {
      toast.error(error.response.data.message);
    }
  };

  const handleRemoveTrainer = async (trainerUsername) => {
    try {
      const response=await axiosPrivate.post("/api/trainee/request/remove-trainer", {
        username: trainerUsername,
      });

      setConnectedTrainers((prevTrainers) =>
        prevTrainers.filter((trainer) => trainer.username !== trainerUsername)
      );

      toast.success(response.data.message);
    } catch (error) {
      toast.error(error.response.data.message);
    }
  };

  const handleRemoveTrainee = async (traineeUsername) => {
    try {
      const response=await axiosPrivate.post("/api/trainer/request/remove-trainee", {
        username: traineeUsername,
      });

      setConnectedTrainees((prevTrainees) =>
        prevTrainees.filter((trainee) => trainee.username !== traineeUsername)
      );

      toast.success(response.data.message);
    } catch (error) {
      toast.error(error.response.data.message);
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>Profile</h1>
      </div>

      <div className="profile-content">
        <div className="profile-section personal-info">
          <h2>Personal Information</h2>
          <div className="info-grid">
            {[
              { label: "Name", value: userInfo?.name || "N/A" },
              { label: "User Type", value: userInfo?.userType || "N/A" },
              { label: "Email", value: userInfo?.email || "N/A" },
              { label: "Age", value: userInfo?.age || "N/A" },
              { label: "Gender", value: userInfo?.gender || "N/A" },
              { label: "Weight", value: userInfo?.weight ? `${userInfo.weight} kg` : "N/A", },
              { label: "Height", value: userInfo?.height ? `${userInfo.height} cm` : "N/A", },
            ].map((info, index) => (
              <div key={index} className="info-card">
                <label>{info.label}</label>
                <p>{info.value}</p>
              </div>
            ))}
          </div>
        </div>

        {userInfo?.userType === "trainer" && (
          <>
            {/* Search Trainees Section */}
            <div className="profile-section search-trainees">
              <h2>Search Trainees</h2>
              <form onSubmit={handleSearch} className="search-form">
                <div className="search-input">
                  <input
                    type="text"
                    placeholder="Search by username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <button type="submit">
                    <Search size={20} />
                  </button>
                </div>
              </form>

              {errorMessage && <p className="no-results">{errorMessage}</p>}

              {Array.isArray(searchResults) && searchResults.length > 0 && (
                <div className="search-results">
                  {searchResults.map((trainee, index) => (
                    <div key={trainee.id || index} className="search-result-card">
                      <div className="trainee-info">
                        <p className="trainee-name">{trainee.name}</p>
                        <p className="trainee-username">@{trainee.username}</p>
                      </div>
                      <button
                        onClick={() => handleSendRequest(trainee.username)}
                        className="btn-send-request"
                      >
                        <UserPlus size={16} />
                        Send Request
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Connected Trainees Section */}
            <div className="profile-section connected-trainees">
              <h2>Connected Trainees</h2>
              <div className="trainees-list">
                {connectedTrainees.length === 0 ? (
                  <p className="no-connections">No connected trainees</p>
                ) : (
                  connectedTrainees.map((trainee, index) => (
                    <div key={trainee.id || index} className="trainee-card">
                      <div className="trainee-info">
                        <p className="trainee-name">{trainee.name}</p>
                        <p className="trainee-username">@{trainee.username}</p>
                      </div>
                      <button
                        className="btn-remove"
                        onClick={() => handleRemoveTrainee(trainee.username)}
                      >
                        <UserMinus size={16} />
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {userInfo?.userType === "trainee" && (
          <>
            {/* Connected Trainers Section */}
            <div className="profile-section connected-trainers">
              <h2>Connected Trainers</h2>
              <div className="trainers-list">
                {connectedTrainers.length === 0 ? (
                  <p className="no-connections">No connected trainers</p>
                ) : (
                  connectedTrainers.map((trainer, index) => (
                    <div key={trainer.id || index} className="trainer-card">
                      <div className="trainer-info">
                        <p className="trainer-name">{trainer.name}</p>
                        <p className="trainer-username">@{trainer.username}</p>
                      </div>
                      <button
                        className="btn-remove"
                        onClick={() => handleRemoveTrainer(trainer.username)}
                      >
                        <UserMinus size={16} />
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Trainer Requests Section */}
            <div className="profile-section trainer-requests">
              <h2>Trainers Request</h2>
              <div className="requests-list">
                {trainerRequests.length === 0 ? (
                  <p className="no-requests">No pending requests</p>
                ) : (
                  trainerRequests.map((request, index) => (
                    <div key={request.id || index} className="request-card">
                      <div className="trainer-info">
                        <p className="trainer-name">{request.name}</p>
                        <p className="trainer-username">@{request.username}</p>
                      </div>
                      <div className="request-actions">
                        <button
                          className="btn-accept"
                          onClick={() => handleAcceptRequest(request.username)}
                        >
                          <Check size={16} />
                          Accept
                        </button>
                        <button
                          className="btn-reject"
                          onClick={() => handleRejectRequest(request.username)}
                        >
                          <X size={16} />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Profile;
