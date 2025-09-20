import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
  const [quantity, setQuantity] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
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
      if (!selectedLocation || !selectedModel || !quantity) {
        throw new Error('Semua field wajib diisi');
      }

      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const quantityNum = parseInt(quantity);

      // Find the phone model
      const phoneModel = phoneModels?.find(m => m.id === selectedModel);
      if (!phoneModel) throw new Error('Model HP tidak ditemukan');

      // Check if stock entry exists for this date, location, and model
      const { data: existingEntry, error: fetchError } = await supabase
        .from('stock_entries')
        .select('*')
        .eq('date', dateStr)
        .eq('location_id', selectedLocation)
        .eq('phone_model_id', selectedModel)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingEntry) {
        // Update existing entry - add to morning_stock and recalculate night_stock
        const newMorningStock = existingEntry.morning_stock + quantityNum;
        const newNightStock = newMorningStock + existingEntry.incoming + existingEntry.add_stock + 
                             existingEntry.returns + existingEntry.adjustment - existingEntry.sold;

        const { error: updateError } = await supabase
          .from('stock_entries')
          .update({
            morning_stock: newMorningStock,
            night_stock: newNightStock,
            notes: notes || existingEntry.notes
          })
          .eq('id', existingEntry.id);

        if (updateError) throw updateError;

        // Log the transaction
        await supabase
          .from('stock_transactions_log')
          .insert({
            stock_entry_id: existingEntry.id,
            transaction_type: 'add_stock_retroactive',
            quantity: quantityNum,
            previous_night_stock: existingEntry.night_stock,
            new_night_stock: newNightStock,
            created_by: (await supabase.auth.getUser()).data.user?.id,
            notes: `Tambah stok retroaktif: ${notes || 'Tanpa catatan'}`
          });
      } else {
        // Create new entry
        const { error: insertError } = await supabase
          .from('stock_entries')
          .insert({
            date: dateStr,
            location_id: selectedLocation,
            phone_model_id: selectedModel,
            morning_stock: quantityNum,
            night_stock: quantityNum, // Will be calculated by trigger
            notes: notes || null
          });

        if (insertError) throw insertError;
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
      setSelectedBrand("");
      setSelectedModel("");
      setQuantity("");
      setNotes("");
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
            Tambah stok untuk hari sebelumnya atau yang terlewat
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tanggal</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP", { locale: id }) : "Pilih tanggal"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
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
            <Label>Jumlah</Label>
            <Input
              type="number"
              placeholder="Masukkan jumlah"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
            />
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