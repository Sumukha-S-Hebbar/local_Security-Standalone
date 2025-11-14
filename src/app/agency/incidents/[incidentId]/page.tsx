
'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Briefcase, UserCheck, User, Calendar, FileDown, Phone, Mail, Upload, Info, AlertTriangle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useState, useEffect, useMemo } from 'react';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetchData } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import type { Organization, Incident } from '@/types';
import { getApiBaseUrl } from '@/lib/get-api-url';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';


const incidentTypes = [
    'SOS',
    'Theft',
    'Vandalism',
    'Tresspassing',
    'Suspicious Activity',
    'Safety Hazard',
    'Others',
] as const;

type IncidentDetails = {
    id: number;
    incident_id: string;
    incident_time: string;
    incident_type: Incident['incidentType'];
    incident_status: Incident['status'];
    site_details: {
        id: number;
        tb_site_id: string;
        org_name: string;
        org_site_id: string;
        site_name: string;
        lat: number;
        lng: number;
        site_address_line1: string;
        city: string;
        region: string;
    };
    subcon_details: {
        id: number;
        subcon_id: string;
        name: string;
        contact_person: string;
        email: string;
        phone: string;
    } | null;
    raised_by_guard_details: {
        id: number;
        user: string;
        email: string;
        first_name: string;
        last_name: string | null;
        phone: string;
    } | null;
    attended_by_officer_details: {
        id: number;
        user: string;
        email: string;
        first_name: string;
        last_name: string | null;
        phone: string;
    } | null;
    incident_description: string | null;
    initial_incident_image_1: string | null;
    initial_incident_image_2: string | null;
    initial_incident_image_3: string | null;
    initial_incident_image_4: string | null;
    resolution_notes: string | null;
    resolved_incident_image_1: string | null;
    resolved_incident_image_2: string | null;
    resolved_incident_image_3: string | null;
    resolved_incident_image_4: string | null;
    resolved_at: string | null;
};


