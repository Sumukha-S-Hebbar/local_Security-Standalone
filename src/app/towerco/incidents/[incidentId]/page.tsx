
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
  CardFooter
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
import { fetchData } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import type { Organization } from '@/types';
import { getApiBaseUrl } from '@/lib/get-api-url';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type IncidentReport = {
    id: number;
    incident_id: string;
    incident_time: string;
    incident_type: 'SOS' | 'Suspicious Activity' | 'Theft' | 'Vandalism' | 'Trespassing' | 'Safety Hazard' | 'Other';
    incident_status: 'Active' | 'Under Review' | 'Resolved';
    site_details: {
        id: number;
        tb_site_id: string;
        org_name: string;
        org_site_id: string;
        site_name: string;
        site_status: string;
        region: string;
        city: string;
        lat: number;
        lng: number;
        site_address_line1: string;
        site_address_line2: string | null;
        site_address_line3: string | null;
        site_zip_code: string;
    };
    subcon_details: {
        id: number;
        subcon_id: string;
        name: string;
        role: string;
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
        profile_picture: string | null;
    } | null;
    attended_by_officer_details: {
      id: number;
      user: string;
      email: string;
      first_name: string;
      last_name: string | null;
      phone: string;
      profile_picture: string | null;
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
    resolved_by: number | null;
    resolution_duration: string | null;
};


export default function IncidentReportPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const incidentIdParam = params.incidentId as string;
  
  const [incident, setIncident] = useState<IncidentReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isResolving, setIsResolving] = useState(false);
  const [loggedInOrg, setLoggedInOrg] = useState<Organization | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionFiles, setResolutionFiles] = useState<FileList | null>(null);
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

  useEffect(() => {
    const id = parseInt(incidentIdParam, 10);
    if (!loggedInOrg || !token || !incidentIdParam || isNaN(id)) return;

    const fetchIncidentReport = async () => {
        setIsLoading(true);
        const url = `/orgs/${loggedInOrg.code}/incident/${id}/`;

        try {
            const response = await fetchData<{data: IncidentReport}>(url, token);
            if (response?.data) {
                setIncident(response.data);
                setResolutionNotes(response.data.resolution_notes || '');
            } else {
                throw new Error("Incident data not found in response.");
            }
        } catch (error) {
            console.error("Failed to fetch incident report:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not load incident report data.",
            });
        } finally {
            setIsLoading(false);
        }
    };
    fetchIncidentReport();
  }, [loggedInOrg, token, incidentIdParam, toast]);

  if (isLoading) {
      return (
          <div className="p-4 sm:p-6 lg:p-8 space-y-6">
              <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10" />
                  <div className="space-y-2">
                      <Skeleton className="h-8 w-48" />
                      <Skeleton className="h-4 w-64" />
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Skeleton className="h-48" />
                  <Skeleton className="h-48" />
                  <Skeleton className="h-48" />
                  <Skeleton className="h-48" />
              </div>
              <Skeleton className="h-96" />
          </div>
      )
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


  const handleDownloadReport = () => {
    toast({
      title: 'Report Generation Started',
      description: `Generating a detailed report for incident #${incident.incident_id}.`,
    });
  };
  
  const handleResolveIncident = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resolutionNotes) {
        toast({ variant: 'destructive', title: 'Error', description: 'Resolution notes are required to resolve.' });
        return;
    }
    
    if (!loggedInOrg || !incidentIdParam || !token) {
       toast({ variant: 'destructive', title: 'Error', description: 'Cannot resolve incident: missing organization, token, or incident ID.' });
       return;
    };

    setIsResolving(true);
    const formData = new FormData();
    formData.append('resolution_notes', resolutionNotes);

    if (resolutionFiles) {
        Array.from(resolutionFiles).forEach((file, index) => {
            if (index < 4) { // Max 4 files
                formData.append(`resolved_incident_image_${index + 1}`, file);
            }
        });
    }

    try {
        const API_URL = `${getApiBaseUrl()}/orgs/${loggedInOrg.code}/incident/${incidentIdParam}/`;
        const response = await fetch(API_URL, {
            method: 'PATCH',
            headers: {
                'Authorization': `Token ${token}`
            },
            body: formData,
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.detail || 'Failed to resolve incident.');
        }

        toast({
            title: "Incident Resolved",
            description: `Incident #${incident.incident_id} has been marked as resolved.`
        });
        router.push('/towerco/incidents');

    } catch(error: any) {
         toast({
            variant: 'destructive',
            title: 'Resolution Failed',
            description: error.message,
        });
    } finally {
        setIsResolving(false);
    }
  }

  const getStatusIndicator = (status: IncidentReport['incident_status']) => {
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
    }
  };
  
  const getHintForIncident = (incident: IncidentReport) => {
    const details = incident.incident_description?.toLowerCase() || '';
    if (details.includes('break-in') || details.includes('thief')) {
      return 'security camera';
    }
    if (details.includes('fire')) {
      return 'fire alarm';
    }
    return 'incident evidence';
  };

  const initialMediaUrls = [
      incident.initial_incident_image_1,
      incident.initial_incident_image_2,
      incident.initial_incident_image_3,
      incident.initial_incident_image_4,
  ].filter((url): url is string => url !== null);
  
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
                  <div key={index} className="relative aspect-video cursor-pointer group" onClick={() => setLightboxImage(src)}>
                    <Image
                        src={src}
                        alt={`${title} evidence ${index + 1}`}
                        fill
                        unoptimized
                        className="rounded-md object-cover transition-transform group-hover:scale-105"
                        data-ai-hint={hint}
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white font-bold">View Image</p>
                    </div>
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
            <Link href="/towerco/incidents">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {incident.site_details && (
          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Site Details
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div>
                <div className="text-xl font-bold">{incident.site_details.site_name}</div>
                <p className="font-medium">Towerbuddy ID: {incident.site_details.tb_site_id}</p>
                <p className="font-medium">Site ID: {incident.site_details.org_site_id}</p>
              </div>
              <div className='font-medium pt-2 border-t'>
                <p className='font-semibold'>Address</p>
                <p className='flex items-start gap-2'><MapPin className="h-4 w-4 mt-0.5" /><span>{incident.site_details.site_address_line1}, {incident.site_details.city}, {incident.site_details.region}</span></p>
              </div>
              {incident.site_details.lat && incident.site_details.lng && (
                <div className='font-medium'>
                    <p className="font-semibold">Coordinates</p>
                    <p className='flex items-start gap-2'>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-globe mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                        <span>Lat: {incident.site_details.lat.toFixed(4)}, Lng: {incident.site_details.lng.toFixed(4)}</span>
                    </p>
                </div>
              )}
              <Button asChild variant="link" className="p-0 h-auto font-medium mt-2">
                <Link href={`/towerco/sites/${incident.site_details.id}`}>View Full Site Report</Link>
              </Button>
            </CardContent>
          </Card>
        )}
        {incident.subcon_details && (
          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Agency Details
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div>
                  <div className="text-xl font-bold">{incident.subcon_details.name}</div>
                  <p className="font-medium">ID: {incident.subcon_details.subcon_id}</p>
              </div>
              <div className="flex items-center gap-2 font-medium pt-2 border-t"><Phone className="h-4 w-4" /> <a href={`tel:${incident.subcon_details.phone}`} className="hover:underline">{incident.subcon_details.phone}</a></div>
              <div className="flex items-center gap-2 font-medium"><Mail className="h-4 w-4" /> <a href={`mailto:${incident.subcon_details.email}`} className="hover:underline">{incident.subcon_details.email}</a></div>
               <Button asChild variant="link" className="p-0 h-auto font-medium mt-2">
                  <Link href={`/towerco/agencies/${incident.subcon_details.id}`}>View Full Agency Report</Link>
              </Button>
            </CardContent>
          </Card>
        )}
        
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Guard Details
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {incident.raised_by_guard_details ? (
              <>
                <div>
                  <div className="text-xl font-bold">{`${incident.raised_by_guard_details.first_name} ${incident.raised_by_guard_details.last_name || ''}`}</div>
                </div>
                <div className="flex items-center gap-2 font-medium pt-2 border-t"><Phone className="h-4 w-4" /> <a href={`tel:${incident.raised_by_guard_details.phone}`} className="hover:underline">{incident.raised_by_guard_details.phone}</a></div>
              </>
            ) : (
              <p className="text-muted-foreground font-medium text-center py-8">Not available.</p>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                Patrolling Officer
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              {incident.attended_by_officer_details ? (
                <>
                  <div>
                    <div className="text-xl font-bold">{incident.attended_by_officer_details.first_name} {incident.attended_by_officer_details.last_name || ''}</div>
                  </div>
                  <div className="flex items-center gap-2 font-medium pt-2 border-t"><Phone className="h-4 w-4" /> <a href={`tel:${incident.attended_by_officer_details.phone}`} className="hover:underline">{incident.attended_by_officer_details.phone}</a></div>
                  <div className="flex items-center gap-2 font-medium"><Mail className="h-4 w-4" /> <a href={`mailto:${incident.attended_by_officer_details.email}`} className="hover:underline">{incident.attended_by_officer_details.email}</a></div>
                </>
              ) : (
                <p className="text-muted-foreground font-medium text-center py-8">Not yet assigned.</p>
              )}
            </CardContent>
          </Card>
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
                    {incident.incident_description && (
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
                  <div className="pt-6">
                    <Alert variant="destructive">
                      <Info className="h-4 w-4" />
                      <AlertTitle>Incident Active</AlertTitle>
                      <AlertDescription>
                        This incident is active and awaiting review from the assigned security agency.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
                
                {incident.incident_status === 'Resolved' ? (
                    <div className="pt-6 space-y-6">
                        {incident.resolution_notes && (
                            <div>
                                <h4 className="font-semibold mb-2 text-lg">
                                    Resolution Notes
                                </h4>
                                <p className="text-muted-foreground">{incident.resolution_notes}</p>
                            </div>
                        )}
                        {renderMediaGallery(resolvedMediaUrls, "Resolution Media Evidence", 'report document')}
                    </div>
                ) : incident.incident_status === 'Under Review' ? (
                    <form onSubmit={handleResolveIncident} className="pt-6">
                        <div className="space-y-4">
                            <Separator />
                            <div className="pt-4 space-y-4">
                                <h3 className="text-xl font-semibold">Resolve Incident</h3>
                                <div>
                                    <Label htmlFor="resolution-notes" className="text-base">Resolution Notes</Label>
                                    <Textarea 
                                        id="resolution-notes" 
                                        className="mt-2" 
                                        placeholder="Describe the steps taken to resolve the incident, the final outcome, and any recommendations..." 
                                        value={resolutionNotes}
                                        onChange={(e) => setResolutionNotes(e.target.value)}
                                        rows={5}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="resolution-photos" className="text-base">Resolution Media Evidence (Optional, max 4)</Label>
                                    <Input 
                                        id="resolution-photos" 
                                        type="file" 
                                        multiple
                                        className="mt-2"
                                        onChange={(e) => setResolutionFiles(e.target.files)}
                                        accept="image/jpeg, image/png"
                                    />
                                </div>
                            </div>
                        </div>
                        <CardFooter className="px-0 pt-6 justify-end">
                            <Button type="submit" disabled={!resolutionNotes || isResolving} className="bg-[#00B4D8] hover:bg-[#00B4D8]/90 w-56">
                                {isResolving ? 'Resolving...' : 'Mark as Resolved'}
                            </Button>
                        </CardFooter>
                    </form>
                ) : null}
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
