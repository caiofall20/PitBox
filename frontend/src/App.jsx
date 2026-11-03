import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import NovaSenha from './pages/NovaSenha.jsx';
import Home from './pages/Home.jsx';
import Garagem from './pages/Garagem.jsx';
import Detalhe from './pages/Detalhe.jsx';
import Escanear from './pages/Escanear.jsx';
import Cadastro from './pages/Cadastro.jsx';
import Desejos from './pages/Desejos.jsx';
import Numeros from './pages/Numeros.jsx';
import Comunidade from './pages/Comunidade.jsx';
import Perfil from './pages/Perfil.jsx';
import CarroDeOutro from './pages/CarroDeOutro.jsx';
import Moderacao from './pages/Moderacao.jsx';
import Usuarios from './pages/Usuarios.jsx';
import Mais from './pages/Mais.jsx';
import NotFound from './pages/NotFound.jsx';
import { NeedsAccount } from './components/Guest.jsx';

const Guard = ({ roles, children }) => { const { user } = useAuth(); return roles.includes(user.role) ? children : <Navigate to="/" replace />; };

export default function App() {
  const { user, ready, guest } = useAuth(), { pathname } = useLocation();
  if (!ready) return <div className="auth"><div className="spinner" /></div>;
  // Link do e-mail de recuperação: abre mesmo com alguém conectado neste aparelho
  if (pathname === '/redefinir-senha') return <NovaSenha />;
  if (!user && !guest) return <Login />;
  // Visitante: só vê garagens e carros públicos; qualquer outra rota pede para criar conta
  if (!user) return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/comunidade" replace />} />
        <Route path="comunidade" element={<Comunidade />} />
        <Route path="u/:handle" element={<Perfil />} />
        <Route path="u/:handle/:carId" element={<CarroDeOutro />} />
        <Route path="*" element={<NeedsAccount />} />
      </Route>
    </Routes>
  );
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="garagem" element={<Garagem />} />
        <Route path="garagem/:id" element={<Detalhe />} />
        <Route path="garagem/:id/editar" element={<Cadastro />} />
        <Route path="escanear" element={<Escanear />} />
        <Route path="cadastro" element={<Cadastro />} />
        <Route path="desejos" element={<Desejos />} />
        <Route path="numeros" element={<Numeros />} />
        <Route path="comunidade" element={<Comunidade />} />
        <Route path="u/:handle" element={<Perfil />} />
        <Route path="u/:handle/:carId" element={<CarroDeOutro />} />
        <Route path="moderacao" element={<Guard roles={['moderador', 'admin']}><Moderacao /></Guard>} />
        <Route path="usuarios" element={<Guard roles={['admin']}><Usuarios /></Guard>} />
        <Route path="mais" element={<Mais />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
