
'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Incident, Guard, Organization, PatrollingOfficer } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, MapPin, UserCheck, ShieldAlert, FileDown, Fence, Users, Phone, Mail, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { fetchData } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

const chartConfig = {
  incidents: {
    label: "Incidents",
    color: "#FF8200",
  },
} satisfies ChartConfig;

type PaginatedIncidents = {
    count: number;
    next: string | null;
    previous: string | null;
    results: any[]; 
};

type SiteReportData = {
    id: number;
    tb_site_id: string;
    org_site_id: string;
    site_name: string;
    site_status: string;
    lat: number;
    lng: number;
    site_address_line1: string;
    site_address_line2?: string | null;
    site_address_line3?: string | null;
    site_zip_code: string;
    region: string;
    city: string;
    geofence_perimeter: number | null;
    total_incidents_count: number;
    resolved_incidents_count: number;
    guard_details: {
        id: number;
        user: string;
        email: string;
        first_name: string;
        last_name: string | null;
        employee_id: string;
        phone: string;
        profile_picture: string | null;
    }[];
    patrol_officer_details: {
        id: number;
        user: string;
        email: string;
        first_name: string;
        last_name: string | null;
        employee_id: string;
        phone: string;
        profile_picture: string | null;
    }[];
    incident_trend: { month: string; count: number }[];
    incidents: PaginatedIncidents;
};


