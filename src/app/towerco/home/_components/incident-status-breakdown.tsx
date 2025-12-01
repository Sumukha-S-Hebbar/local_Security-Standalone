
'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle2, ShieldAlert, ShieldQuestion, AlertTriangle } from 'lucide-react';
import type { BasicCounts } from '../page';
import { cn } from '@/lib/utils';

export function IncidentStatusBreakdown({ counts }: { counts: BasicCounts }) {
  const router = useRouter();

  const statusCards = [
    {
      status: 'sos',
      count: counts.sos_count ?? 0,
      label: 'SOS',
      icon: AlertTriangle,
      color: 'bg-[#FF0000]',
    },
    {
      status: 'active',
      count: counts.active_incidents_count,
      label: 'Active',
      icon: ShieldAlert,
      color: 'bg-[#F97316]',
    },
    {
      status: 'under-review',
      count: counts.under_review_incidents_count,
      label: 'Under Review',
      icon: ShieldQuestion,
      color: 'bg-[#FBBF24]',
    },
    {
      status: 'resolved',
      count: counts.resolved_incidents_count,
      label: 'Resolved',
      icon: CheckCircle2,
      color: 'bg-[#22C55E]',
    },
  ] as const;

  const handleStatusClick = (status: string) => {
    router.push(`/towerco/incidents?status=${status}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Incident Status</CardTitle>
        <CardDescription className="font-medium">
          Click a status to see the list of incidents.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {statusCards.map((item) => (
            <div
              key={item.status}
              onClick={() => handleStatusClick(item.status)}
              role="button"
              tabIndex={0}
              className={cn(
                'flex cursor-pointer items-center gap-4 rounded-lg p-4 transition-all hover:shadow-md text-white',
                item.color
              )}
            >
              <item.icon className="h-8 w-8" />
              <div>
                <p className="font-semibold capitalize">{item.label}</p>
                <p className="text-2xl font-bold">{item.count}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
