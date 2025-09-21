import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { StockEntry } from "./StockTable";

interface TransferStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockEntry: StockEntry | null;
}

export function TransferStockDialog({ open, onOpenChange, stockEntry }: TransferStockDialogProps) {
  const [destinationLocationId, setDestinationLocationId] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('stock_locations').select('*').order('name');
      if (error) throw error;
      return data;
    }
  });

  const transferStockMutation = useMutation({
    mutationFn: async (destinationId: string) => {
      if (!stockEntry) throw new Error("No stock entry selected for transfer.");
      if (!destinationId) throw new Error("Please select a destination location.");

      // For simplicity, we assume transfer is always 1 unit
      const transferQty = 1;

      // 1. Decrement stock from source
      const { error: updateSourceError } = await supabase
        .from('stock_entries')
        .update({ night_stock: stockEntry.night_stock - transferQty })
        .eq('id', stockEntry.id);

      if (updateSourceError) throw updateSourceError;

      // 2. Find or create entry at destination for the same date
      const { data: destEntry, error: findDestError } = await supabase
        .from('stock_entries')
        .select('id, incoming, night_stock')
        .eq('date', stockEntry.date)
        .eq('location_id', destinationId)
        .eq('phone_model_id', stockEntry.phone_models.id) // This needs phone_model_id
        .maybeSingle();

      if (findDestError) throw findDestError;

      if (destEntry) {
        // Update destination
        const { error: updateDestError } = await supabase
          .from('stock_entries')
          .update({
            incoming: destEntry.incoming + transferQty,
            night_stock: destEntry.night_stock + transferQty,
          })
          .eq('id', destEntry.id);
        if (updateDestError) throw updateDestError;
      } else {
        // Create at destination
        const { error: createDestError } = await supabase
          .from('stock_entries')
          .insert({
            date: stockEntry.date,
            location_id: destinationId,
            phone_model_id: stockEntry.phone_models.id, // This needs phone_model_id
            incoming: transferQty,
            night_stock: transferQty,
            morning_stock: 0,
            sold: 0,
            returns: 0,
            adjustment: 0,
            add_stock: 0,
          });
        if (createDestError) throw createDestError;
      }
    },
    onSuccess: () => {
      toast({ title: "Sukses", description: "Stok berhasil ditransfer." });
      queryClient.invalidateQueries({ queryKey: ['stock-entries'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: `Transfer gagal: ${error.message}`, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    transferStockMutation.mutate(destinationLocationId);
  };

  const availableLocations = locations?.filter(loc => loc.id !== stockEntry?.stock_locations.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Stok</DialogTitle>
          <DialogDescription>
            Transfer item ke lokasi lain.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="font-medium">{stockEntry?.phone_models.brand} {stockEntry?.phone_models.model}</p>
            <p className="text-sm text-muted-foreground">Dari: {stockEntry?.stock_locations.name}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="destination">Transfer Ke</Label>
            <Select value={destinationLocationId} onValueChange={setDestinationLocationId}>
              <SelectTrigger id="destination">
                <SelectValue placeholder="Pilih lokasi tujuan..." />
              </SelectTrigger>
              <SelectContent>
                {availableLocations?.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Batal</Button>
            <Button onClick={handleSubmit} disabled={transferStockMutation.isPending || !destinationLocationId} className="flex-1">
              {transferStockMutation.isPending ? "Memproses..." : "Transfer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
