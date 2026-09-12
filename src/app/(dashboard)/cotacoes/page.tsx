'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useProject } from '@/context/ProjectContext';
import { useAuth } from '@/context/AuthContext';
import {
  FileSpreadsheet,
  Plus,
  CheckCircle,
  TrendingDown,
  Award,
  Edit3,
  Trash2,
  Sparkles,
  Layers,
  Search,
  X,
  ShoppingCart,
} from 'lucide-react';
import { formatCurrency } from '@/lib/calculations';

const STANDARD_UNITS = [
  'un',
  'm²',
  'm³',
  'kg',
  'm',
  'L',
  'saco',
  'cx',
  'verba',
  'hrs',
  'dia',
  'mês',
  'jg',
];

function CotacoesContent() {
  const { user } = useAuth();
  const { selectedProject } = useProject();
  const searchParams = useSearchParams();

  const [budgetItems, setBudgetItems] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [selectedItemFilter, setSelectedItemFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Modo de inclusão: 'NEW' (cria o item no orçamento na hora) ou 'EXISTING' (vincula a item já cadastrado)
  const [itemMode, setItemMode] = useState<'NEW' | 'EXISTING'>('NEW');

  const [formData, setFormData] = useState({
    id: '',
    // Campos do Novo Item (modo NEW)
    itemName: '',
    costCenterId: '',
    stage: '',
    unit: 'un',
    // Campo do Item Existente (modo EXISTING)
    budgetItemId: '',
    // Campos da Cotação / Fornecedor
    supplierId: '',
    quantity: 1,
    unitPrice: 0,
    freight: 0,
    discount: 0,
    taxes: 0,
    deliveryDays: 3,
    paymentTerms: '30 dias',
    notes: '',
    isChosen: true, // Padrão selecionado como vencedor para compra direta/rápida
  });

  const fetchData = async () => {
    if (!selectedProject) return;
    try {
      setLoading(true);
      const supplierUrl = user?.companyId ? `/api/suppliers?companyId=${user.companyId}` : '/api/suppliers';
      const [resBudget, resSuppliers, resCc] = await Promise.all([
        fetch(`/api/budget-items?projectId=${selectedProject.id}`),
        fetch(supplierUrl),
        fetch('/api/cost-centers'),
      ]);
      if (resBudget.ok) setBudgetItems(await resBudget.json());
      if (resSuppliers.ok) setSuppliers(await resSuppliers.json());
      if (resCc.ok) setCostCenters(await resCc.json());
    } catch (e) {
      console.error('Erro ao buscar dados de cotação:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedProject]);

  // Se vier parâmetro de URL (ex: redirecionado do Orçamento Executivo com ?itemId=...)
  useEffect(() => {
    const urlItemId = searchParams.get('itemId');
    const urlAction = searchParams.get('action');

    if (urlItemId) {
      setSelectedItemFilter(urlItemId);
      if (urlAction === 'quote' && budgetItems.length > 0) {
        const found = budgetItems.find((i) => i.id === urlItemId);
        if (found) {
          setItemMode('EXISTING');
          setFormData({
            id: '',
            itemName: found.itemName,
            costCenterId: found.costCenterId,
            stage: found.stage,
            unit: found.unit,
            budgetItemId: found.id,
            supplierId: suppliers[0]?.id || '',
            quantity: found.quantity || 1,
            unitPrice: found.contractedUnitPrice || 0,
            freight: 0,
            discount: 0,
            taxes: 0,
            deliveryDays: 3,
            paymentTerms: '30 dias',
            notes: '',
            isChosen: true,
          });
          setShowModal(true);
        }
      }
    }
  }, [searchParams, budgetItems, suppliers]);

  const filteredItems = budgetItems.filter((item) => {
    const matchesDropdown = !selectedItemFilter || item.id === selectedItemFilter;
    if (!matchesDropdown) return false;

    if (!searchTerm.trim()) return true;

    const term = searchTerm.toLowerCase().trim();
    const matchesItem =
      item.code?.toLowerCase().includes(term) ||
      item.itemName?.toLowerCase().includes(term) ||
      item.stage?.toLowerCase().includes(term) ||
      item.notes?.toLowerCase().includes(term) ||
      item.description?.toLowerCase().includes(term);

    const matchesQuotations = (item.quotations || []).some((q: any) => {
      const sName = (q.supplier?.tradeName || q.supplier?.corporateName || '').toLowerCase();
      const qNotes = (q.notes || '').toLowerCase();
      const qPayment = (q.paymentTerms || '').toLowerCase();
      return sName.includes(term) || qNotes.includes(term) || qPayment.includes(term);
    });

    return matchesItem || matchesQuotations;
  });

  const handleSelectWinningQuotation = async (quotationId: string) => {
    try {
      const res = await fetch('/api/quotations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: quotationId, isChosen: true }),
      });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteQuotation = async (quotationId: string) => {
    if (!confirm('Tem certeza que deseja remover esta cotação?')) return;
    try {
      const res = await fetch(`/api/quotations?id=${quotationId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (showModal && formData.id === quotationId) {
          setShowModal(false);
        }
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir cotação.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro de conexão ao excluir cotação.');
    }
  };

  const handleDeleteBudgetItem = async (budgetItemId: string, itemName: string) => {
    if (!confirm(`Deseja realmente remover o item "${itemName}" e todas as suas cotações vinculadas?`)) return;
    try {
      const res = await fetch(`/api/budget-items?id=${budgetItemId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok) {
        fetchData();
      } else {
        alert(data.error || 'Erro ao excluir item.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro de conexão ao excluir item.');
    }
  };

  const handleEditQuotation = (q: any) => {
    setItemMode('EXISTING');
    setFormData({
      id: q.id,
      itemName: q.budgetItem?.itemName || '',
      costCenterId: q.budgetItem?.costCenterId || '',
      stage: q.budgetItem?.stage || '',
      unit: q.budgetItem?.unit || 'un',
      budgetItemId: q.budgetItemId,
      supplierId: q.supplierId,
      quantity: q.quantity,
      unitPrice: q.unitPrice,
      freight: q.freight,
      discount: q.discount,
      taxes: q.taxes,
      deliveryDays: q.deliveryDays,
      paymentTerms: q.paymentTerms || '30 dias',
      notes: q.notes || '',
      isChosen: q.isChosen,
    });
    setShowModal(true);
  };

  const openNewQuotationModal = (preselectedItemId?: string) => {
    const firstCc = costCenters[0];
    const defaultStage = firstCc ? `${firstCc.code}. ${firstCc.name}` : '01. Projetos';

    if (preselectedItemId) {
      const found = budgetItems.find((i) => i.id === preselectedItemId);
      setItemMode('EXISTING');
      setFormData({
        id: '',
        itemName: found?.itemName || '',
        costCenterId: found?.costCenterId || firstCc?.id || '',
        stage: found?.stage || defaultStage,
        unit: found?.unit || 'un',
        budgetItemId: preselectedItemId,
        supplierId: suppliers[0]?.id || '',
        quantity: found?.quantity || 1,
        unitPrice: found?.contractedUnitPrice || 0,
        freight: 0,
        discount: 0,
        taxes: 0,
        deliveryDays: 3,
        paymentTerms: '30 dias',
        notes: '',
        isChosen: true,
      });
    } else {
      const shouldBeNew = budgetItems.length === 0 ? true : true;
      setItemMode(shouldBeNew ? 'NEW' : 'EXISTING');
      setFormData({
        id: '',
        itemName: '',
        costCenterId: firstCc?.id || '',
        stage: defaultStage,
        unit: 'un',
        budgetItemId: budgetItems[0]?.id || '',
        supplierId: suppliers[0]?.id || '',
        quantity: 1,
        unitPrice: 0,
        freight: 0,
        discount: 0,
        taxes: 0,
        deliveryDays: 3,
        paymentTerms: '30 dias',
        notes: '',
        isChosen: true,
      });
    }
    setShowModal(true);
  };

  const handleCostCenterChange = (costCenterId: string) => {
    const foundCc = costCenters.find((cc) => cc.id === costCenterId);
    setFormData((prev) => ({
      ...prev,
      costCenterId,
      stage: foundCc ? `${foundCc.code}. ${foundCc.name}` : prev.stage,
    }));
  };

  const handleSaveQuotation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.supplierId) {
      alert('Selecione um fornecedor para a cotação.');
      return;
    }

    if (itemMode === 'NEW' && !formData.id) {
      if (!formData.itemName.trim()) {
        alert('Por favor, informe o nome do material ou serviço.');
        return;
      }
      if (!formData.costCenterId) {
        alert('Selecione um centro de custo / etapa para o item.');
        return;
      }
    }

    if (itemMode === 'EXISTING' && !formData.id && !formData.budgetItemId) {
      alert('Selecione um item existente do orçamento.');
      return;
    }

    try {
      const isEditing = Boolean(formData.id);
      const method = isEditing ? 'PUT' : 'POST';

      const payload: any = {
        id: formData.id || undefined,
        projectId: selectedProject?.id,
        supplierId: formData.supplierId,
        quantity: Number(formData.quantity) || 1,
        unitPrice: Number(formData.unitPrice) || 0,
        freight: Number(formData.freight) || 0,
        discount: Number(formData.discount) || 0,
        taxes: Number(formData.taxes) || 0,
        deliveryDays: Number(formData.deliveryDays) || 0,
        paymentTerms: formData.paymentTerms,
        notes: formData.notes,
        isChosen: formData.isChosen,
      };

      if (!isEditing) {
        if (itemMode === 'NEW') {
          payload.newItem = {
            itemName: formData.itemName.trim(),
            costCenterId: formData.costCenterId,
            stage: formData.stage,
            unit: formData.unit,
            quantity: Number(formData.quantity) || 1,
            unitPrice: Number(formData.unitPrice) || 0,
          };
        } else {
          payload.budgetItemId = formData.budgetItemId;
        }
      } else {
        payload.budgetItemId = formData.budgetItemId;
      }

      const res = await fetch('/api/quotations', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowModal(false);
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao salvar cotação.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro de conexão ao salvar cotação.');
    }
  };

  const calculatedFinalPrice =
    Number(formData.quantity || 1) * Number(formData.unitPrice || 0) +
    Number(formData.freight || 0) +
    Number(formData.taxes || 0) -
    Number(formData.discount || 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600 mr-2.5" />
            Matriz de Cotações & Comparação de Fornecedores
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Lance cotações diretas criando novos itens na hora ou compare múltiplos fornecedores por item
          </p>
        </div>
        <button
          onClick={() => openNewQuotationModal()}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Cotação</span>
        </button>
      </div>

      {/* Barra de Pesquisa por Palavra-Chave & Filtros */}
      {budgetItems.length > 0 && (
        <div className="glass-card p-4 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Busca por Palavra-Chave */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Pesquisar por Palavra-Chave
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por material, código, fornecedor ou observação..."
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-emerald-500 focus:bg-white transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                  title="Limpar busca"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Filtro por Item Específico do Orçamento */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Filtrar por Item do Orçamento
            </label>
            <select
              value={selectedItemFilter}
              onChange={(e) => setSelectedItemFilter(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:border-emerald-500 focus:bg-white transition"
            >
              <option value="">Todos os Itens do Orçamento ({budgetItems.length})</option>
              {budgetItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} — {item.itemName} ({item.quotations?.length || 0} proposta/s)
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Estado Vazio Amigável */}
      {!loading && filteredItems.length === 0 && (
        <div className="glass-card p-12 rounded-3xl border border-dashed border-slate-300 text-center space-y-4 max-w-xl mx-auto">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">
              {searchTerm ? 'Nenhum resultado encontrado para esta busca' : 'Nenhuma cotação cadastrada nesta obra'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {searchTerm
                ? 'Tente buscar por outro termo, limpar a busca ou selecionar outro item.'
                : 'Você não precisa cadastrar nada no orçamento antes! Clique no botão abaixo para lançar sua primeira cotação com o fornecedor e o item será criado automaticamente na hora.'}
            </p>
          </div>
          {searchTerm ? (
            <button
              onClick={() => setSearchTerm('')}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Limpar Filtro de Busca</span>
            </button>
          ) : (
            <button
              onClick={() => openNewQuotationModal()}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Lançar Primeira Cotação</span>
            </button>
          )}
        </div>
      )}

      {/* Matriz de Comparação Visual de Fornecedores */}
      <div className="space-y-6">
        {filteredItems.map((item) => {
          const quots = item.quotations || [];
          const prices = quots.map((q: any) => q.finalPrice);
          const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;
          const highestPrice = prices.length > 0 ? Math.max(...prices) : 0;
          const chosenQuot = quots.find((q: any) => q.isChosen);
          const economy = highestPrice > 0 && chosenQuot ? Math.max(0, highestPrice - chosenQuot.finalPrice) : 0;

          return (
            <div key={item.id} className="glass-card p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                      {item.code}
                    </span>
                    <h3 className="font-bold text-slate-900 text-base">{item.itemName}</h3>
                  </div>
                  <span className="text-xs text-slate-500">
                    Etapa: {item.stage} • Quantidade: {item.quantity} {item.unit}
                  </span>
                  {item.notes && (
                    <div className="mt-1 text-xs text-slate-600 italic">
                      <span className="font-semibold text-slate-700 not-italic">Obs do item: </span>
                      {item.notes}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  {chosenQuot && (
                    <Link
                      href={`/compras?action=new&budgetItemId=${item.id}&supplierId=${chosenQuot.supplierId}&unitPrice=${chosenQuot.unitPrice}&quantity=${chosenQuot.quantity || item.quantity || 1}&discount=${chosenQuot.discount || 0}&freight=${(chosenQuot.freight || 0) + (chosenQuot.taxes || 0)}&paymentCondition=${encodeURIComponent(chosenQuot.paymentTerms || '30 dias')}`}
                      className="hidden sm:inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition cursor-pointer"
                      title="Finalizar compra desta cotação vencedora no módulo de Compras"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Comprar Vencedora</span>
                    </Link>
                  )}
                  {economy > 0 && (
                    <div className="inline-flex items-center px-3 py-1 bg-emerald-100 text-emerald-800 rounded-xl font-bold text-xs border border-emerald-300">
                      <TrendingDown className="w-4 h-4 mr-1 text-emerald-600" />
                      Economia de {formatCurrency(economy)} nesta cotação!
                    </div>
                  )}
                  <button
                    onClick={() => handleDeleteBudgetItem(item.id, item.itemName)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer flex items-center gap-1 text-xs"
                    title="Remover este item e todas as suas cotações"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-[11px] text-slate-500 hover:text-rose-600">Excluir Item</span>
                  </button>
                </div>
              </div>

              {/* Matriz de 3 Colunas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[0, 1, 2].map((index) => {
                  const q = quots[index];
                  if (!q) {
                    return (
                      <div
                        key={index}
                        onClick={() => openNewQuotationModal(item.id)}
                        className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-emerald-400 hover:bg-emerald-50/40 transition group"
                      >
                        <Plus className="w-6 h-6 text-slate-400 group-hover:text-emerald-600 mb-2" />
                        <span className="text-xs font-semibold text-slate-500 group-hover:text-emerald-700">
                          + Adicionar Fornecedor {index + 1}
                        </span>
                      </div>
                    );
                  }

                  const isLowest = q.finalPrice === lowestPrice;
                  const isChosen = q.isChosen;

                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-2xl border transition-all relative ${
                        isChosen
                          ? 'bg-emerald-50/80 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                          : isLowest
                          ? 'bg-amber-50/50 border-amber-300'
                          : 'bg-slate-50/80 border-slate-200'
                      }`}
                    >
                      {/* Badge Vencedora ou Menor Preço */}
                      {isChosen && (
                        <span className="absolute -top-3 left-4 bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs flex items-center">
                          <Award className="w-3 h-3 mr-1" /> Vencedora Escolhida
                        </span>
                      )}

                      {isLowest && !isChosen && (
                        <span className="absolute -top-3 left-4 bg-amber-500 text-white font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs">
                          🟢 Melhor Preço
                        </span>
                      )}

                      {/* Botões de Ação: Editar e Excluir */}
                      <div className="absolute top-3 right-3 flex items-center space-x-1">
                        <button
                          onClick={() => handleEditQuotation(q)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
                          title="Editar Cotação"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuotation(q.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition cursor-pointer"
                          title="Remover Cotação"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="font-bold text-slate-900 text-sm mt-2 pr-12">
                        {q.supplier?.tradeName || q.supplier?.corporateName || 'Fornecedor não identificado'}
                      </div>
                      <span className="text-[11px] text-slate-500 block mb-2">{q.supplier?.supplierType || 'Geral'}</span>

                      <div className="space-y-1 text-xs text-slate-700 my-3">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Preço Unit.:</span>
                          <span>{formatCurrency(q.unitPrice)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Frete / Impostos:</span>
                          <span>{formatCurrency((q.freight || 0) + (q.taxes || 0))}</span>
                        </div>
                        <div className="flex justify-between text-emerald-700">
                          <span>Desconto:</span>
                          <span>- {formatCurrency(q.discount || 0)}</span>
                        </div>
                        <div className="flex justify-between font-extrabold text-sm border-t border-slate-200/80 pt-1 text-slate-900">
                          <span>Valor Final:</span>
                          <span className={isLowest ? 'text-emerald-700' : ''}>{formatCurrency(q.finalPrice)}</span>
                        </div>
                      </div>

                      {/* Quadro de Prazos, Condições e OBSERVAÇÕES no Quadro Principal */}
                      <div className="text-[11px] text-slate-600 space-y-1.5 mb-3 bg-white/70 p-2.5 rounded-xl border border-slate-200/70">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">⏱️ Prazo:</span>
                          <strong>{q.deliveryDays} dias úteis</strong>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">💳 Condição:</span>
                          <strong className="text-emerald-700">{q.paymentTerms || 'A combinar'}</strong>
                        </div>

                        {/* Observações da Cotação com destaque */}
                        {q.notes ? (
                          <div className="pt-2 mt-1 border-t border-slate-200/70 text-slate-700">
                            <span className="font-bold text-slate-800 block mb-0.5">📝 Observações:</span>
                            <p className="italic bg-amber-50/80 border border-amber-200/60 p-2 rounded-lg text-amber-900 leading-snug whitespace-pre-wrap">
                              {q.notes}
                            </p>
                          </div>
                        ) : (
                          <div className="pt-1.5 mt-0.5 border-t border-slate-200/50 text-[10px] text-slate-400 italic">
                            Sem observações registradas
                          </div>
                        )}
                      </div>

                      {isChosen ? (
                        <Link
                          href={`/compras?action=new&budgetItemId=${item.id}&supplierId=${q.supplierId}&unitPrice=${q.unitPrice}&quantity=${q.quantity || item.quantity || 1}&discount=${q.discount || 0}&freight=${(q.freight || 0) + (q.taxes || 0)}&paymentCondition=${encodeURIComponent(q.paymentTerms || '30 dias')}`}
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm group"
                          title="Finalizar compra desta cotação vencedora no módulo de Compras"
                        >
                          <ShoppingCart className="w-4 h-4 text-emerald-100 group-hover:scale-110 transition-transform" />
                          <span>Finalizar Compra</span>
                        </Link>
                      ) : (
                        <button
                          onClick={() => handleSelectWinningQuotation(q.id)}
                          className="w-full py-1.5 bg-slate-900 hover:bg-emerald-600 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center space-x-1 cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Selecionar Esta Opção</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Nova / Editar Cotação */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-bold text-slate-900">
                {formData.id ? 'Editar Cotação' : 'Cadastrar Cotação'}
              </h2>
            </div>

            {/* Seletor de Modo: Criar Novo Item vs Vincular a Existente (Apenas para novas cotações) */}
            {!formData.id && (
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setItemMode('NEW')}
                  className={`py-2 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                    itemMode === 'NEW'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Novo Item na Hora</span>
                </button>
                <button
                  type="button"
                  onClick={() => setItemMode('EXISTING')}
                  disabled={budgetItems.length === 0}
                  className={`py-2 px-3 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                    itemMode === 'EXISTING'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-slate-600" />
                  <span>Vincular a Item Existente</span>
                </button>
              </div>
            )}

            <form onSubmit={handleSaveQuotation} className="space-y-3.5 text-xs">
              {/* MODO 1: CRIAR NOVO ITEM NA HORA */}
              {itemMode === 'NEW' && !formData.id && (
                <div className="p-3.5 bg-emerald-50/50 border border-emerald-200/80 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-800 text-[11px] uppercase tracking-wider flex items-center">
                      <Sparkles className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                      Dados do Novo Item para o Orçamento
                    </span>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Nome do Material / Serviço *</label>
                    <input
                      type="text"
                      required
                      value={formData.itemName}
                      onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
                      placeholder="Ex: Cimento CP-II 50kg, Areia Média, Mão de Obra de Pintura..."
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Centro de Custo / Etapa *</label>
                      <select
                        value={formData.costCenterId}
                        onChange={(e) => handleCostCenterChange(e.target.value)}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-emerald-500"
                      >
                        {costCenters.map((cc) => (
                          <option key={cc.id} value={cc.id}>
                            {cc.code} — {cc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Unidade</label>
                      <select
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-emerald-500"
                      >
                        {STANDARD_UNITS.map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* MODO 2: VINCULAR A ITEM EXISTENTE */}
              {(itemMode === 'EXISTING' || formData.id) && (
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Item do Orçamento Existente *</label>
                  <select
                    disabled={Boolean(formData.id)}
                    value={formData.budgetItemId}
                    onChange={(e) => {
                      const found = budgetItems.find((i) => i.id === e.target.value);
                      setFormData({
                        ...formData,
                        budgetItemId: e.target.value,
                        quantity: found ? found.quantity : 1,
                        unitPrice: found ? found.contractedUnitPrice : 0,
                      });
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 disabled:opacity-75"
                  >
                    {budgetItems.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} — {b.itemName} ({b.stage})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* DADOS DA PROPOSTA / COTAÇÃO */}
              <div className="pt-1 space-y-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Fornecedor Cotado *</label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:outline-emerald-500"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.tradeName || s.corporateName} ({s.supplierType})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Quantidade</label>
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      required
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Preço Unit. (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formData.unitPrice}
                      onChange={(e) => setFormData({ ...formData, unitPrice: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Frete (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.freight}
                      onChange={(e) => setFormData({ ...formData, freight: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Desconto (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.discount}
                      onChange={(e) => setFormData({ ...formData, discount: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Impostos (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.taxes}
                      onChange={(e) => setFormData({ ...formData, taxes: Number(e.target.value) })}
                      className="w-full p-2.5 border border-slate-200 rounded-xl font-medium"
                    />
                  </div>
                </div>

                {/* Resumo do Valor Total Calculado */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-600 text-xs">Valor Total Calculado:</span>
                  <span className="font-extrabold text-sm text-emerald-700">
                    {formatCurrency(calculatedFinalPrice)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Prazo Entrega (dias)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.deliveryDays}
                      onChange={(e) => setFormData({ ...formData, deliveryDays: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Condição de Pagamento</label>
                    <input
                      type="text"
                      required
                      value={formData.paymentTerms}
                      onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                      className="w-full p-2.5 border border-slate-200 rounded-xl font-semibold"
                      placeholder="ex: À vista / 30 dias / 50% entrada"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Observações</label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600"
                    placeholder="Detalhes adicionais, contato do vendedor..."
                  />
                </div>

                <div className="flex items-center space-x-2.5 p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl">
                  <input
                    type="checkbox"
                    id="isChosenModal"
                    checked={formData.isChosen}
                    onChange={(e) => setFormData({ ...formData, isChosen: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 rounded-sm cursor-pointer accent-emerald-600"
                  />
                  <label htmlFor="isChosenModal" className="font-bold text-emerald-900 cursor-pointer text-xs">
                    Definir como proposta vencedora / compra contratada
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                {formData.id ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteQuotation(formData.id)}
                    className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl font-bold text-xs transition cursor-pointer flex items-center space-x-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Remover Cotação</span>
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition cursor-pointer text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition cursor-pointer flex items-center space-x-1.5 text-xs"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>{formData.id ? 'Atualizar Cotação' : 'Salvar Cotação'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CotacoesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Carregando cotações...</div>}>
      <CotacoesContent />
    </Suspense>
  );
}
