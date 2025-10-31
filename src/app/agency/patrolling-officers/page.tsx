
'use client';

import { useState, useMemo, Fragment, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { PatrollingOfficer as PatrollingOfficerType, Site, Organization, User } from '@/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Phone, Building2, Upload, PlusCircle, Loader2, Search, Mail, Eye, FileDown, ShieldAlert, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
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
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { fetchData } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getApiBaseUrl } from '@/lib/get-api-url';

type PaginatedPatrollingOfficers = {
    count: number;
    next: string | null;
    previous: string | null;
    results: ApiPatrollingOfficer[];
};

type ApiPatrollingOfficer = {
    id: number;
    employee_id: string;
    first_name: string;
    last_name: string | null;
    email: string;
    phone: string;
    sites_assigned_count: number;
    site_details: {
        id: number;
        tb_site_id: string;
        org_site_id: string;
        site_name: string;
    } | null;
    incidents_count: number;
    assigned_sites_details?: any[];
};

const ITEMS_PER_PAGE = 10;

const uploadFormSchema = z.object({
  excelFile: z
    .any()
    .refine((files) => files?.length === 1, 'Excel file is required.')
    .refine((files) => ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'].includes(files?.[0]?.type), 'Only .xlsx or .xls files are accepted.'),
});

const addPatrollingOfficerFormSchema = z.object({
    first_name: z.string().min(1, { message: 'First name is required.' }),
    last_name: z.string().optional(),
    email: z.string().email({ message: 'Valid email is required.' }),
    employee_id: z.string().min(1, { message: 'Employee ID is required.' }),
    phone: z.string().min(1, { message: 'Phone is required.' }),
    region: z.string().min(1, { message: 'Region is required.' }),
    city: z.string().min(1, { message: 'City is required.' }),
});

type ApiRegion = {
  id: number;
  name: string;
};

type ApiCity = {
    id: number;
    name: string;
}

export default function AgencyPatrollingOfficersPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [patrollingOfficers, setPatrollingOfficers] = useState<ApiPatrollingOfficer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loggedInOrg, setLoggedInOrg] = useState<Organization | null>(null);
    const [countryId, setCountryId] = useState<number | null>(null);
    const [token, setToken] = useState<string|null>(null);

    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [newlyAddedOfficerId, setNewlyAddedOfficerId] = useState<number | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [nextUrl, setNextUrl] = useState<string | null>(null);
    const [prevUrl, setPrevUrl] = useState<string | null>(null);
    
    const [apiRegions, setApiRegions] = useState<ApiRegion[]>([]);
    const [apiCities, setApiCities] = useState<ApiCity[]>([]);
    const [isCitiesLoading, setIsCitiesLoading] = useState(false);


    useEffect(() => {
     if (typeof window !== 'undefined') {
        const userDataString = localStorage.getItem('userData');
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setLoggedInOrg(userData.user.organization);
            setCountryId(userData.user.country?.id);
            setToken(userData.token);
        }
     }
    }, []);

    const fetchPatrollingOfficers = useCallback(async (page: number = 1) => {
        if (!loggedInOrg || !token) return;
        setIsLoading(true);
        
        const params = new URLSearchParams({
            page: page.toString(),
            page_size: ITEMS_PER_PAGE.toString(),
        });
        if (searchQuery) params.append('search', searchQuery);

        const url = `/agency/${loggedInOrg.code}/patrol_officers/list/?${params.toString()}`;

        try {
            const data = await fetchData<PaginatedPatrollingOfficers>(url, token);
            setPatrollingOfficers(data?.results || []);
            setTotalCount(data?.count || 0);
            setNextUrl(data?.next || null);
            setPrevUrl(data?.previous || null);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load patrolling officers.' });
        } finally {
            setIsLoading(false);
        }
    }, [loggedInOrg, toast, searchQuery, token]);

    useEffect(() => {
        if(loggedInOrg && token) {
            fetchPatrollingOfficers(currentPage);
        }
    }, [loggedInOrg, token, fetchPatrollingOfficers, currentPage]);
    
    useEffect(() => {
        setCurrentPage(1);
        if (loggedInOrg) {
            fetchPatrollingOfficers(1);
        }
    }, [searchQuery, loggedInOrg, fetchPatrollingOfficers]);


    const handlePagination = useCallback(async (url: string | null) => {
        if (!url || !loggedInOrg || !token) return;
        setIsLoading(true);

        try {
            const data = await fetchData<PaginatedPatrollingOfficers>(url, token);
            setPatrollingOfficers(data?.results || []);
            setTotalCount(data?.count || 0);
            setNextUrl(data?.next || null);
            setPrevUrl(data?.previous || null);
            
            const pageParam = new URL(url).searchParams.get('page');
            setCurrentPage(pageParam ? parseInt(pageParam) : 1);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load page.' });
        } finally {
            setIsLoading(false);
        }
    }, [loggedInOrg, toast, token]);

    const uploadForm = useForm<z.infer<typeof uploadFormSchema>>({
        resolver: zodResolver(uploadFormSchema),
    });

    const addForm = useForm<z.infer<typeof addPatrollingOfficerFormSchema>>({
        resolver: zodResolver(addPatrollingOfficerFormSchema),
        defaultValues: { first_name: '', last_name: '', email: '', employee_id: '', phone: '', region: '', city: '' }
    });

    const watchedRegion = addForm.watch('region');

    const handleAddPatrollingOfficerClick = async () => {
        if (!countryId || !token) {
            toast({ variant: "destructive", title: "Error", description: "User country not found. Cannot fetch regions." });
            return;
        }
        
        const url = `/regions/?country=${countryId}`;
        try {
            const data = await fetchData<{ regions: ApiRegion[] }>(url, token);
            setApiRegions(data?.regions || []);
            setIsAddDialogOpen(true);
        } catch (error) {
            console.error("Failed to fetch regions:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not load regions for the selection.",
            });
        }
    };
    
    useEffect(() => {
        async function fetchCities() {
            if (!watchedRegion || !countryId || !token) {
                setApiCities([]);
                return;
            }
            
            setIsCitiesLoading(true);
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

        if (watchedRegion) {
          addForm.setValue('city', '');
          fetchCities();
        }
    }, [watchedRegion, countryId, toast, addForm, token]);

    async function onUploadSubmit(values: z.infer<typeof uploadFormSchema>) {
        setIsUploading(true);
        console.log('Uploaded file:', values.excelFile[0]);
        await new Promise((resolve) => setTimeout(resolve, 1500));
        toast({
            title: 'Upload Successful',
            description: `File "${values.excelFile[0].name}" has been uploaded. Patrolling officer profiles would be processed.`,
        });
        uploadForm.reset({ excelFile: undefined });
        setIsUploading(false);
        setIsUploadDialogOpen(false);
    }

    async function onAddSubmit(values: z.infer<typeof addPatrollingOfficerFormSchema>) {
        setIsAdding(true);
        
        if (!loggedInOrg || !token) {
            toast({ variant: 'destructive', title: 'Error', description: 'Organization information not found.'});
            setIsAdding(false);
            return;
        }

        const API_URL = `${getApiBaseUrl()}/agency/${loggedInOrg.code}/patrol_officers/add/`;
        
        const payload = {
            ...values,
            region: parseInt(values.region, 10),
            city: parseInt(values.city, 10),
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${token}`
                },
                body: JSON.stringify(payload)
            });

            const responseData = await response.json();
            
            if (!response.ok) {
                const errorDetail = typeof responseData.detail === 'object' ? JSON.stringify(responseData.detail) : responseData.detail;
                throw new Error(errorDetail || 'Failed to add patrolling officer.');
            }

            toast({
                title: 'Patrolling Officer Added',
                description: responseData.message || `Patrolling Officer "${values.first_name}" has been created successfully.`,
            });
            
            addForm.reset();
            setIsAdding(false);
            setIsAddDialogOpen(false);
            await fetchPatrollingOfficers(); // Re-fetch after adding
            if (responseData.data?.id) {
                setNewlyAddedOfficerId(responseData.data.id);
                setTimeout(() => setNewlyAddedOfficerId(null), 2000);
            }

        } catch(error: any) {
             toast({
                variant: 'destructive',
                title: 'Add Failed',
                description: error.message,
            });
             setIsAdding(false);
        }
    }

    const handleDownloadTemplate = () => {
        toast({
            title: 'Template Downloaded',
            description: 'Patrolling officer Excel template has been downloaded.',
        });
    }

    const handleRowClick = (officerId: number) => {
        router.push(`/agency/patrolling-officers/${officerId}`);
    };

    const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

    return (
      <>
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Patrolling Officer Management</h1>
                    <p className="text-muted-foreground font-medium">
                        Add, view, and manage patrolling officers.
                    </p>
                </div>
                 <div className="flex items-center gap-2">
                     <Button variant="outline" onClick={handleDownloadTemplate} className="bg-[#00B4D8] hover:bg-[#00B4D8]/90 text-white w-56">
                        <FileDown className="mr-2 h-4 w-4" />
                        Download Excel Template
                    </Button>
                     <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-[#00B4D8] hover:bg-[#00B4D8]/90 w-56">
                                <Upload className="mr-2 h-4 w-4" />
                                Upload Excel
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                            <DialogTitle>Upload Patrolling Officer Profiles</DialogTitle>
                            <DialogDescription className="font-medium">
                                Upload an Excel file to add multiple patrolling officer profiles at once.
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
                                                <FormLabel>Patrolling Officer Excel File</FormLabel>
                                                <FormControl>
                                                <Input
                                                    type="file"
                                                    accept=".xlsx, .xls"
                                                    disabled={isUploading}
                                                    onChange={(e) => field.onChange(e.target.files)}
                                                />
                                                </FormControl>
                                                <FormDescription className="font-medium">
                                                The Excel file should contain columns: name, phone, email.
                                                </FormDescription>
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
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="bg-[#00B4D8] hover:bg-[#00B4D8]/90 text-white w-56" onClick={handleAddPatrollingOfficerClick}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Add Patrolling Officer
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                            <DialogHeader>
                                <DialogTitle>Add a New Patrolling Officer</DialogTitle>
                                <DialogDescription className="font-medium">
                                    Fill in the details below to add a new patrolling officer.
                                </DialogDescription>
                            </DialogHeader>
                            <Form {...addForm}>
                                <form onSubmit={addForm.handleSubmit(onAddSubmit)} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={addForm.control}
                                            name="first_name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>First Name</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Enter first name" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={addForm.control}
                                            name="last_name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Last Name (Optional)</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Enter last name" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <FormField
                                        control={addForm.control}
                                        name="employee_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Employee ID</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Enter employee ID" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={addForm.control}
                                            name="email"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Email</FormLabel>
                                                    <FormControl>
                                                        <Input type="email" placeholder="Enter email address" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={addForm.control}
                                            name="phone"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Phone</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Enter phone number" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={addForm.control}
                                            name="region"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Region</FormLabel>
                                                    <Select onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select a region" />
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
                                            control={addForm.control}
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
                                        <Button type="submit" disabled={isAdding} className="bg-[#00B4D8] hover:bg-[#00B4D8]/90 w-56">
                                        {isAdding ? (
                                            <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Adding...
                                            </>
                                        ) : (
                                            "Add Patrolling Officer"
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
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <CardTitle>All Patrolling Officers</CardTitle>
                            <CardDescription className="font-medium">A list of all patrolling officers in your agency.</CardDescription>
                        </div>
                    </div>
                    <div className="relative pt-4">
                        <Search className="absolute left-2.5 top-6.5 h-4 w-4 text-muted-foreground" />
                        <Input
                        type="search"
                        placeholder="Search patrolling officers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-2">
                           <Skeleton className="h-12 w-full" />
                           <Skeleton className="h-12 w-full" />
                           <Skeleton className="h-12 w-full" />
                        </div>
                    ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patrolling Officer ID</TableHead>
                        <TableHead>Patrolling Officer Name</TableHead>
                        <TableHead>Contact Info</TableHead>
                        <TableHead>Sites Assigned</TableHead>
                        <TableHead>Incidents</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                        {patrollingOfficers.length > 0 ? (
                            patrollingOfficers.map((patrollingOfficer) => {
                                const officerName = `${patrollingOfficer.first_name} ${patrollingOfficer.last_name || ''}`.trim();
                                const isNewlyAdded = newlyAddedOfficerId === patrollingOfficer.id;
                                
                                return (
                                    <TableRow 
                                    key={patrollingOfficer.id}
                                    onClick={() => handleRowClick(patrollingOfficer.id)}
                                    className={cn(
                                        "cursor-pointer hover:bg-accent hover:text-accent-foreground group",
                                        isNewlyAdded && "highlight-row"
                                    )}
                                    >
                                    <TableCell>
                                        <Button asChild variant="link" className="p-0 h-auto font-medium group-hover:text-accent-foreground" onClick={(e) => e.stopPropagation()}>
                                        <Link href={`/agency/patrolling-officers/${patrollingOfficer.id}`}>{patrollingOfficer.employee_id}</Link>
                                        </Button>
                                    </TableCell>
                                    <TableCell>
                                        <p className="font-medium">{officerName}</p>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Mail className="h-4 w-4 flex-shrink-0" />
                                                <a href={`mailto:${patrollingOfficer.email}`} className="truncate hover:underline font-medium group-hover:text-accent-foreground" onClick={(e) => e.stopPropagation()}>
                                                    {patrollingOfficer.email}
                                                </a>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Phone className="h-4 w-4 flex-shrink-0" />
                                                <a href={`tel:${patrollingOfficer.phone}`} className="truncate hover:underline font-medium group-hover:text-accent-foreground" onClick={(e) => e.stopPropagation()}>
                                                    {patrollingOfficer.phone}
                                                </a>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 font-medium">
                                            <Building2 className="h-4 w-4" />
                                            {patrollingOfficer.sites_assigned_count}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-sm">
                                            <ShieldAlert className="h-4 w-4 flex-shrink-0 text-muted-foreground group-hover:text-accent-foreground" />
                                            <span className="font-medium">{patrollingOfficer.incidents_count}</span>
                                        </div>
                                    </TableCell>
                                    </TableRow>
                                )
                            })
                        ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground font-medium">
                                  No patrolling officers found.
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
                            Showing {patrollingOfficers.length} of {totalCount} officers.
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
      </>
    );
}

