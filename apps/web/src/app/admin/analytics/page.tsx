'use client';

import React from 'react';
import useSWR from 'swr';
import { Users, Activity, LayoutDashboard, Target } from 'lucide-react';
import { motion } from 'framer-motion';

import api from '@/lib/api';
import { MetricCard } from '@/components/admin/MetricCard';
import { FeatureUsageChart } from '@/components/admin/FeatureUsageChart';

const fetcher = (url: string) => api.get(url).then((res) => res.data.data);

export default function AdminAnalyticsPage() {
  const { data: overview, error: overviewError, isLoading: loadingOverview } = useSWR('/admin/metrics/overview', fetcher);
  const { data: features, error: featuresError, isLoading: loadingFeatures } = useSWR('/admin/metrics/features', fetcher);

  if (loadingOverview || loadingFeatures) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full"
        />
      </div>
    );
  }

  if (overviewError || featuresError) {
    return (
      <div className="p-8 text-center text-rose-400 bg-rose-500/10 rounded-2xl border border-rose-500/20">
        <h2 className="text-xl font-bold mb-2">Error Loading Analytics</h2>
        <p>You may not have admin privileges or the server is unreachable.</p>
      </div>
    );
  }

  const featureChartData = features ? [
    { name: 'Habits', value: features.habits },
    { name: 'Routines', value: features.routines },
    { name: 'Todos', value: features.todos },
    { name: 'Notes', value: features.notes },
    { name: 'Drawings', value: features.drawings },
    { name: 'Kanban', value: features.kanban },
    { name: 'Journal', value: features.journal },
    { name: 'Pomodoro', value: features.pomodoro },
  ] : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Analytics Overview</h1>
        <p className="text-zinc-400">Monitor platform health and user engagement.</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Users"
          value={overview?.totalUsers || 0}
          icon={Users}
          trend="+12% this week"
          trendUp={true}
        />
        <MetricCard
          title="Daily Active Users"
          value={overview?.activeUsers || 0}
          icon={Activity}
          trend="+5% vs yesterday"
          trendUp={true}
        />
        <MetricCard
          title="Engagement Rate"
          value={`${overview?.engagementRate?.toFixed(1) || 0}%`}
          icon={Target}
          trend="Healthy"
          trendUp={true}
        />
        <MetricCard
          title="Total Content Created"
          value={overview?.totalContent || 0}
          icon={LayoutDashboard}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FeatureUsageChart data={featureChartData} />
        
        {/* Placeholder for future growth chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 flex flex-col items-center justify-center"
        >
          <div className="text-center space-y-4">
            <h3 className="text-xl font-semibold tracking-wide text-zinc-300">User Growth</h3>
            <p className="text-zinc-500">More data points needed to generate growth curve.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
