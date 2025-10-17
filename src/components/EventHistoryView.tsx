import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface EventHistoryViewProps {
  selectedDate?: Date;
  imeiFilter?: string;
  limit?: number;
}

const EVENT_TYPE_CONFIG = {
  masuk: { label: 'HP Datang', color: 'bg-green-500/10 text-green-700 border-green-500/20' },
  laku: { label: 'Terjual', color: 'bg-red-500/10 text-red-700 border-red-500/20' },
  retur_in: { label: 'Retur Masuk', color: 'bg-blue-500/10 text-blue-700 border-blue-500/20' },
  retur_out: { label: 'Retur Keluar', color: 'bg-orange-500/10 text-orange-700 border-orange-500/20' },
  transfer_in: { label: 'Transfer Masuk', color: 'bg-purple-500/10 text-purple-700 border-purple-500/20' },
  transfer_out: { label: 'Transfer Keluar', color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20' },
  koreksi: { label: 'Koreksi', color: 'bg-gray-500/10 text-gray-700 border-gray-500/20' },
};

export function EventHistoryView({ selectedDate = new Date(), imeiFilter, limit = 100 }: EventHistoryViewProps) {
  const [searchImei, setSearchImei] = useState(imeiFilter || "");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");

  const { data: events, isLoading } = useQuery({
    queryKey: ['stock-events', searchImei, eventTypeFilter, selectedDate, limit],
    queryFn: async () => {
      // Get date range - from selectedDate back 30 days
      const thirtyDaysAgo = new Date(selectedDate);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const selectedDateStr = selectedDate.toISOString().split('T')[0];
      
      let query = supabase
        .from('stock_events')
        .select(`
          *,
          stock_locations(name),
          phone_models(brand, model, storage_capacity, color)
        `)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .lte('date', selectedDateStr)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (searchImei) {
        query = query.ilike('imei', `%${searchImei}%`);
      }

      if (eventTypeFilter !== 'all') {
        query = query.eq('event_type', eventTypeFilter);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    }
  });

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader>
        <div className="flex items-center gap-2">
          <History className="w-5 h-5" />
          <div className="flex-1">
            <CardTitle>Riwayat Transaksi (Event Log)</CardTitle>
            <CardDescription>
              Audit trail lengkap semua transaksi stok dengan IMEI tracking
            </CardDescription>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari berdasarkan IMEI..."
              value={searchImei}
              onChange={(e) => setSearchImei(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Semua Jenis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Jenis</SelectItem>
              {Object.entries(EVENT_TYPE_CONFIG).map(([value, config]) => (
                <SelectItem key={value} value={value}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-border/50 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="min-w-[140px]">Waktu</TableHead>
                  <TableHead className="min-w-[120px]">Jenis</TableHead>
                  <TableHead className="min-w-[100px]">Lokasi</TableHead>
                  <TableHead className="min-w-[150px]">Tipe HP</TableHead>
                  <TableHead className="min-w-[120px]">IMEI</TableHead>
                  <TableHead className="min-w-[60px]">Qty</TableHead>
                  <TableHead className="min-w-[200px]">Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events?.map((event) => {
                  const config = EVENT_TYPE_CONFIG[event.event_type as keyof typeof EVENT_TYPE_CONFIG];
                  return (
                    <TableRow key={event.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-medium text-sm">
                        <div>{format(new Date(event.created_at), "dd MMM yyyy", { locale: localeId })}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(event.created_at), "HH:mm:ss")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-xs", config?.color)}>
                          {config?.label || event.event_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {event.stock_locations?.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium text-sm">
                            {event.phone_models?.brand} {event.phone_models?.model}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {event.phone_models?.storage_capacity} • {event.phone_models?.color}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {event.imei}
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {event.qty}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {event.notes || '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {events?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Tidak ada riwayat transaksi ditemukan.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

