import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { TrendingUp, Package, AlertTriangle, PieChart as PieChartIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StockAnalyticsProps {
  selectedLocation: string;
}

interface TrendData {
  date: string;
  Penjualan: number;
  "HP Datang": number;
  "Rata-rata Stok": number;
}

interface BrandData {
  brand: string;
  stok: number;
  penjualan: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

const chartConfig = {
  stok: { label: "Stok", color: "hsl(var(--chart-1))" },
  penjualan: { label: "Penjualan", color: "hsl(var(--chart-2))" },
  "HP Datang": { label: "HP Datang", color: "hsl(var(--chart-3))" },
  "Rata-rata Stok": { label: "Rata-rata Stok", color: "hsl(var(--chart-4))" },
};

export function StockAnalytics({ selectedLocation }: StockAnalyticsProps) {
  // Fetch 30-day trend data
  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['trend-data', selectedLocation],
    queryFn: async (): Promise<TrendData[]> => {
      // ... (omitted for brevity, same as original)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      let query = supabase
        .from('stock_entries')
        .select(`date, sold, incoming, night_stock, stock_locations(name)`)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date');

      if (selectedLocation !== 'all') {
        const { data: locationData } = await supabase.from('stock_locations').select('id').eq('name', selectedLocation).single();
        if (locationData) query = query.eq('location_id', locationData.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const groupedData = (data || []).reduce((acc, entry) => {
        const date = entry.date;
        if (!acc[date]) acc[date] = { date, sales: 0, incoming: 0, stock: 0, count: 0 };
        acc[date].sales += entry.sold;
        acc[date].incoming += entry.incoming;
        acc[date].stock += entry.night_stock;
        acc[date].count += 1;
        return acc;
      }, {} as Record<string, any>);

      return Object.values(groupedData).map(item => ({
        date: new Date(item.date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
        Penjualan: item.sales,
        "HP Datang": item.incoming,
        "Rata-rata Stok": Math.round(item.stock / (item.count || 1))
      }));
    }
  });

  // Fetch brand performance data
  const { data: brandData, isLoading: brandLoading } = useQuery({
    queryKey: ['brand-data', selectedLocation],
    queryFn: async (): Promise<BrandData[]> => {
      // ... (omitted for brevity, same as original)
      let query = supabase.from('stock_entries').select(`sold, night_stock, phone_models(brand), stock_locations(name)`);

      if (selectedLocation !== 'all') {
        const { data: locationData } = await supabase.from('stock_locations').select('id').eq('name', selectedLocation).single();
        if (locationData) query = query.eq('location_id', locationData.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const groupedData = (data || []).reduce((acc, entry) => {
        const brand = entry.phone_models?.brand || 'Unknown';
        if (!acc[brand]) acc[brand] = { brand, stok: 0, penjualan: 0 };
        acc[brand].stok += entry.night_stock;
        acc[brand].penjualan += entry.sold;
        return acc;
      }, {} as Record<string, BrandData>);

      return Object.values(groupedData).sort((a, b) => b.penjualan - a.penjualan);
    }
  });

  // Fetch low stock alerts
  const { data: lowStockItems, isLoading: lowStockLoading } = useQuery({
    queryKey: ['low-stock', selectedLocation],
    queryFn: async () => {
      // ... (omitted for brevity, same as original)
      let query = supabase
        .from('stock_entries')
        .select(`night_stock, phone_models(brand, model, color), stock_locations(name)`)
        .lte('night_stock', 5)
        .gt('night_stock', 0)
        .order('night_stock');

      if (selectedLocation !== 'all') {
        const { data: locationData } = await supabase.from('stock_locations').select('id').eq('name', selectedLocation).single();
        if (locationData) query = query.eq('location_id', locationData.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  });

  const AnalyticsLoader = () => (
    <div className="h-80 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Analytics Column */}
      <div className="lg:col-span-2 space-y-6">
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" /> Tren 30 Hari</CardTitle>
            <CardDescription>Tren penjualan, stok, dan HP datang dalam 30 hari terakhir.</CardDescription>
          </CardHeader>
          <CardContent>
            {trendLoading ? <AnalyticsLoader /> : (
              <ChartContainer config={chartConfig} className="w-full h-80">
                <LineChart data={trendData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend verticalAlign="bottom" height={36} />
                  <Line type="monotone" dataKey="Penjualan" stroke="var(--color-penjualan)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="HP Datang" stroke="var(--color-HP Datang)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Rata-rata Stok" stroke="var(--color-Rata-rata Stok)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Package className="w-5 h-5" /> Performa Merk</CardTitle>
              <CardDescription>Penjualan dan stok berdasarkan merk.</CardDescription>
            </CardHeader>
            <CardContent>
              {brandLoading ? <AnalyticsLoader /> : (
                <ChartContainer config={chartConfig} className="w-full h-64">
                  <BarChart data={brandData?.slice(0, 5)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="brand" tickLine={false} axisLine={false} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend verticalAlign="bottom" height={36} />
                    <Bar dataKey="penjualan" fill="var(--color-penjualan)" radius={4} />
                    <Bar dataKey="stok" fill="var(--color-stok)" radius={4} />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><PieChartIcon className="w-5 h-5" /> Pangsa Pasar</CardTitle>
              <CardDescription>Pangsa pasar merk berdasarkan penjualan.</CardDescription>
            </CardHeader>
            <CardContent>
              {brandLoading ? <AnalyticsLoader /> : (
                <ChartContainer config={chartConfig} className="w-full h-64">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie data={brandData?.slice(0, 5)} dataKey="penjualan" nameKey="brand" cx="50%" cy="50%" outerRadius={80}>
                      {brandData?.slice(0, 5).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Side Column for Alerts */}
      <div className="space-y-6">
        <Card className="border-border/50 bg-card/50 backdrop-blur lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-yellow-500" /> Stok Menipis</CardTitle>
            <CardDescription>Daftar item dengan stok di bawah 5 unit.</CardDescription>
          </CardHeader>
          <CardContent>
            {lowStockLoading ? <AnalyticsLoader /> : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {lowStockItems?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">Tidak ada stok yang menipis.</p>
                ) : (
                  lowStockItems?.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div>
                        <div className="font-medium text-sm">{item.phone_models?.brand} {item.phone_models?.model}</div>
                        <div className="text-xs text-muted-foreground">{item.phone_models?.color} • {item.stock_locations?.name}</div>
                      </div>
                      <div className="text-yellow-500 font-bold">{item.night_stock}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}