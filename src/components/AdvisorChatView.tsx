import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  Sparkles,
  User,
  HelpCircle,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import { ChatMessage, PronacProject, BudgetRubric } from "../types";
import { sendChatAdvisorMessage } from "../services/geminiService";

interface AdvisorChatViewProps {
  project: PronacProject;
  rubrics: BudgetRubric[];
}

const QUICK_QUESTIONS = [
  "Qual o limite de remanejamento de rubricas sem pedir readequação no SALIC?",
  "Como justificar tarifas bancárias debitadas pelo BB para evitar glosa?",
  "Qual o teto máximo permitido para custos administrativos na IN 01/2023?",
  "Como calcular o IRRF e ISS sobre o RPA de um artista autônomo?",
  "O que fazer com os rendimentos de aplicação financeira no fim do projeto?",
];

export const AdvisorChatView: React.FC<AdvisorChatViewProps> = ({ project, rubrics }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      role: "assistant",
      timestamp: new Date().toISOString(),
      content: `Olá! Sou o **Consultor IA Especialista em Lei Rouanet e SALIC**. Estou pronto para orientar seu projeto **PRONAC ${project.pronac} (${project.nome})**.\n\nVocê pode me fazer perguntas sobre a **Instrução Normativa MinC nº 01/2023**, regras de remanejamento dos 20%, limites de custos administrativos (15%), comprovantes fiscais aceitos, retenções de tributos (IRRF/ISS/INSS) ou como redigir justificativas para o MinC.`,
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (userText?: string) => {
    const textToSend = userText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      timestamp: new Date().toISOString(),
      content: textToSend,
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    if (!userText) setInput("");
    setIsLoading(true);

    try {
      const replyText = await sendChatAdvisorMessage({
        messages: nextHistory.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        projectContext: project,
      });

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        timestamp: new Date().toISOString(),
        content: replyText,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        timestamp: new Date().toISOString(),
        content: `Desculpe, ocorreu um erro ao consultar o especialista: ${err.message}. Verifique a conexão e tente novamente.`,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-[calc(100vh-8.5rem)] shadow-xl overflow-hidden">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              Consultor Jurídico e Técnico Rouanet (Gemini 2.5)
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-mono font-medium">
                IN MinC nº 01/2023
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Orientação técnica personalizada para o PRONAC {project.pronac} ({project.artigoEnquadramento})
            </p>
          </div>
        </div>

        <button
          onClick={() =>
            setMessages([
              {
                id: "welcome-reset",
                role: "assistant",
                timestamp: new Date().toISOString(),
                content: "Conversa reiniciada. Em que posso ajudar você agora sobre a prestação de contas do MinC?",
              },
            ])
          }
          className="text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1 bg-slate-800 rounded-lg flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Limpar Histórico
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isAi = msg.role === "assistant";
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isAi ? "justify-start" : "justify-end"} max-w-3xl ${
                isAi ? "mr-auto" : "ml-auto"
              }`}
            >
              {isAi && (
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`p-4 rounded-2xl text-xs leading-relaxed space-y-2 relative group ${
                  isAi
                    ? "bg-slate-950/80 border border-slate-800 text-slate-200"
                    : "bg-emerald-600 text-slate-950 font-medium"
                }`}
              >
                <div className="whitespace-pre-wrap font-sans">{msg.content}</div>

                {isAi && (
                  <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-500">
                    <span>Base: Legislação Federal Cultural</span>
                    <button
                      onClick={() => copyText(msg.content, msg.id)}
                      className="text-slate-400 hover:text-emerald-400 flex items-center gap-1 font-semibold"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copiar Resposta
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {!isAi && (
                <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 shrink-0 mt-1 font-bold">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 items-center text-xs text-slate-400">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 text-slate-300">
              Analisando termos da Instrução Normativa MinC e jurisprudência...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Questions */}
      <div className="px-4 py-2 bg-slate-950/40 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-[11px] text-slate-400 whitespace-nowrap flex items-center gap-1 font-medium">
          <HelpCircle className="w-3.5 h-3.5 text-emerald-400" /> Sugestões Rápidas:
        </span>
        {QUICK_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            className="text-[11px] bg-slate-800/90 hover:bg-slate-750 text-slate-300 hover:text-white px-2.5 py-1 rounded-full border border-slate-700 whitespace-nowrap transition"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-3 bg-slate-950 border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            placeholder="Digite sua dúvida sobre o SALIC, prestação de contas, regras do MinC ou glosas..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition text-xs shadow-md shadow-emerald-500/20"
          >
            <Send className="w-4 h-4" />
            <span>Enviar</span>
          </button>
        </form>
      </div>
    </div>
  );
};