export default function AgencyIncidentReportPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const incidentId = params.incidentId as string;
  
  const [incident, setIncident] = useState<IncidentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loggedInOrg, setLoggedInOrg] = useState<Organization | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const [description, setDescription] = useState('');
  const [incidentFiles, setIncidentFiles] = useState<FileList | null>(null);
  const [incidentType, setIncidentType] = useState<typeof incidentTypes[number]>();
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

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

  const initialMediaUrls = useMemo(() => {
    if (!incident) return [];
    return [
      incident.initial_incident_image_1,
      incident.initial_incident_image_2,
      incident.initial_incident_image_3,
      incident.initial_incident_image_4,
    ].filter((url): url is string => url !== null);
  }, [incident]);

  const availableSlots = 4 - initialMediaUrls.length;

  useEffect(() => {
    if (!loggedInOrg || !incidentId) return;

    const fetchIncident = async () => {
        setIsLoading(true);
        const url = `/agency/${loggedInOrg.code}/incident/${incidentId}/`;

        try {
            const response = await fetchData<{data: IncidentDetails}>(url, token || undefined);
            if (response?.data) {
                const data = response.data;
                setIncident(data);
                setDescription(data.incident_description || '');
                if (incidentTypes.includes(data.incident_type as any)) {
                    setIncidentType(data.incident_type as typeof incidentTypes[number]);
                }
            } else {
                 toast({ variant: 'destructive', title: 'Error', description: 'Incident not found.' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to load incident details.' });
        } finally {
            setIsLoading(false);
        }
    };
    
    fetchIncident();
  }, [incidentId, loggedInOrg, toast, token]);

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <Skeleton className="h-12 w-1/2" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Card>
          <CardContent className="pt-6">
            <p>Incident not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { site_details, subcon_details, raised_by_guard_details, attended_by_officer_details } = incident;

  const handleDownloadReport = () => {
    toast({
      title: 'Report Generation Started',
      description: `Generating a detailed report for incident #${incident.incident_id}.`,
    });
  };
  
  const handleSaveIncidentDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentType) {
        toast({ variant: 'destructive', title: 'Error', description: 'Incident type is required.' });
        return;
    }
    if (!description) {
        toast({ variant: 'destructive', title: 'Error', description: 'Incident description is required.' });
        return;
    }
    
    if (!loggedInOrg || !token) return;

    const formData = new FormData();
    if(incidentType) formData.append('incident_type', incidentType);
    if(description) formData.append('incident_description', description);
    
    if (incidentFiles) {
        const startIdx = initialMediaUrls.length + 1;
        for (let i = 0; i < incidentFiles.length && i < availableSlots; i++) {
            formData.append(`initial_incident_image_${startIdx + i}`, incidentFiles[i]);
        }
    }
    
    const API_URL = `${getApiBaseUrl()}/agency/${loggedInOrg.code}/incident/${incident.id}/`;

    try {
        const response = await fetch(API_URL, {
            method: 'PATCH',
            headers: { 'Authorization': `Token ${token}` },
            body: formData,
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.detail || 'Failed to update incident.');
        }

        setIncident(prev => prev ? { ...prev, ...responseData.data } : null);

        toast({
            title: "Incident Details Saved",
            description: `Initial report for incident #${incident.incident_id} has been saved and is now under review.`
        });
        
        router.refresh();


    } catch (error: any) {
         toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: error.message,
        });
    }
  };

  const getStatusIndicator = (status: Incident['status']) => {
    switch (status) {
      case 'Active':
        return (
          <div className="flex items-center gap-2 text-destructive">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
            </span>
            <span>Active</span>
          </div>
        );
      case 'Under Review':
        return (
          <div className="flex items-center gap-2 text-[#FFC107]">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FFC107]"></span>
            </span>
            <span>Under Review</span>
          </div>
        );
      case 'Resolved':
        return (
          <div className="flex items-center gap-2 text-chart-2">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-chart-2"></span>
            </span>
            <span>Resolved</span>
          </div>
        );
      default:
        return (
           <div className="flex items-center gap-2 text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-muted-foreground"></span>
            </span>
            <span>{status}</span>
          </div>
        );
    }
  };
  
  const getHintForIncident = (incident: IncidentDetails) => {
    const details = incident.incident_description?.toLowerCase() || '';
    if (details.includes('break-in')) {
      return 'security camera';
    }
    if (details.includes('fire')) {
      return 'fire alarm';
    }
    return 'incident evidence';
  };
  
  const resolvedMediaUrls = [
      incident.resolved_incident_image_1,
      incident.resolved_incident_image_2,
      incident.resolved_incident_image_3,
      incident.resolved_incident_image_4,
  ].filter((url): url is string => url !== null);

  const renderMediaGallery = (urls: string[], title: string, hint: string) => {
    if (urls.length === 0) {
      return null;
    }
    return (
      <div className="pt-6">
          <h4 className="font-semibold mb-4 text-lg">
              {title}
          </h4>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
              {urls.map((src, index) => (
                  <div key={index} className="relative aspect-video" onClick={() => setLightboxImage(src)}>
                  <Image
                      src={src}
                      alt={`${title} ${index + 1}`}
                      fill
                      unoptimized
                      className="rounded-md object-cover cursor-pointer"
                      data-ai-hint={hint}
                  />
                  </div>
              ))}
          </div>
      </div>
    );
  };

  return (
    <>
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon">
            <Link href="/agency/incidents">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to Incidents</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Incident Report</h1>
            <p className="text-muted-foreground">Detailed overview for Incident #{incident.incident_id}.</p>
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {site_details && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Site Details
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
               <div>
                  <div className="text-xl font-bold">{site_details.site_name}</div>
                  <p className="font-medium">Towerbuddy ID: {site_details.tb_site_id}</p>
                  <p className="font-medium">Site ID: {site_details.org_site_id}</p>
              </div>
              <div className='font-medium pt-2 border-t'>
                <p className='font-semibold'>Address</p>
                <p className='flex items-start gap-2'><MapPin className="h-4 w-4 mt-0.5" /><span>{site_details.site_address_line1}, {site_details.city}, {site_details.region}</span></p>
              </div>
              {site_details.lat && site_details.lng && (
                <div className='font-medium'>
                    <p className="font-semibold">Coordinates</p>
                    <p className='flex items-start gap-2'>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-globe mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                        <span>Lat: {site_details.lat.toFixed(4)}, Lng: {site_details.lng.toFixed(4)}</span>
                    </p>
                </div>
              )}
               <Button asChild variant="link" className="p-0 h-auto font-medium mt-2">
                  <Link href={`/agency/sites/${site_details.id}`}>View Full Site Report</Link>
                </Button>
            </CardContent>
          </Card>
        )}
        {subcon_details && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Agency Details
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
               <div>
                  <div className="text-xl font-bold">{subcon_details.name}</div>
                  <p className="font-medium">ID: {subcon_details.subcon_id}</p>
              </div>
              <div className="flex items-center gap-2 font-medium pt-2 border-t"><Phone className="h-4 w-4" /> <a href={`tel:${subcon_details.phone}`} className="hover:underline">{subcon_details.phone}</a></div>
              <div className="flex items-center gap-2 font-medium"><Mail className="h-4 w-4" /> <a href={`mailto:${subcon_details.email}`} className="hover:underline">{subcon_details.email}</a></div>
            </CardContent>
          </Card>
        )}
        {attended_by_officer_details && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                Patrolling Officer
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div>
                <div className="text-xl font-bold">{attended_by_officer_details.first_name} {attended_by_officer_details.last_name || ''}</div>
              </div>
              <div className="flex items-center gap-2 font-medium pt-2 border-t"><Phone className="h-4 w-4" /> <a href={`tel:${attended_by_officer_details.phone}`} className="hover:underline">{attended_by_officer_details.phone}</a></div>
              <div className="flex items-center gap-2 font-medium"><Mail className="h-4 w-4" /> <a href={`mailto:${attended_by_officer_details.email}`} className="hover:underline">{attended_by_officer_details.email}</a></div>
            </CardContent>
          </Card>
        )}
        {raised_by_guard_details && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Guard Details
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
               <div>
                  <div className="text-xl font-bold">{`${raised_by_guard_details.first_name} ${raised_by_guard_details.last_name || ''}`}</div>
                </div>
              <div className="flex items-center gap-2 font-medium pt-2 border-t"><Phone className="h-4 w-4" /> <a href={`tel:${raised_by_guard_details.phone}`} className="hover:underline">{raised_by_guard_details.phone}</a></div>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              <CardTitle className="text-2xl flex items-center gap-3">
                Incident #{incident.incident_id}
                {getStatusIndicator(incident.incident_status)}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 pt-2">
                <Calendar className="w-4 h-4" />
                {new Date(incident.incident_time).toLocaleString()}
              </CardDescription>
            </div>
            {incident.incident_type && incident.incident_type !== 'SOS' && (
              <div className="text-right">
                 <CardTitle className="text-xl font-bold">Incident Type</CardTitle>
                <Badge variant="destructive" className="mt-1">{incident.incident_type}</Badge>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6 divide-y">
            <div className="space-y-6 pt-2">
                {incident.incident_status !== 'Active' && incident.incident_description && (
                     <div>
                        <h4 className="font-semibold mb-2 text-lg">
                          Incident Summary
                        </h4>
                        <p className="text-muted-foreground">{incident.incident_description}</p>
                      </div>
                )}
                {renderMediaGallery(initialMediaUrls, "Incident Media Evidence", getHintForIncident(incident))}
            </div>

            {incident.incident_status === 'Active' && (
              <form onSubmit={handleSaveIncidentDetails} className="space-y-6 pt-6">
                <Alert variant="default" className="text-left">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Incident is Active</AlertTitle>
                  <AlertDescription>
                    This incident requires your attention. Categorize the incident, add a summary, and upload any available media. Saving these details will move the incident to "Under Review".
                  </AlertDescription>
                </Alert>
                <div className="space-y-4 pt-6">
                  <h3 className="text-xl font-semibold">Initial Incident Report</h3>
                  
                  <div>
                    <Label htmlFor="incident-type" className="text-base">Incident Type</Label>
                    <Select value={incidentType} onValueChange={(value) => setIncidentType(value as typeof incidentTypes[number])}>
                      <SelectTrigger id="incident-type" className="mt-2">
                        <SelectValue placeholder="Select an incident type" />
                      </SelectTrigger>
                      <SelectContent>
                        {incidentTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="description" className="text-base">Incident Summary</Label>
                    <Textarea
                      id="description"
                      className="mt-2"
                      placeholder="Provide a detailed summary of what happened, who was involved, and the immediate actions taken..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={5}
                    />
                  </div>
                  {availableSlots > 0 && (
                    <div>
                      <Label htmlFor="active-incident-photos" className="text-base">Upload Images (Optional, {availableSlots} slots left)</Label>
                      <Input
                        id="active-incident-photos"
                        type="file"
                        multiple
                        className="mt-2"
                        onChange={(e) => {
                            if (e.target.files && e.target.files.length > availableSlots) {
                                toast({
                                    variant: "destructive",
                                    title: "Too many files",
                                    description: `You can only upload ${availableSlots} more file(s).`
                                });
                                e.target.value = ''; // Clear the selection
                                setIncidentFiles(null);
                            } else {
                                setIncidentFiles(e.target.files);
                            }
                        }}
                        accept="image/jpeg, image/png"
                      />
                      <p className="text-sm text-muted-foreground mt-2">Please upload only images in JPG or PNG format.</p>
                    </div>
                  )}
                </div>

                <CardFooter className="px-0 pt-6 justify-end">
                  <Button type="submit" className="bg-[#00B4D8] hover:bg-[#00B4D8]/90 w-56">
                    Save and Start Review
                  </Button>
                </CardFooter>
              </form>
            )}

            {incident.incident_status === 'Under Review' && (
              <div className="pt-6">
                {incident.incident_description && (
                  <div>
                    <h4 className="font-semibold mb-2 text-lg">
                      Incident Summary
                    </h4>
                    <p className="text-muted-foreground">{incident.incident_description}</p>
                  </div>
                )}
                <Alert variant="default" className='mt-6'>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Awaiting Resolution</AlertTitle>
                  <AlertDescription>
                    This incident report has been submitted. The TOWERCO/MNO will review and resolve this incident. No further action is required from the agency at this time.
                  </AlertDescription>
                </Alert>
              </div>
            )}
            
            {incident.incident_status === 'Resolved' && (
                <div className="pt-6">
                     {incident.incident_description && (
                      <div className="pb-6">
                        <h4 className="font-semibold mb-2 text-lg">
                          Incident Summary
                        </h4>
                        <p className="text-muted-foreground">{incident.incident_description}</p>
                      </div>
                    )}
                     {renderMediaGallery(resolvedMediaUrls, "Resolution Media Evidence", "resolution document")}
                      {incident.resolution_notes && (
                        <div className="pt-6">
                            <h4 className="font-semibold mb-2 text-lg">Resolution Notes</h4>
                            <p className="text-muted-foreground">{incident.resolution_notes}</p>
                        </div>
                      )}
                </div>
            )}

          </div>
        </CardContent>
      </Card>
    </div>
    {lightboxImage && (
      <div 
        className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in-0"
        onClick={() => setLightboxImage(null)}
      >
        <button 
            className="absolute top-4 right-4 text-white hover:text-white/80 transition-opacity"
            onClick={() => setLightboxImage(null)}
        >
            <X className="h-8 w-8" />
        </button>
        <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
            <Image 
                src={lightboxImage} 
                alt="Enlarged incident evidence" 
                width={1200}
                height={800}
                unoptimized
                className="rounded-lg object-contain max-w-full max-h-[90vh]"
            />
        </div>
      </div>
    )}
    </>
  );
}

