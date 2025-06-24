import { Link } from 'react-router-dom';
import { Activity, Award, BarChart2, Users, MessageSquare, ArrowRight } from 'lucide-react';
import Footer from '../components/Footer';
import useAuth from '../hooks/useAuth';
import './styles/Home.css';

const Home = () => {
  const { auth } = useAuth();
  const isAuthenticated = !!auth?.user;

  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="animate-fade-in-up">AI-Powered Fitness Tracking & Coaching</h1>
          <p className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Improve your form, track your progress, and achieve your fitness goals with personalized AI coaching.
          </p>
          <div className="cta-buttons animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            {!isAuthenticated ? (
              <>
                <Link to="/signup" className="btn btn-primary">Signup</Link>
                <Link to="/login" className="btn btn-primary">Log In</Link>
              </>
            ) : (
              <Link to="/dashboard" className="btn btn-primary">Go to Dashboard <ArrowRight size={20} /></Link>
            )}
          </div>
        </div>
        <div className="hero-visual animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <Activity size={250} className="hero-icon" />
        </div>
      </section>

      <section className="features-section">
        <div className="section-header">
          <h2>Core Features</h2>
          <p>Everything you need to elevate your fitness journey.</p>
        </div>
        <div className="features-grid">

          <div className="feature-card">
            <Award size={48} className="feature-icon" />
            <h3>Real-time Form Analysis</h3>
            <p>Get instant, AI-driven feedback on your exercise form to maximize effectiveness and prevent injury.</p>
          </div>

          <div className="feature-card">
            <BarChart2 size={48} className="feature-icon" />
            <h3>Progress Tracking</h3>
            <p>Monitor your fitness journey with detailed analytics, visual charts, and milestone achievements.</p>
          </div>

          <div className="feature-card">
            <Users size={48} className="feature-icon" />
            <h3>Expert Trainers</h3>
            <p>Access a network of certified trainers for professional guidance, personalized plans, and support.</p>
          </div>

          <div className="feature-card">
            <MessageSquare size={48} className="feature-icon" />
            <h3>One-on-One Chat</h3>
            <p>Directly connect with your chosen trainer via chat for questions, motivation, and adjustments.</p>
          </div>
        </div>
      </section>

      <section className="how-it-works-section">
        <div className="section-header">
          <h2>How It Works in 3 Simple Steps</h2>
        </div>
        <div className="steps-container">
          <div className="step-card">
            <div className="step-number">1</div>
            <h3>Record</h3>
            <p>Use your camera to record your workout. Our AI handles the rest.</p>
          </div>
          <div className="step-card">
            <div className="step-number">2</div>
            <h3>Get Instant Analysis</h3>
            <p>Receive immediate, feedback on your form.</p>
          </div>
          <div className="step-card">
            <div className="step-number">3</div>
            <h3>Track & Improve</h3>
            <p>Watch your progress over time and connect with trainers to reach new heights.</p>
          </div>
        </div>
      </section>

      <section className="testimonial-section">
        <div className="testimonial-content">
          <blockquote>
            “This platform completely changed how I approach my workouts. The real-time feedback is a game-changer”
          </blockquote>
        </div>
      </section>

      <section className="final-cta-section">
        <div className="section-header">
          <h2>Ready to Transform Your Fitness?</h2>
          <p>Join users who are achieving their goals with AI-powered coaching.</p>
        </div>
        {
          isAuthenticated ?
          <Link to="/workout-studio" className="btn-primary btn-large">Start Your Journey Now</Link>:
          <Link to="/signup" className="btn-primary btn-large">Start Your Journey Now</Link>
        }
      </section>

      <Footer />
    </div>
  );
};

export default Home;