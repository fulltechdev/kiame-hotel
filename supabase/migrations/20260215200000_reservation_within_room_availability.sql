-- Impedir que uma reserva seja criada/atualizada fora do período de disponibilidade do quarto.
-- Função que verifica se o período (check_in, check_out) está contido em algum
-- intervalo de room_availability para o quarto.
CREATE OR REPLACE FUNCTION public.reservation_within_room_availability(
  p_room_id UUID,
  p_check_in DATE,
  p_check_out DATE
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.room_availability ra
    WHERE ra.room_id = p_room_id
      AND ra.available_from <= p_check_in
      AND ra.available_to >= p_check_out
  );
$$;

-- Remover políticas de INSERT atuais para recriar com a validação de disponibilidade
DROP POLICY IF EXISTS "Users can insert own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Admins can insert reservations for any user" ON public.reservations;

-- Utilizadores só podem criar reservas nas suas e dentro do período de disponibilidade
CREATE POLICY "Users can insert own reservations" ON public.reservations
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.reservation_within_room_availability(room_id, check_in, check_out)
  );

-- Admins podem criar reservas para qualquer utilizador, mas dentro do período de disponibilidade
CREATE POLICY "Admins can insert reservations for any user" ON public.reservations
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND public.reservation_within_room_availability(room_id, check_in, check_out)
  );

-- Atualização: também exige que o período permaneça dentro da disponibilidade
DROP POLICY IF EXISTS "Users can update own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Admins can update all reservations" ON public.reservations;

CREATE POLICY "Users can update own reservations" ON public.reservations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND public.reservation_within_room_availability(room_id, check_in, check_out)
  );

CREATE POLICY "Admins can update all reservations" ON public.reservations
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (
    public.reservation_within_room_availability(room_id, check_in, check_out)
  );
