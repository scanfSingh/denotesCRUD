"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navigation from "../components/Navigation";
import { getUserProfile, updateUserProfile, UserProfile } from "../actions";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    async function loadProfile() {
      if (status === "authenticated") {
        const data = await getUserProfile();
        setProfile(data);
        if (data) {
          setFormData((prev) => ({ ...prev, name: data.name }));
        }
        setLoading(false);
      }
    }
    loadProfile();
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validate passwords match if changing password
    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      return;
    }

    setSaving(true);

    const form = new FormData();
    form.append("name", formData.name);
    if (formData.currentPassword) {
      form.append("currentPassword", formData.currentPassword);
    }
    if (formData.newPassword) {
      form.append("newPassword", formData.newPassword);
    }

    const result = await updateUserProfile(form);

    if (result.success) {
      setMessage({ type: "success", text: "Profile updated successfully!" });
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      // Refresh profile data
      const data = await getUserProfile();
      setProfile(data);
      setIsEditing(false);
      setIsChangingPassword(false);
    } else {
      setMessage({ type: "error", text: result.error || "Failed to update profile" });
    }

    setSaving(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsChangingPassword(false);
    setMessage(null);
    // Reset form data to original profile values
    if (profile) {
      setFormData({
        name: profile.name,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  };

  if (status === "loading" || loading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:from-black dark:to-gray-900 mono:from-white mono:to-gray-100 flex items-center justify-center">
          <div className="animate-pulse text-gray-600 dark:text-gray-400 mono:text-black">Loading...</div>
        </div>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:from-black dark:to-gray-900 mono:from-white mono:to-gray-100 flex items-center justify-center">
          <div className="text-gray-600 dark:text-gray-400 mono:text-black">Unable to load profile</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 dark:from-black dark:to-gray-900 mono:from-white mono:to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 mono:from-black mono:to-gray-800 text-white text-4xl font-bold mb-4 shadow-xl">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mono:text-black">{profile.name}</h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400 mono:text-gray-700">
              {profile.email}
            </p>
          </div>

          {/* Success/Error Message */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
                message.type === "success"
                  ? "bg-green-50 dark:bg-green-900/20 mono:bg-gray-100 text-green-800 dark:text-green-200 mono:text-black border border-green-200 dark:border-green-800 mono:border-black"
                  : "bg-red-50 dark:bg-red-900/20 mono:bg-gray-100 text-red-800 dark:text-red-200 mono:text-black border border-red-200 dark:border-red-800 mono:border-black"
              }`}
            >
              {message.type === "success" ? (
                <svg className="w-5 h-5 text-green-500 mono:text-black" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-500 mono:text-black" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <span className="font-medium">{message.text}</span>
            </div>
          )}

          {/* Profile Card */}
          <div className="bg-white dark:bg-gray-800 mono:bg-white rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 mono:border-black overflow-hidden">
            
            {/* View Mode */}
            {!isEditing && !isChangingPassword && (
              <>
                {/* Profile Information */}
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mono:text-black mb-6 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Profile Information
                  </h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 mono:border-gray-300">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 mono:bg-gray-200 flex items-center justify-center">
                          <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mono:text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mono:text-gray-600">Display Name</p>
                          <p className="text-gray-900 dark:text-white mono:text-black font-medium">{profile.name}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 mono:border-gray-300">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 mono:bg-gray-200 flex items-center justify-center">
                          <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mono:text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mono:text-gray-600">Email Address</p>
                          <p className="text-gray-900 dark:text-white mono:text-black font-medium">{profile.email}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 mono:border-gray-300">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 mono:bg-gray-200 flex items-center justify-center">
                          <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mono:text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mono:text-gray-600">Member Since</p>
                          <p className="text-gray-900 dark:text-white mono:text-black font-medium">
                            {profile.createdAt 
                              ? new Date(profile.createdAt).toLocaleDateString("en-US", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })
                              : "Unknown"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 mono:bg-gray-200 flex items-center justify-center">
                          <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mono:text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mono:text-gray-600">Password</p>
                          <p className="text-gray-900 dark:text-white mono:text-black font-medium">••••••••</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-6 bg-gray-50 dark:bg-gray-900/50 mono:bg-gray-100 border-t border-gray-200 dark:border-gray-700 mono:border-gray-300">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 mono:from-black mono:to-gray-800 text-white font-medium hover:from-indigo-700 hover:to-purple-700 mono:hover:from-gray-800 mono:hover:to-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 shadow-lg hover:shadow-xl"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Profile
                    </button>
                    <button
                      onClick={() => setIsChangingPassword(true)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 border-gray-300 dark:border-gray-600 mono:border-black text-gray-700 dark:text-gray-300 mono:text-black font-medium hover:bg-gray-100 dark:hover:bg-gray-700 mono:hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      Change Password
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Edit Profile Mode */}
            {isEditing && (
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mono:text-black flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Profile
                </h2>

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mono:text-black mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 mono:border-black bg-white dark:bg-gray-700 mono:bg-white text-gray-900 dark:text-white mono:text-black placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 mono:focus:ring-black focus:border-transparent transition-all"
                    placeholder="Your display name"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 py-3 px-4 rounded-lg border-2 border-gray-300 dark:border-gray-600 mono:border-black text-gray-700 dark:text-gray-300 mono:text-black font-medium hover:bg-gray-100 dark:hover:bg-gray-700 mono:hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-3 px-4 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 mono:from-black mono:to-gray-800 text-white font-medium hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}

            {/* Change Password Mode */}
            {isChangingPassword && (
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mono:text-black flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Change Password
                </h2>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mono:text-black mb-2">
                      Current Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      id="currentPassword"
                      required
                      value={formData.currentPassword}
                      onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 mono:border-black bg-white dark:bg-gray-700 mono:bg-white text-gray-900 dark:text-white mono:text-black placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 mono:focus:ring-black focus:border-transparent transition-all"
                      placeholder="Enter current password"
                    />
                  </div>
                  <div>
                    <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mono:text-black mb-2">
                      New Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      id="newPassword"
                      required
                      value={formData.newPassword}
                      onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 mono:border-black bg-white dark:bg-gray-700 mono:bg-white text-gray-900 dark:text-white mono:text-black placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 mono:focus:ring-black focus:border-transparent transition-all"
                      placeholder="Enter new password"
                    />
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mono:text-black mb-2">
                      Confirm New Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="password"
                      id="confirmPassword"
                      required
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 mono:border-black bg-white dark:bg-gray-700 mono:bg-white text-gray-900 dark:text-white mono:text-black placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 mono:focus:ring-black focus:border-transparent transition-all"
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 py-3 px-4 rounded-lg border-2 border-gray-300 dark:border-gray-600 mono:border-black text-gray-700 dark:text-gray-300 mono:text-black font-medium hover:bg-gray-100 dark:hover:bg-gray-700 mono:hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-3 px-4 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 mono:from-black mono:to-gray-800 text-white font-medium hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    {saving ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* App Version */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mono:text-gray-600">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 mono:bg-gray-200 border border-gray-200 dark:border-gray-700 mono:border-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                denotes v{process.env.APP_VERSION || "1.0.0"}
              </span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
