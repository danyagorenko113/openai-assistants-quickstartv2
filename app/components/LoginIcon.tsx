import React from 'react';
import { UserCircle } from 'lucide-react';

interface LoginIconProps {
  onClick: () => void;
}

const LoginIcon: React.FC<LoginIconProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors"
      aria-label="Login"
    >
      <UserCircle size={24} />
    </button>
  );
};

export default LoginIcon;
