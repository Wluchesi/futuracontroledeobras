'use client';

import React, { useState } from 'react';
import { X, QrCode, CreditCard, Copy, CheckCircle2, ShieldCheck, Lock, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  planTitle: string;
  planPrice: number;
}

export default function CheckoutModal({ isOpen, onClose, planId, planTitle, planPrice }: CheckoutModalProps) {
  const { user, updateCompanySession } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT_CARD'>('PIX');
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{ qrCodeUrl: string; copiaECola: string; transactionId: string; checkoutUrl?: string } | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formulário de Cartão de Crédito
  const [cardForm, setCardForm] = useState({
    number: '',
    holderName: '',
    expiry: '',
    cvv: '',
  });

  if (!isOpen) return null;

  const companyId = user?.company?.id || user?.companyId;

  // Iniciar cobrança Pix
  const handleGeneratePix = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          planId,
          paymentMethod: 'PIX',
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        setPixData({
          qrCodeUrl: data.pixQrCodeUrl,
          copiaECola: data.pixCopiaECola,
          transactionId: data.transactionId,
          checkoutUrl: data.checkoutUrl,
        });
      } else {
        setError(data?.error || 'Erro ao comunicar com o servidor de pagamentos.');
      }
    } catch (e) {
      console.error('Checkout error:', e);
      setError('Erro de conexão ao gerar o PIX.');
    } finally {
      setLoading(false);
    }
  };

  // Confirmar pagamento PIX (Simula recebimento do Webhook do Gateway)
  const handleConfirmPixPayment = async () => {
    if (!pixData) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/webhooks/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          planId,
          transactionId: pixData.transactionId,
          status: 'CONFIRMED',
        }),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        if (data.company) {
          updateCompanySession(data.company);
        }
        setSuccess(true);
      } else {
        setError(data?.error || 'Aguardando confirmação de pagamento pelo banco.');
      }
    } catch (e) {
      console.error('Webhook test error:', e);
      setError('Erro ao verificar status do pagamento.');
    } finally {
      setLoading(false);
    }
  };

  // Pagar com Cartão de Crédito
  const handlePayCreditCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId,
          planId,
          paymentMethod: 'CREDIT_CARD',
          cardDetails: cardForm,
        }),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        if (data.company) {
          updateCompanySession(data.company);
        }
        setSuccess(true);
      } else {
        setError(data?.error || 'Pagamento recusado pelo gateway.');
      }
    } catch (e) {
      console.error('Credit card error:', e);
      setError('Erro de conexão ao processar cartão.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPix = () => {
    if (pixData?.copiaECola) {
      navigator.clipboard.writeText(pixData.copiaECola);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 text-slate-100 relative overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header do Checkout */}
        <div className="flex justify-between items-start border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-extrabold text-emerald-400 uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Checkout Seguro SaaS</span>
            </div>
            <h2 className="text-xl font-extrabold text-white">Assinar {planTitle}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Valor da Assinatura: <strong className="text-emerald-400 font-mono text-sm">R$ {planPrice},00 / mês</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerta de Sucesso */}
        {success ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-extrabold text-white">Pagamento Confirmado! 🎉</h3>
            <p className="text-xs text-slate-300 max-w-xs mx-auto">
              Sua empresa foi atualizada com sucesso para o <strong className="text-emerald-400">{planTitle}</strong>. Aproveite todos os recursos liberados!
            </p>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition"
            >
              Voltar para o Painel
            </button>
          </div>
        ) : (
          <>
            {/* Escolha do Método de Pagamento */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('PIX');
                  setPixData(null);
                }}
                className={`p-3 rounded-2xl border flex items-center justify-center space-x-2 text-xs font-bold transition ${
                  paymentMethod === 'PIX'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>PIX Instantâneo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('CREDIT_CARD');
                  setPixData(null);
                }}
                className={`p-3 rounded-2xl border flex items-center justify-center space-x-2 text-xs font-bold transition ${
                  paymentMethod === 'CREDIT_CARD'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Cartão de Crédito</span>
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-950/50 border border-rose-800 text-rose-300 text-xs rounded-xl font-medium">
                {error}
              </div>
            )}

            {/* Conteúdo Aba PIX */}
            {paymentMethod === 'PIX' && (
              <div className="space-y-4">
                {!pixData ? (
                  <div className="py-6 text-center space-y-4 bg-slate-950/60 rounded-2xl p-4 border border-slate-800">
                    <p className="text-xs text-slate-300">
                      Gere o QR Code PIX para realizar o pagamento de <strong className="text-emerald-400">R$ {planPrice},00</strong> de forma imediata.
                    </p>
                    <button
                      onClick={handleGeneratePix}
                      disabled={loading}
                      className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-2 mx-auto cursor-pointer"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-current" />
                      ) : (
                        <>
                          <QrCode className="w-4 h-4" />
                          <span>Gerar QR Code PIX</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 bg-slate-950/60 p-4 rounded-2xl border border-slate-800 text-center">
                    <div className="p-3 bg-white inline-block rounded-2xl shadow-lg">
                      <img src={pixData.qrCodeUrl} alt="QR Code Pix" className="w-44 h-44 mx-auto" />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                        Chave PIX (Copia e Cola)
                      </label>
                      <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 p-2 rounded-xl text-xs font-mono text-slate-300 truncate">
                        <span className="truncate flex-1 text-left">{pixData.copiaECola}</span>
                        <button
                          onClick={handleCopyPix}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1 flex-shrink-0 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={handleConfirmPixPayment}
                        disabled={loading}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        {loading ? (
                          <Loader2 className="w-4 h-4 animate-spin text-current" />
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Já Paguei / Confirmar Pagamento PIX</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Conteúdo Aba Cartão de Crédito */}
            {paymentMethod === 'CREDIT_CARD' && (
              <form onSubmit={handlePayCreditCard} className="space-y-3">
                {/* Botões Rápido de Preenchimento de Teste */}
                <div className="flex items-center space-x-2 pb-1">
                  <button
                    type="button"
                    onClick={() =>
                      setCardForm({
                        number: '5031 7557 3453 8892',
                        holderName: 'APRO TEST',
                        expiry: '11/28',
                        cvv: '123',
                      })
                    }
                    className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-[11px] rounded-lg border border-slate-700 transition"
                  >
                    ⚡ Teste Mastercard
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCardForm({
                        number: '4532 1177 3453 8892',
                        holderName: 'APRO TEST',
                        expiry: '11/28',
                        cvv: '123',
                      })
                    }
                    className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-400 font-bold text-[11px] rounded-lg border border-slate-700 transition"
                  >
                    ⚡ Teste Visa
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Número do Cartão *</label>
                  <input
                    type="text"
                    required
                    placeholder="4532 •••• •••• 8892"
                    value={cardForm.number}
                    onChange={(e) => setCardForm({ ...cardForm, number: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Nome no Cartão *</label>
                  <input
                    type="text"
                    required
                    placeholder="EX: CARLOS A SILVA"
                    value={cardForm.holderName}
                    onChange={(e) => setCardForm({ ...cardForm, holderName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-hidden uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">Validade (MM/AA) *</label>
                    <input
                      type="text"
                      required
                      placeholder="12/28"
                      value={cardForm.expiry}
                      onChange={(e) => setCardForm({ ...cardForm, expiry: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-hidden font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">CVV / Segurança *</label>
                    <input
                      type="text"
                      required
                      placeholder="123"
                      maxLength={4}
                      value={cardForm.cvv}
                      onChange={(e) => setCardForm({ ...cardForm, cvv: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:border-emerald-500 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-xl transition flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-current" />
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Pagar R$ {planPrice},00 no Cartão</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            <div className="text-center pt-2 text-[10px] text-slate-500 flex items-center justify-center space-x-1">
              <Lock className="w-3 h-3 text-slate-500" />
              <span>Transação protegida com criptografia SSL 256-bit</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
