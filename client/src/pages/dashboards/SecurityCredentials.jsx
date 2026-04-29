import React, { useState, useEffect } from 'react';
import api from '../../lib/axios';
import useAuthStore from '../../store/useAuthStore';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Eye, EyeOff, Shield, Mail, Lock, CheckCircle, XCircle } from 'lucide-react';

function SecurityCredentials() {
  const { user } = useAuthStore();
  const [securityOfficer, setSecurityOfficer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetchSecurityOfficer();
  }, []);

  const fetchSecurityOfficer = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users/my-security-officer');
      setSecurityOfficer(res.data);
      setFormData({
        email: res.data.email,
        password: '',
        confirmPassword: ''
      });
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load security officer credentials');
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    
    // Email validation
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }

    // Password validation (only if password is being changed)
    if (formData.password) {
      if (formData.password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
      } else if (!/^[a-zA-Z0-9]+$/.test(formData.password)) {
        errors.password = 'Password must contain only letters and numbers';
      }
      
      if (formData.password !== formData.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      const updateData = {
        email: formData.email
      };

      // Only include password if it's being changed
      if (formData.password) {
        updateData.password = formData.password;
      }

      await api.put('/users/update-security-officer', updateData);
      
      setSuccessMessage('Security officer credentials updated successfully!');
      setShowEditModal(false);
      
      // Refresh the data
      await fetchSecurityOfficer();
      
      // Clear password fields
      setFormData(prev => ({
        ...prev,
        password: '',
        confirmPassword: ''
      }));

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update credentials');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-primary-100 rounded-lg">
          <Shield className="w-8 h-8 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Security Dashboard Credentials</h1>
          <p className="text-slate-500">Manage your security officer login credentials</p>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3 text-emerald-700">
          <CheckCircle className="w-5 h-5" />
          <p className="text-sm font-medium">{successMessage}</p>
        </div>
      )}

      {error && !showEditModal && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
          <XCircle className="w-5 h-5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {securityOfficer ? (
        <Card className="shadow-md">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle className="text-lg">Current Security Officer Credentials</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email Address
                </label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-slate-900 font-medium">{securityOfficer.email}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  <Lock className="w-4 h-4 inline mr-2" />
                  Password
                </label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-slate-500 font-mono">••••••••</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button onClick={() => setShowEditModal(true)} className="w-full md:w-auto">
                Update Credentials
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-md">
          <CardContent className="py-12 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500">No security officer found for your account.</p>
          </CardContent>
        </Card>
      )}

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)}>
        <div className="p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Update Security Credentials</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <XCircle className="w-4 h-4" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full border ${formErrors.email ? 'border-red-300' : 'border-slate-300'} rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500`}
                placeholder="security@example.com"
              />
              {formErrors.email && (
                <p className="mt-1 text-xs text-red-600">{formErrors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                New Password (leave blank to keep current)
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full border ${formErrors.password ? 'border-red-300' : 'border-slate-300'} rounded-lg px-4 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500`}
                  placeholder="Enter new password (letters and numbers only)"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {formErrors.password && (
                <p className="mt-1 text-xs text-red-600">{formErrors.password}</p>
              )}
              <p className="mt-1 text-xs text-slate-500">Must be at least 6 characters with letters and numbers only</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Confirm New Password
              </label>
              <input
                type={showNewPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                className={`w-full border ${formErrors.confirmPassword ? 'border-red-300' : 'border-slate-300'} rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500`}
                placeholder="Confirm new password"
              />
              {formErrors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">{formErrors.confirmPassword}</p>
              )}
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800">
                <strong>Note:</strong> The new password must be different from your property owner login password.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={saving}
                disabled={saving}
                className="flex-1"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}

export default SecurityCredentials;
