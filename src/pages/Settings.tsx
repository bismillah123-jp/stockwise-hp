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

  const handleExport = async (tableName: 'stock_entries' | 'phone_models') => {
    setIsExporting(true);
    toast({ title: "Mengekspor data...", description: `Memuat data dari tabel ${tableName}.` });

    try {
      const { data, error } = await supabase.from(tableName).select('*');

      if (error) throw error;
      if (!data || data.length === 0) {
        toast({ title: "Tidak ada data", description: `Tidak ada data untuk diekspor dari ${tableName}.`, variant: "destructive" });
        return;
      }

      const csv = Papa.unparse(data);
      const filename = `${tableName}_${new Date().toISOString().split('T')[0]}.csv`;
      downloadCSV(csv, filename);

      toast({ title: "Ekspor Berhasil", description: `${data.length} baris telah diekspor dari ${tableName}.` });

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
            Download your data as CSV files.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button onClick={() => handleExport('stock_entries')} disabled={isExporting}>
            Export Stock Entries
          </Button>
          <Button onClick={() => handleExport('phone_models')} disabled={isExporting}>
            Export Phone Models
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
