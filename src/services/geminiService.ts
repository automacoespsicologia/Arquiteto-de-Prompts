import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey! });

export interface AnalysisResult {
  isComplete: boolean;
  missingPillars: string[];
  interviewQuestion?: string;
  megaPrompt?: string;
  autoCriticism?: string;
  appliedTechniques?: string[];
}

const SYSTEM_INSTRUCTION = `Você é um Engenheiro de Prompt Sênior (Arquiteto de Prompts).
Sua missão é transformar ideias vagas em "Mega Prompts" profissionais.

Um Mega Prompt deve conter obrigatoriamente as tags:
# IDENTIDADE (Quem o IA deve ser)
# CONTEXTO (O cenário e por que isso é importante)
# TAREFA (O que exatamente deve ser feito)
# FORMATO (Como a saída deve ser estruturada)
# RESTRIÇÕES (O que NÃO fazer ou limites específicos)

Você deve validar se os "4 Pilares" estão presentes:
1. Clareza (A tarefa é óbvia?)
2. Contexto (O cenário está definido?)
3. Formato (A estrutura de saída está clara?)
4. Restrições (Existem limites definidos?)

Se a ideia for incompleta, NÃO gere o prompt. Em vez disso, identifique o que falta e faça UMA pergunta estratégica para o usuário.

Se a ideia for completa, gere o Mega Prompt e uma Auto-Crítica explicando as técnicas aplicadas (ex: Few-Shot, Chain of Thought, Delimitadores, etc).

Decida automaticamente:
- Use 'Few-Shot' se a tarefa for subjetiva ou exigir um estilo específico (peça exemplos se necessário).
- Use 'Chain of Thought' para tarefas complexas de raciocínio.

Responda sempre em JSON formatado conforme o esquema solicitado.`;

export async function analyzePrompt(
  input: string,
  complexity: "Básico" | "Intermediário" | "Avançado",
  history: { role: "user" | "model"; text: string }[] = []
): Promise<AnalysisResult> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      ...history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
      { parts: [{ text: `Ideia Inicial: ${input}\nNível de Complexidade: ${complexity}` }] }
    ],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isComplete: { type: Type.BOOLEAN },
          missingPillars: { type: Type.ARRAY, items: { type: Type.STRING } },
          interviewQuestion: { type: Type.STRING },
          megaPrompt: { type: Type.STRING },
          autoCriticism: { type: Type.STRING },
          appliedTechniques: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["isComplete", "missingPillars"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function iteratePrompt(
  currentPrompt: string,
  feedback: string
): Promise<{ megaPrompt: string; autoCriticism: string }> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      { parts: [{ text: `Prompt Atual:\n${currentPrompt}\n\nFeedback/Ajuste do Usuário: ${feedback}` }] }
    ],
    config: {
      systemInstruction: "Você é um Engenheiro de Prompt Sênior. Ajuste o prompt com base no feedback do usuário, mantendo a estrutura de Mega Prompt (# IDENTIDADE, # CONTEXTO, # TAREFA, # FORMATO, # RESTRIÇÕES).",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          megaPrompt: { type: Type.STRING },
          autoCriticism: { type: Type.STRING }
        },
        required: ["megaPrompt", "autoCriticism"]
      }
    }
  });

  return JSON.parse(response.text);
}
