
'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Incident, Guard, Site, Organization, PatrollingOfficer } from '@/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, FileDown, Phone, MapPin, UserCheck, ShieldCheck, Mail, ShieldAlert, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetchData } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type PaginatedIncidents = {
    count: number;
    next: string | null;
    previous: string | null;
    results: {
        id: number;
        incident_id: string;
        incident_time: string;
        site_name: string;
        incident_status: "Active" | "Under Review" | "Resolved";
    }[];
};

type GuardReportData = {
    id: number;
    employee_id: string;
    profile_picture: string | null;
    first_name: string;
    last_name: string | null;
    phone: string;
    email: string;
    total_incidents_count: number;
    resolved_incidents_count: number;
    guard_checkin_accuracy: string;
    selfie_accuracy: string;
    total_selfie_requests: number;
    missed_selfies: number;
    site_details: {
        id: number;
        tb_site_id: string;
        org_site_id: string;
        site_name: string;
        site_address_line1: string;
        region: string;
        city: string;
        lat: number;
        lng: number;
    } | null;
    patrol_officer: {
        id: number;
        first_name: string;
        last_name: string | null;
        email: string;
        phone: string;
    } | null;
    incidents: PaginatedIncidents;
};


const getPerformanceColor = (value: number) => {
  if (value >= 95) {
    return 'hsl(var(--chart-2))'; // Green
  } else if (value >= 65) {
    return 'hsl(var(--chart-3))'; // Yellow
  } else {
    return 'hsl(var(--destructive))'; // Orange
  }
};


