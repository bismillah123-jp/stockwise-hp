import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface SaleConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (saleData: { price: number; date: Date; costPrice: number }) => void;
  suggestedPrice: number;
  itemName: string;
  costPrice?: number;
}

export function SaleConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  suggestedPrice,
  itemName,
  costPrice = 0,
}: SaleConfirmationDialogProps) {
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualPrice, setManualPrice] = useState(suggestedPrice.toLocaleString('id-ID'));
  const [saleDate, setSaleDate] = useState<Date>(new Date());

  const formatPrice = (value: string) => {
    const numOnly = value.replace(/\D/g, '');
    return numOnly ? parseInt(numOnly).toLocaleString('id-ID') : '';
  };

  const parsePriceToNumber = (formattedPrice: string) => {
    return parseInt(formattedPrice.replace(/\./g, '')) || 0;
  };

  const handleUseSRP = () => {
    onConfirm({
      price: suggestedPrice,
      date: new Date(),
      costPrice,
    });
    resetState();
  };

  const handleManualSubmit = () => {
    const price = parsePriceToNumber(manualPrice);
    onConfirm({
      price,
      date: saleDate,
      costPrice,
    });
    resetState();
  };

  const resetState = () => {
    setShowManualEntry(false);
    setManualPrice(suggestedPrice.toLocaleString('id-ID'));
    setSaleDate(new Date());
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetState();
    }
    onOpenChange(isOpen);
  };

  const profitLoss = suggestedPrice - costPrice;

  if (showManualEntry) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Masukkan Detail Penjualan</DialogTitle>
            <DialogDescription>
              Masukkan harga jual dan tanggal penjualan untuk {itemName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="manual-price">Harga Jual (Rp)</Label>
              <Input
                id="manual-price"
                type="text"
                inputMode="numeric"
                value={manualPrice}
                onChange={(e) => setManualPrice(formatPrice(e.target.value))}
                placeholder="Masukkan harga jual"
              />
            </div>

            <div className="space-y-2">
              <Label>Tanggal Penjualan</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !saleDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {saleDate ? format(saleDate, "PPP") : <span>Pilih tanggal</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={saleDate}
                    onSelect={(date) => date && setSaleDate(date)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {costPrice > 0 && (
              <div className="rounded-lg bg-muted p-3 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Harga Modal:</span>
                  <span className="font-medium">Rp {costPrice.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Harga Jual:</span>
                  <span className="font-medium">Rp {parsePriceToNumber(manualPrice).toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between border-t pt-1 mt-1">
                  <span className="font-semibold">Laba/Rugi:</span>
                  <span className={cn(
                    "font-semibold",
                    parsePriceToNumber(manualPrice) - costPrice >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    Rp {(parsePriceToNumber(manualPrice) - costPrice).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManualEntry(false)}>
              Kembali
            </Button>
            <Button onClick={handleManualSubmit}>
              Konfirmasi Penjualan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Konfirmasi Penjualan</DialogTitle>
          <DialogDescription>
            Apakah HP ini terjual hari ini dengan harga SRP?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="rounded-lg bg-muted p-4">
            <div className="text-sm text-muted-foreground mb-1">Item:</div>
            <div className="font-semibold">{itemName}</div>
          </div>

          <div className="rounded-lg bg-muted p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Harga SRP:</span>
              <span className="font-semibold">Rp {suggestedPrice.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tanggal:</span>
              <span className="font-semibold">{format(new Date(), "dd MMM yyyy")}</span>
            </div>
            {costPrice > 0 && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Harga Modal:</span>
                  <span className="font-semibold">Rp {costPrice.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="font-semibold">Laba/Rugi:</span>
                  <span className={cn(
                    "font-semibold",
                    profitLoss >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    Rp {profitLoss.toLocaleString('id-ID')}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setShowManualEntry(true)} className="w-full sm:w-auto">
            Tidak, Input Manual
          </Button>
          <Button onClick={handleUseSRP} className="w-full sm:w-auto">
            Ya, Gunakan SRP
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
