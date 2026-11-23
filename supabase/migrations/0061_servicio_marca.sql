-- Marca del servicio: a qué negocio pertenece. Distinto de `categoria` (que define
-- el flujo: agencia/leadtion/ghl/puntual). Un servicio puede ser de TRD Agency, de
-- Leadtion, o de AMBAS (ej. Plan Marketing Ads+IA+CRM = servicio de agencia que
-- además entrega cuenta Leadtion).
--   'agencia'  -> TRD Agency
--   'leadtion' -> Leadtion (incluye los GHL)
--   'ambas'    -> Agency + Leadtion

alter table public.servicio_catalogo
  add column if not exists marca text not null default 'agencia';

-- Backfill según lo que ya se sabe del servicio:
update public.servicio_catalogo set marca =
  case
    when coalesce(incluye_leadtion, false) and categoria = 'agencia' then 'ambas'
    when categoria in ('leadtion', 'ghl') then 'leadtion'
    when coalesce(incluye_leadtion, false) then 'ambas'
    else 'agencia'
  end;
