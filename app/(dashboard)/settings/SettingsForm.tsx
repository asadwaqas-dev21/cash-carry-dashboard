"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [storeName, setStoreName] = useState("Kirana Cash & Carry - Deira");
  const [currency, setCurrency] = useState("Rs");
  const [timezone, setTimezone] = useState("Asia/Dubai");
  const [taxRate, setTaxRate] = useState("5.0");
  
  const [fullName, setFullName] = useState("Asad Waqas");
  const [email, setEmail] = useState("asad@kiranacashcarry.com");

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-ink-900 tracking-tight2 mb-1">Settings</h1>
        <p className="text-sm text-ink-500">Manage your store preferences and personal profile.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Navigation / Tabs */}
        <div className="lg:col-span-1">
          <nav className="flex flex-col gap-1 sticky top-8">
            <button className="text-left px-3 py-2 text-sm font-medium rounded-md bg-white border border-border shadow-sm text-ink-900 flex justify-between items-center">
              Store Details
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
            </button>
            <button className="text-left px-3 py-2 text-sm font-medium rounded-md text-ink-500 hover:bg-ink-200/50 hover:text-ink-900 transition flex justify-between items-center">
              Personal Profile
            </button>
            <button className="text-left px-3 py-2 text-sm font-medium rounded-md text-ink-500 hover:bg-ink-200/50 hover:text-ink-900 transition flex justify-between items-center">
              Security
            </button>
            <button className="text-left px-3 py-2 text-sm font-medium rounded-md text-ink-500 hover:bg-ink-200/50 hover:text-ink-900 transition flex justify-between items-center">
              Notifications
            </button>
          </nav>
        </div>

        {/* Right Column: Settings Content */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Section: Store Details */}
          <section id="store-details" className="bg-panel border border-border rounded-xl shadow-sm overflow-hidden feed-item">
            <div className="px-6 py-5 border-b border-borderMuted">
              <h2 className="text-base font-semibold text-ink-900">Store Details</h2>
              <p className="text-sm text-ink-500 mt-1">Update your organization's primary information.</p>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-medium text-ink-700 mb-1.5">Store Name</label>
                <input 
                  type="text" 
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full px-3 py-2 bg-canvas border border-border rounded-md text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-ink-700 mb-1.5">Currency</label>
                  <select 
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full px-3 py-2 bg-canvas border border-border rounded-md text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition appearance-none"
                  >
                    <option value="Rs">Rs - Pakistani Rupee</option>
                    <option value="AED">AED - UAE Dirham</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-700 mb-1.5">Default Tax Rate (%)</label>
                  <input 
                    type="number" 
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    className="w-full px-3 py-2 bg-canvas border border-border rounded-md text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-700 mb-1.5">Timezone</label>
                <select 
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 bg-canvas border border-border rounded-md text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition appearance-none"
                >
                  <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                  <option value="UTC">Coordinated Universal Time (UTC)</option>
                </select>
              </div>
            </div>

            <div className="px-6 py-4 bg-canvas border-t border-borderMuted flex justify-end">
              <button className="px-4 py-2 bg-ink-900 text-white text-sm font-medium rounded-md hover:bg-ink-700 transition shadow-sm">
                Save Store Details
              </button>
            </div>
          </section>

          {/* Section: Profile Settings */}
          <section id="profile-settings" className="bg-panel border border-border rounded-xl shadow-sm overflow-hidden feed-item" style={{ animationDelay: '100ms' }}>
            <div className="px-6 py-5 border-b border-borderMuted">
              <h2 className="text-base font-semibold text-ink-900">Personal Profile</h2>
              <p className="text-sm text-ink-500 mt-1">Manage your personal account settings and avatar.</p>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-full bg-brand text-white text-xl font-semibold flex items-center justify-center shadow-sm">
                  AW
                </div>
                <div>
                  <button className="px-3 py-1.5 bg-white border border-border text-ink-900 text-sm font-medium rounded-md hover:border-ink-400 transition shadow-sm">
                    Change Avatar
                  </button>
                  <p className="text-xs text-ink-400 mt-2">JPG, GIF or PNG. Max size of 2MB.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-ink-700 mb-1.5">Full Name</label>
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 bg-canvas border border-border rounded-md text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-700 mb-1.5">Role</label>
                  <input 
                    type="text" 
                    value="Owner"
                    disabled
                    className="w-full px-3 py-2 bg-ink-200/50 border border-border rounded-md text-sm text-ink-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-ink-700 mb-1.5">Email Address</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-canvas border border-border rounded-md text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition"
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-canvas border-t border-borderMuted flex justify-end">
              <button className="px-4 py-2 bg-ink-900 text-white text-sm font-medium rounded-md hover:bg-ink-700 transition shadow-sm">
                Update Profile
              </button>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
