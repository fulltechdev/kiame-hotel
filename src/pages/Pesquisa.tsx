import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Search } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

import roomStandard from "@/assets/room-standard.jpg";
import roomSuperior from "@/assets/room-superior.jpg";
import roomSuite from "@/assets/room-suite.jpg";
import roomDeluxe from "@/assets/room-deluxe.jpg";

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
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [type, setType] = useState("all");
  const [maxPrice, setMaxPrice] = useState("");

  const fetchRooms = async () => {
    setLoading(true);
    let query = supabase.from("rooms").select("*");
    if (type && type !== "all") query = query.eq("type", type as "standard" | "superior" | "suite" | "deluxe");
    if (maxPrice) query = query.lte("price_per_night", parseFloat(maxPrice));
    const { data } = await query.order("price_per_night");
    setRooms(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchRooms(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRooms();
  };

  const handleReserve = async (roomId: string) => {
    if (!user) {
      toast.info("Inicie sessão para fazer uma reserva.");
      navigate("/login");
      return;
    }
    if (!checkIn || !checkOut) {
      toast.error("Selecione as datas de check-in e check-out.");
      return;
    }
    if (new Date(checkOut) <= new Date(checkIn)) {
      toast.error("A data de check-out deve ser posterior ao check-in.");
      return;
    }
    const { error } = await supabase.from("reservations").insert({
      user_id: user.id,
      room_id: roomId,
      check_in: checkIn,
      check_out: checkOut,
    });
    if (error) {
      toast.error("Erro ao criar reserva: " + error.message);
    } else {
      toast.success("Reserva criada com sucesso!");
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
              <Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} min={new Date().toISOString().split("T")[0]} />
            </div>
            <div className="space-y-2">
              <Label>Check-out</Label>
              <Input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} min={checkIn || new Date().toISOString().split("T")[0]} />
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
              <Label>Preço máx. (€)</Label>
              <Input type="number" placeholder="Ex: 200" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
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
            <div className="text-center text-muted-foreground py-12">Nenhum quarto encontrado. Tente outros filtros.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rooms.map((room) => (
                <Card key={room.id} className="border-0 shadow-none overflow-hidden group">
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={room.image_url || defaultImages[room.type] || roomStandard}
                      alt={room.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <CardContent className="p-6">
                    <p className="text-xs uppercase tracking-wider text-accent font-medium mb-2">{room.type}</p>
                    <h3 className="font-display text-xl font-semibold text-foreground mb-2">{room.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{room.description}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <Users className="w-4 h-4" /> Até {room.capacity} pessoas
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-semibold text-foreground">€{room.price_per_night}<span className="text-sm text-muted-foreground font-normal">/noite</span></p>
                      <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => handleReserve(room.id)}>
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
    </div>
  );
}
