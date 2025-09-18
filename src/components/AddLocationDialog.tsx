import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export function AddLocationDialog() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addLocationMutation = useMutation({
    mutationFn: async () => {
      if (!formData.name.trim()) {
        throw new Error('Location name is required');
      }

      const { error } = await supabase
        .from('stock_locations')
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim() || null
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Location added successfully",
        description: `${formData.name} has been added to the locations list.`,
      });
      
      setFormData({ name: '', description: '' });
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error adding location",
        description: error.message || "An error occurred while adding the location.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addLocationMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="w-3 h-3" />
          Add Location
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Location</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="location-name">Location Name *</Label>
            <Input
              id="location-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter location name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location-description">Description</Label>
            <Textarea
              id="location-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional description"
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <Button 
              type="submit" 
              disabled={addLocationMutation.isPending}
              className="flex-1"
            >
              {addLocationMutation.isPending ? 'Adding...' : 'Add Location'}
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