export default function AgencySiteReportPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const siteId = params.siteId as string;

  const [reportData, setReportData] = useState<SiteReportData | null>(null);
  const [paginatedIncidents, setPaginatedIncidents] = useState<PaginatedIncidents | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isIncidentsLoading, setIsIncidentsLoading] = useState(false);
  const [loggedInOrg, setLoggedInOrg] = useState<Organization | null>(null);
  const [token, setToken] = useState<string | null>(null);
  
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const incidentsTableRef = useRef<HTMLDivElement>(null);
  const [selectedChartYear, setSelectedChartYear] = useState<string>(new Date().getFullYear().toString());

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const userDataString = localStorage.getItem('userData');
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          setLoggedInOrg(userData.user.organization);
          setToken(userData.token);
        }
    }
  }, []);
  
  const fetchSiteReport = useCallback(async (url: string, isFiltering: boolean = false) => {
    if (!token) return;
    if (isFiltering) {
      setIsIncidentsLoading(true);
    } else {
      setIsLoading(true);
    }
    
    try {
        const data = await fetchData<SiteReportData>(url, token);
        if (isFiltering) {
            setPaginatedIncidents(data?.incidents || null);
        } else {
            setReportData(data);
            setPaginatedIncidents(data?.incidents || null);
        }
    } catch (error) {
        console.error("Failed to fetch site report:", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not load site report data.",
        });
    } finally {
        if (isFiltering) {
          setIsIncidentsLoading(false);
        } else {
          setIsLoading(false);
        }
    }
  }, [toast, token]);
  
  useEffect(() => {
    if (loggedInOrg && siteId && token) {
      const baseUrl = `/agency/${loggedInOrg.code}/site/${siteId}/`;
      const params = new URLSearchParams();

      const isFiltering = selectedYear !== 'all' || selectedMonth !== 'all' || selectedStatus !== 'all';

      if (selectedYear !== 'all') params.append('year', selectedYear);
      if (selectedMonth !== 'all' && selectedMonth !== 'all') params.append('month', (parseInt(selectedMonth) + 1).toString());
      if (selectedStatus !== 'all') {
        let apiStatus = '';
        if (selectedStatus === 'under-review') {
          apiStatus = 'Under Review';
        } else {
          apiStatus = selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1);
        }
        params.append('incident_status', apiStatus);
      }
      
      const fullUrl = `${baseUrl}?${params.toString()}`;
      fetchSiteReport(fullUrl, false); 
    }
  }, [loggedInOrg, siteId, selectedYear, selectedMonth, selectedStatus, fetchSiteReport, token]);
  
  const handleIncidentPagination = useCallback(async (url: string | null) => {
      if (!url || !token) return;
      setIsIncidentsLoading(true);
      try {
        const data = await fetchData<SiteReportData>(url, token);
        setPaginatedIncidents(data?.incidents || null);
      } catch (error) {
        console.error("Failed to fetch paginated incidents:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load next page of incidents.' });
      } finally {
        setIsIncidentsLoading(false);
      }
  }, [toast, token]);

  const availableYears = useMemo(() => {
    if (!reportData?.incidents?.results) return [];
    const years = new Set(
      reportData.incidents.results.map((incident: any) => new Date(incident.incident_time).getFullYear().toString())
    );
     if (years.size > 0 || !years.has(new Date().getFullYear().toString())) {
        years.add(new Date().getFullYear().toString());
    }
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [reportData]);

  useEffect(() => {
    if (reportData && availableYears.length > 0) {
      const currentYear = new Date().getFullYear().toString();
      if (availableYears.includes(currentYear)) {
        setSelectedChartYear(currentYear);
      } else {
        setSelectedChartYear(availableYears[0]);
      }
    }
  }, [reportData, availableYears]);


  const monthlyIncidentData = useMemo(() => {
    if (!reportData) return [];
    return reportData.incident_trend.map(item => ({
        month: item.month,
        incidents: item.count
    }));
  }, [reportData, selectedChartYear]);

  const handleDownloadReport = () => {
    toast({
      title: 'Report Generation Started',
      description: `Generating a detailed report for site ${reportData?.site_name}.`,
    });
  };

  const handleScrollToIncidents = () => {
    const element = incidentsTableRef.current;
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        element.classList.add('highlight-row');
        setTimeout(() => {
            element.classList.remove('highlight-row');
        }, 2000);
    }
  };
  
  const getStatusIndicator = (status: Incident['status']) => {
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
  
  if (isLoading || !loggedInOrg) {
    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10" />
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Skeleton className="h-48" />
                <Skeleton className="h-48" />
                <Skeleton className="h-48" />
            </div>
            <Skeleton className="h-64" />
            <Skeleton className="h-96" />
        </div>
    )
  }

  if (!reportData) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Card>
          <CardContent className="pt-6">
            <p className="font-medium">Site not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { site_name, org_site_id, site_address_line1, lat, lng, guard_details, incident_trend, incidents } = reportData;
  const patrollingOfficer = reportData.patrol_officer_details?.[0]; // Assuming one PO per site
  const fullAddress = `${site_address_line1}, ${reportData.city}, ${reportData.region}`;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon">
            <Link href="/agency/sites">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to Sites</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Site Report</h1>
            <p className="text-muted-foreground font-medium">Detailed overview for {site_name}.</p>
          </div>
        </div>
        <Button onClick={handleDownloadReport} className="bg-[#00B4D8] hover:bg-[#00B4D8]/90 w-56">
          <FileDown className="mr-2 h-4 w-4" />
          Download Full Report
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
              <div className="flex flex-wrap justify-between items-start gap-4">
                <div>
                  <CardTitle className="text-2xl">{site_name}</CardTitle>
                  <p className="font-medium">Towerbuddy ID: {reportData.tb_site_id}</p>
                  <p className="font-medium">ID: {org_site_id}</p>
                </div>
              </div>
          </CardHeader>
          <CardContent>
              <div className="text-sm mt-2 grid grid-cols-1 gap-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 mt-0.5 text-primary" />
                  <div>
                    <p className="font-semibold">Address</p>
                    <p className="font-medium">{fullAddress}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-globe mt-0.5 text-primary"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                    <div>
                        <p className="font-semibold">Coordinates</p>
                        <p className="font-medium">Lat: {lat.toFixed(4)}, Lng: {lng.toFixed(4)}</p>
                    </div>
                </div>
                 <div className="flex items-start gap-3">
                  <Fence className="h-5 w-5 mt-0.5 text-primary" />
                  <div>
                    <p className="font-semibold">Geofence Perimeter</p>
                    <p className="font-medium">{reportData.geofence_perimeter ? `${reportData.geofence_perimeter.toFixed(0)} meters` : 'Not set'}</p>
                  </div>
                </div>
                 <div className="flex items-start gap-3">
                   <button
                      onClick={handleScrollToIncidents}
                      className="flex items-start gap-3 text-left text-accent hover:underline"
                    >
                    <ShieldAlert className="h-5 w-5 mt-0.5 text-primary" />
                    <div>
                      <p className="font-semibold">Total Incidents</p>
                      <p className="font-medium text-base">{reportData.total_incidents_count}</p>
                    </div>
                  </button>
                </div>
              </div>
          </CardContent>
        </Card>

        {patrollingOfficer ? (
          <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserCheck className="h-5 w-5"/>Patrolling Officer</CardTitle>
                <CardDescription>Officer overseeing this site.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <p className="font-semibold text-base">{`${patrollingOfficer.first_name} ${patrollingOfficer.last_name || ''}`}</p>
                    <p className="font-medium">ID: {patrollingOfficer.employee_id}</p>
                </div>
                <div className="text-sm space-y-2 pt-2 border-t">
                  <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> <a href={`tel:${patrollingOfficer.phone}`} className="hover:underline">{patrollingOfficer.phone}</a></div>
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> <a href={`mailto:${patrollingOfficer.email}`} className="hover:underline">{patrollingOfficer.email}</a></div>
                </div>
                 <Button asChild variant="link" className="p-0 h-auto font-medium">
                    <Link href={`/agency/patrolling-officers/${patrollingOfficer.id}`}>View Full Officer Report</Link>
                </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserCheck className="h-5 w-5"/>Patrolling Officer</CardTitle>
              <CardDescription>Officer overseeing this site.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground font-medium text-center py-8">No patrolling officer assigned.</p>
            </CardContent>
          </Card>
        )}

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5"/>Assigned Guards</CardTitle>
                <CardDescription>Guards currently assigned to {site_name}.</CardDescription>
            </CardHeader>
            <CardContent>
                {guard_details.length > 0 ? (
                    <div className="space-y-3">
                        {guard_details.map(guard => {
                           const guardName = `${guard.first_name} ${guard.last_name || ''}`.trim();
                           return (
                            <div key={guard.id} className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={guard.profile_picture || undefined} alt={guardName} />
                                    <AvatarFallback>{guard.first_name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-base font-semibold">{guardName}</p>
                                    <Button asChild variant="link" className="p-0 h-auto text-sm font-medium">
                                        <Link href={`/agency/guards/${guard.id}`}>ID: {guard.employee_id}</Link>
                                    </Button>
                                </div>
                            </div>
                        )})}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground font-medium">No guards are assigned to this site.</p>
                )}
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
                <CardTitle>Incidents Reported Monthly</CardTitle>
                <CardDescription>A monthly breakdown of incidents reported at {site_name}.</CardDescription>
            </div>
            <Select value={selectedChartYear} onValueChange={setSelectedChartYear}>
                <SelectTrigger className="w-full sm:w-[120px] font-medium hover:bg-accent hover:text-accent-foreground">
                    <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                    {availableYears.map((year) => (
                    <SelectItem key={year} value={year} className="font-medium">
                        {year}
                    </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </CardHeader>
        <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <ResponsiveContainer>
                    <LineChart data={monthlyIncidentData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line type="monotone" dataKey="incidents" stroke="var(--color-incidents)" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                </ResponsiveContainer>
            </ChartContainer>
        </CardContent>
      </Card>
      
      <Card ref={incidentsTableRef}>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex-grow">
            <CardTitle>Incidents Log</CardTitle>
            <CardDescription className="font-medium">A log of all emergency incidents reported at this site.</CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-full sm:w-[180px] font-medium hover:bg-accent hover:text-accent-foreground">
                    <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all" className="font-medium">All Statuses</SelectItem>
                    <SelectItem value="active" className="font-medium">Active</SelectItem>
                    <SelectItem value="under-review" className="font-medium">Under Review</SelectItem>
                    <SelectItem value="resolved" className="font-medium">Resolved</SelectItem>
                </SelectContent>
            </Select>
            {availableYears.length > 0 && (
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-full sm:w-[120px] font-medium hover:bg-accent hover:text-accent-foreground">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-medium">All Years</SelectItem>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={year} className="font-medium">
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-full sm:w-[140px] font-medium hover:bg-accent hover:text-accent-foreground">
                <SelectValue placeholder="Select Month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-medium">All Months</SelectItem>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i} value={i.toString()} className="font-medium">
                    {new Date(0, i).toLocaleString('default', { month: 'long' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isIncidentsLoading ? (
            <div className="flex items-center justify-center p-10"><Loader2 className="w-8 h-8 animate-spin" /></div>
          ) : paginatedIncidents && paginatedIncidents.results.length > 0 ? (
            <ScrollArea className="h-72">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Incident ID</TableHead>
                    <TableHead>Incident Date</TableHead>
                    <TableHead>Incident Time</TableHead>
                    <TableHead>Patrolling Officer</TableHead>
                    <TableHead>Guard</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedIncidents.results.map((incident) => {
                    return (
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
                        <TableCell className="font-medium">{incident.patrol_officer_name || 'N/A'}</TableCell>
                        <TableCell className="font-medium">{incident.guard_name || 'N/A'}</TableCell>
                        <TableCell>{getStatusIndicator(incident.incident_status)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <p className="text-muted-foreground text-center py-4 font-medium">No emergency incidents have been reported for this site {selectedYear !== 'all' || selectedMonth !== 'all' ? 'in the selected period' : ''}.</p>
          )}
        </CardContent>
         {paginatedIncidents && paginatedIncidents.count > 0 && !isIncidentsLoading && (
          <CardFooter>
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-muted-foreground font-medium">
                  Showing {paginatedIncidents.results.length} of {paginatedIncidents.count} incidents.
              </div>
              <div className="flex items-center gap-2">
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleIncidentPagination(paginatedIncidents.previous)}
                      disabled={!paginatedIncidents.previous}
                  >
                      Previous
                  </Button>
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleIncidentPagination(paginatedIncidents.next)}
                      disabled={!paginatedIncidents.next}
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
