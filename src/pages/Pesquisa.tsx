import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, addDays, startOfDay, differenceInDays } from "date-fns";
import { pt } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Search, CalendarIcon } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import roomStandard from "@/assets/room-standard.jpg";
import roomSuperior from "@/assets/room-superior.jpg";
import roomSuite from "@/assets/room-suite.jpg";
import roomDeluxe from "@/assets/room-deluxe.jpg";
import { formatKz } from "@/lib/utils";

const defaultImages: Record<string, string> = { standard: roomStandard, superior: roomSuperior, suite: roomSuite, deluxe: roomDeluxe };

interface Room {
  id: string;
  name: string;
  description: string;
  price_per_night: number;
  capacity: number;
  type: string;
  image_url: string;
}

export default function Pesquisa() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkIn, setCheckIn] = useState<Date | undefined>(undefined);
  const [checkOut, setCheckOut] = useState<Date | undefined>(undefined);
  const [type, setType] = useState("all");
  const [maxPrice, setMaxPrice] = useState("");
  const [confirmRoom, setConfirmRoom] = useState<Room | null>(null);
  const [reserving, setReserving] = useState(false);
  const today = startOfDay(new Date());

  const fetchRooms = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("rooms").select("*");
    if (type && type !== "all") query = query.eq("type", type as "standard" | "superior" | "suite" | "deluxe");
    if (maxPrice) query = query.lte("price_per_night", parseFloat(maxPrice));
    const { data: roomsData } = await query.order("price_per_night");
    let result: Room[] = roomsData || [];

    // Se o utilizador escolheu datas, mostrar apenas quartos disponíveis nesse intervalo
    if (checkIn && checkOut && result.length > 0) {
      const checkInStr = format(checkIn, "yyyy-MM-dd");
      const checkOutStr = format(checkOut, "yyyy-MM-dd");

      // Quartos que têm uma janela de disponibilidade que cobre [checkIn, checkOut]
      const { data: availabilityData } = await supabase
        .from("room_availability")
        .select("room_id")
        .lte("available_from", checkInStr)
        .gte("available_to", checkOutStr);
      const availableRoomIds = new Set((availabilityData || []).map((a) => a.room_id));

      // Quartos com reservas (pendente ou confirmada) que sobrepõem o período — via RPC para não depender da RLS
      const { data: bookedIds } = await supabase.rpc("get_room_ids_booked_in_period", {
        p_check_in: checkInStr,
        p_check_out: checkOutStr,
      });
      const bookedRoomIds = new Set((bookedIds || []) as string[]);

      result = result.filter(
        (room) => availableRoomIds.has(room.id) && !bookedRoomIds.has(room.id)
      );
    }

    setRooms(result);
    setLoading(false);
  }, [checkIn, checkOut, type, maxPrice]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRooms();
  };

  const openConfirmModal = (room: Room) => {
    if (!user) {
      toast.info("Inicie sessão para fazer uma reserva.");
      navigate("/login");
      return;
    }
    if (!checkIn || !checkOut) {
      toast.error("Selecione as datas de check-in e check-out.");
      return;
    }
    if (checkOut <= checkIn) {
      toast.error("A data de check-out deve ser posterior ao check-in.");
      return;
    }
    setConfirmRoom(room);
  };

  const doReserve = async (roomId: string) => {
    if (!user || !checkIn || !checkOut) return;
    setReserving(true);
    const checkInStr = format(checkIn, "yyyy-MM-dd");
    const checkOutStr = format(checkOut, "yyyy-MM-dd");
    const { error } = await supabase.from("reservations").insert({
      user_id: user.id,
      room_id: roomId,
      check_in: checkInStr,
      check_out: checkOutStr,
    });
    setReserving(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("row-level security") || msg.includes("policy") || msg.includes("violates")) {
        toast.error("Este quarto já não está disponível para essas datas. Atualize a pesquisa e escolha outro quarto ou outras datas.");
      } else {
        toast.error("Erro ao criar reserva: " + error.message);
      }
      setConfirmRoom(null);
    } else {
      toast.success("Reserva criada com sucesso!");
      setConfirmRoom(null);
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          <h1 className="font-display text-4xl font-bold text-foreground mb-2">Pesquisar Quartos</h1>
          <p className="text-muted-foreground mb-10">Encontre o quarto perfeito para a sua estadia</p>

          {/* Filters */}
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-12 p-6 bg-card rounded-lg border border-border">
            <div className="space-y-2">
              <Label>Check-in</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-10",
                      !checkIn && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkIn ? format(checkIn, "PPP", { locale: pt }) : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkIn}
                    onSelect={setCheckIn}
                    disabled={{ before: today }}
                    locale={pt}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Check-out</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-10",
                      !checkOut && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {checkOut ? format(checkOut, "PPP", { locale: pt }) : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkOut}
                    onSelect={setCheckOut}
                    disabled={{
                      before: checkIn ? addDays(checkIn, 1) : today,
                    }}
                    locale={pt}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="superior">Superior</SelectItem>
                  <SelectItem value="suite">Suite</SelectItem>
                  <SelectItem value="deluxe">Deluxe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Preço máx. (Kz)</Label>
              <Input type="number" placeholder="Ex: 20.000" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                <Search className="w-4 h-4 mr-2" /> Pesquisar
              </Button>
            </div>
          </form>

          {/* Results */}
          {loading ? (
            <div className="text-center text-muted-foreground py-12">A carregar quartos...</div>
          ) : rooms.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              {checkIn && checkOut
                ? "Nenhum quarto disponível para as datas selecionadas. Tente outras datas ou filtros."
                : "Nenhum quarto encontrado. Tente outros filtros."}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {rooms.map((room) => (
                <Card key={room.id} className="border-0 shadow-none overflow-hidden group flex flex-col h-full">
                  <div className="aspect-[4/3] overflow-hidden flex-shrink-0">
                    <img
                      src={room.image_url || defaultImages[room.type] || roomStandard}
                      alt={room.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <CardContent className="p-6 flex flex-col flex-1 flex-grow">
                    <p className="text-xs uppercase tracking-wider text-accent font-medium mb-2">{room.type}</p>
                    <h3 className="font-display text-xl font-semibold text-foreground mb-2">{room.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{room.description}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <Users className="w-4 h-4" /> Até {room.capacity} pessoas
                    </div>
                    <div className="mt-auto pt-4 border-t border-border flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <p className="text-lg font-semibold text-foreground">{formatKz(room.price_per_night)}<span className="text-sm text-muted-foreground font-normal">/noite</span></p>
                      <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 w-full md:w-auto shrink-0" onClick={() => openConfirmModal(room)}>
                        Reservar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Modal de confirmação da reserva */}
      <Dialog open={!!confirmRoom} onOpenChange={(open) => !open && setConfirmRoom(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar reserva</DialogTitle>
            <DialogDescription>
              Deseja realmente reservar este quarto para as datas selecionadas?
            </DialogDescription>
          </DialogHeader>
          {confirmRoom && checkIn && checkOut && (
            <div className="space-y-4 py-2">
              <div className="flex gap-4">
                <div className="aspect-[4/3] w-28 flex-shrink-0 overflow-hidden rounded-lg border border-border">
                  <img
                    src={confirmRoom.image_url || defaultImages[confirmRoom.type] || roomStandard}
                    alt={confirmRoom.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col justify-center min-w-0 gap-2">
                  <h3 className="font-display text-lg font-semibold text-foreground truncate">{confirmRoom.name}</h3>
                  <p className="text-xs uppercase tracking-wider text-accent font-medium">{confirmRoom.type}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <span className="font-medium text-foreground">Entrada: </span> {format(checkIn, "PPP", { locale: pt })}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <span className="font-medium text-foreground">Saída: </span> {format(checkOut, "PPP", { locale: pt })}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {differenceInDays(checkOut, checkIn)} {differenceInDays(checkOut, checkIn) === 1 ? "noite" : "noites"}
                  </p>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{formatKz(confirmRoom.price_per_night)} × {differenceInDays(checkOut, checkIn)} noites</span>
                </div>
                <div className="mt-2 flex justify-between font-semibold text-foreground">
                  <span>Total a pagar</span>
                  <span>{formatKz(confirmRoom.price_per_night * differenceInDays(checkOut, checkIn))}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmRoom(null)} disabled={reserving}>
              Cancelar
            </Button>
            <Button
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => confirmRoom && doReserve(confirmRoom.id)}
              disabled={reserving}
            >
              {reserving ? "A processar…" : "Sim, reservar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
