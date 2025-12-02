
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { Site, Organization } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { IncidentStatusSummary } from './incident-status-summary';
import { fetchData } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiBaseUrl } from '@/lib/get-api-url';

type IncidentListItem = {
    id: number;
    incident_id: string;
    tb_site_id: string;
    subcon_id: string;
    site_name: string;
    incident_time: string;
    incident_status: "Active" | "Under Review" | "Resolved";
    incident_type: string;
    incident_description: string;
    guard_name: string;
    patrol_officer_name: string;
};

type IncidentCounts = {
    active_incidents_count: number;
    under_review_incidents_count: number;
    resolved_incidents_count: number;
    sos_count?: number;
}

type PaginatedIncidentsResponse = {
    count: number;
    next: string | null;
    previous: string | null;
    results: IncidentListItem[];
    counts?: IncidentCounts;
};

const ITEMS_PER_PAGE = 10;

export function IncidentsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [incidents, setIncidents] = useState<IncidentListItem[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [incidentCounts, setIncidentCounts] = useState<IncidentCounts>({ active_incidents_count: 0, under_review_incidents_count: 0, resolved_incidents_count: 0, sos_count: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [loggedInOrg, setLoggedInOrg] = useState<Organization | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const statusFromQuery = searchParams.get('status');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(statusFromQuery || 'all');
  const [selectedSite, setSelectedSite] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [prevUrl, setPrevUrl] = useState<string | null>(null);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userDataString = localStorage.getItem('userData');
      if(userDataString) {
        const userData = JSON.parse(userDataString);
        setLoggedInOrg(userData.user.organization);
        setToken(userData.token);
      }
    }
  }, []);

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = new Set<string>();
    for (let i = 0; i < 5; i++) {
        years.add((currentYear - i).toString());
    }
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, []);

  useEffect(() => {
    if (!loggedInOrg) return;

    const fetchSupportingData = async () => {
        const sitesUrl = `/agency/${loggedInOrg.code}/sites/list/`;
        const sitesData = await fetchData<{results: Site[]}>(sitesUrl, token || undefined);
        setSites(sitesData?.results || []);
    };

    fetchSupportingData();
  }, [loggedInOrg, token]);
  
   const fetchFilteredIncidents = useCallback(async (url?: string) => {
    if (!loggedInOrg || !token) return;

    setIsLoading(true);
    let fetchUrl = url;

    if (!fetchUrl) {
      const params = new URLSearchParams();
      
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'sos') {
            params.append('incident_type', 'SOS');
        } else {
            let apiStatus = '';
            if (selectedStatus === 'under-review') {
            apiStatus = 'Under Review';
            } else {
            apiStatus = selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1);
            }
            params.append('incident_status', apiStatus);
        }
      }
      
      if (searchQuery) params.append('search', searchQuery);
      if (selectedSite !== 'all') params.append('site_name', selectedSite);
      if (selectedYear !== 'all') params.append('year', selectedYear);
      if (selectedMonth !== 'all') params.append('month', selectedMonth);
      
      fetchUrl = `/agency/${loggedInOrg.code}/incidents/list/?${params.toString()}`;
    }

      try {
        const data = await fetchData<PaginatedIncidentsResponse>(fetchUrl, token);
        setIncidents(data?.results || []);
        setTotalCount(data?.count || 0);
        setNextUrl(data?.next || null);
        setPrevUrl(data?.previous || null);
        if (data?.counts) {
            setIncidentCounts(data.counts);
        }
        
        const urlObject = new URL(fetchUrl, getApiBaseUrl());
        const pageParam = urlObject.searchParams.get('page');
        setCurrentPage(pageParam ? parseInt(pageParam) : 1);
        
      } catch (error) {
        console.error("Failed to fetch filtered incidents:", error);
        setIncidents([]);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
   }, [loggedInOrg, token, searchQuery, selectedStatus, selectedSite, selectedYear, selectedMonth]);

  useEffect(() => {
    fetchFilteredIncidents();
  }, [fetchFilteredIncidents]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatus, selectedSite, selectedYear, selectedMonth]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleStatusSelectFromSummary = (status: string) => {
    const newStatus = selectedStatus === status ? 'all' : status;
    setSelectedStatus(newStatus);
  };
  
  const getStatusIndicator = (status: IncidentListItem['incident_status']) => {
    switch (status) {
      case 'Active':
        return (
          <div className="flex items-center gap-2 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
            </span>
            <span>Active</span>
          </div>
        );
      case 'Under Review':
        return (
          <div className="flex items-center gap-2 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FFC107]"></span>
            </span>
            <span>Under Review</span>
          </div>
        );
      case 'Resolved':
        return (
          <div className="flex items-center gap-2 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-chart-2"></span>
            </span>
            <span>Resolved</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-muted-foreground"></span>
            </span>
            <span>{status}</span>
          </div>
        );
    }
  };

  if (!loggedInOrg) {
     return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
             <Skeleton className="h-8 w-1/3" />
             <Skeleton className="h-4 w-1/2" />
        </div>
     )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Incidents</h1>
        <p className="text-muted-foreground font-medium">
          A log of all emergency incidents reported across your sites.
        </p>
      </div>

      <IncidentStatusSummary 
        counts={incidentCounts} 
        onStatusSelect={handleStatusSelectFromSummary}
        selectedStatus={selectedStatus}
      />

      <Card>
        <CardHeader>
          <CardTitle>Incident Log</CardTitle>
          <CardDescription className="font-medium">
            Review and monitor all high-priority alerts.
          </CardDescription>
          <div className="flex flex-wrap items-center gap-2 pt-4">
            <div className="relative flex-1 md:grow-0">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search incidents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
              />
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full sm:w-[180px] font-medium hover:bg-accent hover:text-accent-foreground">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-medium">All Statuses</SelectItem>
                <SelectItem value="sos" className="font-medium">SOS</SelectItem>
                <SelectItem value="active" className="font-medium">Active</SelectItem>
                <SelectItem value="under-review" className="font-medium">Under Review</SelectItem>
                <SelectItem value="resolved" className="font-medium">Resolved</SelectItem>
              </SelectContent>
            </Select>
             <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-full sm:w-[120px] font-medium hover:bg-accent hover:text-accent-foreground">
                    <SelectValue placeholder="Filter by Year" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all" className="font-medium">All Years</SelectItem>
                    {availableYears.map(year => (
                        <SelectItem key={year} value={year} className="font-medium">{year}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full sm:w-[140px] font-medium hover:bg-accent hover:text-accent-foreground">
                    <SelectValue placeholder="Filter by Month" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all" className="font-medium">All Months</SelectItem>
                    {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i} value={(i + 1).toString()} className="font-medium">
                            {new Date(0, i).toLocaleString('default', { month: 'long' })}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
             </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-foreground">Incident ID</TableHead>
                  <TableHead className="text-foreground">Incident Date</TableHead>
                  <TableHead className="text-foreground">Incident Time</TableHead>
                  <TableHead className="text-foreground">Site Name</TableHead>
                  <TableHead className="text-foreground">Guard</TableHead>
                  <TableHead className="text-foreground">Patrolling Officer</TableHead>
                  <TableHead className="text-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {incidents.length > 0 ? (
                  incidents.map((incident) => (
                    <TableRow 
                      key={incident.id} 
                      onClick={() => router.push(`/agency/incidents/${incident.id}`)}
                      className="cursor-pointer hover:bg-accent hover:text-accent-foreground group"
                    >
                      <TableCell>
                        <Button asChild variant="link" className="p-0 h-auto font-medium group-hover:text-accent-foreground" onClick={(e) => e.stopPropagation()}>
                          <Link href={`/agency/incidents/${incident.id}`}>{incident.incident_id}</Link>
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{new Date(incident.incident_time).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{new Date(incident.incident_time).toLocaleTimeString()}</TableCell>
                      <TableCell className="font-medium">{incident.site_name || 'N/A'}</TableCell>
                      <TableCell className="font-medium">{incident.guard_name || 'N/A'}</TableCell>
                      <TableCell className="font-medium">
                        {incident.patrol_officer_name || 'N/A'}
                      </TableCell>
                      <TableCell>{getStatusIndicator(incident.incident_status)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground font-medium py-10"
                    >
                      No incidents found for the current filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {totalCount > 0 && !isLoading && (
            <CardFooter>
                <div className="flex items-center justify-between w-full">
                    <div className="text-sm text-muted-foreground font-medium">
                        Showing {incidents.length} of {totalCount} incidents.
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchFilteredIncidents(prevUrl || undefined)}
                            disabled={!prevUrl}
                            className="w-20"
                        >
                            Previous
                        </Button>
                        <span className="text-sm font-medium">Page {currentPage} of {totalPages || 1}</span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchFilteredIncidents(nextUrl || undefined)}
                            disabled={!nextUrl}
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
