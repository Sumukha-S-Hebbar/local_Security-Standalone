
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SiteStatusData, SiteListItem } from '../page';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchData } from '@/lib/api';

const COLORS = {
  assigned: 'hsl(var(--chart-2))',
  unassigned: 'hsl(var(--destructive))',
};

type PaginatedSites = {
    count: number;
    next: string | null;
    previous: string | null;
    results: SiteListItem[];
};

export function SiteStatusBreakdown({ siteStatusData }: { siteStatusData: SiteStatusData | null }) {
  const [selectedSection, setSelectedSection] = useState<'assigned' | 'unassigned' | null>('assigned');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);

  const [assignedData, setAssignedData] = useState<PaginatedSites | null>(siteStatusData?.assigned_sites || null);
  const [unassignedData, setUnassignedData] = useState<PaginatedSites | null>(siteStatusData?.unassigned_sites || null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const userDataString = localStorage.getItem('userData');
        if (userDataString) {
            const userData = JSON.parse(userDataString);
            setToken(userData.token);
        }
    }
  }, []);

  useEffect(() => {
    setAssignedData(siteStatusData?.assigned_sites || null);
    setUnassignedData(siteStatusData?.unassigned_sites || null);
    if (siteStatusData && !selectedSection) {
        setSelectedSection('assigned');
    }
  }, [siteStatusData, selectedSection]);

  const { chartData, totalSites } = useMemo(() => {
    if (!siteStatusData) {
        return { chartData: [], totalSites: 0 };
    }
    const data = [
      { name: 'Assigned', value: siteStatusData.assigned_sites_count, color: COLORS.assigned, key: 'assigned' as const },
      { name: 'Unassigned', value: siteStatusData.unassigned_sites_count, color: COLORS.unassigned, key: 'unassigned' as const },
    ];
    return {
      chartData: data,
      totalSites: siteStatusData.assigned_sites_count + siteStatusData.unassigned_sites_count,
    };
  }, [siteStatusData]);

  const handlePieClick = (data: any) => {
    const section = data.payload.key as 'assigned' | 'unassigned';
    setSelectedSection(section);
  };

  const handlePagination = async (url: string | null, section: 'assigned' | 'unassigned') => {
    if (!url || !token) return;
    setIsLoading(true);
    try {
        const paginatedDashboardData = await fetchData<{ site_status: SiteStatusData }>(url, token);

        if (paginatedDashboardData) {
            if (section === 'assigned') {
                setAssignedData(paginatedDashboardData.site_status.assigned_sites);
            } else {
                setUnassignedData(paginatedDashboardData.site_status.unassigned_sites);
            }
        }
    } catch (error) {
        console.error("Failed to fetch paginated site data:", error);
    } finally {
        setIsLoading(false);
    }
  };

  const selectedData = selectedSection === 'assigned' ? assignedData : unassignedData;
  const selectedSites = selectedData?.results || [];

  const customTooltipContent = (props: any) => {
    if (!props.active || !props.payload || props.payload.length === 0) {
      return null;
    }
    const data = props.payload[0].payload;
    const percentage = totalSites > 0 ? ((data.value / totalSites) * 100).toFixed(1) : 0;
    
    return (
      <div className="rounded-lg border bg-background p-2 text-sm shadow-sm font-medium">
        <div className="font-bold">{data.name}</div>
        <div>
          {data.value} Sites ({percentage}%)
        </div>
      </div>
    );
  };
  
  const renderLegend = (props: any) => {
    const { payload } = props;
    if (!payload) return null;

    return (
      <div className="flex justify-center gap-6 mt-4 text-sm font-medium">
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center gap-2 cursor-pointer" onClick={() => setSelectedSection(entry.payload.key)}>
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span>
              {entry.value}:{' '}
              <span className="font-bold">{entry.payload.value}</span>
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Site Status</CardTitle>
        <CardDescription className="font-medium">A real-time overview of site assignments. Click a slice to see details.</CardDescription>
      </CardHeader>
      <CardContent>
         {!siteStatusData ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Skeleton className="h-80 md:col-span-1" />
                <Skeleton className="h-80 md:col-span-2" />
            </div>
         ) : (
         <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:items-stretch">
            <div className="w-full h-80 md:h-auto md:col-span-1 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={customTooltipContent} />
                  <Legend
                    verticalAlign="bottom"
                    content={renderLegend}
                  />
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={120}
                    dataKey="value"
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                    onClick={handlePieClick}
                    className="cursor-pointer"
                    style={{ outline: 'none' }}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} name={entry.name} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="md:col-span-2 border-l border-border pl-4 md:pl-8 flex flex-col">
              {selectedSection ? (
                <>
                  <div className="flex items-center justify-between gap-2 mb-4">
                     <div className='flex items-center gap-2'>
                        <Building2 className="h-5 w-5" />
                        <h3 className="text-lg font-semibold">{selectedSection === 'assigned' ? 'Assigned Sites' : 'Unassigned Sites'} ({selectedData?.count || 0})</h3>
                     </div>
                     {selectedSection === 'unassigned' && (
                        <Button
                            size="sm"
                            className="bg-[#00B4D8] hover:bg-[#00a2c2] text-white w-56"
                            onClick={() => router.push(`/towerco/sites?tab=unassigned`)}
                        >
                          Assign Agency
                        </Button>
                     )}
                  </div>
                  {isLoading ? (
                     <div className="flex justify-center items-center h-full"><Loader2 className="h-6 w-6 animate-spin"/></div>
                  ) : (
                  <div className="flex flex-col flex-grow">
                    <ScrollArea className="h-80 flex-grow pr-4">
                      {selectedSection === 'assigned' ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-foreground px-2 w-[20%]">Towerbuddy ID</TableHead>
                              <TableHead className="text-foreground px-2 w-[20%]">Site ID</TableHead>
                              <TableHead className="text-foreground px-2 w-[20%]">Site Name</TableHead>
                              <TableHead className="text-foreground px-2 w-[20%]">Location</TableHead>
                              <TableHead className="text-foreground px-2 w-[20%]">Agency</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedSites.map(site => (
                              <TableRow 
                                key={site.id} 
                                onClick={() => router.push(`/towerco/sites/${site.id}`)}
                                className="group cursor-pointer hover:bg-[#00B4D8] hover:text-accent-foreground"
                              >
                                <TableCell className="group-hover:text-accent-foreground px-2 font-medium">
                                  <Button asChild variant="link" className="p-0 h-auto font-medium group-hover:text-accent-foreground" onClick={(e) => e.stopPropagation()}>
                                        <Link href={`/towerco/sites/${site.id}`}>{site.tb_site_id}</Link>
                                  </Button>
                                </TableCell>
                                <TableCell className="group-hover:text-accent-foreground px-2 font-medium">{site.org_site_id}</TableCell>
                                <TableCell className="group-hover:text-accent-foreground px-2 font-medium">
                                  {site.site_name}
                                </TableCell>
                                <TableCell className="group-hover:text-accent-foreground px-2 font-medium">
                                    {site.city}, {site.region}
                                </TableCell>
                                <TableCell className="font-medium group-hover:text-accent-foreground px-2">
                                    {site.agency_name || 'N/A'}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                         <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-foreground px-2 w-[25%]">Towerbuddy ID</TableHead>
                              <TableHead className="text-foreground px-2 w-[25%]">Site ID</TableHead>
                              <TableHead className="text-foreground px-2 w-[25%]">Site Name</TableHead>
                              <TableHead className="text-foreground px-2 w-[25%]">Location</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {selectedSites.map((site) => (
                              <TableRow 
                                key={site.id} 
                                className="group hover:bg-[#00B4D8] hover:text-accent-foreground"
                                onClick={() => router.push(`/towerco/sites/${site.id}`)}
                              >
                                <TableCell className="group-hover:text-accent-foreground px-2 font-medium">
                                  {site.tb_site_id}
                                </TableCell>
                                 <TableCell className="group-hover:text-accent-foreground px-2 font-medium">{site.org_site_id}</TableCell>
                                <TableCell className="group-hover:text-accent-foreground px-2 font-medium">
                                  {site.site_name}
                                </TableCell>
                                <TableCell className="group-hover:text-accent-foreground px-2 font-medium">
                                  {site.city}, {site.region}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </ScrollArea>
                    <div className="flex items-center justify-between w-full pt-4">
                        <div className="text-sm text-muted-foreground font-medium">
                            Showing {selectedSites.length} of {selectedData?.count || 0} sites.
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => selectedSection && handlePagination(selectedData?.previous || null, selectedSection)}
                                disabled={!selectedData?.previous || isLoading}
                                className="w-20"
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => selectedSection && handlePagination(selectedData?.next || null, selectedSection)}
                                disabled={!selectedData?.next || isLoading}
                                className="w-20"
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                  </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                    <Building2 className="h-12 w-12 mb-4" />
                    <p className="font-semibold">Select a section of the chart</p>
                    <p className="text-sm font-medium">Click on a pie slice to view the list of sites.</p>
                </div>
              )}
            </div>
         </div>
         )}
      </CardContent>
    </Card>
  );
}
