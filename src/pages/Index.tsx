import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Star, Shield, MapPin, Phone, Mail, Users, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";

import hero1 from "@/assets/hero-1.jpg";
import hero2 from "@/assets/hero-2.jpg";
import hero3 from "@/assets/hero-3.jpg";
import roomStandard from "@/assets/room-standard.jpg";
import roomSuperior from "@/assets/room-superior.jpg";
import roomSuite from "@/assets/room-suite.jpg";
import roomDeluxe from "@/assets/room-deluxe.jpg";
import { formatKz } from "@/lib/utils";

const heroImages = [hero1, hero2, hero3];
const heroTexts = [
  { title: "Bem-vindo ao Kiame", subtitle: "Onde a elegância encontra o conforto" },
  { title: "Quartos Exclusivos", subtitle: "Design sofisticado para estadias memoráveis" },
  { title: "Experiências Únicas", subtitle: "Descubra o melhor da hospitalidade" },
];

const defaultRoomImages: Record<string, string> = {
  standard: roomStandard,
  superior: roomSuperior,
  suite: roomSuite,
  deluxe: roomDeluxe,
};

const features = [
  { icon: Star, title: "Serviço Premium", desc: "Atendimento personalizado 24 horas por dia" },
  { icon: Shield, title: "Reserva Segura", desc: "As suas informações são sempre protegidas" },
  { icon: MapPin, title: "Localização Privilegiada", desc: "No coração da cidade, perto de tudo" },
  { icon: Users, title: "Equipa Dedicada", desc: "Profissionais apaixonados pelo detalhe" },
];

interface Room {
  id: string;
  name: string;
  description: string;
  price_per_night: number;
  capacity: number;
  type: string;
  image_url: string;
}

export default function Index() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    supabase.from("rooms").select("*").limit(8).then(({ data }) => {
      if (data) setRooms(data);
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setHeroIndex((i) => (i + 1) % heroImages.length), 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="relative h-screen overflow-hidden">
        {heroImages.map((img, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-1000"
            style={{ opacity: heroIndex === i ? 1 : 0 }}
          >
            <img src={img} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-primary/60" />
          </div>
        ))}
        <div className="relative z-10 flex items-center justify-center h-full text-center px-4">
          <div className="animate-fade-in">
            <h1 className="font-display text-5xl md:text-7xl font-bold text-primary-foreground mb-6">
              {heroTexts[heroIndex].title}
            </h1>
            <p className="text-xl md:text-2xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
              {heroTexts[heroIndex].subtitle}
            </p>
            <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 text-base px-8 py-6" onClick={() => navigate("/pesquisa")}>
              Reservar Agora <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
        {/* Dots */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex gap-3">
          {heroImages.map((_, i) => (
            <button key={i} onClick={() => setHeroIndex(i)} className={`w-3 h-3 rounded-full transition-all ${heroIndex === i ? "bg-accent scale-110" : "bg-primary-foreground/40"}`} />
          ))}
        </div>
      </section>

      {/* Sobre */}
      <section id="sobre" className="py-24 bg-background">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="font-display text-4xl font-bold text-foreground mb-6">Sobre o Kiame</h2>
          <div className="w-16 h-0.5 bg-accent mx-auto mb-8" />
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">
            O Kiame nasceu da paixão por criar experiências de hospitalidade que transcendem o comum. Cada detalhe do nosso espaço foi pensado para proporcionar momentos de tranquilidade e sofisticação.
          </p>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Com uma equipa dedicada e instalações de excelência, o Kiame é o destino perfeito para quem procura uma estadia inesquecível, seja em negócios ou lazer.
          </p>
        </div>
      </section>

      {/* Porquê o Kiame */}
      <section className="py-24 bg-muted">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-4xl font-bold text-foreground text-center mb-6">Porquê o Kiame</h2>
          <div className="w-16 h-0.5 bg-accent mx-auto mb-16" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => (
              <Card key={i} className="border-0 shadow-none bg-card">
                <CardContent className="p-8 text-center">
                  <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-5">
                    <f.icon className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-foreground mb-3">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Quartos */}
      <section id="quartos" className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-4xl font-bold text-foreground text-center mb-6">Os Nossos Quartos</h2>
          <div className="w-16 h-0.5 bg-accent mx-auto mb-16" />

          {rooms.length > 0 ? (
            <div className="px-12">
              <Carousel opts={{ align: "start", loop: true }}>
                <CarouselContent>
                  {rooms.map((room) => (
                    <CarouselItem key={room.id} className="md:basis-1/2 lg:basis-1/3">
                      <Card className="border-0 shadow-none overflow-hidden group cursor-pointer" onClick={() => navigate("/pesquisa")}>
                        <div className="aspect-[4/3] overflow-hidden">
                          <img
                            src={room.image_url || defaultRoomImages[room.type] || roomStandard}
                            alt={room.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </div>
                        <CardContent className="p-6">
                          <p className="text-xs uppercase tracking-wider text-accent font-medium mb-2">{room.type}</p>
                          <h3 className="font-display text-xl font-semibold text-foreground mb-2">{room.name}</h3>
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{room.description}</p>
                          <p className="text-lg font-semibold text-foreground">{formatKz(room.price_per_night)}<span className="text-sm text-muted-foreground font-normal">/noite</span></p>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Object.entries(defaultRoomImages).map(([type, img]) => (
                <Card key={type} className="border-0 shadow-none overflow-hidden group cursor-pointer" onClick={() => navigate("/pesquisa")}>
                  <div className="aspect-[4/3] overflow-hidden">
                    <img src={img} alt={type} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <CardContent className="p-6">
                    <p className="text-xs uppercase tracking-wider text-accent font-medium mb-2">{type}</p>
                    <h3 className="font-display text-xl font-semibold text-foreground mb-2">Quarto {type.charAt(0).toUpperCase() + type.slice(1)}</h3>
                    <p className="text-sm text-muted-foreground">Brevemente disponível</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Contacto */}
      <section id="contacto" className="py-24 bg-muted">
        <div className="container mx-auto px-4">
          <h2 className="font-display text-4xl font-bold text-foreground text-center mb-6">Contacte-nos</h2>
          <div className="w-16 h-0.5 bg-accent mx-auto mb-16" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <div>
              <h3 className="font-display text-2xl font-semibold text-foreground mb-6">Envie-nos uma mensagem</h3>
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                <Input placeholder="O seu nome" className="bg-card border-border" />
                <Input type="email" placeholder="O seu email" className="bg-card border-border" />
                <Textarea placeholder="A sua mensagem" rows={5} className="bg-card border-border" />
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90">Enviar Mensagem</Button>
              </form>
            </div>
            <div className="space-y-6">
              <h3 className="font-display text-2xl font-semibold text-foreground mb-6">Informações</h3>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Morada</p>
                  <p className="text-sm text-muted-foreground">Rua Comandante Bula — Uige, Angola</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Telefone</p>
                  <p className="text-sm text-muted-foreground">+244 912 345 678</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Email</p>
                  <p className="text-sm text-muted-foreground">info@kiame.com</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
