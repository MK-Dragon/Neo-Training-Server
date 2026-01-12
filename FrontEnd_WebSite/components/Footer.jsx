// /src/components/Footer.jsx


import 'bootstrap-icons/font/bootstrap-icons.css';

function Footer() {

  return (
    <>
        <footer class="footer">
            <div class="container">
                <div class="row align-items-center">
                    <div class="col-md-6 text-center text-md-start mb-3 mb-md-0">
                        <p class="mb-0">&copy; 2026 Marco Candeias. | All rights reserved. <i class="bi bi-emoji-laughing"></i></p>
                    </div>
                    <div class="col-md-6 text-center text-md-end">
                        <div class="social-icons">
                            <a href="#" aria-label="Facebook"><i class="fab fa-facebook"></i></a>
                            <a href="#" aria-label="Twitter"><i class="fab fa-twitter"></i></a>
                            <a href="#" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
                            <a href="#" aria-label="LinkedIn"><i class="fab fa-linkedin"></i></a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    </>
  );
};

export default Footer;