export default function AgencyGuardReportPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const guardId = params.guardId as string;
  
  const [reportData, setReportData] = useState<GuardReportData | null>(null);
  const [paginatedIncidents, setPaginatedIncidents] = useState<PaginatedIncidents | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isIncidentsLoading, setIsIncidentsLoading] = useState(false);
  const [loggedInOrg, setLoggedInOrg] = useState<Organization | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [performanceSelectedYear, setPerformanceSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [performanceSelectedMonth, setPerformanceSelectedMonth] = useState<string>('all');
  const incidentsTableRef = useRef<HTMLDivElement>(null);

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

  const fetchReportData = useCallback(async (url: string, isFiltering: boolean = false) => {
    if (isFiltering) {
      setIsIncidentsLoading(true);
    } else {
      setIsLoading(true);
    }

    try {
        const data = await fetchData<GuardReportData>(url, token || undefined);
        if (isFiltering) {
            setPaginatedIncidents(data?.incidents || null);
        } else {
            setReportData(data);
            setPaginatedIncidents(data?.incidents || null);
        }
    } catch (error) {
        console.error("Failed to fetch guard report:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load guard report data."});
    } finally {
        if (isFiltering) {
          setIsIncidentsLoading(false);
        } else {
          setIsLoading(false);
        }
    }
  }, [toast, token]);
  
  useEffect(() => {
    if (loggedInOrg && guardId) {
      const baseUrl = `/agency/${loggedInOrg.code}/guard/${guardId}/`;
      const params = new URLSearchParams();

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
      fetchReportData(fullUrl, false);
    }
  }, [loggedInOrg, guardId, selectedYear, selectedMonth, selectedStatus, fetchReportData]);

  const handleIncidentPagination = useCallback(async (url: string | null) => {
      if (!url) return;
      setIsIncidentsLoading(true);
      try {
        const data = await fetchData<{incidents: PaginatedIncidents}>(url, token || undefined);
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
      reportData.incidents.results.map((incident) => new Date(incident.incident_time).getFullYear().toString())
    );
    if (years.size > 0 || !years.has(new Date().getFullYear().toString())) {
        years.add(new Date().getFullYear().toString());
    }
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  }, [reportData]);
  
  const performanceAvailableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());
  }, []);

  const handleDownloadReport = () => {
    if (!reportData) return;
    toast({
      title: 'Report Generation Started',
      description: `Generating a detailed report for ${reportData.first_name} ${reportData.last_name || ''}.`,
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

  const getStatusIndicator = (status: "Active" | "Under Review" | "Resolved") => {
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
  
  if (isLoading) {
    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <Skeleton className="h-12 w-1/2" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Skeleton className="h-64 lg:col-span-1" />
                <Skeleton className="h-64 lg:col-span-1" />
                <Skeleton className="h-64 lg:col-span-1" />
            </div>
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-80 w-full" />
        </div>
    );
  }

  if (!reportData) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Card>
          <CardContent className="pt-6">
            <p className="font-medium">Guard not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const guardName = `${reportData.first_name} ${reportData.last_name || ''}`.trim();
  const checkinAccuracy = parseFloat(reportData.guard_checkin_accuracy);
  const selfieAccuracy = parseFloat(reportData.selfie_accuracy);
  
  const perimeterAccuracyData = [
    { name: 'Accuracy', value: checkinAccuracy },
    { name: 'Remaining', value: 100 - checkinAccuracy },
  ];
  
  const selfieAccuracyData = [
    { name: 'Accuracy', value: selfieAccuracy },
    { name: 'Remaining', value: 100 - selfieAccuracy },
  ];

  const perimeterColor = getPerformanceColor(checkinAccuracy);
  const selfieColor = getPerformanceColor(selfieAccuracy);
  
  const COLORS_CHECKIN = [perimeterColor, 'hsl(var(--muted))'];
  const COLORS_SELFIE = [selfieColor, 'hsl(var(--muted))'];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon">
            <Link href="/agency/guards">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to Guards</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Security Guard Report</h1>
            <p className="text-muted-foreground font-medium">Detailed overview for {guardName}.</p>
          </div>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button disabled className="bg-[#00B4D8] hover:bg-[#00B4D8]/90 w-56">
                <FileDown className="mr-2 h-4 w-4" />
                Download Full Report
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Upcoming feature</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={reportData.profile_picture || undefined} alt={guardName} />
                <AvatarFallback>{guardName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{guardName}</CardTitle>
                <CardDescription>ID: {reportData.employee_id}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm mt-2 space-y-2">
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 mt-1 text-primary" />
                <a href={`tel:${reportData.phone}`} className="hover:underline font-medium">{reportData.phone}</a>
              </div>
            </div>
             <div className="pt-4 mt-4 border-t">
              <h4 className="font-semibold mb-4 text-lg">Operational Overview</h4>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <button onClick={handleScrollToIncidents} className="flex flex-col items-center gap-1 group">
                      <ShieldAlert className="h-8 w-8 text-primary" />
                      <p className="font-medium text-[#00B4D8] group-hover:underline">Total Incidents</p>
                      <p className="font-bold text-lg text-[#00B4D8] group-hover:underline">{reportData.total_incidents_count}</p>
                  </button>
                   <button onClick={handleScrollToIncidents} className="flex flex-col items-center gap-1 group">
                      <ShieldCheck className="h-8 w-8 text-primary" />
                      <p className="font-medium text-[#00B4D8] group-hover:underline">Incidents Resolved</p>
                      <p className="font-bold text-lg text-[#00B4D8] group-hover:underline">{reportData.resolved_incidents_count}</p>
                  </button>
                </div>
            </div>
          </CardContent>
        </Card>

        {reportData.site_details && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Assigned Site
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-semibold text-xl">{reportData.site_details.site_name}</p>
                <p className="font-medium">Towerbuddy ID: {reportData.site_details.tb_site_id}</p>
                <p className="font-medium">Site ID: {reportData.site_details.org_site_id}</p>
              </div>
              <div className="text-sm space-y-3 pt-4 border-t">
                 <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 mt-1 text-primary" />
                    <div>
                        <p className="font-semibold">Address</p>
                        <p className="font-medium text-muted-foreground">
                        {reportData.site_details.site_address_line1}, {reportData.site_details.city}, {reportData.site_details.region}
                        </p>
                    </div>
                 </div>
                 <div className="flex items-start gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-globe mt-1 shrink-0 text-primary"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                    <div>
                        <p className="font-semibold">Coordinates</p>
                        <p className="font-medium text-muted-foreground">Lat: {reportData.site_details.lat.toFixed(4)}, Lng: {reportData.site_details.lng.toFixed(4)}</p>
                    </div>
                </div>
              </div>
              <Button asChild variant="link" className="p-0 h-auto font-medium">
                <Link href={`/agency/sites/${reportData.site_details.id}`}>
                  View Full Site Report
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {reportData.patrol_officer && (
           <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserCheck className="h-5 w-5"/>Patrolling Officer</CardTitle>
                <CardDescription>Officer overseeing this site.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <p className="font-semibold text-base">{`${reportData.patrol_officer.first_name} ${reportData.patrol_officer.last_name || ''}`}</p>
                </div>
                <div className="text-sm space-y-2 pt-2 border-t">
                  <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> <a href={`tel:${reportData.patrol_officer.phone}`} className="hover:underline">{reportData.patrol_officer.phone}</a></div>
                  <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> <a href={`mailto:${reportData.patrol_officer.email}`} className="hover:underline">{reportData.patrol_officer.email}</a></div>
                </div>
                 <Button asChild variant="link" className="p-0 h-auto font-medium">
                    <Link href={`/agency/patrolling-officers/${reportData.patrol_officer.id}`}>View Full Officer Report</Link>
                </Button>
            </CardContent>
          </Card>
        )}
      </div>

       <Card>
          <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>Guard Performance</CardTitle>
                <CardDescription>Key performance indicators for this guard.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                  <Select value={performanceSelectedYear} onValueChange={setPerformanceSelectedYear}>
                      <SelectTrigger className="w-full sm:w-[120px] font-medium hover:bg-accent hover:text-accent-foreground">
                          <SelectValue placeholder="Select Year" />
                      </SelectTrigger>
                      <SelectContent>
                      {performanceAvailableYears.map((year) => (
                          <SelectItem key={year} value={year} className="font-medium">
                          {year}
                          </SelectItem>
                      ))}
                      </SelectContent>
                  </Select>
                  <Select value={performanceSelectedMonth} onValueChange={setPerformanceSelectedMonth}>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center justify-items-center">
                  <div className="flex flex-col items-center gap-2">
                      <div className="w-32 h-32 relative">
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie
                                      data={perimeterAccuracyData}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius="70%"
                                      outerRadius="85%"
                                      paddingAngle={0}
                                      dataKey="value"
                                      stroke="none"
                                  >
                                      {perimeterAccuracyData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={COLORS_CHECKIN[index % COLORS_CHECKIN.length]} />
                                      ))}
                                  </Pie>
                              </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <span className="text-3xl font-bold" style={{ color: perimeterColor }}>
                                  {checkinAccuracy}%
                              </span>
                          </div>
                      </div>
                      <p className="flex items-center gap-2 text-center font-medium">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        Guard Check-in Accuracy
                      </p>
                  </div>
                  
                  <div className="flex flex-col items-center gap-2">
                      <div className="w-32 h-32 relative">
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie
                                      data={selfieAccuracyData}
                                      cx="50%"
                                      cy="50%"
                                      innerRadius="70%"
                                      outerRadius="85%"
                                      paddingAngle={0}
                                      dataKey="value"
                                      stroke="none"
                                  >
                                      {selfieAccuracyData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={COLORS_SELFIE[index % COLORS_SELFIE.length]} />
                                      ))}
                                  </Pie>
                              </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <span className="text-3xl font-bold" style={{ color: selfieColor }}>
                                  {selfieAccuracy}%
                              </span>
                          </div>
                      </div>
                      <p className="flex items-center gap-2 text-center font-medium">
                        <UserCheck className="w-4 h-4 text-primary" />
                        Selfie Check-in Accuracy
                      </p>
                      <div className="text-sm text-muted-foreground font-medium text-center mt-1">
                          <p>Total Requests: {reportData.total_selfie_requests} | Missed: {reportData.missed_selfies}</p>
                      </div>
                  </div>
              </div>
          </CardContent>
        </Card>

      <Card ref={incidentsTableRef}>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex-grow">
            <CardTitle>Incidents Log</CardTitle>
            <CardDescription className="font-medium">A log of emergency incidents involving {guardName}.</CardDescription>
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
                    <TableHead>Site Name</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedIncidents.results.map((incident) => (
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
                      <TableCell className="font-medium">{incident.site_name}</TableCell>
                      <TableCell>{getStatusIndicator(incident.incident_status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <p className="text-muted-foreground text-center py-4 font-medium">No recent emergency incidents for this guard {selectedYear !== 'all' || selectedMonth !== 'all' ? 'in the selected period' : ''}.</p>
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
                        className="w-20"
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleIncidentPagination(paginatedIncidents.next)}
                        disabled={!paginatedIncidents.next}
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

    