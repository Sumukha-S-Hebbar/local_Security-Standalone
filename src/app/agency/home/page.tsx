
'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Organization } from '@/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ChevronDown, Phone, Loader2, CheckCircle2 } from 'lucide-react';
import { AgencyAnalyticsDashboard } from './_components/agency-analytics-dashboard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { IncidentStatusBreakdown } from './_components/incident-status-breakdown';
import { AgencyIncidentChart } from './_components/agency-incident-chart';
import { GuardPerformanceBreakdown } from './_components/guard-performance-breakdown';
import { PatrollingOfficerPerformance } from './_components/patrolling-officer-performance';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchData } from '@/lib/api';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';


// Type definitions based on the new API response
export type BasicCounts = {
    under_review_incidents_count: number;
    resolved_incidents_count: number;
    total_guards_count: number;
    total_patrol_officers_count: number;
    total_incidents_count?: number;
    sos_count?: number;
    total_assigned_sites_count: number;
    total_unassigned_sites_count: number;
    active_incidents_count: number;
};

export type ActiveIncident = {
    id: number;
    incident_id: string;
    site_details: { id: number; tb_site_id: string; site_name: string };
    patrol_officer_name: string;
    guard_name: string;
    incident_time: string;
    contact_details: { officer_phone: string | null; guard_phone: string | null };
};

type PaginatedActiveIncidents = {
    count: number;
    next: string | null;
    previous: string | null;
    results: ActiveIncident[];
};

export type GuardPerformanceData = {
    guard_checkin_accuracy: number;
    selfie_checkin_accuracy: number;
};

export type PatrollingOfficerPerformanceData = {
    site_visit_accuracy: number;
    average_response_time: string;
};

export type IncidentTrendData = {
    month: string;
    year: number;
    total: number;
    resolved: number;
    active: number;
    under_review: number;
    resolution_duration: string;
};

interface AgencyDashboardData {
    basic_counts: BasicCounts;
    active_incidents: PaginatedActiveIncidents;
    guard_performance: GuardPerformanceData;
    patrol_officer_performance: PatrollingOfficerPerformanceData;
    incident_trend: IncidentTrendData[];
}

async function getDashboardData(orgCode: string, token?: string, url?: string): Promise<AgencyDashboardData | null> {
  const fetchUrl = url || `/agency/${orgCode}/agency-dashboard/`;
  return fetchData<AgencyDashboardData>(fetchUrl, token);
}

