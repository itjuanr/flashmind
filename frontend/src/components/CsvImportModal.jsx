import { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, Check, Loader2, Download } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

// Remove BOM (UTF-8 / UTF-16) que o Excel adiciona automaticamente
function stripBom(str) {
  return str.charCodeAt(0) === 0xFEFF ? str.slice(1) : str;
}

// Parser CSV robusto: lida com campos entre aspas e aspas escapadas ("")
function parseCsvLine(line, sep) {
  const cols = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuote = !inQuote; }
    } else if (ch === sep && !inQuote) {
      cols.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  cols.push(cur.trim());
  return cols;
}

function parseCsv(text) {
  text = stripBom(text);
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
  if (lines.length < 2) return { rows: [], error: 'O arquivo precisa ter ao menos um card além do cabeçalho.' };

  const sep = lines[0].includes(';') ? ';' : ',';
  const header = parseCsvLine(lines[0], sep).map((h) =>
    h.toLowerCase().replace(/[\'\"\'\uFEFF]/g, '').trim()
  );

  const frontIdx = header.findIndex((h) => ['frente', 'front', 'pergunta', 'question'].includes(h));
  const backIdx  = header.findIndex((h) => ['verso', 'back', 'resposta', 'answer'].includes(h));

  if (frontIdx === -1 || backIdx === -1) {
    return {
      rows: [],
      error: `Colunas não encontradas. Cabeçalho detectado: "${header.join(', ')}". Use "frente" e "verso" (ou front/back).`,
    };
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = parseCsvLine(lines[i], sep);
    const front = (cols[frontIdx] || '').trim();
    const back  = (cols[backIdx]  || '').trim();
    if (front && back) rows.push({ front, back });
  }

  if (rows.length === 0) return { rows: [], error: 'Nenhum card válido encontrado no arquivo.' };
  return { rows, error: null };
}

// Tenta UTF-8 primeiro. Se encontrar caractere de substituição (U+FFFD),
// tenta Windows-1252 (encoding padrão do Excel no Brasil/Europa)
function readFileWithFallback(file, callback) {
  const r1 = new FileReader();
  r1.onload = (e) => {
    const text = e.target.result;
    if (text.includes('\uFFFD')) {
      const r2 = new FileReader();
      r2.onload = (e2) => callback(e2.target.result);
      r2.readAsText(file, 'windows-1252');
    } else {
      callback(text);
    }
  };
  r1.readAsText(file, 'UTF-8');
}

export default function CsvImportModal({ deckId, deckName, onClose, onImported }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const fileRef = useRef();

  const [step, setStep]         = useState('upload');
  const [rows, setRows]         = useState([]);
  const [error, setError]       = useState('');
  const [fileName, setFileName] = useState('');
  const [progress, setProgress] = useState(0);

  const surface = isDark ? 'bg-[#0F0F18] border-white/10' : 'bg-white border-black/8';

  const processFile = (file) => {
    setFileName(file.name);
    setError('');
    readFileWithFallback(file, (text) => {
      const { rows: parsed, error: parseError } = parseCsv(text);
      if (parseError) { setError(parseError); return; }
      setRows(parsed);
      setStep('preview');
    });
  };

  const handleFile = (e) => { const f = e.target.files[0]; if (f) processFile(f); };
  const handleDrop = (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) processFile(f); };

  const handleImport = async () => {
    setStep('importing');
    let done = 0;
    for (const row of rows) {
      try { await api.post('/flashcards', { deckId, front: row.front, back: row.back }); } catch {}
      done++;
      setProgress(Math.round((done / rows.length) * 100));
    }
    setStep('done');
    onImported(done);
  };

  const downloadTemplate = () => {
    const csv = '\uFEFF' + 'frente,verso\r\nPergunta 1,Resposta 1\r\nPergunta 2,Resposta 2';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`w-full max-w-lg rounded-3xl border shadow-2xl ${surface} flex flex-col`} style={{ maxHeight: '90vh' }}>

        <div className={`flex items-center justify-between px-7 py-5 border-b ${isDark ? 'border-white/8' : 'border-black/6'}`}>
          <div>
            <h2 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-800'}`}>Importar cards via CSV</h2>
            <p className="text-slate-500 text-xs mt-0.5">{deckName}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-7">
          {step === 'upload' && (
            <div className="space-y-5">
              <div onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl px-6 py-10 flex flex-col items-center gap-3 cursor-pointer transition-all group ${
                  isDark ? 'border-white/15 hover:border-blue-500/40 bg-white/2' : 'border-black/12 hover:border-blue-500/40 bg-black/2'
                }`}>
                <div className={`p-3 rounded-xl transition-colors ${isDark ? 'bg-white/5 group-hover:bg-blue-500/10' : 'bg-black/5 group-hover:bg-blue-500/8'}`}>
                  <Upload size={24} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
                </div>
                <div className="text-center">
                  <p className={`font-medium text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Clique ou arraste seu arquivo CSV</p>
                  <p className="text-slate-500 text-xs mt-1">Compatível com Excel, Google Sheets e LibreOffice</p>
                </div>
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
              </div>

              {error && (
                <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" /> {error}
                </div>
              )}

              <div className={`rounded-2xl border p-4 ${isDark ? 'border-white/6 bg-white/2' : 'border-black/6 bg-black/2'}`}>
                <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Formato esperado:</p>
                <code className="text-xs text-emerald-400 block font-mono leading-relaxed">
                  frente,verso<br/>
                  O que é mitose?,Divisão celular com células idênticas<br/>
                  Capital do Brasil?,Brasília
                </code>
                <p className={`text-[11px] mt-2 ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                  Aceita vírgula <code className="opacity-70">,</code> ou ponto-e-vírgula <code className="opacity-70">;</code> como separador.
                </p>
                <button onClick={downloadTemplate} className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-xs mt-3 transition-colors">
                  <Download size={12} /> Baixar template (compatível com Excel)
                </button>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10"><FileText size={16} className="text-emerald-400" /></div>
                <div>
                  <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>{fileName}</p>
                  <p className="text-slate-500 text-xs">{rows.length} card{rows.length > 1 ? 's' : ''} encontrado{rows.length > 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/8' : 'border-black/8'}`}>
                <div className={`grid grid-cols-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest ${isDark ? 'bg-white/4 text-slate-500' : 'bg-black/4 text-slate-400'}`}>
                  <span>Frente</span><span>Verso</span>
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {rows.slice(0, 20).map((r, i) => (
                    <div key={i} className={`grid grid-cols-2 gap-3 px-4 py-2.5 text-xs border-t ${isDark ? 'border-white/5 text-slate-300' : 'border-black/5 text-slate-700'}`}>
                      <span className="truncate">{r.front}</span>
                      <span className="truncate text-slate-500">{r.back}</span>
                    </div>
                  ))}
                  {rows.length > 20 && <p className="text-center text-slate-600 text-xs py-2">+ {rows.length - 20} cards não exibidos</p>}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setStep('upload'); setRows([]); setFileName(''); }}
                  className={`flex-1 border font-semibold py-3 rounded-xl transition-all text-sm ${isDark ? 'bg-white/5 hover:bg-white/10 border-white/8 text-slate-300' : 'bg-black/4 hover:bg-black/8 border-black/8 text-slate-600'}`}>
                  Trocar arquivo
                </button>
                <button onClick={handleImport}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2">
                  <Upload size={15} /> Importar {rows.length} card{rows.length > 1 ? 's' : ''}
                </button>
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-8 gap-5">
              <Loader2 size={32} className="animate-spin text-blue-400" />
              <div className="w-full">
                <div className="flex justify-between text-xs text-slate-500 mb-2">
                  <span>Importando cards...</span><span>{progress}%</span>
                </div>
                <div className={`h-2 rounded-full w-full ${isDark ? 'bg-white/8' : 'bg-black/8'}`}>
                  <div className="h-full rounded-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
              <div className="p-4 rounded-2xl bg-emerald-500/10"><Check size={28} className="text-emerald-400" /></div>
              <div>
                <p className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-800'}`}>Importação concluída!</p>
                <p className="text-slate-500 text-sm mt-1">{rows.length} card{rows.length > 1 ? 's' : ''} adicionado{rows.length > 1 ? 's' : ''} ao deck.</p>
              </div>
              <button onClick={onClose} className="mt-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3 rounded-xl transition-all text-sm">Fechar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}