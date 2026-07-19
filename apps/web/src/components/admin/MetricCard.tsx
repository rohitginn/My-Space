import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
}

export function MetricCard({ title, value, icon: Icon, trend, trendUp }: MetricCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      className="p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 flex flex-col justify-between overflow-hidden relative group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <h3 className="text-zinc-400 font-medium tracking-wide text-sm">{title}</h3>
        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
          <Icon className="w-5 h-5" />
        </div>
      </div>
      
      <div className="relative z-10">
        <div className="text-4xl font-bold tracking-tight text-white mb-2">{value}</div>
        {trend && (
          <div className={`text-sm font-medium flex items-center ${trendUp ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trendUp ? '↑' : '↓'} {trend}
          </div>
        )}
      </div>
    </motion.div>
  );
}
