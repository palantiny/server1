import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { MessageCircle, X, Send, RotateCcw, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Button } from './ui/button';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  isError?: boolean;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const SESSION_KEY = 'palantiny_session_id';
const MESSAGES_KEY = 'palantiny_chat_messages';
const DEFAULT_MESSAGES: ChatMessage[] = [
  {
    role: 'assistant',
    content: '안녕하세요! Palantiny 고객지원입니다.\n궁금하신 한약재나 주문 관련 문의사항이 있으시면 언제든 말씀해주세요.',
  },
];

export function ChatSidebar({ isOpen, onToggle }: ChatSidebarProps) {
  const navigate = useNavigate();
  const [frontendContext, setFrontendContext] = useState<'PRICE' | 'ORDER' | null>(null);
  const [message, setMessage] = useState('');

  const [sessionId, setSessionId] = useState(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    if (saved) return saved;
    const newId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    sessionStorage.setItem(SESSION_KEY, newId);
    return newId;
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = sessionStorage.getItem(MESSAGES_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch { /* ignore */ }
    }
    return DEFAULT_MESSAGES;
  });

  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    sessionStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleResetChat = async () => {
    if (isStreaming) return;
    try {
      await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1/chat/${sessionId}/history?user_id=user`, {
        method: 'DELETE',
      });
    } catch { /* ignore */ }
    const newId = `user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    setSessionId(newId);
    sessionStorage.setItem(SESSION_KEY, newId);
    setMessages(DEFAULT_MESSAGES);
  };

  const simulateTyping = async (text: string) => {
    setIsStreaming(true);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
    for (let i = 0; i < text.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 30));
      setMessages(prev => {
        const arr = [...prev];
        arr[arr.length - 1].content = text.slice(0, i + 1);
        return arr;
      });
    }
    setIsStreaming(false);
  };

  const handleSendMessage = async (textFallback?: string) => {
    const userMessage = typeof textFallback === 'string' ? textFallback : message;
    if (!userMessage.trim() || isStreaming) return;

    setMessage('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    if (userMessage === '약재 가격 확인하고 싶어요.') {
      setFrontendContext('PRICE');
      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
      simulateTyping('어떤 약재 가격을 알고 싶으신가요?');
      return;
    }
    if (userMessage === '약재 주문하고 싶어요.') {
      setFrontendContext('ORDER');
      setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
      simulateTyping('어떤 약재를 주문하고 싶으신가요?');
      return;
    }

    let backendPayloadMessage = userMessage;
    if (frontendContext === 'PRICE') {
      backendPayloadMessage = `[약재 가격 확인] ${userMessage}`;
      setFrontendContext(null);
    } else if (frontendContext === 'ORDER') {
      backendPayloadMessage = `[약재 주문] ${userMessage}`;
      setFrontendContext(null);
    }

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsStreaming(true);

    const abortController = new AbortController();
    try {
      const streamPromise = fetch(`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1/chat/${sessionId}/stream`, {
        signal: abortController.signal,
      });
      const postResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1/chat/${sessionId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: backendPayloadMessage, user_id: 'user' }),
      });
      if (!postResponse.ok) throw new Error('메시지 전송에 실패했습니다.');

      const response = await streamPromise;
      if (!response.body) throw new Error('스트림을 연결할 수 없습니다.');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      let done = false;
      let buffer = '';
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        if (readerDone) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.trim()) continue;
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.replace('data: ', ''));
              if (data.type === 'end') { done = true; break; }
              else if (data.type === 'error') {
                setMessages(prev => {
                  const arr = [...prev];
                  arr[arr.length - 1].content = `[오류] ${data.content}`;
                  arr[arr.length - 1].isError = true;
                  return arr;
                });
              } else if (data.type === 'token' && data.content) {
                setMessages(prev => {
                  const arr = [...prev];
                  arr[arr.length - 1].content += data.content;
                  return arr;
                });
              }
            } catch { /* ignore */ }
          }
        }
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '응답을 받는 중 문제가 발생했습니다.', isError: true },
      ]);
    } finally {
      setIsStreaming(false);
      abortController.abort();
    }
  };

  return (
    <>
      {/* Toggle Tab — always visible on the right edge */}
      <button
        onClick={onToggle}
        className={`fixed top-1/2 -translate-y-1/2 z-40 flex items-center justify-center bg-[#059669] hover:bg-[#047857] text-white shadow-lg transition-all duration-300 ${
          isOpen
            ? 'right-[380px] w-8 h-16 rounded-l-[8px]'
            : 'right-0 w-10 h-20 rounded-l-[10px]'
        }`}
        aria-label={isOpen ? '채팅 닫기' : '채팅 열기'}
        title={isOpen ? '채팅 닫기' : '채팅 열기'}
      >
        {isOpen ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <MessageCircle className="w-5 h-5" />
        )}
      </button>

      {/* Sidebar Panel */}
      <div
        className={`fixed top-0 right-0 h-full bg-white border-l border-gray-200 shadow-xl z-30 flex flex-col transition-all duration-300 ${
          isOpen ? 'w-[380px]' : 'w-0 overflow-hidden'
        }`}
      >
        {isOpen && (
          <>
            {/* Header */}
            <div className="bg-[#059669] text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                <h3 className="font-semibold text-base">Palantiny 고객지원</h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleResetChat}
                  disabled={isStreaming}
                  className="hover:bg-[#047857] rounded p-1.5 transition-colors disabled:opacity-50"
                  title="대화 새로 시작"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={onToggle}
                  className="hover:bg-[#047857] rounded p-1.5 transition-colors"
                  title="닫기"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 flex flex-col gap-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-full bg-[#059669] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MessageCircle className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div
                    className={`rounded-[12px] px-3 py-2.5 shadow-sm max-w-[85%] ${
                      msg.role === 'user'
                        ? 'bg-[#059669] text-white whitespace-pre-wrap text-base leading-relaxed'
                        : msg.isError
                          ? 'bg-red-50 text-red-600 border border-red-200 whitespace-pre-wrap text-base'
                          : 'bg-white text-gray-700'
                    }`}
                  >
                    {msg.role === 'assistant' && !msg.isError ? (
                      msg.content === '' ? (
                        <div className="flex space-x-1.5 h-5 items-center px-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      ) : (
                        <div className="[&_p]:mb-2 [&_p:last-child]:mb-0 [&_p]:text-base [&_p]:leading-relaxed [&_strong]:font-bold [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-2 [&_ul]:text-base [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:mb-2 [&_ol]:text-base [&_li]:text-base [&_li]:leading-relaxed [&_a]:underline [&_table]:w-full [&_table]:my-2 [&_table]:border-collapse [&_th]:border [&_th]:border-[#059669]/20 [&_th]:bg-[#059669]/10 [&_th]:p-2 [&_th]:text-left [&_th]:text-sm [&_th]:font-semibold [&_th]:text-[#059669] [&_th]:whitespace-nowrap [&_td]:border [&_td]:border-gray-200 [&_td]:p-2 [&_td]:text-sm [&_td]:whitespace-nowrap [&_tbody>tr]:cursor-pointer [&_tbody>tr:hover]:bg-gray-50 [&_tbody>tr]:transition-colors break-words overflow-x-auto text-base leading-relaxed">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                            components={{
                              a: ({ href, children, ...props }) => {
                                if (href?.startsWith('/product/')) {
                                  return (
                                    <button
                                      data-product="true"
                                      onClick={(e) => { e.stopPropagation(); navigate(href); }}
                                      className="text-left bg-transparent border-none text-[#059669] hover:text-[#047857] hover:underline cursor-pointer transition-colors p-0 m-0 font-semibold text-base"
                                    >
                                      {children}
                                    </button>
                                  );
                                }
                                return <a href={href} className="text-[#059669] hover:underline" {...props}>{children}</a>;
                              },
                              tr: (props) => (
                                <tr
                                  {...props}
                                  onClick={(e) => {
                                    if (e.currentTarget.querySelector('th')) return;
                                    const btn = e.currentTarget.querySelector('[data-product="true"]');
                                    if (btn) (btn as HTMLButtonElement).click();
                                  }}
                                />
                              ),
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}

              <div ref={messagesEndRef} />

              {messages.length === 1 && (
                <div className="space-y-2 mt-2">
                  <p className="text-xs text-gray-400 text-center">자주 묻는 질문</p>
                  {['약재 가격 확인하고 싶어요.', '약재 주문하고 싶어요.'].map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSendMessage(q)}
                      disabled={isStreaming}
                      className="w-full text-center bg-white hover:bg-gray-50 rounded-[8px] p-2.5 shadow-sm text-sm text-gray-700 transition-colors border"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-gray-200 bg-white flex-shrink-0">
              <div className="flex gap-2 items-end">
                <textarea
                  ref={textareaRef}
                  placeholder="메시지를 입력하세요..."
                  value={message}
                  rows={1}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={isStreaming}
                  className="flex-1 min-h-[44px] max-h-[110px] text-base rounded-[8px] border border-gray-300 px-3 py-2.5 resize-none overflow-y-auto focus:outline-none focus:ring-2 focus:ring-[#059669]/30 focus:border-[#059669] disabled:opacity-50 leading-relaxed"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!message.trim() || isStreaming}
                  className={`h-10 w-10 rounded-[8px] flex items-center justify-center flex-shrink-0 transition-colors ${
                    message.trim() && !isStreaming
                      ? 'bg-[#059669] hover:bg-[#047857] text-white'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
