import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, CalendarDays, BedDouble, ClipboardList } from "lucide-react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  check_in: string;
  check_out: string;
  status: string;
  created_at: string;
  rooms: { name: string; type: string } | null;
  profiles: { full_name: string } | null;
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
  const [editRoom, setEditRoom] = useState<Partial<Room> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [availDialog, setAvailDialog] = useState(false);
  const [availForm, setAvailForm] = useState({ room_id: "", available_from: "", available_to: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const fetchAll = async () => {
    const [r, res, av] = await Promise.all([
      supabase.from("rooms").select("*").order("created_at"),
      supabase.from("reservations").select("*, rooms(name, type), profiles(full_name)").order("created_at", { ascending: false }),
      supabase.from("room_availability").select("*, rooms(name)").order("available_from"),
    ]);
    setRooms(r.data || []);
    setReservations((res.data as unknown as Reservation[]) || []);
    setAvailability((av.data as unknown as Availability[]) || []);
  };

  useEffect(() => { fetchAll(); }, []);

  const uploadImage = async (): Promise<string> => {
    if (!imageFile) return editRoom?.image_url || "";
    const ext = imageFile.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("room-images").upload(path, imageFile);
    if (error) { toast.error("Erro ao carregar imagem"); return ""; }
    const { data } = supabase.storage.from("room-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const saveRoom = async () => {
    if (!editRoom?.name) return;
    const image_url = await uploadImage();
    const payload = { name: editRoom.name, description: editRoom.description || "", price_per_night: editRoom.price_per_night || 0, capacity: editRoom.capacity || 2, type: (editRoom.type || "standard") as "standard" | "superior" | "suite" | "deluxe", image_url };

    if (editRoom.id) {
      const { error } = await supabase.from("rooms").update(payload).eq("id", editRoom.id);
      if (error) toast.error(error.message); else toast.success("Quarto atualizado!");
    } else {
      const { error } = await supabase.from("rooms").insert([payload]);
      if (error) toast.error(error.message); else toast.success("Quarto criado!");
    }
    setDialogOpen(false);
    setEditRoom(null);
    setImageFile(null);
    fetchAll();
  };

  const deleteRoom = async (id: string) => {
    const { error } = await supabase.from("rooms").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Quarto removido!"); fetchAll(); }
  };

  const saveAvailability = async () => {
    if (!availForm.room_id || !availForm.available_from || !availForm.available_to) return;
    const { error } = await supabase.from("room_availability").insert(availForm);
    if (error) toast.error(error.message); else { toast.success("Disponibilidade adicionada!"); setAvailDialog(false); setAvailForm({ room_id: "", available_from: "", available_to: "" }); fetchAll(); }
  };

  const updateReservationStatus = async (id: string, status: "pendente" | "confirmada" | "cancelada") => {
    const { error } = await supabase.from("reservations").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Estado atualizado!"); fetchAll(); }
  };

  const statusColors: Record<string, string> = {
    pendente: "bg-amber-100 text-amber-800",
    confirmada: "bg-emerald-100 text-emerald-800",
    cancelada: "bg-red-100 text-red-800",
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
              <div className="flex justify-end mb-6">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => { setEditRoom({}); setImageFile(null); }}>
                      <Plus className="w-4 h-4 mr-2" /> Novo Quarto
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle className="font-display">{editRoom?.id ? "Editar Quarto" : "Novo Quarto"}</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2"><Label>Nome</Label><Input value={editRoom?.name || ""} onChange={(e) => setEditRoom({ ...editRoom, name: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Descrição</Label><Textarea value={editRoom?.description || ""} onChange={(e) => setEditRoom({ ...editRoom, description: e.target.value })} /></div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Preço/noite (€)</Label><Input type="number" value={editRoom?.price_per_night || ""} onChange={(e) => setEditRoom({ ...editRoom, price_per_night: parseFloat(e.target.value) })} /></div>
                        <div className="space-y-2"><Label>Capacidade</Label><Input type="number" value={editRoom?.capacity || ""} onChange={(e) => setEditRoom({ ...editRoom, capacity: parseInt(e.target.value) })} /></div>
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select value={editRoom?.type || "standard"} onValueChange={(v) => setEditRoom({ ...editRoom, type: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="superior">Superior</SelectItem>
                            <SelectItem value="suite">Suite</SelectItem>
                            <SelectItem value="deluxe">Deluxe</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Imagem</Label>
                        <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                      </div>
                      <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={saveRoom}>Guardar</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {rooms.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">Nenhum quarto criado.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rooms.map((room) => (
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
                          <p className="text-lg font-semibold">€{room.price_per_night}</p>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{room.description}</p>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => { setEditRoom(room); setDialogOpen(true); }}>
                            <Pencil className="w-3 h-3 mr-1" /> Editar
                          </Button>
                          <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => deleteRoom(room.id)}>
                            <Trash2 className="w-3 h-3 mr-1" /> Remover
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Availability Tab */}
            <TabsContent value="availability">
              <div className="flex justify-end mb-6">
                <Dialog open={availDialog} onOpenChange={setAvailDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-accent text-accent-foreground hover:bg-accent/90"><Plus className="w-4 h-4 mr-2" /> Adicionar Disponibilidade</Button>
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
                      <div className="space-y-2"><Label>De</Label><Input type="date" value={availForm.available_from} onChange={(e) => setAvailForm({ ...availForm, available_from: e.target.value })} /></div>
                      <div className="space-y-2"><Label>Até</Label><Input type="date" value={availForm.available_to} onChange={(e) => setAvailForm({ ...availForm, available_to: e.target.value })} /></div>
                      <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={saveAvailability}>Guardar</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {availability.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">Nenhuma disponibilidade definida.</div>
              ) : (
                <div className="space-y-3">
                  {availability.map((a) => (
                    <Card key={a.id} className="border border-border shadow-none">
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <p className="font-medium text-foreground">{a.rooms?.name}</p>
                          <p className="text-sm text-muted-foreground">{new Date(a.available_from).toLocaleDateString("pt-PT")} — {new Date(a.available_to).toLocaleDateString("pt-PT")}</p>
                        </div>
                        <Button variant="outline" size="sm" className="text-destructive" onClick={async () => { await supabase.from("room_availability").delete().eq("id", a.id); fetchAll(); }}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Reservations Tab */}
            <TabsContent value="reservations">
              {reservations.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">Nenhuma reserva encontrada.</div>
              ) : (
                <div className="space-y-3">
                  {reservations.map((r) => (
                    <Card key={r.id} className="border border-border shadow-none">
                      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                        <div>
                          <p className="font-medium text-foreground">{r.rooms?.name || "—"}</p>
                          <p className="text-sm text-muted-foreground">{r.profiles?.full_name || "Utilizador"}</p>
                          <p className="text-sm text-muted-foreground">{new Date(r.check_in).toLocaleDateString("pt-PT")} — {new Date(r.check_out).toLocaleDateString("pt-PT")}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={`${statusColors[r.status]} border-0`}>{r.status}</Badge>
                          {r.status === "pendente" && (
                            <div className="flex gap-2">
                              <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => updateReservationStatus(r.id, "confirmada")}>Confirmar</Button>
                              <Button size="sm" variant="outline" className="text-destructive" onClick={() => updateReservationStatus(r.id, "cancelada")}>Cancelar</Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
