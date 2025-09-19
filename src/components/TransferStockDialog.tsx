import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ArrowRightLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PhoneModel, Location } from "@/types";

export function TransferStockDialog() {
  const [open, setOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState('');
  const [formData, setFormData] = useState({
    from_location_id: '',
    to_location_id: '',
    phone_model_id: '',
    quantity: '',
    notes: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: locations } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('stock_locations').select('*').order('name');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: brands } = useQuery<string[]>({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data, error } = await supabase.from('phone_models').select('brand').order('brand');
      if (error) throw error;
      return [...new Set(data?.map(item => item.brand) || [])];
    }
  });

  const { data: phoneModels } = useQuery<PhoneModel[]>({
    queryKey: ['phone-models', selectedBrand],
    queryFn: async () => {
      if (!selectedBrand) return [];
      const { data, error } = await supabase.from('phone_models').select('*').eq('brand', selectedBrand).order('model');
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedBrand
  });

  const transferMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('transfer_stock', {
        from_location_id: formData.from_location_id,
        to_location_id: formData.to_location_id,
        p_phone_model_id: formData.phone_model_id,
        p_quantity: parseInt(formData.quantity),
        p_notes: formData.notes
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Stock Transfer Successful",
        description: `Successfully transferred ${formData.quantity} units.`,
      });
      queryClient.invalidateQueries({ queryKey: ['stock-entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setOpen(false);
      // Reset form state
      setSelectedBrand('');
      setFormData({ from_location_id: '', to_location_id: '', phone_model_id: '', quantity: '', notes: '' });
    },
    onError: (error: any) => {
      toast({
        title: "Transfer Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.from_location_id === formData.to_location_id) {
      toast({ title: "Invalid locations", description: "Cannot transfer to the same location.", variant: "destructive" });
      return;
    }
    if (!formData.from_location_id || !formData.to_location_id || !formData.phone_model_id || !formData.quantity) {
      toast({ title: "Missing fields", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }
    transferMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ArrowRightLeft className="w-4 h-4 mr-2" />
          Transfer Stok
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Transfer Stok Antar Cabang</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>From Location</Label>
              <Select value={formData.from_location_id} onValueChange={(v) => setFormData({...formData, from_location_id: v})}>
                <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                <SelectContent>{locations?.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>To Location</Label>
              <Select value={formData.to_location_id} onValueChange={(v) => setFormData({...formData, to_location_id: v})}>
                <SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger>
                <SelectContent>{locations?.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Brand</Label>
            <Select value={selectedBrand} onValueChange={(v) => { setSelectedBrand(v); setFormData({...formData, phone_model_id: ''}); }}>
              <SelectTrigger><SelectValue placeholder="Select brand" /></SelectTrigger>
              <SelectContent>{brands?.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Phone Model</Label>
            <Select value={formData.phone_model_id} onValueChange={(v) => setFormData({...formData, phone_model_id: v})} disabled={!selectedBrand}>
              <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
              <SelectContent>{phoneModels?.map(m => <SelectItem key={m.id} value={m.id}>{m.model} {m.storage_capacity} - {m.color}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Quantity</Label>
            <Input type="number" min="1" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Optional transfer notes..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={transferMutation.isPending}>
              {transferMutation.isPending ? "Processing..." : "Initiate Transfer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
