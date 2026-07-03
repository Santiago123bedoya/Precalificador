"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Heart, Users, Scale, Eye, TreePine, Brain } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { getCuestionarioByUser, saveCuestionario } from "@/lib/appwrite/db";
import type { CuestionarioSocioConductual, DimensionEtica, RespuestaCuestionario } from "@/lib/types";
import { USE_MOCK } from "@/lib/mock";

interface Pregunta {
  id: string;
  texto: string;
  dimension: DimensionEtica;
  icono: string;
  tipo: "frecuencia" | "acuerdo";
}

const PREGUNTAS: Pregunta[] = [
  { id: "p1", texto: "¿Asistes a las asambleas de la cooperativa?", dimension: "participacionDemocratica", icono: "🗳️", tipo: "frecuencia" },
  { id: "p2", texto: "¿Recomiendas la cooperativa a familiares y amigos?", dimension: "compromisoComunitario", icono: "🤝", tipo: "frecuencia" },
  { id: "p3", texto: "¿Ayudarías a otros asociados con dificultades financieras?", dimension: "solidaridad", icono: "🤲", tipo: "acuerdo" },
  { id: "p4", texto: "¿Tus decisiones financieras impactan positivamente en tu comunidad?", dimension: "responsabilidadSocial", icono: "🌱", tipo: "acuerdo" },
  { id: "p5", texto: "¿La cooperativa debe tener políticas claras y accesibles para todos?", dimension: "transparencia", icono: "📜", tipo: "acuerdo" },
];

const OPCIONES_FRECUENCIA = [
  { valor: 5, label: "Siempre", class: "bg-green-100 text-green-700 border-green-300 hover:bg-green-200" },
  { valor: 4, label: "Casi siempre", class: "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200" },
  { valor: 3, label: "A veces", class: "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200" },
  { valor: 2, label: "Casi nunca", class: "bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200" },
  { valor: 1, label: "Nunca", class: "bg-red-100 text-red-700 border-red-300 hover:bg-red-200" },
];

const OPCIONES_ACUERDO = [
  { valor: 5, label: "Sí", class: "bg-green-100 text-green-700 border-green-300 hover:bg-green-200" },
  { valor: 1, label: "No", class: "bg-red-100 text-red-700 border-red-300 hover:bg-red-200" },
];

const DIMENSION_INFO: Record<DimensionEtica, { label: string; icon: React.ReactNode; desc: string }> = {
  solidaridad: { label: "Solidaridad", icon: <Heart className="h-4 w-4" />, desc: "Disposición a apoyar a otros asociados" },
  participacionDemocratica: { label: "Participación Democrática", icon: <Users className="h-4 w-4" />, desc: "Involucramiento en la vida cooperativa" },
  responsabilidadSocial: { label: "Responsabilidad Social", icon: <TreePine className="h-4 w-4" />, desc: "Conciencia del impacto comunitario" },
  transparencia: { label: "Transparencia", icon: <Eye className="h-4 w-4" />, desc: "Valoración de la claridad institucional" },
  compromisoComunitario: { label: "Compromiso Comunitario", icon: <Scale className="h-4 w-4" />, desc: "Sentido de pertenencia y promoción" },
};

const PERFIL_INFO = {
  lider: { label: "Líder Cooperativo", color: "text-emerald-600 bg-emerald-50 border-emerald-200", desc: "Ejemplo de valores cooperativos" },
  comprometido: { label: "Comprometido", color: "text-blue-600 bg-blue-50 border-blue-200", desc: "Fuerte sentido de pertenencia" },
  participativo: { label: "Participativo", color: "text-amber-600 bg-amber-50 border-amber-200", desc: "Buena disposición cooperativa" },
  basico: { label: "Básico", color: "text-gray-600 bg-gray-50 border-gray-200", desc: "Conocimiento de los valores" },
  observador: { label: "Observador", color: "text-slate-600 bg-slate-50 border-slate-200", desc: "En proceso de integración cooperativa" },
};

