import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from './ui/button';
import { clearToken } from '../api';

export function LogoutButton() {
  const navigate = useNavigate();

  function handleLogout() {
    clearToken();
    navigate('/login', { replace: true });
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-gray-600 hover:text-[#059669]"
      onClick={handleLogout}
    >
      <LogOut className="w-4 h-4 mr-1.5" aria-hidden />
      로그아웃
    </Button>
  );
}
