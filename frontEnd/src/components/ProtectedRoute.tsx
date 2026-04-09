import { createContext, useContext, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { getToken } from '../api';
import { ChatSidebar } from './ChatSidebar';

const SIDEBAR_WIDTH = 650;
const STORAGE_KEY = 'palantiny_chat_open';

interface ChatContextValue {
  isChatOpen: boolean;
}

export const ChatContext = createContext<ChatContextValue>({ isChatOpen: false });
export const useChatContext = () => useContext(ChatContext);

export function ProtectedRoute() {
  const location = useLocation();
  const token = getToken();

  const [isChatOpen, setIsChatOpen] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  const handleToggle = () => {
    const next = !isChatOpen;
    setIsChatOpen(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  };

  return (
    <ChatContext.Provider value={{ isChatOpen }}>
      <div
        style={{
          paddingRight: isChatOpen ? SIDEBAR_WIDTH : 0,
          transition: 'padding-right 300ms ease',
        }}
      >
        <Outlet />
        <ChatSidebar isOpen={isChatOpen} onToggle={handleToggle} />
      </div>
    </ChatContext.Provider>
  );
}