function calcularPerfil(puntaje: number, max: number = PREGUNTAS.length * 5): CuestionarioSocioConductual["perfil"] {
  const pct = puntaje / max;
  if (pct >= 0.9) return "lider";
  if (pct >= 0.75) return "comprometido";
  if (pct >= 0.55) return "participativo";
  if (pct >= 0.35) return "basico";
  return "observador";
}

function calcularInterpretacion(perfil: CuestionarioSocioConductual["perfil"], dimensiones: Record<DimensionEtica, number>): string {
  const baja = Object.entries(dimensiones)
    .filter(([, v]) => v < 60)
    .map(([k]) => DIMENSION_INFO[k as DimensionEtica].label.toLowerCase());

  const alta = Object.entries(dimensiones)
    .filter(([, v]) => v >= 80)
    .map(([k]) => DIMENSION_INFO[k as DimensionEtica].label.toLowerCase());

  const partes: string[] = [];
  if (perfil === "lider") partes.push("¡Excelente! Eres un ejemplo de compromiso cooperativo.");
  else if (perfil === "comprometido") partes.push("Tienes un fuerte sentido de pertenencia y valores cooperativos.");
  else if (perfil === "participativo") partes.push("Muestras buena disposición hacia los principios cooperativos.");
  else if (perfil === "basico") partes.push("Conoces los valores cooperativos pero puedes profundizar tu participación.");
  else partes.push("Estás en proceso de conocer la filosofía cooperativa. ¡Te invitamos a participar más!");

  if (alta.length > 0) partes.push(`Tus fortalezas: ${alta.join(", ")}.`);
  if (baja.length > 0) partes.push(`Áreas de mejora: ${baja.join(", ")}.`);

  return partes.join(" ");
}

