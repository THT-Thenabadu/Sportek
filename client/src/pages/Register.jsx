import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import Card, { CardHeader, CardTitle, CardContent, CardFooter } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

function Register() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', phone: '', institute: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    const res = await register(formData);
    if (res.success) {
      navigate('/');
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
              <CardTitle>Create an account</CardTitle>
              <p className="mt-2 text-sm text-slate-600">Join the Sportek community</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {errorMsg && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm font-medium border border-red-100">
                  {errorMsg}
                </div>
              )}
              <Input 
                label="Full Name" 
                name="name"
                required 
                value={formData.name}
                onChange={handleChange}
              />
              <Input 
                label="Email address" 
                type="email" 
                name="email"
                required 
                value={formData.email}
                onChange={handleChange}
              />
              <Input 
                label="Phone Number" 
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
              <Input
                label="Institute/Campus (Optional)"
                type="text"
                name="institute"
                value={formData.institute}
                onChange={handleChange}
                placeholder="e.g. SLIIT"
              />
              <Input 
                label="Password" 
                type="password" 
                name="password"
                required 
                minLength={6}
                value={formData.password}
                onChange={handleChange}
              />
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" isLoading={isLoading}>
                Register
              </Button>
              <p className="text-sm text-center text-slate-600">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
                  Log in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default Register;
