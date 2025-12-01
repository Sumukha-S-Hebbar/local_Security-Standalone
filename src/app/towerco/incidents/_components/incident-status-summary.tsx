
'use client';

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
      bg: 'bg-[#FF0000]',
      ring: 'ring-red-500'
    },
    {
      status: 'active',
      count: counts.active_incidents_count,
      label: 'Active',
      icon: ShieldAlert,
      bg: 'bg-[#F97316]',
      ring: 'ring-orange-500'
    },
    {
      status: 'under-review',
      count: counts.under_review_incidents_count,
      label: 'Under Review',
      icon: ShieldQuestion,
      bg: 'bg-[#FBBF24]',
      ring: 'ring-yellow-500'
    },
    {
      status: 'resolved',
      count: counts.resolved_incidents_count,
      label: 'Resolved',
      icon: CheckCircle2,
      bg: 'bg-[#22C55E]',
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
                'flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-all text-white',
                item.bg,
                selectedStatus === item.status ? `ring-2 ${item.ring} shadow-md` : 'hover:shadow-lg'
            )}
            onClick={() => onStatusSelect(item.status)}
            role="button"
            tabIndex={0}
            >
                <item.icon className='h-8 w-8' />
                <div>
                    <p className='text-sm font-semibold'>{item.label}</p>
                    <p className='text-2xl font-bold'>{item.count}</p>
                </div>
            </div>
        ))}
      </CardContent>
    </Card>
  );
}
