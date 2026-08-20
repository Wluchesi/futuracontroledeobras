'use client';

import React, { useState, useEffect } from 'react';
import { useProject } from '@/context/ProjectContext';
import { Building2, Plus, Edit3, Search, Calendar, MapPin, Layers, CheckCircle2 } from 'lucide-react';
import { formatDate } from '@/lib/calculations';

export default function ObrasPage() {
  const { projects, refreshProjects, setSelectedProject } = useProject();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    ownerClient: '',
    address: '',
    city: 'Passos',
    state: 'MG',
    startDate: '',
    endDate: '',
    landArea: 0,
    builtArea: 0,
    unitsCount: 1,
    description: '',
    status: 'EM_ANDAMENTO',
    exceedRule: 1,
  });

  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.ownerClient.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (p: any) => {
    setFormData({
      id: p.id,
      name: p.name,
      ownerClient: p.ownerClient,
      address: p.address || '',
      city: p.city || 'Passos',
      state: p.state || 'MG',
      startDate: p.startDate ? new Date(p.startDate).toISOString().split('T')[0] : '',
      endDate: p.endDate ? new Date(p.endDate).toISOString().split('T')[0] : '',
      landArea: p.landArea || 0,
      builtArea: p.builtArea || 0,
      unitsCount: p.unitsCount || 1,
      description: p.description || '',
      status: p.status || 'EM_ANDAMENTO',
      exceedRule: p.exceedRule || 1,
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = '/api/projects';
      const method = formData.id ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowModal(false);
        await refreshProjects();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <Building2 className="w-6 h-6 text-emerald-600 mr-2.5" />
            Gestão de Obras
          </h1>
          <p className="text-xs text-slate-500 mt-1">Cadastre e gerencie os empreendimentos da construtora</p>
        </div>
        <button
          onClick={() => {
            setFormData({
              id: '',
              name: '',
              ownerClient: '',
              address: '',
              city: 'Passos',
              state: 'MG',
              startDate: new Date().toISOString().split('T')[0],
              endDate: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
              landArea: 350,
              builtArea: 280,
              unitsCount: 6,
              description: '',
              status: 'EM_ANDAMENTO',
              exceedRule: 1,
            });
            setShowModal(true);
          }}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Obra</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="glass-card p-4 rounded-2xl flex flex-col md:flex-row gap-3 border border-slate-200">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome da obra ou proprietário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden"
        >
          <option value="">Todos os Status</option>
          <option value="PLANEJAMENTO">Planejamento</option>
          <option value="EM_ANDAMENTO">Em andamento</option>
          <option value="PAUSADA">Pausada</option>
          <option value="CONCLUIDA">Concluída</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
      </div>

      {/* Grid de Cards de Obras */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredProjects.map((p) => (
          <div
            key={p.id}
            className="glass-card p-5 rounded-2xl border border-slate-200/80 hover:shadow-xl transition-all duration-200 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md uppercase tracking-wider mb-1">
                    {p.status}
                  </span>
                  <h3 className="font-bold text-slate-900 text-base">{p.name}</h3>
                </div>
                <button
                  onClick={() => handleEdit(p)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 text-xs text-slate-600 mb-4">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {p.address ? `${p.address}, ` : ''}
                    {p.city} - {p.state}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {formatDate(p.startDate)} a {formatDate(p.endDate)}
                  </span>
                </div>
                <div className="flex items-center space-x-4 pt-1 text-slate-500 font-medium">
                  <span className="flex items-center">
                    <Layers className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                    Terreno: {p.landArea}m²
                  </span>
                  <span>Construída: {p.builtArea}m²</span>
                  <span>{p.unitsCount} unid</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedProject(p)}
              className="w-full mt-2 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center space-x-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Selecionar Obra Ativa</span>
            </button>
          </div>
        ))}
      </div>

      {/* Modal Formulário */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900">{formData.id ? 'Editar Obra' : 'Nova Obra'}</h2>
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Nome da Obra</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 border rounded-xl"
                  placeholder="ex: Residencial Kitnet Passos"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Cliente / Proprietário</label>
                  <input
                    type="text"
                    required
                    value={formData.ownerClient}
                    onChange={(e) => setFormData({ ...formData, ownerClient: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  >
                    <option value="PLANEJAMENTO">Planejamento</option>
                    <option value="EM_ANDAMENTO">Em andamento</option>
                    <option value="PAUSADA">Pausada</option>
                    <option value="CONCLUIDA">Concluída</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Endereço</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Cidade</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">UF</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Data de Início</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Previsão Término</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Área Terreno (m²)</label>
                  <input
                    type="number"
                    value={formData.landArea}
                    onChange={(e) => setFormData({ ...formData, landArea: Number(e.target.value) })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Área Const. (m²)</label>
                  <input
                    type="number"
                    value={formData.builtArea}
                    onChange={(e) => setFormData({ ...formData, builtArea: Number(e.target.value) })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Unidades</label>
                  <input
                    type="number"
                    value={formData.unitsCount}
                    onChange={(e) => setFormData({ ...formData, unitsCount: Number(e.target.value) })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="font-semibold block mb-1">Regra de Extrapolação Orçamentária</label>
                <select
                  value={formData.exceedRule}
                  onChange={(e) => setFormData({ ...formData, exceedRule: Number(e.target.value) })}
                  className="w-full p-2.5 border rounded-xl"
                >
                  <option value={1}>1. Apenas Alerta visual</option>
                  <option value={2}>2. Solicita Confirmação explicita</option>
                  <option value={3}>3. Bloqueia a Compra</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold">
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
