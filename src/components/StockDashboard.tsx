import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Truck, TrendingUp, AlertTriangle, Package, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { StockTable } from "./StockTable";
import { ManualStockInput } from "./ManualStockInput";
import { StockAnalytics } from "./StockAnalytics";
import { ThemeToggle } from "./ThemeToggle";

interface DashboardStats {
  todaySales: number;
  totalNightStock: number;
  incomingHP: number;
  discrepancies: number;
}

interface StockEntry {
  id: string;
  date: string;
  location: string;
  brand: string;
  model: string;
  imei: string | null;
  color: string | null;
  morning_stock: number;
  night_stock: number;
  incoming: number;
  add_stock: number;
  returns: number;
  sold: number;
  adjustment: number;
  notes: string | null;
}

export function StockDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'table' | 'analytics'>('dashboard');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const { toast } = useToast();

  // Fetch dashboard statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats', selectedLocation],
    queryFn: async (): Promise<DashboardStats> => {
      const today = new Date().toISOString().split('T')[0];
      
      let query = supabase
        .from('stock_entries')
        .select(`
          sold,
          night_stock,
          incoming,
          adjustment,
          stock_locations(name),
          phone_models(brand, model)
        `)
        .eq('date', today);

      if (selectedLocation !== 'all') {
        query = query.eq('stock_locations.name', selectedLocation);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      const todaySales = data?.reduce((sum, entry) => sum + entry.sold, 0) || 0;
      const totalNightStock = data?.reduce((sum, entry) => sum + entry.night_stock, 0) || 0;
      const incomingHP = data?.reduce((sum, entry) => sum + entry.incoming, 0) || 0;
      const discrepancies = data?.filter(entry => entry.adjustment !== 0).length || 0;

      return {
        todaySales,
        totalNightStock,
        incomingHP,
        discrepancies
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/30">
        <div className="container mx-auto px-4 lg:px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                HP Stock Management
              </h1>
              <p className="text-muted-foreground mt-1">Real-time inventory tracking & analytics</p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All Locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {locations?.map(location => (
                    <SelectItem key={location.id} value={location.name}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-gradient-to-r from-primary/20 to-accent/20">
                  Live Data
                </Badge>
                <ThemeToggle />
                <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs - Desktop (top) */}
      <div className="hidden md:block border-b border-border bg-card/30">
        <div className="container mx-auto px-4 lg:px-6 py-3">
          <div className="flex gap-2 overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'table', label: 'Stock Table', icon: Package },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "ghost"}
                  onClick={() => setActiveTab(tab.id as any)}
                  className="flex items-center gap-2 text-sm whitespace-nowrap"
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 lg:px-6 py-4 pb-20 md:pb-4">
        {/* Dashboard View */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {[
                {
                  title: "Today's Sales",
                  value: stats?.todaySales || 0,
                  icon: TrendingUp,
                  color: "from-success to-success/80",
                  loading: statsLoading
                },
                {
                  title: "Night Stock",
                  value: stats?.totalNightStock || 0,
                  icon: Package,
                  color: "from-primary to-accent",
                  loading: statsLoading
                },
                {
                  title: "Incoming HP",
                  value: stats?.incomingHP || 0,
                  icon: Truck,
                  color: "from-info to-info/80",
                  loading: statsLoading
                },
                {
                  title: "Discrepancies",
                  value: stats?.discrepancies || 0,
                  icon: AlertTriangle,
                  color: "from-warning to-warning/80",
                  loading: statsLoading
                }
              ].map((kpi, index) => {
                const Icon = kpi.icon;
                return (
                  <Card key={index} className="relative overflow-hidden border-border/50 bg-card/50 backdrop-blur">
                    <div className={`absolute inset-0 bg-gradient-to-br ${kpi.color} opacity-5`} />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {kpi.title}
                      </CardTitle>
                      <Icon className={`h-5 w-5 bg-gradient-to-br ${kpi.color} bg-clip-text text-transparent`} />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {kpi.loading ? (
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

            {/* Manual Input Section */}
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Manual Stock Input
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ManualStockInput onSuccess={() => {
                  toast({
                    title: "Stock updated successfully",
                    description: "The stock entry has been processed.",
                  });
                }} />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Stock Table View */}
        {activeTab === 'table' && (
          <StockTable selectedLocation={selectedLocation} />
        )}

        {/* Analytics View */}
        {activeTab === 'analytics' && (
          <StockAnalytics selectedLocation={selectedLocation} />
        )}
      </div>

      {/* Mobile Navigation - Bottom */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur border-t border-border">
        <div className="flex justify-around py-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
            { id: 'table', label: 'Table', icon: Package },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Button
                key={tab.id}
                variant="ghost"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex flex-col items-center gap-1 h-auto py-3 px-2 ${
                  isActive ? 'text-primary bg-primary/10' : 'text-muted-foreground'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                <span className="text-xs">{tab.label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}