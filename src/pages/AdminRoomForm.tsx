import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Upload, Trash2, ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const roomFormSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().default(""),
  price_per_night: z.coerce.number().min(0, "Preço deve ser ≥ 0"),
  capacity: z.coerce.number().int().min(1, "Capacidade mínima 1"),
  type: z.enum(["standard", "superior", "suite", "deluxe"]),
});

type RoomFormValues = z.infer<typeof roomFormSchema>;

const defaultRoomValues: RoomFormValues = {
  name: "",
  description: "",
  price_per_night: 0,
  capacity: 2,
  type: "standard",
};

interface Room {
  id: string;
  name: string;
  description: string;
  price_per_night: number;
  capacity: number;
  type: string;
  image_url: string | null;
}

export default function AdminRoomForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = id && id !== "novo";
  const [loadingRoom, setLoadingRoom] = useState(isEdit);
  const [submittingRoom, setSubmittingRoom] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const roomForm = useForm<RoomFormValues>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: defaultRoomValues,
  });

  useEffect(() => {
    if (!isEdit) return;
    const fetchRoom = async () => {
      const { data, error } = await supabase.from("rooms").select("*").eq("id", id).single();
      if (error || !data) {
        toast.error("Quarto não encontrado.");
        navigate("/admin");
        return;
      }
      const room = data as Room;
      setExistingImageUrl(room.image_url ?? null);
      setImagePreviewUrl(room.image_url ?? null);
      roomForm.reset({
        name: room.name,
        description: room.description ?? "",
        price_per_night: room.price_per_night ?? 0,
        capacity: room.capacity ?? 2,
        type: (room.type as RoomFormValues["type"]) ?? "standard",
      });
      setLoadingRoom(false);
    };
    fetchRoom();
  }, [id, isEdit, navigate, roomForm]);

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  }, [imagePreviewUrl]);

  const removeImage = useCallback(() => {
    if (imagePreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(null);
    setImagePreviewUrl(existingImageUrl);
  }, [imagePreviewUrl, existingImageUrl]);

  const uploadImage = async (file: File | null, existingUrl: string | null | undefined): Promise<string> => {
    if (!file) return existingUrl ?? "";
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("room-images").upload(path, file);
    if (error) { toast.error("Erro ao carregar imagem"); return existingUrl ?? ""; }
    const { data } = supabase.storage.from("room-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const saveRoom = async (values: RoomFormValues) => {
    setSubmittingRoom(true);
    try {
      const image_url = await uploadImage(imageFile, existingImageUrl ?? undefined);
      const payload = {
        name: values.name,
        description: values.description,
        price_per_night: values.price_per_night,
        capacity: values.capacity,
        type: values.type,
        image_url: image_url || undefined,
      };

      if (isEdit && id) {
        const { error } = await supabase.from("rooms").update(payload).eq("id", id);
        if (error) toast.error(error.message);
        else { toast.success("Quarto atualizado!"); navigate("/admin"); }
      } else {
        const { error } = await supabase.from("rooms").insert([payload]);
        if (error) toast.error(error.message);
        else { toast.success("Quarto criado!"); navigate("/admin"); }
      }
    } finally {
      setSubmittingRoom(false);
    }
  };

  if (loadingRoom) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 pt-24 pb-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <Link
            to="/admin"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar ao painel
          </Link>
          <h1 className="font-display text-4xl font-bold text-foreground mb-2">
            {isEdit ? "Editar Quarto" : "Novo Quarto"}
          </h1>
          <p className="text-muted-foreground mb-10">
            {isEdit ? "Atualize os dados do quarto." : "Preencha os dados para criar um novo quarto."}
          </p>

          <Form {...roomForm}>
            <form onSubmit={roomForm.handleSubmit(saveRoom)} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={roomForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={roomForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="superior">Superior</SelectItem>
                          <SelectItem value="suite">Suite</SelectItem>
                          <SelectItem value="deluxe">Deluxe</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={roomForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl><Textarea {...field} rows={4} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={roomForm.control}
                  name="price_per_night"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço/noite (Kz)</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={roomForm.control}
                  name="capacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Capacidade</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="space-y-2">
                <FormLabel>Imagem</FormLabel>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="sr-only"
                  aria-hidden
                />
                {imagePreviewUrl ? (
                  <div className="space-y-2">
                    <div className="relative inline-block rounded-lg overflow-hidden border border-border aspect-[4/3] w-full max-w-[320px]">
                      <img src={imagePreviewUrl} alt="Preview" className="w-full h-full object-cover" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-md"
                        onClick={removeImage}
                        aria-label="Remover imagem"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="rounded-lg border-2 border-dashed border-muted-foreground/40 hover:border-accent hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-2 py-4 px-4 w-full max-w-[320px]"
                    >
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Trocar imagem</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-lg border-2 border-dashed border-muted-foreground/40 hover:border-accent hover:bg-muted/50 transition-colors flex flex-col items-center justify-center gap-2 py-10 px-4 min-h-[120px]"
                  >
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Clique ou arraste uma imagem</span>
                  </button>
                )}
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  asChild
                  className="flex-1 sm:flex-initial"
                >
                  <Link to="/admin">Cancelar</Link>
                </Button>
                <Button
                  type="submit"
                  className="bg-accent text-accent-foreground hover:bg-accent/90 flex-1 sm:flex-initial"
                  disabled={submittingRoom}
                >
                  {submittingRoom ? <Loader2 className="h-4 w-4 animate-spin" /> : "Guardar"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
