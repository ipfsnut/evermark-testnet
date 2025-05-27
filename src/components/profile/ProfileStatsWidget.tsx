import React from 'react';
import { BookOpenIcon, PlusIcon } from 'lucide-react';
import { useUserEvermarks } from '../../hooks/useEvermarks';

interface ProfileStatsWidgetProps {
  userAddress: string;
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  suffix?: string;
  highlight?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, suffix, highlight }) => (
  <div className={`p-4 rounded-lg border ${highlight ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600">{label}</p>
        <p className={`text-2xl font-semibold ${highlight ? 'text-purple-700' : 'text-gray-900'}`}>
          {value}{suffix && <span className="text-sm ml-1">{suffix}</span>}
        </p>
      </div>
      <Icon className={`h-8 w-8 ${highlight ? 'text-purple-600' : 'text-gray-400'}`} />
    </div>
  </div>
);

export const ProfileStatsWidget: React.FC<ProfileStatsWidgetProps> = ({ userAddress }) => {
  const { evermarks } = useUserEvermarks(userAddress);

  // Calculate stats from real data
  const totalEvermarks = evermarks.length;
  const createdEvermarks = evermarks.filter(e => e.creator?.toLowerCase() === userAddress?.toLowerCase()).length;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Your Evermark Portfolio</h3>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Total Evermarks" 
          value={totalEvermarks}
          icon={BookOpenIcon}
        />
        <StatCard 
          label="Created by You" 
          value={createdEvermarks}
          icon={PlusIcon}
        />
      </div>
    </div>
  );
};