// /src/components/Footer.jsx
import 'bootstrap-icons/font/bootstrap-icons.css';

function Footer() {
  return (
    <>
      {/* Spacing div to push footer down */}
      <div className="py-5"></div> 

      <footer className="footer py-4 border-top bg-white">
        <div className="container">
          <div className="row align-items-center">
            
            {/* Copyright & Emoji Section */}
            <div className="col-md-6 text-center text-md-start mb-3 mb-md-0">
              <p className="mb-0 d-flex align-items-center justify-content-center justify-content-md-start">
                <span>&copy; 2026 Marco Candeias. | All rights reserved.</span>
                <i className="bi bi-emoji-laughing ms-2 text-dark" style={{ fontSize: '1.2rem' }}></i>
              </p>
            </div>

            {/* Social Icons Section - Focusing on GitHub & LinkedIn */}
            <div className="col-md-6 text-center text-md-end">
              <div className="social-icons fs-3">
                <a 
                  href="https://github.com/my-username" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-dark me-4" 
                  aria-label="GitHub"
                >
                  <i className="bi bi-github"></i>
                </a>
                <a 
                  href="https://linkedin.com/in/my-username" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-dark" 
                  aria-label="LinkedIn"
                >
                  <i className="bi bi-linkedin"></i>
                </a>
              </div>
            </div>

          </div>
        </div>
      </footer>
    </>
  );
}

export default Footer;