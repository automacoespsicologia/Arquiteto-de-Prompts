/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { 
  Send, 
  Copy, 
  RefreshCw, 
  BookOpen, 
  Settings2, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight,
  Sparkles,
  MessageSquare,
  Code,
  PenTool,
  BarChart3,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import { cn } from "./lib/utils";
import { analyzePrompt, iteratePrompt, type AnalysisResult } from "./services/geminiService";

type Complexity = "Básico" | "Intermediário" | "Avançado";

interface Message {
  role: "user" | "model";
  text: string;
}

const TEMPLATES = [
  // CÓDIGO E DESENVOLVIMENTO
  {
    id: "debug",
    title: "Debug de Código",
    icon: <Code className="w-4 h-4" />,
    description: "Identifique a causa de erros e obtenha a correção explicada.",
    prompt: "Estou com o seguinte erro no meu código [LINGUAGEM]:\n\n[COLE A MENSAGEM DE ERRO COMPLETA]\n\nO código relevante é:\n[COLE O CÓDIGO]\n\nContexto adicional:\n- O que eu estava tentando fazer: [EXPLIQUE]\n- O que eu já tentei: [LISTE]\n\nPor favor:\n1. Explique o que está causando o erro\n2. Mostre a correção\n3. Explique por que a correção funciona"
  },
  {
    id: "refactor",
    title: "Refatoração de Código",
    icon: <RefreshCw className="w-4 h-4" />,
    description: "Melhore a legibilidade, performance e manutenção do seu código.",
    prompt: "Refatore o código abaixo seguindo boas práticas de [LINGUAGEM]:\n\n[COLE O CÓDIGO]\n\nFoque em:\n- Legibilidade (nomes claros, estrutura limpa)\n- Performance (se houver otimizações óbvias)\n- Manutenibilidade (código fácil de modificar depois)\n\nPra cada mudança significativa, explique o porquê. Se alguma parte já está boa, pode manter."
  },
  // ESCRITA E CONTEÚDO
  {
    id: "copywriting",
    title: "Copywriting Persuasivo",
    icon: <PenTool className="w-4 h-4" />,
    description: "Crie textos de vendas focados em conversão e dor do público.",
    prompt: "Você é um copywriter especialista em [NICHO]. Escreva uma copy pra [TIPO: landing page, email, anúncio] sobre [PRODUTO/SERVIÇO].\n\nDetalhes do produto:\n- O que é: [DESCRIÇÃO]\n- Pra quem é: [PÚBLICO]\n- Principal benefício: [BENEFÍCIO]\n- Diferencial: [O QUE TORNA ÚNICO]\n\nPúblico-alvo:\n- Quem são: [DESCRIÇÃO]\n- Maior dor: [PROBLEMA QUE ENFRENTAM]\n- O que já tentaram: [SOLUÇÕES ANTERIORES]\n\nTom de voz: [FORMAL/INFORMAL/PROVOCATIVO/EMPÁTICO]\nObjetivo: [VENDA/LEAD/ENGAJAMENTO]\n\nUse técnicas de persuasão mas sem ser apelativo. Inclua: headline, subheadline, corpo, CTA."
  },
  {
    id: "linkedin",
    title: "Post para LinkedIn",
    icon: <MessageSquare className="w-4 h-4" />,
    description: "Gere autoridade e engajamento com posts estruturados.",
    prompt: "Crie um post pra LinkedIn sobre [TEMA].\n\nSobre mim (autor):\n- Profissão: [SUA PROFISSÃO]\n- Área: [SUA ÁREA]\n- Tom de voz: [SEU ESTILO]\n\nObjetivo do post: [ENGAJAMENTO/AUTORIDADE/CONVERSÃO]\n\nEstrutura:\n- Gancho forte na primeira linha\n- Desenvolvimento com valor real\n- CTA ou pergunta no final\n\nFormato:\n- Frases curtas\n- Espaçamento entre parágrafos\n- Máximo [X] linhas\n- Sem hashtags excessivas"
  },
  // ANÁLISE E PESQUISA
  {
    id: "doc-analysis",
    title: "Análise de Documento",
    icon: <BarChart3 className="w-4 h-4" />,
    description: "Extraia insights, riscos e recomendações de qualquer texto.",
    prompt: "Analise o documento abaixo:\n\n[COLE O DOCUMENTO]\n\nObjetivo da análise: [O QUE VOCÊ QUER DESCOBRIR]\n\nMe entregue:\n1. RESUMO EXECUTIVO\n2. PONTOS PRINCIPAIS\n3. PONTOS DE ATENÇÃO (Riscos/inconsistências)\n4. RECOMENDAÇÕES\n5. PERGUNTAS EM ABERTO"
  },
  {
    id: "research",
    title: "Pesquisa sobre Tema",
    icon: <BookOpen className="w-4 h-4" />,
    description: "Obtenha uma visão geral profunda sobre qualquer assunto.",
    prompt: "Me dê uma visão geral sobre [TEMA].\n\nMeu nível de conhecimento atual: [ZERO/BÁSICO/INTERMEDIÁRIO]\n\nPreciso entender:\n- O que é e por que importa\n- Principais conceitos/termos\n- Estado atual (tendências, players principais)\n- Pontos de debate/controvérsia se houver\n- Recursos pra aprofundar\n\nTamanho: [BREVE/MÉDIO/DETALHADO]"
  },
  // PRODUTIVIDADE
  {
    id: "action-plan",
    title: "Plano de Ação",
    icon: <Settings2 className="w-4 h-4" />,
    description: "Transforme objetivos em passos concretos e mensuráveis.",
    prompt: "Me ajude a criar um plano de ação pra [OBJETIVO].\n\nSituação atual: [ONDE ESTOU HOJE]\nMeta: [ONDE QUERO CHEGAR]\nPrazo: [TEMPO DISPONÍVEL]\n\nRecursos disponíveis:\n- Tempo: [X] horas por semana\n- Orçamento: [SE HOUVER]\n- Ferramentas/skills: [O QUE JÁ TENHO]\n\nRestrições: [LIMITAÇÕES, COMPROMISSOS, OBSTÁCULOS]\n\nFormato do plano:\n- Milestones com datas\n- Tarefas específicas\n- Métricas de sucesso\n- Pontos de revisão"
  },
  {
    id: "brainstorm",
    title: "Brainstorm de Ideias",
    icon: <Sparkles className="w-4 h-4" />,
    description: "Gere soluções criativas e inovadoras para seus desafios.",
    prompt: "Preciso de ideias pra [OBJETIVO].\n\nContexto: [SITUAÇÃO, RESTRIÇÕES, PÚBLICO]\nO que já foi tentado/descartado: [SE HOUVER]\n\nTipo de ideias que busco: [CRIATIVAS/PRÁTICAS/INOVADORAS]\n\nGere [X] ideias. Pra cada uma, inclua:\n- A ideia em 1 frase\n- Por que pode funcionar\n- Principal obstáculo\n- Próximo passo pra testar"
  }
];

export default function App() {
  const [input, setInput] = useState("");
  const [complexity, setComplexity] = useState<Complexity>("Intermediário");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [iterationInput, setIterationInput] = useState("");
  const [isIterating, setIsIterating] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleAnalyze = async (textOverride?: string) => {
    const textToAnalyze = textOverride || input;
    if (!textToAnalyze.trim()) return;

    setIsAnalyzing(true);
    const newMessages: Message[] = [...messages, { role: "user", text: textToAnalyze }];
    setMessages(newMessages);
    setInput("");

    try {
      const analysis = await analyzePrompt(textToAnalyze, complexity, messages);
      
      if (analysis.isComplete) {
        setResult(analysis);
        setMessages(prev => [...prev, { role: "model", text: "Excelente! Tenho informações suficientes para construir seu Mega Prompt." }]);
      } else {
        setMessages(prev => [...prev, { role: "model", text: analysis.interviewQuestion || "Pode me dar mais detalhes?" }]);
      }
    } catch (error) {
      console.error("Erro ao analisar prompt:", error);
      setMessages(prev => [...prev, { role: "model", text: "Desculpe, ocorreu um erro na análise. Tente novamente." }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleIterate = async () => {
    if (!iterationInput.trim() || !result?.megaPrompt) return;

    setIsIterating(true);
    try {
      const updated = await iteratePrompt(result.megaPrompt, iterationInput);
      setResult({
        ...result,
        megaPrompt: updated.megaPrompt,
        autoCriticism: updated.autoCriticism
      });
      setIterationInput("");
    } catch (error) {
      console.error("Erro ao iterar prompt:", error);
    } finally {
      setIsIterating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast here
  };

  const reset = () => {
    setInput("");
    setMessages([]);
    setResult(null);
    setIterationInput("");
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans selection:bg-orange-100 selection:text-orange-900">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Arquiteto de Prompts</h1>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Senior Prompt Engineer AI</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 hover:text-orange-600 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            Templates
          </button>
          <button 
            onClick={reset}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            title="Reiniciar"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Input & Interview */}
        <div className="lg:col-span-5 flex flex-col gap-6 h-[calc(100vh-140px)]">
          
          {/* Config Panel */}
          <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-gray-700">
              <Settings2 className="w-4 h-4" />
              <h2 className="text-sm font-bold uppercase tracking-tight">Configuração</h2>
            </div>
            <div className="flex p-1 bg-gray-100 rounded-lg">
              {(["Básico", "Intermediário", "Avançado"] as Complexity[]).map((level) => (
                <button
                  key={level}
                  onClick={() => setComplexity(level)}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-md transition-all",
                    complexity === level 
                      ? "bg-white text-orange-600 shadow-sm" 
                      : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Chat / Interview Area */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-orange-500" />
                <h2 className="text-sm font-bold uppercase tracking-tight">Entrevista de Contexto</h2>
              </div>
              {isAnalyzing && <RefreshCw className="w-4 h-4 animate-spin text-orange-500" />}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                  <Sparkles className="w-12 h-12 mb-4 text-gray-300" />
                  <p className="text-sm">Descreva sua ideia inicial abaixo para começarmos a arquitetura.</p>
                </div>
              )}
              <AnimatePresence initial={false}>
                {messages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed",
                      msg.role === "user" 
                        ? "ml-auto bg-orange-500 text-white rounded-tr-none" 
                        : "bg-gray-100 text-gray-800 rounded-tl-none border border-gray-200"
                    )}
                  >
                    {msg.text}
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t border-gray-100">
              <div className="relative group">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAnalyze();
                    }
                  }}
                  placeholder="Sua ideia inicial ou resposta..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none min-h-[80px]"
                />
                <button
                  onClick={() => handleAnalyze()}
                  disabled={isAnalyzing || !input.trim()}
                  className="absolute right-3 bottom-3 p-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:hover:bg-orange-500 transition-all shadow-md shadow-orange-200"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              
              {/* Placeholder Guide */}
              {input.includes("[") && input.includes("]") && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-full mb-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Campos para preencher:
                  </span>
                  {Array.from(new Set(input.match(/\[[A-Z0-9_]+\]/g) || [])).map((placeholder, i) => (
                    <span 
                      key={i} 
                      className="px-2 py-1 bg-orange-50 text-orange-600 border border-orange-100 rounded text-[10px] font-mono font-bold"
                    >
                      {placeholder}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Output & Templates */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          <AnimatePresence mode="wait">
            {showTemplates ? (
              <motion.div
                key="templates"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-orange-500" />
                    <h2 className="text-lg font-bold">Biblioteca de Templates</h2>
                  </div>
                  <button onClick={() => setShowTemplates(false)} className="text-gray-400 hover:text-gray-600">
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setInput(t.prompt);
                        setShowTemplates(false);
                      }}
                      className="text-left p-4 rounded-xl border border-gray-100 hover:border-orange-200 hover:bg-orange-50/30 transition-all group"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-orange-100 group-hover:text-orange-600 transition-colors">
                          {t.icon}
                        </div>
                        <h3 className="font-bold text-sm">{t.title}</h3>
                      </div>
                      <p className="text-xs text-gray-500 leading-relaxed mb-3">{t.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {Array.from(new Set(t.prompt.match(/\[[A-Z0-9_]+\]/g) || [])).map((placeholder, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-gray-50 text-gray-400 border border-gray-100 rounded text-[9px] font-mono">
                            {placeholder}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                {/* Mega Prompt Output */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <h2 className="text-sm font-bold uppercase tracking-tight">Mega Prompt Gerado</h2>
                    </div>
                    <button 
                      onClick={() => copyToClipboard(result.megaPrompt || "")}
                      className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-600 hover:text-orange-600 bg-white border border-gray-200 rounded-lg transition-all active:scale-95"
                    >
                      <Copy className="w-3 h-3" />
                      Copiar
                    </button>
                  </div>
                  <div className="p-6 overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                    <div className="prose prose-sm prose-orange max-w-none">
                      <ReactMarkdown>{result.megaPrompt || ""}</ReactMarkdown>
                    </div>
                  </div>
                  
                  {/* Iteration Input */}
                  <div className="p-4 bg-gray-50 border-t border-gray-100">
                    <div className="flex gap-2">
                      <input
                        value={iterationInput}
                        onChange={(e) => setIterationInput(e.target.value)}
                        placeholder="Pedir ajustes (ex: 'deixe mais formal', 'adicione exemplos')..."
                        className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                      />
                      <button
                        onClick={handleIterate}
                        disabled={isIterating || !iterationInput.trim()}
                        className="px-4 py-2 bg-gray-800 text-white rounded-xl text-sm font-bold hover:bg-gray-900 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {isIterating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Iterar
                      </button>
                    </div>
                  </div>
                </div>

                {/* Auto-Criticism */}
                <div className="bg-orange-50 rounded-2xl p-6 border border-orange-100 shadow-sm">
                  <div className="flex items-center gap-2 mb-4 text-orange-800">
                    <CheckCircle2 className="w-5 h-5" />
                    <h2 className="font-bold">Módulo de Auto-Crítica</h2>
                  </div>
                  <div className="text-sm text-orange-900/80 leading-relaxed space-y-3">
                    <p>{result.autoCriticism}</p>
                    {result.appliedTechniques && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {result.appliedTechniques.map((tech, i) => (
                          <span key={i} className="px-2 py-1 bg-white/50 border border-orange-200 rounded-md text-[10px] font-bold uppercase tracking-wider text-orange-700">
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-12 bg-white rounded-3xl border-2 border-dashed border-gray-200"
              >
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                  <AlertCircle className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-400 mb-2">Aguardando Arquitetura</h3>
                <p className="text-sm text-gray-400 max-w-xs">
                  Inicie a conversa à esquerda para que eu possa analisar sua ideia e gerar o Mega Prompt perfeito.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer / Status */}
      <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-white/80 backdrop-blur-md border border-gray-200 rounded-full shadow-xl flex items-center gap-6 z-50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Engine Online</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-orange-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">4 Pilares</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-orange-500" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Mega Prompt</span>
          </div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}} />
    </div>
  );
}
