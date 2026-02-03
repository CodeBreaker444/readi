'use client';

import { Activity, Briefcase, CheckCircle, Clock, Drone, FileText, MapPin, Target, User, X } from 'lucide-react';

interface FlightLogbookOffcanvasProps {
  isOpen: boolean;
  onClose: () => void;
  missionData?: any;
}

export default function FlightLogbookOffcanvas({
  isOpen,
  onClose,
  missionData,
}: FlightLogbookOffcanvasProps) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className={`fixed inset-0 bg-white z-40 transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Offcanvas Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-120 bg-white dark:bg-slate-800 shadow-2xl z-50 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Mission Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto h-[calc(100%-80px)]">
          {missionData ? (
            <div className="space-y-6">
              {/* Mission ID Badge */}
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full text-sm font-medium">
                  Mission #{missionData.id}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    missionData.missionStatus === 'Completed'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : missionData.missionStatus === 'In Progress'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {missionData.missionStatus}
                </span>
              </div>

              {/* Time Information */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Timeline
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>Start Time</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {missionData.startDate}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>End Time</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {missionData.endDate}
                    </p>
                  </div>
                </div>
              </div>

              <div className="h-px bg-gray-200 dark:bg-slate-700" />

              {/* Personnel */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Personnel
                </h3>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-lg">
                    <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Pilot in Command
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {missionData.pic}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-lg">
                    <Briefcase className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Client</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {missionData.client}
                    </p>
                  </div>
                </div>
              </div>

              <div className="h-px bg-gray-200 dark:bg-slate-700" />

              {/* Mission Details */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Mission Information
                </h3>
                <div className="space-y-3">
                  <DetailRow
                    icon={<Target className="w-4 h-4" />}
                    label="Mission Type"
                    value={missionData.missionType}
                  />
                  <DetailRow
                    icon={<FileText className="w-4 h-4" />}
                    label="Mission Category"
                    value={missionData.missionCategory}
                  />
                  <DetailRow
                    icon={<MapPin className="w-4 h-4" />}
                    label="Mission Plan"
                    value={missionData.missionPlan}
                  />
                </div>
              </div>

              <div className="h-px bg-gray-200 dark:bg-slate-700" />

              {/* Equipment */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Equipment
                </h3>
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-lg">
                    <Drone className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Drone System
                    </p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {missionData.droneSystem}
                    </p>
                  </div>
                </div>
              </div>

              <div className="h-px bg-gray-200 dark:bg-slate-700" />

              {/* Results */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Mission Results
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <DetailCard
                    icon={<Activity className="w-4 h-4" />}
                    label="Status"
                    value={missionData.missionStatus}
                    badge
                  />
                  <DetailCard
                    icon={<CheckCircle className="w-4 h-4" />}
                    label="Result"
                    value={missionData.missionResult}
                    badge
                  />
                  <DetailCard
                    icon={<Clock className="w-4 h-4" />}
                    label="Duration"
                    value={`${missionData.minFlown} min`}
                  />
                  <DetailCard
                    icon={<MapPin className="w-4 h-4" />}
                    label="Distance"
                    value={`${missionData.meterFlown.toLocaleString()} m`}
                  />
                </div>
              </div>

              {/* Notes */}
              {missionData.picNotes && (
                <>
                  <div className="h-px bg-gray-200 dark:bg-slate-700" />
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      PiC Notes
                    </h3>
                    <div className="p-4 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {missionData.picNotes}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Group */}
              {missionData.group && (
                <>
                  <div className="h-px bg-gray-200 dark:bg-slate-700" />
                  <div className="space-y-3">
                    <DetailRow
                      icon={<User className="w-4 h-4" />}
                      label="Team Group"
                      value={missionData.group}
                    />
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                Select a mission to view details
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 bg-gray-50 dark:bg-slate-900/50 rounded-lg text-gray-600 dark:text-gray-400">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {value}
        </p>
      </div>
    </div>
  );
}

function DetailCard({
  icon,
  label,
  value,
  badge = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  badge?: boolean;
}) {
  const getBadgeClass = (val: string) => {
    if (val === 'Success' || val === 'Completed') {
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
    }
    if (val === 'Partial Success' || val === 'In Progress') {
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
    }
    return 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
  };

  return (
    <div className="p-3 bg-gray-50 dark:bg-slate-900/50 rounded-lg">
      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      {badge ? (
        <span
          className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getBadgeClass(
            value
          )}`}
        >
          {value}
        </span>
      ) : (
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {value}
        </p>
      )}
    </div>
  );
}