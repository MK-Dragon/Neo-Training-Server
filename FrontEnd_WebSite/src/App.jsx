import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'


// Main Components:
import NavBar from './components/NavBar';
import Footer from './components/Footer';

// Pages:
import Home from './Pages/Home.jsx'



function App() {
  const [count, setCount] = useState(0)

  function App() {

  return (
    <>
      <NavBar />
      <br /><br />

      <BrowserRouter>

        {/* Routes */}
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>

      </BrowserRouter>

      <br /><br />
      <Footer />
    </>
    )
  }
}

export default App
