import { useState, useRef, useCallback } from 'react';
import { X, Upload, FileText, AlertCircle, Check, Loader2,
         Table2, CheckSquare, Square, ChevronDown, ChevronUp } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import Modal from './ui/Modal';

// ─── Utilitários ──────────────────────────────────────────────────────────────

async function loadScript(src, globalCheck) {
  if (globalCheck && window[globalCheck]) return;
  return new Promise((res) => {
    if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
    const s = document.createElement('script');
    s.src = src; s.onload = res; document.head.appendChild(s);
  });
}

function stripBom(str) {
  return str.charCodeAt(0) === 0xFEFF ? str.slice(1) : str;
}

function parseCsvLine(line, sep) {
  const cols = []; let cur = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (inQ && line[i+1]==='"') { cur+='"'; i++; } else inQ=!inQ; }
    else if (ch === sep && !inQ) { cols.push(cur.trim()); cur = ''; }
    else cur += ch;
  }
  cols.push(cur.trim());
  return cols;
}

function parseCsv(text) {
  if (text.startsWith('PK')) return { rows:[], error:'Este arquivo parece ser um .xlsx. Renomeie para .xlsx e tente novamente.' };
  text = stripBom(text);
  const lines = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').trim().split('\n');
  if (lines.length < 2) return { rows:[], error:'O arquivo precisa ter ao menos um card além do cabeçalho.' };

  // Detecta separador: tab (Anki .txt), ponto-e-vírgula ou vírgula
  const firstLine = lines[0];
  const sep = firstLine.includes('\t') ? '\t' : firstLine.includes(';') ? ';' : ',';

  const header = parseCsvLine(lines[0], sep).map(h => h.toLowerCase().replace(/['"'\uFEFF]/g,'').trim());
  const fi = header.findIndex(h => ['frente','front','pergunta','question'].includes(h));
  const bi = header.findIndex(h => ['verso','back','resposta','answer'].includes(h));

  // Se não encontrou cabeçalho, tenta como arquivo sem header (coluna 0 = frente, coluna 1 = verso)
  if (fi === -1 || bi === -1) {
    const rows = [];
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const cols = parseCsvLine(lines[i], sep);
      if (cols.length >= 2) {
        const front = cols[0].trim(), back = cols[1].trim();
        if (front || back) rows.push({ front, back });
      }
    }
    if (rows.length > 0) return { rows, error: null };
    return { rows:[], error:`Não foi possível detectar as colunas. Cabeçalho: "${header.join(', ')}". Use "frente" e "verso".` };
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = parseCsvLine(lines[i], sep);
    const front = (cols[fi]||'').trim(), back = (cols[bi]||'').trim();
    if (front || back) rows.push({ front, back });
  }
  if (!rows.length) return { rows:[], error:'Nenhum card válido encontrado.' };
  return { rows, error: null };
}

function readAsText(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => {
      const text = e.target.result;
      if (text.includes('\uFFFD')) {
        const r2 = new FileReader();
        r2.onload = e2 => res(e2.target.result);
        r2.onerror = rej;
        r2.readAsText(file, 'windows-1252');
      } else res(text);
    };
    r.onerror = rej;
    r.readAsText(file, 'UTF-8');
  });
}

function readAsArrayBuffer(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.onerror = rej;
    r.readAsArrayBuffer(file);
  });
}

// ─── Parser XLSX ──────────────────────────────────────────────────────────────
async function parseXlsx(file) {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'XLSX');
  const buf = await readAsArrayBuffer(file);
  try {
    const wb   = window.XLSX.read(buf, { type: 'array' });
    const name = wb.SheetNames.includes('Flashcards') ? 'Flashcards' : wb.SheetNames[0];
    const ws   = wb.Sheets[name];
    const raw  = window.XLSX.utils.sheet_to_json(ws, { defval: '' });
    const rows = raw.map(r => {
      const fk = Object.keys(r).find(k => ['frente','front','pergunta','question'].includes(k.toLowerCase().trim()));
      const bk = Object.keys(r).find(k => ['verso','back','resposta','answer'].includes(k.toLowerCase().trim()));
      if (!fk || !bk) return null;
      const front = String(r[fk]||'').trim(), back = String(r[bk]||'').trim();
      return (front||back) ? { front, back } : null;
    }).filter(Boolean);
    if (!rows.length) return { rows:[], error:'Nenhum card encontrado. Verifique se tem colunas "frente" e "verso".' };
    return { rows, error: null };
  } catch(e) {
    return { rows:[], error:'Erro ao ler .xlsx: '+e.message };
  }
}

