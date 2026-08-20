'use client';

import React, { useState } from 'react';
import { useProject } from '@/context/ProjectContext';
import { FileUp, CheckCircle, UploadCloud, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ImportarExcelPage() {
  const { selectedProject } = useProject();
  const [targetEntity, setTargetEntity] = useState('budget');
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [fileName, setFileName] = useState('');
  const [importSuccess, setImportSuccess] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const json = XLSX.utils.sheet_to_json(ws);
        setParsedRows(json);
      } catch (err) {
        console.error('Erro ao ler planilha Excel:', err);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;
    try {
      setLoading(true);
      const res = await fetch('/api/excel-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetEntity,
          projectId: selectedProject?.id,
          rows: parsedRows,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setImportSuccess(json.importedCount);
        setParsedRows([]);
      } else {
        alert(json.error || 'Erro na importação.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <FileUp className="w-6 h-6 text-emerald-600 mr-2.5" />
            Importação de Dados de Planilha Excel (Seção 28)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Importe orçamentos, centros de custos e fornecedores de planilhas Excel existentes com mapeamento automático de colunas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Formulário de Seleção e Upload */}
        <div className="glass-card p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <label className="font-bold text-slate-800 text-xs block mb-1">Destino da Importação</label>
            <select
              value={targetEntity}
              onChange={(e) => {
                setTargetEntity(e.target.value);
                setParsedRows([]);
              }}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
            >
              <option value="budget">Orçamento Executivo</option>
              <option value="suppliers">Fornecedores</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-slate-800 text-xs block mb-1">Upload da Planilha Excel (.xlsx / .csv)</label>
            <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/50 relative">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <UploadCloud className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <span className="text-xs font-semibold text-slate-700 block">
                {fileName ? fileName : 'Clique para selecionar a planilha'}
              </span>
              <span className="text-[10px] text-slate-400">Formatos aceitos: Excel ou CSV</span>
            </div>
          </div>

          {importSuccess !== null && (
            <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs font-bold flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-emerald-600" />
              {importSuccess} registros importados com sucesso para a obra! 🟢
            </div>
          )}
        </div>

        {/* Pré-visualização dos Dados Carregados */}
        <div className="md:col-span-2 glass-card p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-slate-900 text-sm">
              Pré-visualização dos Dados ({parsedRows.length} linhas encontradas)
            </h3>
            {parsedRows.length > 0 && (
              <button
                onClick={handleConfirmImport}
                disabled={loading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                {loading ? 'Importando...' : 'Confirmar Importação 🟢'}
              </button>
            )}
          </div>

          {parsedRows.length === 0 ? (
            <p className="text-xs text-slate-400 py-10 text-center">
              Nenhuma planilha carregada ainda. Selecione um arquivo para ver a pré-visualização das colunas.
            </p>
          ) : (
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b font-bold text-[10px] uppercase text-slate-600">
                    {Object.keys(parsedRows[0]).map((key) => (
                      <th key={key} className="py-2 px-3">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedRows.slice(0, 10).map((row, idx) => (
                    <tr key={idx}>
                      {Object.values(row).map((val: any, i) => (
                        <td key={i} className="py-2 px-3 text-slate-700 truncate max-w-xs">
                          {String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
