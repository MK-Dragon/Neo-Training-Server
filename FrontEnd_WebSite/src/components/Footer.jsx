// /src/components/Footer.jsx
import 'bootstrap-icons/font/bootstrap-icons.css';

const USER_GitHub = import.meta.env.VITE_USER_GITHUB;
const USER_LinkedIn = import.meta.env.VITE_USER_LINKEDIN;

function Footer() {
  return (
    <footer className="footer py-4 custom-footer mt-auto"> {/* mt-auto is a backup safety */}
      <div className="container">
        <div className="row align-items-center">
          
          <div className="col-md-6 text-center text-md-start mb-3 mb-md-0">
            <p className="mb-0 d-flex align-items-center justify-content-center justify-content-md-start">
              <span>&copy; 2026 My Myself and I. | All rights reserved.</span>
              <i className="bi bi-emoji-laughing ms-2 text-dark" style={{ fontSize: '1.2rem' }}></i>
            </p>
          </div>

          <div className="col-md-6 text-center text-md-end">
            <div className="social-icons fs-3">
              <a href={USER_GitHub} target="_blank" rel="noopener noreferrer" className="text-dark me-4" aria-label="GitHub">
                <i className="bi bi-github"></i>
              </a>
              <a href={USER_LinkedIn} target="_blank" rel="noopener noreferrer" className="text-dark" aria-label="LinkedIn">
                <i className="bi bi-linkedin"></i>
              </a>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
}

export default Footer;