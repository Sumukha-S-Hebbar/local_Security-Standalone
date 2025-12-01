
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldCheck, UserCheck } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { GuardPerformanceData } from '../page';

const getPerformanceColor = (value: number) => {
  if (value >= 95) {
    return 'hsl(var(--chart-2))'; // Green
  } else if (value >= 65) {
    return 'hsl(var(--chart-3))'; // Yellow
  } else {
    return 'hsl(var(--destructive))'; // Orange
  }
};

export function GuardPerformanceBreakdown({ performance }: { performance: GuardPerformanceData }) {
  const roundedPerimeterAccuracy = Math.round(performance.guard_checkin_accuracy);
  const roundedSelfieAccuracy = Math.round(performance.selfie_checkin_accuracy);

  const perimeterAccuracyData = [
    { name: 'Accuracy', value: roundedPerimeterAccuracy },
    { name: 'Remaining', value: 100 - roundedPerimeterAccuracy },
  ];
  
  const selfieAccuracyData = [
    { name: 'Accuracy', value: roundedSelfieAccuracy },
    { name: 'Remaining', value: 100 - roundedSelfieAccuracy },
  ];

  const perimeterColor = getPerformanceColor(roundedPerimeterAccuracy);
  const selfieColor = getPerformanceColor(roundedSelfieAccuracy);
  
  const COLORS_CHECKIN = [perimeterColor, 'hsl(var(--muted))'];
  const COLORS_SELFIE = [selfieColor, 'hsl(var(--muted))'];


  return (
    <Card>
      <CardHeader>
        <CardTitle>Guards Performance</CardTitle>
        <CardDescription>
        Average performance metrics across all assigned guards.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center justify-items-center">
            <div className="flex flex-col items-center gap-2">
                <div className="w-32 h-32 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={perimeterAccuracyData}
                                cx="50%"
                                cy="50%"
                                innerRadius="70%"
                                outerRadius="85%"
                                paddingAngle={0}
                                dataKey="value"
                                stroke="none"
                            >
                                {perimeterAccuracyData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS_CHECKIN[index % COLORS_CHECKIN.length]} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-3xl font-bold" style={{ color: perimeterColor }}>
                            {roundedPerimeterAccuracy}%
                        </span>
                    </div>
                </div>
                <p className="flex items-center gap-2 text-center font-medium">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  Guard Check-in Accuracy
                </p>
            </div>
            
            <div className="flex flex-col items-center gap-2">
                <div className="w-32 h-32 relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={selfieAccuracyData}
                                cx="50%"
                                cy="50%"
                                innerRadius="70%"
                                outerRadius="85%"
                                paddingAngle={0}
                                dataKey="value"
                                stroke="none"
                            >
                                {selfieAccuracyData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS_SELFIE[index % COLORS_SELFIE.length]} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                         <span className="text-3xl font-bold" style={{ color: selfieColor }}>
                            {roundedSelfieAccuracy}%
                         </span>
                    </div>
                </div>
                 <p className="flex items-center gap-2 text-center font-medium">
                  <UserCheck className="w-4 h-4 text-primary" />
                  Selfie Check-in Accuracy
                </p>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
