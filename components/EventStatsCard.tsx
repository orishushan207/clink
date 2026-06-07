"use client";

import { Users, Image, Clock, AlertTriangle } from "lucide-react";
import type { EventStats } from "@/lib/events";

interface EventStatsCardProps {
  stats: EventStats;
}

export default function EventStatsCard({ stats }: EventStatsCardProps) {
  const items = [
    {
      icon: Users,
      label: "אורחים",
      value: stats.guestCount,
      color: "text-yellow-400",
      bg: "bg-party-gold/10",
    },
    {
      icon: Image,
      label: "תמונות/סרטונים",
      value: stats.mediaCount,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      icon: Clock,
      label: "ממתינים",
      value: stats.pendingCount,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      icon: AlertTriangle,
      label: "דיווחים",
      value: stats.reportCount,
      color: "text-red-400",
      bg: "bg-red-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-party-surface border border-party-border rounded-2xl p-4 flex flex-col items-center gap-2"
        >
          <div className={`${item.bg} ${item.color} p-2.5 rounded-xl`}>
            <item.icon className="h-5 w-5" />
          </div>
          <span className="text-2xl font-bold text-white">{item.value}</span>
          <span className="text-xs text-gray-400">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
