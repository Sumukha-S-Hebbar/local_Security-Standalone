
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AgencyPerformanceData } from '../page';
import { Skeleton } from '@/components/ui/skeleton';

const chartConfig = {
  incidentResolution: {
    label: 'Incident Resolution',
    color: '#1B2A41',
  },
  siteVisits: {
    label: 'Site Visit Accuracy',
    color: '#3A506B',
  },
  perimeterAccuracy: {
    label: 'Guard Check-in Accuracy',
    color: '#5C7595',
  },
  selfieAccuracy: {
    label: 'Selfie Check-in Accuracy',
    color: '#8E9BAF',
  },
} satisfies ChartConfig;


export function AgencyPerformance({ performanceData }: { performanceData: AgencyPerformanceData[] | null }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  useEffect(() => {
    if (performanceData) {
      setIsLoading(false);
    }
  }, [performanceData]);
  
  const chartData = useMemo(() => {
    if (!performanceData) return [];
    return performanceData.map(agency => ({
        name: agency.agency_name,
        agencyId: agency.agency_id,
        incidentResolution: agency.performance.incident_resolution,
        siteVisits: agency.performance.site_visit_accuracy,
        perimeterAccuracy: agency.performance.guard_checkin_accuracy,
        selfieAccuracy: agency.performance.selfie_accuracy
    }));
  }, [performanceData]);

  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const agencyId = data.activePayload[0].payload.agencyId;
      if (agencyId) {
        router.push(`/towerco/agencies/${agencyId}`);
      }
    }
  };


  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>Agencies Performance</CardTitle>
              <CardDescription>
                Comparison of key performance indicators across all agencies.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
               <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-full sm:w-[120px] font-medium hover:bg-accent hover:text-accent-foreground">
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="font-medium">All Years</SelectItem>
                     {[...new Array(5)].map((_, i) => (
                        <SelectItem key={i} value={(new Date().getFullYear() - i).toString()} className="font-medium">
                          {new Date().getFullYear() - i}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-full sm:w-[140px] font-medium hover:bg-accent hover:text-accent-foreground">
                    <SelectValue placeholder="Select Month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="font-medium">All Months</SelectItem>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i} value={(i+1).toString()} className="font-medium">
                        {new Date(0, i).toLocaleString('default', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-[300px]">
            <Skeleton className="h-full w-full" />
          </div>
        ) : (
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 20 }} onClick={handleBarClick}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={12}
                interval={0}
                tick={{ fill: '#2F2F2F' }}
              />
              <YAxis
                tickFormatter={(value) => `${value}%`}
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={12}
                tick={{ fill: '#2F2F2F' }}
              />
              <ChartTooltip
                cursor={true}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <ChartLegend content={<ChartLegendContent />} />
              
              <Bar dataKey="incidentResolution" fill="var(--color-incidentResolution)" radius={4} cursor="pointer">
                 <LabelList dataKey="incidentResolution" position="top" offset={5} fontSize={12} formatter={(value: number) => `${value}%`} />
              </Bar>
              <Bar dataKey="siteVisits" fill="var(--color-siteVisits)" radius={4} cursor="pointer">
                 <LabelList dataKey="siteVisits" position="top" offset={5} fontSize={12} formatter={(value: number) => `${value}%`} />
              </Bar>
              <Bar dataKey="perimeterAccuracy" fill="var(--color-perimeterAccuracy)" radius={4} cursor="pointer">
                 <LabelList dataKey="perimeterAccuracy" position="top" offset={5} fontSize={12} formatter={(value: number) => `${value}%`} />
              </Bar>
              <Bar dataKey="selfieAccuracy" fill="var(--color-selfieAccuracy)" radius={4} cursor="pointer">
                <LabelList dataKey="selfieAccuracy" position="top" offset={5} fontSize={12} formatter={(value: number) => `${value}%`} />
              </Bar>

            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
