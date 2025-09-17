import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Package, AlertTriangle, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StockAnalyticsProps {
  selectedLocation: string;
}

interface TrendData {
  date: string;
  sales: number;
  incoming: number;
  stock: number;
}

interface BrandData {
  brand: string;
  stock: number;
  sales: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--info))'];

export function StockAnalytics({ selectedLocation }: StockAnalyticsProps) {
  // Fetch 30-day trend data
  const { data: trendData, isLoading: trendLoading } = useQuery({
    queryKey: ['trend-data', selectedLocation],
    queryFn: async (): Promise<TrendData[]> => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      let query = supabase
        .from('stock_entries')
        .select(`
          date,
          sold,
          incoming,
          night_stock,
          stock_locations(name)
        `)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date');

      if (selectedLocation !== 'all') {
        const { data: locationData } = await supabase
          .from('stock_locations')
          .select('id')
          .eq('name', selectedLocation)
          .single();
        
        if (locationData) {
          query = query.eq('location_id', locationData.id);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by date and sum values
      const groupedData = (data || []).reduce((acc, entry) => {
        const date = entry.date;
        if (!acc[date]) {
          acc[date] = { date, sales: 0, incoming: 0, stock: 0, count: 0 };
        }
        acc[date].sales += entry.sold;
        acc[date].incoming += entry.incoming;
        acc[date].stock += entry.night_stock;
        acc[date].count += 1;
        return acc;
      }, {} as Record<string, TrendData & { count: number }>);

      // Convert to array and calculate averages for stock
      return Object.values(groupedData).map(item => ({
        date: new Date(item.date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
        sales: item.sales,
        incoming: item.incoming,
        stock: Math.round(item.stock / (item.count || 1))
      }));
    }
  });

  // Fetch brand performance data
  const { data: brandData, isLoading: brandLoading } = useQuery({
    queryKey: ['brand-data', selectedLocation],
    queryFn: async (): Promise<BrandData[]> => {
      let query = supabase
        .from('stock_entries')
        .select(`
          sold,
          night_stock,
          phone_models(brand),
          stock_locations(name)
        `);

      if (selectedLocation !== 'all') {
        const { data: locationData } = await supabase
          .from('stock_locations')
          .select('id')
          .eq('name', selectedLocation)
          .single();
        
        if (locationData) {
          query = query.eq('location_id', locationData.id);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by brand
      const groupedData = (data || []).reduce((acc, entry) => {
        const brand = entry.phone_models?.brand || 'Unknown';
        if (!acc[brand]) {
          acc[brand] = { brand, stock: 0, sales: 0 };
        }
        acc[brand].stock += entry.night_stock;
        acc[brand].sales += entry.sold;
        return acc;
      }, {} as Record<string, BrandData>);

      return Object.values(groupedData).sort((a, b) => b.sales - a.sales);
    }
  });

  // Fetch low stock alerts
  const { data: lowStockItems } = useQuery({
    queryKey: ['low-stock', selectedLocation],
    queryFn: async () => {
      let query = supabase
        .from('stock_entries')
        .select(`
          night_stock,
          phone_models(brand, model, color),
          stock_locations(name)
        `)
        .lte('night_stock', 5)
        .gt('night_stock', 0)
        .order('night_stock');

      if (selectedLocation !== 'all') {
        const { data: locationData } = await supabase
          .from('stock_locations')
          .select('id')
          .eq('name', selectedLocation)
          .single();
        
        if (locationData) {
          query = query.eq('location_id', locationData.id);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  });

  return (
    <div className="space-y-6">
      {/* Analytics Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 30-Day Sales Trend */}
        <Card className="border-border/50 bg-card/50 backdrop-blur lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              30-Day Sales & Stock Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {trendLoading ? (
              <div className="h-80 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="hsl(var(--destructive))" 
                    strokeWidth={3}
                    name="Sales"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="incoming" 
                    stroke="hsl(var(--info))" 
                    strokeWidth={3}
                    name="Incoming"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="stock" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    name="Avg Stock"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Brand Performance */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Brand Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {brandLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={brandData?.slice(0, 6)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="brand" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="sales" fill="hsl(var(--primary))" name="Sales" />
                  <Bar dataKey="stock" fill="hsl(var(--accent))" name="Current Stock" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Low Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {lowStockItems?.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  No low stock items found
                </p>
              ) : (
                lowStockItems?.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-warning/20">
                    <div>
                      <div className="font-medium text-sm">
                        {item.phone_models?.brand} {item.phone_models?.model}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.phone_models?.color} • {item.stock_locations?.name}
                      </div>
                    </div>
                    <div className="text-warning font-bold">
                      {item.night_stock} left
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Brand Market Share Pie Chart */}
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Brand Market Share (by Sales)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {brandLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={brandData?.slice(0, 5)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ brand, sales, percent }) => `${brand}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="sales"
                >
                  {brandData?.slice(0, 5).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}