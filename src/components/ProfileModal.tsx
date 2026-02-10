'use client';
import { X } from 'lucide-react';
import React, { useState } from 'react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, isDark }) => {
  const [formData, setFormData] = useState({
    fullName: 'Pilot Test 03',
    email: '',
    phone: '',
    timezone: '',
    department: 'Global',
    client: '',
    profile: '',
    type: '',
    signature: ''
  });

  const [avatar, setAvatar] = useState<File | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatar(e.target.files[0]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-lg shadow-2xl ${
        isDark ? 'bg-slate-800' : 'bg-white'
      }`}>
        {/* Modal Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          isDark ? 'border-slate-700' : 'border-gray-200'
        }`}>
          <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
            User Profile: Pilot Test 03
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? 'hover:bg-slate-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Profile Image and Basic Info */}
            <div className="lg:col-span-1">
              <div className={`rounded-lg p-6 ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                <div className="relative w-48 h-48 mx-auto mb-6">
                  <img
                    src="/api/placeholder/200/200"
                    alt="READI Command Center"
                    className="w-full h-full rounded-lg object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                      <span className="text-xl font-bold text-gray-800">READI</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-center mb-6">
                  <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Remote Autonomous Drone Intelligence
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    Command and Control Center
                  </p>
                </div>

                <div className={`space-y-4 pt-4 border-t ${isDark ? 'border-slate-600' : 'border-gray-200'}`}>
                  {/* Full Name */}
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Full Name
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                        isDark 
                          ? 'bg-slate-600 border-slate-500 text-white placeholder-gray-400 focus:border-blue-500' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                      placeholder="Enter full name"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                        isDark 
                          ? 'bg-slate-600 border-slate-500 text-white placeholder-gray-400 focus:border-blue-500' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                      placeholder="Enter email address"
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Phone
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                        isDark 
                          ? 'bg-slate-600 border-slate-500 text-white placeholder-gray-400 focus:border-blue-500' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                      placeholder="Enter phone number"
                    />
                  </div>

                  {/* TimeZone */}
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      TimeZone
                    </label>
                    <select
                      name="timezone"
                      value={formData.timezone}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                        isDark 
                          ? 'bg-slate-600 border-slate-500 text-white focus:border-blue-500' 
                          : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    >
                      <option value="">Select timezone</option>
                      <option value="UTC">UTC</option>
                      <option value="EST">EST</option>
                      <option value="PST">PST</option>
                      <option value="IST">IST</option>
                    </select>
                  </div>

                  {/* Department */}
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Department
                    </label>
                    <input
                      type="text"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                        isDark 
                          ? 'bg-slate-600 border-slate-500 text-white placeholder-gray-400 focus:border-blue-500' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                      placeholder="Enter department"
                    />
                  </div>

                  {/* Client */}
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Client
                    </label>
                    <input
                      type="text"
                      name="client"
                      value={formData.client}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                        isDark 
                          ? 'bg-slate-600 border-slate-500 text-white placeholder-gray-400 focus:border-blue-500' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                      placeholder="Enter client name"
                    />
                  </div>

                  {/* Profile */}
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Profile
                    </label>
                    <input
                      type="text"
                      name="profile"
                      value={formData.profile}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                        isDark 
                          ? 'bg-slate-600 border-slate-500 text-white placeholder-gray-400 focus:border-blue-500' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                      placeholder="Enter profile"
                    />
                  </div>

                  {/* Type */}
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Type
                    </label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                        isDark 
                          ? 'bg-slate-600 border-slate-500 text-white focus:border-blue-500' 
                          : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                    >
                      <option value="">Select type</option>
                      <option value="admin">Admin</option>
                      <option value="user">User</option>
                      <option value="operator">Operator</option>
                    </select>
                  </div>

                  {/* Avatar */}
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Avatar
                    </label>
                    <div className="flex items-center gap-3">
                      <label className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                        isDark 
                          ? 'bg-slate-600 hover:bg-slate-500 text-white' 
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      }`}>
                        Choose File
                        <input
                          type="file"
                          onChange={handleFileChange}
                          accept="image/*"
                          className="hidden"
                        />
                      </label>
                      <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {avatar ? avatar.name : 'No file chosen'}
                      </span>
                    </div>
                  </div>

                  {/* Signature */}
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Signature
                    </label>
                    <input
                      type="text"
                      name="signature"
                      value={formData.signature}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors ${
                        isDark 
                          ? 'bg-slate-600 border-slate-500 text-white placeholder-gray-400 focus:border-blue-500' 
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                      placeholder="Enter signature"
                    />
                  </div>
                </div>

                <button className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-4 rounded-lg transition-colors font-medium">
                  Update User Profile
                </button>
              </div>
            </div>

            {/* Right Column - Last Activities */}
            <div className="lg:col-span-2">
              <div className={`rounded-lg overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-gray-50'}`}>
                <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-slate-600' : 'border-gray-200'}`}>
                  <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    Last Activities
                  </h3>
                  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                    View All
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`${isDark ? 'bg-slate-600' : 'bg-gray-100'}`}>
                        <th className={`px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          ID
                        </th>
                        <th className={`px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          Action
                        </th>
                        <th className={`px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          Date
                        </th>
                        <th className={`px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className={`border-b ${isDark ? 'border-slate-600' : 'border-gray-200'}`}>
                        <td className={`px-4 py-3 text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'} font-medium`}>
                          #632536
                        </td>
                        <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          <div className="font-medium">Bata Shoes</div>
                          <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                            size-08 (Model 2024)
                          </div>
                        </td>
                        <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          15/08/2023
                        </td>
                        <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          UPI
                        </td>
                      </tr>
                      <tr className={`border-b ${isDark ? 'border-slate-600' : 'border-gray-200'}`}>
                        <td className={`px-4 py-3 text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'} font-medium`}>
                          #365485
                        </td>
                        <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          <div className="font-medium">Morden Chair</div>
                          <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                            Size-Medium (Model 2021)
                          </div>
                        </td>
                        <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          22/09/2023
                        </td>
                        <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          Banking
                        </td>
                      </tr>
                      <tr className={`border-b ${isDark ? 'border-slate-600' : 'border-gray-200'}`}>
                        <td className={`px-4 py-3 text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'} font-medium`}>
                          #325415
                        </td>
                        <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          <div className="font-medium">Reebok Shoes</div>
                          <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                            size-08 (Model 2021)
                          </div>
                        </td>
                        <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          31/12/2023
                        </td>
                        <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          Paypal
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`flex justify-end gap-3 p-6 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
          <button
            onClick={onClose}
            className={`px-6 py-2 rounded-lg transition-colors font-medium ${
              isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
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