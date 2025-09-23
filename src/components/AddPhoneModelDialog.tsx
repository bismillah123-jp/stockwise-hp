import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { MoreHorizontal, Pencil, Trash2, ChevronsUpDown } from 'lucide-react';

interface AddPhoneModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPhoneModelDialog({ open, onOpenChange }: AddPhoneModelDialogProps) {
  const [formData, setFormData] = useState({ model: '', storage_capacity: '' });
  const [selectedBrand, setSelectedBrand] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [isAddingBrand, setIsAddingBrand] = useState(false);

  const [isEditBrandDialogOpen, setIsEditBrandDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState('');
  const [newBrandName, setNewBrandName] = useState('');

  const [isDeleteBrandDialogOpen, setIsDeleteBrandDialogOpen] = useState(false);
  const [deletingBrand, setDeletingBrand] = useState('');

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
    mutationFn: async (dataToInsert: { brand: string; model: string; storage_capacity: string; }) => {
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
    if (!selectedBrand) {
      toast({ title: 'Error', description: 'Silakan pilih merk.', variant: 'destructive' });
      return;
    }
    addModelMutation.mutate({ ...formData, brand: selectedBrand });
  };

  const resetForm = () => {
    setFormData({ model: '', storage_capacity: '' });
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

  const handleAddNewBrand = () => {
    if (!newBrand.trim()) {
        toast({ title: 'Error', description: 'Nama merk tidak boleh kosong.', variant: 'destructive' });
        return;
    }
    setSelectedBrand(newBrand.trim().toUpperCase());
    setIsAddingBrand(false);
    setNewBrand('');
  }

  const filteredBrands = useMemo(() => {
    if (!brands) return [];
    return brands.filter(brand => brand.toLowerCase().includes(brandSearch.toLowerCase()));
  }, [brands, brandSearch]);

  const editBrandMutation = useMutation({
    mutationFn: async ({ oldName, newName }: { oldName: string, newName: string }) => {
        const { error } = await supabase.rpc('update_brand_name', { old_name: oldName, new_name: newName });
        if (error) throw error;
    },
    onSuccess: (_, variables) => {
        toast({ title: 'Merk berhasil diperbarui' });
        queryClient.invalidateQueries({ queryKey: ['brands'] });
        queryClient.invalidateQueries({ queryKey: ['phone-models'] }); // Also invalidate models if brand name changes
        if (selectedBrand === variables.oldName) {
            setSelectedBrand(variables.newName);
        }
        setIsEditBrandDialogOpen(false);
    },
    onError: (error: any) => {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleEditBrand = () => {
    if (!newBrandName.trim()) {
        toast({ title: 'Error', description: 'Nama merk tidak boleh kosong.', variant: 'destructive' });
        return;
    }
    if (newBrandName.trim().toUpperCase() === editingBrand.toUpperCase()) {
        setIsEditBrandDialogOpen(false);
        return;
    }
    editBrandMutation.mutate({ oldName: editingBrand, newName: newBrandName.trim().toUpperCase() });
  }

  const deleteBrandMutation = useMutation({
    mutationFn: async (brandName: string) => {
        const { error } = await supabase.rpc('delete_brand', { brand_name: brandName });
        if (error) throw error;
    },
    onSuccess: (_, brandName) => {
        toast({ title: `Merk "${brandName}" berhasil dihapus` });
        queryClient.invalidateQueries({ queryKey: ['brands'] });
        queryClient.invalidateQueries({ queryKey: ['phone-models'] });
        if (selectedBrand === brandName) {
            setSelectedBrand('');
        }
        setIsDeleteBrandDialogOpen(false);
    },
    onError: (error: any) => {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleDeleteBrand = () => {
    deleteBrandMutation.mutate(deletingBrand);
  }

  return (
    <>
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
                        <Button type="button" onClick={handleAddNewBrand}>Simpan</Button>
                        <Button type="button" variant="ghost" onClick={() => setIsAddingBrand(false)}>Batal</Button>
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
                                            className="flex justify-between items-center"
                                            onSelect={(e) => e.preventDefault()} // Prevent default selection behavior
                                        >
                                            <div className="flex-grow" onClick={() => handleBrandSelection(brand)}>
                                              {brand}
                                            </div>
                                            <DropdownMenu onOpenChange={(open) => open && setIsBrandPopoverOpen(false)}>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="shrink-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onClick={() => {
                                                        setIsEditBrandDialogOpen(true);
                                                        setEditingBrand(brand);
                                                        setNewBrandName(brand);
                                                    }}>
                                                        <Pencil className="mr-2 h-4 w-4" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => {
                                                        setIsDeleteBrandDialogOpen(true);
                                                        setDeletingBrand(brand);
                                                    }}>
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Hapus
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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
            <DialogFooter>
              <Button type="submit" disabled={addModelMutation.isPending}>
                Simpan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Brand Dialog */}
      <Dialog open={isEditBrandDialogOpen} onOpenChange={setIsEditBrandDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Merk</DialogTitle>
                <DialogDescription>
                    Mengubah nama merk akan diperbarui untuk semua model terkait.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
                <Label htmlFor="edit-brand-name">Nama Merk</Label>
                <Input
                    id="edit-brand-name"
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    autoFocus
                />
            </div>
            <DialogFooter>
                <DialogClose asChild><Button variant="ghost">Batal</Button></DialogClose>
                <Button onClick={handleEditBrand} disabled={editBrandMutation.isPending}>
                    {editBrandMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Brand Alert Dialog */}
      <AlertDialog open={isDeleteBrandDialogOpen} onOpenChange={setIsDeleteBrandDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Anda yakin ingin menghapus merk ini?</AlertDialogTitle>
                <AlertDialogDescription>
                    Tindakan ini tidak dapat diurungkan. Ini akan menghapus merk secara permanen
                    dan semua model HP terkait dari database.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteBrand} disabled={deleteBrandMutation.isPending}>
                    {deleteBrandMutation.isPending ? 'Menghapus...' : 'Ya, Hapus'}
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}