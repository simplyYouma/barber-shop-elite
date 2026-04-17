import React, { useMemo, useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend 
} from 'recharts';
import { 
  format, parseISO, startOfDay, startOfMonth, 
  startOfYear, eachHourOfInterval, eachDayOfInterval, 
  eachMonthOfInterval, eachYearOfInterval, isSameHour, 
  isSameDay, isSameMonth, isSameYear, addHours, addDays, 
  addMonths, differenceInDays
} from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ArchiveItem } from '@/types';

interface PrestationsChartProps {
  data: ArchiveItem[];
  period: string;
  startDate?: string;
  endDate?: string;
}

export const PrestationsChart: React.FC<PrestationsChartProps> = ({ data, period, startDate, endDate }) => {
  const [activeService, setActiveService] = useState<string | null>(null);

  const chartData = useMemo(() => {
    if (data.length === 0) return [];

    const now = new Date();
    let start: Date;
    let end: Date;
    let interval: 'hour' | 'day' | 'month' | 'year' = 'month';

    // Définir l'intervalle et la granularité
    switch (period) {
      case 'today':
        start = startOfDay(now);
        end = addDays(start, 1);
        interval = 'hour';
        break;
      case 'month':
        start = startOfMonth(now);
        end = addMonths(start, 1);
        interval = 'day';
        break;
      case 'semester':
        start = addMonths(startOfMonth(now), -6);
        end = addMonths(startOfMonth(now), 1);
        interval = 'month';
        break;
      case 'year':
        start = startOfYear(now);
        end = addMonths(startOfYear(now), 12);
        interval = 'month';
        break;
      case 'custom':
        if (startDate && endDate) {
           start = startOfDay(parseISO(startDate));
           end = addDays(startOfDay(parseISO(endDate)), 1);
           const diffDays = differenceInDays(end, start);
           if (diffDays <= 1) interval = 'hour';
           else if (diffDays <= 32) interval = 'day';
           else if (diffDays <= 366) interval = 'month';
           else interval = 'year';
        } else {
           start = startOfMonth(now);
           end = addMonths(start, 1);
           interval = 'day';
        }
        break;
      default:
        start = startOfMonth(now);
        end = addMonths(start, 1);
        interval = 'day';
    }

    // Générer les points de l'axe X
    let timePoints: Date[] = [];
    try {
        if (interval === 'hour') timePoints = eachHourOfInterval({ start, end: addHours(end, -1) });
        else if (interval === 'day') timePoints = eachDayOfInterval({ start, end: addDays(end, -1) });
        else if (interval === 'month') timePoints = eachMonthOfInterval({ start, end: addMonths(end, -1) });
        else timePoints = eachYearOfInterval({ start, end });
    } catch (e) {
        return [];
    }

    // Récupérer tous les services uniques
    const services = Array.from(new Set(data.map(d => d.service_name)));

    // Remplir les données
    return timePoints.map(point => {
      let fullLabel = '';
      if (interval === 'hour') fullLabel = format(point, 'HH:00', { locale: fr });
      else if (interval === 'day') fullLabel = format(point, 'EEEE dd MMMM yyyy', { locale: fr });
      else if (interval === 'month') fullLabel = format(point, 'MMMM yyyy', { locale: fr });
      else fullLabel = format(point, 'yyyy', { locale: fr });

      const pointData: any = {
        name: point,
        formattedTime: format(point, interval === 'hour' ? 'HH:00' : interval === 'day' ? 'dd MMM' : interval === 'month' ? 'MMM yyyy' : 'yyyy', { locale: fr }),
        fullLabel: interval === 'month' 
           ? `Mois de ${fullLabel.charAt(0).toUpperCase() + fullLabel.slice(1)}` 
           : fullLabel.charAt(0).toUpperCase() + fullLabel.slice(1)
      };

      services.forEach(service => {
        const count = data.filter(d => {
          const dDate = parseISO(d.created_at);
          let isSame = false;
          if (interval === 'hour') isSame = isSameHour(dDate, point);
          else if (interval === 'day') isSame = isSameDay(dDate, point);
          else if (interval === 'month') isSame = isSameMonth(dDate, point);
          else isSame = isSameYear(dDate, point);
          
          return isSame && d.service_name === service;
        }).length;
        
        pointData[service] = count;
      });

      return pointData;
    });
  }, [data, period, startDate, endDate]);

  const services = useMemo(() => {
     return Array.from(new Set(data.map(d => d.service_name)));
  }, [data]);

  // Palette de 20 couleurs Luxury distinctes
  const colors = [
    '#000000', '#C5A059', '#1B365D', '#2D5A27', '#8B0000', 
    '#483D8B', '#B8860B', '#2F4F4F', '#A52A2A', '#004225',
    '#5D3FD3', '#704214', '#013220', '#4B0082', '#E97451',
    '#00CED1', '#6B8E23', '#DC143C', '#708090', '#CD7F32'
  ];

  if (data.length === 0) return (
     <div className="h-80 flex items-center justify-center border border-dashed border-black/10 text-editorial-title opacity-20 italic">
        Aucune donnée pour générer le graphique
     </div>
  );

  return (
    <div className="w-full h-[450px] bg-white p-6 md:p-10 border border-black shadow-sm group">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <defs>
            {services.map((service, i) => (
              <linearGradient key={`grad-${service}`} id={`color-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[i % colors.length]} stopOpacity={0.4}/>
                <stop offset="95%" stopColor={colors[i % colors.length]} stopOpacity={0}/>
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
          <XAxis 
            dataKey="formattedTime" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fontWeight: 'bold', fill: '#00000040' }}
            dy={15}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fontWeight: 'bold', fill: '#00000040' }}
            dx={-10}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-black text-white p-4 border border-white/10 shadow-2xl backdrop-blur-xl">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mb-3 border-b border-white/10 pb-2">
                       {payload[0].payload.fullLabel}
                    </p>
                    <div className="space-y-2">
                      {payload.map((entry: any, index: number) => (
                        <div 
                           key={index} 
                           className={`flex justify-between items-center gap-6 transition-opacity duration-300 ${activeService && entry.name !== activeService ? 'opacity-20' : 'opacity-100'}`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2" style={{ backgroundColor: entry.color }} />
                            <span className="text-[11px] font-bold uppercase tracking-widest">{entry.name}</span>
                          </div>
                          <span className="text-sm font-serif italic text-luxury">{entry.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend 
            content={({ payload }) => (
               <div className="flex flex-wrap justify-center gap-6 mt-10">
                  {payload?.map((entry: any, index: number) => (
                     <button
                        key={`legend-${index}`}
                        onClick={() => setActiveService(activeService === entry.value ? null : entry.value)}
                        className={`flex items-center gap-3 transition-all duration-300 group ${activeService && activeService !== entry.value ? 'opacity-20 grayscale scale-95' : 'opacity-100 scale-100'}`}
                     >
                        <div className="w-4 h-1" style={{ backgroundColor: entry.color }} />
                        <span className="text-[10px] font-bold uppercase tracking-widest hover:text-luxury">{entry.value}</span>
                     </button>
                  ))}
               </div>
            )}
          />
          {services.map((service, i) => (
            <Area
              key={service}
              type="monotone"
              dataKey={service}
              stroke={colors[i % colors.length]}
              strokeWidth={activeService === service ? 3 : 1.5}
              fill={`url(#color-${i})`}
              strokeOpacity={activeService && activeService !== service ? 0.05 : 1}
              fillOpacity={activeService && activeService !== service ? 0.02 : 1}
              animationDuration={1000}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
