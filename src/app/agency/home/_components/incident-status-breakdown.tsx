
'use client';

import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CheckCircle2, ShieldAlert, ShieldQuestion, AlertTriangle } from 'lucide-react';
import type { BasicCounts } from '../page';


export function IncidentStatusBreakdown({
  counts,
}: {
  counts: BasicCounts;
}) {
  const router = useRouter();

  const statusCards = [
    {
      status: 'sos',
      count: counts.sos_count ?? 0,
      label: 'SOS',
      icon: AlertTriangle,
      bg: 'bg-[#FF0000]',
      ring: 'ring-red-500',
    },
    {
      status: 'active',
      count: counts.active_incidents_count,
      label: 'Active',
      icon: ShieldAlert,
      bg: 'bg-[#F97316]',
      ring: 'ring-orange-500',
    },
    {
      status: 'under-review',
      count: counts.under_review_incidents_count,
      label: 'Under Review',
      icon: ShieldQuestion,
      bg: 'bg-[#FBBF24]',
      ring: 'ring-yellow-500',
    },
    {
      status: 'resolved',
      count: counts.resolved_incidents_count,
      label: 'Resolved',
      icon: CheckCircle2,
      bg: 'bg-[#22C55E]',
      ring: 'ring-green-500',
    },
  ] as const;

  const handleStatusClick = (status: string) => {
    router.push(`/agency/incidents?status=${status}`);
  };

  return (
    <Card>
      <CardHeader>
            <CardTitle>Incident Status Breakdown</CardTitle>
            <CardDescription className="font-medium">
            Click a status to see the list of incidents.
            </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {statusCards.map((item) => (
            <div
              key={item.status}
              onClick={() => handleStatusClick(item.status)}
              role="button"
              tabIndex={0}
              className={cn(
                'flex cursor-pointer items-center gap-4 rounded-lg p-4 transition-all hover:shadow-md text-white',
                item.bg,
                'hover:ring-2',
                item.ring
              )}
            >
              <item.icon className="h-8 w-8" />
              <div>
                <p className="font-semibold capitalize">{item.status.replace('-', ' ')}</p>
                <p className="text-2xl font-bold">{item.count}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
