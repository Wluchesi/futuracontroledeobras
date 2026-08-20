'use client';

import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Phone, Mail, MapPin, Edit3, MessageSquare } from 'lucide-react';

export default function FornecedoresPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [formData, setFormData] = useState({
    id: '',
    corporateName: '',
    tradeName: '',
    taxId: '',
    contactPerson: '',
    phone: '',
    whatsapp: '',
    email: '',
    address: '',
    city: 'Passos',
    state: 'MG',
    supplierType: 'MATERIAL',
    notes: '',
  });

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/suppliers');
      if (res.ok) {
        setSuppliers(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const filteredSuppliers = suppliers.filter((s) => {
    const matchesSearch =
      s.corporateName.toLowerCase().includes(search.toLowerCase()) ||
      (s.tradeName && s.tradeName.toLowerCase().includes(search.toLowerCase())) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(search.toLowerCase()));
    const matchesType = !typeFilter || s.supplierType === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = formData.id ? 'PUT' : 'POST';
      const res = await fetch('/api/suppliers', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowModal(false);
        fetchSuppliers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <Users className="w-6 h-6 text-emerald-600 mr-2.5" />
            Cadastro de Fornecedores
          </h1>
          <p className="text-xs text-slate-500 mt-1">Gerencie parceiros, empreiteiros e fornecedores de materiais da obra</p>
        </div>
        <button
          onClick={() => {
            setFormData({
              id: '',
              corporateName: '',
              tradeName: '',
              taxId: '',
              contactPerson: '',
              phone: '',
              whatsapp: '',
              email: '',
              address: '',
              city: 'Passos',
              state: 'MG',
              supplierType: 'MATERIAL',
              notes: '',
            });
            setShowModal(true);
          }}
          className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Fornecedor</span>
        </button>
      </div>

      <div className="glass-card p-4 rounded-2xl flex flex-col md:flex-row gap-3 border border-slate-200">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por razão social, nome fantasia ou contato..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-hidden"
        >
          <option value="">Todos os Tipos</option>
          <option value="MATERIAL">Material</option>
          <option value="MAO_DE_OBRA">Mão de obra</option>
          <option value="SERVICO">Serviço</option>
          <option value="EQUIPAMENTO">Equipamento</option>
          <option value="PROJETO">Projeto</option>
          <option value="FRETE">Frete</option>
          <option value="OUTROS">Outros</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredSuppliers.map((s) => (
          <div key={s.id} className="glass-card p-5 rounded-2xl border border-slate-200/80 hover:shadow-lg transition-all">
            <div className="flex items-start justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md uppercase">
                {s.supplierType}
              </span>
              <button
                onClick={() => {
                  setFormData({
                    id: s.id,
                    corporateName: s.corporateName,
                    tradeName: s.tradeName || '',
                    taxId: s.taxId || '',
                    contactPerson: s.contactPerson || '',
                    phone: s.phone || '',
                    whatsapp: s.whatsapp || s.phone || '',
                    email: s.email || '',
                    address: s.address || '',
                    city: s.city || 'Passos',
                    state: s.state || 'MG',
                    supplierType: s.supplierType || 'MATERIAL',
                    notes: s.notes || '',
                  });
                  setShowModal(true);
                }}
                className="p-1 text-slate-400 hover:text-slate-800"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
            <h3 className="font-bold text-slate-900 text-base">{s.tradeName || s.corporateName}</h3>
            <p className="text-xs text-slate-500 mb-3">{s.corporateName}</p>

            <div className="space-y-1.5 text-xs text-slate-600">
              {s.contactPerson && (
                <div className="font-medium text-slate-800">Contato: {s.contactPerson}</div>
              )}
              {s.phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{s.phone}</span>
                </div>
              )}
              {s.email && (
                <div className="flex items-center space-x-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{s.email}</span>
                </div>
              )}
              {s.city && (
                <div className="flex items-center space-x-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {s.city} - {s.state}
                  </span>
                </div>
              )}
            </div>

            {s.whatsapp && (
              <a
                href={`https://wa.me/55${s.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex items-center justify-center space-x-1.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-semibold text-xs rounded-xl transition"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>Enviar WhatsApp</span>
              </a>
            )}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h2 className="text-lg font-bold text-slate-900">{formData.id ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Razão Social</label>
                <input
                  type="text"
                  required
                  value={formData.corporateName}
                  onChange={(e) => setFormData({ ...formData, corporateName: e.target.value })}
                  className="w-full p-2.5 border rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Nome Fantasia</label>
                  <input
                    type="text"
                    value={formData.tradeName}
                    onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">CNPJ / CPF</label>
                  <input
                    type="text"
                    value={formData.taxId}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-semibold block mb-1">Contato</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Telefone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">WhatsApp</label>
                  <input
                    type="text"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">E-mail</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Tipo de Fornecedor</label>
                  <select
                    value={formData.supplierType}
                    onChange={(e) => setFormData({ ...formData, supplierType: e.target.value })}
                    className="w-full p-2.5 border rounded-xl"
                  >
                    <option value="MATERIAL">Material</option>
                    <option value="MAO_DE_OBRA">Mão de obra</option>
                    <option value="SERVICO">Serviço</option>
                    <option value="EQUIPAMENTO">Equipamento</option>
                    <option value="PROJETO">Projeto</option>
                    <option value="FRETE">Frete</option>
                    <option value="OUTROS">Outros</option>
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

              <div className="flex justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold">
                  Salvar Fornecedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
