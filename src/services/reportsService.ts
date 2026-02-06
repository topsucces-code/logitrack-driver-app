import { supabase } from '../lib/supabase';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, format, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface DailyStats {
  date: string;
  deliveries: number;
  earnings: number;
  distance: number;
  avgRating: number;
}

export interface WeeklyReport {
  weekNumber: number;
  startDate: string;
  endDate: string;
  totalDeliveries: number;
  totalEarnings: number;
  totalDistance: number;
  avgEarningsPerDelivery: number;
  avgRating: number;
  topZone: string;
  busyDay: string;
  peakHour: string;
  dailyStats: DailyStats[];
  comparison: {
    deliveriesChange: number;
    earningsChange: number;
  };
}

export interface MonthlyReport {
  month: string;
  year: number;
  totalDeliveries: number;
  totalEarnings: number;
  totalDistance: number;
  avgEarningsPerDay: number;
  avgRating: number;
  weeklyBreakdown: {
    week: number;
    deliveries: number;
    earnings: number;
  }[];
  topZones: { zone: string; count: number }[];
}

/**
 * Get weekly report for a driver
 */
export async function getWeeklyReport(
  driverId: string,
  weekOffset = 0
): Promise<{ report: WeeklyReport | null; error: string | null }> {
  try {
    const targetDate = subWeeks(new Date(), weekOffset);
    const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });

    // Get deliveries for the week
    const { data: deliveries, error } = await supabase
      .from('logitrack_deliveries')
      .select('*')
      .eq('driver_id', driverId)
      .eq('status', 'delivered')
      .gte('delivered_at', weekStart.toISOString())
      .lte('delivered_at', weekEnd.toISOString());

    if (error || !deliveries) {
      return { report: null, error: error?.message || 'Erreur de chargement' };
    }

    // Calculate stats
    const totalDeliveries = deliveries.length;
    const totalEarnings = deliveries.reduce((sum, d) => sum + (d.driver_earnings || 0), 0);
    const totalDistance = deliveries.reduce((sum, d) => sum + (Number(d.distance_km) || 0), 0);

    // Calculate average rating
    const ratingsSum = deliveries.reduce((sum, d) => sum + (d.customer_rating || 0), 0);
    const ratingsCount = deliveries.filter((d) => d.customer_rating).length;
    const avgRating = ratingsCount > 0 ? ratingsSum / ratingsCount : 0;

    // Get daily breakdown
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const dailyStats: DailyStats[] = days.map((day) => {
      const dayDeliveries = deliveries.filter((d) => {
        const deliveredDate = new Date(d.delivered_at);
        return deliveredDate.toDateString() === day.toDateString();
      });

      return {
        date: format(day, 'yyyy-MM-dd'),
        deliveries: dayDeliveries.length,
        earnings: dayDeliveries.reduce((sum, d) => sum + (d.driver_earnings || 0), 0),
        distance: dayDeliveries.reduce((sum, d) => sum + (Number(d.distance_km) || 0), 0),
        avgRating: 0,
      };
    });

    // Find busiest day
    const busyDayIndex = dailyStats.reduce(
      (maxIdx, stat, idx, arr) =>
        stat.deliveries > arr[maxIdx].deliveries ? idx : maxIdx,
      0
    );
    const busyDay = format(days[busyDayIndex], 'EEEE', { locale: fr });

    // Compute peak hour from delivered_at times
    const hourCounts: Record<number, number> = {};
    for (const d of deliveries) {
      if (d.delivered_at) {
        const hour = new Date(d.delivered_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    }
    const peakHourNum = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    const peakHour = peakHourNum ? `${peakHourNum[0]}h-${Number(peakHourNum[0]) + 2}h` : '-';

    // Compute top zone from delivery_zone_id
    const zoneCounts: Record<string, number> = {};
    for (const d of deliveries) {
      const zone = d.delivery_zone_id || 'unknown';
      zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
    }
    const topZoneId = Object.entries(zoneCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    let topZone = '-';
    if (topZoneId && topZoneId !== 'unknown') {
      const { data: zoneData } = await supabase
        .from('logitrack_zones')
        .select('name')
        .eq('id', topZoneId)
        .maybeSingle();
      topZone = zoneData?.name || topZoneId;
    }

    // Get previous week for comparison
    const prevWeekStart = subWeeks(weekStart, 1);
    const prevWeekEnd = subWeeks(weekEnd, 1);

    const { data: prevDeliveries } = await supabase
      .from('logitrack_deliveries')
      .select('driver_earnings')
      .eq('driver_id', driverId)
      .eq('status', 'delivered')
      .gte('delivered_at', prevWeekStart.toISOString())
      .lte('delivered_at', prevWeekEnd.toISOString());

    const prevTotalDeliveries = prevDeliveries?.length || 0;
    const prevTotalEarnings = prevDeliveries?.reduce((sum, d) => sum + (d.driver_earnings || 0), 0) || 0;

    const report: WeeklyReport = {
      weekNumber: Math.ceil((targetDate.getDate() - targetDate.getDay() + 1) / 7),
      startDate: format(weekStart, 'dd MMM', { locale: fr }),
      endDate: format(weekEnd, 'dd MMM yyyy', { locale: fr }),
      totalDeliveries,
      totalEarnings,
      totalDistance: Math.round(totalDistance * 10) / 10,
      avgEarningsPerDelivery: totalDeliveries > 0 ? Math.round(totalEarnings / totalDeliveries) : 0,
      avgRating: Math.round(avgRating * 10) / 10,
      topZone,
      busyDay,
      peakHour,
      dailyStats,
      comparison: {
        deliveriesChange: prevTotalDeliveries > 0
          ? Math.round(((totalDeliveries - prevTotalDeliveries) / prevTotalDeliveries) * 100)
          : 0,
        earningsChange: prevTotalEarnings > 0
          ? Math.round(((totalEarnings - prevTotalEarnings) / prevTotalEarnings) * 100)
          : 0,
      },
    };

    return { report, error: null };
  } catch (err: any) {
    return { report: null, error: err.message };
  }
}

/**
 * Get monthly report for a driver
 */
export async function getMonthlyReport(
  driverId: string,
  monthOffset = 0
): Promise<{ report: MonthlyReport | null; error: string | null }> {
  try {
    const targetDate = subMonths(new Date(), monthOffset);
    const monthStart = startOfMonth(targetDate);
    const monthEnd = endOfMonth(targetDate);

    const { data: deliveries, error } = await supabase
      .from('logitrack_deliveries')
      .select('*')
      .eq('driver_id', driverId)
      .eq('status', 'delivered')
      .gte('delivered_at', monthStart.toISOString())
      .lte('delivered_at', monthEnd.toISOString());

    if (error || !deliveries) {
      return { report: null, error: error?.message || 'Erreur de chargement' };
    }

    const totalDeliveries = deliveries.length;
    const totalEarnings = deliveries.reduce((sum, d) => sum + (d.driver_earnings || 0), 0);
    const totalDistance = deliveries.reduce((sum, d) => sum + (Number(d.distance_km) || 0), 0);

    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd }).length;
    const avgEarningsPerDay = daysInMonth > 0 ? Math.round(totalEarnings / daysInMonth) : 0;

    const ratingsSum = deliveries.reduce((sum, d) => sum + (d.customer_rating || 0), 0);
    const ratingsCount = deliveries.filter((d) => d.customer_rating).length;
    const avgRating = ratingsCount > 0 ? ratingsSum / ratingsCount : 0;

    // Weekly breakdown
    const weeklyBreakdown = [];
    for (let week = 1; week <= 5; week++) {
      const weekStartDay = (week - 1) * 7 + 1;
      const weekDeliveries = deliveries.filter((d) => {
        const day = new Date(d.delivered_at).getDate();
        return day >= weekStartDay && day < weekStartDay + 7;
      });

      weeklyBreakdown.push({
        week,
        deliveries: weekDeliveries.length,
        earnings: weekDeliveries.reduce((sum, d) => sum + (d.driver_earnings || 0), 0),
      });
    }

    // Compute top zones from delivery_zone_id
    const zoneCounts: Record<string, number> = {};
    for (const d of deliveries) {
      const zone = d.delivery_zone_id || 'unknown';
      if (zone !== 'unknown') {
        zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
      }
    }
    const sortedZones = Object.entries(zoneCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const topZones: { zone: string; count: number }[] = [];
    for (const [zoneId, count] of sortedZones) {
      const { data: zoneData } = await supabase
        .from('logitrack_zones')
        .select('name')
        .eq('id', zoneId)
        .maybeSingle();
      topZones.push({ zone: zoneData?.name || zoneId, count });
    }

    const report: MonthlyReport = {
      month: format(targetDate, 'MMMM', { locale: fr }),
      year: targetDate.getFullYear(),
      totalDeliveries,
      totalEarnings,
      totalDistance: Math.round(totalDistance * 10) / 10,
      avgEarningsPerDay,
      avgRating: Math.round(avgRating * 10) / 10,
      weeklyBreakdown: weeklyBreakdown.filter((w) => w.deliveries > 0),
      topZones,
    };

    return { report, error: null };
  } catch (err: any) {
    return { report: null, error: err.message };
  }
}

/**
 * Export report as shareable text
 */
export function formatReportForSharing(report: WeeklyReport): string {
  return `
📊 Rapport hebdomadaire LogiTrack
📅 ${report.startDate} - ${report.endDate}

📦 Livraisons: ${report.totalDeliveries}
💰 Gains: ${report.totalEarnings.toLocaleString()} FCFA
🛣️ Distance: ${report.totalDistance} km
⭐ Note moyenne: ${report.avgRating}/5

📈 Par rapport à la semaine précédente:
${report.comparison.earningsChange >= 0 ? '▲' : '▼'} Gains: ${report.comparison.earningsChange > 0 ? '+' : ''}${report.comparison.earningsChange}%
${report.comparison.deliveriesChange >= 0 ? '▲' : '▼'} Livraisons: ${report.comparison.deliveriesChange > 0 ? '+' : ''}${report.comparison.deliveriesChange}%

🏆 Jour le plus actif: ${report.busyDay}
📍 Zone principale: ${report.topZone}

Généré par LogiTrack Driver App
  `.trim();
}