export default function AgencyHomePage() {
  const router = useRouter();
  const [data, setData] = useState<AgencyDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isIncidentsLoading, setIsIncidentsLoading] = useState(false);
  const [org, setOrg] = useState<Organization | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUserData = localStorage.getItem('userData');
      if (savedUserData) {
        const userData = JSON.parse(savedUserData);
        setOrg(userData.user.organization);
        setToken(userData.token);
      } else {
        router.replace('/');
      }
    }
  }, [router]);
  
  useEffect(() => {
    if (org && token) {
      getDashboardData(org.code.toString(), token)
        .then(setData)
        .catch(err => {
            console.error(err);
            setData(null);
        })
        .finally(() => setIsLoading(false));
    }
  }, [org, token]);

  const handleIncidentPagination = async (url: string | null) => {
    if (!url || !data || !org || !token) return;
    setIsIncidentsLoading(true);
    try {
        const paginatedData = await getDashboardData(org.code.toString(), token, url);
        if (paginatedData) {
            setData({ ...data, active_incidents: paginatedData.active_incidents });
        }
    } catch(error) {
        console.error("Failed to fetch active incidents", error);
    } finally {
        setIsIncidentsLoading(false);
    }
  }


  if (isLoading || !data || !org) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="space-y-2">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-[400px] w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-1/4" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-24 w-full" />
            </CardContent>
        </Card>
      </div>
    );
  }
  
  const activeIncidents = data.active_incidents;
  const hasActiveIncidents = activeIncidents && activeIncidents.results && activeIncidents.results.length > 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Agency Dashboard</h1>
          <p className="text-muted-foreground font-medium">
            Welcome! Here's a high-level overview of your operations.
          </p>
        </div>
      </div>

      <AgencyAnalyticsDashboard counts={data.basic_counts} />
      
      <IncidentStatusBreakdown counts={data.basic_counts} />

      <AgencyIncidentChart incidentTrend={data.incident_trend} orgCode={org.code.toString()} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GuardPerformanceBreakdown performance={data.guard_performance} />
        <PatrollingOfficerPerformance performance={data.patrol_officer_performance} />
      </div>

      <Card className={cn(
          hasActiveIncidents ? "border-destructive bg-destructive/10" : "border-chart-2 bg-chart-2/10"
      )}>
        <CardHeader className="flex flex-row items-center gap-2">
           {hasActiveIncidents ? (
              <AlertTriangle className="w-6 h-6 text-destructive" />
            ) : (
              <CheckCircle2 className="w-6 h-6 text-chart-2" />
            )}
          <CardTitle className={cn(hasActiveIncidents ? "text-destructive" : "text-chart-2")}>
            Active Emergency Incidents ({data.active_incidents.count})
          </CardTitle>
        </CardHeader>
        <CardContent>
           {isIncidentsLoading ? (
             <div className="flex items-center justify-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
           ) : hasActiveIncidents ? (
            <ScrollArea className="h-72">
            <Table>
              <TableHeader>
                <TableRow className="border-destructive/20">
                  <TableHead className="text-foreground">Incident ID</TableHead>
                  <TableHead className="text-foreground">Site Name</TableHead>
                  <TableHead className="text-foreground">Guard</TableHead>
                  <TableHead className="text-foreground">Patrolling Officer</TableHead>
                  <TableHead className="text-foreground">Incident Date</TableHead>
                  <TableHead className="text-foreground">Incident Time</TableHead>
                  <TableHead className="text-foreground">Contact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeIncidents.results.map((incident) => {
                  const incidentDate = new Date(incident.incident_time);
                  
                  return (
                    <TableRow 
                      key={incident.id}
                      onClick={() => router.push(`/agency/incidents/${incident.id}`)}
                      className="cursor-pointer border-destructive/20 hover:bg-destructive/20"
                    >
                      <TableCell>
                        <Button asChild variant="link" className="p-0 h-auto" onClick={(e) => e.stopPropagation()}>
                          <Link href={`/agency/incidents/${incident.id}`}>{incident.incident_id}</Link>
                        </Button>
                      </TableCell>
                      <TableCell>
                        {incident.site_details?.site_name || 'N/A'}
                      </TableCell>
                      <TableCell>{incident.guard_name || 'N/A'}</TableCell>
                      <TableCell>
                        {incident.patrol_officer_name || 'N/A'}
                      </TableCell>
                      <TableCell>{incidentDate.toLocaleDateString()}</TableCell>
                      <TableCell>{incidentDate.toLocaleTimeString()}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="destructive" size="sm" onClick={(e) => e.stopPropagation()}>
                              Contact <ChevronDown className="ml-2 h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            {incident.contact_details.guard_phone && (
                              <DropdownMenuItem asChild>
                                <a href={`tel:${incident.contact_details.guard_phone}`}>
                                  <Phone className="mr-2 h-4 w-4" />
                                  Contact Guard
                                </a>
                              </DropdownMenuItem>
                            )}
                            {incident.contact_details.officer_phone && (
                              <DropdownMenuItem asChild>
                                <a href={`tel:${incident.contact_details.officer_phone}`}>
                                  <Phone className="mr-2 h-4 w-4" />
                                  Contact Patrolling Officer
                                </a>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </ScrollArea>
          ) : (
            <p className="text-center py-4 font-medium text-chart-2">
              No active emergency incidents. All systems are normal.
            </p>
          )}
        </CardContent>
         {activeIncidents && activeIncidents.count > 0 && (
            <CardFooter>
                 <div className="flex items-center justify-between w-full">
                    <div className="text-sm text-destructive font-medium">
                        Showing {activeIncidents.results.length} of {activeIncidents.count} active incidents.
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleIncidentPagination(activeIncidents.previous)}
                            disabled={!activeIncidents.previous || isIncidentsLoading}
                            className="w-20"
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleIncidentPagination(activeIncidents.next)}
                            disabled={!activeIncidents.next || isIncidentsLoading}
                            className="w-20"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </CardFooter>
          )}
      </Card>

    </div>
  );
}
