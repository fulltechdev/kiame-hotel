-- Perfil: preencher phone no trigger de novo utilizador
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Admins podem criar reservas em nome de qualquer utilizador
CREATE POLICY "Admins can insert reservations for any user" ON public.reservations
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