// ─── Download template ─────────────────────────────────────────────────────────
async function downloadXlsxTemplate() {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'XLSX');
  const XLSX = window.XLSX;
  const wb   = XLSX.utils.book_new();
  const data = [
    ['frente','verso','notas','nivel','favorito','cor'],
    ['O que é fotossíntese?','Processo pelo qual plantas convertem luz em energia.','Biologia',2,'nao','azul'],
    ['Capital do Japão?','Tóquio','',1,'sim',''],
    ['Fórmula da água?','H₂O','Química 1',3,'nao','roxo'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{wch:36},{wch:36},{wch:22},{wch:10},{wch:12},{wch:14}];
  XLSX.utils.book_append_sheet(wb, ws, 'Flashcards');
  const wi = XLSX.utils.aoa_to_sheet([
    ['⚡ FlashMind — Template de Importação'],[''],
    ['Coluna','Obrigatório?','Descrição'],
    ['frente','Sim','Pergunta ou conceito'],['verso','Sim','Resposta'],
    ['notas','Não','Observações extras'],['nivel','Não','1 a 6'],
    ['favorito','Não','sim ou nao'],['cor','Não','azul · roxo · verde · amber · rosa · vermelho'],
  ]);
  wi['!cols'] = [{wch:12},{wch:14},{wch:52}];
  XLSX.utils.book_append_sheet(wb, wi, 'Instruções');
  XLSX.writeFile(wb, 'flashmind_template.xlsx');
}

// ─── Componente ───────────────────────────────────────────────────────────────
const BADGE = {
  xlsx: { label: 'Excel (.xlsx)', cls: 'text-emerald-400 bg-emerald-500/10' },
  csv:  { label: 'CSV',           cls: 'text-amber-400 bg-amber-500/10'     },
  txt:  { label: 'Anki (.txt)',   cls: 'text-blue-400 bg-blue-500/10'       },
};

