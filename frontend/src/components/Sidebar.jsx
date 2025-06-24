import { useState, useEffect, use } from "react";
import { Users } from "lucide-react";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import useAuth from "../hooks/useAuth";
import "./styles/Sidebar.css";

const Sidebar = ({selectedUser, setSelectedUser}) => {

  const axiosPrivate = useAxiosPrivate();
  const { auth } = useAuth();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (auth?.user?.userType === "trainee") {
      const fetchConnectedTrainers = async () => {
        try {
          const response = await axiosPrivate.get(
            "/api/trainee/request/connected-trainers"
          );
          setUsers(response.data.trainers || []);
        } catch (error) {
          console.error("Error fetching connected trainers:", error);
        }
      };

      fetchConnectedTrainers();
    }

    if (auth?.user?.userType === "trainer") {
      const fetchConnectedTrainees = async () => {
        try {
          const response = await axiosPrivate.get(
            "/api/trainer/request/connected-trainees"
          );
          setUsers(response.data.trainees || []);
        } catch (error) {
          console.error("Error fetching connected trainees:", error);
        }
      };

      fetchConnectedTrainees();
    }
  }, []);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <Users className="sidebar-icon" />
          <span className="sidebar-title-text">Connections</span>
        </div>
      </div>

      <div className="user-list">
        {users.map((user) => (
          <div
            key={user._id}
            onClick={() => setSelectedUser(user)}
            className={`user-button ${
              selectedUser?._id === user._id ? "user-selected" : ""
            }`}
          >
            <div className="user-info">
              <div className="user-name1">{user.name}</div>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default Sidebar;
