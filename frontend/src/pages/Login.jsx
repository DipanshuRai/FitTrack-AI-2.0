import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import axios from "../api/axios";
import "./styles/SignUp.css";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const LOGIN_URL="/api/auth/login";

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [isFormValid, setIsFormValid] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const { setAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from.pathname || "/";

  useEffect(() => {
    const isValid =
      Object.values(errors).every((error) => !error) &&
      Object.values(formData).every((value) => value !== "");
    setIsFormValid(isValid);
  }, [formData, errors]);

  const validateField = (name, value) => {
    let errorMessage = "";
    switch (name) {
      case "email":
        if (!/\S+@\S+\.\S+/.test(value)) errorMessage = "Invalid email format";
        break;
      case "password":
        if (value.length < 8) errorMessage = "Password must be at least 8 characters";
        break;
      default:
        break;
    }
    return errorMessage;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: validateField(name, value) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    let hasErrors = false;

    Object.entries(formData).forEach(([name, value]) => {
      const error = validateField(name, value);
      newErrors[name] = error;
      if (error) hasErrors = true;
    });
    setErrors(newErrors);

    if (hasErrors) {
      setFormError("Please correct the errors before submitting");
      return;
    }

    setFormError("");
    try {
      setIsLoggingIn(true);
      const response = await axios.post(LOGIN_URL, formData, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });      
      setAuth(response.data);      
      navigate(from, {replace:true});
    } catch (error) {
      if (error.response?.status === 401) {
        setFormError("Invalid email or password");
      }else {
        setFormError("Login failed. Please try again.");
      }
    } finally{
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Login</h2>
        {formError && <div className="error">{formError}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? "error-input" : ""}
              required
            />
            {errors.email && <div className="input-error">{errors.email}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={errors.password ? "error-input" : ""}
              required
            />
            {errors.password && <div className="input-error">{errors.password}</div>}
          </div>
          <button type="submit" className="btn-primary" disabled={!isFormValid}>
            {isLoggingIn ? <span className="loader"></span> : "Login"}
          </button>
        </form>
        <div className="redirect">
          Don't have account?  
          <Link to='/signup'>SignUp</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
