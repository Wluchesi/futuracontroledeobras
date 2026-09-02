'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useProject } from '@/context/ProjectContext';
import {
  Database,
  Search,
  Filter,
  Plus,
  Lock,
  Zap,
  ArrowRight,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Layers,
  FileSpreadsheet,
  Building2,
  CheckCircle2,
  AlertCircle,
  Tag,
  DollarSign,
} from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';
import Link from 'next/link';

const UFS = [
  { code: 'MG', label: 'Minas Gerais (Base)' },
  { code: 'SP', label: 'São Paulo (+12%)' },
  { code: 'RJ', label: 'Rio de Janeiro (+8%)' },
  { code: 'BA', label: 'Bahia (-8%)' },
  { code: 'PR', label: 'Paraná (+5%)' },
  { code: 'GO', label: 'Goiás (-5%)' },
  { code: 'CE', label: 'Ceará (-10%)' },
  { code: 'PE', label: 'Pernambuco (-7%)' },
];

const CATEGORIAS = [
  { value: '', label: 'Todas as Categorias' },
  { value: 'MATERIAL', label: 'Materiais' },
  { value: 'MAO_DE_OBRA', label: 'Mão de Obra' },
  { value: 'EQUIPAMENTO', label: 'Equipamentos' },
  { value: 'COMPOSICAO', label: 'Composições' },
];

