import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { ToastProvider } from '../components/ui/Overlay.jsx';
import { PageLoader } from '../components/ui/Display.jsx';

const ClientContext = createContext(null);
const AuthContext = createContext(null);
const SocketContext = createContext(null);

export const useClient = () => {
  const client = useContext(ClientContext);
  if (!client) throw new Error('useClient must be used inside AppProviders');
  return client;
};

export const useAuth = () => useContext(AuthContext);
export const useSocket = () => useContext(SocketContext);

function AuthProvider({ client, portal, children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(client.getToken()));

  useEffect(() => {
    if (!client.getToken()) return;
    client
      .get('/auth/me')
      .then(({ data }) => (data.role === portal ? setUser(data) : client.setToken(null)))
      .catch(() => client.setToken(null))
      .finally(() => setLoading(false));
  }, [client, portal]);

  useEffect(() => {
    const onUnauthorized = () => {
      client.setToken(null);
      setUser(null);
    };
    window.addEventListener('ecomedu:unauthorized', onUnauthorized);
    return () => window.removeEventListener('ecomedu:unauthorized', onUnauthorized);
  }, [client]);

  const login = useCallback(
    async (email, password) => {
      const { data } = await client.post('/auth/login', { email, password, portal });
      client.setToken(data.token);
      setUser(data.user);
      return data.user;
    },
    [client, portal],
  );

  const register = useCallback(
    async (payload) => {
      const { data } = await client.post('/auth/register', payload);
      client.setToken(data.token);
      setUser(data.user);
      return data.user;
    },
    [client],
  );

  const logout = useCallback(() => {
    client.setToken(null);
    setUser(null);
  }, [client]);

  const refreshUser = useCallback(async () => {
    const { data } = await client.get('/auth/me');
    setUser(data);
    return data;
  }, [client]);

  const value = useMemo(() => ({ user, setUser, loading, login, register, logout, refreshUser, portal }), [user, loading, login, register, logout, refreshUser, portal]);

  if (loading) return <PageLoader />;
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function SocketProvider({ client, children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user) return undefined;
    const origin = new URL(client.baseURL, window.location.origin).origin;
    const instance = io(origin, { auth: { token: client.getToken() }, transports: ['websocket', 'polling'] });
    setSocket(instance);
    return () => {
      instance.disconnect();
      setSocket(null);
    };
  }, [user?.id, client]); // eslint-disable-line react-hooks/exhaustive-deps

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export function AppProviders({ client, portal, children }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1, staleTime: 15000 } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <ClientContext.Provider value={client}>
        <ToastProvider>
          <AuthProvider client={client} portal={portal}>
            <SocketProvider client={client}>{children}</SocketProvider>
          </AuthProvider>
        </ToastProvider>
      </ClientContext.Provider>
    </QueryClientProvider>
  );
}
