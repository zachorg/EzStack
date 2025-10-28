"use client";

import { useState } from "react";
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import bash from 'react-syntax-highlighter/dist/esm/languages/hljs/bash';
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python';
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { Language } from "../types";

// Register languages
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('json', json);

interface CodeExampleProps {
  code: { 
    curl: string; 
    python: string;
  };
  responseExample: string;
  endpointId: string;
  method: string;
  path: string;
}

export function CodeExample({ code, responseExample, method, path }: CodeExampleProps) {
  const [language, setLanguage] = useState<Language>("curl");

  return (
    <div className="space-y-3">
      {/* Request Example */}
      <div className="rounded-lg overflow-hidden" style={{ background: '#0F0F0F', border: '0.5px solid #2A2A2A' }}>
        <div className="flex justify-between items-center px-4 py-2" style={{ background: '#141414', borderBottom: '0.5px solid #2A2A2A' }}>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
              method === "POST"
                ? "bg-blue-600/20 text-blue-400 border border-blue-600/30"
                : "bg-gray-700 text-gray-300 border border-gray-700"
            }`}>
              {method}
            </span>
            <span className="text-xs text-gray-400 font-mono">
              {path}
            </span>
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setLanguage("curl")}
              className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${
                language === "curl"
                  ? "bg-green-600/20 text-green-400 border border-green-600/30"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              cURL
            </button>
            <button
              onClick={() => setLanguage("python")}
              className={`px-3 py-1 rounded text-xs font-medium transition-all flex items-center gap-1 ${
                language === "python"
                  ? "bg-green-600/20 text-green-400 border border-green-600/30"
                  : "text-gray-400 hover:text-gray-300"
              }`}
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14.25.18l.9.2.73.26.59.3.45.32.34.34.25.34.16.33.1.3.04.26.02.2-.01.13V8.5l-.05.63-.13.55-.21.46-.26.38-.3.31-.33.25-.35.19-.35.14-.33.1-.3.07-.26.04-.21.02H8.77l-.69.05-.59.14-.5.22-.41.27-.33.32-.27.35-.2.36-.15.37-.1.35-.07.32-.04.27-.02.21v3.06H3.17l-.21-.03-.28-.07-.32-.12-.35-.18-.36-.26-.36-.36-.35-.46-.32-.59-.28-.73-.21-.88-.14-1.05-.05-1.23.06-1.22.16-1.04.24-.87.32-.71.36-.57.4-.44.42-.33.42-.24.4-.16.36-.1.32-.05.24-.01h.16l.06.01h8.16v-.83H6.18l-.01-2.75-.02-.37.05-.34.11-.31.17-.28.25-.26.31-.23.38-.2.44-.18.51-.15.58-.12.64-.1.71-.06.77-.04.84-.02 1.27.05zm-6.3 1.98l-.23.33-.08.41.08.41.23.34.33.22.41.09.41-.09.33-.22.23-.34.08-.41-.08-.41-.23-.33-.33-.22-.41-.09-.41.09zm13.09 3.95l.28.06.32.12.35.18.36.27.36.35.35.47.32.59.28.73.21.88.14 1.04.05 1.23-.06 1.23-.16 1.04-.24.86-.32.71-.36.57-.4.45-.42.33-.42.24-.4.16-.36.09-.32.05-.24.02-.16-.01h-8.22v.82h5.84l.01 2.76.02.36-.05.34-.11.31-.17.29-.25.25-.31.24-.38.2-.44.17-.51.15-.58.13-.64.09-.71.07-.77.04-.84.01-1.27-.04-1.07-.14-.9-.2-.73-.25-.59-.3-.45-.33-.34-.34-.25-.34-.16-.33-.1-.3-.04-.25-.02-.2.01-.13v-5.34l.05-.64.13-.54.21-.46.26-.38.3-.32.33-.24.35-.2.35-.14.33-.1.3-.06.26-.04.21-.02.13-.01h5.84l.69-.05.59-.14.5-.21.41-.28.33-.32.27-.35.2-.36.15-.36.1-.35.07-.32.04-.28.02-.21V6.07h2.09l.14.01zm-6.47 14.25l-.23.33-.08.41.08.41.23.33.33.23.41.08.41-.08.33-.23.23-.33.08-.41-.08-.41-.23-.33-.33-.23-.41-.08-.41.08z"/>
              </svg>
              Python
            </button>
          </div>
        </div>
        <SyntaxHighlighter
          language={language === "curl" ? "bash" : "python"}
          style={atomOneDark}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: 'transparent',
            fontSize: '0.75rem',
            lineHeight: '1.5'
          }}
          codeTagProps={{
            style: {
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
            }
          }}
        >
          {code[language]}
        </SyntaxHighlighter>
      </div>

      {/* Response Example */}
      <div className="rounded-lg overflow-hidden" style={{ background: '#0F0F0F', border: '0.5px solid #2A2A2A' }}>
        <div className="flex justify-between items-center px-4 py-2" style={{ background: '#141414', borderBottom: '0.5px solid #2A2A2A' }}>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-green-600/20 text-green-400 border border-green-600/30">
              200
            </span>
            <span className="text-xs text-gray-400">Successful</span>
          </div>
          <button className="text-gray-400 hover:text-gray-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
        <SyntaxHighlighter
          language="json"
          style={atomOneDark}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: 'transparent',
            fontSize: '0.75rem',
            lineHeight: '1.5'
          }}
          codeTagProps={{
            style: {
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
            }
          }}
        >
          {responseExample}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

