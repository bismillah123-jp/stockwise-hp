import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface AddStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddStockDialog({ open, onOpenChange }: AddStockDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [imei, setImei] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch locations
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

  // Fetch brands
  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phone_models')
        .select('brand')
        .order('brand');
      if (error) throw error;
      return [...new Set(data.map(item => item.brand))];
    }
  });

  // Fetch models based on selected brand
  const { data: phoneModels } = useQuery({
    queryKey: ['phone-models', selectedBrand],
    queryFn: async () => {
      if (!selectedBrand) return [];
      const { data, error } = await supabase
        .from('phone_models')
        .select('*')
        .eq('brand', selectedBrand)
        .order('model');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedBrand
  });

  const addStockMutation = useMutation({
    mutationFn: async () => {
      if (!selectedLocation || !selectedModel || !imei.trim()) {
        throw new Error('Lokasi, Model HP, dan IMEI wajib diisi');
      }

      const date = format(selectedDate, "yyyy-MM-dd");
      const quantityNum = 1; // Always 1 since 1 IMEI = 1 stock

      // Add Stock: Creates a new entry representing corrected morning inventory
      // Both morning_stock and add_stock are set to represent this is a morning stock correction
      const { data: newEntry, error: insertError } = await supabase
        .from('stock_entries')
        .insert({
          date: date,
          location_id: selectedLocation,
          phone_model_id: selectedModel,
          morning_stock: quantityNum, // This represents the corrected morning stock
          add_stock: quantityNum, // This ensures night_stock is also increased via trigger
          imei: imei.trim(),
          notes: notes || null,
          // Other fields default to 0 in the DB
        })
        .select()
        .single();

      if (insertError) {
        // Handle unique constraint violation
        if (insertError.code === '23505') {
          throw new Error(`Gagal: IMEI ${imei.trim()} sudah ada untuk model ini.`);
        }
        throw new Error(`Gagal menambahkan stok: ${insertError.message}`);
      }

      // Log the transaction if the new entry was created successfully
      if (newEntry) {
        await supabase
          .from('stock_transactions_log')
          .insert({
            stock_entry_id: newEntry.id,
            transaction_type: 'add_stock',
            quantity: quantityNum,
            previous_night_stock: 0, // It's a new item, so previous stock is 0
            new_night_stock: newEntry.night_stock, // This value is calculated by the DB trigger
            notes: `Stok baru ditambahkan: ${notes || 'Tanpa catatan'}`
          });
      }
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Stok berhasil ditambahkan",
      });
      queryClient.invalidateQueries({ queryKey: ['stock-entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      onOpenChange(false);
      // Reset form
      setSelectedLocation("");
      setSelectedDate(new Date());
      setSelectedBrand("");
      setSelectedModel("");
      setNotes("");
      setImei("");
    },
    onError: (error: any) => {
      toast({
        title: "Gagal",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Stok</DialogTitle>
          <DialogDescription>
            Tambah stok untuk tanggal yang dipilih.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tanggal</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => d && setSelectedDate(d)}
                  disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Lokasi</Label>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih lokasi" />
              </SelectTrigger>
              <SelectContent>
                {locations?.map(location => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Merk</Label>
            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih merk" />
              </SelectTrigger>
              <SelectContent>
                {brands?.map(brand => (
                  <SelectItem key={brand} value={brand}>
                    {brand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Model HP</Label>
            <Select value={selectedModel} onValueChange={setSelectedModel} disabled={!selectedBrand}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih model HP" />
              </SelectTrigger>
              <SelectContent>
                {phoneModels?.map(model => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.model} {model.storage_capacity && `- ${model.storage_capacity}`} {model.color && `- ${model.color}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>IMEI *</Label>
            <Input
              placeholder="Masukkan IMEI (wajib)"
              value={imei}
              onChange={(e) => setImei(e.target.value)}
              required
            />
            <p className="text-sm text-muted-foreground">1 IMEI = 1 unit stok</p>
          </div>

          <div className="space-y-2">
            <Label>Catatan (Opsional)</Label>
            <Textarea
              placeholder="Tambahkan catatan..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Batal
            </Button>
            <Button 
              onClick={() => addStockMutation.mutate()} 
              disabled={addStockMutation.isPending}
              className="flex-1"
            >
              {addStockMutation.isPending ? "Memproses..." : "Tambah Stok"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}