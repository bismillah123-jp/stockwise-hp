import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Papa from "papaparse";
import { Upload } from "lucide-react";

interface CsvRow {
  [key: string]: string;
}

const Settings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);


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
          date, imei, notes, morning_stock, incoming, add_stock, returns, sold, adjustment, night_stock,
          stock_locations ( name ),
          phone_models ( brand, model, storage_capacity )
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) {
        toast({ title: "Tidak ada data", description: "Tidak ada data stok untuk diekspor.", variant: "destructive" });
        return;
      }

      const flattenedData = data.map(entry => ({
        Tanggal: entry.date, Lokasi: entry.stock_locations?.name || 'N/A', Merk: entry.phone_models?.brand || 'N/A',
        Model: entry.phone_models?.model || 'N/A', Penyimpanan: entry.phone_models?.storage_capacity || 'N/A',
        IMEI: entry.imei, Catatan: entry.notes, Stok_Pagi: entry.morning_stock, Masuk: entry.incoming,
        Tambah_Stok: entry.add_stock, Return: entry.returns, Terjual: entry.sold,
        Penyesuaian: entry.adjustment, Stok_Malam: entry.night_stock,
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

  const importMutation = useMutation({
    mutationFn: async (entries: any[]) => {
      const { error } = await supabase.rpc('bulk_insert_stock', { entries });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Import Berhasil", description: "Data stok telah berhasil diimpor." });
      queryClient.invalidateQueries();
    },
    onError: (error: any) => {
      toast({ title: "Import Gagal", description: `Terjadi kesalahan saat menyimpan data: ${error.message}`, variant: "destructive" });
    },
    onSettled: () => {
      setIsImporting(false);
      setSelectedFile(null);
    },
  });

  const validateAndTransformData = async (parsedData: CsvRow[]) => {
    setImportErrors([]);
    const [locationsRes, modelsRes] = await Promise.all([
      supabase.from('stock_locations').select('id, name'),
      supabase.from('phone_models').select('id, brand, model, storage_capacity'),
    ]);

    if (locationsRes.error || modelsRes.error) throw new Error(locationsRes.error?.message || modelsRes.error?.message);

    const locationMap = new Map(locationsRes.data.map(loc => [loc.name.toUpperCase(), loc.id]));
    const modelMap = new Map(modelsRes.data.map(m => [`${m.brand.toUpperCase()}-${m.model.toUpperCase()}-${(m.storage_capacity || '').toUpperCase()}`, m.id]));

    const validEntries: any[] = [];
    const errors: string[] = [];

    for (const [index, row] of parsedData.entries()) {
      const { Tanggal, Lokasi, Merk, Model, Penyimpanan, IMEI } = row;

      if (!Tanggal || !Lokasi || !Merk || !Model || !IMEI) {
        errors.push(`Baris ${index + 2}: Kolom wajib (Tanggal, Lokasi, Merk, Model, IMEI) tidak lengkap.`);
        continue;
      }

      const locationId = locationMap.get(Lokasi.toUpperCase());
      if (!locationId) {
        errors.push(`Baris ${index + 2}: Lokasi "${Lokasi}" tidak ditemukan.`);
        continue;
      }

      const modelKey = `${Merk.toUpperCase()}-${Model.toUpperCase()}-${(Penyimpanan || '').toUpperCase()}`;
      const modelId = modelMap.get(modelKey);
      if (!modelId) {
        errors.push(`Baris ${index + 2}: Model HP "${Merk} ${Model} ${Penyimpanan || ''}" tidak ditemukan.`);
        continue;
      }

      validEntries.push({
        date: Tanggal, location_id: locationId, phone_model_id: modelId, imei: IMEI,
        morning_stock: parseInt(row.Stok_Pagi, 10) || 1,
        incoming: parseInt(row.Masuk, 10) || 0, add_stock: parseInt(row.Tambah_Stok, 10) || 0,
        returns: parseInt(row.Return, 10) || 0, sold: parseInt(row.Terjual, 10) || 0,
        adjustment: parseInt(row.Penyesuaian, 10) || 0, notes: row.Catatan || '',
      });
    }

    setImportErrors(errors);
    return { validEntries, errors };
  };

  const handleImport = () => {
    if (!selectedFile) return;
    setIsImporting(true);
    setImportErrors([]);
    toast({ title: "Memulai proses import...", description: "Membaca dan memvalidasi file CSV." });

    Papa.parse(selectedFile, {
      header: true, skipEmptyLines: true,
      complete: async (results) => {
        try {
          const { validEntries, errors } = await validateAndTransformData(results.data as CsvRow[]);
          if (errors.length > 0) {
            toast({ title: "Ditemukan Error Validasi", description: `Terdapat ${errors.length} error.`, variant: "destructive" });
          }
          if (validEntries.length > 0) {
            importMutation.mutate(validEntries);
          } else {
             setIsImporting(false);
             if (errors.length === 0) {
                toast({ title: "Tidak ada data", description: "File CSV tidak berisi data yang valid untuk diimport." });
             }
          }
        } catch (error: any) {
          toast({ title: "Error Validasi", description: error.message, variant: "destructive" });
          setIsImporting(false);
        }
      },
      error: (error) => {
        toast({ title: "Gagal Membaca File", description: error.message, variant: "destructive" });
        setIsImporting(false);
      },
    });
  };

  const resetMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('reset_all_data');
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Reset Berhasil", description: "Semua data telah berhasil dihapus." });
      queryClient.invalidateQueries();
      setResetConfirmation("");
    },
    onError: (error: any) => {
      toast({ title: "Reset Gagal", description: error.message, variant: "destructive" });
    },
  });

  const handleReset = () => {
    if (resetConfirmation === "RESET DATA") resetMutation.mutate();
    else toast({ title: "Konfirmasi Salah", description: "Silakan ketik 'RESET DATA' untuk mengkonfirmasi.", variant: "destructive" });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) setSelectedFile(event.target.files[0]);
    setImportErrors([]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Export Data</CardTitle>
          <CardDescription>Download all of your stock data in a single, human-readable CSV file.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExportAllStock} disabled={isExporting}>
            {isExporting ? "Mengekspor..." : "Export All Stock Data"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import Data</CardTitle>
          <CardDescription>Import stock data from a CSV file. Please use the same format as the exported file.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <Label htmlFor="csv-import">Upload CSV File</Label>
            <Input id="csv-import" type="file" accept=".csv" onChange={handleFileChange} />
            <Button onClick={handleImport} disabled={!selectedFile || isImporting}>
                <Upload className="mr-2 h-4 w-4" />
                {isImporting ? "Mengimpor..." : "Upload and Import"}
            </Button>
            {importErrors.length > 0 && (
                <div className="space-y-2 pt-4">
                    <h4 className="font-medium text-destructive">Error Impor:</h4>
                    <ul className="list-disc list-inside bg-destructive/10 p-4 rounded-md text-sm text-destructive">
                        {importErrors.slice(0, 5).map((error, index) => (
                            <li key={index}>{error}</li>
                        ))}
                        {importErrors.length > 5 && <li>Dan {importErrors.length - 5} error lainnya...</li>}
                    </ul>
                </div>
            )}
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>Reset Data</CardTitle>
          <CardDescription>Permanently delete all stock and model data. This action cannot be undone.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Label htmlFor="reset-confirmation">To confirm, type "RESET DATA" in the box below.</Label>
          <Input id="reset-confirmation" value={resetConfirmation} onChange={(e) => setResetConfirmation(e.target.value)} placeholder="RESET DATA" />
          <Button variant="destructive" onClick={handleReset} disabled={resetConfirmation !== "RESET DATA" || resetMutation.isPending}>
            {resetMutation.isPending ? "Mereset..." : "Reset Semua Data"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
