import { useState, useEffect, useRef } from 'react'; 
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Activity, User, LogOut, Menu, X } from 'lucide-react'; 
import useLogout from '../hooks/useLogout';
import useAuth from '../hooks/useAuth';

import './styles/Navbar.css';

const Navbar = () => {
  const logout = useLogout();
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [isDropDownOpen, setIsDropDownOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const dropdownRef = useRef(null);
  const menuRef = useRef(null);
  const userType = auth?.user?.userType;
  const name = auth?.user?.name;
  const isAuthenticated = !!auth?.user;

  const toggleDropdown = () => setIsDropDownOpen(prev => !prev);
  const toggleMenu = () => setIsMenuOpen(prev => !prev);

  const handleLogout = () => {
    logout();
    setIsDropDownOpen(false);
    navigate('/');
  };

  const handleLinkClick = () => {
    setIsMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropDownOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <nav className="navbar" ref={menuRef}>
      <div className="navbar-brand">
        <Activity size={28} className="brand-icon" />
        <NavLink to="/">FitTrack AI</NavLink>
        {isAuthenticated && <div className="type-badge">{userType}</div>}
      </div>

      <button className="menu-toggle" onClick={toggleMenu}>
        {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
      </button>

      <div className={`navbar-links ${isMenuOpen ? 'active' : ''}`}>
        <NavLink to="/" onClick={handleLinkClick}>Home</NavLink>
        {isAuthenticated && (
          <>
            <NavLink to="/dashboard" onClick={handleLinkClick}>Dashboard</NavLink>
            {userType === 'trainee' && <NavLink to="/workout-studio" onClick={handleLinkClick}>Workout Studio</NavLink>}
            <NavLink to="/profile" onClick={handleLinkClick}>Profile</NavLink>
          </>
        )}
        <NavLink to="/contact" onClick={handleLinkClick}>Contact Us</NavLink>

        {!isAuthenticated ? (
          <div className="auth-buttons">
            <NavLink to="/login" className="btn-login1" onClick={handleLinkClick}>Log In</NavLink>
            <NavLink to="/signup" className="btn-signup1" onClick={handleLinkClick}>Sign Up</NavLink>
          </div>
        ) : (
          <div className="user-menu" ref={dropdownRef}>
            <div className="user-name" onClick={toggleDropdown}>
              <User size={18} />
              <span>{name}</span>
            </div>
            <div className={`dropdown-menu ${isDropDownOpen ? 'open' : ''}`}>
              <button onClick={handleLogout} className="btn-logout">
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;