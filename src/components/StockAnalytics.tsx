import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, TrendingUp, Package, Clock } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend as RechartsLegend, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, AreaChart, Area } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

const COLORS = ['hsl(346, 77%, 50%)', 'hsl(142, 76%, 36%)', 'hsl(48, 96%, 50%)', 'hsl(200, 100%, 50%)', 'hsl(260, 100%, 65%)'];

// Main Analytics Component
export function StockAnalytics() {
  // --- DATA QUERIES ---

  // 1. Query for KPI cards
  const { data: kpiStats, isLoading: kpiLoading } = useQuery({
    queryKey: ['kpi-stats'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const today = new Date().toISOString().split('T')[0];

      // Fetch all relevant data in parallel
      const [
        { data: monthlySalesData, error: salesError },
        { data: availableStockData, error: stockError },
        { data: oldestStockData, error: oldestError },
        { data: todaySalesData, error: todayError }
      ] = await Promise.all([
        supabase.from('stock_entries').select('sold, phone_models(brand)').gte('date', thirtyDaysAgo.toISOString()),
        supabase.from('stock_entries').select('id').gt('night_stock', 0),
        supabase.from('stock_entries').select('date, phone_models(model)').gt('night_stock', 0).order('date', { ascending: true }).limit(1),
        supabase.from('stock_entries').select('selling_price, profit_loss, sold').eq('date', today)
      ]);

      if (salesError || stockError || oldestError || todayError) {
        throw new Error(salesError?.message || stockError?.message || oldestError?.message || todayError?.message);
      }

      // Process sales data
      const totalSoldMonthly = monthlySalesData?.filter(e => e.sold > 0).length || 0;
      const brandSales = monthlySalesData?.filter(e => e.sold > 0).reduce((acc, entry) => {
        const brand = entry.phone_models?.brand || 'Unknown';
        acc[brand] = (acc[brand] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const bestSellingBrand = brandSales && Object.keys(brandSales).length > 0
        ? Object.entries(brandSales).sort((a, b) => b[1] - a[1])[0]
        : null;

      // Process available stock
      const availableStock = availableStockData?.length || 0;

      // Process oldest stock
      let oldestStock = null;
      if (oldestStockData && oldestStockData.length > 0 && oldestStockData[0].date) {
        try {
          const oldestDate = new Date(oldestStockData[0].date);
          if (!isNaN(oldestDate.getTime())) { // Check if the date is valid
            oldestStock = {
              model: oldestStockData[0].phone_models?.model || 'N/A',
              days: differenceInDays(new Date(), oldestDate),
            };
          }
        } catch (e) {
          // Date parsing failed, leave oldestStock as null
          console.error("Error parsing oldest stock date:", e);
        }
      }

      // Calculate today's profit/loss and revenue
      const soldItems = todaySalesData?.filter(e => e.sold > 0) || [];
      const todayProfitLoss = soldItems.reduce((sum, item) => sum + (item.profit_loss || 0), 0);
      const todayRevenue = soldItems.reduce((sum, item) => sum + (item.selling_price || 0), 0);

      return {
        totalSoldMonthly,
        availableStock,
        bestSellingBrand: bestSellingBrand ? `${bestSellingBrand[0]} (${bestSellingBrand[1]})` : null,
        oldestStock: oldestStock ? `${oldestStock.model} (${oldestStock.days} hari)` : null,
        todayProfitLoss,
        todayRevenue,
      };
    }
  });

  // 2. Query for Daily Sales Chart
  const { data: dailySalesData, isLoading: dailySalesLoading } = useQuery({
    queryKey: ['daily-sales-chart'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data, error } = await supabase.from('stock_entries').select('date, sold').gte('date', thirtyDaysAgo.toISOString()).order('date');
      if (error) throw error;

      const grouped = data.filter(e => e.sold > 0).reduce((acc, entry) => {
        const date = new Date(entry.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(grouped).map(([date, sales]) => ({ date, Penjualan: sales }));
    }
  });

  // 3. Query for Stock Composition Pie Chart
  const { data: stockCompositionData, isLoading: compositionLoading } = useQuery({
    queryKey: ['stock-composition'],
    queryFn: async () => {
        const { data, error } = await supabase.from('stock_entries').select('night_stock, phone_models(brand)').gt('night_stock', 0);
        if (error) throw error;

        const grouped = data.reduce((acc, entry) => {
            const brand = entry.phone_models?.brand || 'Unknown';
            acc[brand] = (acc[brand] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(grouped).map(([name, value]) => ({ name, value }));
    }
  });

  // 4. Query for Best Selling Models Table
  const { data: bestSellingModels, isLoading: modelsLoading } = useQuery({
    queryKey: ['best-selling-models'],
    queryFn: async () => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const { data, error } = await supabase.from('stock_entries').select('sold, phone_models(brand, model, color)').gte('date', thirtyDaysAgo.toISOString());
        if (error) throw error;

        const grouped = data.filter(e => e.sold > 0).reduce((acc, entry) => {
            const modelName = `${entry.phone_models?.brand} ${entry.phone_models?.model} ${entry.phone_models?.color || ''}`.trim();
            acc[modelName] = (acc[modelName] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(grouped).map(([name, sales]) => ({ name, sales })).sort((a, b) => b.sales - a.sales);
    }
  });

  // --- RENDER ---

  const AnalyticsLoader = () => (
    <div className="h-24 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="animate-fade-in hover-scale transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Terjual (Bulan Ini)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {kpiLoading ? <AnalyticsLoader /> : <div className="text-2xl font-bold animate-scale-in">{kpiStats?.totalSoldMonthly ?? 0}</div>}
          </CardContent>
        </Card>
        <Card className="animate-fade-in hover-scale transition-all duration-300" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Tersedia</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {kpiLoading ? <AnalyticsLoader /> : <div className="text-2xl font-bold animate-scale-in">{kpiStats?.availableStock ?? 0}</div>}
          </CardContent>
        </Card>
        <Card className="animate-fade-in hover-scale transition-all duration-300" style={{ animationDelay: '0.2s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Brand Terlaris</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {kpiLoading ? <AnalyticsLoader /> : (
              <div className="text-2xl font-bold animate-scale-in">
                {kpiStats?.bestSellingBrand ?? <span className="text-sm text-muted-foreground">Belum ada penjualan</span>}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="animate-fade-in hover-scale transition-all duration-300" style={{ animationDelay: '0.3s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Paling Lama</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {kpiLoading ? <AnalyticsLoader /> : (
              <div className="text-2xl font-bold animate-scale-in">
                {kpiStats?.oldestStock ?? <span className="text-sm text-muted-foreground">Tidak ada stok</span>}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="animate-fade-in hover-scale transition-all duration-300" style={{ animationDelay: '0.4s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Laba/Rugi Hari Ini</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {kpiLoading ? <AnalyticsLoader /> : (
              <div className={cn(
                "text-2xl font-bold animate-scale-in",
                (kpiStats?.todayProfitLoss ?? 0) >= 0 ? 'text-success' : 'text-destructive'
              )}>
                Rp {(kpiStats?.todayProfitLoss ?? 0).toLocaleString('id-ID')}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="animate-fade-in hover-scale transition-all duration-300" style={{ animationDelay: '0.5s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Uang Hari Ini</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {kpiLoading ? <AnalyticsLoader /> : (
              <div className="text-2xl font-bold animate-scale-in">
                Rp {(kpiStats?.todayRevenue ?? 0).toLocaleString('id-ID')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="animate-fade-in overflow-hidden">
            <CardHeader>
              <CardTitle>Grafik Penjualan Harian</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {dailySalesLoading ? <AnalyticsLoader /> : (
                dailySalesData && dailySalesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailySalesData}>
                      <defs>
                        <linearGradient id="colorPenjualan" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(346, 77%, 50%)" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="hsl(346, 77%, 50%)" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fontSize: 12 }}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis 
                        allowDecimals={false}
                        tick={{ fontSize: 12 }}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <RechartsTooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="Penjualan" 
                        stroke="hsl(346, 77%, 50%)" 
                        strokeWidth={3}
                        fill="url(#colorPenjualan)"
                        animationDuration={1000}
                        animationBegin={0}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Belum ada data penjualan</p>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </div>
        <div>
          <Card className="animate-fade-in overflow-hidden" style={{ animationDelay: '0.1s' }}>
            <CardHeader>
              <CardTitle>Komposisi Stok</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {compositionLoading ? <AnalyticsLoader /> : (
                stockCompositionData && stockCompositionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={stockCompositionData} 
                        dataKey="value" 
                        nameKey="name" 
                        cx="50%" 
                        cy="50%" 
                        outerRadius={80} 
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        animationBegin={0}
                        animationDuration={800}
                      >
                        {stockCompositionData?.map((_entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={COLORS[index % COLORS.length]}
                            className="hover:opacity-80 transition-opacity duration-200"
                          />
                        ))}
                      </Pie>
                      <RechartsLegend 
                        wrapperStyle={{ fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Tidak ada stok tersedia</p>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <Card className="animate-fade-in overflow-hidden" style={{ animationDelay: '0.2s' }}>
          <CardHeader>
            <CardTitle>Tipe HP Terlaris (Bulan Ini)</CardTitle>
          </CardHeader>
          <CardContent>
             {modelsLoading ? <AnalyticsLoader /> : (
               bestSellingModels && bestSellingModels.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>No.</TableHead>
                            <TableHead>Tipe HP</TableHead>
                            <TableHead className="text-right">Unit Terjual</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {bestSellingModels?.map((model, index) => (
                            <TableRow 
                              key={model.name}
                              className="transition-all duration-200 hover:bg-accent/50 animate-fade-in"
                              style={{ animationDelay: `${index * 0.05}s` }}
                            >
                                <TableCell className="font-medium">{index + 1}</TableCell>
                                <TableCell>{model.name}</TableCell>
                                <TableCell className="text-right font-bold text-primary">{model.sales}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
               ) : (
                <div className="flex items-center justify-center h-24">
                  <p className="text-muted-foreground">Belum ada HP terjual bulan ini</p>
                </div>
               )
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}