"use client";

import { useState } from "react";
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import bash from 'react-syntax-highlighter/dist/esm/languages/hljs/bash';
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python';
import javascript from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import json from 'react-syntax-highlighter/dist/esm/languages/hljs/json';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';
import { Language } from "../types";

// Register languages
SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('json', json);

interface CodeExampleProps {
  code: { 
    curl: string; 
    python: string;
    node: string;
  };
  responseExample: string;
  endpointId: string;
  method: string;
  path: string;
}

export function CodeExample({ code, responseExample, method, path }: CodeExampleProps) {
  const [language, setLanguage] = useState<Language>("node");
  const [copiedRequest, setCopiedRequest] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);

  const handleCopyRequest = async () => {
    await navigator.clipboard.writeText(code[language]);
    setCopiedRequest(true);
    setTimeout(() => setCopiedRequest(false), 2000);
  };

  const handleCopyResponse = async () => {
    await navigator.clipboard.writeText(responseExample);
    setCopiedResponse(true);
    setTimeout(() => setCopiedResponse(false), 2000);
  };

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
          <div className="flex items-center gap-2">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="px-3 py-1 rounded text-xs font-medium text-gray-300 border cursor-pointer hover:text-gray-100 hover:border-gray-500 transition-colors"
              style={{ 
                outline: 'none', 
                background: '#1A1A1A', 
                borderColor: '#2A2A2A',
                accentColor: 'white'
              }}
            >
              <option value="node" style={{ background: '#0F0F0F', color: 'white' }}>Node.js</option>
              <option value="python" style={{ background: '#0F0F0F', color: 'white' }}>Python</option>
              <option value="curl" style={{ background: '#0F0F0F', color: 'white' }}>cURL</option>
            </select>
            
            {/* Copy Button */}
            <button 
              onClick={handleCopyRequest}
              className="text-gray-400 hover:text-gray-300 transition-colors"
              title="Copy code"
            >
              {copiedRequest ? (
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
        </div>
        <SyntaxHighlighter
          language={language === "curl" ? "bash" : language === "node" ? "javascript" : "python"}
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
          <button 
            onClick={handleCopyResponse}
            className="text-gray-400 hover:text-gray-300 transition-colors"
            title="Copy response"
          >
            {copiedResponse ? (
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
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

