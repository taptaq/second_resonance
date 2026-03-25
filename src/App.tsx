import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Home from './pages/Home';
import Room from './pages/Room';
import SongHub from './pages/SongHub';
import Lobby from './pages/Lobby';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/hub" element={<Home />} />
        <Route path="/select-song" element={<SongHub />} />
        <Route path="/lobby/:songId" element={<Lobby />} />
        <Route path="/room/:id" element={<Room />} />
      </Routes>
    </BrowserRouter>
  );
}
