import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Truck, TrendingUp, AlertTriangle, Package, BarChart3, LogOut, Calendar as CalendarIcon, PackageOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { StockTable } from "./StockTable";
import { StockAnalytics } from "./StockAnalytics";
import { ThemeToggle } from "./ThemeToggle";
import { MobileNavigation } from "./MobileNavigation";
import { FabMenu } from "./FabMenu";

interface LocationBreakdown {
  [location: string]: {
    morning_stock: number;
    night_stock: number;
  };
}

interface DashboardStats {
  todaySales: number;
  totalMorningStock: number;
  totalNightStock: number;
  incomingHP: number;
  discrepancies: number;
  locationBreakdown: LocationBreakdown;
}

export function StockDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'table' | 'analytics'>('dashboard');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [date, setDate] = useState<Date>(new Date());
  const { toast } = useToast();

  // Fetch dashboard statistics
  const { data: stats, isLoading: statsLoading, refetch } = useQuery({
    queryKey: ['dashboard-stats', selectedLocation, date],
    queryFn: async (): Promise<DashboardStats> => {
      const selectedDate = format(date, "yyyy-MM-dd");
      
      let query = supabase
        .from('stock_entries')
        .select(`
          sold,
          morning_stock,
          night_stock,
          incoming,
          adjustment,
          stock_locations(name)
        `)
        .eq('date', selectedDate);

      if (selectedLocation !== 'all') {
        query = query.eq('stock_locations.name', selectedLocation);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      const todaySales = data?.reduce((sum, entry) => sum + entry.sold, 0) || 0;
      const totalMorningStock = data?.reduce((sum, entry) => sum + entry.morning_stock, 0) || 0;
      const totalNightStock = data?.reduce((sum, entry) => sum + entry.night_stock, 0) || 0;
      const incomingHP = data?.reduce((sum, entry) => sum + entry.incoming, 0) || 0;
      const discrepancies = data?.filter(entry => entry.adjustment !== 0).length || 0;

      const locationBreakdown = (data || []).reduce((acc, entry) => {
        const loc = entry.stock_locations?.name || 'Unknown';
        if (!acc[loc]) {
          acc[loc] = { morning_stock: 0, night_stock: 0 };
        }
        acc[loc].morning_stock += entry.morning_stock;
        acc[loc].night_stock += entry.night_stock;
        return acc;
      }, {} as LocationBreakdown);

      return {
        todaySales,
        totalMorningStock,
        totalNightStock,
        incomingHP,
        discrepancies,
        locationBreakdown
      };
    }
  });

  // Fetch locations for filter
  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_locations')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto px-4 lg:px-6">
          <div className="flex h-16 items-center justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold truncate">Manajemen Stok</h1>
              <p className="text-sm text-muted-foreground truncate">
                Rekap Harian untuk {format(date, "d MMMM yyyy", { locale: id })}
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className="w-[150px] sm:w-[240px] justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(date, "PPP", { locale: id })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    disabled={(d) => d > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-[120px] sm:w-[180px] text-sm">
                  <SelectValue placeholder="Semua Lokasi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Lokasi</SelectItem>
                  {locations?.map(location => (
                    <SelectItem key={location.id} value={location.name}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ThemeToggle />
              <Button variant="outline" size="icon" className="hidden sm:flex" onClick={() => supabase.auth.signOut()}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Desktop Navigation Tabs - Hidden on mobile */}
      <div className="hidden md:block border-b border-border">
        <div className="container mx-auto px-4 lg:px-6">
          <nav className="flex gap-1 -mb-px">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'table', label: 'Data Stok', icon: Package },
              { id: 'analytics', label: 'Statistik', icon: TrendingUp }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant="ghost"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`h-12 rounded-none border-b-2 ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {tab.label}
                </Button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1">
        <div className="container mx-auto px-4 lg:px-6 py-6">
          {/* Dashboard View */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
                {[
                  {
                    title: "Penjualan",
                    value: stats?.todaySales || 0,
                    icon: TrendingUp,
                    color: "text-green-500",
                  },
                  {
                    title: "Stok Pagi",
                    value: stats?.totalMorningStock || 0,
                    icon: PackageOpen,
                    color: "text-sky-500",
                  },
                  {
                    title: "Stok Malam",
                    value: stats?.totalNightStock || 0,
                    icon: Package,
                    color: "text-blue-500",
                  },
                  {
                    title: "HP Datang",
                    value: stats?.incomingHP || 0,
                    icon: Truck,
                    color: "text-purple-500",
                  },
                  {
                    title: "Selisih",
                    value: stats?.discrepancies || 0,
                    icon: AlertTriangle,
                    color: "text-yellow-500",
                  }
                ].map((kpi, index) => {
                  const Icon = kpi.icon;
                  return (
                    <Card key={index} className="border-border/50 bg-card/50 backdrop-blur">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                          {kpi.title}
                        </CardTitle>
                        <Icon className={`h-5 w-5 ${kpi.color}`} />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold">
                          {statsLoading ? (
                            <div className="animate-pulse bg-muted h-8 w-16 rounded" />
                          ) : (
                            kpi.value.toLocaleString('id-ID')
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Location Breakdown */}
              {selectedLocation === 'all' && !statsLoading && stats?.locationBreakdown && (
                <Card className="border-border/50 bg-card/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="text-base">Rincian Stok Per Lokasi</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                    {Object.entries(stats.locationBreakdown).map(([loc, stocks]) => (
                      <div key={loc} className="flex justify-between items-center">
                        <span className="font-medium text-foreground">{loc}</span>
                        <div className="flex items-center gap-4">
                          <span>Stok Pagi: <strong className="text-sky-500">{stocks.morning_stock}</strong></span>
                          <span>Stok Malam: <strong className="text-blue-500">{stocks.night_stock}</strong></span>
                        </div>
                      </div>
                    ))}
                    {Object.keys(stats.locationBreakdown).length === 0 && (
                      <p>Tidak ada data stok untuk tanggal yang dipilih.</p>
                    )}
                  </CardContent>
                </Card>
              )}

            </div>
          )}

          {/* Stock Table View */}
          {activeTab === 'table' && (
            <StockTable selectedLocation={selectedLocation} selectedDate={date} />
          )}

          {/* Analytics View */}
          {activeTab === 'analytics' && (
            <StockAnalytics selectedLocation={selectedLocation} />
          )}
        </div>
      </main>

      {/* Mobile Navigation */}
      <MobileNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* FAB Menu */}
      <FabMenu />
    </div>
  );
}