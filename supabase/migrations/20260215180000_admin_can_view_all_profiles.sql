-- Admins podem ver todos os perfis (para listar nome e telefone dos clientes nas reservas)
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
