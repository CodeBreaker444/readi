'use client';
import { SessionUser } from '@/lib/auth/server-session';
import axios from 'axios';
import { Award, Camera, Loader2, User, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Skeleton } from './ui/skeleton';

interface Qualification {
  qualification_id: number;
  qualification_name: string;
  qualification_type: string;
  description: string | null;
  start_date: string | null;
  expiry_date: string | null;
  status: string;
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  userData: SessionUser | null;
}

const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  isDark,
  userData,
}) => {
  const canEditEmail = userData?.role === 'ADMIN' || userData?.role === 'SUPERADMIN';

  const [formData, setFormData] = useState({
    fullName: userData?.fullname || '',
    email: userData?.email || '',
    phone: userData?.phone || '',
    timezone: '',
    department: 'Global',
    client: '',
    profile: '',
    type: '',
    signature: '',
  });
  const [qualifications, setQualifications] = useState<Qualification[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(
    userData?.avatar ?? null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchUserProfile();
    }
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [isOpen]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const [profileRes, qualsRes] = await Promise.all([
        axios.get('/api/profile'),
        userData?.userId
          ? axios.get(`/api/team/user/qualifications?user_id=${userData.userId}`).catch(() => null)
          : Promise.resolve(null),
      ]);

      const data = profileRes.data;
      if (data.success) {
        setFormData({
          fullName: data.user.fullName || '',
          email: data.user.email || '',
          phone: data.user.phone || '',
          timezone: data.user.user_timezone || 'IST',
          department: 'Global',
          client: '',
          profile: '',
          type: data.user.user_type || '',
          signature: data.user.users_profile?.user_signature || '',
        });
        if (data.user.avatar_url) {
          setCurrentAvatarUrl(data.user.avatar_url);
        }
      }

      if (qualsRes?.data?.data) {
        setQualifications(qualsRes.data.data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (file.size > 10 * 1024 * 1024) {
        toast.error('Avatar must be under 10MB');
        return;
      }
      if (
        !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(
          file.type,
        )
      ) {
        toast.error('Avatar must be JPEG, PNG, WebP, or GIF');
        return;
      }

      setAvatar(file);
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const formDataToSend = new FormData();
    formDataToSend.append('fullname', formData.fullName);
    formDataToSend.append('email', formData.email);
    formDataToSend.append('phone', formData.phone);
    formDataToSend.append('timezone', formData.timezone);

    if (avatar) {
      formDataToSend.append('avatar', avatar);
    }

    try {
      const response = await axios.post('/api/profile', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const result = response.data;

      if (result.updateResult) {
        toast.success('Profile updated successfully');
        if (result.avatarUrl) {
          setCurrentAvatarUrl(result.avatarUrl);
          setAvatarPreview(null);
          setAvatar(null);
        }
        onClose();
        window.location.reload();
      } else {
        toast.error(result.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const displayAvatar = avatarPreview || currentAvatarUrl;

  const inputClass = `w-full px-3 py-2 rounded-lg border text-sm transition-colors ${isDark
      ? 'bg-slate-600 border-slate-500 text-white placeholder-gray-400 focus:border-violet-500'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-violet-500'
    } focus:outline-none focus:ring-2 focus:ring-violet-500/20`;

  const labelClass = `block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'
    }`;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
      <div
        className={`w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-lg shadow-2xl ${isDark ? 'bg-slate-800' : 'bg-white'
          }`}
      >
        <div
          className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'
            }`}
        >
          <h2
            className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-800'
              }`}
          >
            User Profile:{' '}
            {userData?.fullname || userData?.username || 'Unknown User'}
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${isDark
                ? 'hover:bg-slate-700 text-gray-400'
                : 'hover:bg-gray-100 text-gray-600'
              }`}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div
                className={`rounded-lg p-6 ${isDark ? 'bg-slate-700' : 'bg-gray-50'
                  }`}
              >
                <div className="flex flex-col items-center mb-6">
                  <div className="relative group">
                    <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white shadow-lg">
                      {displayAvatar ? (
                        <img
                          src={displayAvatar}
                          alt="Profile"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              'none';
                            (
                              e.target as HTMLImageElement
                            ).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div
                        className={`${displayAvatar ? 'hidden' : ''} w-full h-full flex items-center justify-center ${isDark ? 'bg-slate-600' : 'bg-gray-200'
                          }`}
                      >
                        <User
                          className={`w-12 h-12 ${isDark ? 'text-slate-400' : 'text-gray-400'
                            }`}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center shadow-md transition-colors"
                    >
                      <Camera className="w-4 h-4" />
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileChange}
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                    />
                  </div>

                  {avatar && (
                    <span
                      className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'
                        }`}
                    >
                      {avatar.name}
                    </span>
                  )}

                  <p
                    className={`text-sm font-medium mt-3 ${isDark ? 'text-gray-300' : 'text-gray-700'
                      }`}
                  >
                    {formData.fullName || 'User'}
                  </p>
                  <p
                    className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'
                      }`}
                  >
                    {formData.email}
                  </p>
                </div>

                <div
                  className={`space-y-4 pt-4 border-t ${isDark ? 'border-slate-600' : 'border-gray-200'
                    }`}
                >
                  <div>
                    <label className={labelClass}>Full Name</label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className={inputClass}
                      placeholder="Enter full name"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`${inputClass} ${!canEditEmail ? 'opacity-60 cursor-not-allowed' : ''}`}
                      placeholder="Enter email address"
                      disabled={!canEditEmail}
                      readOnly={!canEditEmail}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={inputClass}
                      placeholder="Enter phone number"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>TimeZone</label>
                    <select
                      name="timezone"
                      value={formData.timezone}
                      onChange={handleInputChange}
                      className={inputClass}
                    >
                      <option value="">Select timezone</option>
                      <option value="UTC">UTC</option>
                      <option value="EST">EST</option>
                      <option value="PST">PST</option>
                      <option value="IST">IST</option>
                      <option value="CET">CET</option>
                      <option value="GMT">GMT</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Department</label>
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      className={inputClass}
                      placeholder="Enter department"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Type</label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      className={inputClass}
                    >
                      <option value="">Select type</option>
                      <option value="admin">Admin</option>
                      <option value="user">User</option>
                      <option value="operator">Operator</option>
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>Signature</label>
                    <input
                      type="text"
                      name="signature"
                      value={formData.signature}
                      onChange={handleInputChange}
                      className={inputClass}
                      placeholder="Enter signature"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="w-full mt-6 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white py-2.5 px-4 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Updating...' : 'Update User Profile'}
                </button>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div
                className={`rounded-lg overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-gray-50'
                  }`}
              >
                <div
                  className={`flex items-center gap-2 p-4 border-b ${isDark ? 'border-slate-600' : 'border-gray-200'
                    }`}
                >
                  <Award className={`h-4 w-4 ${isDark ? 'text-violet-400' : 'text-violet-600'}`} />
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    Qualifications
                  </h3>
                  <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-600 text-slate-300' : 'bg-gray-200 text-gray-600'}`}>
                    {qualifications.length}
                  </span>
                </div>

                <div className="p-4">
                  {loading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map((n) => (
                        <div
                          key={n}
                          className={`rounded-lg border p-3 ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'
                            }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1 space-y-1.5">
                              <Skeleton className={`h-4 w-40 ${isDark ? 'bg-slate-700' : ''}`} />
                              <Skeleton className={`h-3 w-56 ${isDark ? 'bg-slate-700' : ''}`} />
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Skeleton className={`h-5 w-20 rounded ${isDark ? 'bg-slate-700' : ''}`} />
                              <Skeleton className={`h-5 w-14 rounded ${isDark ? 'bg-slate-700' : ''}`} />
                            </div>
                          </div>
                          <div className="flex gap-4 mt-2">
                            <Skeleton className={`h-3 w-28 ${isDark ? 'bg-slate-700' : ''}`} />
                            <Skeleton className={`h-3 w-32 ${isDark ? 'bg-slate-700' : ''}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : qualifications.length === 0 ? (
                    <p className={`text-sm text-center py-6 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                      No qualifications on record.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {qualifications.map((q) => {
                        const today = new Date();
                        const expired = q.expiry_date ? new Date(q.expiry_date) < today : false;
                        const isActive = q.status === 'Active' && !expired;

                        return (
                          <div
                            key={q.qualification_id}
                            className={`rounded-lg border p-3 ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'
                              }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                  {q.qualification_name}
                                </p>
                                {q.description && (
                                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                    {q.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium border ${q.qualification_type === 'Certification'
                                    ? isDark ? 'bg-blue-900/40 border-blue-700 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'
                                    : isDark ? 'bg-amber-900/40 border-amber-700 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-700'
                                  }`}>
                                  {q.qualification_type}
                                </span>
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium border ${isActive
                                    ? isDark ? 'bg-emerald-900/40 border-emerald-700 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    : isDark ? 'bg-red-900/40 border-red-700 text-red-300' : 'bg-red-50 border-red-200 text-red-700'
                                  }`}>
                                  {expired ? 'Expired' : q.status}
                                </span>
                              </div>
                            </div>

                            {(q.start_date || q.expiry_date) && (
                              <div className={`flex gap-4 mt-2 text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                                {q.start_date && (
                                  <span>From: {new Date(q.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                )}
                                {q.expiry_date && (
                                  <span className={expired ? isDark ? 'text-red-400' : 'text-red-600' : ''}>
                                    Expires: {new Date(q.expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`flex justify-end gap-3 p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'
            }`}
        >
          <button
            onClick={onClose}
            className={`px-6 py-2 rounded-lg transition-colors font-medium ${isDark
                ? 'bg-slate-700 hover:bg-slate-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;