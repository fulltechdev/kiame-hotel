-- Verificar que não há reservas que chocam com o período (pendente ou confirmada).
-- Usado na RLS de INSERT/UPDATE de reservations e na consulta de quartos disponíveis.

-- Retorna true se não existir nenhuma reserva no mesmo quarto com período sobreposto (excluindo opcionalmente um id).
CREATE OR REPLACE FUNCTION public.no_overlapping_reservation(
  p_room_id UUID,
  p_check_in DATE,
  p_check_out DATE,
  p_exclude_reservation_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1
    FROM public.reservations r
    WHERE r.room_id = p_room_id
      AND r.status IN ('pendente', 'confirmada')
      AND r.check_in <= p_check_out
      AND r.check_out >= p_check_in
      AND (p_exclude_reservation_id IS NULL OR r.id <> p_exclude_reservation_id)
  );
$$;

-- Retorna os room_id que têm pelo menos uma reserva (pendente ou confirmada) no período.
-- SECURITY DEFINER para que qualquer utilizador possa chamar e obter a lista correta (a RLS não permite ver reservas de outros).
CREATE OR REPLACE FUNCTION public.get_room_ids_booked_in_period(
  p_check_in DATE,
  p_check_out DATE
)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT r.room_id
  FROM public.reservations r
  WHERE r.status IN ('pendente', 'confirmada')
    AND r.check_in <= p_check_out
    AND r.check_out >= p_check_in;
$$;

-- Atualizar políticas de INSERT para exigir também que não haja sobreposição
DROP POLICY IF EXISTS "Users can insert own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Admins can insert reservations for any user" ON public.reservations;

CREATE POLICY "Users can insert own reservations" ON public.reservations
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND public.reservation_within_room_availability(room_id, check_in, check_out)
    AND public.no_overlapping_reservation(room_id, check_in, check_out, NULL)
  );

CREATE POLICY "Admins can insert reservations for any user" ON public.reservations
  FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND public.reservation_within_room_availability(room_id, check_in, check_out)
    AND public.no_overlapping_reservation(room_id, check_in, check_out, NULL)
  );

-- Atualizar políticas de UPDATE para exigir também que não haja sobreposição (excluindo a própria reserva)
DROP POLICY IF EXISTS "Users can update own reservations" ON public.reservations;
DROP POLICY IF EXISTS "Admins can update all reservations" ON public.reservations;

CREATE POLICY "Users can update own reservations" ON public.reservations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND public.reservation_within_room_availability(room_id, check_in, check_out)
    AND public.no_overlapping_reservation(room_id, check_in, check_out, id)
  );

CREATE POLICY "Admins can update all reservations" ON public.reservations
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (
    public.reservation_within_room_availability(room_id, check_in, check_out)
    AND public.no_overlapping_reservation(room_id, check_in, check_out, id)
  );
