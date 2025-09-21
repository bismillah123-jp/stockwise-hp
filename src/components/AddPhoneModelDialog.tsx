import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AddPhoneModelDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddPhoneModelDialog({ open, onOpenChange }: AddPhoneModelDialogProps) {
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    storage_capacity: '',
    color: '',
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('phone_models').insert(formData);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Model HP berhasil ditambahkan' });
      queryClient.invalidateQueries({ queryKey: ['phone-models'] });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      onOpenChange(false);
      setFormData({ brand: '', model: '', storage_capacity: '', color: '' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
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
            <Input id="brand" value={formData.brand} onChange={handleChange} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input id="model" value={formData.model} onChange={handleChange} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="storage_capacity">Kapasitas Penyimpanan</Label>
            <Input id="storage_capacity" value={formData.storage_capacity} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">Warna</Label>
            <Input id="color" value={formData.color} onChange={handleChange} />
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