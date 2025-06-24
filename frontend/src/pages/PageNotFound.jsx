import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import Footer from "../components/Footer";
import "./styles/PageNotFound.css";

const PageNotFound = () => {
  return (
    <div className="not-found">
      <div className="hero-section">
        <div className="hero-content">
          <h1>404 - Page Not Found</h1>
          <p>Oops! The page you are looking for does not exist.</p>
          <div className="cta-buttons">
            <Link to="/" className="btn-primary">Go to Home</Link>
          </div>
        </div>
        <div className="hero-image">
          <FontAwesomeIcon icon={faTriangleExclamation} size="6x" className="hero-icon" />
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PageNotFound;
