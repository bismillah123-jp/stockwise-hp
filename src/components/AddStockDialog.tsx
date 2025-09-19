import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Truck, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AddLocationDialog } from "./AddLocationDialog";
import { AddPhoneModelDialog } from "./AddPhoneModelDialog";
import { PhoneModel, Location } from "@/types";

interface AddStockDialogProps {
  onSuccess?: () => void;
}

export function AddStockDialog({ onSuccess }: AddStockDialogProps) {
  const [open, setOpen] = useState(false);
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
      const today = new Date().toISOString().split('T')[0];
      const quantity = parseInt(formData.quantity);

      if (!quantity || quantity <= 0) {
        throw new Error('Please enter a valid quantity');
      }

      const { data: existingEntry } = await supabase
        .from('stock_entries')
        .select('*')
        .eq('date', today)
        .eq('location_id', formData.location_id)
        .eq('phone_model_id', formData.phone_model_id)
        .eq('imei', formData.imei || null)
        .maybeSingle();

      if (existingEntry) {
        const { error } = await supabase
          .from('stock_entries')
          .update({ incoming: existingEntry.incoming + quantity, notes: formData.notes || existingEntry.notes })
          .eq('id', existingEntry.id);
        if (error) throw error;
      } else {
        const newEntry = {
          date: today,
          location_id: formData.location_id,
          phone_model_id: formData.phone_model_id,
          imei: formData.imei || null,
          morning_stock: 0,
          night_stock: 0,
          incoming: quantity,
          add_stock: 0,
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
        title: "Stock updated successfully",
        description: `Recorded ${formData.quantity} incoming units.`,
      });
      setSelectedBrand('');
      setFormData({ location_id: '', phone_model_id: '', imei: '', quantity: '', notes: '' });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['stock-entries'] });
      setOpen(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating stock",
        description: error.message || "An error occurred.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.location_id || !formData.phone_model_id || !formData.quantity) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    stockMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Truck className="w-4 h-4 mr-2" />
          HP Datang (Hari Ini)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Input HP Datang (Hari Ini)</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col sm:flex-row gap-4 py-4">
            <div className="w-full sm:w-1/4 space-y-4">
                <h3 className="font-semibold">Manajemen</h3>
                <div className="flex flex-col gap-2">
                    <AddLocationDialog />
                    <AddPhoneModelDialog />
                </div>
            </div>
            <div className="w-full sm:w-3/4">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="location">Location *</Label>
                            <Select value={formData.location_id} onValueChange={(value) => setFormData({...formData, location_id: value})}>
                                <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                                <SelectContent>{locations?.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
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
                                <SelectTrigger><SelectValue placeholder={!selectedBrand ? "Select brand first" : "Select model"} /></SelectTrigger>
                                <SelectContent>{phoneModels?.map(m => <SelectItem key={m.id} value={m.id}>{m.model} {m.storage_capacity} - {m.color}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="imei">IMEI</Label>
                            <Input id="imei" value={formData.imei} onChange={(e) => setFormData({...formData, imei: e.target.value})} placeholder="Optional IMEI" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="quantity">Quantity *</Label>
                            <Input id="quantity" type="number" min="1" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} placeholder="Enter quantity" required />
                        </div>
                    </div>
                    <div className="space-y-2 col-span-full">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea id="notes" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Optional notes..." rows={2} />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={stockMutation.isPending}>
                            {stockMutation.isPending ? 'Processing...' : 'Record Incoming'}
                        </Button>
                    </DialogFooter>
                </form>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
