import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer } from "recharts";
import { MessageCircle, X, TrendingUp, Repeat, Calculator, Activity as ActivityIcon, BarChart2 } from "lucide-react";
import useAuth from "../hooks/useAuth";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import Chat from "./Chat.jsx";
import "./styles/Dashboard.css";

const Dashboard = () => {
  const [selectedActivity, setSelectedActivity] = useState("pushup");
  const [selectedTrainee, setSelectedTrainee] = useState("");
  const [selectedDays, setSelectedDays] = useState(7);
  const [activityData, setActivityData] = useState([]);
  const [connectedTrainees, setConnectedTrainees] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [fetchType, setFetchType] = useState("record");
  const [isLoading, setIsLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [error, setError] = useState("");
  const { auth } = useAuth();
  const axiosPrivate = useAxiosPrivate();

  const activities = ["pushup", "pullup", "squat", "crunch", "bicepcurl"];
  const timeOptions = [7, 15, 30];

  useEffect(() => {
    if (auth?.user?.userType === "trainer") {
      fetchConnectedTrainees();
    }
  }, [auth?.user?.userType]);

  useEffect(() => {
    if (!auth?.user) return;
    const targetUser = auth.user.userType === "trainer" ? selectedTrainee : auth.user.username;
    if (!targetUser) {
        setChartData([]);
        setActivityData([]);
        return;
    };

    const fetchData = auth.user.userType === 'trainer' ? fetchTrainerActivityData : fetchTraineeActivityData;
    fetchData(targetUser, selectedActivity, selectedDays, fetchType);

  }, [auth?.user, selectedActivity, selectedTrainee, selectedDays, fetchType]);

  const fetchConnectedTrainees = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await axiosPrivate.get("/api/trainer/request/connected-trainees");
      setConnectedTrainees(response.data.trainees || []);
    } catch (error) {
      console.error("Error fetching connected trainees:", error);
      setError("Failed to fetch connected trainees. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const processAndSetData = (records, fetchType) => {
    setActivityData(records);
    const formattedData = records.map((record) => {
      let dateObj;
      if (record.date) {
        dateObj = new Date(record.date.replace ? record.date.replace("at", "") : record.date);
      } else if (record.createdAt) {
        dateObj = new Date(record.createdAt);
      } else if (record._id) {
        dateObj = new Date(record._id);
      } else {
        dateObj = new Date();
      }
      return {
        day: isNaN(dateObj.getTime()) ? 'Invalid Date' : dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        reps: fetchType === "record" ? record.count : record.totalCount || 0,
        duration: fetchType === "record" ? parseFloat((record.duration || 0).toFixed(2)) : parseFloat((record.totalDuration || 0).toFixed(2)),
      };
    }).reverse();
    setChartData(formattedData);
  };

  const fetchTraineeActivityData = async (traineeUsername, activity, days, fetchType) => {
    setIsLoading(true);
    setError("");
    try {
      const response = await axiosPrivate.get(`api/trainee/workout/${fetchType}`, {
        params: { username: traineeUsername, exercise: activity, count: days, fillEmptyDays: false },
      });
      if (response.data && response.data.records) {
        processAndSetData(response.data.records, fetchType);
      } else {
        setActivityData([]);
        setChartData([]);
      }
    } catch (error) {
      console.error(`Error fetching trainee data for ${activity}:`, error);
      setError(`Failed to fetch data for ${activity}. Please try again.`);
      setActivityData([]);
      setChartData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTrainerActivityData = async (traineeUsername, activity, days, fetchType) => {
    setIsLoading(true);
    setError("");
    try {
      const response = await axiosPrivate.get(`api/trainer/workout/${fetchType}`, {
        params: { username: traineeUsername, exercise: activity, count: days },
      });
      if (response.data && response.data.records) {
        processAndSetData(response.data.records, fetchType);
      } else {
        setActivityData([]);
        setChartData([]);
      }
    } catch (error) {
      console.error(`Error fetching trainer data for ${traineeUsername}'s ${activity}:`, error);
      setError(`Failed to fetch data for ${traineeUsername}'s ${activity}. Please try again.`);
      setActivityData([]);
      setChartData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = () => {
    if (!activityData || activityData.length === 0) return { totalRecords: 0, totalReps: 0, avgReps: 0 };
    const totalRecords = activityData.length;
    const totalReps = activityData.reduce((sum, record) => sum + ((fetchType === "record" ? record.count : record.totalCount) || 0), 0);
    const avgReps = totalRecords > 0 ? (totalReps / totalRecords).toFixed(1) : 0;
    return { totalRecords, totalReps, avgReps };
  };

  const stats = calculateStats();

  useEffect(() => {
    if (isChatOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isChatOpen]);

  const renderContent = () => {
    if (isLoading) {
      return <div className="loading-indicator"><div></div><div></div><div></div></div>;
    }
    if (error) {
      return <div className="error-message">{error}</div>;
    }
    if (chartData.length === 0 && activityData.length === 0) {
      return (
        <div className="placeholder-message">
            <BarChart2 size={48} className="placeholder-icon" />
            <p>No activity data found for the selected criteria.</p>
        </div>
      )
    }
    return (
      <>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon-wrapper" style={{'--icon-bg': '#e7f3ff', '--icon-color': '#007bff'}}><TrendingUp size={24} /></div>
            <div className="stat-info">
                <h3>Total Sets</h3>
                <p>{stats.totalRecords}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrapper" style={{'--icon-bg': '#e8f5e9', '--icon-color': '#4caf50'}}><Repeat size={24} /></div>
            <div className="stat-info">
                <h3>Total Reps</h3>
                <p>{stats.totalReps}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon-wrapper" style={{'--icon-bg': '#fff3e0', '--icon-color': '#ff9800'}}><Calculator size={24} /></div>
            <div className="stat-info">
                <h3>Average Reps</h3>
                <p>{stats.avgReps}</p>
            </div>
          </div>
        </div>

        <div className="content-grid">
          <div className="chart-column">
            <div className="chart-card">
              <h3>Duration (min) vs Day</h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={70} stroke="#666" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#666" />
                  <Tooltip contentStyle={{ borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Legend />
                  <Line type="monotone" dataKey="duration" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3>Repetitions vs Day</h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={70} stroke="#666" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#666" />
                  <Tooltip contentStyle={{ borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Legend />
                  <Bar dataKey="reps" fill="#82ca9d" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="recent-activities-card">
            <h2>Recent Activities</h2>
            <div className="activities-list">
              {activityData.map((activity, index) => (
                <div key={activity._id || index} className="activity-item">
                    <ActivityIcon size={20} className="activity-icon" />
                    <div className="activity-details">
                        <span className="activity-name">{activity.name || selectedActivity}</span>
                        <div className="activity-stats">
                            <span>Reps: <strong>{fetchType === "record" ? activity?.count : activity?.totalCount || 0}</strong></span>
                            <span>Duration: <strong>{parseFloat(fetchType === "record" ? activity.duration : activity.totalDuration || 0).toFixed(2)} min</strong></span>
                        </div>
                    </div>
                    <span className="activity-date">{new Date(activity.createdAt || activity.date || Date.now()).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-content">
        {auth?.user?.userType === "trainer" && (
          <div className="filter-group trainee-selector">
            <label htmlFor="trainee-select">Select Trainee</label>
            <select id="trainee-select" value={selectedTrainee} onChange={(e) => setSelectedTrainee(e.target.value)} disabled={isLoading}>
              <option value="">Select a trainee...</option>
              {connectedTrainees.map((trainee) => (
                <option key={trainee.username} value={trainee.username}>{trainee.name}</option>
              ))}
            </select>
          </div>
        )}
        {(auth?.user?.userType === "trainee" || selectedTrainee) ? (
          <>
            <div className="controls-row">
                <div className="filter-group">
                    <label>Activity</label>
                    <div className="segmented-control">
                        {activities.map((activity) => (
                            <button key={activity} className={selectedActivity === activity ? "active" : ""} onClick={() => setSelectedActivity(activity)} disabled={isLoading}>
                                {activity.charAt(0).toUpperCase() + activity.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="filter-group">
                    <label>Time Period</label>
                    <div className="segmented-control">
                        {timeOptions.map((days) => (
                            <button key={days} className={selectedDays === days ? "active" : ""} onClick={() => setSelectedDays(days)} disabled={isLoading}>
                                {days} days
                            </button>
                        ))}
                    </div>
                </div>
                <div className="filter-group">
                    <label>Data Type</label>
                    <div className="segmented-control">
                        <button className={fetchType === "record" ? "active" : ""} onClick={() => setFetchType("record")} disabled={isLoading}>Individual</button>
                        <button className={fetchType === "day" ? "active" : ""} onClick={() => setFetchType("day")} disabled={isLoading}>Day Wise</button>
                    </div>
                </div>
            </div>
            {renderContent()}
          </>
        ) : (
          <div className="placeholder-message">
            <BarChart2 size={48} className="placeholder-icon" />
            <p>Please select a trainee to view their report.</p>
          </div>
        )}
      </div>

      {!isChatOpen && (
        <button onClick={() => setIsChatOpen(true)} className="chat-fab">
          <MessageCircle size={28} />
        </button>
      )}

      {isChatOpen && (
        <>
          <div className="chat-modal-overlay" onClick={() => setIsChatOpen(false)}></div>
          <div className="chat-modal-container">
            <button onClick={() => setIsChatOpen(false)} className="chat-modal-close-btn"><X size={24} /></button>
            <Chat />
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;