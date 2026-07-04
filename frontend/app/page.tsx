"use client";

import React, { useState } from 'react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
// @ts-ignore
import '@xyflow/react/dist/base.css';

// This defines what our AI analysis data structure looks like in JavaScript
interface AIAnalysis {
  nodes: string[];
  edges: string[];
  failed_node: string;
  error_summary: string;
  fix_suggestion: string;
}

export default function Dashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);

  // Layout positions for graph nodes on the screen canvas
  const [flowNodes, setFlowNodes] = useState<any[]>([]);
  const [flowEdges, setFlowEdges] = useState<any[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target.files[0]);
  };

  const uploadAndAnalyzeLog = async () => {
    if (!file) return alert("Please select a log file first!");
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Direct network call connecting our Next.js frontend to our FastAPI backend
      const response = await fetch("http://127.0.0.1:8000/api/upload-log", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      
      if (response.ok && data.status === "analysis_completed") {
        const result: AIAnalysis = data.analysis;
        setAnalysis(result);

        // Map the text nodes from Gemini into visual coordinate positions on our screen
        const visualNodes = result.nodes.map((nodeName, index) => {
          const isFailed = nodeName.toLowerCase() === result.failed_node.toLowerCase();
          return {
            id: nodeName,
            data: { label: nodeName },
            position: { x: 150 + index * 220, y: 150 },
            style: {
              background: isFailed ? '#fee2e2' : '#f0fdf4',
              color: isFailed ? '#991b1b' : '#166534',
              border: isFailed ? '2px solid #ef4444' : '2px solid #22c55e',
              borderRadius: '8px',
              padding: '10px',
              fontWeight: 'bold',
            }
          };
        });

        // Convert text edge markers (e.g. "Gateway -> AuthService") into canvas connector lines
        const visualEdges = result.edges.map((edgeStr, index) => {
          const [source, target] = edgeStr.split("->").map(s => s.trim());
          return {
            id: `e-${index}`,
            source: source,
            target: target,
            animated: true,
            style: { stroke: source.toLowerCase() === result.failed_node.toLowerCase() || target.toLowerCase() === result.failed_node.toLowerCase() ? '#ef4444' : '#22c55e' }
          };
        });

        setFlowNodes(visualNodes);
        setFlowEdges(visualEdges);
      } else {
        alert("Error analyzing log file: " + data.detail);
      }
    } catch (err) {
      alert("Failed to connect to backend server. Make sure FastAPI is running!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-900 text-slate-100 font-sans">
      
      {/* LEFT PANEL: Log Control & Remediation Output */}
      <div className="w-1/3 border-r border-slate-800 p-6 flex flex-col justify-between overflow-y-auto bg-slate-950">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-emerald-400 mb-1">LogTrace Engine</h1>
          <p className="text-xs text-slate-400 mb-6">Upload raw logs to visualize architecture dependencies and isolate root issues.</p>
          
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 mb-6">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Select Server Log (.log / .txt)</label>
            <input type="file" accept=".log,.txt" onChange={handleFileChange} className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20 cursor-pointer" />
            <button onClick={uploadAndAnalyzeLog} disabled={loading} className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-800 text-slate-950 font-bold py-2 px-4 rounded-lg transition duration-200 text-sm">
              {loading ? "AI Processing Log Structure..." : "Run Log Trace Engine"}
            </button>
          </div>

          {analysis && (
            <div className="space-y-4">
              <div className="p-4 bg-red-950/40 border border-red-900/50 rounded-xl">
                <h3 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-1">Root Failure Node</h3>
                <p className="text-lg font-bold text-red-200">{analysis.failed_node}</p>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">Incident Summary</h3>
                <p className="text-sm text-slate-300 leading-relaxed">{analysis.error_summary}</p>
              </div>
            </div>
          )}
        </div>

        {analysis && (
          <div className="mt-6 p-4 bg-slate-900 border border-slate-800 rounded-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">Suggested Fix Remediation</h3>
            <pre className="text-xs font-mono text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800 overflow-x-auto whitespace-pre-wrap">{analysis.fix_suggestion}</pre>
          </div>
        )}
      </div>

      {/* RIGHT PANEL: Interactive React Flow Diagram Engine */}
      <div className="w-2/3 h-full relative bg-slate-900">
        {flowNodes.length > 0 ? (
          <ReactFlow nodes={flowNodes} edges={flowEdges} fitView>
            <Background color="#334155" gap={16} size={1} />
            <Controls className="bg-slate-800 border-slate-700 text-slate-200 fill-slate-200" />
          </ReactFlow>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
            <p className="text-base font-medium">System architecture canvas empty</p>
            <p className="text-xs mt-1">Upload a crashed trace stream to map system architecture dependencies</p>
          </div>
        )}
      </div>

    </div>
  );
}