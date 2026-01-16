"use client";
import React, { useState, useRef, useEffect } from "react";
import Head from "next/head";
import { Loader2, FileText, MessageSquare, Brain } from "lucide-react";

const formatText = (text) => {
  if (!text) return null;

  const lines = text.split("\n");
  const elements = [];

  lines.forEach((line, index) => {
    if (line.startsWith("**") && line.endsWith("**")) {
      elements.push(
        <h3 key={index} className="font-bold text-gray-800 mb-2 mt-3">
          {line.slice(2, -2)}
        </h3>
      );
    } else if (line.startsWith("• ") || line.startsWith("- ")) {
      elements.push(
        <div key={index} className="flex items-start mb-1">
          <span className="text-gray-600 mr-2 mt-1">•</span>
          <span className="text-gray-700">{line.slice(2)}</span>
        </div>
      );
    } else if (/^\d+\./.test(line.trim())) {
      elements.push(
        <div key={index} className="flex items-start mb-1">
          <span className="text-gray-600 mr-2">{line.match(/^\d+\./)[0]}</span>
          <span className="text-gray-700">{line.replace(/^\d+\.\s*/, "")}</span>
        </div>
      );
    } else if (
      line.includes("✅") ||
      line.includes("❌") ||
      line.includes("🔄")
    ) {
      elements.push(
        <div key={index} className="mb-2 font-medium text-gray-700">
          {line}
        </div>
      );
    } else if (line.trim()) {
      const formattedLine = line.split(/(\*\*.*?\*\*)/g).map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-gray-900">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      elements.push(
        <p key={index} className="text-gray-700 mb-2 leading-relaxed">
          {formattedLine}
        </p>
      );
    } else {
      elements.push(<div key={index} className="mb-2"></div>);
    }
  });

  return <div className="text-sm">{elements}</div>;
};