export function CuestionarioForm() {
  const { user } = useAuth();
  const [respuestas, setRespuestas] = useState<Record<string, number>>({});
  const [existente, setExistente] = useState<CuestionarioSocioConductual | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completado, setCompletado] = useState(false);
  const [resultado, setResultado] = useState<CuestionarioSocioConductual | null>(null);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const data = await getCuestionarioByUser(user.$id);
        setExistente(data);
        if (data) setResultado(data);
      } catch {} finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const todasRespondidas = PREGUNTAS.every((p) => respuestas[p.id] !== undefined);

  const handleResponder = (preguntaId: string, valor: number) => {
    setRespuestas((prev) => ({ ...prev, [preguntaId]: valor }));
  };

  const handleGuardar = async () => {
    if (!user || !todasRespondidas) return;
    setSaving(true);

    const respuestasArray: RespuestaCuestionario[] = PREGUNTAS.map((p) => ({
      preguntaId: p.id,
      valor: respuestas[p.id],
      dimension: p.dimension,
    }));

    const total = respuestasArray.reduce((sum, r) => sum + r.valor, 0);
    const maximo = PREGUNTAS.length * 5;

    const dimensiones = {} as Record<DimensionEtica, number>;
    for (const dim of ["solidaridad", "participacionDemocratica", "responsabilidadSocial", "transparencia", "compromisoComunitario"] as DimensionEtica[]) {
      const vals = respuestasArray.filter((r) => r.dimension === dim).map((r) => r.valor);
      dimensiones[dim] = vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / (vals.length * 5)) * 100) : 0;
    }

    const perfil = calcularPerfil(total, maximo);
    const interpretacion = calcularInterpretacion(perfil, dimensiones);

    const cuestionario: Omit<CuestionarioSocioConductual, "$id"> = {
      asociadoId: user.$id,
      fecha: new Date().toISOString(),
      respuestas: respuestasArray,
      puntajeTotal: total,
      dimensiones,
      interpretacion,
      perfil,
    };

    try {
      const saved = await saveCuestionario(cuestionario);
      setResultado(saved);
      setCompletado(true);
    } catch (err) {
      console.error("Error guardando cuestionario:", err);
    } finally {
      setSaving(false);
    }
  };

  const reiniciar = () => {
    setRespuestas({});
    setCompletado(false);
    setResultado(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (resultado && !completado && existente) {
    return <ReporteEtico cuestionario={resultado} onRehacer={reiniciar} />;
  }

  if (completado && resultado) {
    return <ReporteEtico cuestionario={resultado} onRehacer={reiniciar} />;
  }

  const preguntasPorDimension = {} as Record<string, Pregunta[]>;
  PREGUNTAS.forEach((p) => {
    if (!preguntasPorDimension[p.dimension]) preguntasPorDimension[p.dimension] = [];
    preguntasPorDimension[p.dimension].push(p);
  });

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 mb-4">
          <Brain className="h-8 w-8 text-purple-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Cuestionario Socio-Conductual</h2>
        <p className="text-sm text-gray-500 mt-2 max-w-lg mx-auto">
          Evalúa tu alineación con los principios cooperativos. Tus respuestas ayudan a construir un perfil ético que la cooperativa valora.
        </p>
        {USE_MOCK && (
          <Badge variant="outline" className="mt-2 bg-amber-50 text-amber-700 border-amber-200">
            Modo simulación
          </Badge>
        )}
      </div>

      {Object.entries(preguntasPorDimension).map(([dim, preguntas]) => {
        const info = DIMENSION_INFO[dim as DimensionEtica];
        const respondidas = preguntas.filter((p) => respuestas[p.id] !== undefined).length;
        return (
          <Card key={dim} className="overflow-hidden">
            <CardHeader className={`pb-3 ${respondidas === preguntas.length ? "bg-green-50/50" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {info?.icon}
                  <CardTitle className="text-sm font-semibold text-gray-800">{info?.label}</CardTitle>
                </div>
                <span className="text-xs text-gray-400">{respondidas}/{preguntas.length}</span>
              </div>
              <CardDescription className="text-xs">{info?.desc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {preguntas.map((pregunta) => {
                const opciones = pregunta.tipo === "acuerdo" ? OPCIONES_ACUERDO : OPCIONES_FRECUENCIA;
                return (
                <div key={pregunta.id} className="pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                  <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <span>{pregunta.icono}</span>
                    {pregunta.texto}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {opciones.map((op) => (
                      <button
                        key={op.valor}
                        type="button"
                        onClick={() => handleResponder(pregunta.id, op.valor)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          respuestas[pregunta.id] === op.valor
                            ? op.class + " ring-2 ring-offset-1"
                            : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {op.label}
                      </button>
                    ))}
                  </div>
                </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      <div className="flex justify-center gap-3 pt-2">
        <Button
          onClick={handleGuardar}
          disabled={!todasRespondidas || saving}
          className="gradient-primary gap-2 px-8"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {saving ? "Guardando..." : "Obtener mi Perfil Ético"}
        </Button>
      </div>
    </div>
  );
}

function ReporteEtico({ cuestionario, onRehacer }: { cuestionario: CuestionarioSocioConductual; onRehacer?: () => void }) {
  const perfilInfo = PERFIL_INFO[cuestionario.perfil];
  const pct = Math.round((cuestionario.puntajeTotal / (PREGUNTAS.length * 5)) * 100);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 mb-4">
          <Sparkles className="h-10 w-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Tu Perfil Ético Cooperativo</h2>
        <p className="text-sm text-gray-500 mt-1">Basado en tus respuestas al cuestionario socio-conductual</p>
      </div>

      <Card className={`border-2 ${perfilInfo.color.split(" ").slice(-1)[0] || "border-gray-200"}`}>
        <CardContent className="py-8 text-center">
          <Badge className={`px-4 py-1.5 text-sm font-semibold border ${perfilInfo.color}`}>
            {perfilInfo.label}
          </Badge>
          <p className="text-sm text-gray-500 mt-3">{perfilInfo.desc}</p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-1000"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-gray-700">{pct}%</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Interpretación</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700 leading-relaxed">{cuestionario.interpretacion}</p>
        </CardContent>
      </Card>

      {onRehacer && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={onRehacer} className="gap-2">
            Volver a responder
          </Button>
        </div>
      )}
    </div>
  );
}
