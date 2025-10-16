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

interface UnifiedTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type EventType = 'masuk' | 'laku' | 'retur_in' | 'retur_out' | 'transfer_in' | 'transfer_out' | 'koreksi';

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  masuk: 'HP Datang (Masuk)',
  laku: 'Terjual (Laku)',
  retur_in: 'Retur ke Toko',
  retur_out: 'Retur ke Supplier',
  transfer_in: 'Transfer Masuk',
  transfer_out: 'Transfer Keluar',
  koreksi: 'Koreksi Stok',
};

export function UnifiedTransactionDialog({ open, onOpenChange }: UnifiedTransactionDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [eventType, setEventType] = useState<EventType>('masuk');
  const [notes, setNotes] = useState<string>("");
  const [imei, setImei] = useState<string>("");
  const [costPrice, setCostPrice] = useState<string>("");
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

  const transactionMutation = useMutation({
    mutationFn: async () => {
      // Validation
      if (!selectedLocation) throw new Error('Lokasi wajib dipilih');
      if (!selectedBrand) throw new Error('Merk wajib dipilih');
      if (!selectedModel) throw new Error('Model HP wajib dipilih');
      if (!imei.trim()) throw new Error('IMEI wajib diisi');
      if (imei.trim().length < 10) throw new Error('IMEI tidak valid (minimal 10 karakter)');
      if (!eventType) throw new Error('Jenis transaksi wajib dipilih');

      const date = format(selectedDate, "yyyy-MM-dd");

      // Check if IMEI exists for laku/retur transactions
      if (['laku', 'retur_out'].includes(eventType)) {
        const { data: existingImei, error: checkError } = await supabase
          .from('stock_entries')
          .select('id, night_stock')
          .eq('imei', imei.trim())
          .eq('location_id', selectedLocation)
          .eq('date', date)
          .maybeSingle();

        if (checkError) throw new Error(`Gagal memeriksa IMEI: ${checkError.message}`);
        
        if (!existingImei || existingImei.night_stock === 0) {
          throw new Error('IMEI tidak ditemukan di stok lokasi ini');
        }
      }

      // Check IMEI duplicate for masuk/retur_in
      if (['masuk', 'retur_in'].includes(eventType)) {
        const { data: existingImei, error: checkError } = await supabase
          .from('stock_events')
          .select('id')
          .eq('imei', imei.trim())
          .eq('location_id', selectedLocation)
          .in('event_type', ['masuk', 'retur_in'])
          .maybeSingle();

        if (checkError) throw new Error(`Gagal memeriksa IMEI: ${checkError.message}`);
        
        if (existingImei) {
          throw new Error('IMEI ini sudah terdaftar di sistem');
        }
      }

      const costPriceNum = costPrice ? parseInt(costPrice.replace(/\./g, '')) : 0;

      // 1. Insert event to stock_events (primary source)
      const { error: eventError } = await supabase
        .from('stock_events')
        .insert({
          date,
          imei: imei.trim(),
          location_id: selectedLocation,
          phone_model_id: selectedModel,
          event_type: eventType,
          qty: 1,
          notes: notes || null,
          metadata: costPriceNum > 0 ? { cost_price: costPriceNum } : {}
        });

      if (eventError) throw new Error(`Gagal menyimpan event: ${eventError.message}`);

      // 2. Trigger cascade happens automatically via database trigger
      // No need for manual cascade call

      toast({
        title: "Berhasil",
        description: `Transaksi ${EVENT_TYPE_LABELS[eventType]} berhasil dicatat`,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['stock-events'] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Gagal",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setSelectedLocation("");
    setSelectedDate(new Date());
    setSelectedBrand("");
    setSelectedModel("");
    setEventType('masuk');
    setNotes("");
    setImei("");
    setCostPrice("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transaksi Stok</DialogTitle>
          <DialogDescription>
            Catat transaksi stok dengan IMEI tracking otomatis
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Event Type */}
          <div className="space-y-2">
            <Label>Jenis Transaksi *</Label>
            <Select value={eventType} onValueChange={(val) => setEventType(val as EventType)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih jenis transaksi" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
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

          {/* Location */}
          <div className="space-y-2">
            <Label>Lokasi *</Label>
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

          {/* Brand */}
          <div className="space-y-2">
            <Label>Merk *</Label>
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

          {/* Model */}
          <div className="space-y-2">
            <Label>Model HP *</Label>
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

          {/* IMEI */}
          <div className="space-y-2">
            <Label>IMEI *</Label>
            <Input
              placeholder="Masukkan IMEI (wajib)"
              value={imei}
              onChange={(e) => setImei(e.target.value)}
              inputMode="numeric"
              required
            />
            <p className="text-sm text-muted-foreground">1 IMEI = 1 unit stok</p>
          </div>

          {/* Cost Price (only for masuk/retur_in) */}
          {['masuk', 'retur_in'].includes(eventType) && (
            <div className="space-y-2">
              <Label>Harga Modal (Opsional)</Label>
              <Input
                placeholder="Masukkan harga modal"
                value={costPrice}
                onChange={(e) => {
                  const numOnly = e.target.value.replace(/\D/g, '');
                  setCostPrice(numOnly ? parseInt(numOnly).toLocaleString('id-ID') : '');
                }}
                inputMode="numeric"
              />
              <p className="text-sm text-muted-foreground">Untuk perhitungan laba/rugi yang akurat</p>
            </div>
          )}

          {/* Notes */}
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
              onClick={() => transactionMutation.mutate()} 
              disabled={transactionMutation.isPending}
              className="flex-1"
            >
              {transactionMutation.isPending ? "Memproses..." : "Simpan Transaksi"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

