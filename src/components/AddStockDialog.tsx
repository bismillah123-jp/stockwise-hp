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

  const { data: locations } = useQuery({
    queryKey: ['stock_locations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('stock_locations').select('*').order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_brands');
      if (error) throw error;
      return data;
    }
  });

  const { data: phoneModels } = useQuery({
    queryKey: ['phone-models', selectedBrand],
    queryFn: async () => {
      if (!selectedBrand) return [];
      const { data, error } = await supabase
        .from('phone_models')
        .select('*')
        .eq('brand_id', selectedBrand)
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

      const { error } = await supabase.rpc('add_stock_unit', {
        p_imei: imei.trim(),
        p_phone_model_id: selectedModel,
        p_location_id: selectedLocation,
        p_entry_date: format(selectedDate, "yyyy-MM-dd"),
        p_notes: notes || ''
      });

      if (error) {
        if (error.code === '23505') { // unique_violation on imei
          throw new Error(`Gagal: IMEI ${imei.trim()} sudah ada di dalam sistem.`);
        }
        throw new Error(`Gagal menambahkan stok: ${error.message}`);
      }
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Stok berhasil ditambahkan",
      });
      queryClient.invalidateQueries({ queryKey: ['stock-units'] });
      onOpenChange(false);
      // Reset form
      setSelectedLocation("");
      setSelectedDate(new Date());
      setSelectedBrand("");
      setSelectedModel("");
      setNotes("");
      setImei("");
    },
    onError: (error: Error) => {
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
            Tambah unit stok baru ke dalam inventori.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tanggal Masuk</Label>
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
                  <SelectItem key={brand.id} value={brand.id}>
                    {brand.name}
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