import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PhoneModel, Location } from "@/types";

interface AddBackdatedStockDialogProps {
  onSuccess?: () => void;
}

export function AddBackdatedStockDialog({ onSuccess }: AddBackdatedStockDialogProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedBrand, setSelectedBrand] = useState('');
  const [formData, setFormData] = useState({
    location_id: '',
    phone_model_id: '',
    imei: '',
    quantity: '',
    notes: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async (): Promise<Location[]> => {
      const { data, error } = await supabase.from('stock_locations').select('*').order('name');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase.from('phone_models').select('brand').order('brand');
      if (error) throw error;
      return [...new Set(data?.map(item => item.brand) || [])];
    }
  });

  const { data: phoneModels } = useQuery({
    queryKey: ['phone-models', selectedBrand],
    queryFn: async (): Promise<PhoneModel[]> => {
      if (!selectedBrand) return [];
      const { data, error } = await supabase.from('phone_models').select('*').eq('brand', selectedBrand).order('model');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBrand
  });

  const stockMutation = useMutation({
    mutationFn: async () => {
      const selectedDate = date ? format(date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
      const quantity = parseInt(formData.quantity);

      if (!quantity || quantity <= 0) throw new Error('Please enter a valid quantity');
      if (!date) throw new Error('Please select a date');

      const { data: existingEntry } = await supabase
        .from('stock_entries')
        .select('*')
        .eq('date', selectedDate)
        .eq('location_id', formData.location_id)
        .eq('phone_model_id', formData.phone_model_id)
        .eq('imei', formData.imei || null)
        .maybeSingle();

      if (existingEntry) {
        const { error } = await supabase
          .from('stock_entries')
          .update({
            add_stock: existingEntry.add_stock + quantity,
            morning_stock: existingEntry.morning_stock + quantity,
            notes: formData.notes || existingEntry.notes
          })
          .eq('id', existingEntry.id);
        if (error) throw error;
      } else {
        const newEntry = {
          date: selectedDate,
          location_id: formData.location_id,
          phone_model_id: formData.phone_model_id,
          imei: formData.imei || null,
          morning_stock: quantity,
          night_stock: 0,
          incoming: 0,
          add_stock: quantity,
          returns: 0,
          sold: 0,
          adjustment: 0,
          notes: formData.notes || null
        };
        const { error } = await supabase.from('stock_entries').insert(newEntry);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Backdated stock added",
        description: `Added ${formData.quantity} units for ${format(date!, "PPP")}.`,
      });
      setSelectedBrand('');
      setFormData({ location_id: '', phone_model_id: '', imei: '', quantity: '', notes: '' });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['stock-entries'] });
      setOpen(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.location_id || !formData.phone_model_id || !formData.quantity || !date) {
      toast({ title: "Missing fields", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    stockMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Stok (Hari Lalu)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader><DialogTitle>Tambah Stok (Hari Lalu)</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus /></PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Select value={formData.location_id} onValueChange={(v) => setFormData({...formData, location_id: v})}>
                <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                <SelectContent>{locations?.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input id="quantity" type="number" min="1" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} required />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Brand *</Label>
              <Select value={selectedBrand} onValueChange={(v) => { setSelectedBrand(v); setFormData({...formData, phone_model_id: ''}); }}>
                <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
                <SelectContent>{brands?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone_model">Phone Model *</Label>
              <Select value={formData.phone_model_id} onValueChange={(v) => setFormData({...formData, phone_model_id: v})} disabled={!selectedBrand}>
                <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                <SelectContent>{phoneModels?.map(m => <SelectItem key={m.id} value={m.id}>{m.model} {m.storage_capacity} - {m.color}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="imei">IMEI</Label>
              <Input id="imei" value={formData.imei} onChange={(e) => setFormData({...formData, imei: e.target.value})} placeholder="Optional" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Optional notes..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={stockMutation.isPending}>{stockMutation.isPending ? "Saving..." : "Save Entry"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
