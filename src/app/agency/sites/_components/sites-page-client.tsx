
'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Site, Organization, SecurityAgency, PaginatedSitesResponse, User } from '@/types';
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
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileDown,
  MapPin,
  Search,
  ShieldAlert,
  Users,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { fetchData } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getApiBaseUrl } from '@/lib/get-api-url';

const ITEMS_PER_PAGE = 10;

type ApiRegion = {
  id: number;
  name: string;
};

type ApiCity = {
    id: number;
    name: string;
}


export function SitesPageClient() {
  const { toast } = useToast();
  const router = useRouter();

  const [assignedSites, setAssignedSites] = useState<Site[]>([]);
  const [unassignedSites, setUnassignedSites] = useState<Site[]>([]);
  const [patrollingOfficers, setPatrollingOfficers] = useState<any[]>([]);
  const [unassignedGuards, setUnassignedGuards] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loggedInOrg, setLoggedInOrg] = useState<Organization | null>(null);
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState('assigned');

  // State for Assigned Sites filters
  const [assignedSearchQuery, setAssignedSearchQuery] = useState('');
  const [selectedPatrollingOfficerFilter, setSelectedPatrollingOfficerFilter] = useState('all');
  const [assignedSelectedRegion, setAssignedSelectedRegion] = useState('all');
  const [assignedSelectedCity, setAssignedSelectedCity] = useState('all');

  // State for Unassigned Sites filters
  const [unassignedSearchQuery, setUnassignedSearchQuery] = useState('');
  const [unassignedSelectedRegion, setUnassignedSelectedRegion] = useState('all');
  const [unassignedSelectedCity, setUnassignedSelectedCity] = useState('all');

  const [assignment, setAssignment] = useState<{ [siteId: string]: { patrollingOfficerId?: string; guardIds?: string[]; geofencePerimeter?: string; } }>({});

  const [assignedSitesCount, setAssignedSitesCount] = useState(0);
  const [unassignedSitesCount, setUnassignedSitesCount] = useState(0);
  const [assignedCurrentPage, setAssignedCurrentPage] = useState(1);
  const [unassignedCurrentPage, setUnassignedCurrentPage] = useState(1);

  const [filterRegions, setFilterRegions] = useState<ApiRegion[]>([]);
  const [assignedFilterCities, setAssignedFilterCities] = useState<ApiCity[]>([]);
  const [unassignedFilterCities, setUnassignedFilterCities] = useState<ApiCity[]>([]);
  const [isAssignedCitiesLoading, setIsAssignedCitiesLoading] = useState(false);
  const [isUnassignedCitiesLoading, setIsUnassignedCitiesLoading] = useState(false);


  useEffect(() => {
    if (typeof window !== 'undefined') {
        const userDataString = localStorage.getItem('userData');
        if (userDataString) {
          const userData = JSON.parse(userDataString);
          setLoggedInOrg(userData.user.organization);
          setLoggedInUser(userData.user.user);
          setToken(userData.token);
        }
    }
  }, []);

  const fetchSites = useCallback(async (status: 'Assigned' | 'Unassigned', page: number) => {
    if (!loggedInOrg || !token) return;
    setIsLoading(true);

    const params = new URLSearchParams({
        personnel_assignment_status: status,
        page: page.toString(),
        page_size: ITEMS_PER_PAGE.toString(),
    });

    if (status === 'Assigned') {
        if (assignedSearchQuery) params.append('search', assignedSearchQuery);
        if (selectedPatrollingOfficerFilter !== 'all') params.append('patrol_officer', selectedPatrollingOfficerFilter);
        if (assignedSelectedRegion !== 'all') {
          params.append('region', assignedSelectedRegion);
        }
        if (assignedSelectedCity !== 'all') {
            params.append('city', assignedSelectedCity);
        }
    } else {
        if (unassignedSearchQuery) params.append('search', unassignedSearchQuery);
        if (unassignedSelectedRegion !== 'all') {
            params.append('region', unassignedSelectedRegion);
        }
        if (unassignedSelectedCity !== 'all') {
            params.append('city', unassignedSelectedCity);
        }
    }

    try {
        const response = await fetchData<PaginatedSitesResponse>(`/agency/${loggedInOrg.code}/sites/list/?${params.toString()}`, token);
        if (status === 'Assigned') {
            setAssignedSites(response?.results || []);
            setAssignedSitesCount(response?.count || 0);
        } else {
            setUnassignedSites(response?.results || []);
            setUnassignedSitesCount(response?.count || 0);
        }
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: `Failed to load ${status.toLowerCase()} sites.`
        });
    } finally {
        setIsLoading(false);
    }
  }, [loggedInOrg, token, toast, assignedSearchQuery, selectedPatrollingOfficerFilter, assignedSelectedRegion, assignedSelectedCity, unassignedSearchQuery, unassignedSelectedRegion, unassignedSelectedCity]);


  const fetchSupportingData = useCallback(async () => {
    if (!loggedInOrg || !token) return;

    try {
        const poResponse = await fetchData<{results: any[]}>(`/agency/${loggedInOrg.code}/patrol_officers/list/`, token);
        const formattedPOs = poResponse?.results.map((po) => ({
            id: po.id,
            employee_id: po.employee_id,
            first_name: po.first_name,
            last_name: po.last_name,
            name: `${po.first_name} ${po.last_name || ''}`.trim(),
            email: po.email,
            phone: po.phone,
            avatar: po.profile_picture,
            city: po.city,
            sites_assigned_count: po.sites_assigned_count,
            incidents_count: po.incidents_count,
        })) || [];
        setPatrollingOfficers(formattedPOs);

        const unassignedGuardsResponse = await fetchData<{ results: any[] }>(`/agency/${loggedInOrg.code}/unassigned_guards/list/`, token);
        setUnassignedGuards(unassignedGuardsResponse?.results || []);

    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to load supporting data.'
        });
    }
  }, [loggedInOrg, token, toast]);

  useEffect(() => {
    if (loggedInOrg) {
        fetchSupportingData();
    }
  }, [fetchSupportingData, loggedInOrg]);

  useEffect(() => {
    if (loggedInOrg) {
        if (activeTab === 'assigned') {
            fetchSites('Assigned', assignedCurrentPage);
        } else {
            fetchSites('Unassigned', unassignedCurrentPage);
        }
    }
  }, [loggedInOrg, activeTab, fetchSites, assignedCurrentPage, unassignedCurrentPage]);


  // Set default geofence value for unassigned sites
  useEffect(() => {
    const defaultGuards = unassignedSites.reduce((acc, site) => {
      acc[site.id.toString()] = {
        patrollingOfficerId: '',
        guardIds: [],
        geofencePerimeter: site.geofencePerimeter?.toString() || ''
      };
      return acc;
    }, {} as { [key: string]: { patrollingOfficerId?: string; guardIds?: string[]; geofencePerimeter?: string; } });
    setAssignment(defaultGuards);
  }, [unassignedSites]);


  const assignedSitesPatrollingOfficers = useMemo(() => {
    const officers = new Map<string, any>();
    assignedSites.forEach((site) => {
      site.patrol_officer_details?.forEach(po => {
        if (!officers.has(po.id.toString())) {
            officers.set(po.id.toString(), {
                id: po.id,
                employee_id: po.employee_id || '',
                first_name: po.first_name,
                last_name: po.last_name,
                sites_assigned_count: 0, // Not available in this context
                incidents_count: 0, // Not available in this context
                name: `${po.first_name} ${po.last_name || ''}`.trim(),
                email: po.email,
                phone: po.phone,
                avatar: po.profile_picture || '',
            });
        }
      })
    });
    return Array.from(officers.values());
  }, [assignedSites]);

  useEffect(() => {
    const fetchFilterRegions = async () => {
      if (token) {
        try {
          const userDataString = localStorage.getItem('userData');
          if (!userDataString) return;
          const userData = JSON.parse(userDataString);
          const countryId = userData?.user?.country?.id;

          if (!countryId) return;

          const data = await fetchData<{ regions: ApiRegion[] }>(
            `/regions/?country=${countryId}`,
            token
          );
          setFilterRegions(data?.regions || []);
        } catch (error) {
          console.error('Failed to fetch regions for filters:', error);
          toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not load regions for filtering.',
          });
        }
      }
    };
    fetchFilterRegions();
  }, [token, toast]);

 useEffect(() => {
      async function fetchCitiesForFilter(regionId: string, setCities: React.Dispatch<React.SetStateAction<ApiCity[]>>, setLoading: React.Dispatch<React.SetStateAction<boolean>>) {
          const userDataString = localStorage.getItem('userData');
          if (!userDataString || regionId === 'all') {
              setCities([]);
              return;
          }
          const userData = JSON.parse(userDataString);
          const countryId = userData?.user?.country?.id;
          
          if (!countryId || !token) {
              setCities([]);
              return;
          }

          setLoading(true);
          const url = `/cities/?country=${countryId}&region=${regionId}`;
          try {
              const data = await fetchData<{ cities: ApiCity[] }>(url, token);
              setCities(data?.cities || []);
          } catch (error) {
              console.error("Failed to fetch cities for filters:", error);
              setCities([]);
          } finally {
              setLoading(false);
          }
      }

      if(activeTab === 'assigned') {
          setAssignedSelectedCity('all');
          fetchCitiesForFilter(assignedSelectedRegion, setAssignedFilterCities, setIsAssignedCitiesLoading);
      } else {
          setUnassignedSelectedCity('all');
          fetchCitiesForFilter(unassignedSelectedRegion, setUnassignedFilterCities, setIsUnassignedCitiesLoading);
      }

  }, [assignedSelectedRegion, unassignedSelectedRegion, activeTab, token]);


  const handleAssignedRegionChange = (region: string) => {
    setAssignedSelectedRegion(region);
    setAssignedSelectedCity('all');
  };

  const handleUnassignedRegionChange = (region: string) => {
    setUnassignedSelectedRegion(region);
    setUnassignedSelectedCity('all');
  };

  const handlePatrollingOfficerSelect = (siteId: string, patrollingOfficerId: string) => {
    setAssignment((prev) => ({
      ...prev,
      [siteId]: { ...prev[siteId], patrollingOfficerId },
    }));
  };

  const handleAssignmentChange = (siteId: string, key: 'geofencePerimeter', value: string) => {
    setAssignment(prev => ({
        ...prev,
        [siteId]: {
          ...prev[siteId],
          [key]: value
        }
    }));
  }

  const handleGuardSelect = (siteId: string, guardId: string) => {
    const site = unassignedSites.find(s => s.id.toString() === siteId);
    if (!site) return;

    setAssignment((prev) => {
      const currentSelection = prev[siteId]?.guardIds || [];
      const guardsRequired = site.total_guards_requested || 0;

      if (currentSelection.includes(guardId)) {
        const newSelection = currentSelection.filter((id) => id !== guardId);
        return { ...prev, [siteId]: { ...prev[siteId], guardIds: newSelection } };
      }

      if (guardsRequired > 0 && currentSelection.length >= guardsRequired) {
        toast({
            variant: 'destructive',
            title: 'Guard Limit Reached',
            description: `You cannot assign more than ${guardsRequired} guard(s) to this site.`,
        });
        return prev;
      }

      const newSelection = [...currentSelection, guardId];
      return { ...prev, [siteId]: { ...prev[siteId], guardIds: newSelection } };
    });
  };

  const handleAssign = async (siteId: string) => {
    if (!loggedInOrg || !token) return;
    const assignmentDetails = assignment[siteId];
    const patrollingOfficerId = assignmentDetails?.patrollingOfficerId;
    const guardIds = assignmentDetails?.guardIds || [];
    const geofence = assignmentDetails?.geofencePerimeter;

    if (!patrollingOfficerId) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a patrolling officer.' });
      return;
    }
    if (guardIds.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select at least one guard.' });
      return;
    }

    const API_URL = `${getApiBaseUrl()}/agency/${loggedInOrg.code}/sites/${siteId}/assign_personnel/`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                patrol_officer_id: parseInt(patrollingOfficerId, 10),
                guard_ids: guardIds.map(id => parseInt(id, 10)),
                geofence_perimeter: geofence ? parseInt(geofence, 10) : undefined,
            })
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.detail || 'Assignment failed.');
        }

        toast({
          title: 'Site Assigned Successfully',
          description: responseData.message || 'Personnel have been assigned to the site.',
        });

        fetchSites('Assigned', 1);
        fetchSites('Unassigned', 1);

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Assignment Failed',
            description: error.message,
        });
    }
  };

  const renderPatrollingOfficerSelection = (site: Site) => {
     const officersInCity = patrollingOfficers.filter(po => po.city === site.city);
     const officersNotInCity = patrollingOfficers.filter(po => po.city !== site.city);

     const renderItems = (officerList: any[]) => officerList.map((po) => {
       const officerName = `${po.name || ''}`.trim();
       return (
        <SelectItem
          key={po.id}
          value={po.id.toString()}
          className="font-medium"
        >
          {officerName}
        </SelectItem>
     )});

     return (
        <SelectContent>
            {officersInCity.length > 0 && (
                <>
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground px-2">In {site.city}</DropdownMenuLabel>
                    {renderItems(officersInCity)}
                </>
            )}
            {officersNotInCity.length > 0 && (
                 <>
                    {officersInCity.length > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuLabel className="text-xs font-normal text-muted-foreground px-2">Other Cities</DropdownMenuLabel>
                    {renderItems(officersNotInCity)}
                 </>
            )}
        </SelectContent>
     )
  }

  const renderGuardSelection = (site: Site) => {
    const guardsInCity = unassignedGuards.filter(g => g.city === site.city);
    const guardsNotInCity = unassignedGuards.filter(g => g.city !== site.city);

    const renderItems = (guardList: any[]) => guardList.map(guard => {
      const guardName = `${guard.first_name} ${guard.last_name || ''}`.trim();
      const isSelected = (assignment[site.id.toString()]?.guardIds || []).includes(guard.id.toString());
      return (
        <DropdownMenuCheckboxItem
          key={guard.id}
          checked={isSelected}
          onSelect={(e) => {
              e.preventDefault();
              handleGuardSelect(site.id.toString(), guard.id.toString());
          }}
        >
          {guardName}
        </DropdownMenuCheckboxItem>
      );
    });

    if (unassignedGuards.length === 0) {
        return <DropdownMenuLabel>No unassigned guards available</DropdownMenuLabel>;
    }

    return (
        <>
            {guardsInCity.length > 0 && (
                <>
                    <DropdownMenuLabel>In {site.city}</DropdownMenuLabel>
                    {renderItems(guardsInCity)}
                </>
            )}
             {guardsNotInCity.length > 0 && (
                <>
                    {guardsInCity.length > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuLabel>Other Cities</DropdownMenuLabel>
                    {renderItems(guardsNotInCity)}
                </>
            )}
        </>
    );
  }

  const assignedTotalPages = Math.ceil(assignedSitesCount / ITEMS_PER_PAGE);
  const unassignedTotalPages = Math.ceil(unassignedSitesCount / ITEMS_PER_PAGE);

  const handlePagination = (direction: 'next' | 'prev', list: 'assigned' | 'unassigned') => {
    if (list === 'assigned') {
      setAssignedCurrentPage(prev => direction === 'next' ? prev + 1 : prev - 1);
    } else {
      setUnassignedCurrentPage(prev => direction === 'next' ? prev + 1 : prev - 1);
    }
  };


  if (isLoading && (assignedSites.length === 0 && unassignedSites.length === 0)) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Card><CardHeader><Skeleton className="h-24 w-full" /></CardHeader><CardContent><Skeleton className="h-40 w-full" /></CardContent></Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Site Management</h1>
        <p className="text-muted-foreground font-medium">
          Comprehensive overview of all operational sites.
        </p>
      </div>

      <Card>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <CardHeader>
             <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="assigned">Assigned</TabsTrigger>
                <TabsTrigger value="unassigned">Unassigned</TabsTrigger>
            </TabsList>
            {activeTab === 'assigned' ? (
              <div className="pt-4 space-y-4">
                <CardTitle>Assigned Sites</CardTitle>
                <CardDescription className="font-medium">
                  A list of all sites with an assigned patrolling officer.
                </CardDescription>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 md:grow-0">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search assigned sites..."
                      value={assignedSearchQuery}
                      onChange={(e) => setAssignedSearchQuery(e.target.value)}
                      className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
                    />
                  </div>
                  <Select value={assignedSelectedRegion} onValueChange={handleAssignedRegionChange}>
                    <SelectTrigger className="w-full sm:w-[180px] font-medium hover:bg-accent hover:text-accent-foreground">
                      <SelectValue placeholder="Filter by region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="font-medium">All Regions</SelectItem>
                      {filterRegions.map((region) => (
                        <SelectItem key={region.id} value={region.id.toString()} className="font-medium">{region.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={assignedSelectedCity} onValueChange={setAssignedSelectedCity} disabled={assignedSelectedRegion === 'all' || isAssignedCitiesLoading}>
                    <SelectTrigger className="w-full sm:w-[180px] font-medium hover:bg-accent hover:text-accent-foreground">
                      <SelectValue placeholder={isAssignedCitiesLoading ? "Loading..." : "Filter by city"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="font-medium">All Cities</SelectItem>
                      {assignedFilterCities.map((city) => (
                        <SelectItem key={city.id} value={city.id.toString()} className="font-medium">{city.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="pt-4 space-y-4">
                <CardTitle>Unassigned Sites</CardTitle>
                <CardDescription className="font-medium">
                  A list of sites that do not have a patrolling officer assigned.
                </CardDescription>
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 md:grow-0">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Search unassigned sites..."
                        value={unassignedSearchQuery}
                        onChange={(e) => setUnassignedSearchQuery(e.target.value)}
                        className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
                      />
                    </div>
                    <Select value={unassignedSelectedRegion} onValueChange={handleUnassignedRegionChange}>
                      <SelectTrigger className="w-full sm:w-[180px] font-medium hover:bg-accent hover:text-accent-foreground">
                        <SelectValue placeholder="Filter by region" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="font-medium">All Regions</SelectItem>
                        {filterRegions.map((region) => (
                          <SelectItem key={region.id} value={region.id.toString()} className="font-medium">
                                    {region.name}
                                </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={unassignedSelectedCity} onValueChange={setUnassignedSelectedCity} disabled={unassignedSelectedRegion === 'all' || isUnassignedCitiesLoading}>
                      <SelectTrigger className="w-full sm:w-[180px] font-medium hover:bg-accent hover:text-accent-foreground">
                        <SelectValue placeholder={isUnassignedCitiesLoading ? "Loading..." : "Filter by city"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="font-medium">All Cities</SelectItem>
                        {unassignedFilterCities.map((city) => (
                          <SelectItem key={city.id} value={city.id.toString()} className="font-medium">{city.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <TabsContent value="assigned">
              {isLoading ? <Skeleton className="h-40 w-full" /> : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-foreground">Towerbuddy ID</TableHead>
                      <TableHead className="text-foreground">Site ID</TableHead>
                      <TableHead className="text-foreground">Site Name</TableHead>
                      <TableHead className="text-foreground">Location</TableHead>
                      <TableHead className="text-foreground">Patrolling Officer</TableHead>
                      <TableHead className="text-foreground">Guards</TableHead>
                      <TableHead className="text-foreground">Incidents</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {assignedSites.length > 0 ? (
                    assignedSites.map((site) => (
                      <TableRow
                        key={site.id}
                        onClick={() => router.push(`/agency/sites/${site.id}`)}
                        className="cursor-pointer hover:bg-accent hover:text-accent-foreground group"
                      >
                        <TableCell>
                          <Button asChild variant="link" className="p-0 h-auto font-medium group-hover:text-accent-foreground" onClick={(e) => e.stopPropagation()}>
                            <Link href={`/agency/sites/${site.id}`}>{site.tb_site_id}</Link>
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">{site.org_site_id}</TableCell>
                        <TableCell><p className="font-medium">{site.site_name}</p></TableCell>
                        <TableCell><p className="font-medium">{site.city}, {site.region}</p></TableCell>
                        <TableCell className="font-medium">{site.patrol_officer_details?.map(po => `${po.first_name} ${po.last_name || ''}`.trim()).join(', ') || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 font-medium">
                            <Users className="h-4 w-4 text-muted-foreground group-hover:text-accent-foreground" />
                            <span>{site.guard_details?.length || 0}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 font-medium">
                            <ShieldAlert className="h-4 w-4 text-muted-foreground group-hover:text-accent-foreground" />
                            <span>{site.total_incidents || 0}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-10 font-medium">
                        No assigned sites found for the current filter.
                      </TableCell>
                    </TableRow>
                  )}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
            {isLoading ? null : (
                <TabsContent value="unassigned">
                  <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead className="text-foreground">Towerbuddy ID</TableHead>
                        <TableHead className="text-foreground">Site ID</TableHead>
                        <TableHead className="text-foreground">Site Name</TableHead>
                        <TableHead className="text-foreground">Location</TableHead>
                        <TableHead className="text-foreground">Guards Required</TableHead>
                        <TableHead className="text-foreground">Geofence Perimeter</TableHead>
                        <TableHead className="text-foreground">Assign Patrolling Officer</TableHead>
                        <TableHead className="text-foreground">Assign Guards</TableHead>
                        <TableHead className="text-right text-foreground">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {unassignedSites.length > 0 ? (
                        unassignedSites.map((site) => (
                                <TableRow key={site.id}>
                                <TableCell className="font-medium">{site.tb_site_id}</TableCell>
                                <TableCell className="font-medium">{site.org_site_id}</TableCell>
                                <TableCell><div className="font-medium">{site.site_name}</div></TableCell>
                                <TableCell><p className="font-medium">{site.city}, {site.region}</p></TableCell>
                                <TableCell>
                                  <div className="font-medium flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    {site.total_guards_requested || 0}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Input
                                    type="number"
                                    placeholder="in meters"
                                    className="w-[140px]"
                                    value={assignment[site.id.toString()]?.geofencePerimeter || ''}
                                    onChange={(e) => handleAssignmentChange(site.id.toString(), 'geofencePerimeter', e.target.value)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={assignment[site.id.toString()]?.patrollingOfficerId || ''}
                                    onValueChange={(value) => handlePatrollingOfficerSelect(site.id.toString(), value)}
                                  >
                                    <SelectTrigger className="w-[180px] font-medium">
                                      <SelectValue placeholder="Select Officer" />
                                    </SelectTrigger>
                                    {renderPatrollingOfficerSelection(site)}
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="outline" className="w-[180px] font-medium">
                                        <Users className="mr-2 h-4 w-4" />
                                        Select Guards ({assignment[site.id.toString()]?.guardIds?.length || 0})
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="max-h-64 overflow-y-auto">
                                      {renderGuardSelection(site)}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    onClick={() => handleAssign(site.id.toString())}
                                    disabled={!assignment[site.id.toString()]?.patrollingOfficerId || !assignment[site.id.toString()]?.guardIds?.length}
                                    className="bg-[#00B4D8] hover:bg-[#00B4D8]/90"
                                  >
                                    Assign
                                  </Button>
                                </TableCell>
                                </TableRow>
                        ))
                        ) : (
                        <TableRow>
                            <TableCell colSpan={9} className="text-center text-muted-foreground font-medium py-10">
                                No unassigned sites found for the current filter.
                            </TableCell>
                        </TableRow>
                        )}
                    </TableBody>
                  </Table>
                </TabsContent>
            )}
          </CardContent>
          {(activeTab === 'assigned' && assignedSitesCount > 0) || (activeTab === 'unassigned' && unassignedSitesCount > 0) ? (
            <CardFooter>
                <div className="flex items-center justify-between w-full">
                    <div className="text-sm text-muted-foreground font-medium">
                        Showing {activeTab === 'assigned' ? assignedSites.length : unassignedSites.length} of {activeTab === 'assigned' ? assignedSitesCount : unassignedSitesCount} sites.
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePagination('prev', activeTab === 'assigned' ? 'assigned' : 'unassigned')}
                            disabled={isLoading || (activeTab === 'assigned' ? assignedCurrentPage === 1 : unassignedCurrentPage === 1)}
                        >
                            Previous
                        </Button>
                        <span className="text-sm font-medium">
                            Page {activeTab === 'assigned' ? assignedCurrentPage : unassignedCurrentPage} of {activeTab === 'assigned' ? assignedTotalPages : unassignedTotalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePagination('next', activeTab === 'assigned' ? 'assigned' : 'unassigned')}
                            disabled={isLoading || (activeTab === 'assigned' ? assignedCurrentPage >= assignedTotalPages : unassignedCurrentPage >= unassignedTotalPages)}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </CardFooter>
          ) : null}
        </Tabs>
      </Card>
    </div>
  );
}
