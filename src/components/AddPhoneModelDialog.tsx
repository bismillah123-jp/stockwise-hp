import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
  } from "@/components/ui/popover"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
  } from "@/components/ui/command"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ChevronsUpDown } from 'lucide-react';

interface AddPhoneModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPhoneModelDialog({ open, onOpenChange }: AddPhoneModelDialogProps) {
  const [formData, setFormData] = useState({ model: '', storage_capacity: '', srp: '' });
  const [selectedBrand, setSelectedBrand] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [isAddingBrand, setIsAddingBrand] = useState(false);

  const [brandSearch, setBrandSearch] = useState('');
  const [isBrandPopoverOpen, setIsBrandPopoverOpen] = useState(false);


  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: brands, isLoading: brandsLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data, error } = await supabase.from('phone_models').select('brand').order('brand');
      if (error) throw error;
      return [...new Set(data.map((item) => item.brand))];
    },
  });

  const addModelMutation = useMutation({
    mutationFn: async (dataToInsert: { brand: string; model: string; storage_capacity: string; srp: number; }) => {
      const { error } = await supabase.from('phone_models').insert(dataToInsert);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Model HP berhasil ditambahkan' });
      queryClient.invalidateQueries({ queryKey: ['phone-models'] });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalBrand = selectedBrand;
    if (isAddingBrand) {
        if (!newBrand.trim()) {
            toast({ title: 'Error', description: 'Nama merk tidak boleh kosong.', variant: 'destructive' });
            return;
        }
        finalBrand = newBrand.trim().toUpperCase();
    }

    if (!finalBrand) {
      toast({ title: 'Error', description: 'Silakan pilih atau tambah merk.', variant: 'destructive' });
      return;
    }
    const srpValue = parseFloat(formData.srp) || 0;
    addModelMutation.mutate({ ...formData, brand: finalBrand, srp: srpValue });
  };

  const resetForm = () => {
    setFormData({ model: '', storage_capacity: '', srp: '' });
    setSelectedBrand('');
    setNewBrand('');
    setIsAddingBrand(false);
  }

  const handleBrandSelection = (brand: string) => {
    if (brand === 'add_new_brand') {
        setIsAddingBrand(true);
        setSelectedBrand('');
    } else {
        setSelectedBrand(brand);
        setIsAddingBrand(false);
    }
    setIsBrandPopoverOpen(false);
  }

  const filteredBrands = useMemo(() => {
    if (!brands) return [];
    return brands.filter(brand => brand.toLowerCase().includes(brandSearch.toLowerCase()));
  }, [brands, brandSearch]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Model HP Baru</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
              <Label htmlFor="brand">Merk</Label>
              {isAddingBrand ? (
                  <div className="flex items-center space-x-2">
                      <Input
                          value={newBrand}
                          onChange={(e) => setNewBrand(e.target.value)}
                          placeholder="cth: VIVO"
                          autoFocus
                      />
                      <Button type="button" variant="ghost" onClick={() => {
                          setIsAddingBrand(false);
                          setNewBrand('');
                      }}>Batal</Button>
                  </div>
              ) : (
                  <Popover open={isBrandPopoverOpen} onOpenChange={setIsBrandPopoverOpen}>
                      <PopoverTrigger asChild>
                      <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={isBrandPopoverOpen}
                          className="w-full justify-between"
                      >
                          {selectedBrand || "Pilih merk..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                              <CommandInput placeholder="Cari merk..." value={brandSearch} onValueChange={setBrandSearch} />
                              <CommandList>
                                  <CommandEmpty>Merk tidak ditemukan.</CommandEmpty>
                                  <CommandGroup>
                                      {filteredBrands.map((brand) => (
                                      <CommandItem
                                          key={brand}
                                          value={brand}
                                          onSelect={() => handleBrandSelection(brand)}
                                      >
                                          {brand}
                                      </CommandItem>
                                      ))}
                                      <CommandItem
                                          key="add_new_brand"
                                          value="add_new_brand"
                                          onSelect={() => handleBrandSelection('add_new_brand')}
                                          className="font-bold text-primary"
                                      >
                                          Tambah Merk Baru...
                                      </CommandItem>
                                  </CommandGroup>
                              </CommandList>
                          </Command>
                      </PopoverContent>
                  </Popover>
              )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input id="model" value={formData.model} onChange={(e) => setFormData({...formData, model: e.target.value})} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="storage_capacity">Kapasitas Penyimpanan</Label>
            <Input id="storage_capacity" value={formData.storage_capacity} onChange={(e) => setFormData({...formData, storage_capacity: e.target.value})} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="srp">SRP (Harga Eceran yang Disarankan)</Label>
            <Input 
              id="srp" 
              type="number" 
              min="0"
              step="1000"
              value={formData.srp} 
              onChange={(e) => setFormData({...formData, srp: e.target.value})}
              placeholder="cth: 5000000"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={addModelMutation.isPending}>
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}