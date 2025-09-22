import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, TrendingUp, Package, Clock } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend as RechartsLegend, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

// Main Analytics Component
export function StockAnalytics() {
  // --- DATA QUERIES ---

  // 1. Query for KPI cards
  const { data: kpiStats, isLoading: kpiLoading } = useQuery({
    queryKey: ['kpi-stats'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Fetch all relevant data in parallel
      const [
        { data: monthlySalesData, error: salesError },
        { data: availableStockData, error: stockError },
        { data: oldestStockData, error: oldestError }
      ] = await Promise.all([
        supabase.from('stock_entries').select('sold, phone_models(brand)').gte('date', thirtyDaysAgo.toISOString()),
        supabase.from('stock_entries').select('id').gt('night_stock', 0),
        supabase.from('stock_entries').select('date, phone_models(model)').gt('night_stock', 0).order('date', { ascending: true }).limit(1)
      ]);

      if (salesError || stockError || oldestError) {
        throw new Error(salesError?.message || stockError?.message || oldestError?.message);
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

      return {
        totalSoldMonthly,
        availableStock,
        bestSellingBrand: bestSellingBrand ? `${bestSellingBrand[0]} (${bestSellingBrand[1]})` : 'N/A',
        oldestStock: oldestStock ? `${oldestStock.model} (${oldestStock.days} hari)` : 'N/A',
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Terjual (Bulan Ini)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {kpiLoading ? <AnalyticsLoader /> : <div className="text-2xl font-bold">{kpiStats?.totalSoldMonthly ?? 0}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Tersedia</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {kpiLoading ? <AnalyticsLoader /> : <div className="text-2xl font-bold">{kpiStats?.availableStock ?? 0}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Brand Terlaris</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {kpiLoading ? <AnalyticsLoader /> : <div className="text-2xl font-bold">{kpiStats?.bestSellingBrand ?? 'N/A'}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Paling Lama</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {kpiLoading ? <AnalyticsLoader /> : <div className="text-2xl font-bold">{kpiStats?.oldestStock ?? 'N/A'}</div>}
          </CardContent>
        </Card>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Grafik Penjualan Harian</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {dailySalesLoading ? <AnalyticsLoader /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailySalesData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="Penjualan" stroke="#8884d8" activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Komposisi Stok</CardTitle>
            </CardHeader>
            <CardContent className="h-[300px]">
              {compositionLoading ? <AnalyticsLoader /> : (
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={stockCompositionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                            {stockCompositionData?.map((_entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <RechartsLegend />
                    </PieChart>
                 </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle>Tipe HP Terlaris (Bulan Ini)</CardTitle>
          </CardHeader>
          <CardContent>
             {modelsLoading ? <AnalyticsLoader /> : (
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
                            <TableRow key={model.name}>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>{model.name}</TableCell>
                                <TableCell className="text-right">{model.sales}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}