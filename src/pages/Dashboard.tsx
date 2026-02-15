import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, DoorOpen, XCircle } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

interface Reservation {
  id: string;
  check_in: string;
  check_out: string;
  status: string;
  created_at: string;
  rooms: { name: string; type: string; image_url: string; price_per_night: number } | null;
}

const statusColors: Record<string, string> = {
  pendente: "bg-amber-100 text-amber-800",
  confirmada: "bg-emerald-100 text-emerald-800",
  cancelada: "bg-red-100 text-red-800",
};

export default function Dashboard() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReservations = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("reservations")
      .select("*, rooms(name, type, image_url, price_per_night)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setReservations((data as unknown as Reservation[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchReservations(); }, [user]);

  const cancelReservation = async (id: string) => {
    const { error } = await supabase.from("reservations").update({ status: "cancelada" }).eq("id", id);
    if (error) {
      toast.error("Erro ao cancelar: " + error.message);
    } else {
      toast.success("Reserva cancelada.");
      fetchReservations();
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4">
          <h1 className="font-display text-4xl font-bold text-foreground mb-2">As Minhas Reservas</h1>
          <p className="text-muted-foreground mb-10">Consulte e gira as suas reservas</p>

          {loading ? (
            <div className="text-center text-muted-foreground py-12">A carregar...</div>
          ) : reservations.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <DoorOpen className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>Ainda não tem reservas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reservations.map((r) => (
                <Card key={r.id} className="border border-border shadow-none">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-display text-lg">{r.rooms?.name || "Quarto"}</CardTitle>
                      <Badge className={`${statusColors[r.status] || ""} border-0 font-medium text-xs`}>
                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{r.rooms?.type}</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarDays className="w-4 h-4" />
                      <span>{new Date(r.check_in).toLocaleDateString("pt-PT")} — {new Date(r.check_out).toLocaleDateString("pt-PT")}</span>
                    </div>
                    <p className="text-sm text-foreground font-medium">€{r.rooms?.price_per_night}/noite</p>
                    {r.status === "pendente" && (
                      <Button variant="outline" size="sm" className="w-full text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => cancelReservation(r.id)}>
                        <XCircle className="w-4 h-4 mr-2" /> Cancelar Reserva
                      </Button>
                    )}
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
