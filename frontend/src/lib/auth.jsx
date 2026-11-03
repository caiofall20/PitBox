import { createContext, useContext, useEffect, useState } from 'react';
import { api, hasToken, setToken, setUnauthorizedHandler } from '../services/api.js';
const Ctx = createContext(null);
const GUEST_KEY = 'pitbox-guest';
const readGuest = () => { try { return sessionStorage.getItem(GUEST_KEY) === '1'; } catch { return false; } };
const saveGuest = on => { try { on ? sessionStorage.setItem(GUEST_KEY, '1') : sessionStorage.removeItem(GUEST_KEY); } catch { /* sem storage, vale só nesta aba */ } };
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null), [ready, setReady] = useState(!hasToken());
  // Visitante: navega sem conta, só lê garagens públicas. askAccount abre o convite para criar conta.
  const [guest, setGuestState] = useState(readGuest), [invite, setInvite] = useState(null), [loginTab, setLoginTab] = useState('entrar');
  // loginAsked: a pessoa pediu o login (Sair, "Entrar" no modo visitante...). Aí o celular pula a tela de Boas-vindas.
  const [loginAsked, setLoginAsked] = useState(false);
  const setGuest = on => { saveGuest(on); setGuestState(on); };
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    if (hasToken()) api.me().then(setUser).catch(() => setToken(null)).finally(() => setReady(true));
  }, []);
  const enter = ({ token, user }) => { setToken(token); setGuest(false); setInvite(null); setUser(user); };
  const value = {
    user, ready, setUser, guest, invite, loginTab, loginAsked,
    login: async (e, p) => enter(await api.login(e, p)), register: async (n, e, p) => enter(await api.register(n, e, p)), resetPassword: async (t, p) => enter(await api.reset(t, p)), googleLogin: async credential => enter(await api.google(credential)), logout: () => { setToken(null); setGuest(false); setInvite(null); setLoginTab('entrar'); setLoginAsked(true); setUser(null); },
    explore: () => setGuest(true),
    askAccount: reason => setInvite(reason || 'Crie sua conta grátis para montar a sua garagem.'), closeInvite: () => setInvite(null),
    // Sai do modo visitante e abre a tela de login na aba pedida, mantendo a página atual para depois do cadastro
    goToLogin: (tab = 'criar') => { setInvite(null); setLoginTab(tab); setLoginAsked(true); setGuest(false); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
