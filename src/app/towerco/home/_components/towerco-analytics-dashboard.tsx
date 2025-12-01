
'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Briefcase, UserCheck, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

type BasicCounts = {
  total_guards_count: number;
  total_sites_count: number;
  total_agencies_count: number;
  total_patrol_officers_count: number;
};


export function TowercoAnalyticsDashboard({
  counts,
}: {
  counts: BasicCounts;
}) {
  const router = useRouter();

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="transition-all hover:bg-accent hover:text-accent-foreground group cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Patrolling Officers</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground group-hover:text-accent-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{counts.total_patrol_officers_count}</div>
          <p className="text-xs text-muted-foreground font-medium group-hover:text-accent-foreground">
            Team leaders across all agencies
          </p>
        </CardContent>
      </Card>
      <Card className="transition-all hover:bg-accent hover:text-accent-foreground group cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Guards</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground group-hover:text-accent-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{counts.total_guards_count}</div>
          <p className="text-xs text-muted-foreground font-medium group-hover:text-accent-foreground">
            Personnel across all agencies
          </p>
        </CardContent>
      </Card>
      <Card className="transition-all hover:bg-accent hover:text-accent-foreground group cursor-pointer" onClick={() => router.push('/towerco/sites')}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Sites</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground group-hover:text-accent-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{counts.total_sites_count}</div>
          <p className="text-xs text-muted-foreground font-medium group-hover:text-accent-foreground">
            All sites under your portfolio.
          </p>
        </CardContent>
      </Card>
      <Card className="transition-all hover:bg-accent hover:text-accent-foreground group cursor-pointer" onClick={() => router.push('/towerco/agencies')}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Security Agencies
          </CardTitle>
          <Briefcase className="h-4 w-4 text-muted-foreground group-hover:text-accent-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{counts.total_agencies_count}</div>
          <p className="text-xs text-muted-foreground font-medium group-hover:text-accent-foreground">
            Contracted security partners
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
