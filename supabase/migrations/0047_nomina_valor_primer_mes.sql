-- Valor de nómina del PRIMER mes (parcial) cuando la persona entra a mitad de mes.
-- Ese mes se liquida prorrateado (ej. 21→30 sep); del 2º mes en adelante se usa
-- el valor mensual fijo (valor_nomina). NULL = el primer mes también va completo.
alter table public.colaboradores add column if not exists valor_primer_mes numeric;

comment on column public.colaboradores.valor_primer_mes is
  'Valor de nómina del mes de inicio (parcial/prorrateado). Solo aplica al mes de fecha_inicio_contrato; desde el 2º mes se usa valor_nomina. NULL = primer mes completo.';
