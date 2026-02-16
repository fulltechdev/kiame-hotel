-- Ao confirmar uma reserva, remover o período reservado da disponibilidade do quarto,
-- para que o quarto não apareça nos filtros de pesquisa para essas datas.

CREATE OR REPLACE FUNCTION public.remove_availability_for_reservation(
  p_room_id UUID,
  p_check_in DATE,
  p_check_out DATE
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  from_before DATE;
  to_after DATE;
BEGIN
  -- Percorrer todos os blocos de disponibilidade que sobrepõem o período [p_check_in, p_check_out]
  FOR r IN
    SELECT id, available_from, available_to
    FROM public.room_availability
    WHERE room_id = p_room_id
      AND available_from <= p_check_out
      AND available_to >= p_check_in
  LOOP
    -- Remover o bloco atual (será substituído por 0, 1 ou 2 blocos)
    DELETE FROM public.room_availability WHERE id = r.id;

    -- Segmento antes da reserva: [available_from, check_in - 1 dia]
    IF r.available_from < p_check_in THEN
      from_before := r.available_from;
      to_after := p_check_in - 1;
      IF from_before <= to_after THEN
        INSERT INTO public.room_availability (room_id, available_from, available_to)
        VALUES (p_room_id, from_before, to_after);
      END IF;
    END IF;

    -- Segmento depois da reserva: [check_out + 1 dia, available_to]
    IF r.available_to > p_check_out THEN
      from_before := p_check_out + 1;
      to_after := r.available_to;
      IF from_before <= to_after THEN
        INSERT INTO public.room_availability (room_id, available_from, available_to)
        VALUES (p_room_id, from_before, to_after);
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Trigger: ao passar uma reserva a "confirmada", remover esse período da disponibilidade
CREATE OR REPLACE FUNCTION public.on_reservation_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'confirmada' AND (OLD.status IS NULL OR OLD.status <> 'confirmada') THEN
    PERFORM public.remove_availability_for_reservation(NEW.room_id, NEW.check_in::date, NEW.check_out::date);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_remove_availability_on_confirm ON public.reservations;
CREATE TRIGGER trigger_remove_availability_on_confirm
  AFTER UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.on_reservation_confirmed();
