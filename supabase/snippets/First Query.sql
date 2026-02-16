
-- Enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Enum para estado da reserva
CREATE TYPE public.reservation_status AS ENUM ('pendente', 'confirmada', 'cancelada');

-- Enum para tipo de quarto
CREATE TYPE public.room_type AS ENUM ('standard', 'superior', 'suite', 'deluxe');

-- Tabela profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Tabela user_roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função has_role (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS para user_roles: apenas admins podem ver
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Tabela rooms
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_per_night NUMERIC(10,2) NOT NULL DEFAULT 0,
  capacity INT NOT NULL DEFAULT 2,
  type room_type NOT NULL DEFAULT 'standard',
  image_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Admins can insert rooms" ON public.rooms FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update rooms" ON public.rooms FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete rooms" ON public.rooms FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Tabela room_availability
CREATE TABLE public.room_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  available_from DATE NOT NULL,
  available_to DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.room_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view availability" ON public.room_availability FOR SELECT USING (true);
CREATE POLICY "Admins can insert availability" ON public.room_availability FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update availability" ON public.room_availability FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete availability" ON public.room_availability FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Tabela reservations
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  status reservation_status NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reservations" ON public.reservations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reservations" ON public.reservations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reservations" ON public.reservations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all reservations" ON public.reservations FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all reservations" ON public.reservations FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON public.reservations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger para criar profile automaticamente no registo
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket para imagens dos quartos
INSERT INTO storage.buckets (id, name, public) VALUES ('room-images', 'room-images', true);

CREATE POLICY "Anyone can view room images" ON storage.objects FOR SELECT USING (bucket_id = 'room-images');
CREATE POLICY "Admins can upload room images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'room-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update room images" ON storage.objects FOR UPDATE USING (bucket_id = 'room-images' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete room images" ON storage.objects FOR DELETE USING (bucket_id = 'room-images' AND public.has_role(auth.uid(), 'admin'));
