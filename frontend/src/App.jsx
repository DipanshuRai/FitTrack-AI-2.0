import { Routes, Route } from "react-router-dom";
import { Toaster } from 'react-hot-toast';
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ContactUs from "./pages/ContactUs";
import Profile from "./pages/Profile";
import WorkoutStudio from "./pages/WorkoutStudio";
import PageNotFound from "./pages/PageNotFound";
import RequireAuth from "./components/RequireAuth";
import AccessDenied from "./pages/AccessDenied";
import PersistLogin from "./components/PersistLogin";
import "./App.css";

function App() {
  return (
    <div className="app">
      <Navbar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        <Route element={<PersistLogin />}>
          <Route path="/" element={<Home />} />
          <Route
            element={<RequireAuth allowedUsers={["trainee", "trainer"]} />}
          >
            <Route path="/profile" element={<Profile />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>

          <Route element={<RequireAuth allowedUsers={["trainee"]} />}>
            <Route path="/workout-studio" element={<WorkoutStudio />} />
          </Route>
          <Route path="/contact" element={<ContactUs />} />

          <Route path="/access-denied" element={<AccessDenied />} />
          <Route path="*" element={<PageNotFound />} />
        </Route>
      </Routes>
      <Toaster/>
    </div>
  );
}

export default App;