export default function SinapiPage() {
  const { user } = useAuth();
  const { selectedProject } = useProject();

  const [items, setItems] = useState<any[]>([]);
  const [grupos, setGrupos] = useState<string[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [selectedUf, setSelectedUf] = useState('MG');
  const [selectedGrupo, setSelectedGrupo] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>({ total: 0, totalPages: 1 });

  // Modal para usar no Orçamento Executivo
  const [selectedSinapiItem, setSelectedSinapiItem] = useState<any | null>(null);
  const [modalFormData, setModalFormData] = useState({
    costCenterId: '',
    stage: '05. Fundações',
    quantity: 1,
    contractedUnitPrice: 0,
    notes: '',
  });
  const [savingItem, setSavingItem] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const planName = user?.company?.planName || 'Gratuito';
  const isPremium = planName.toLowerCase().includes('premium');

  // Carregar dados SINAPI
  const fetchSinapi = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        uf: selectedUf,
        search,
        grupo: selectedGrupo,
        categoria: selectedCategoria,
        page: page.toString(),
        limit: '15',
      });

      const res = await fetch(`/api/sinapi?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
        setPagination(data.pagination);
        if (data.grupos && data.grupos.length > 0) {
          setGrupos(data.grupos);
        }
      }
    } catch (e) {
      console.error('Erro ao buscar dados SINAPI', e);
    } finally {
      setLoading(false);
    }
  };

  // Carregar Centros de Custo para o modal
  useEffect(() => {
    fetch('/api/cost-centers')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCostCenters(data);
          if (data.length > 0) {
            setModalFormData((prev) => ({ ...prev, costCenterId: data[0].id }));
          }
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, selectedUf, selectedGrupo, selectedCategoria]);

  useEffect(() => {
    fetchSinapi();
  }, [page, search, selectedUf, selectedGrupo, selectedCategoria]);

  // Abrir Modal de envio para Orçamento
  const handleOpenBudgetModal = (item: any) => {
    setSelectedSinapiItem(item);
    
    // Tentar adivinhar a etapa com base no grupo SINAPI
    let suggestedStage = '01. Projetos';
    if (item.grupo.includes('Fundações')) suggestedStage = '05. Fundações';
    else if (item.grupo.includes('Alvenaria')) suggestedStage = '07. Alvenaria e Divisórias';
    else if (item.grupo.includes('Cobertura')) suggestedStage = '08. Cobertura';
    else if (item.grupo.includes('Revestimento')) suggestedStage = '13. Revestimentos';
    else if (item.grupo.includes('Pisos')) suggestedStage = '14. Pisos e Rodapés';
    else if (item.grupo.includes('Hidráulica')) suggestedStage = '09. Instalações Hidráulicas';
    else if (item.grupo.includes('Elétrica')) suggestedStage = '10. Instalações Elétricas';
    else if (item.grupo.includes('Pintura')) suggestedStage = '16. Pintura';
    else if (item.grupo.includes('Esquadrias')) suggestedStage = '12. Esquadrias e Vidros';
    else if (item.grupo.includes('Louças')) suggestedStage = '15. Louças e Metais';
    else if (item.grupo.includes('Mão de Obra')) suggestedStage = '21. Mão de Obra Geral';
    else if (item.grupo.includes('Equipamentos')) suggestedStage = '22. Equipamentos e Locação';

    // Adivinhar centro de custo aproximado
    const matchedCc = costCenters.find(cc => cc.name.toLowerCase().includes(item.grupo.toLowerCase().split(' ')[0]));

    setModalFormData({
      costCenterId: matchedCc ? matchedCc.id : (costCenters[0]?.id || ''),
      stage: suggestedStage,
      quantity: 1,
      contractedUnitPrice: item.precoMediano,
      notes: `Preço de referência SINAPI (${item.codigoSinapi}) - Mês ${item.mesReferencia} [UF: ${item.uf}]`,
    });
  };

  // Salvar no Orçamento Executivo
  const handleAddToBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !selectedSinapiItem) return;

    try {
      setSavingItem(true);
      const res = await fetch('/api/budget-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProject.id,
          costCenterId: modalFormData.costCenterId,
          stage: modalFormData.stage,
          itemName: selectedSinapiItem.descricao,
          unit: selectedSinapiItem.unidade,
          quantity: modalFormData.quantity,
          contractedUnitPrice: modalFormData.contractedUnitPrice,
          notes: modalFormData.notes,
        }),
      });

      if (res.ok) {
        setSuccessMessage(`Item "${selectedSinapiItem.codigoSinapi}" adicionado ao orçamento da obra!`);
        setSelectedSinapiItem(null);
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        alert('Erro ao adicionar item ao orçamento.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro de conexão ao salvar no orçamento.');
    } finally {
      setSavingItem(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Component */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold uppercase tracking-wider">
              <Database className="w-3.5 h-3.5" />
              <span>Base Nacional de Custos (CAIXA / IBGE)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Tabela SINAPI & Insumos de Referência</h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Consulte preços medianos oficiais de materiais, mão de obra e composições por Estado. Importe custos diretamente para o seu <strong className="text-emerald-400">Orçamento Executivo</strong> com 1 clique.
            </p>
          </div>

          {/* Card Indicador de Versão */}
          <div className="bg-slate-900/80 border border-slate-700/80 p-4 rounded-2xl space-y-2 min-w-[240px] text-xs">
            <div className="flex justify-between items-center text-slate-400 font-medium">
              <span>Mês de Referência:</span>
              <span className="text-emerald-400 font-mono font-bold">08/2024</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 font-medium">
              <span>Desoneração:</span>
              <span className="text-slate-200 font-bold">Não Desonerado</span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
              <span className="text-slate-400">UF Selecionada:</span>
              <span className="bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded text-[11px]">
                {selectedUf}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Banner de Upgrade para Não-Premium */}
      {!isPremium && (
        <div className="glass-card bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-slate-900 border border-amber-500/30 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl flex-shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center">
                <span>Recurso Exclusivo do Plano Kitneteiro Premium</span>
                <span className="ml-2 px-2 py-0.5 bg-amber-500 text-slate-950 font-extrabold text-[10px] uppercase rounded-md">
                  R$ 99/mês
                </span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                Você está no modo de visualização demonstrativa. Assine o plano Premium para exportação e sincronização ilimitada com seu orçamento.
              </p>
            </div>
          </div>
          <Link
            href="/planos"
            className="flex-shrink-0 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl transition shadow-md flex items-center space-x-2 whitespace-nowrap"
          >
            <span>Fazer Upgrade Agora</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* Toast de Sucesso */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Barra de Busca e Filtros */}
      <div className="glass-card p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Busca Textual */}
          <div className="relative col-span-1 sm:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código SINAPI (ex: 00000370) ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Filtro Estado (UF) */}
          <div>
            <select
              value={selectedUf}
              onChange={(e) => setSelectedUf(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {UFS.map((uf) => (
                <option key={uf.code} value={uf.code}>
                  📍 Estado: {uf.label}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Categoria */}
          <div>
            <select
              value={selectedCategoria}
              onChange={(e) => setSelectedCategoria(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {CATEGORIAS.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filtro por Grupo Funcional (Pills Horizontal Scroll) */}
        {grupos.length > 0 && (
          <div className="pt-2 border-t border-slate-100 flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap flex items-center mr-1">
              <Filter className="w-3 h-3 mr-1 text-slate-400" />
              Grupo:
            </span>
            <button
              onClick={() => setSelectedGrupo('')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                selectedGrupo === ''
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({pagination.total})
            </button>
            {grupos.map((grp) => (
              <button
                key={grp}
                onClick={() => setSelectedGrupo(grp)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  selectedGrupo === grp
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {grp}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tabela de Insumos SINAPI */}
      <div className="glass-card rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
            <p className="text-xs font-semibold">Consultando base de dados SINAPI ({selectedUf})...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Database className="w-12 h-12 text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-700">Nenhum insumo encontrado</p>
            <p className="text-xs text-slate-500 mt-1">Tente ajustar o termo de busca ou selecione outro grupo.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Código SINAPI</th>
                  <th className="py-3.5 px-4">Descrição do Insumo / Item</th>
                  <th className="py-3.5 px-4 text-center">Unidade</th>
                  <th className="py-3.5 px-4">Grupo Funcional</th>
                  <th className="py-3.5 px-4">Categoria</th>
                  <th className="py-3.5 px-4 text-right">Preço Mediano ({selectedUf})</th>
                  <th className="py-3.5 px-4 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    {/* Código */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      <span className="px-2 py-1 rounded bg-slate-100 border border-slate-200 text-slate-800">
                        {item.codigoSinapi}
                      </span>
                    </td>

                    {/* Descrição */}
                    <td className="py-3.5 px-4 font-medium text-slate-900 max-w-md">
                      <div>{item.descricao}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Ref: {item.mesReferencia} • Tipo: {item.tipo}
                      </div>
                    </td>

                    {/* Unidade */}
                    <td className="py-3.5 px-4 text-center font-bold text-slate-600 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px]">
                        {item.unidade}
                      </span>
                    </td>

                    {/* Grupo */}
                    <td className="py-3.5 px-4 font-medium text-slate-600 whitespace-nowrap">
                      <span className="inline-flex items-center text-xs font-semibold text-slate-700">
                        <Tag className="w-3 h-3 mr-1 text-emerald-600" />
                        {item.grupo}
                      </span>
                    </td>

                    {/* Categoria */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          item.categoria === 'MATERIAL'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : item.categoria === 'MAO_DE_OBRA'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : item.categoria === 'EQUIPAMENTO'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {item.categoria === 'MAO_DE_OBRA' ? 'Mão de Obra' : item.categoria}
                      </span>
                    </td>

                    {/* Preço Mediano */}
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 whitespace-nowrap text-sm">
                      <span className="text-emerald-700">{formatCurrency(item.precoMediano)}</span>
                    </td>

                    {/* Ação */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleOpenBudgetModal(item)}
                        className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-xl shadow-xs transition cursor-pointer"
                        title="Adicionar item ao orçamento da obra"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Usar no Orçamento</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé com Paginação */}
        {!loading && pagination.totalPages > 1 && (
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div>
              Mostrando <strong className="text-slate-900">{items.length}</strong> de <strong className="text-slate-900">{pagination.total}</strong> insumos
            </div>
            <div className="flex items-center space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="p-1.5 border rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold">
                Página {page} de {pagination.totalPages}
              </span>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="p-1.5 border rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Adicionar Insumo SINAPI ao Orçamento Executivo */}
      {selectedSinapiItem && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                  Código SINAPI: {selectedSinapiItem.codigoSinapi}
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-0.5">
                  Inserir no Orçamento Executivo
                </h2>
              </div>
              <button
                onClick={() => setSelectedSinapiItem(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Informações do Insumo Selecionado */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1">
              <p className="font-bold text-slate-900">{selectedSinapiItem.descricao}</p>
              <div className="flex justify-between text-slate-500 pt-1">
                <span>Unidade: <strong className="text-slate-800">{selectedSinapiItem.unidade}</strong></span>
                <span>Preço Referência ({selectedSinapiItem.uf}): <strong className="text-emerald-700 font-bold">{formatCurrency(selectedSinapiItem.precoMediano)}</strong></span>
              </div>
            </div>

            <form onSubmit={handleAddToBudget} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Obra de Destino</label>
                <input
                  type="text"
                  disabled
                  value={selectedProject ? `${selectedProject.name} (${selectedProject.city})` : 'Nenhuma obra selecionada'}
                  className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Centro de Custo</label>
                  <select
                    value={modalFormData.costCenterId}
                    onChange={(e) => setModalFormData({ ...modalFormData, costCenterId: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  >
                    {costCenters.map((cc) => (
                      <option key={cc.id} value={cc.id}>
                        {cc.code} — {cc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Etapa da Obra</label>
                  <input
                    type="text"
                    required
                    value={modalFormData.stage}
                    onChange={(e) => setModalFormData({ ...modalFormData, stage: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                    placeholder="ex: 05. Fundações"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Quantidade</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={modalFormData.quantity}
                    onChange={(e) => setModalFormData({ ...modalFormData, quantity: Number(e.target.value) })}
                    className="w-full p-2.5 border rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Preço Unit. Orçado (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={modalFormData.contractedUnitPrice}
                    onChange={(e) => setModalFormData({ ...modalFormData, contractedUnitPrice: Number(e.target.value) })}
                    className="w-full p-2.5 border rounded-xl font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1">Observações / Memória de Cálculo</label>
                <textarea
                  rows={2}
                  value={modalFormData.notes}
                  onChange={(e) => setModalFormData({ ...modalFormData, notes: e.target.value })}
                  className="w-full p-2 border rounded-xl text-slate-600"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedSinapiItem(null)}
                  className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingItem}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition flex items-center space-x-1.5 cursor-pointer"
                >
                  {savingItem ? 'Salvando...' : 'Adicionar ao Orçamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
