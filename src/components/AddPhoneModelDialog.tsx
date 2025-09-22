import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AddPhoneModelDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddPhoneModelDialog({ open, onOpenChange }: AddPhoneModelDialogProps) {
  const [selectedBrand, setSelectedBrand] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    storage_capacity: '',
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch unique brands
  const { data: brands, isLoading: brandsLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('phone_models')
        .select('brand')
        .order('brand');
      if (error) throw error;
      // Return a unique list of brand strings
      return [...new Set(data.map((item) => item.brand))];
    },
  });

  const mutation = useMutation({
    mutationFn: async (dataToInsert: typeof formData) => {
      const { error } = await supabase.from('phone_models').insert(dataToInsert);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Model HP berhasil ditambahkan' });
      queryClient.invalidateQueries({ queryKey: ['phone-models'] });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      onOpenChange(false);
      setFormData({ brand: '', model: '', storage_capacity: '' });
      setSelectedBrand('');
      setNewBrand('');
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBrand) {
      toast({ title: 'Error', description: 'Silakan pilih merk.', variant: 'destructive' });
      return;
    }

    const finalBrand = selectedBrand === 'add_new_brand' ? newBrand.trim().toUpperCase() : selectedBrand;

    if (!finalBrand) {
        toast({ title: 'Error', description: 'Nama merk tidak boleh kosong.', variant: 'destructive' });
        return;
    }

    const dataToInsert = {
      ...formData,
      brand: finalBrand,
    };

    mutation.mutate(dataToInsert);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleBrandChange = (value: string) => {
    setSelectedBrand(value);
    if (value !== 'add_new_brand') {
      setNewBrand('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Model HP Baru</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="brand">Merk</Label>
            <Select value={selectedBrand} onValueChange={handleBrandChange}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih merk..." />
              </SelectTrigger>
              <SelectContent>
                {brandsLoading ? (
                  <SelectItem value="loading" disabled>Memuat merk...</SelectItem>
                ) : (
                  <>
                    {brands?.map((brand) => (
                      <SelectItem key={brand} value={brand}>
                        {brand}
                      </SelectItem>
                    ))}
                  </>
                )}
                <SelectItem value="add_new_brand">
                  <span className="font-bold text-primary">Tambah Merk Baru...</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedBrand === 'add_new_brand' && (
            <div className="space-y-2">
              <Label htmlFor="new_brand">Nama Merk Baru</Label>
              <Input
                id="new_brand"
                value={newBrand}
                onChange={(e) => setNewBrand(e.target.value)}
                placeholder="cth: VIVO"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input id="model" value={formData.model} onChange={handleChange} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="storage_capacity">Kapasitas Penyimpanan</Label>
            <Input id="storage_capacity" value={formData.storage_capacity} onChange={handleChange} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}