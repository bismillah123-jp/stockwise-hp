import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export function AddPhoneModelDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    storage_capacity: '',
    color: ''
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addPhoneModelMutation = useMutation({
    mutationFn: async () => {
      if (!formData.brand.trim() || !formData.model.trim()) {
        throw new Error('Brand and model are required');
      }

      const { error } = await supabase
        .from('phone_models')
        .insert({
          brand: formData.brand.trim().toUpperCase(),
          model: formData.model.trim(),
          storage_capacity: formData.storage_capacity.trim() || null,
          color: formData.color.trim().toUpperCase() || null
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Phone model added successfully",
        description: `${formData.brand} ${formData.model} has been added to the phone models list.`,
      });
      
      setFormData({ brand: '', model: '', storage_capacity: '', color: '' });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['phone-models'] });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error adding phone model",
        description: error.message || "An error occurred while adding the phone model.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addPhoneModelMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="w-3 h-3" />
          Add Phone Model
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Phone Model</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="brand">Brand *</Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="e.g., SAMSUNG"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model *</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="e.g., Galaxy A25"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="storage">Storage Capacity</Label>
              <Input
                id="storage"
                value={formData.storage_capacity}
                onChange={(e) => setFormData({ ...formData, storage_capacity: e.target.value })}
                placeholder="e.g., 128GB"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="e.g., BLACK"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              type="submit" 
              disabled={addPhoneModelMutation.isPending}
              className="flex-1"
            >
              {addPhoneModelMutation.isPending ? 'Adding...' : 'Add Model'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}