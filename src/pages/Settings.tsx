import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Papa from "papaparse";

const Settings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState("");

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportAllStock = async () => {
    setIsExporting(true);
    toast({ title: "Mengekspor data...", description: "Memuat semua data stok untuk di-export." });

    try {
      const { data, error } = await supabase
        .from('stock_entries')
        .select(`
          date,
          imei,
          notes,
          morning_stock,
          incoming,
          add_stock,
          returns,
          sold,
          adjustment,
          night_stock,
          stock_locations ( name ),
          phone_models ( brand, model, storage_capacity, color )
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) {
        toast({ title: "Tidak ada data", description: "Tidak ada data stok untuk diekspor.", variant: "destructive" });
        return;
      }

      // Flatten the nested data
      const flattenedData = data.map(entry => ({
        Tanggal: entry.date,
        Lokasi: entry.stock_locations?.name || 'N/A',
        Merk: entry.phone_models?.brand || 'N/A',
        Model: entry.phone_models?.model || 'N/A',
        Penyimpanan: entry.phone_models?.storage_capacity || 'N/A',
        Warna: entry.phone_models?.color || 'N/A',
        IMEI: entry.imei,
        Catatan: entry.notes,
        Stok_Pagi: entry.morning_stock,
        Masuk: entry.incoming,
        Tambah_Stok: entry.add_stock,
        Return: entry.returns,
        Terjual: entry.sold,
        Penyesuaian: entry.adjustment,
        Stok_Malam: entry.night_stock,
      }));

      const csv = Papa.unparse(flattenedData);
      const filename = `stock_export_${new Date().toISOString().split('T')[0]}.csv`;
      downloadCSV(csv, filename);

      toast({ title: "Ekspor Berhasil", description: `${data.length} baris data stok telah diekspor.` });

    } catch (error: any) {
      toast({ title: "Ekspor Gagal", description: error.message, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const resetMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('reset_all_data');
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Reset Berhasil", description: "Semua data telah berhasil dihapus." });
      // Invalidate all queries to refresh the UI
      queryClient.invalidateQueries();
      setResetConfirmation("");
    },
    onError: (error: any) => {
      toast({ title: "Reset Gagal", description: error.message, variant: "destructive" });
    },
  });

  const handleReset = () => {
    if (resetConfirmation === "RESET DATA") {
      resetMutation.mutate();
    } else {
      toast({ title: "Konfirmasi Salah", description: "Silakan ketik 'RESET DATA' untuk mengkonfirmasi.", variant: "destructive" });
    }
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Export Data</CardTitle>
          <CardDescription>
            Download all of your stock data in a single, human-readable CSV file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExportAllStock} disabled={isExporting}>
            {isExporting ? "Mengekspor..." : "Export All Stock Data"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>Reset Data</CardTitle>
          <CardDescription>
            Permanently delete all stock and model data. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Label htmlFor="reset-confirmation">
            To confirm, type "RESET DATA" in the box below.
          </Label>
          <Input
            id="reset-confirmation"
            value={resetConfirmation}
            onChange={(e) => setResetConfirmation(e.target.value)}
            placeholder="RESET DATA"
          />
          <Button
            variant="destructive"
            onClick={handleReset}
            disabled={resetConfirmation !== "RESET DATA" || resetMutation.isPending}
          >
            {resetMutation.isPending ? "Mereset..." : "Reset Semua Data"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