const ChatInterface = () => {
  const [pdfLink, setPdfLink] = useState("");
  const [billId, setBillId] = useState("");
  const [billTitle, setBillTitle] = useState("");
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [summary, setSummary] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processed, setProcessed] = useState(false);
  const messagesEndRef = useRef(null);

  const formatText = (text) => {
    if (!text) return null;

    const lines = text.split("\n");
    const formattedElements = [];

    lines.forEach((line, lineIndex) => {
      let processedLine = line.trim();

      if (!processedLine) {
        formattedElements.push(<br key={`br-${lineIndex}`} />);
        return;
      }

      let className = "text-sm text-gray-700 mb-2";
      let element = "p";

      if (processedLine.startsWith("###")) {
        processedLine = processedLine.replace(/^###\s*/, "");
        className = "text-sm font-medium text-gray-800 mb-2";
        element = "h3";
      } else if (processedLine.startsWith("##")) {
        processedLine = processedLine.replace(/^##\s*/, "");
        className = "text-base font-semibold text-gray-800 mb-2";
        element = "h2";
      } else if (processedLine.startsWith("#")) {
        processedLine = processedLine.replace(/^#\s*/, "");
        className = "text-lg font-bold text-gray-800 mb-3";
        element = "h1";
      } else if (
        processedLine.startsWith("**") &&
        processedLine.endsWith("**")
      ) {
        processedLine = processedLine.replace(/^\*\*|\*\*$/g, "");
        className = "text-sm font-semibold text-gray-900 mb-2";
      } else if (
        processedLine.startsWith("- ") ||
        processedLine.startsWith("• ")
      ) {
        processedLine = processedLine.replace(/^[-•]\s*/, "");
        className = "text-sm text-gray-700 mb-1 ml-4 relative";
        element = "li";
      } else if (/^\d+\.\s/.test(processedLine)) {
        className = "text-sm text-gray-700 mb-1 ml-4";
        element = "li";
      }

      const processInlineFormatting = (text) => {
        const parts = [];
        let remaining = text;
        let key = 0;

        while (remaining.length > 0) {
          const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
          if (boldMatch) {
            const beforeBold = remaining.substring(0, boldMatch.index);
            if (beforeBold) parts.push(<span key={key++}>{beforeBold}</span>);
            parts.push(
              <strong key={key++} className="font-semibold text-gray-900">
                {boldMatch[1]}
              </strong>
            );
            remaining = remaining.substring(
              boldMatch.index + boldMatch[0].length
            );
          } else {
            const italicMatch = remaining.match(/\*(.*?)\*/);
            if (italicMatch) {
              const beforeItalic = remaining.substring(0, italicMatch.index);
              if (beforeItalic)
                parts.push(<span key={key++}>{beforeItalic}</span>);
              parts.push(
                <em key={key++} className="italic text-gray-700">
                  {italicMatch[1]}
                </em>
              );
              remaining = remaining.substring(
                italicMatch.index + italicMatch[0].length
              );
            } else {
              parts.push(<span key={key++}>{remaining}</span>);
              break;
            }
          }
        }

        return parts.length > 0 ? parts : text;
      };

      const formattedContent = processInlineFormatting(processedLine);

      if (element === "li") {
        formattedElements.push(
          <li key={lineIndex} className={className}>
            <span className="absolute left-0 top-0">•</span>
            {formattedContent}
          </li>
        );
      } else {
        const ElementType = element;
        formattedElements.push(
          <ElementType key={lineIndex} className={className}>
            {formattedContent}
          </ElementType>
        );
      }
    });

    return <div className="space-y-1">{formattedElements}</div>;
  };
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let pdf = params.get("pdf");
    const title = params.get("title");
    const id = params.get("id");

    if (pdf) {
      pdf = pdf.replace("prsindia.org..", "prsindia.org");
      setPdfLink(pdf);
      setBillId(id || Date.now().toString());
      setBillTitle(title || "Parliamentary Bill Analysis");

      setIsProcessing(true);
      processBillAutomatically(pdf, title, id);

      setMessages([
        {
          id: 1,
          text: "Hello! I'm processing this parliamentary bill for analysis. Please wait while I extract and analyze the content...",
          sender: "assistant",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);

      setLoadingSummary(true);
    }
  }, []);

  const processBillAutomatically = async (pdfUrl, title, id) => {
    try {
      const response = await fetch("/api/process-bill", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          billId: id || Date.now().toString(),
          pdfUrl: pdfUrl,
          title: title || "Parliamentary Bill",
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setProcessed(true);
        const billSummary =
          result.summary ||
          `
**${title || "Parliamentary Bill"}**

✅ **Processing Complete** - This bill has been successfully analyzed and is ready for detailed discussion.

**Available for Analysis:**
• Full text content extracted and processed
• Key provisions and sections identified  
• Legislative context and implications analyzed
• Ready to answer specific questions about the bill

**What you can ask:**
• "What are the main provisions of this bill?"
• "What is the purpose and scope of this legislation?"
• "What are the potential impacts of this bill?"
• "Which sections deal with [specific topic]?"

I'm ready to provide detailed analysis based on the actual bill content. What would you like to know?`;

        setSummary(billSummary);

        const isAlreadyProcessed = result.alreadyProcessed;
        const successMessage = {
          id: Date.now(),
          text: isAlreadyProcessed
            ? "**Bill Already Available!** This bill was previously processed and analyzed. I have access to all the content and can answer detailed questions about its provisions, implications, and specific sections. What would you like to know about this legislation?"
            : "**Processing Complete!** I've successfully analyzed this parliamentary bill and extracted all the key information. I can now answer detailed questions about its provisions, implications, and specific sections. What would you like to know about this legislation?",
          sender: "assistant",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        setMessages((prev) => [...prev, successMessage]);
      } else {
        throw new Error("Processing failed");
      }
    } catch (error) {
      console.error("Error processing bill:", error);
      setProcessed(false);
      setSummary(
        "There was an error processing this bill. Please try again later."
      );

      const errorMessage = {
        id: Date.now(),
        text: "There was an error processing this bill. Please try refreshing the page or contact support.",
        sender: "assistant",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
      setLoadingSummary(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (inputMessage.trim() === "" || isTyping) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: currentInput,
          billId: billId,
          billTitle: billTitle,
        }),
      });

      if (response.ok) {
        const result = await response.json();

        const assistantMessage = {
          id: Date.now() + 1,
          text:
            result.response ||
            "I apologize, but I couldn't generate a proper response. Please try asking your question differently.",
          sender: "assistant",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error("Failed to get response from AI");
      }
    } catch (error) {
      console.error("Error getting AI response:", error);

      const errorMessage = {
        id: Date.now() + 1,
        text: "I'm having trouble accessing the bill content right now. Please make sure the bill has been processed and try again.",
        sender: "assistant",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const openPdf = () => {
    if (pdfLink) window.open(pdfLink, "_blank");
  };

  const TypingIndicator = () => (
    <div className="flex items-center space-x-2 p-4 max-w-xs">
      <div className="bg-white border rounded-2xl px-4 py-3 flex items-center space-x-1 shadow-sm">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
          <div
            className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }}
          ></div>
          <div
            className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          ></div>
        </div>
        <span className="text-xs text-gray-500 ml-2">Analyzing...</span>
      </div>
    </div>
  );

  return (
    <>
      <Head>
        <title>BillRAG - {billTitle}</title>
        <meta
          name="description"
          content="AI-powered parliamentary bill analysis"
        />
      </Head>

      <div className="flex h-screen bg-white overflow-hidden">
        <div className="flex-1 flex flex-col bg-white min-w-0">
          <div className="bg-white px-4 sm:px-6 py-4 shadow-sm border-b border-[#B20F38] flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 min-w-0">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg bg-[#B20F38] flex-shrink-0">
                  <Brain className="text-white" size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl font-bold text-gray-900 truncate">
                    BillRAG
                  </h1>
                  <p className="text-sm text-gray-600 truncate">
                    {billTitle || "Parliamentary Bill Analysis"}
                  </p>
                </div>
              </div>

              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-500">
                <div className="w-2 h-2 rounded-full animate-pulse bg-[#B20F38]"></div>
                <span>AI Ready</span>
              </div>
            </div>
          </div>

          <div className="flex flex-1 min-h-0">
            {/* Messages Area */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.sender === "user"
                        ? "justify-end"
                        : "justify-start"
                    } animate-fade-in-up`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-md lg:max-w-lg xl:max-w-xl ${
                        message.sender === "user" ? "order-1" : "order-2"
                      }`}
                    >
                      {message.sender === "assistant" && (
                        <div className="flex items-center space-x-2 mb-1">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center bg-[#B20F38]">
                            <Brain className="text-white" size={12} />
                          </div>
                          <span className="text-xs text-gray-500 font-medium">
                            AI Assistant
                          </span>
                        </div>
                      )}

                      <div
                        className={`px-4 py-3 rounded-2xl shadow-sm break-words ${
                          message.sender === "user"
                            ? "text-white rounded-br-md bg-[#B20F38]"
                            : "bg-white text-gray-800 rounded-bl-md border border-gray-200"
                        }`}
                      >
                        {message.sender === "assistant" ? (
                          formatText(message.text)
                        ) : (
                          <div className="text-sm leading-relaxed whitespace-pre-wrap overflow-wrap-anywhere">
                            {message.text}
                          </div>
                        )}
                      </div>

                      <div
                        className={`flex items-center mt-1 space-x-1 ${
                          message.sender === "user"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <span className="text-xs text-gray-400">
                          {message.timestamp}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {isTyping && <TypingIndicator />}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="bg-white px-4 sm:px-6 py-4 border-t border-gray-200 flex-shrink-0">
                <div className="flex items-end space-x-4">
                  <div className="flex-1 relative">
                    <textarea
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask me anything about this bill..."
                      className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-2xl resize-none transition-all duration-200 bg-white hover:border-gray-400 max-h-32 focus:border-[#B20F38] focus:ring-2 focus:ring-[#B20F38]/20 focus:outline-none"
                      rows={1}
                      disabled={isTyping}
                    />
                    <div className="absolute right-3 top-3 text-gray-400">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                  </div>

                  <button
                    onClick={handleSendMessage}
                    disabled={inputMessage.trim() === "" || isTyping}
                    className={`p-3 rounded-2xl transition-all duration-200 transform hover:scale-105 ${
                      inputMessage.trim() && !isTyping
                        ? "text-white shadow-lg hover:shadow-xl bg-[#B20F38] hover:bg-[#9a0d2f]"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {isTyping ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                        />
                      </svg>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                  <span>Press Enter to send, Shift + Enter for new line</span>
                  <span>{inputMessage.length}/1000</span>
                </div>
              </div>
            </div>

            <div className="w-80 bg-gradient-to-b from-slate-50 to-white border-l border-slate-200 flex-col flex-shrink-0 hidden lg:flex">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-[#B20F38] to-[#8A0C2D] rounded-xl flex items-center justify-center">
                    <FileText size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-slate-800 font-bold text-lg">
                      Bill Summary
                    </h3>
                    <p className="text-slate-600 text-sm">
                      AI-generated overview
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {isProcessing ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 mb-4">
                      <Loader2
                        size={16}
                        className="animate-spin text-[#B20F38]"
                      />
                      <span className="text-sm text-[#B20F38] font-medium">
                        Processing bill...
                      </span>
                    </div>
                    <div className="h-4 bg-slate-200 rounded skeleton-shimmer"></div>
                    <div className="h-4 bg-slate-200 rounded w-3/4 skeleton-shimmer"></div>
                    <div className="h-4 bg-slate-200 rounded w-1/2 skeleton-shimmer"></div>
                    <div className="h-4 bg-slate-200 rounded skeleton-shimmer"></div>
                    <div className="h-4 bg-slate-200 rounded w-2/3 skeleton-shimmer"></div>
                    <div className="h-4 bg-slate-200 rounded w-4/5 skeleton-shimmer"></div>
                  </div>
                ) : loadingSummary ? (
                  <div className="space-y-4">
                    <div className="h-4 bg-slate-200 rounded skeleton-shimmer"></div>
                    <div className="h-4 bg-slate-200 rounded w-3/4 skeleton-shimmer"></div>
                    <div className="h-4 bg-slate-200 rounded w-1/2 skeleton-shimmer"></div>
                    <div className="h-4 bg-slate-200 rounded skeleton-shimmer"></div>
                  </div>
                ) : (
                  <div className="text-slate-700 text-sm leading-relaxed">
                    {formatText(summary)}
                  </div>
                )}
              </div>

              {pdfLink && (
                <div className="p-6 border-t border-slate-200">
                  <button
                    onClick={openPdf}
                    className="w-full btn-primary flex items-center justify-center space-x-2"
                  >
                    <FileText size={16} />
                    <span>View Original PDF</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ChatInterface;
