import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Search, Edit, ArrowRightLeft, Trash2, CheckCircle, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { EditStockDialog } from "./EditStockDialog";
import { TransferStockDialog } from "./TransferStockDialog";
import { Tables } from "@/integrations/supabase/types";
import { Skeleton } from "./ui/skeleton";

// Define a comprehensive type for our stock unit, including related data
export type StockUnit = Tables<'stock_units'> & {
  phone_models: Pick<Tables<'phone_models'>, 'model' | 'storage_capacity' | 'color' | 'id'> & {
    brands: Pick<Tables<'brands'>, 'name' | 'id'>
  };
  stock_locations: Pick<Tables<'stock_locations'>, 'name' | 'id'>;
};

interface StockTableProps {
  selectedDate: Date;
}

export function StockTable({ selectedDate }: StockTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSellDialogOpen, setIsSellDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<StockUnit | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch locations
  const { data: locations, isLoading: locationsLoading } = useQuery({
    queryKey: ['stock_locations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('stock_locations').select('*');
      if (error) throw error;
      return data;
    }
  });

  // Set default location once locations are loaded
  useEffect(() => {
    if (locations && locations.length > 0 && !selectedLocationId) {
      setSelectedLocationId(locations[0].id);
    }
  }, [locations, selectedLocationId]);

  // Fetch stock units for the selected date and location
  const { data: stockUnits, isLoading: stockLoading } = useQuery({
    queryKey: ['stock-units', selectedDate, selectedLocationId, searchTerm, brandFilter],
    queryFn: async (): Promise<StockUnit[]> => {
      if (!selectedLocationId) return [];

      const date = format(selectedDate, "yyyy-MM-dd");
      
      // Fetch all data needed in parallel
      const [stockRes, modelsRes, locationsRes] = await Promise.all([
        supabase.rpc('get_stock_by_date', { p_report_date: date, p_location_id: selectedLocationId }),
        supabase.from('phone_models').select('*, brands!inner(*)'),
        supabase.from('stock_locations').select('*')
      ]);

      if (stockRes.error) throw stockRes.error;
      if (modelsRes.error) throw modelsRes.error;
      if (locationsRes.error) throw locationsRes.error;

      const units = stockRes.data || [];
      const models = modelsRes.data || [];
      const allLocations = locationsRes.data || [];

      // Join data on the client-side
      let joinedData: StockUnit[] = units.map(unit => {
        const model = models.find(m => m.id === unit.phone_model_id);
        const location = allLocations.find(l => l.id === unit.location_id);
        return {
          ...unit,
          phone_models: {
            id: model?.id || '',
            model: model?.model || 'Unknown',
            storage_capacity: model?.storage_capacity || '',
            color: model?.color || '',
            brands: {
              id: model?.brands?.id || '',
              name: model?.brands?.name || 'Unknown',
            }
          },
          stock_locations: {
            id: location?.id || '',
            name: location?.name || 'Unknown'
          }
        };
      });

      // Apply search and brand filters
      if (searchTerm) {
        joinedData = joinedData.filter(unit =>
          unit.imei.toLowerCase().includes(searchTerm.toLowerCase()) ||
          unit.phone_models.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
          unit.phone_models.brands.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      if (brandFilter !== 'all') {
        joinedData = joinedData.filter(unit => unit.phone_models.brands.id === brandFilter);
      }

      return joinedData;
    },
    enabled: !!selectedLocationId, // Only run query if a location is selected
  });

  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_brands');
      if (error) throw error;
      return data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (unitId: string) => {
      const { error } = await supabase.rpc('delete_stock_unit', { p_unit_id: unitId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sukses", description: "Unit stok telah berhasil dihapus." });
      queryClient.invalidateQueries({ queryKey: ['stock-units'] });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Gagal menghapus unit: ${error.message}`, variant: "destructive" });
    },
    onSettled: () => setIsDeleteDialogOpen(false)
  });

  const sellMutation = useMutation({
    mutationFn: async (unit: StockUnit) => {
      const { error } = await supabase.rpc('sell_stock_unit', { p_imei: unit.imei, p_sell_date: format(selectedDate, 'yyyy-MM-dd'), p_notes: 'Sold from UI' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Sukses", description: "Unit telah ditandai sebagai terjual." });
      queryClient.invalidateQueries({ queryKey: ['stock-units'] });
    },
    onError: (error) => {
      toast({ title: "Error", description: `Gagal menjual unit: ${error.message}`, variant: "destructive" });
    },
    onSettled: () => setIsSellDialogOpen(false)
  });

  const isLoading = stockLoading || locationsLoading;

  return (
    <>
      <Card className="border-border/50 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Inventori Stok
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari berdasarkan merk, model, atau IMEI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {/* // TODO: Add a location selector dropdown here */}
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 py-2 text-sm min-w-32"
            >
              <option value="all">Semua Merk</option>
              {brands?.map(brand => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
          ) : (
            <div className="rounded-lg border border-border/50 overflow-hidden">
              <Table>
                <TableHeader><TableRow className="bg-muted/30">
                  <TableHead>Tipe</TableHead>
                  <TableHead>IMEI</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tanggal Masuk</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {stockUnits?.map((unit) => (
                    <TableRow key={unit.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell>
                        <div className="font-medium">{unit.phone_models.brands.name} {unit.phone_models.model}</div>
                        <div className="text-xs text-muted-foreground">{unit.phone_models.storage_capacity} • {unit.phone_models.color}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{unit.imei}</TableCell>
                      <TableCell><Badge variant="outline">{unit.stock_locations.name}</Badge></TableCell>
                      <TableCell><Badge variant={unit.status === 'available' ? 'success' : 'destructive'}>{unit.status}</Badge></TableCell>
                      <TableCell>{format(new Date(unit.entry_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedUnit(unit); setIsSellDialogOpen(true); }} disabled={unit.status !== 'available'}>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedUnit(unit); setIsTransferDialogOpen(true); }} disabled={unit.status !== 'available'}>
                          <ArrowRightLeft className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedUnit(unit); setIsEditDialogOpen(true); }}>
                          <Edit className="h-4 w-4 text-yellow-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedUnit(unit); setIsDeleteDialogOpen(true); }}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {stockUnits?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">Tidak ada data stok untuk tanggal dan lokasi ini.</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Anda yakin?</AlertDialogTitle><AlertDialogDescription>Tindakan ini akan menghapus unit stok secara permanen.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => selectedUnit && deleteMutation.mutate(selectedUnit.id)}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isSellDialogOpen} onOpenChange={setIsSellDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Tandai sebagai Terjual?</AlertDialogTitle><AlertDialogDescription>Anda akan menandai unit IMEI {selectedUnit?.imei} sebagai terjual pada tanggal {format(selectedDate, 'dd MMM yyyy')}.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => selectedUnit && sellMutation.mutate(selectedUnit)}>Ya, Tandai</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EditStockDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} stockUnit={selectedUnit} />
      <TransferStockDialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen} stockUnit={selectedUnit} selectedDate={selectedDate} />
    </>
  );
}