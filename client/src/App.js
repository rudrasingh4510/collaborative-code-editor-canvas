import './App.css';
import { Routes, Route } from "react-router-dom";
import Home from './components/Home';
import EditorPage from './components/EditorPage';
import AuthCallback from './components/AuthCallback';
import { UserProvider } from './contexts/UserContext';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <UserProvider>
      <div>
        <Toaster position='top-center'></Toaster>
      </div>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/editor/:roomId' element={<EditorPage />} />
        <Route path='/auth/callback' element={<AuthCallback />} />
      </Routes>
    </UserProvider>
  );
}

export default App;
