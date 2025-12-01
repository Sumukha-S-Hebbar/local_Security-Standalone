
'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Site, Guard, PatrollingOfficer, Organization, User } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { FileDown, Upload, Loader2, Search, PlusCircle, ShieldAlert, Phone, Mail, Camera } from 'lucide-react';
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
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getApiBaseUrl } from '@/lib/get-api-url';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


type PaginatedGuardsResponse = {
    count: number;
    next: string | null;
    previous: string | null;
    results: Guard[];
};

const ITEMS_PER_PAGE = 10;

const uploadFormSchema = z.object({
  excelFile: z
    .any()
    .refine((files) => files?.length === 1, 'Excel file is required.')
    .refine((files) => ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'].includes(files?.[0]?.type), 'Only .xlsx or .xls files are accepted.'),
});

const addGuardFormSchema = z.object({
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

async function fetchData<T>(url: string, token: string | undefined, options?: RequestInit): Promise<T | null> {
    try {
        const baseUrl = getApiBaseUrl();
        const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
        
        const response = await fetch(fullUrl, {
            ...options,
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json',
                ...options?.headers,
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API Error: ${response.status} ${response.statusText}`, errorText);
            throw new Error(errorText || `Request failed with status ${response.status}`);
        }

        if (response.status === 204) {
            return null;
        }

        return await response.json() as T;
    } catch (error) {
        console.error("Network or parsing error:", error);
        throw error;
    }
}


export default function AgencyGuardsPage() {
  const { toast } = useToast();
  const router = useRouter();
  
  const [checkedInGuards, setCheckedInGuards] = useState<Guard[]>([]);
  const [checkedOutGuards, setCheckedOutGuards] = useState<Guard[]>([]);
  const [unassignedGuards, setUnassignedGuards] = useState<Guard[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [patrollingOfficers, setPatrollingOfficers] = useState<PatrollingOfficer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loggedInOrg, setLoggedInOrg] = useState<Organization | null>(null);
  const [countryId, setCountryId] = useState<number | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [newlyAddedGuardId, setNewlyAddedGuardId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('checked-in');
  const [isRequestingSelfie, setIsRequestingSelfie] = useState(false);

  // Pagination states
  const [checkedInCurrentPage, setCheckedInCurrentPage] = useState(1);
  const [checkedInCount, setCheckedInCount] = useState(0);
  const [checkedOutCurrentPage, setCheckedOutCurrentPage] = useState(1);
  const [checkedOutCount, setCheckedOutCount] = useState(0);
  const [unassignedCurrentPage, setUnassignedCurrentPage] = useState(1);
  const [unassignedCount, setUnassignedCount] = useState(0);
  
  const [apiRegions, setApiRegions] = useState<ApiRegion[]>([]);
  const [apiCities, setApiCities] = useState<ApiCity[]>([]);
  const [isCitiesLoading, setIsCitiesLoading] = useState(false);


  useEffect(() => {
    if (typeof window !== 'undefined') {
        const userDataString = localStorage.getItem('userData');
        if(userDataString) {
            const userData = JSON.parse(userDataString);
            setLoggedInOrg(userData.user.organization);
            setCountryId(userData.user.country?.id);
            setToken(userData.token);
        }
    }
  }, []);
  
  const fetchGuards = useCallback(async (
    status: 'checked-in' | 'checked-out' | 'unassigned',
    page: number
  ) => {
    if (!loggedInOrg) return;
    setIsLoading(true);

    const params = new URLSearchParams({
        page: page.toString(),
        page_size: ITEMS_PER_PAGE.toString()
    });

    if (searchQuery) params.append('search', searchQuery);

    const checkInStatusMap = {
      'checked-in': 'Checked In',
      'checked-out': 'Checked Out',
      'unassigned': 'Unassigned',
    }

    params.append('check_in_status', checkInStatusMap[status]);

    const url = `/agency/${loggedInOrg.code}/guards/list/?${params.toString()}`;

    try {
        const data = await fetchData<PaginatedGuardsResponse>(url, token || undefined);
        const results = data?.results || [];
        const count = data?.count || 0;

        if (status === 'checked-in') {
            setCheckedInGuards(results);
            setCheckedInCount(count);
        } else if (status === 'checked-out') {
            setCheckedOutGuards(results);
            setCheckedOutCount(count);
        } else {
            setUnassignedGuards(results);
            setUnassignedCount(count);
        }
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Failed to load guards.',
        });
    } finally {
        setIsLoading(false);
    }
  }, [loggedInOrg, token, searchQuery, toast]);
  
  
  useEffect(() => {
    if (loggedInOrg) {
        const page = activeTab === 'checked-in' 
          ? checkedInCurrentPage 
          : activeTab === 'checked-out' 
          ? checkedOutCurrentPage 
          : unassignedCurrentPage;
        fetchGuards(activeTab as 'checked-in' | 'checked-out' | 'unassigned', page);
    }
  }, [loggedInOrg, activeTab, checkedInCurrentPage, checkedOutCurrentPage, unassignedCurrentPage, fetchGuards]);
  
  useEffect(() => {
    setCheckedInCurrentPage(1);
    setCheckedOutCurrentPage(1);
    setUnassignedCurrentPage(1);
  }, [searchQuery, activeTab]);

  const handlePagination = (direction: 'next' | 'prev') => {
    if (activeTab === 'checked-in') {
        setCheckedInCurrentPage(prev => direction === 'next' ? prev + 1 : Math.max(1, prev - 1));
    } else if (activeTab === 'checked-out') {
        setCheckedOutCurrentPage(prev => direction === 'next' ? prev + 1 : Math.max(1, prev - 1));
    } else if (activeTab === 'unassigned') {
        setUnassignedCurrentPage(prev => direction === 'next' ? prev + 1 : Math.max(1, prev - 1));
    }
  };

  const totalCheckedInPages = Math.ceil(checkedInCount / ITEMS_PER_PAGE);
  const totalCheckedOutPages = Math.ceil(checkedOutCount / ITEMS_PER_PAGE);
  const totalUnassignedPages = Math.ceil(unassignedCount / ITEMS_PER_PAGE);
  

  const uploadForm = useForm<z.infer<typeof uploadFormSchema>>({
    resolver: zodResolver(uploadFormSchema),
  });

  const addGuardForm = useForm<z.infer<typeof addGuardFormSchema>>({
    resolver: zodResolver(addGuardFormSchema),
    defaultValues: { first_name: '', last_name: '', email: '', employee_id: '', phone: '', region: '', city: '' }
  });
  
  const watchedRegion = addGuardForm.watch('region');

  const handleAddGuardClick = async () => {
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
        addGuardForm.setValue('city', '');
        fetchCities();
    }
  }, [watchedRegion, countryId, toast, addGuardForm, token]);
  

  async function onUploadSubmit(values: z.infer<typeof uploadFormSchema>) {
    setIsUploading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    toast({
      title: 'Upload Successful',
      description: `File "${values.excelFile[0].name}" has been uploaded. Guard profiles would be processed.`,
    });
    uploadForm.reset({ excelFile: undefined });
    setIsUploading(false);
    setIsUploadDialogOpen(false);
  }

  async function onAddGuardSubmit(values: z.infer<typeof addGuardFormSchema>) {
    setIsAdding(true);
    if (!loggedInOrg || !token) {
      toast({ variant: 'destructive', title: 'Error', description: 'Organization information not found.' });
      setIsAdding(false);
      return;
    }
    
    const API_URL = `${getApiBaseUrl()}/agency/${loggedInOrg.code}/guards/add/`;
    
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
            throw new Error(errorDetail || 'Failed to add guard.');
        }

        toast({
            title: 'Guard Added',
            description: responseData.message,
        });
        
        addGuardForm.reset();
        setIsAdding(false);
        setIsAddDialogOpen(false);
        await fetchGuards(activeTab as 'checked-in' | 'checked-out' | 'unassigned', 1);

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
        description: 'Guard profile Excel template has been downloaded.',
    });
  }

  const handleRequestRandomSelfie = async () => {
    if (!loggedInOrg || !token) {
      toast({ variant: 'destructive', title: 'Error', description: 'Organization info not available.' });
      return;
    }
    setIsRequestingSelfie(true);
    const API_URL = `${getApiBaseUrl()}/agency/${loggedInOrg.code}/random_selfie/send_to_all/`;

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.detail || 'Failed to send selfie requests.');
      }

      if (responseData.request_ids && responseData.request_ids.length > 0) {
        toast({
          title: 'Success',
          description: responseData.message,
        });
      } else {
        toast({
          variant: 'default',
          title: 'Info',
          description: responseData.message || "No guards available for selfie requests.",
        });
      }

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Request Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsRequestingSelfie(false);
    }
  };


  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Security Guard Management</h1>
              <p className="text-muted-foreground font-medium">Add, view, and manage guard profiles and their assignments.</p>
            </div>
             <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button disabled variant="outline" className="bg-[#00B4D8] hover:bg-[#00B4D8]/90 text-white w-56">
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
                        <DialogTitle>Upload Guard Profiles</DialogTitle>
                        <DialogDescription className="font-medium">
                            Upload an Excel file to add multiple security guard profiles at once.
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
                                            <FormLabel>Guard Excel File</FormLabel>
                                            <FormControl>
                                            <Input
                                                id="excelFile-guard-input"
                                                type="file"
                                                accept=".xlsx, .xls"
                                                disabled={isUploading}
                                                onChange={(e) => field.onChange(e.target.files)}
                                            />
                                            </FormControl>
                                            <FormDescription className="font-medium">
                                            The Excel file should contain columns: name, phone, site.
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
                        <Button variant="outline" className="bg-[#00B4D8] hover:bg-[#00B4D8]/90 text-white w-56" onClick={handleAddGuardClick}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Guard
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Add a New Guard</DialogTitle>
                            <DialogDescription className="font-medium">
                                Fill in the details below to add a new security guard.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...addGuardForm}>
                            <form onSubmit={addGuardForm.handleSubmit(onAddGuardSubmit)} className="space-y-4">
                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={addGuardForm.control}
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
                                        control={addGuardForm.control}
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
                                    control={addGuardForm.control}
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
                                        control={addGuardForm.control}
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
                                        control={addGuardForm.control}
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
                                        control={addGuardForm.control}
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
                                        control={addGuardForm.control}
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
                                        Adding Guard...
                                        </>
                                    ) : (
                                        "Add Guard"
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
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Guard Status</CardTitle>
                <CardDescription className="font-medium">Filter and view guards based on their check-in status.</CardDescription>
              </div>
               {activeTab === 'checked-in' && (
                 <Button className="bg-destructive hover:bg-destructive/90" onClick={handleRequestRandomSelfie} disabled={isRequestingSelfie}>
                    {isRequestingSelfie ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                    {isRequestingSelfie ? 'Requesting...' : 'Request Random Selfie Check-in'}
                 </Button>
               )}
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-4">
              <div className="relative flex-1 md:grow-0">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                  type="search"
                  placeholder="Search guards..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
                  />
              </div>
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
             <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="checked-in">Checked In</TabsTrigger>
                    <TabsTrigger value="checked-out">Checked Out</TabsTrigger>
                    <TabsTrigger value="unassigned">Unassigned</TabsTrigger>
                </TabsList>
                <TabsContent value="checked-in" className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Guard ID</TableHead>
                        <TableHead>Guard Name</TableHead>
                        <TableHead>Contact Info</TableHead>
                        <TableHead>Site Name</TableHead>
                        <TableHead>Patrolling Officer</TableHead>
                        <TableHead>Incidents</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {checkedInGuards.length > 0 ? (
                        checkedInGuards.map((guard) => {
                          const guardName = `${guard.first_name} ${guard.last_name || ''}`.trim();
                          const poName = guard.patrolling_officer ? `${guard.patrolling_officer.first_name} ${guard.patrolling_officer.last_name || ''}`.trim() : 'Unassigned';
                          
                          return (
                            <TableRow 
                              key={guard.id}
                              onClick={() => router.push(`/agency/guards/${guard.id}`)}
                              className="cursor-pointer hover:bg-accent hover:text-accent-foreground group"
                            >
                              <TableCell>
                                <Button asChild variant="link" className="p-0 h-auto font-medium group-hover:text-accent-foreground" onClick={(e) => e.stopPropagation()}>
                                  <Link href={`/agency/guards/${guard.id}`}>{guard.employee_id}</Link>
                                </Button>
                              </TableCell>
                              <TableCell>
                                  <p className="font-medium">{guardName}</p>
                              </TableCell>
                              <TableCell>
                                 <div className="space-y-1">
                                      {guard.email && (
                                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                              <Mail className="h-4 w-4 flex-shrink-0" />
                                              <a href={`mailto:${guard.email}`} className="hover:underline font-medium group-hover:text-accent-foreground" onClick={(e) => e.stopPropagation()}>{guard.email}</a>
                                          </div>
                                      )}
                                      {guard.phone && (
                                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                              <Phone className="h-4 w-4 flex-shrink-0" />
                                              <a href={`tel:${guard.phone}`} className="hover:underline font-medium group-hover:text-accent-foreground" onClick={(e) => e.stopPropagation()}>{guard.phone}</a>
                                          </div>
                                      )}
                                  </div>
                              </TableCell>
                              <TableCell>
                                {guard.site ? (
                                  <span className="font-medium">{guard.site.site_name}</span>
                                 ) : (
                                  <span className="font-medium text-muted-foreground">Unassigned</span>
                                 )}
                              </TableCell>
                              <TableCell>
                                  {guard.patrolling_officer ? (
                                     <span className="font-medium">{poName}</span>
                                  ) : (
                                      <span className="text-muted-foreground group-hover:text-accent-foreground font-medium">Unassigned</span>
                                  )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <ShieldAlert className="h-4 w-4 text-muted-foreground group-hover:text-accent-foreground" />
                                  <span className="font-medium">{guard.incident_count}</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-10 font-medium">
                            No checked in guards found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
                 <TabsContent value="checked-out" className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Guard ID</TableHead>
                        <TableHead>Guard Name</TableHead>
                        <TableHead>Contact Info</TableHead>
                        <TableHead>Site Name</TableHead>
                        <TableHead>Patrolling Officer</TableHead>
                        <TableHead>Incidents</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {checkedOutGuards.length > 0 ? (
                        checkedOutGuards.map((guard) => {
                          const guardName = `${guard.first_name} ${guard.last_name || ''}`.trim();
                          const poName = guard.patrolling_officer ? `${guard.patrolling_officer.first_name} ${guard.patrolling_officer.last_name || ''}`.trim() : 'Unassigned';
                          
                          return (
                            <TableRow 
                              key={guard.id}
                              onClick={() => router.push(`/agency/guards/${guard.id}`)}
                              className="cursor-pointer hover:bg-accent hover:text-accent-foreground group"
                            >
                              <TableCell>
                                <Button asChild variant="link" className="p-0 h-auto font-medium group-hover:text-accent-foreground" onClick={(e) => e.stopPropagation()}>
                                  <Link href={`/agency/guards/${guard.id}`}>{guard.employee_id}</Link>
                                </Button>
                              </TableCell>
                              <TableCell>
                                  <p className="font-medium">{guardName}</p>
                              </TableCell>
                              <TableCell>
                                 <div className="space-y-1">
                                      {guard.email && (
                                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                              <Mail className="h-4 w-4 flex-shrink-0" />
                                              <a href={`mailto:${guard.email}`} className="hover:underline font-medium group-hover:text-accent-foreground" onClick={(e) => e.stopPropagation()}>{guard.email}</a>
                                          </div>
                                      )}
                                      {guard.phone && (
                                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                              <Phone className="h-4 w-4 flex-shrink-0" />
                                              <a href={`tel:${guard.phone}`} className="hover:underline font-medium group-hover:text-accent-foreground" onClick={(e) => e.stopPropagation()}>{guard.phone}</a>
                                          </div>
                                      )}
                                  </div>
                              </TableCell>
                              <TableCell>
                                {guard.site ? (
                                  <span className="font-medium">{guard.site.site_name}</span>
                                 ) : (
                                  <span className="font-medium text-muted-foreground">Unassigned</span>
                                 )}
                              </TableCell>
                              <TableCell>
                                  {guard.patrolling_officer ? (
                                     <span className="font-medium">{poName}</span>
                                  ) : (
                                      <span className="text-muted-foreground group-hover:text-accent-foreground font-medium">Unassigned</span>
                                  )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <ShieldAlert className="h-4 w-4 text-muted-foreground group-hover:text-accent-foreground" />
                                  <span className="font-medium">{guard.incident_count}</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-10 font-medium">
                             No checked out guards found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
                <TabsContent value="unassigned" className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Guard ID</TableHead>
                        <TableHead>Guard Name</TableHead>
                        <TableHead>Contact Info</TableHead>
                        <TableHead>Site Name</TableHead>
                        <TableHead>Patrolling Officer</TableHead>
                        <TableHead>Incidents</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unassignedGuards.length > 0 ? (
                        unassignedGuards.map((guard) => {
                          const guardName = `${guard.first_name} ${guard.last_name || ''}`.trim();
                          
                          return (
                            <TableRow 
                              key={guard.id}
                              className="hover:bg-accent hover:text-accent-foreground group"
                            >
                              <TableCell>
                                <span className="font-medium">{guard.employee_id}</span>
                              </TableCell>
                              <TableCell>
                                  <p className="font-medium">{guardName}</p>
                              </TableCell>
                              <TableCell>
                                 <div className="space-y-1">
                                      {guard.email && (
                                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                              <Mail className="h-4 w-4 flex-shrink-0" />
                                              <a href={`mailto:${guard.email}`} className="hover:underline font-medium group-hover:text-accent-foreground" onClick={(e) => e.stopPropagation()}>{guard.email}</a>
                                          </div>
                                      )}
                                      {guard.phone && (
                                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                              <Phone className="h-4 w-4 flex-shrink-0" />
                                              <a href={`tel:${guard.phone}`} className="hover:underline font-medium group-hover:text-accent-foreground" onClick={(e) => e.stopPropagation()}>{guard.phone}</a>
                                          </div>
                                      )}
                                  </div>
                              </TableCell>
                              <TableCell>
                                  <span className="font-medium text-muted-foreground">Unassigned</span>
                              </TableCell>
                              <TableCell>
                                  <span className="font-medium text-muted-foreground">Unassigned</span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <ShieldAlert className="h-4 w-4 text-muted-foreground group-hover:text-accent-foreground" />
                                  <span className="font-medium">{guard.incident_count}</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-10 font-medium">
                            No unassigned guards found.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TabsContent>
            </Tabs>
            )}
          </CardContent>
          {(activeTab === 'checked-in' && checkedInCount > 0) || 
           (activeTab === 'checked-out' && checkedOutCount > 0) ||
           (activeTab === 'unassigned' && unassignedCount > 0) ? (
            <CardFooter>
                <div className="flex items-center justify-between w-full">
                    <div className="text-sm text-muted-foreground font-medium">
                        {activeTab === 'checked-in' && `Showing ${checkedInGuards.length} of ${checkedInCount} guards.`}
                        {activeTab === 'checked-out' && `Showing ${checkedOutGuards.length} of ${checkedOutCount} guards.`}
                        {activeTab === 'unassigned' && `Showing ${unassignedGuards.length} of ${unassignedCount} guards.`}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePagination('prev')}
                            disabled={isLoading || 
                                (activeTab === 'checked-in' && checkedInCurrentPage === 1) ||
                                (activeTab === 'checked-out' && checkedOutCurrentPage === 1) ||
                                (activeTab === 'unassigned' && unassignedCurrentPage === 1)
                            }
                            className="w-20"
                        >
                            Previous
                        </Button>
                        <span className="text-sm font-medium">
                            Page {
                                activeTab === 'checked-in' ? checkedInCurrentPage :
                                activeTab === 'checked-out' ? checkedOutCurrentPage :
                                unassignedCurrentPage
                            } of {
                                activeTab === 'checked-in' ? totalCheckedInPages :
                                activeTab === 'checked-out' ? totalCheckedOutPages :
                                totalUnassignedPages
                            }
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePagination('next')}
                            disabled={isLoading || 
                                (activeTab === 'checked-in' && checkedInCurrentPage >= totalCheckedInPages) ||
                                (activeTab === 'checked-out' && checkedOutCurrentPage >= totalCheckedOutPages) ||
                                (activeTab === 'unassigned' && unassignedCurrentPage >= totalUnassignedPages)
                            }
                            className="w-20"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </CardFooter>
          ) : null}
        </Card>
      </div>
    </>
  );
}
