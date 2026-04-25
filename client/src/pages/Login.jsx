import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import Card, { CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const getRoleRedirect = (role) => {
    switch (role) {
      case 'superAdmin':
      case 'admin':          return '/dashboard/admin/users';
      case 'propertyOwner':  return '/dashboard/properties';
      case 'securityOfficer': return '/dashboard/scan';
      default:               return '/dashboard/bookings'; // customer
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const res = await login({ email, password });
    if (res.success) {
      // res.user is not returned; read it from the store after login
      const { user } = useAuthStore.getState();
      navigate(getRoleRedirect(user?.role));
    } else {
      setErrorMsg(res.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold text-primary-600">Sportek</Link>
        </div>
        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader className="text-center">
              <CardTitle>Welcome back</CardTitle>
              <p className="mt-2 text-sm text-slate-600">Sign in to your account</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {errorMsg && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm font-medium border border-red-100">
                  {errorMsg}
                </div>
              )}
              <Input 
                label="Email address" 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input 
                label="Password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" isLoading={isLoading}>
                Sign In
              </Button>
              <p className="text-sm text-center text-slate-600">
                Don't have an account?{' '}
                <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
                  Sign up
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default Login;
