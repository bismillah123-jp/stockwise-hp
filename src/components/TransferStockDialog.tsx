import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { StockUnit } from "./StockTable";
import { format } from "date-fns";

interface TransferStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockUnit: StockUnit | null;
  selectedDate: Date;
}

export function TransferStockDialog({ open, onOpenChange, stockUnit, selectedDate }: TransferStockDialogProps) {
  const [destinationLocationId, setDestinationLocationId] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: locations } = useQuery({
    queryKey: ['stock_locations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('stock_locations').select('*').order('name');
      if (error) throw error;
      return data;
    }
  });

  const transferStockMutation = useMutation({
    mutationFn: async (destinationId: string) => {
      if (!stockUnit) throw new Error("No stock unit selected for transfer.");
      if (!destinationId) throw new Error("Please select a destination location.");

      const { error } = await supabase.rpc('transfer_stock_unit', {
        p_imei: stockUnit.imei,
        p_new_location_id: destinationId,
        p_transfer_date: format(selectedDate, 'yyyy-MM-dd'),
        p_notes: `Transferred from ${stockUnit.stock_locations.name}`
      });

      if (error) throw new Error(`Failed to transfer stock: ${error.message}`);
    },
    onSuccess: () => {
      toast({ title: "Sukses", description: "Stok berhasil ditransfer." });
      queryClient.invalidateQueries({ queryKey: ['stock-units'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: `Transfer gagal: ${error.message}`, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    transferStockMutation.mutate(destinationLocationId);
  };

  const availableLocations = locations?.filter(loc => loc.id !== stockUnit?.location_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Stok</DialogTitle>
          <DialogDescription>
            Transfer item ke lokasi lain pada tanggal {format(selectedDate, 'dd MMM yyyy')}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="font-medium">{stockUnit?.phone_models.brands.name} {stockUnit?.phone_models.model}</p>
            <p className="text-sm text-muted-foreground">IMEI: {stockUnit?.imei}</p>
            <p className="text-sm text-muted-foreground">Dari: {stockUnit?.stock_locations.name}</p>
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
