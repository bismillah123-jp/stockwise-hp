import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { StockEntry } from "@/types";

interface EditStockDialogProps {
  entry: StockEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditStockDialog({ entry, open, onOpenChange, onSuccess }: EditStockDialogProps) {
  const [formData, setFormData] = useState({
    sold: 0,
    returns: 0,
    adjustment: 0,
    notes: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (entry) {
      setFormData({
        sold: entry.sold || 0,
        returns: entry.returns || 0,
        adjustment: entry.adjustment || 0,
        notes: entry.notes || ''
      });
    }
  }, [entry]);

  const editStockMutation = useMutation({
    mutationFn: async () => {
      if (!entry) throw new Error("No stock entry selected");

      const { error } = await supabase
        .from('stock_entries')
        .update({
          sold: formData.sold,
          returns: formData.returns,
          adjustment: formData.adjustment,
          notes: formData.notes
        })
        .eq('id', entry.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Stock entry updated",
        description: "The changes have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['stock-entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating entry",
        description: error.message || "An unknown error occurred.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    editStockMutation.mutate();
  };

  if (!entry) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Stock Entry</DialogTitle>
          <div className="text-sm text-muted-foreground pt-1">
            {entry.phone_models.brand} {entry.phone_models.model} at {entry.stock_locations.name}
            <br />
            Date: {new Date(entry.date).toLocaleDateString('id-ID')}
          </div>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sold">Sold</Label>
              <Input
                id="sold"
                type="number"
                value={formData.sold}
                onChange={(e) => setFormData({ ...formData, sold: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="returns">Returns</Label>
              <Input
                id="returns"
                type="number"
                value={formData.returns}
                onChange={(e) => setFormData({ ...formData, returns: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjustment">Adjustment</Label>
              <Input
                id="adjustment"
                type="number"
                value={formData.adjustment}
                onChange={(e) => setFormData({ ...formData, adjustment: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add notes about this entry..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={editStockMutation.isPending}>
              {editStockMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
