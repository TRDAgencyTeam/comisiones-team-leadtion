"use client";

import { useEffect, useState } from "react";
import { formatoMonto, montoATexto, parseMonto } from "@/lib/numero";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "type"> & {
  /** Valor inicial (número guardado o texto). */
  defaultValue?: number | string | null;
  /** false = solo enteros (COP). */
  decimales?: boolean;
  /** Modo controlado: número actual (si cambia por fuera, el texto se actualiza). */
  valor?: number | null;
  /** Avisa el número leído cada vez que cambia. */
  onValor?: (n: number) => void;
};

/**
 * Campo de dinero con puntos de miles mientras se escribe ("623.000", "1.234,56").
 * El servidor lo lee con `parseMonto`. Pegar "78.46" o "623000" también funciona.
 */
export function InputMonto({ defaultValue, valor, decimales = true, onValor, ...rest }: Props) {
  const inicial = valor !== undefined ? valor : defaultValue;
  const [txt, setTxt] = useState(() =>
    inicial == null || inicial === "" || inicial === 0 && valor !== undefined ? "" : montoATexto(typeof inicial === "string" ? parseMonto(inicial) : inicial, decimales));
  // Controlado: si el número cambió desde fuera (p. ej. precio por defecto), re-formatea.
  useEffect(() => {
    if (valor === undefined) return;
    setTxt((t) => (parseMonto(t) === (valor ?? 0) ? t : valor ? montoATexto(valor, decimales) : ""));
  }, [valor, decimales]);
  return (
    <input
      {...rest}
      type="text"
      inputMode={decimales ? "decimal" : "numeric"}
      autoComplete="off"
      value={txt}
      onChange={(e) => {
        const ev = e.nativeEvent as InputEvent;
        const tipo = ev.inputType ?? "";
        const raw = e.target.value;
        // Pegado, autocompletado o varios caracteres de golpe → se interpreta el valor completo.
        const enBloque = tipo.startsWith("insertFrom") || tipo === "insertReplacementText" || (ev.data?.length ?? 0) > 1;
        const t = enBloque
          ? montoATexto(parseMonto(raw), decimales) // pegado: se interpreta completo
          : formatoMonto(raw, decimales);
        setTxt(t);
        onValor?.(parseMonto(t));
      }}
    />
  );
}
