
'use client';

import { useState, useMemo, useEffect, useRef, Fragment, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import type { SecurityAgency, Site, Organization, PaginatedSitesResponse, User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Phone, Mail, Upload, Loader2, PlusCircle, Search, MapPin, Building2, ChevronDown, ShieldAlert, FileDown } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { fetchData } from '@/lib/api';
import { getApiBaseUrl } from '@/lib/get-api-url';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


const ITEMS_PER_PAGE = 10;

type PaginatedAgenciesResponse = {
    count: number;
    next: string | null;
    previous: string | null;
    results: SecurityAgency[];
};


const uploadFormSchema = z.object({
  excelFile: z
    .any()
    .refine((files) => files?.length === 1, 'Excel file is required.')
    .refine((files) => ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'].includes(files?.[0]?.type), 'Only .xlsx or .xls files are accepted.'),
});

const addAgencyFormSchema = z.object({
    name: z.string().min(1, { message: 'Agency name is required.' }),
    contact_person: z.string().min(1, { message: 'Contact person is required.' }),
    email: z.string().email({ message: 'Valid email is required.' }),
    phone: z.string().min(1, { message: 'Phone is required.' }),
    region: z.string().min(1, { message: 'Region is required.' }),
    city: z.string().min(1, { message: 'City is required.' }),
    registered_address_line1: z.string().min(1, { message: 'Address Line 1 is required.' }),
    registered_address_line2: z.string().optional(),
    registered_address_line3: z.string().optional(),
});

type ApiRegion = {
  id: number;
  name: string;
};

type ApiCity = {
    id: number;
    name: string;
}

type AssignedSiteDetail = {
    site_details: {
        id: number;
        tb_site_id: string;
        org_site_id: string;
        site_name: string;
        site_address_line1: string;
        city: string;
        region: string;
    };
    assigned_on: string;
    number_of_guards: number;
};


export default function TowercoAgenciesPage() {
    const [securityAgencies, setSecurityAgencies] = useState<SecurityAgency[]>([]);
    const [filterRegions, setFilterRegions] = useState<ApiRegion[]>([]);
    const [filterCities, setFilterCities] = useState<ApiCity[]>([]);
    const [isFilterCitiesLoading, setIsFilterCitiesLoading] = useState(false);

    const [isLoading, setIsLoading] = useState(true);
    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [isAddAgencyDialogOpen, setIsAddAgencyDialogOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isAddingAgency, setIsAddingAgency] = useState(false);
    const [newlyAddedAgencyId, setNewlyAddedAgencyId] = useState<number | null>(null);

    const { toast } = useToast();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRegion, setSelectedRegion] = useState('all');
    const [selectedCity, setSelectedCity] = useState('all');
    
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [nextUrl, setNextUrl] = useState<string | null>(null);
    const [prevUrl, setPrevUrl] = useState<string | null>(null);
    
    const [loggedInOrg, setLoggedInOrg] = useState<Organization | null>(null);
    const [loggedInUser, setLoggedInUser] = useState<User | null>(null);
    const [token, setToken] = useState<string|null>(null);
    const [apiCities, setApiCities] = useState<ApiCity[]>([]);
    const [isCitiesLoading, setIsCitiesLoading] = useState(false);

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

    const fetchAllAgencies = useCallback(async (url?: string) => {
        if (!loggedInOrg || !token) return;
        setIsLoading(true);
        const orgCode = loggedInOrg.code;

        let fetchUrl = url;
        if (!fetchUrl) {
            const params = new URLSearchParams();
            if (searchQuery) params.append('search', searchQuery);
            if (selectedRegion !== 'all') params.append('region', selectedRegion);
            if (selectedCity !== 'all') params.append('city', selectedCity);
            fetchUrl = `/orgs/${orgCode}/security-agencies/list/?${params.toString()}`;
        }

        try {
            const response = await fetchData<PaginatedAgenciesResponse>(fetchUrl, token);
            
            const fetchedAgencies = response?.results || [];
            setSecurityAgencies(fetchedAgencies);
            setTotalCount(response?.count || 0);
            setNextUrl(response?.next || null);
            setPrevUrl(response?.previous || null);

            const urlObject = new URL(fetchUrl, getApiBaseUrl());
            const pageParam = urlObject.searchParams.get('page');
            setCurrentPage(pageParam ? parseInt(pageParam) : 1);

        } catch (error) {
            console.error("Failed to fetch agencies:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not load security agencies.' });
        } finally {
            setIsLoading(false);
        }
    }, [loggedInOrg, token, searchQuery, selectedRegion, selectedCity, toast]);
    
    useEffect(() => {
      async function fetchFilterData() {
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
      fetchFilterData();
    }, [loggedInUser, token]);
    
    useEffect(() => {
        async function fetchFilterCities() {
            if (selectedRegion === 'all' || !loggedInUser || !loggedInUser.country || !token) {
                setFilterCities([]);
                return;
            }
            setIsFilterCitiesLoading(true);
            const countryId = loggedInUser.country.id;
            const url = `/cities/?country=${countryId}&region=${selectedRegion}`;
            try {
                const data = await fetchData<{ cities: ApiCity[] }>(url, token);
                setFilterCities(data?.cities || []);
            } catch (error) {
                console.error("Failed to fetch cities for filters:", error);
                setFilterCities([]);
            } finally {
                setIsFilterCitiesLoading(false);
            }
        }
        fetchFilterCities();
    }, [selectedRegion, loggedInUser, token]);

    const handleRegionChange = (regionId: string) => {
        setSelectedRegion(regionId);
        setSelectedCity('all');
    };


    const handlePagination = useCallback((url: string | null) => {
        if (url) {
            fetchAllAgencies(url);
        }
    }, [fetchAllAgencies]);


    useEffect(() => {
        if (loggedInOrg) {
            fetchAllAgencies();
        }
    }, [loggedInOrg, searchQuery, selectedRegion, selectedCity, fetchAllAgencies]);
    

    const uploadForm = useForm<z.infer<typeof uploadFormSchema>>({
        resolver: zodResolver(uploadFormSchema),
    });

    const addAgencyForm = useForm<z.infer<typeof addAgencyFormSchema>>({
        resolver: zodResolver(addAgencyFormSchema),
        defaultValues: {
            name: '',
            contact_person: '',
            phone: '',
            email: '',
            region: '',
            city: '',
            registered_address_line1: '',
            registered_address_line2: '',
            registered_address_line3: '',
        }
    });

    const watchedRegion = addAgencyForm.watch('region');

    useEffect(() => {
        async function fetchCities() {
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

        addAgencyForm.resetField('city');
        if (watchedRegion) {
          fetchCities();
        }
    }, [watchedRegion, loggedInUser, toast, addAgencyForm, token]);

    async function onUploadSubmit(values: z.infer<typeof uploadFormSchema>) {
        setIsUploading(true);
        console.log('Uploaded file:', values.excelFile[0]);

        await new Promise((resolve) => setTimeout(resolve, 1500));

        toast({
            title: 'Upload Successful',
            description: `File "${values.excelFile[0].name}" has been uploaded. Agency profiles would be processed.`,
        });

        uploadForm.reset({ excelFile: undefined });
        setIsUploading(false);
        setIsAddAgencyDialogOpen(false);
    }

    async function onAddAgencySubmit(values: z.infer<typeof addAgencyFormSchema>) {
        if (!loggedInOrg || !token) {
            toast({ variant: 'destructive', title: 'Error', description: 'Organization not found. Please log in again.'});
            return;
        }

        setIsAddingAgency(true);

        try {
            const API_URL = `${getApiBaseUrl()}/orgs/${loggedInOrg.code}/security-agencies/add/`;
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${token}`
                },
                body: JSON.stringify({
                    ...values, 
                    region: Number(values.region),
                    city: Number(values.city)
                }),
            });

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(responseData.detail || 'Failed to add agency.');
            }
            
            await fetchAllAgencies();
            setNewlyAddedAgencyId(responseData.data.id);
            setTimeout(() => setNewlyAddedAgencyId(null), 2000); 

            toast({
                title: 'Agency Added',
                description: `Agency "${values.name}" has been created successfully.`,
            });
            
            addAgencyForm.reset();
            setIsAddAgencyDialogOpen(false);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error adding agency',
                description: error.message,
            });
        } finally {
            setIsAddingAgency(false);
        }
    }
    
    const handleDownloadTemplate = () => {
        toast({
            title: 'Template Downloaded',
            description: 'Agency profile Excel template has been downloaded.',
        });
    }

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
    
    const handleRowClick = (e: React.MouseEvent, agencyId: number) => {
        const agency = securityAgencies.find(a => a.id === agencyId);
        if (agency) {
            router.push(`/towerco/agencies/${agency.id}`);
        }
    };


    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Security Agency Management</h1>
                    <p className="text-muted-foreground font-medium">
                        Add, view, and manage security agencies.
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
                            <DialogTitle>Upload Agency Profiles</DialogTitle>
                            <DialogDescription className="font-medium">
                                Upload an Excel file to add multiple security agency profiles at once.
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
                                                <FormLabel>Agency Excel File</FormLabel>
                                                <FormControl>
                                                <Input
                                                    id="excelFile-agency-input"
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
                                        <Button type="submit" disabled={isUploading}>
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

                    <Dialog open={isAddAgencyDialogOpen} onOpenChange={setIsAddAgencyDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-[#00B4D8] hover:bg-[#00B4D8]/90 w-56">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Agency
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                            <DialogHeader>
                                <DialogTitle>Add a New Agency</DialogTitle>
                                <DialogDescription className="font-medium">
                                    Fill in the details below to add a new security agency profile.
                                </DialogDescription>
                            </DialogHeader>
                            <Form {...addAgencyForm}>
                                <form onSubmit={addAgencyForm.handleSubmit(onAddAgencySubmit)} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={addAgencyForm.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Agency Name</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Enter text" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={addAgencyForm.control}
                                            name="contact_person"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Contact Person</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Enter text" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={addAgencyForm.control}
                                            name="phone"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Phone</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Enter number" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={addAgencyForm.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Email</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Enter email" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <FormField
                                        control={addAgencyForm.control}
                                        name="registered_address_line1"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Address Line 1</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Enter address" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={addAgencyForm.control}
                                        name="registered_address_line2"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Address Line 2 (Optional)</FormLabel>
                                                <FormControl>
                                                    <Input {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={addAgencyForm.control}
                                        name="registered_address_line3"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Address Line 3 (Optional)</FormLabel>
                                                <FormControl>
                                                    <Input {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={addAgencyForm.control}
                                            name="region"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Region</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select a region" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {filterRegions.map(region => (
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
                                            control={addAgencyForm.control}
                                            name="city"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>City</FormLabel>
                                                     <Select onValueChange={field.onChange} value={field.value} disabled={!watchedRegion || isCitiesLoading}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder={isCitiesLoading ? "Loading cities..." : "Select a city"} />
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
                                    <DialogFooter>
                                        <Button type="submit" disabled={isAddingAgency} className="bg-[#00B4D8] hover:bg-[#00B4D8]/90 w-56">
                                        {isAddingAgency ? (
                                            <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Adding Agency...
                                            </>
                                        ) : (
                                            "Add Agency"
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
                <CardHeader>
                    <div>
                        <CardTitle>All Security Agencies</CardTitle>
                        <CardDescription className="font-medium">A list of all security service providers.</CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-4">
                        <div className="relative flex-1 md:grow-0">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="search"
                            placeholder="Search agencies..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
                          />
                        </div>
                        <Select value={selectedRegion} onValueChange={handleRegionChange}>
                            <SelectTrigger className="w-full sm:w-[180px] font-medium hover:bg-accent hover:text-accent-foreground">
                                <SelectValue placeholder="Filter by region" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="font-medium">All Regions</SelectItem>
                                {filterRegions.map((region) => (
                                <SelectItem key={region.id} value={region.id.toString()}>
                                    {region.name}
                                </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={selectedCity}
                            onValueChange={setSelectedCity}
                            disabled={selectedRegion === 'all' || isFilterCitiesLoading}
                        >
                            <SelectTrigger className="w-full sm:w-[180px] font-medium hover:bg-accent hover:text-accent-foreground">
                                <SelectValue placeholder={isFilterCitiesLoading ? 'Loading...' : 'Filter by city'} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="font-medium">All Cities</SelectItem>
                                {filterCities.map((city) => (
                                <SelectItem key={city.id} value={city.id.toString()}>
                                    {city.name}
                                </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Agency ID</TableHead>
                                <TableHead>Agency Name</TableHead>
                                <TableHead>Contact Info</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Sites Assigned</TableHead>
                                <TableHead>Incidents Occurred</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : securityAgencies.length > 0 ? (
                                securityAgencies.map((agency) => {
                                    const isNewlyAdded = newlyAddedAgencyId === agency.id;

                                    return (
                                        <Fragment key={agency.id}>
                                            <TableRow 
                                                onClick={(e) => handleRowClick(e, agency.id)} 
                                                className={cn(
                                                    "cursor-pointer hover:bg-accent hover:text-accent-foreground group",
                                                    isNewlyAdded && 'highlight-row'
                                                )}
                                            >
                                                <TableCell>
                                                    <p className="text-accent font-semibold group-hover:text-accent-foreground hover:underline">{agency.subcon_id}</p>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-medium">{agency.name}</span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Mail className="h-4 w-4 flex-shrink-0" />
                                                        <a href={`mailto:${agency.email}`} onClick={(e) => e.stopPropagation()} className="truncate hover:underline text-accent group-hover:text-accent-foreground">
                                                            {agency.email}
                                                        </a>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Phone className="h-4 w-4 flex-shrink-0" />
                                                        <a href={`tel:${agency.phone}`} onClick={(e) => e.stopPropagation()} className="truncate hover:underline text-accent group-hover:text-accent-foreground">
                                                          {agency.phone}
                                                        </a>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <p className="font-medium text-muted-foreground group-hover:text-accent-foreground">{agency.city}, {agency.region}</p>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                      <Building2 className="h-4 w-4" />
                                                      <span className="font-medium">{agency.total_sites_assigned}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                  <div className="flex items-center gap-2 font-medium">
                                                    <ShieldAlert className="h-4 w-4 text-muted-foreground group-hover:text-accent-foreground" />
                                                    {agency.total_number_of_incidents}
                                                  </div>
                                                </TableCell>
                                            </TableRow>
                                        </Fragment>
                                    )
                                })
                             ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                                        No agencies found for the current filter.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                 {totalCount > 0 && (
                    <CardFooter>
                        <div className="flex items-center justify-between w-full">
                            <div className="text-sm text-muted-foreground font-medium">
                                Showing {securityAgencies.length} of {totalCount} agencies.
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePagination(prevUrl)}
                                    disabled={!prevUrl || isLoading}
                                    className="w-20"
                                >
                                    Previous
                                </Button>
                                <span className="text-sm font-medium">Page {currentPage} of {totalPages || 1}</span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePagination(nextUrl)}
                                    disabled={!nextUrl || isLoading}
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


    