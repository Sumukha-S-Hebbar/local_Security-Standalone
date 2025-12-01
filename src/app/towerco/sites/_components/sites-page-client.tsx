
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
  FileDown,
  Search,
  ShieldAlert,
  Users,
  PlusCircle,
  Loader2,
  MapPin,
  Upload,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchData } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getApiBaseUrl } from '@/lib/get-api-url';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


const addSiteFormSchema = z.object({
    org_site_id: z.string().min(1, 'Site ID is required.'),
    site_name: z.string().min(1, 'Site name is required.'),
    site_address_line1: z.string().min(1, 'Address is required.'),
    site_address_line2: z.string().optional(),
    site_address_line3: z.string().optional(),
    region: z.string().min(1, 'Region is required.'),
    city: z.string().min(1, 'City is required.'),
    site_zip_code: z.string().optional(),
    lat: z.coerce.number({invalid_type_error: 'Required'}),
    lng: z.coerce.number({invalid_type_error: 'Required'}),
});

const uploadFormSchema = z.object({
  excelFile: z
    .any()
    .refine((files) => files?.length === 1, 'Excel file is required.')
    .refine((files) => ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'].includes(files?.[0]?.type), 'Only .xlsx or .xls files are accepted.'),
});

type ApiRegion = {
  id: number;
  name: string;
};

type ApiCity = {
    id: number;
    name: string;
}

const ITEMS_PER_PAGE = 10;

export function SitesPageClient() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusSite = searchParams.get('focusSite');
  const initialTab = searchParams.get('tab') || 'assigned';

  const [assignedSites, setAssignedSites] = useState<Site[]>([]);
  const [unassignedSites, setUnassignedSites] = useState<Site[]>([]);
  const [allAgencies, setAllAgencies] = useState<SecurityAgency[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loggedInOrg, setLoggedInOrg] = useState<Organization | null>(null);
  const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState(initialTab);

  // State for filters
  const [assignedSearchQuery, setAssignedSearchQuery] = useState('');
  const [assignedSelectedRegion, setAssignedSelectedRegion] = useState('all');
  const [assignedSelectedCity, setAssignedSelectedCity] = useState('all');
  const [unassignedSearchQuery, setUnassignedSearchQuery] = useState('');
  const [unassignedSelectedRegion, setUnassignedSelectedRegion] = useState('all');
  const [unassignedSelectedCity, setUnassignedSelectedCity] = useState('all');
  
  const [assignedSitesCount, setAssignedSitesCount] = useState(0);
  const [unassignedSitesCount, setUnassignedSitesCount] = useState(0);
  const [assignedCurrentPage, setAssignedCurrentPage] = useState(1);
  const [unassignedCurrentPage, setUnassignedCurrentPage] = useState(1);

  // Pagination URL state
  const [assignedNextUrl, setAssignedNextUrl] = useState<string | null>(null);
  const [assignedPrevUrl, setAssignedPrevUrl] = useState<string | null>(null);
  const [unassignedNextUrl, setUnassignedNextUrl] = useState<string | null>(null);
  const [unassignedPrevUrl, setUnassignedPrevUrl] = useState<string | null>(null);

  const [filterRegions, setFilterRegions] = useState<ApiRegion[]>([]);
  const [assignedFilterCities, setAssignedFilterCities] = useState<ApiCity[]>([]);
  const [unassignedFilterCities, setUnassignedFilterCities] = useState<ApiCity[]>([]);
  const [isAssignedCitiesLoading, setIsAssignedCitiesLoading] = useState(false);
  const [isUnassignedCitiesLoading, setIsUnassignedCitiesLoading] = useState(false);


  // State for assignment and dialogs
  const [assignment, setAssignment] = useState<{ [siteId: string]: { agencyId?: string; guards?: string } }>({});
  const [isAddSiteDialogOpen, setIsAddSiteDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAddingSite, setIsAddingSite] = useState(false);

  const [apiRegions, setApiRegions] = useState<ApiRegion[]>([]);
  const [apiCities, setApiCities] = useState<ApiCity[]>([]);
  const [isCitiesLoading, setIsCitiesLoading] = useState(false);
  
  const unassignedSitesRef = useRef(new Map<string, HTMLTableRowElement | null>());

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
  
  const addSiteForm = useForm<z.infer<typeof addSiteFormSchema>>({
    resolver: zodResolver(addSiteFormSchema),
  });
  
  const uploadForm = useForm<z.infer<typeof uploadFormSchema>>({
    resolver: zodResolver(uploadFormSchema),
  });
  
  const watchedRegion = addSiteForm.watch('region');
  
  const fetchAgencies = useCallback(async () => {
    if (!loggedInOrg || !token) return;
    try {
        const agenciesResponse = await fetchData<SecurityAgency[]>(`/orgs/${loggedInOrg.code}/assign_agency/list/`, token);
        setAllAgencies(agenciesResponse || []);
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to load agencies data.'
        });
    }
  }, [loggedInOrg, token, toast]);


  const fetchSites = useCallback(async (status: 'Assigned' | 'Unassigned', page: number) => {
    if (!loggedInOrg || !token) return;
    setIsLoading(true);
    
    const params = new URLSearchParams({
        site_status: status,
        page: page.toString(),
        page_size: ITEMS_PER_PAGE.toString(),
    });

    if (status === 'Assigned') {
        if (assignedSearchQuery) params.append('search', assignedSearchQuery);
        if (assignedSelectedRegion !== 'all') params.append('region', assignedSelectedRegion);
        if (assignedSelectedCity !== 'all') params.append('city', assignedSelectedCity);
    } else {
        if (unassignedSearchQuery) params.append('search', unassignedSearchQuery);
        if (unassignedSelectedRegion !== 'all') params.append('region', unassignedSelectedRegion);
        if (unassignedSelectedCity !== 'all') params.append('city', unassignedSelectedCity);
    }

    try {
        const response = await fetchData<PaginatedSitesResponse>(`/orgs/${loggedInOrg.code}/sites/list/?${params.toString()}`, token);
        if (status === 'Assigned') {
            setAssignedSites(response?.results || []);
            setAssignedSitesCount(response?.count || 0);
            setAssignedNextUrl(response?.next || null);
            setAssignedPrevUrl(response?.previous || null);
        } else {
            setUnassignedSites(response?.results || []);
            setUnassignedSitesCount(response?.count || 0);
            setUnassignedNextUrl(response?.next || null);
            setUnassignedPrevUrl(response?.previous || null);
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
  }, [loggedInOrg, token, toast, assignedSearchQuery, assignedSelectedRegion, assignedSelectedCity, unassignedSearchQuery, unassignedSelectedRegion, unassignedSelectedCity]);

  const handlePagination = useCallback(async (url: string, status: 'Assigned' | 'Unassigned') => {
    if (!loggedInOrg || !url || !token) return;
    setIsLoading(true);

    try {
      const response = await fetchData<PaginatedSitesResponse>(url, token);
      if (status === 'Assigned') {
        setAssignedSites(response?.results || []);
        setAssignedSitesCount(response?.count || 0);
        setAssignedNextUrl(response?.next || null);
        setAssignedPrevUrl(response?.previous || null);
        const page = new URL(url).searchParams.get('page');
        setAssignedCurrentPage(page ? parseInt(page) : 1);
      } else {
        setUnassignedSites(response?.results || []);
        setUnassignedSitesCount(response?.count || 0);
        setUnassignedNextUrl(response?.next || null);
        setUnassignedPrevUrl(response?.previous || null);
        const page = new URL(url).searchParams.get('page');
        setUnassignedCurrentPage(page ? parseInt(page) : 1);
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: `Failed to load page.`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [loggedInOrg, toast, token]);

    useEffect(() => {
        async function fetchFilterRegions() {
            if (!loggedInUser || !loggedInUser.country || !token) return;
            const countryId = loggedInUser.country.id;
            const url = `/regions/?country=${countryId}`;
            try {
                const data = await fetchData<{ regions: ApiRegion[] }>(url, token);
                setFilterRegions(data?.regions || []);
            } catch (error) {
                console.error("Failed to fetch regions for filters:", error);
            }
        }
        fetchFilterRegions();
    }, [loggedInUser, token]);
    
    useEffect(() => {
        async function fetchCitiesForFilter(regionId: string, setCities: React.Dispatch<React.SetStateAction<ApiCity[]>>, setLoading: React.Dispatch<React.SetStateAction<boolean>>) {
            if (regionId === 'all' || !loggedInUser || !loggedInUser.country || !token) {
                setCities([]);
                return;
            }
            setLoading(true);
            const countryId = loggedInUser.country.id;
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
            fetchCitiesForFilter(assignedSelectedRegion, setAssignedFilterCities, setIsAssignedCitiesLoading);
        } else {
            fetchCitiesForFilter(unassignedSelectedRegion, setUnassignedFilterCities, setIsUnassignedCitiesLoading);
        }

    }, [assignedSelectedRegion, unassignedSelectedRegion, activeTab, loggedInUser, token]);


  useEffect(() => {
    if (loggedInOrg && token) {
      fetchAgencies();
    }
  }, [loggedInOrg, token, fetchAgencies]);
  
  useEffect(() => {
    if (loggedInOrg) {
        if (activeTab === 'assigned') {
            fetchSites('Assigned', assignedCurrentPage);
        } else {
            fetchSites('Unassigned', unassignedCurrentPage);
        }
    }
  }, [loggedInOrg, activeTab, fetchSites, assignedCurrentPage, unassignedCurrentPage]);

  useEffect(() => setAssignedCurrentPage(1), [assignedSearchQuery, assignedSelectedRegion, assignedSelectedCity]);
  useEffect(() => setUnassignedCurrentPage(1), [unassignedSearchQuery, unassignedSelectedRegion, unassignedSelectedCity]);


  useEffect(() => {
      async function fetchRegionsForForm() {
          if (!loggedInUser || !loggedInUser.country || !isAddSiteDialogOpen || !token) return;

          const countryId = loggedInUser.country.id;
          const url = `/regions/?country=${countryId}`;
          
          try {
              const data = await fetchData<{ regions: ApiRegion[] }>(url, token);
              setApiRegions(data?.regions || []);
          } catch (error) {
              console.error("Failed to fetch regions:", error);
              toast({
              variant: "destructive",
              title: "Error",
              description: "Could not load regions for the selection.",
              });
          }
      }
      fetchRegionsForForm();
  }, [loggedInUser, isAddSiteDialogOpen, toast, token]);

  useEffect(() => {
      async function fetchCitiesForForm() {
          if (!watchedRegion || !loggedInUser || !loggedInUser.country || !token) {
              setApiCities([]);
              return;
          }
          
          setIsCitiesLoading(true);
          const countryId = loggedInUser.country.id;
          const url = `/cities/?country=${countryId}&region=${watchedRegion}`;

          try {
              const data = await fetchData<{ cities: ApiCity[] }>(url, token);
              setApiCities(data?.cities || []);
          } catch (error) {
              console.error("Failed to fetch cities:", error);
              toast({
                  variant: "destructive",
                  title: "Error",
                  description: "Could not load cities for the selected region.",
              });
              setApiCities([]);
          } finally {
              setIsCitiesLoading(false);
          }
      }

      addSiteForm.resetField('city');
      if (watchedRegion) {
        fetchCitiesForForm();
      }
  }, [watchedRegion, loggedInUser, toast, addSiteForm, token]);


  useEffect(() => {
    if (!isLoading && focusSite && activeTab === 'unassigned') {
        const el = unassignedSitesRef.current.get(focusSite);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('highlight-row');
          setTimeout(() => {
            el.classList.remove('highlight-row');
          }, 2000);
        }
    }
  }, [focusSite, isLoading, activeTab]);

  const handleAssignedRegionChange = (region: string) => {
    setAssignedSelectedRegion(region);
    setAssignedSelectedCity('all');
  };

  const handleUnassignedRegionChange = (region: string) => {
    setUnassignedSelectedRegion(region);
    setUnassignedSelectedCity('all');
  };

  const handleAssignmentChange = (siteId: string, key: 'agencyId' | 'guards', value: string) => {
      setAssignment(prev => ({
          ...prev, 
          [siteId]: {
            ...prev[siteId],
            [key]: value
          }
      }));
  }

  const handleAssignAgency = async (siteId: string) => {
    if (!loggedInOrg || !token) return;

    const assignmentDetails = assignment[siteId];
    const agencyId = assignmentDetails?.agencyId;
    const numberOfGuards = assignmentDetails?.guards;

    if (!agencyId || !numberOfGuards || parseInt(numberOfGuards) <= 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select an agency and enter a valid number of guards.',
      });
      return;
    }

    const agency = allAgencies.find(a => a.id.toString() === agencyId);
    if (!agency) {
       toast({ variant: 'destructive', title: 'Error', description: 'Could not find selected agency.' });
       return;
    }
    
    const API_URL = `${getApiBaseUrl()}/orgs/${loggedInOrg.code}/sites/${siteId}/assign-agency/`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`,
            },
            body: JSON.stringify({
                agency_name: agency.name,
                number_of_guards: parseInt(numberOfGuards, 10),
            })
        });

        const responseData = await response.json();
        if (!response.ok) {
            throw new Error(responseData.detail || 'Failed to assign agency.');
        }

        toast({
          title: 'Site Assigned Successfully',
          description: responseData.detail,
        });
        
        fetchSites('Assigned', assignedCurrentPage);
        fetchSites('Unassigned', unassignedCurrentPage);

    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Assignment Failed',
            description: error.message,
        });
    }
  };

  const onAddSiteSubmit = async (values: z.infer<typeof addSiteFormSchema>) => {
    if (!loggedInOrg || !token) {
        toast({ variant: 'destructive', title: 'Error', description: 'Organization info not loaded.' });
        return;
    }
    setIsAddingSite(true);
    const API_URL = `${getApiBaseUrl()}/orgs/${loggedInOrg.code}/sites/add/`;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`
            },
            body: JSON.stringify({
                ...values,
                region: parseInt(values.region, 10),
                city: parseInt(values.city, 10),
            })
        });

        const responseData = await response.json();
        if (!response.ok) {
            const errorDetail = typeof responseData.detail === 'object' ? JSON.stringify(responseData.detail) : responseData.detail;
            throw new Error(errorDetail || 'Failed to add site.');
        }

        toast({
            title: 'Site Added Successfully',
            description: responseData.message,
        });
        
        setActiveTab('unassigned');
        await fetchSites('Unassigned', 1);
        setIsAddSiteDialogOpen(false);
        addSiteForm.reset();

    } catch(error: any) {
         toast({
            variant: 'destructive',
            title: 'Add Site Failed',
            description: error.message,
        });
    } finally {
        setIsAddingSite(false);
    }
  }
  
  const onUploadSubmit = async (values: z.infer<typeof uploadFormSchema>) => {
    setIsUploading(true);
    console.log('Uploaded file:', values.excelFile[0]);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    toast({
      title: 'Upload Successful',
      description: `File "${values.excelFile[0].name}" has been uploaded. Site profiles will be processed.`,
    });
    uploadForm.reset({ excelFile: undefined });
    const fileInput = document.getElementById('excelFile-site-input') as HTMLInputElement | null;
    if (fileInput) fileInput.value = '';
    setIsUploadDialogOpen(false);
    fetchSites('Unassigned', 1);
  }

  const handleDownloadTemplate = () => {
    toast({
        title: 'Template Downloaded',
        description: 'Site profile Excel template has been downloaded.',
    });
  }
  
  const assignedTotalPages = Math.ceil(assignedSitesCount / ITEMS_PER_PAGE);
  const unassignedTotalPages = Math.ceil(unassignedSitesCount / ITEMS_PER_PAGE);
  
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Site Management</h1>
          <p className="text-muted-foreground font-medium">
            Assign security agencies and manage your portfolio of sites.
          </p>
        </div>
        <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button disabled className="bg-[#00B4D8] hover:bg-[#00B4D8]/90 w-56">
                      <FileDown className="mr-2 h-4 w-4" />
                      Download Excel Template
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Upcoming feature</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                       <DialogTrigger asChild>
                          <Button disabled className="bg-[#00B4D8] hover:bg-[#00B4D8]/90 w-56">
                              <Upload className="mr-2 h-4 w-4" />
                              Upload Excel
                          </Button>
                      </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Upcoming feature</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <DialogContent>
                    <DialogHeader>
                    <DialogTitle>Upload Site Profiles</DialogTitle>
                    <DialogDescription className="font-medium">
                        Upload an Excel file to add multiple sites at once.
                    </DialogDescription>
                    </DialogHeader>
                    <Form {...uploadForm}>
                        <form onSubmit={uploadForm.handleSubmit(onUploadSubmit)}>
                            <div className="grid gap-4 py-4">
                                <FormField
                                    control={uploadForm.control}
                                    name="excelFile"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Site Excel File</FormLabel>
                                        <FormControl>
                                        <Input
                                            id="excelFile-site-input"
                                            type="file"
                                            accept=".xlsx, .xls"
                                            disabled={isUploading}
                                            onChange={(e) => field.onChange(e.target.files)}
                                        />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={isUploading} className="bg-[#00B4D8] hover:bg-[#00B4D8]/90">
                                {isUploading ? (
                                    <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Uploading...
                                    </>
                                ) : (
                                    <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload Excel
                                    </>
                                )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
            <Dialog open={isAddSiteDialogOpen} onOpenChange={setIsAddSiteDialogOpen}>
                <DialogTrigger asChild>
                    <Button className="bg-[#00B4D8] hover:bg-[#00B4D8]/90 w-56">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Site
                    </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Add a New Site</DialogTitle>
                        <DialogDescription className="font-medium">
                            Fill in the details below to create a new site. It will be added to the unassigned list.
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...addSiteForm}>
                        <form onSubmit={addSiteForm.handleSubmit(onAddSiteSubmit)} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={addSiteForm.control}
                                    name="org_site_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Site ID</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Enter text" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={addSiteForm.control}
                                    name="site_name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Site Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Enter text" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                             <FormField
                                control={addSiteForm.control}
                                name="site_address_line1"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Address Line 1</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter text" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-2 gap-4">
                               <FormField
                                  control={addSiteForm.control}
                                  name="region"
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Region</FormLabel>
                                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                                              <FormControl>
                                                  <SelectTrigger>
                                                      <SelectValue placeholder="Select region" />
                                                  </SelectTrigger>
                                              </FormControl>
                                              <SelectContent>
                                                  {apiRegions.map(region => (
                                                      <SelectItem key={region.id} value={region.id.toString()}>
                                                          {region.name}
                                                      </SelectItem>
                                                  ))}
                                              </SelectContent>
                                          </Select>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                              <FormField
                                  control={addSiteForm.control}
                                  name="city"
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>City</FormLabel>
                                           <Select onValueChange={field.onChange} value={field.value} disabled={!watchedRegion || isCitiesLoading}>
                                              <FormControl>
                                                  <SelectTrigger>
                                                      <SelectValue placeholder={isCitiesLoading ? "Loading..." : "Select city"} />
                                                  </SelectTrigger>
                                              </FormControl>
                                              <SelectContent>
                                                  {apiCities.map(city => (
                                                      <SelectItem key={city.id} value={city.id.toString()}>
                                                          {city.name}
                                                      </SelectItem>
                                                  ))}
                                              </SelectContent>
                                          </Select>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                            </div>
                             <FormField
                                control={addSiteForm.control}
                                name="site_zip_code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Zip Code (Optional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={addSiteForm.control}
                                    name="lat"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Latitude</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="Enter number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={addSiteForm.control}
                                    name="lng"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Longitude</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="Enter number" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <DialogFooter>
                                <Button type="submit" disabled={isAddingSite} className="bg-[#00B4D8] hover:bg-[#00B4D8]/90 w-56">
                                {isAddingSite ? (
                                    <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Adding Site...
                                    </>
                                ) : (
                                    "Add Site"
                                )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </div>
      </div>
      
      <Card>
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
          <CardHeader>
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="assigned">Assigned</TabsTrigger>
                <TabsTrigger value="unassigned">Unassigned</TabsTrigger>
            </TabsList>
            {activeTab === 'assigned' ? (
                <div className="flex flex-wrap items-center gap-2 pt-4">
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
                            <SelectItem key={region.id} value={region.id.toString()} className="font-medium">
                                {region.name}
                            </SelectItem>
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
                            <SelectItem key={city.id} value={city.id.toString()} className="font-medium">
                                {city.name}
                            </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            ) : (
                 <div className="flex flex-wrap items-center gap-2 pt-4">
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
                                <SelectItem key={city.id} value={city.id.toString()} className="font-medium">
                                    {city.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            ) : (
                <TabsContent value="assigned">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-foreground">Towerbuddy ID</TableHead>
                        <TableHead className="text-foreground">Site ID</TableHead>
                        <TableHead className="text-foreground">Site Name</TableHead>
                        <TableHead className="text-foreground">Location</TableHead>
                        <TableHead className="text-foreground">Agency</TableHead>
                        <TableHead className="text-foreground">Guards Requested</TableHead>
                        <TableHead className="text-foreground">Incidents</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                    {assignedSites.length > 0 ? (
                      assignedSites.map((site) => (
                          <TableRow 
                            key={site.id} 
                            onClick={() => router.push(`/towerco/sites/${site.id}`)}
                            className="cursor-pointer hover:bg-accent hover:text-accent-foreground group"
                          >
                            <TableCell>
                              <Button asChild variant="link" className="p-0 h-auto font-medium group-hover:text-accent-foreground" onClick={(e) => e.stopPropagation()}>
                                <Link href={`/towerco/sites/${site.id}`}>{site.tb_site_id}</Link>
                              </Button>
                            </TableCell>
                            <TableCell className="font-medium">{site.org_site_id}</TableCell>
                            <TableCell><p className="font-medium">{site.site_name}</p></TableCell>
                            <TableCell><p className="font-medium">{site.city}, {site.region}</p></TableCell>
                            <TableCell><span className="font-medium">{site.assigned_agency?.name || 'N/A'}</span></TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 font-medium">
                                <Users className="h-4 w-4 text-muted-foreground group-hover:text-accent-foreground" />
                                <span>{site.total_guards_requested}</span>
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
                </TabsContent>
            )}
            {isLoading ? null : (
                <TabsContent value="unassigned">
                  <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead className="text-foreground">Towerbuddy ID</TableHead>
                        <TableHead className="text-foreground">Site ID</TableHead>
                        <TableHead className="text-foreground">Site Name</TableHead>
                        <TableHead className="text-foreground">Location</TableHead>
                        <TableHead className="text-foreground">Assign Agency</TableHead>
                        <TableHead className="text-foreground">Guards Required</TableHead>
                        <TableHead className="text-right text-foreground">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {unassignedSites.length > 0 ? (
                        unassignedSites.map((site) => (
                                <TableRow 
                                key={site.id} 
                                ref={el => {
                                    if (unassignedSitesRef.current) {
                                        unassignedSitesRef.current.set(site.id.toString(), el);
                                    }
                                }}
                                >
                                <TableCell className="font-medium">{site.tb_site_id}</TableCell>
                                <TableCell className="font-medium">{site.org_site_id}</TableCell>
                                <TableCell><div className="font-medium">{site.site_name}</div></TableCell>
                                <TableCell><p className="font-medium">{site.city}, {site.region}</p></TableCell>
                                <TableCell>
                                    <div onClick={(e) => e.stopPropagation()}>
                                    <Select onValueChange={(value) => handleAssignmentChange(site.id.toString(), 'agencyId', value)}>
                                    <SelectTrigger className="w-[200px] font-medium">
                                        <SelectValue placeholder="Select an agency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allAgencies.map(agency => (
                                            <SelectItem key={agency.id} value={agency.id.toString()}>{agency.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                    </Select>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Input
                                        type="number"
                                        placeholder="Number of guards"
                                        className="w-[120px]"
                                        value={assignment[site.id.toString()]?.guards ?? ''}
                                        onChange={(e) => handleAssignmentChange(site.id.toString(), 'guards', e.target.value)}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        size="sm"
                                        onClick={() => handleAssignAgency(site.id.toString())}
                                        disabled={!assignment[site.id.toString()]?.agencyId || !assignment[site.id.toString()]?.guards}
                                        className="bg-[#00B4D8] hover:bg-[#00B4D8]/90"
                                    >
                                        Assign
                                    </Button>
                                </TableCell>
                                </TableRow>
                        ))
                        ) : (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground font-medium py-10">
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
                            onClick={() => handlePagination(activeTab === 'assigned' ? assignedPrevUrl! : unassignedPrevUrl!, activeTab as 'Assigned' | 'Unassigned')}
                            disabled={isLoading || (activeTab === 'assigned' ? !assignedPrevUrl : !unassignedPrevUrl)}
                            className="w-20"
                        >
                            Previous
                        </Button>
                        <span className="text-sm font-medium">
                            Page {activeTab === 'assigned' ? assignedCurrentPage : unassignedCurrentPage} of {activeTab === 'assigned' ? assignedTotalPages : unassignedTotalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePagination(activeTab === 'assigned' ? assignedNextUrl! : unassignedNextUrl!, activeTab as 'Assigned' | 'Unassigned')}
                            disabled={isLoading || (activeTab === 'assigned' ? !assignedNextUrl : !unassignedNextUrl)}
                            className="w-20"
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
