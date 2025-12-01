
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Map, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { PatrollingOfficerPerformanceData } from '../page';

const getPerformanceColor = (value: number) => {
  if (value >= 95) {
    return 'hsl(var(--chart-2))'; // Green
  } else if (value >= 65) {
    return 'hsl(var(--chart-3))'; // Yellow
  } else {
    return 'hsl(var(--destructive))'; // Orange
  }
};

export function PatrollingOfficerPerformance({ 
    performance
}: { 
    performance: PatrollingOfficerPerformanceData
}) {
  const roundedSiteVisitAccuracy = Math.round(performance.site_visit_accuracy);
  const siteVisitColor = getPerformanceColor(roundedSiteVisitAccuracy);

  const siteVisitAccuracyData = [
    { name: 'Accuracy', value: roundedSiteVisitAccuracy },
    { name: 'Remaining', value: 100 - roundedSiteVisitAccuracy },
  ];
  const COLORS_SITE_VISIT = [siteVisitColor, 'hsl(var(--muted))'];

  return (
    <Card>
      <CardHeader>
          <CardTitle>Patrolling Officers Performance</CardTitle>
          <CardDescription>
            Average performance metrics across all patrolling officers.
          </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center justify-items-center">
        <div className="flex flex-col items-center gap-2">
            <div className="w-32 h-32 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={siteVisitAccuracyData}
                            cx="50%"
                            cy="50%"
                            innerRadius="70%"
                            outerRadius="85%"
                            paddingAngle={0}
                            dataKey="value"
                            stroke="none"
                        >
                            {siteVisitAccuracyData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS_SITE_VISIT[index % COLORS_SITE_VISIT.length]} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-3xl font-bold" style={{ color: siteVisitColor }}>
                        {roundedSiteVisitAccuracy}%
                    </span>
                </div>
            </div>
            <p className="flex items-center gap-2 text-center font-medium">
              <Map className="w-4 h-4 text-primary" />
              Site Visit Accuracy
            </p>
        </div>
        
        <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-4 text-foreground">
                <Clock className="w-12 h-12 text-primary" />
                <div>
                    <span className="text-4xl font-bold">{performance.average_response_time !== 'N/A' ? performance.average_response_time.split(' ')[0] : 'N/A'}</span>
                    <span className="text-lg text-muted-foreground ml-1">{performance.average_response_time !== 'N/A' ? performance.average_response_time.split(' ')[1] : ''}</span>
                </div>
            </div>
            <p className="text-center font-medium mt-2">
                Average Response Time
            </p>
        </div>
      </CardContent>
    </Card>
  );
}
