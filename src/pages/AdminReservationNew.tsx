import { Fragment, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, differenceInDays } from "date-fns";
import { pt } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeft, CalendarIcon, Loader2, UserPlus, UserSearch } from "lucide-react";
import Navbar from "@/components/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn, formatKz } from "@/lib/utils";

import roomStandard from "@/assets/room-standard.jpg";
import roomSuperior from "@/assets/room-superior.jpg";
import roomSuite from "@/assets/room-suite.jpg";
import roomDeluxe from "@/assets/room-deluxe.jpg";

const userFormSchema = z.object({
  email: z.string().email("Email inválido"),
  full_name: z.string().min(1, "Nome é obrigatório"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

const reservationFormSchema = z.object({
  room_id: z.string().min(1, "Selecione um quarto"),
  check_in: z.date({ required_error: "Selecione a data de check-in" }),
  check_out: z.date({ required_error: "Selecione a data de check-out" }),
}).refine((data) => data.check_out > data.check_in, {
  message: "Check-out deve ser após check-in",
  path: ["check_out"],
});

type UserFormValues = z.infer<typeof userFormSchema>;
type ReservationFormValues = z.infer<typeof reservationFormSchema>;

const defaultUserValues: UserFormValues = {
  email: "",
  full_name: "",
  phone: "",
  password: "123456",
};

const defaultRoomImages: Record<string, string> = {
  standard: roomStandard,
  superior: roomSuperior,
  suite: roomSuite,
  deluxe: roomDeluxe,
};

interface Room {
  id: string;
  name: string;
  type: string;
  image_url?: string | null;
  price_per_night?: number;
}

interface Profile {
  user_id: string;
  full_name: string;
  phone: string | null;
}

type ClientChoice = "new" | "existing" | null;

export default function AdminReservationNew() {
  const navigate = useNavigate();
  const [clientChoice, setClientChoice] = useState<ClientChoice>("new");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileSearch, setProfileSearch] = useState("");
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  const userForm = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: defaultUserValues,
  });

  const reservationForm = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationFormSchema),
    defaultValues: { room_id: "", check_in: undefined, check_out: undefined },
  });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("rooms").select("id, name, type, image_url, price_per_night").order("name");
      setRooms((data as Room[]) || []);
    };
    load();
  }, []);

  useEffect(() => {
    if (clientChoice !== "existing") return;
    let cancelled = false;
    setLoadingProfiles(true);
    void (async () => {
      try {
        const { data } = await Promise.resolve(
          supabase.from("profiles").select("user_id, full_name, phone").order("full_name")
        );
        if (!cancelled) setProfiles((data as Profile[]) || []);
      } catch {
        if (!cancelled) setProfiles([]);
      } finally {
        if (!cancelled) setLoadingProfiles(false);
      }
    })();
    return () => { cancelled = true; };
  }, [clientChoice]);

  const filteredProfiles = profileSearch.trim()
    ? profiles.filter(
        (p) =>
          p.full_name.toLowerCase().includes(profileSearch.trim().toLowerCase()) ||
          (p.phone ?? "").includes(profileSearch.trim())
      )
    : profiles;

  const onUserSubmit = async (values: UserFormValues) => {
    const { data, error } = await supabase.functions.invoke("create-user", {
      body: {
        email: values.email,
        password: values.password,
        full_name: values.full_name,
        phone: values.phone,
      },
    });
    if (error) {
      toast.error(error.message || "Erro ao criar utilizador.");
      return;
    }
    if (data?.error) {
      toast.error(data.error);
      return;
    }
    const userId = data?.user_id;
    if (!userId) {
      toast.error("Utilizador criado mas ID não disponível.");
      return;
    }
    setCreatedUserId(userId);
    toast.success("Cliente registado. Preencha os dados da reserva.");
    setStep(2);
  };

  const onSelectExistingUser = (userId: string) => {
    setCreatedUserId(userId);
    toast.success("Cliente selecionado. Preencha os dados da reserva.");
    setStep(2);
  };

  const onReservationContinue = (values: ReservationFormValues) => {
    setStep(3);
  };

  const onReservationSubmit = async (values: ReservationFormValues) => {
    if (!createdUserId) return;
    const checkInStr = format(values.check_in, "yyyy-MM-dd");
    const checkOutStr = format(values.check_out, "yyyy-MM-dd");

    // Verificar se o quarto já tem reserva nesse período (evita erro de RLS e dá feedback claro)
    const { data: bookedIds } = await supabase.rpc("get_room_ids_booked_in_period", {
      p_check_in: checkInStr,
      p_check_out: checkOutStr,
    });
    if (bookedIds && (bookedIds as string[]).includes(values.room_id)) {
      toast.error("Este quarto já tem uma reserva (pendente ou confirmada) nas datas selecionadas. Escolha outras datas ou outro quarto.");
      return;
    }

    const { error } = await supabase.from("reservations").insert({
      user_id: createdUserId,
      room_id: values.room_id,
      check_in: checkInStr,
      check_out: checkOutStr,
      status: "confirmada",
    });
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("row-level security") || msg.includes("policy") || msg.includes("violates")) {
        toast.error("O quarto não está disponível para essas datas (fora do período de disponibilidade ou sobreposição com outra reserva).");
      } else {
        toast.error("Erro ao criar reserva: " + error.message);
      }
      return;
    }
    toast.success("Reserva criada com sucesso!");
    navigate("/admin");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-xl">
          <Button variant="ghost" size="sm" className="mb-6 -ml-2" asChild>
            <Link to="/admin">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao painel
            </Link>
          </Button>

          {/* Stepper: 3 passos com linha de progresso */}
          <div className="flex items-center gap-0 mb-12 max-w-md mx-auto">
            <div className={cn(
              "flex items-center justify-center w-9 h-9 rounded-full border-2 text-sm font-medium shrink-0 transition-colors",
              step >= 1 ? "border-accent bg-accent text-accent-foreground" : "border-muted text-muted-foreground"
            )}>1</div>
            <div className={cn(
              "h-0.5 flex-1 min-w-[48px] mx-1 rounded-full transition-colors duration-300",
              step >= 2 ? "bg-accent" : "bg-muted"
            )} />
            <div className={cn(
              "flex items-center justify-center w-9 h-9 rounded-full border-2 text-sm font-medium shrink-0 transition-colors",
              step >= 2 ? "border-accent bg-accent text-accent-foreground" : "border-muted text-muted-foreground"
            )}>2</div>
            <div className={cn(
              "h-0.5 flex-1 min-w-[48px] mx-1 rounded-full transition-colors duration-300",
              step >= 3 ? "bg-accent" : "bg-muted"
            )} />
            <div className={cn(
              "flex items-center justify-center w-9 h-9 rounded-full border-2 text-sm font-medium shrink-0 transition-colors",
              step >= 3 ? "border-accent bg-accent text-accent-foreground" : "border-muted text-muted-foreground"
            )}>3</div>
          </div>

          {step === 1 && (
            <Tabs value={clientChoice ?? "new"} onValueChange={(v) => setClientChoice(v as ClientChoice)} className="mb-16">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="new" className="gap-2">
                  <UserPlus className="w-4 h-4" /> Cadastrar novo
                </TabsTrigger>
                <TabsTrigger value="existing" className="gap-2">
                  <UserSearch className="w-4 h-4" /> Utilizador existente
                </TabsTrigger>
              </TabsList>
              <TabsContent value="new" className="mt-0">
          {clientChoice === "new" && (
            <Card className="border border-border shadow-none">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="font-display text-xl flex items-center gap-2">
                  Cadastrar cliente
                </CardTitle>
                <CardDescription>
                  Crie o utilizador com uma senha padrão. Depois preencha a reserva.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...userForm}>
                  <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-4">
                    <FormField
                      control={userForm.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome completo</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome do cliente" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={userForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="cliente@email.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={userForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input placeholder="+244 900 000 000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={userForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha padrão</FormLabel>
                          <FormControl>
                            <Input placeholder="" {...field} disabled />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90"
                      disabled={userForm.formState.isSubmitting}
                    >
                      {userForm.formState.isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                      {userForm.formState.isSubmitting ? "A guardar…" : "Registar e continuar"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}
              </TabsContent>
              <TabsContent value="existing" className="mt-0">
            <Card className="border border-border shadow-none">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="font-display text-xl flex items-center gap-2">
                  Selecionar cliente
                </CardTitle>
                <CardDescription>
                  Pesquise pelo nome ou telefone e escolha o utilizador para a reserva.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Pesquisar por nome ou telefone..."
                  value={profileSearch}
                  onChange={(e) => setProfileSearch(e.target.value)}
                  className="w-full"
                />
                {loadingProfiles ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" /> A carregar clientes...
                  </div>
                ) : filteredProfiles.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    {profiles.length === 0 ? "Nenhum utilizador registado." : "Nenhum resultado para a pesquisa."}
                  </p>
                ) : (
                  <ul className="space-y-0 max-h-[280px] overflow-y-auto rounded-md border border-border divide-y divide-border">
                    {filteredProfiles.map((p) => (
                      <li key={p.user_id}>
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full justify-start h-auto py-3 px-4 font-normal hover:bg-muted/40 transition-colors duration-150 rounded-none"
                          onClick={() => onSelectExistingUser(p.user_id)}
                        >
                          <div className="text-left">
                            <p className="font-medium text-foreground">{p.full_name}</p>
                            <p className="text-sm text-muted-foreground">{p.phone || "—"}</p>
                          </div>
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setClientChoice("new")}
                >
                  Voltar
                </Button>
              </CardContent>
            </Card>
              </TabsContent>
            </Tabs>
          )}

          {step === 2 && (
            <Card className="border border-border shadow-none mt-16">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="font-display text-xl flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5" /> Dados da reserva
                </CardTitle>
                <CardDescription>
                  Escolha o quarto e as datas de check-in e check-out.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...reservationForm}>
                  <form onSubmit={reservationForm.handleSubmit(onReservationContinue)} className="space-y-4">
                    <FormField
                      control={reservationForm.control}
                      name="room_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quarto</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecione o quarto" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {rooms.map((r) => (
                                <SelectItem key={r.id} value={r.id}>{r.name} ({r.type})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={reservationForm.control}
                      name="check_in"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Check-in</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? format(field.value, "PPP", { locale: pt }) : "Selecionar data"}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                locale={pt}
                                disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={reservationForm.control}
                      name="check_out"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Check-out</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? format(field.value, "PPP", { locale: pt }) : "Selecionar data"}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                locale={pt}
                                disabled={(d) => {
                                  const min = reservationForm.getValues("check_in");
                                  if (!min) return d < new Date(new Date().setHours(0, 0, 0, 0));
                                  return d <= min;
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() => setStep(1)}
                      >
                        Voltar
                      </Button>
                      <Button
                        type="submit"
                        className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90"
                        disabled={reservationForm.formState.isSubmitting}
                      >
                        Continuar
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {step === 3 && (() => {
            const values = reservationForm.getValues();
            const room = rooms.find((r) => r.id === values.room_id);
            const nights = values.check_in && values.check_out ? differenceInDays(values.check_out, values.check_in) : 0;
            const total = room?.price_per_night != null ? room.price_per_night * nights : 0;
            return (
            <Card className="border border-border shadow-none mt-16">
              <CardHeader className="space-y-1 pb-4">
                <CardTitle className="font-display text-xl">Revisão e confirmação</CardTitle>
                <CardDescription>
                  Confira os dados antes de criar a reserva.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {room && (
                  <div className="flex gap-4">
                    <div className="aspect-[4/3] w-32 flex-shrink-0 overflow-hidden rounded-lg border border-border">
                      <img
                        src={room.image_url || defaultRoomImages[room.type] || roomStandard}
                        alt={room.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1 gap-2">
                      <h3 className="font-display text-lg font-semibold text-foreground">{room.name}</h3>
                      <p className="text-xs uppercase tracking-wider text-accent font-medium">{room.type}</p>
                      {values.check_in && values.check_out && (
                        <Fragment>
                          <p className="text-sm text-muted-foreground mt-1">
                            <span className="font-medium text-foreground">Entrada: </span>{format(values.check_in, "PPP", { locale: pt })}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            <span className="font-medium text-foreground">Saída: </span>{format(values.check_out, "PPP", { locale: pt })}
                          </p>
                        </Fragment>
                      )}
                      <p className="text-sm text-muted-foreground">{nights} {nights === 1 ? "noite" : "noites"}</p>
                    </div>
                  </div>
                )}
                <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-2">
                  {room?.price_per_night != null && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{formatKz(room.price_per_night)} × {nights} noites</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-foreground pt-2 border-t border-border">
                    <span>Total a pagar</span>
                    <span>{formatKz(total)}</span>
                  </div>
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full sm:w-auto"
                    onClick={() => setStep(2)}
                  >
                    Voltar
                  </Button>
                  <Button
                    className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90"
                    disabled={reservationForm.formState.isSubmitting}
                    onClick={() => reservationForm.handleSubmit(onReservationSubmit)()}
                  >
                    {reservationForm.formState.isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {reservationForm.formState.isSubmitting ? "A criar…" : "Confirmar reserva"}
                  </Button>
                </div>
              </CardContent>
            </Card>
            );
          })()}
        </div>
      </main>
    </div>
  );
}
