import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { contextForPath, findAssistantAnswer } from "./assistantKnowledge";
import "./AssistantMascot.css";

const initialMessage = {
  id: "welcome",
  from: "assistant",
  text: "¡Hola! Soy Impi. Puedo guiarte paso a paso dentro de SISTEMA-IMPO. ¿Qué necesitás hacer?",
};

export default function AssistantMascot() {
  const { permissions, profile } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([initialMessage]);
  const inputRef = useRef(null);
  const conversationRef = useRef(null);
  const context = useMemo(() => contextForPath(pathname, permissions), [pathname, permissions]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    conversationRef.current?.scrollTo({ top: conversationRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const sendQuestion = (value) => {
    const text = value.trim();
    if (!text) return;
    const result = findAssistantAnswer(text, permissions, pathname);
    setMessages((current) => [
      ...current,
      { id: `user-${Date.now()}`, from: "user", text },
      {
        id: `assistant-${Date.now()}`,
        from: "assistant",
        text: result?.answer || "Todavía no tengo una respuesta segura para eso. Probá con una de las preguntas sugeridas o consultale al administrador del sistema.",
      },
    ]);
    setQuestion("");
  };

  const submit = (event) => {
    event.preventDefault();
    sendQuestion(question);
  };

  return (
    <div className={`impi-assistant ${open ? "is-open" : ""}`}>
      {open && (
        <section className="impi-panel" role="dialog" aria-label="Asistente de ayuda Impi" aria-modal="false">
          <header className="impi-header">
            <div className="impi-mini" aria-hidden="true"><span /><i>i</i></div>
            <div>
              <strong>Impi</strong>
              <small><span /> Asistente del sistema</small>
            </div>
            <button type="button" className="impi-close" onClick={() => setOpen(false)} aria-label="Cerrar asistente">×</button>
          </header>

          <div className="impi-context">
            Estás en <strong>{context.label}</strong>
            <span>Rol: {profile?.role || "lectura"}</span>
          </div>

          <div className="impi-conversation" ref={conversationRef} aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={`impi-message ${message.from}`}>
                {message.text}
              </div>
            ))}
          </div>

          <div className="impi-suggestions" aria-label="Preguntas sugeridas">
            <button type="button" onClick={() => sendQuestion("¿Qué puedo hacer aquí?")}>¿Qué puedo hacer aquí?</button>
            {context.suggested.slice(0, 3).map((topic) => (
              <button type="button" key={topic.id} onClick={() => sendQuestion(topic.title)}>{topic.title}</button>
            ))}
          </div>

          <form className="impi-form" onSubmit={submit}>
            <input
              ref={inputRef}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ej. ¿Cómo programo un pago?"
              aria-label="Escribí tu pregunta"
            />
            <button type="submit" disabled={!question.trim()} aria-label="Enviar pregunta">➜</button>
          </form>
          <p className="impi-disclaimer">Impi brinda orientación y no realiza cambios por vos.</p>
        </section>
      )}

      {!open && <span className="impi-callout">¿Necesitás ayuda?</span>}
      <button
        type="button"
        className="impi-launcher"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Cerrar asistente Impi" : "Abrir asistente Impi"}
        aria-expanded={open}
      >
        <span className="impi-mascot" aria-hidden="true">
          <span className="impi-antenna" />
          <span className="impi-eye left" />
          <span className="impi-eye right" />
          <span className="impi-smile" />
          <b>i</b>
        </span>
      </button>
    </div>
  );
}

