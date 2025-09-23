import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  DialogClose,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, Trash2 } from 'lucide-react';
import { Tables } from '@/integrations/supabase/types';

type Brand = Tables<'brands'>;

interface ManageBrandsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManageBrandsDialog({ open, onOpenChange }: ManageBrandsDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [newBrandName, setNewBrandName] = useState('');

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingBrand, setDeletingBrand] = useState<Brand | null>(null);

  const { data: brands, isLoading: brandsLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_brands');
      if (error) throw error;
      return data;
    },
  });

  const editBrandMutation = useMutation({
    mutationFn: async ({ id, newName }: { id: string, newName: string }) => {
        const { error } = await supabase.from('brands').update({ name: newName.toUpperCase() }).eq('id', id);
        if (error) throw error;
    },
    onSuccess: () => {
        toast({ title: 'Merk berhasil diperbarui' });
        queryClient.invalidateQueries({ queryKey: ['brands'] });
        queryClient.invalidateQueries({ queryKey: ['phone_models'] });
        setIsEditDialogOpen(false);
    },
    onError: (error: Error) => {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleEditBrand = () => {
    if (!editingBrand || !newBrandName.trim()) {
        toast({ title: 'Error', description: 'Nama merk tidak boleh kosong.', variant: 'destructive' });
        return;
    }
    if (newBrandName.trim().toUpperCase() === editingBrand.name.toUpperCase()) {
        setIsEditDialogOpen(false);
        return;
    }
    editBrandMutation.mutate({ id: editingBrand.id, newName: newBrandName.trim() });
  }

  const deleteBrandMutation = useMutation({
    mutationFn: async (brandId: string) => {
        const { error } = await supabase.from('brands').delete().eq('id', brandId);
        if (error) throw error;
    },
    onSuccess: (_, brandId) => {
        const deletedBrandName = brands?.find(b => b.id === brandId)?.name;
        toast({ title: `Merk "${deletedBrandName || 'yang dipilih'}" berhasil dihapus` });
        queryClient.invalidateQueries({ queryKey: ['brands'] });
        queryClient.invalidateQueries({ queryKey: ['phone_models'] });
        setIsDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
        toast({ title: 'Error', description: "Gagal menghapus merk. Pastikan tidak ada model HP yang terkait dengan merk ini. " + error.message, variant: 'destructive' });
    },
  });

  const handleDeleteBrand = () => {
    if (!deletingBrand) return;
    deleteBrandMutation.mutate(deletingBrand.id);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Kelola Merk</DialogTitle>
          </DialogHeader>
          <div className="flex-grow overflow-y-auto pr-4 -mr-4">
              {brandsLoading ? (
                  <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                  </div>
              ) : (
                  <ul className="space-y-2">
                      {brands?.map((brand) => (
                          <li key={brand.id} className="flex justify-between items-center p-2 border rounded-md">
                              <span className="font-medium">{brand.name}</span>
                              <div className="space-x-2">
                                  <Button variant="ghost" size="icon" onClick={() => {
                                      setEditingBrand(brand);
                                      setNewBrandName(brand.name);
                                      setIsEditDialogOpen(true);
                                  }}>
                                      <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => {
                                      setDeletingBrand(brand);
                                      setIsDeleteDialogOpen(true);
                                  }}>
                                      <Trash2 className="h-4 w-4" />
                                  </Button>
                              </div>
                          </li>
                      ))}
                  </ul>
              )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Brand Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
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
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Anda yakin ingin menghapus merk ini?</AlertDialogTitle>
                <AlertDialogDescription>
                    Tindakan ini tidak dapat diurungkan. Ini akan menghapus merk secara permanen
                    jika tidak ada model HP yang terkait.
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
