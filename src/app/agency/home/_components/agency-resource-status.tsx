
'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Building2, UserCheck, Users } from 'lucide-react';
import type { BasicCounts } from '../page';
import { cn } from '@/lib/utils';

export function AgencyResourceStatus({ counts }: { counts: BasicCounts }) {
  const router = useRouter();

  const resourceCards = [
    {
      label: 'Assigned Sites',
      count: counts.total_assigned_sites_count,
      icon: Building2,
      color: 'bg-[#1B2A41] text-white',
      action: () => router.push('/agency/sites?tab=assigned'),
    },
    {
      label: 'Unassigned Sites',
      count: counts.total_unassigned_sites_count,
      icon: Building2,
      color: 'bg-[#00B4D8] text-white',
      action: () => router.push('/agency/sites?tab=unassigned'),
    },
    {
      label: 'Patrolling Officers',
      count: counts.total_patrol_officers_count,
      icon: UserCheck,
      color: 'bg-[#00B4D8] text-white',
      action: () => router.push('/agency/patrolling-officers'),
    },
    {
      label: 'Guards',
      count: counts.total_guards_count,
      icon: Users,
      color: 'bg-[#1B2A41] text-white',
      action: () => router.push('/agency/guards'),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resource Status</CardTitle>
        <CardDescription className="font-medium">
          Click a resource to see the list.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resourceCards.map((item) => (
            <div
              key={item.label}
              onClick={item.action}
              role="button"
              tabIndex={0}
              className={cn(
                'flex cursor-pointer items-center gap-4 rounded-lg p-4 transition-all hover:shadow-md',
                item.color
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
