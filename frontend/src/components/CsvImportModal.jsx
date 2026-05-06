import { useState, useRef, useCallback } from 'react';
import { X, Upload, FileText, AlertCircle, Check, Loader2, Download,
         Table2, Package, CheckSquare, Square, ChevronDown, ChevronUp } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';

// ─── Utilitários ─────────────────────────────────────────────────────────────

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
  // Segurança: se começar com PK (ZIP), não é CSV
  if (text.startsWith('PK')) return { rows:[], error:'Este arquivo parece ser um .xlsx ou .apkg, não um CSV. Tente renomear para .xlsx ou .apkg.' };
  text = stripBom(text);
  const lines = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').trim().split('\n');
  if (lines.length < 2) return { rows:[], error:'O arquivo precisa ter ao menos um card além do cabeçalho.' };
  const sep = lines[0].includes(';') ? ';' : ',';
  const header = parseCsvLine(lines[0], sep).map(h => h.toLowerCase().replace(/['"'\uFEFF]/g,'').trim());
  const fi = header.findIndex(h => ['frente','front','pergunta','question'].includes(h));
  const bi = header.findIndex(h => ['verso','back','resposta','answer'].includes(h));
  if (fi===-1||bi===-1) return { rows:[], error:`Colunas não encontradas. Cabeçalho: "${header.join(', ')}". Use "frente" e "verso".` };
  const rows = [];
  for (let i=1;i<lines.length;i++) {
    if (!lines[i].trim()) continue;
    const cols = parseCsvLine(lines[i], sep);
    const front=(cols[fi]||'').trim(), back=(cols[bi]||'').trim();
    if (front||back) rows.push({ front, back });
  }
  if (!rows.length) return { rows:[], error:'Nenhum card válido encontrado.' };
  return { rows, error:null };
}

