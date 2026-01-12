import React from 'react';
import { Link } from 'react-router-dom';

// 1. Import your images from the src folder
import jokesImg from '../imgs/jokes.png';
import dndImg from '../imgs/dnd.png';

const Home = () => {
  // Simple hover effect style
  const cardStyle = {
    transition: 'transform 0.2s ease-in-out',
    cursor: 'pointer'
  };

  return (
    <section className="bg-light py-5 min-vh-100 d-flex align-items-center">
      <div className="container text-center">
        {/* Title */}
        <h1 className="display-3 fw-bold mb-5">Welcome to LolTrap</h1>

        {/* Image Grid */}
        <div className="row g-4 mb-5 justify-content-center">
          
          {/* Jokes Link */}
          <div className="col-12 col-md-5">
            <Link to="jokes" className="text-decoration-none">
              <div 
                className="shadow rounded overflow-hidden bg-white border"
                style={cardStyle}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <img 
                  src={jokesImg} // 2. Use the imported variable here
                  className="img-fluid" 
                  alt="Get Funny Jokes" 
                />
                <div className="py-3">
                  <h3 className="h4 text-dark mb-0">Need a Joke??</h3>
                </div>
              </div>
            </Link>
          </div>

          {/* D&D Link */}
          <div className="col-12 col-md-5">
            <Link to="dnd" className="text-decoration-none">
              <div 
                className="shadow rounded overflow-hidden bg-white border"
                style={cardStyle}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <img 
                  src={dndImg} // 2. Use the imported variable here
                  className="img-fluid" 
                  alt="Dragons VS Humanity" 
                />
                <div className="py-3">
                  <h3 className="h4 text-dark mb-0">Dragons VS Humanity</h3>
                </div>
              </div>
            </Link>
          </div>

        </div>

        
      </div>
    </section>
  );
};

export default Home;