import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { StockUnit } from "./StockTable";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface EditStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockUnit: StockUnit | null;
}

export function EditStockDialog({ open, onOpenChange, stockUnit }: EditStockDialogProps) {
  const [notes, setNotes] = useState("");
  const [imei, setImei] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (stockUnit) {
      setNotes(stockUnit.notes || "");
      setImei(stockUnit.imei || "");
    }
  }, [stockUnit]);

  const editStockMutation = useMutation({
    mutationFn: async ({ notes, imei }: { notes: string; imei: string }) => {
      if (!stockUnit) throw new Error("No stock unit selected for editing.");

      const { error } = await supabase
        .from('stock_units')
        .update({ notes, imei: imei.trim() })
        .eq('id', stockUnit.id);

      if (error) {
        if (error.code === '23505') {
          throw new Error(`Gagal: IMEI ${imei.trim()} sudah ada di sistem.`);
        }
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Unit stok berhasil diperbarui",
      });
      queryClient.invalidateQueries({ queryKey: ['stock-units'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Gagal",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!imei.trim()) {
      toast({ title: "Error", description: "IMEI tidak boleh kosong.", variant: "destructive" });
      return;
    }
    editStockMutation.mutate({ notes, imei });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Unit Stok</DialogTitle>
          <DialogDescription>
            Perbarui detail untuk unit stok yang dipilih.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Model HP</Label>
            <Input
              disabled
              value={stockUnit ? `${stockUnit.phone_models.brands.name} ${stockUnit.phone_models.model}` : ""}
            />
          </div>
          <div className="space-y-2">
            <Label>IMEI</Label>
            <Input
              placeholder="Masukkan IMEI"
              value={imei}
              onChange={(e) => setImei(e.target.value)}
            />
          </div>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Perhatian</AlertTitle>
            <AlertDescription>
              Mengubah IMEI adalah tindakan berisiko dan dapat memengaruhi pelacakan riwayat unit. Lakukan dengan hati-hati.
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Label>Catatan</Label>
            <Textarea
              placeholder="Tambahkan catatan..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={editStockMutation.isPending}
              className="flex-1"
            >
              {editStockMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
