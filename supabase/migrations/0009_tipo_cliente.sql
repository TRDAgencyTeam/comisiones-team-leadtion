-- =============================================================================
-- Migración 0009 — Tipo de cliente (Membresías)
--
-- Diferencia: estandar (solo licencia) / agencia (viene con plan de marketing;
-- licencia incluida ahí) / servicio (compró un servicio especial Leadtion:
-- Agente IA, Reactivación o Level Up). Agencia y Servicio NO son lo mismo.
-- =============================================================================

alter table public.clientes add column if not exists tipo_cliente text
  check (tipo_cliente is null or tipo_cliente in ('estandar','agencia','servicio'));

-- Valor inicial: servicio si tiene plan especial; si no, agencia si viene con
-- marketing; si no, estándar. Editable por cliente desde el módulo.
update public.clientes set tipo_cliente =
  case
    when plan_tipo in ('agente_ai','reactivacion','level_up') then 'servicio'
    when incluye_crm_en_marketing then 'agencia'
    else 'estandar'
  end
where tipo_cliente is null;

comment on column public.clientes.tipo_cliente is 'estandar / agencia (plan mkt) / servicio (Agente IA, Reactivación, Level Up).';
