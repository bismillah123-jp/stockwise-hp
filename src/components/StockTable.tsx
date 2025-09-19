import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Search, Filter, Edit, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StockEntry } from "@/types";
import { EditStockDialog } from "./EditStockDialog";

interface StockTableProps {
  selectedLocation: string;
}

export function StockTable({ selectedLocation }: StockTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<StockEntry | null>(null);

  const { data: stockEntries, isLoading } = useQuery({
    queryKey: ['stock-entries', selectedLocation, searchTerm, brandFilter],
    queryFn: async (): Promise<StockEntry[]> => {
      let query = supabase
        .from('stock_entries')
        .select(`
          *,
          stock_locations(name),
          phone_models(brand, model, storage_capacity, color)
        `)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

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

      let filtered = data || [];

      // Apply search filter
      if (searchTerm) {
        filtered = filtered.filter(entry => 
          entry.phone_models?.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.phone_models?.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.imei?.includes(searchTerm) ||
          entry.phone_models?.color?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Apply brand filter
      if (brandFilter !== 'all') {
        filtered = filtered.filter(entry => 
          entry.phone_models?.brand === brandFilter
        );
      }

      return filtered;
    }
  });

  const { data: brands } = useQuery({
    queryKey: ['phone-brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phone_models')
        .select('brand')
        .order('brand');
      
      if (error) throw error;
      
      const uniqueBrands = [...new Set(data?.map(item => item.brand) || [])];
      return uniqueBrands;
    }
  });

  const getStockStatus = (nightStock: number) => {
    if (nightStock === 0) return { label: "Out of Stock", variant: "destructive" as const };
    if (nightStock <= 5) return { label: "Low Stock", variant: "warning" as const };
    return { label: "In Stock", variant: "success" as const };
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5" />
          Stock Inventory
        </CardTitle>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by brand, model, IMEI, or color..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-full sm:w-48 text-sm">
              <SelectValue placeholder="Filter by brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {brands?.map(brand => (
                <SelectItem key={brand} value={brand}>
                  {brand}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-12 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                  <TableHead>Date</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="min-w-[200px]">Brand & Model</TableHead>
                  <TableHead>IMEI</TableHead>
                  <TableHead>Morning</TableHead>
                  <TableHead>Night</TableHead>
                  <TableHead>Incoming</TableHead>
                  <TableHead>Sold</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockEntries?.map((entry) => {
                  const status = getStockStatus(entry.night_stock);
                  return (
                    <TableRow key={entry.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-medium">
                        {new Date(entry.date).toLocaleDateString('id-ID')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {entry.stock_locations?.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-sm">
                            {entry.phone_models?.brand} {entry.phone_models?.model}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {entry.phone_models?.storage_capacity} • {entry.phone_models?.color}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {entry.imei || "—"}
                      </TableCell>
                      <TableCell className="text-center font-medium">{entry.morning_stock}</TableCell>
                      <TableCell className="text-center font-bold">{entry.night_stock}</TableCell>
                      <TableCell className="text-center text-blue-500">
                        {entry.incoming > 0 ? `+${entry.incoming}` : "—"}
                      </TableCell>
                      <TableCell className="text-center text-green-500">
                        {entry.sold > 0 ? `-${entry.sold}` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant} className="text-xs font-medium">
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setSelectedEntry(entry);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
            
            {stockEntries?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No stock entries found.
              </div>
            )}
          </div>
        )}
      </CardContent>
      <EditStockDialog
        entry={selectedEntry}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />
    </Card>
  );
}