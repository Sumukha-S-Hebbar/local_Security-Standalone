

import Link from 'next/link';
import type { BasicCounts } from '../page';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2, UserCheck, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function AgencyAnalyticsDashboard({
  counts,
}: {
  counts: BasicCounts;
}) {
  const router = useRouter();
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="transition-all hover:bg-accent hover:text-accent-foreground group cursor-pointer" onClick={() => router.push('/agency/sites?tab=assigned')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Sites</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground group-hover:text-accent-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts.total_assigned_sites_count}</div>
            <p className="text-xs text-muted-foreground font-medium group-hover:text-accent-foreground">
              Sites with assigned personnel
            </p>
          </CardContent>
        </Card>
        <Card className="transition-all hover:bg-accent hover:text-accent-foreground group cursor-pointer" onClick={() => router.push('/agency/patrolling-officers')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Patrolling Officers</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground group-hover:text-accent-foreground" />
            </CardHeader>
            <CardContent>
            <div className="text-2xl font-bold">{counts.total_patrol_officers_count}</div>
            <p className="text-xs text-muted-foreground font-medium group-hover:text-accent-foreground">
                Team leaders managing guards
            </p>
            </CardContent>
        </Card>
        <Card className="transition-all hover:bg-accent hover:text-accent-foreground group cursor-pointer" onClick={() => router.push('/agency/guards')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Guards</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground group-hover:text-accent-foreground" />
            </CardHeader>
            <CardContent>
            <div className="text-2xl font-bold">{counts.total_guards_count}</div>
            <p className="text-xs text-muted-foreground font-medium group-hover:text-accent-foreground">
                Personnel across all sites
            </p>
            </CardContent>
        </Card>
        <Card className="transition-all hover:bg-accent hover:text-accent-foreground group cursor-pointer" onClick={() => router.push('/agency/sites?tab=unassigned')}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned Sites</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground group-hover:text-accent-foreground" />
            </CardHeader>
            <CardContent>
            <div className="text-2xl font-bold">{counts.total_unassigned_sites_count}</div>
            <p className="text-xs text-muted-foreground font-medium group-hover:text-accent-foreground">
                Sites needing assignments
            </p>
            </CardContent>
        </Card>
    </div>
  );
}
