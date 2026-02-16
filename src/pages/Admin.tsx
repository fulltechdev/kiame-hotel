import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import { pt } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Pencil, Trash2, CalendarDays, BedDouble, ClipboardList, CalendarIcon, Loader2, Search, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatKz, cn } from "@/lib/utils";

interface Room {
  id: string;
  name: string;
  description: string;
  price_per_night: number;
  capacity: number;
  type: string;
  image_url: string;
}

interface Reservation {
  id: string;
  user_id: string;
  room_id: string;
  check_in: string;
  check_out: string;
  status: string;
  created_at: string;
  rooms: { name: string; type: string; price_per_night?: number } | null;
  phone: string | null;
}

interface Availability {
  id: string;
  room_id: string;
  available_from: string;
  available_to: string;
  rooms?: { name: string } | null;
}

export default function Admin() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [availDialog, setAvailDialog] = useState(false);
  const [availForm, setAvailForm] = useState<{ room_id: string; available_from: Date | undefined; available_to: Date | undefined }>({
    room_id: "",
    available_from: undefined,
    available_to: undefined,
  });
  const [submittingAvail, setSubmittingAvail] = useState(false);
  const [availRoomNameFilter, setAvailRoomNameFilter] = useState("");
  const [availDateFilter, setAvailDateFilter] = useState<Date | undefined>(undefined);
  const [profileInfo, setProfileInfo] = useState<Record<string, { full_name: string; phone: string }>>({});

  // Filtros das reservas
  const [reservStatusFilter, setReservStatusFilter] = useState<string>("all");
  const [reservClientFilter, setReservClientFilter] = useState("");
  const [reservDateFilter, setReservDateFilter] = useState<Date | undefined>(undefined);
  const [reservRoomFilter, setReservRoomFilter] = useState<string>("all");

  // Quartos: filtro por nome e modal de confirmação ao remover
  const [roomNameFilter, setRoomNameFilter] = useState("");
  const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);
  const [deletingRoom, setDeletingRoom] = useState(false);

  const fetchAll = async () => {
    const [r, res, av] = await Promise.all([
      supabase.from("rooms").select("*").order("created_at"),
      supabase.from("reservations").select("*, rooms(name, type, price_per_night)").order("created_at", { ascending: false }),
      supabase.from("room_availability").select("*, rooms(name)").order("available_from"),
    ]);
    setRooms(r.data || []);
    if (res.error) {
      console.error("Erro ao carregar reservas:", res.error);
      toast.error("Erro ao carregar reservas: " + res.error.message);
      setReservations([]);
      setProfileInfo({});
    } else {
      const list = (res.data as unknown as Reservation[]) || [];
      setReservations(list);
      const userIds = [...new Set(list.map((x) => x.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase.from("profiles").select("user_id, full_name, phone").in("user_id", userIds);
        const map: Record<string, { full_name: string; phone: string }> = {};
        for (const p of profilesData || []) {
          map[p.user_id] = { full_name: p.full_name || "", phone: p.phone || "" };
        }
        setProfileInfo(map);
      } else {
        setProfileInfo({});
      }
    }
    setAvailability((av.data as unknown as Availability[]) || []);
  };

  useEffect(() => { fetchAll(); }, []);

  const filteredRooms = rooms.filter((r) =>
    !roomNameFilter.trim() || r.name.toLowerCase().includes(roomNameFilter.trim().toLowerCase())
  );

  const deleteRoom = async (id: string) => {
    setDeletingRoom(true);
    const { error } = await supabase.from("rooms").delete().eq("id", id);
    setDeletingRoom(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Quarto removido!");
      setRoomToDelete(null);
      fetchAll();
    }
  };

  const confirmDeleteRoom = () => {
    if (roomToDelete) deleteRoom(roomToDelete.id);
  };

  const saveAvailability = async () => {
    if (!availForm.room_id || !availForm.available_from || !availForm.available_to) return;
    setSubmittingAvail(true);
    try {
      const payload = {
        room_id: availForm.room_id,
        available_from: format(availForm.available_from, "yyyy-MM-dd"),
        available_to: format(availForm.available_to, "yyyy-MM-dd"),
      };
      const { error } = await supabase.from("room_availability").insert(payload);
      if (error) toast.error(error.message);
      else {
        toast.success("Disponibilidade adicionada!");
        setAvailDialog(false);
        setAvailForm({ room_id: "", available_from: undefined, available_to: undefined });
        fetchAll();
      }
    } finally {
      setSubmittingAvail(false);
    }
  };

  const filteredAvailability = availability.filter((a) => {
    const nameMatch = !availRoomNameFilter.trim() ||
      (a.rooms?.name?.toLowerCase().includes(availRoomNameFilter.trim().toLowerCase()) ?? false);
    const from = new Date(a.available_from);
    const to = new Date(a.available_to);
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    const dateMatch = !availDateFilter ||
      (availDateFilter >= from && availDateFilter <= to);
    return nameMatch && dateMatch;
  });

  const filteredReservations = reservations.filter((r) => {
    if (reservStatusFilter !== "all" && r.status !== reservStatusFilter) return false;
    const clientName = profileInfo[r.user_id]?.full_name?.toLowerCase() ?? "";
    const clientSearch = reservClientFilter.trim().toLowerCase();
    if (clientSearch && !clientName.includes(clientSearch)) return false;
    if (reservRoomFilter !== "all" && r.room_id !== reservRoomFilter) return false;
    if (reservDateFilter) {
      const d = new Date(reservDateFilter);
      d.setHours(0, 0, 0, 0);
      const checkIn = new Date(r.check_in);
      const checkOut = new Date(r.check_out);
      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(23, 59, 59, 999);
      if (d < checkIn || d > checkOut) return false;
    }
    return true;
  });

  const hasReservFilters = reservStatusFilter !== "all" || reservClientFilter.trim() || reservDateFilter || reservRoomFilter !== "all";

  const updateReservationStatus = async (id: string, status: "pendente" | "confirmada" | "cancelada") => {
    const { error } = await supabase.from("reservations").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Estado atualizado!"); fetchAll(); }
  };

  const statusColors: Record<string, string> = {
    pendente: "bg-amber-100 text-amber-800 hover:bg-amber-100",
    confirmada: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
    cancelada: "bg-red-100 text-red-800 hover:bg-red-100",
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <h1 className="font-display text-4xl font-bold text-foreground mb-2">Painel Administrativo</h1>
          <p className="text-muted-foreground mb-10">Gestão de quartos, disponibilidade e reservas</p>

          <Tabs defaultValue="rooms">
            <TabsList className="mb-8">
              <TabsTrigger value="rooms" className="gap-2"><BedDouble className="w-4 h-4" /> Quartos</TabsTrigger>
              <TabsTrigger value="availability" className="gap-2"><CalendarDays className="w-4 h-4" /> Disponibilidade</TabsTrigger>
              <TabsTrigger value="reservations" className="gap-2"><ClipboardList className="w-4 h-4" /> Reservas</TabsTrigger>
            </TabsList>

            {/* Rooms Tab */}
            <TabsContent value="rooms">
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Pesquisar quartos por nome..."
                    value={roomNameFilter}
                    onChange={(e) => setRoomNameFilter(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {roomNameFilter.trim() && (
                  <Button variant="outline" size="sm" className="shrink-0" onClick={() => setRoomNameFilter("")}>
                    <X className="w-4 h-4 mr-1" /> Limpar
                  </Button>
                )}
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90 shrink-0 ml-auto" asChild>
                  <Link to="/admin/quartos/novo">
                    <Plus className="w-4 h-4 mr-2" /> Novo Quarto
                  </Link>
                </Button>
              </div>

              {rooms.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">Nenhum quarto criado.</div>
              ) : filteredRooms.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">Nenhum quarto corresponde à pesquisa.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredRooms.map((room) => (
                    <Card key={room.id} className="border border-border shadow-none">
                      {room.image_url && (
                        <div className="aspect-[4/3] overflow-hidden rounded-t-lg">
                          <img src={room.image_url} alt={room.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-xs uppercase tracking-wider text-accent font-medium">{room.type}</p>
                            <h3 className="font-display text-lg font-semibold text-foreground">{room.name}</h3>
                          </div>
                          <p className="text-lg font-semibold">{formatKz(room.price_per_night)}</p>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{room.description}</p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/admin/quartos/${room.id}`}>
                              <Pencil className="w-3 h-3 mr-1" /> Editar
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setRoomToDelete(room)}>
                            <Trash2 className="w-3 h-3 mr-1" /> Remover
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              {roomNameFilter.trim() && filteredRooms.length > 0 && (
                <p className="text-sm text-muted-foreground mt-3">A mostrar {filteredRooms.length} de {rooms.length} quartos.</p>
              )}

              {/* Modal de confirmação ao remover quarto */}
              <Dialog open={!!roomToDelete} onOpenChange={(open) => !open && setRoomToDelete(null)}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Remover quarto</DialogTitle>
                    <DialogDescription>
                      {roomToDelete ? (
                        <>Tem a certeza que deseja remover o quarto <strong>{roomToDelete.name}</strong>? Esta ação não pode ser desfeita.</>
                      ) : null}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => setRoomToDelete(null)} disabled={deletingRoom}>
                      Cancelar
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={confirmDeleteRoom}
                      disabled={deletingRoom}
                    >
                      {deletingRoom ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remover"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* Availability Tab */}
            <TabsContent value="availability">
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Pesquisar por nome do quarto..."
                      value={availRoomNameFilter}
                      onChange={(e) => setAvailRoomNameFilter(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "min-w-[200px] justify-start text-left font-normal",
                          !availDateFilter && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {availDateFilter ? format(availDateFilter, "PPP", { locale: pt }) : "Filtrar por data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={availDateFilter}
                        onSelect={setAvailDateFilter}
                        locale={pt}
                        initialFocus
                      />
                      {availDateFilter && (
                        <div className="p-2 border-t">
                          <Button variant="ghost" size="sm" className="w-full" onClick={() => setAvailDateFilter(undefined)}>
                            Limpar data
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                  {(availRoomNameFilter.trim() || availDateFilter) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => {
                        setAvailRoomNameFilter("");
                        setAvailDateFilter(undefined);
                      }}
                    >
                      <X className="w-4 h-4 mr-1" /> Limpar filtros
                    </Button>
                  )}
                </div>
                <div className="shrink-0">
                  <Dialog open={availDialog} onOpenChange={setAvailDialog}>
                    <DialogTrigger asChild>
                      <Button className="bg-accent text-accent-foreground hover:bg-accent/90 w-full sm:w-auto"><Plus className="w-4 h-4 mr-2" /> Adicionar Disponibilidade</Button>
                    </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle className="font-display">Nova Disponibilidade</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Quarto</Label>
                        <Select value={availForm.room_id} onValueChange={(v) => setAvailForm({ ...availForm, room_id: v })}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>{rooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>De</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal h-10",
                                !availForm.available_from && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {availForm.available_from ? format(availForm.available_from, "PPP", { locale: pt }) : "Selecionar data"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={availForm.available_from}
                              onSelect={(d) => setAvailForm({ ...availForm, available_from: d })}
                              locale={pt}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-2">
                        <Label>Até</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal h-10",
                                !availForm.available_to && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {availForm.available_to ? format(availForm.available_to, "PPP", { locale: pt }) : "Selecionar data"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={availForm.available_to}
                              onSelect={(d) => setAvailForm({ ...availForm, available_to: d })}
                              disabled={availForm.available_from ? { before: availForm.available_from } : undefined}
                              locale={pt}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <Button
                        className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                        onClick={saveAvailability}
                        disabled={submittingAvail}
                      >
                        {submittingAvail ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Guardar"}
                      </Button>
                    </div>
                  </DialogContent>
                  </Dialog>
                </div>
              </div>

              {availability.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">Nenhuma disponibilidade definida.</div>
              ) : (
                <>
                  <div className="rounded-md border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Quarto</TableHead>
                          <TableHead>De</TableHead>
                          <TableHead>Até</TableHead>
                          <TableHead className="w-[80px] text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAvailability.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              Nenhum resultado para os filtros aplicados.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredAvailability.map((a) => (
                            <TableRow key={a.id}>
                              <TableCell className="font-medium">{a.rooms?.name ?? "—"}</TableCell>
                              <TableCell>{format(new Date(a.available_from), "PPP", { locale: pt })}</TableCell>
                              <TableCell>{format(new Date(a.available_to), "PPP", { locale: pt })}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    await supabase.from("room_availability").delete().eq("id", a.id);
                                    fetchAll();
                                  }}
                                >
                                  <Trash2 className="w-3 h-3 text-destructive" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {filteredAvailability.length > 0 && (availRoomNameFilter || availDateFilter) && (
                    <p className="text-sm text-muted-foreground mt-3">
                      A mostrar {filteredAvailability.length} de {availability.length} registos.
                    </p>
                  )}
                </>
              )}
            </TabsContent>

            {/* Reservations Tab */}
            <TabsContent value="reservations">
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                  <Select value={reservStatusFilter} onValueChange={setReservStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[160px]">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os estados</SelectItem>
                      <SelectItem value="pendente">Pendente</SelectItem>
                      <SelectItem value="confirmada">Confirmada</SelectItem>
                      <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Filtrar por cliente..."
                      value={reservClientFilter}
                      onChange={(e) => setReservClientFilter(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={reservRoomFilter} onValueChange={setReservRoomFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Quarto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os quartos</SelectItem>
                      {rooms.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full sm:w-[200px] justify-start text-left font-normal",
                          !reservDateFilter && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {reservDateFilter ? format(reservDateFilter, "PPP", { locale: pt }) : "Filtrar por data"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={reservDateFilter}
                        onSelect={setReservDateFilter}
                        locale={pt}
                        initialFocus
                      />
                      {reservDateFilter && (
                        <div className="p-2 border-t">
                          <Button variant="ghost" size="sm" className="w-full" onClick={() => setReservDateFilter(undefined)}>
                            Limpar data
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                  {hasReservFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0"
                      onClick={() => {
                        setReservStatusFilter("all");
                        setReservClientFilter("");
                        setReservDateFilter(undefined);
                        setReservRoomFilter("all");
                      }}
                    >
                      <X className="w-4 h-4 mr-1" /> Limpar filtros
                    </Button>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button className="bg-accent text-accent-foreground hover:bg-accent/90" asChild>
                    <Link to="/admin/reservas/novo">
                      <Plus className="w-4 h-4 mr-2" /> Nova reserva
                    </Link>
                  </Button>
                </div>
              </div>
              {reservations.length === 0 ? (
                <div className="text-center text-muted-foreground py-12 rounded-md border border-border">Nenhuma reserva encontrada.</div>
              ) : (
                <>
                  <div className="rounded-md border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Quarto</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>Check-in</TableHead>
                          <TableHead>Check-out</TableHead>
                          <TableHead>Total a pagar</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="w-[180px]">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredReservations.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                              Nenhuma reserva corresponde aos filtros aplicados.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredReservations.map((r) => {
                            const nights = differenceInDays(new Date(r.check_out), new Date(r.check_in));
                            const pricePerNight = r.rooms?.price_per_night ?? 0;
                            const total = pricePerNight * nights;
                            return (
                            <TableRow key={r.id}>
                              <TableCell className="font-medium">{r.rooms?.name || "—"}</TableCell>
                              <TableCell className="text-muted-foreground">{profileInfo[r.user_id]?.full_name || (r.user_id ? `ID: ${r.user_id.slice(0, 8)}…` : "—")}</TableCell>
                              <TableCell className="text-muted-foreground">{profileInfo[r.user_id]?.phone || "—"}</TableCell>
                              <TableCell>{format(new Date(r.check_in), "PPP", { locale: pt })}</TableCell>
                              <TableCell>{format(new Date(r.check_out), "PPP", { locale: pt })}</TableCell>
                              <TableCell className="font-medium">{pricePerNight > 0 ? formatKz(total) : "—"}</TableCell>
                              <TableCell>
                                <Badge className={`${statusColors[r.status]} border-0 cursor-default`}>{r.status}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                {r.status === "pendente" && (
                                  <div className="flex gap-2 justify-end">
                                    <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => updateReservationStatus(r.id, "confirmada")}>Confirmar</Button>
                                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => updateReservationStatus(r.id, "cancelada")}>Cancelar</Button>
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  {hasReservFilters && filteredReservations.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-3">
                      A mostrar {filteredReservations.length} de {reservations.length} reservas.
                    </p>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
