
'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Building2, UserCheck, Users, Briefcase } from 'lucide-react';
import type { BasicCounts } from '../page';
import { cn } from '@/lib/utils';

export function TowercoResourceStatus({ counts }: { counts: BasicCounts }) {
  const router = useRouter();

  const resourceCards = [
    {
      label: 'Total Sites',
      count: counts.total_sites_count,
      icon: Building2,
      color: 'bg-[#1B2A41] text-white',
      action: () => router.push('/towerco/sites'),
      isClickable: true,
    },
    {
      label: 'Security Agencies',
      count: counts.total_agencies_count,
      icon: Briefcase,
      color: 'bg-[#00B4D8] text-white',
      action: () => router.push('/towerco/agencies'),
      isClickable: true,
    },
    {
      label: 'Patrolling Officers',
      count: counts.total_patrol_officers_count,
      icon: UserCheck,
      color: 'bg-[#00B4D8] text-white',
      action: () => {}, // No link for now
      isClickable: false,
    },
    {
      label: 'Guards',
      count: counts.total_guards_count,
      icon: Users,
      color: 'bg-[#1B2A41] text-white',
      action: () => {}, // No link for now
      isClickable: false,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resource Status</CardTitle>
        <CardDescription className="font-medium">
          A high-level overview of all operational resources.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resourceCards.map((item) => (
            <div
              key={item.label}
              onClick={item.isClickable ? item.action : undefined}
              role={item.isClickable ? 'button' : 'presentation'}
              tabIndex={item.isClickable ? 0 : -1}
              className={cn(
                'flex items-center gap-4 rounded-lg p-4 transition-all',
                item.color,
                item.isClickable
                  ? 'cursor-pointer hover:shadow-md'
                  : 'cursor-not-allowed opacity-90'
              )}
            >
              <item.icon className="h-8 w-8" />
              <div>
                <p className="font-semibold">{item.label}</p>
                <p className="text-2xl font-bold">{item.count}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