export default function CsvImportModal({ deckId, deckName, onClose, onImported }) {
  const { theme }  = useTheme();
  const isDark     = theme === 'dark';
  const fileRef    = useRef();

  const [step, setStep]         = useState('upload');
  const [allRows, setAllRows]   = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [expanded, setExpanded] = useState(new Set());
  const [error, setError]       = useState('');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [progress, setProgress] = useState(0);
  const [loading, setLoading]   = useState(false);

  const processFile = useCallback(async (file) => {
    setFileName(file.name);
    setError('');
    setLoading(true);

    const name   = file.name.toLowerCase();
    const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    const isPK   = header[0]===0x50 && header[1]===0x4B;
    const isXlsx = name.endsWith('.xlsx') || name.endsWith('.xls') || isPK;
    const isTxt  = name.endsWith('.txt');

    let result;
    if (isXlsx) {
      setFileType('xlsx');
      result = await parseXlsx(file);
    } else {
      setFileType(isTxt ? 'txt' : 'csv');
      try {
        const text = await readAsText(file);
        result = parseCsv(text);
      } catch(e) {
        result = { rows:[], error:'Erro ao ler arquivo: '+e.message };
      }
    }

    setLoading(false);
    if (result.error) { setError(result.error); return; }
    setAllRows(result.rows);
    setSelected(new Set(result.rows.map((_,i) => i)));
    setStep('preview');
  }, []);

  const handleFile = e => { const f = e.target.files[0]; if (f) processFile(f); };
  const handleDrop = e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) processFile(f); };

  const toggleAll = () => {
    if (selected.size === allRows.length) setSelected(new Set());
    else setSelected(new Set(allRows.map((_,i) => i)));
  };
  const toggleOne = i => {
    const s = new Set(selected);
    s.has(i) ? s.delete(i) : s.add(i);
    setSelected(s);
  };
  const toggleExpand = i => {
    const s = new Set(expanded);
    s.has(i) ? s.delete(i) : s.add(i);
    setExpanded(s);
  };

  const handleImport = async () => {
    const toImport = allRows.filter((_,i) => selected.has(i));
    if (!toImport.length) return;
    setStep('importing');
    let done = 0;
    for (const row of toImport) {
      try { await api.post('/flashcards', { deckId, front: row.front, back: row.back }); } catch {}
      done++;
      setProgress(Math.round((done / toImport.length) * 100));
    }
    setStep('done');
    onImported(done);
  };

  const selectedCount = selected.size;

  const rowClass = i => `border-t transition-colors cursor-pointer ${
    selected.has(i)
      ? isDark ? 'border-white/5 bg-blue-500/5' : 'border-black/5 bg-blue-500/5'
      : isDark ? 'border-white/5 opacity-50'     : 'border-black/5 opacity-50'
  }`;

  return (
    <Modal onClose={onClose} size="2xl">
      <div className="flex flex-col" style={{ maxHeight: '88vh' }}>

        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-5 border-b flex-shrink-0 ${isDark ? 'border-white/8' : 'border-black/6'}`}>
          <div className="min-w-0">
            <h2 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-800'}`}>Importar cards</h2>
            <p className="text-slate-500 text-xs mt-0.5 truncate">{deckName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar"
            className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"><X size={20}/></button>
        </div>

        <div className="overflow-y-auto flex-1 p-7">

          {/* ── Upload ── */}
          {step === 'upload' && (
            <div className="space-y-5">
              <div onDragOver={e => e.preventDefault()} onDrop={handleDrop} onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl px-6 py-12 flex flex-col items-center gap-3 cursor-pointer transition-all group ${
                  isDark ? 'border-white/15 hover:border-blue-500/40 bg-white/2' : 'border-black/12 hover:border-blue-500/40 bg-black/2'
                }`}>
                {loading
                  ? <><Loader2 size={28} className="text-blue-400 animate-spin"/><p className="text-slate-500 text-sm">Processando...</p></>
                  : <>
                      <div className={`p-4 rounded-full ${isDark ? 'bg-white/5 group-hover:bg-blue-500/10' : 'bg-black/5 group-hover:bg-blue-500/8'}`}>
                        <Upload size={28} className="text-slate-500 group-hover:text-blue-400 transition-colors"/>
                      </div>
                      <div className="text-center">
                        <p className={`font-semibold text-base mb-1 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                          Clique ou arraste seu arquivo
                        </p>
                        <p className="text-slate-500 text-sm">
                          CSV, Excel (.xlsx) ou exportação do Anki (.txt)
                        </p>
                      </div>
                    </>
                }
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.txt" className="hidden" onChange={handleFile}/>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5"/> {error}
                </div>
              )}

              {/* Formatos aceitos */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon:'📄', label:'CSV',          desc:'Google Sheets, Excel' },
                  { icon:'📊', label:'Excel (.xlsx)', desc:'Microsoft Excel'      },
                  { icon:'🃏', label:'Anki (.txt)',   desc:'Exportação do Anki'   },
                ].map(f => (
                  <div key={f.label} className={`rounded-xl border p-3 text-center ${isDark ? 'border-white/6 bg-white/2' : 'border-black/6 bg-black/2'}`}>
                    <div className="text-xl mb-1">{f.icon}</div>
                    <p className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{f.label}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{f.desc}</p>
                  </div>
                ))}
              </div>

              <button onClick={e => { e.stopPropagation(); downloadXlsxTemplate(); }}
                className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-xs transition-colors font-medium">
                <Table2 size={13}/> Baixar template Excel (.xlsx)
              </button>
            </div>
          )}

          {/* ── Preview com seleção ── */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={15} className="text-emerald-400"/>
                  <span className={`text-sm font-medium truncate max-w-[180px] ${isDark ? 'text-white' : 'text-slate-800'}`}>{fileName}</span>
                  {fileType && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${BADGE[fileType]?.cls}`}>{BADGE[fileType]?.label}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-xs">{selectedCount} de {allRows.length} selecionados</span>
                  <button onClick={toggleAll}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all font-medium ${
                      selectedCount === allRows.length
                        ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                        : isDark ? 'text-slate-400 border-white/8 hover:border-white/15' : 'text-slate-500 border-black/8'
                    }`}>
                    {selectedCount === allRows.length ? <CheckSquare size={12}/> : <Square size={12}/>}
                    {selectedCount === allRows.length ? 'Desmarcar todos' : 'Selecionar todos'}
                  </button>
                </div>
              </div>

              <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-white/8' : 'border-black/8'}`}>
                <div className={`grid grid-cols-[32px_1fr_1fr_32px] px-3 py-2 text-[10px] font-bold uppercase tracking-widest ${isDark ? 'bg-white/5 text-slate-500' : 'bg-black/4 text-slate-400'}`}>
                  <span/><span>Frente</span><span>Verso</span><span/>
                </div>
                <div className="max-h-[380px] overflow-y-auto">
                  {allRows.map((row, i) => (
                    <div key={i} className={rowClass(i)}>
                      <div className="grid grid-cols-[32px_1fr_1fr_32px] items-center gap-2 px-3 py-2.5" onClick={() => toggleOne(i)}>
                        <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all ${
                          selected.has(i) ? 'bg-blue-500 border-blue-500' : 'border-white/20 bg-transparent'
                        }`}>
                          {selected.has(i) && <Check size={10} className="text-white"/>}
                        </div>
                        <p className={`text-xs truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          {row.front || <span className="italic text-slate-500">— vazio —</span>}
                        </p>
                        <p className="text-xs truncate text-slate-500">
                          {row.back || <span className="italic">— vazio —</span>}
                        </p>
                        <button onClick={e => { e.stopPropagation(); toggleExpand(i); }}
                          className="text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0">
                          {expanded.has(i) ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                        </button>
                      </div>
                      {expanded.has(i) && (
                        <div className={`px-10 pb-3 grid grid-cols-2 gap-4 text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Frente completa</p>
                            <p className="whitespace-pre-wrap leading-relaxed">{row.front || '—'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Verso completo</p>
                            <p className="whitespace-pre-wrap leading-relaxed">{row.back || '—'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={() => { setStep('upload'); setAllRows([]); setSelected(new Set()); setFileName(''); setFileType(''); }}
                  className={`flex-1 border font-semibold py-3 rounded-xl text-sm transition-all ${isDark ? 'bg-white/5 hover:bg-white/10 border-white/8 text-slate-300' : 'bg-black/4 hover:bg-black/8 border-black/8 text-slate-600'}`}>
                  Trocar arquivo
                </button>
                <button onClick={handleImport} disabled={!selectedCount}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all">
                  <Upload size={15}/> Importar {selectedCount} card{selectedCount !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          )}

          {/* ── Importando ── */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-10 gap-5">
              <Loader2 size={32} className="animate-spin text-blue-400"/>
              <div className="w-full">
                <div className="flex justify-between text-xs text-slate-500 mb-2">
                  <span>Importando cards...</span><span>{progress}%</span>
                </div>
                <div className={`h-2 rounded-full w-full ${isDark ? 'bg-white/8' : 'bg-black/8'}`}>
                  <div className="h-full rounded-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }}/>
                </div>
              </div>
            </div>
          )}

          {/* ── Concluído ── */}
          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
              <div className="p-4 rounded-2xl bg-emerald-500/10"><Check size={28} className="text-emerald-400"/></div>
              <div>
                <p className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-800'}`}>Importação concluída!</p>
                <p className="text-slate-500 text-sm mt-1">{selectedCount} card{selectedCount !== 1 ? 's' : ''} adicionado{selectedCount !== 1 ? 's' : ''} ao deck.</p>
              </div>
              <button onClick={onClose} className="mt-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3 rounded-xl text-sm transition-all">Fechar</button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}