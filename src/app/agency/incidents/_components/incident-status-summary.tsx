
'use client';

import type { Incident } from '@/types';
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldAlert, ShieldQuestion, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';


type IncidentCounts = {
    active_incidents_count: number;
    under_review_incidents_count: number;
    resolved_incidents_count: number;
    sos_count?: number;
}

export function IncidentStatusSummary({ 
  counts,
  onStatusSelect,
  selectedStatus,
}: { 
  counts: IncidentCounts;
  onStatusSelect: (status: string) => void;
  selectedStatus: string;
}) {

  const statusCards = [
    {
      status: 'sos',
      count: counts.sos_count ?? 0,
      label: 'SOS',
      icon: AlertTriangle,
      color: 'text-red-800',
      bg: 'bg-red-100',
      ring: 'ring-red-500'
    },
    {
      status: 'active',
      count: counts.active_incidents_count,
      label: 'Active',
      icon: ShieldAlert,
      color: 'text-orange-800',
      bg: 'bg-orange-100',
      ring: 'ring-orange-500'
    },
    {
      status: 'under-review',
      count: counts.under_review_incidents_count,
      label: 'Under Review',
      icon: ShieldQuestion,
      color: 'text-yellow-800',
      bg: 'bg-yellow-100',
      ring: 'ring-yellow-500'
    },
    {
      status: 'resolved',
      count: counts.resolved_incidents_count,
      label: 'Resolved',
      icon: CheckCircle2,
      color: 'text-green-800',
      bg: 'bg-green-100',
      ring: 'ring-green-500'
    }
  ] as const;

  return (
    <Card>
      <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statusCards.map(item => (
            <div 
            key={item.status}
            className={cn(
                'flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-all',
                item.bg,
                selectedStatus === item.status ? `ring-2 ${item.ring} shadow-md` : 'hover:shadow-lg'
            )}
            onClick={() => onStatusSelect(item.status)}
            role="button"
            tabIndex={0}
            >
                <item.icon className={cn('h-8 w-8', item.color)} />
                <div>
                    <p className={cn('text-sm font-semibold', item.color)}>{item.label}</p>
                    <p className={cn('text-2xl font-bold', item.color)}>{item.count}</p>
                </div>
            </div>
        ))}
      </CardContent>
    </Card>
  );
}
