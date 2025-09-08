import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { toast } from 'react-hot-toast';

const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useUser();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      
      if (token) {
        try {
          // Decode JWT token to get user data
          const payload = JSON.parse(atob(token.split('.')[1]));
          const userData = {
            id: payload.id,
            name: payload.name,
            email: payload.email,
            picture: payload.picture
          };
          
          console.log('Decoded user data:', userData); // Debug log
          
          // Store user data and token
          login(userData, token);
          
          toast.success('Successfully logged in!');
          navigate('/');
        } catch (error) {
          console.error('Token processing failed:', error);
          toast.error('Login failed. Please try again.');
          navigate('/');
        }
      } else {
        toast.error('No authentication token received.');
        navigate('/');
      }
    };

    handleCallback();
  }, [searchParams, login, navigate]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#1f1f1f',
      color: 'white'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }}></div>
        <p>Completing login...</p>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    </div>
  );
};

export default AuthCallback;