function readAsText(file) {
  return new Promise((res,rej) => {
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
  return new Promise((res,rej) => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.onerror = rej;
    r.readAsArrayBuffer(file);
  });
}

// ─── Parser XLSX ──────────────────────────────────────────────────────────────
async function parseXlsx(file) {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js','XLSX');
  const buf = await readAsArrayBuffer(file);
  try {
    const wb   = window.XLSX.read(buf, { type:'array' });
    const name = wb.SheetNames.includes('Flashcards') ? 'Flashcards' : wb.SheetNames[0];
    const ws   = wb.Sheets[name];
    const raw  = window.XLSX.utils.sheet_to_json(ws, { defval:'' });
    const rows = raw.map(r => {
      const fk = Object.keys(r).find(k=>['frente','front','pergunta','question'].includes(k.toLowerCase().trim()));
      const bk = Object.keys(r).find(k=>['verso','back','resposta','answer'].includes(k.toLowerCase().trim()));
      if (!fk||!bk) return null;
      const front=String(r[fk]||'').trim(), back=String(r[bk]||'').trim();
      return (front||back)?{front,back}:null;
    }).filter(Boolean);
    if (!rows.length) return { rows:[], error:'Nenhum card encontrado. Verifique se tem colunas "frente" e "verso".' };
    return { rows, error:null };
  } catch(e) {
    return { rows:[], error:'Erro ao ler .xlsx: '+e.message };
  }
}

// ─── Parser APKG (Anki) ───────────────────────────────────────────────────────
const FIELD_SEP = '\x1f';

function cleanHtml(s) {
  return (s||'')
    .replace(/<br\s*\/?>/gi,'\n')
    .replace(/<[^>]+>/g,'')
    .replace(/&nbsp;/g,' ').replace(/&amp;/g,'&')
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').trim();
}

// Extrai src de tags img/audio do HTML
function extractMediaRefs(html) {
  const imgs   = [...(html.matchAll(/<img[^>]+src="([^"]+)"/gi))].map(m=>m[1]);
  const sounds = [...(html.matchAll(/\[sound:([^\]]+)\]/g))].map(m=>m[1]);
  return { imgs, sounds };
}

async function parseApkg(file, onProgress) {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js','JSZip');
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.js','initSqlJs');

  const buf = await readAsArrayBuffer(file);
  try {
    onProgress?.('Descomprimindo arquivo...');
    const zip = await window.JSZip.loadAsync(buf);

    // Mapa de mídia: media.json mapeia índice -> nome do arquivo
    let mediaMap = {};
    const mediaJson = zip.file('media');
    if (mediaJson) {
      try { mediaMap = JSON.parse(await mediaJson.async('text')); } catch {}
    }

    // Inverte: nome -> índice
    const nameToIdx = {};
    for (const [idx, name] of Object.entries(mediaMap)) nameToIdx[name] = idx;

    // Pré-carrega todos os arquivos de mídia como base64
    onProgress?.('Carregando mídias...');
    const mediaB64 = {};
    for (const [idx, name] of Object.entries(mediaMap)) {
      const entry = zip.file(idx);
      if (entry) {
        const b64 = await entry.async('base64');
        const ext = name.split('.').pop().toLowerCase();
        const mime = {
          jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',gif:'image/gif',webp:'image/webp',
          mp3:'audio/mpeg',ogg:'audio/ogg',wav:'audio/wav',m4a:'audio/mp4',
        }[ext] || 'application/octet-stream';
        mediaB64[name] = `data:${mime};base64,${b64}`;
      }
    }

    onProgress?.('Lendo banco de dados...');
    const dbFile = zip.file('collection.anki21') || zip.file('collection.anki2');
    if (!dbFile) return { rows:[], error:'Arquivo .apkg inválido ou corrompido.' };

    const dbBuf = await dbFile.async('arraybuffer');

    // Verifica se o banco está comprimido com zstd (Anki 2.1.50+)
    // Magic bytes do zstd: 0xFD2FB528
    const firstBytes = new Uint8Array(dbBuf.slice(0, 4));
    const isZstd = firstBytes[0]===0xFD && firstBytes[1]===0x2F &&
                   firstBytes[2]===0xB5 && firstBytes[3]===0x28;
    if (isZstd) {
      return {
        rows: [],
        error: 'Este .apkg foi exportado com Anki 2.1.50 ou mais recente e usa compressão zstd, que ainda não é suportada no browser. Para importar, abra o Anki, vá em Arquivo → Exportar, e na janela escolha o formato "Anki 2.1 antigo (.apkg)" ou exporte como .txt com campos separados por tabulação e importe aqui como CSV.',
      };
    }

    const SQL = await window.initSqlJs({
      locateFile: () => 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.wasm',
    });

    let db;
    try {
      db = new SQL.Database(new Uint8Array(dbBuf));
    } catch(e) {
      return {
        rows: [],
        error: 'Não foi possível abrir o banco de dados do Anki. O arquivo pode estar corrompido ou usar um formato incompatível.',
      };
    }

    onProgress?.('Processando cards...');
    let results;
    try { results = db.exec('SELECT flds FROM notes'); }
    catch { results = db.exec('SELECT flds FROM notes LIMIT 1000'); }
    db.close();

    if (!results?.length || !results[0].values.length)
      return { rows:[], error:'Nenhuma nota encontrada no arquivo Anki.' };

    const rows = [];
    for (const row of results[0].values) {
      const flds = row[0];
      if (!flds) continue;
      const fields = flds.split(FIELD_SEP);
      const rawFront = fields[0] || '';
      const rawBack  = fields[1] || '';

      // Extrai referências de mídia
      const fMedia = extractMediaRefs(rawFront);
      const bMedia = extractMediaRefs(rawBack);

      const front = cleanHtml(rawFront);
      const back  = cleanHtml(rawBack);

      // Pega a primeira imagem de cada lado se existir
      const frontImage = fMedia.imgs[0] ? (mediaB64[fMedia.imgs[0]] || null) : null;
      const backImage  = bMedia.imgs[0] ? (mediaB64[bMedia.imgs[0]] || null) : null;
      const frontAudio = fMedia.sounds[0] ? (mediaB64[fMedia.sounds[0]] || null) : null;
      const backAudio  = bMedia.sounds[0] ? (mediaB64[bMedia.sounds[0]] || null) : null;

      if (front||back||frontImage||backImage)
        rows.push({ front, back, frontImage, backImage, frontAudio, backAudio });
    }

    if (!rows.length) return { rows:[], error:'Nenhum card válido encontrado no deck Anki.' };
    return { rows, error:null };
  } catch(e) {
    const msg = e.message || '';
    if (msg.includes('zstd') || msg.includes('unsupported') || msg.includes('corrupt')) {
      return {
        rows: [],
        error: 'Formato incompatível. No Anki, vá em Arquivo → Exportar e escolha "Anki 2.1 antigo (.apkg)" para exportar em formato compatível.',
      };
    }
    return { rows:[], error:`Erro ao processar .apkg: ${msg}` };
  }
}

// ─── Download template ─────────────────────────────────────────────────────────
async function downloadXlsxTemplate() {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js','XLSX');
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
  apkg: { label:'Anki (.apkg)', cls:'text-blue-400 bg-blue-500/10' },
  xlsx: { label:'Excel (.xlsx)', cls:'text-emerald-400 bg-emerald-500/10' },
  csv:  { label:'CSV', cls:'text-amber-400 bg-amber-500/10' },
};

export default function CsvImportModal({ deckId, deckName, onClose, onImported }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const fileRef = useRef();

  const [step, setStep]         = useState('upload');   // upload | preview | importing | done
  const [allRows, setAllRows]   = useState([]);          // todos os cards parseados
  const [selected, setSelected] = useState(new Set());  // índices selecionados
  const [expanded, setExpanded] = useState(new Set());  // índices expandidos no preview
  const [error, setError]       = useState('');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [progress, setProgress] = useState(0);
  const [loading, setLoading]   = useState(false);
  const [loadMsg, setLoadMsg]   = useState('');

  const surface = isDark ? 'bg-[#0F0F18] border-white/10' : 'bg-white border-black/8';

  // ── Processar arquivo ──────────────────────────────────────────────────────
  const processFile = useCallback(async (file) => {
    setFileName(file.name);
    setError('');
    setLoading(true);

    // Detecta tipo por extensão E por magic bytes (primeiros 4 bytes)
    const name = file.name.toLowerCase();
    const header = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    const isPK = header[0]===0x50 && header[1]===0x4B; // ZIP magic: PK
    // .apkg e .xlsx são ambos ZIPs — diferencia pela extensão
    const isApkg = name.endsWith('.apkg') || (isPK && name.includes('apkg'));
    const isXlsx = name.endsWith('.xlsx') || name.endsWith('.xls') || (isPK && !isApkg);

    let result;
    if (isApkg) {
      setFileType('apkg');
      result = await parseApkg(file, msg => setLoadMsg(msg));
    } else if (isXlsx) {
      setFileType('xlsx');
      setLoadMsg('Lendo planilha...');
      result = await parseXlsx(file);
    } else {
      setFileType('csv');
      setLoadMsg('Lendo CSV...');
      try {
        const text = await readAsText(file);
        result = parseCsv(text);
      } catch(e) {
        result = { rows:[], error:'Erro ao ler arquivo: '+e.message };
      }
    }

    setLoading(false);
    setLoadMsg('');

    if (result.error) { setError(result.error); return; }
    setAllRows(result.rows);
    setSelected(new Set(result.rows.map((_,i)=>i)));
    setStep('preview');
  }, []);

  const handleFile = e => { const f=e.target.files[0]; if(f) processFile(f); };
  const handleDrop = e => { e.preventDefault(); const f=e.dataTransfer.files[0]; if(f) processFile(f); };

  // ── Seleção ────────────────────────────────────────────────────────────────
  const toggleAll = () => {
    if (selected.size === allRows.length) setSelected(new Set());
    else setSelected(new Set(allRows.map((_,i)=>i)));
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

  // ── Importar ───────────────────────────────────────────────────────────────
  const handleImport = async () => {
    const toImport = allRows.filter((_,i) => selected.has(i));
    if (!toImport.length) return;
    setStep('importing');
    let done = 0;
    for (const row of toImport) {
      try {
        await api.post('/flashcards', {
          deckId,
          front:      row.front,
          back:       row.back,
          frontImage: row.frontImage || null,
          backImage:  row.backImage  || null,
          frontAudio: row.frontAudio || null,
          backAudio:  row.backAudio  || null,
        });
      } catch {}
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
      : isDark ? 'border-white/5 opacity-50' : 'border-black/5 opacity-50'
  }`;

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
      <div className={`w-full max-w-2xl rounded-3xl border shadow-2xl ${surface} flex flex-col`} style={{ maxHeight:'92vh' }}>

        {/* Header */}
        <div className={`flex items-center justify-between px-7 py-5 border-b flex-shrink-0 ${isDark?'border-white/8':'border-black/6'}`}>
          <div>
            <h2 className={`font-bold text-lg ${isDark?'text-white':'text-slate-800'}`}>Importar cards</h2>
            <p className="text-slate-500 text-xs mt-0.5">{deckName}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors"><X size={20}/></button>
        </div>

        <div className="overflow-y-auto flex-1 p-7">

          {/* ── Upload ── */}
          {step==='upload' && (
            <div className="space-y-5">
              <div onDragOver={e=>e.preventDefault()} onDrop={handleDrop} onClick={()=>fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl px-6 py-10 flex flex-col items-center gap-3 cursor-pointer transition-all group ${
                  isDark?'border-white/15 hover:border-blue-500/40 bg-white/2':'border-black/12 hover:border-blue-500/40 bg-black/2'
                }`}>
                {loading
                  ? <>
                      <Loader2 size={28} className="text-blue-400 animate-spin"/>
                      <p className="text-slate-500 text-sm">{loadMsg || 'Processando...'}</p>
                    </>
                  : <>
                      <div className={`p-3 rounded-xl ${isDark?'bg-white/5 group-hover:bg-blue-500/10':'bg-black/5 group-hover:bg-blue-500/8'}`}>
                        <Upload size={24} className="text-slate-500 group-hover:text-blue-400 transition-colors"/>
                      </div>
                      <div className="text-center">
                        <p className={`font-medium text-sm ${isDark?'text-slate-300':'text-slate-700'}`}>Clique ou arraste seu arquivo</p>
                        <p className="text-slate-500 text-xs mt-1">CSV, Excel (.xlsx) ou Anki (.apkg)</p>
                      </div>
                    </>
                }
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.apkg" className="hidden" onChange={handleFile}/>
              </div>

              {/* Formatos */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  {icon:'📄',label:'CSV',desc:'Google Sheets, Excel'},
                  {icon:'📊',label:'Excel (.xlsx)',desc:'Microsoft Excel'},
                  {icon:'🃏',label:'Anki (.apkg)',desc:'Com imagens e áudios'},
                ].map(f=>(
                  <div key={f.label} className={`rounded-xl border p-3 text-center ${isDark?'border-white/6 bg-white/2':'border-black/6 bg-black/2'}`}>
                    <div className="text-xl mb-1">{f.icon}</div>
                    <p className={`text-xs font-semibold ${isDark?'text-slate-300':'text-slate-700'}`}>{f.label}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{f.desc}</p>
                  </div>
                ))}
              </div>

              {error && (
                <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5"/> {error}
                </div>
              )}

              <div className={`rounded-2xl border p-4 ${isDark?'border-blue-500/15 bg-blue-500/5':'border-blue-500/20 bg-blue-500/5'}`}>
                <div className="flex items-start gap-2.5">
                  <Package size={15} className="text-blue-400 flex-shrink-0 mt-0.5"/>
                  <div>
                    <p className={`text-xs font-semibold mb-1 ${isDark?'text-blue-300':'text-blue-700'}`}>Importando do Anki?</p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      No Anki: <span className="font-medium text-slate-400">Arquivo → Exportar → Deck do Anki (.apkg)</span>.{' '}
                      Se der erro, escolha <span className="font-medium text-slate-400">"Anki 2.1 antigo (.apkg)"</span> na janela de exportação. Imagens e áudios são importados automaticamente.
                    </p>
                  </div>
                </div>
              </div>

              <button onClick={e=>{e.stopPropagation();downloadXlsxTemplate();}}
                className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-xs transition-colors font-medium">
                <Table2 size={13}/> Baixar template Excel (.xlsx)
              </button>
            </div>
          )}

          {/* ── Preview com seleção ── */}
          {step==='preview' && (
            <div className="space-y-4">
              {/* Barra de ações */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <FileText size={15} className="text-emerald-400"/>
                    <span className={`text-sm font-medium truncate max-w-[180px] ${isDark?'text-white':'text-slate-800'}`}>{fileName}</span>
                    {fileType && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${BADGE[fileType]?.cls}`}>{BADGE[fileType]?.label}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-xs">{selectedCount} de {allRows.length} selecionados</span>
                  <button onClick={toggleAll}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-all font-medium ${
                      selectedCount===allRows.length
                        ?'text-blue-400 bg-blue-500/10 border-blue-500/20'
                        :isDark?'text-slate-400 border-white/8 hover:border-white/15':'text-slate-500 border-black/8'
                    }`}>
                    {selectedCount===allRows.length?<CheckSquare size={12}/>:<Square size={12}/>}
                    {selectedCount===allRows.length?'Desmarcar todos':'Selecionar todos'}
                  </button>
                </div>
              </div>

              {/* Lista de cards */}
              <div className={`rounded-2xl border overflow-hidden ${isDark?'border-white/8':'border-black/8'}`}>
                {/* Cabeçalho */}
                <div className={`grid grid-cols-[32px_1fr_1fr_32px] px-3 py-2 text-[10px] font-bold uppercase tracking-widest ${isDark?'bg-white/5 text-slate-500':'bg-black/4 text-slate-400'}`}>
                  <span/>
                  <span>Frente</span>
                  <span>Verso</span>
                  <span/>
                </div>

                <div className="max-h-[380px] overflow-y-auto">
                  {allRows.map((row, i) => {
                    const isExpanded = expanded.has(i);
                    const hasMedia = row.frontImage||row.backImage||row.frontAudio||row.backAudio;
                    return (
                      <div key={i} className={rowClass(i)}>
                        <div className="grid grid-cols-[32px_1fr_1fr_32px] items-center gap-2 px-3 py-2.5"
                          onClick={()=>toggleOne(i)}>
                          {/* Checkbox */}
                          <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all ${
                            selected.has(i)?'bg-blue-500 border-blue-500':'border-white/20 bg-transparent'
                          }`}>
                            {selected.has(i)&&<Check size={10} className="text-white"/>}
                          </div>
                          {/* Frente */}
                          <div className="min-w-0">
                            {row.frontImage&&<img src={row.frontImage} alt="" className="w-8 h-8 object-cover rounded mb-1"/>}
                            <p className={`text-xs truncate ${isDark?'text-slate-300':'text-slate-700'}`}>
                              {row.front||<span className="italic text-slate-500">— só mídia —</span>}
                            </p>
                          </div>
                          {/* Verso */}
                          <div className="min-w-0">
                            {row.backImage&&<img src={row.backImage} alt="" className="w-8 h-8 object-cover rounded mb-1"/>}
                            <p className="text-xs truncate text-slate-500">
                              {row.back||<span className="italic">— só mídia —</span>}
                            </p>
                          </div>
                          {/* Expandir */}
                          <button onClick={e=>{e.stopPropagation();toggleExpand(i);}}
                            className="text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0"
                            title="Ver completo">
                            {isExpanded?<ChevronUp size={14}/>:<ChevronDown size={14}/>}
                          </button>
                        </div>

                        {/* Expandido */}
                        {isExpanded && (
                          <div className={`px-10 pb-3 grid grid-cols-2 gap-4 text-xs ${isDark?'text-slate-300':'text-slate-700'}`}>
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Frente completa</p>
                              {row.frontImage&&<img src={row.frontImage} alt="" className="max-h-32 rounded-xl mb-2 object-contain"/>}
                              {row.frontAudio&&<audio controls src={row.frontAudio} className="w-full h-8 mb-2"/>}
                              <p className="whitespace-pre-wrap leading-relaxed">{row.front||'—'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Verso completo</p>
                              {row.backImage&&<img src={row.backImage} alt="" className="max-h-32 rounded-xl mb-2 object-contain"/>}
                              {row.backAudio&&<audio controls src={row.backAudio} className="w-full h-8 mb-2"/>}
                              <p className="whitespace-pre-wrap leading-relaxed">{row.back||'—'}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Rodapé */}
              <div className="flex gap-3 pt-1">
                <button onClick={()=>{setStep('upload');setAllRows([]);setSelected(new Set());setFileName('');setFileType('');}}
                  className={`flex-1 border font-semibold py-3 rounded-xl text-sm transition-all ${isDark?'bg-white/5 hover:bg-white/10 border-white/8 text-slate-300':'bg-black/4 hover:bg-black/8 border-black/8 text-slate-600'}`}>
                  Trocar arquivo
                </button>
                <button onClick={handleImport} disabled={!selectedCount}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all">
                  <Upload size={15}/> Importar {selectedCount} card{selectedCount!==1?'s':''}
                </button>
              </div>
            </div>
          )}

          {/* ── Importando ── */}
          {step==='importing' && (
            <div className="flex flex-col items-center justify-center py-10 gap-5">
              <Loader2 size={32} className="animate-spin text-blue-400"/>
              <div className="w-full">
                <div className="flex justify-between text-xs text-slate-500 mb-2">
                  <span>Importando cards...</span><span>{progress}%</span>
                </div>
                <div className={`h-2 rounded-full w-full ${isDark?'bg-white/8':'bg-black/8'}`}>
                  <div className="h-full rounded-full bg-blue-500 transition-all duration-300" style={{width:`${progress}%`}}/>
                </div>
              </div>
            </div>
          )}

          {/* ── Concluído ── */}
          {step==='done' && (
            <div className="flex flex-col items-center justify-center py-10 gap-4 text-center">
              <div className="p-4 rounded-2xl bg-emerald-500/10"><Check size={28} className="text-emerald-400"/></div>
              <div>
                <p className={`font-bold text-lg ${isDark?'text-white':'text-slate-800'}`}>Importação concluída!</p>
                <p className="text-slate-500 text-sm mt-1">{selectedCount} card{selectedCount!==1?'s':''} adicionado{selectedCount!==1?'s':''} ao deck.</p>
              </div>
              <button onClick={onClose} className="mt-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3 rounded-xl text-sm transition-all">Fechar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}