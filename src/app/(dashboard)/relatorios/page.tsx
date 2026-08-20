'use client';

import React, { useState, useEffect } from 'react';
import { useProject } from '@/context/ProjectContext';
import { BarChart3, Download, Printer, FileSpreadsheet, Users, FolderKanban, Calculator } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/calculations';
import * as XLSX from 'xlsx';

export default function RelatoriosPage() {
  const { selectedProject } = useProject();
  const [reportType, setReportType] = useState('cost-center');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReport() {
      if (!selectedProject) return;
      try {
        setLoading(true);
        const res = await fetch(`/api/reports?type=${reportType}&projectId=${selectedProject.id}`);
        if (res.ok) setData(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [reportType, selectedProject]);

  const handleExportExcel = () => {
    if (!data || data.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatorio');
    XLSX.writeFile(wb, `Relatorio_${reportType}_${selectedProject?.name || 'Obra'}.xlsx`);
  };

  const handleExportCSV = () => {
    if (!data || data.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Relatorio_${reportType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:p-0">
      {/* Header (Oculto na impressão) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <BarChart3 className="w-6 h-6 text-emerald-600 mr-2.5" />
            Relatórios Gerenciais Exportáveis
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Exportação para Excel (.xlsx), CSV e emissão de PDFs executivos
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl shadow-xs transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel (.xlsx)</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-medium text-xs rounded-xl shadow-xs transition"
          >
            <Download className="w-4 h-4" />
            <span>CSV</span>
          </button>
          <button
            onClick={handlePrintPDF}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs rounded-xl shadow-xs transition"
          >
            <Printer className="w-4 h-4" />
            <span>PDF / Imprimir</span>
          </button>
        </div>
      </div>

      {/* Seletor de Tipo de Relatório */}
      <div className="glass-card p-2 rounded-2xl border border-slate-200 flex flex-wrap gap-2 print:hidden">
        <button
          onClick={() => setReportType('cost-center')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            reportType === 'cost-center' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FolderKanban className="w-4 h-4" />
          <span>Por Centro de Custo</span>
        </button>
        <button
          onClick={() => setReportType('suppliers')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            reportType === 'suppliers' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Relatório de Fornecedores</span>
        </button>
        <button
          onClick={() => setReportType('budget')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            reportType === 'budget' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Relatório de Orçamento completo</span>
        </button>
      </div>

      {/* Área Imprimível do Relatório */}
      <div className="glass-card rounded-2xl border border-slate-200 p-6 space-y-4 print:border-none print:shadow-none">
        <div className="border-b pb-3 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900 uppercase">
              Relatório {reportType === 'cost-center' ? 'por Centro de Custo' : reportType === 'suppliers' ? 'de Fornecedores' : 'de Orçamento'}
            </h2>
            <span className="text-xs text-slate-500 font-semibold">{selectedProject?.name} • Construtora Kitnet Passos</span>
          </div>
          <span className="text-xs text-slate-400">Gerado em: {new Date().toLocaleDateString('pt-BR')}</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs">Carregando dados do relatório...</div>
        ) : reportType === 'cost-center' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[10px] font-bold uppercase text-slate-600 border-b">
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Centro de Custo</th>
                  <th className="py-2.5 px-3 text-right">Contratado</th>
                  <th className="py-2.5 px-3 text-right">Comprado (Realizado)</th>
                  <th className="py-2.5 px-3 text-right">Pago</th>
                  <th className="py-2.5 px-3 text-right">Saldo</th>
                  <th className="py-2.5 px-3 text-center">% Consumido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                {data.map((row: any) => (
                  <tr key={row.code}>
                    <td className="py-2.5 px-3 font-mono font-bold">{row.code}</td>
                    <td className="py-2.5 px-3 font-semibold">{row.name}</td>
                    <td className="py-2.5 px-3 text-right font-medium">{formatCurrency(row.contracted)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-indigo-700">{formatCurrency(row.purchased)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{formatCurrency(row.paid)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-cyan-700">{formatCurrency(row.balance)}</td>
                    <td className="py-2.5 px-3 text-center font-bold">{formatPercent(row.percentConsumed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : reportType === 'suppliers' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[10px] font-bold uppercase text-slate-600 border-b">
                  <th className="py-2.5 px-3">Fornecedor</th>
                  <th className="py-2.5 px-3">CNPJ/CPF</th>
                  <th className="py-2.5 px-3 text-center">N° Compras</th>
                  <th className="py-2.5 px-3 text-right">Total Comprado</th>
                  <th className="py-2.5 px-3 text-right">Ticket Médio</th>
                  <th className="py-2.5 px-3 text-right">Valor Pago</th>
                  <th className="py-2.5 px-3 text-right">Em Aberto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                {data.map((sup: any) => (
                  <tr key={sup.id}>
                    <td className="py-2.5 px-3 font-bold">{sup.name}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{sup.taxId}</td>
                    <td className="py-2.5 px-3 text-center font-semibold">{sup.purchaseCount}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900">{formatCurrency(sup.totalPurchased)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">{formatCurrency(sup.averageTicket)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-700">{formatCurrency(sup.paidAmount)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-amber-700">{formatCurrency(sup.openAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-[10px] font-bold uppercase text-slate-600 border-b">
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Item / Serviço</th>
                  <th className="py-2.5 px-3">Centro Custo</th>
                  <th className="py-2.5 px-3 text-right">Contratado</th>
                  <th className="py-2.5 px-3 text-right">Realizado</th>
                  <th className="py-2.5 px-3 text-right">Pago</th>
                  <th className="py-2.5 px-3 text-right">Saldo</th>
                  <th className="py-2.5 px-3">Fornecedor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-800">
                {data.map((item: any) => (
                  <tr key={item.code}>
                    <td className="py-2.5 px-3 font-mono font-bold">{item.code}</td>
                    <td className="py-2.5 px-3 font-medium">{item.itemName}</td>
                    <td className="py-2.5 px-3 text-slate-500">{item.costCenter}</td>
                    <td className="py-2.5 px-3 text-right font-bold">{formatCurrency(item.contractedTotal)}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-indigo-700">{formatCurrency(item.purchasedTotal)}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">{formatCurrency(item.paidTotal)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-cyan-700">{formatCurrency(item.balance)}</td>
                    <td className="py-2.5 px-3 text-slate-700">{item.supplier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
