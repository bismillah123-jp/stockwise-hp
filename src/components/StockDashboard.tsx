import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Plus, Truck, TrendingUp, AlertTriangle, Package, BarChart3, LogOut, Calendar as CalendarIcon, PackageOpen, ArrowLeftRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { StockTable } from "./StockTable";
import { StockAnalytics } from "./StockAnalytics";
import { ThemeToggle } from "./ThemeToggle";
import { MobileNavigation } from "./MobileNavigation";
import { FabMenu } from "./FabMenu";

interface LocationData {
  morning_stock: number;
  night_stock: number;
  sold: number;
}

interface DashboardStats {
  totalMorningStock: number;
  totalNightStock: number;
  totalSold: number;
  totalIncoming: number;
  totalTransfers: number;
  totalFinalStock: number;
  breakdown: {
    [location: string]: LocationData;
  };
  transferBreakdown: {
    toSoko: number;
    toMbutoh: number;
  };
}

export function StockDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'table' | 'analytics'>('dashboard');
  const [date, setDate] = useState<Date>(new Date());
  const { toast } = useToast();

  // Fetch dashboard statistics
  const { data: stats, isLoading: statsLoading, refetch } = useQuery({
    queryKey: ['dashboard-stats', date],
    queryFn: async (): Promise<DashboardStats> => {
      const selectedDate = format(date, "yyyy-MM-dd");
      
      const { data, error } = await supabase
        .from('stock_entries')
        .select(`*, stock_locations(name)`)
        .eq('date', selectedDate);
      
      if (error) throw error;

      const totalMorningStock = data.reduce((sum, entry) => sum + entry.morning_stock, 0);
      const totalNightStock = data.reduce((sum, entry) => sum + entry.night_stock, 0);
      const totalSold = data.reduce((sum, entry) => sum + entry.sold, 0);
      const totalIncoming = data.reduce((sum, entry) => sum + entry.incoming, 0);
      const totalFinalStock = totalNightStock;

      const breakdown: { [location: string]: LocationData } = {};
      let toSoko = 0;
      let toMbutoh = 0;

      for (const entry of data) {
        const loc = entry.stock_locations?.name || 'Unknown';
        if (!breakdown[loc]) {
          breakdown[loc] = { morning_stock: 0, night_stock: 0, sold: 0 };
        }
        breakdown[loc].morning_stock += entry.morning_stock;
        breakdown[loc].night_stock += entry.night_stock;
        breakdown[loc].sold += entry.sold;

        if (entry.notes?.includes('Transfer In from SOKO')) {
          toMbutoh += entry.adjustment;
        }
        if (entry.notes?.includes('Transfer In from MBUTOH')) {
          toSoko += entry.adjustment;
        }
      }

      const totalTransfers = toSoko + toMbutoh;

      return {
        totalMorningStock,
        totalNightStock,
        totalSold,
        totalIncoming,
        totalTransfers,
        totalFinalStock,
        breakdown,
        transferBreakdown: { toSoko, toMbutoh },
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
                  onClick={() => setActiveTab(tab.id as 'dashboard' | 'table' | 'analytics')}
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
              {/* Modern KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Total Stok Pagi */}
                <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-card via-card/95 to-card/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-50" />
                  <CardHeader className="relative pb-2">
                    <CardTitle className="text-base font-semibold text-foreground/90 flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary" />
                      Total Stok Pagi
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative">
                    <p className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent mb-3">
                      {stats?.totalMorningStock ?? 0}
                    </p>
                    <div className="flex justify-between text-xs text-muted-foreground bg-muted/30 rounded-lg p-2">
                      <span className="font-medium">Mbutoh: {stats?.breakdown['MBUTOH']?.morning_stock ?? 0}</span>
                      <span className="font-medium">Soko: {stats?.breakdown['SOKO']?.morning_stock ?? 0}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* HP Datang */}
                <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-card via-card/95 to-card/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-success/5 via-transparent to-success/10 opacity-50" />
                  <CardHeader className="relative pb-2">
                    <CardTitle className="text-base font-semibold text-foreground/90 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-success" />
                      Unit Baru Masuk
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="relative">
                    <p className="text-3xl font-bold text-success mb-3">
                      {stats?.totalIncoming ?? 0}
                    </p>
                    <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2">
                      Unit yang masuk hari ini
                    </div>
                  </CardContent>
                </Card>

                {/* Total Laku */}
                <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-card via-card/95 to-card/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-warning/5 via-transparent to-warning/10 opacity-50" />
                  <CardHeader className="relative pb-2">
                    <CardTitle className="text-base font-semibold text-foreground/90 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-warning" />
                      Total Terjual
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">Semua lokasi</CardDescription>
                  </CardHeader>
                  <CardContent className="relative">
                    <p className="text-3xl font-bold text-warning mb-3">
                      {stats?.totalSold ?? 0}
                    </p>
                    <div className="flex justify-between text-xs text-muted-foreground bg-muted/30 rounded-lg p-2">
                      <span className="font-medium">Mbutoh: {stats?.breakdown['MBUTOH']?.sold ?? 0}</span>
                      <span className="font-medium">Soko: {stats?.breakdown['SOKO']?.sold ?? 0}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Transfer */}
                <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-card via-card/95 to-card/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-info/5 via-transparent to-info/10 opacity-50" />
                  <CardHeader className="relative pb-2">
                    <CardTitle className="text-base font-semibold text-foreground/90 flex items-center gap-2">
                      <ArrowLeftRight className="w-4 h-4 text-info" />
                      Transfer
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">Antar lokasi</CardDescription>
                  </CardHeader>
                  <CardContent className="relative">
                    <p className="text-3xl font-bold text-info mb-3">
                      {stats?.totalTransfers ?? 0}
                    </p>
                    <div className="flex justify-between text-xs text-muted-foreground bg-muted/30 rounded-lg p-2">
                      <span className="font-medium">Ke Soko: {stats?.transferBreakdown.toSoko ?? 0}</span>
                      <span className="font-medium">Ke Mbutoh: {stats?.transferBreakdown.toMbutoh ?? 0}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Stok Malam */}
                <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-card via-card/95 to-card/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 opacity-50" />
                  <CardHeader className="relative pb-2">
                    <CardTitle className="text-base font-semibold text-foreground/90 flex items-center gap-2">
                      <PackageOpen className="w-4 h-4 text-primary" />
                      Stok Malam
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">Stok akhir hari</CardDescription>
                  </CardHeader>
                  <CardContent className="relative">
                    <p className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent mb-3">
                      {stats?.totalNightStock ?? 0}
                    </p>
                    <div className="flex justify-between text-xs text-muted-foreground bg-muted/30 rounded-lg p-2">
                      <span className="font-medium">Mbutoh: {stats?.breakdown['MBUTOH']?.night_stock ?? 0}</span>
                      <span className="font-medium">Soko: {stats?.breakdown['SOKO']?.night_stock ?? 0}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Total Stok Akhir */}
                <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-card via-card/95 to-card/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 md:col-span-2 lg:col-span-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-accent/10 opacity-50" />
                  <CardHeader className="relative pb-2">
                    <CardTitle className="text-base font-semibold text-foreground/90 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-accent" />
                      Total Stok Akhir
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">Semua lokasi gabungan</CardDescription>
                  </CardHeader>
                  <CardContent className="relative">
                    <p className="text-3xl font-bold text-accent-foreground mb-3">
                      {stats?.totalFinalStock ?? 0}
                    </p>
                    <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2">
                      Stok tersedia saat ini
                    </div>
                  </CardContent>
                </Card>
              </div>

            </div>
          )}

          {/* Stock Table View */}
          {activeTab === 'table' && (
            <StockTable selectedDate={date} />
          )}

          {/* Analytics View */}
          {activeTab === 'analytics' && (
            <StockAnalytics />
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