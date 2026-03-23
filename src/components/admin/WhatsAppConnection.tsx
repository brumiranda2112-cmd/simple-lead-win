import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Wifi, WifiOff, QrCode, RefreshCw } from 'lucide-react';

export default function WhatsAppConnection() {
  const [status, setStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');
  const [phone, setPhone] = useState('');
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: { action: 'check_status' },
      });
      if (!error && data?.connected) {
        setStatus('connected');
        setPhone(data.phone || '');
        setShowQr(false);
        setQrBase64(null);
      } else {
        setStatus('disconnected');
      }
    } catch {
      setStatus('disconnected');
    }
  }, []);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  const fetchQr = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: { action: 'connect_qr' },
      });
      if (!error && data?.qr) {
        setQrBase64(data.qr);
      }
    } catch (e) {
      console.error('QR fetch error', e);
    }
  }, []);

  useEffect(() => {
    if (!showQr) return;
    fetchQr();
    const interval = setInterval(async () => {
      await checkStatus();
      // If still disconnected, refresh QR
      setStatus(prev => {
        if (prev === 'disconnected') fetchQr();
        return prev;
      });
    }, 20000);
    return () => clearInterval(interval);
  }, [showQr, fetchQr, checkStatus]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          Conexão WhatsApp
        </CardTitle>
      </CardHeader>
      <CardContent>
        {status === 'loading' && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Verificando conexão...
          </div>
        )}
        {status === 'connected' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-emerald-500" />
              <span className="font-medium">WhatsApp Conectado ✅</span>
            </div>
            {phone && <p className="text-sm text-muted-foreground">Número: {phone}</p>}
            <Button variant="destructive" size="sm" onClick={async () => {
              await supabase.functions.invoke('whatsapp-send', { body: { action: 'disconnect' } });
              setStatus('disconnected');
            }}>
              <WifiOff className="h-4 w-4 mr-2" /> Desconectar
            </Button>
          </div>
        )}
        {status === 'disconnected' && !showQr && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <WifiOff className="h-5 w-5" />
              <span>WhatsApp Desconectado</span>
            </div>
            <Button onClick={() => setShowQr(true)}>
              <QrCode className="h-4 w-4 mr-2" /> Conectar WhatsApp
            </Button>
          </div>
        )}
        {status === 'disconnected' && showQr && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Abra o WhatsApp → Dispositivos Conectados → Conectar dispositivo
            </p>
            <div className="flex justify-center">
              {qrBase64 ? (
                <div className="bg-white p-4 rounded-lg">
                  <img src={qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`}
                    alt="QR Code" className="w-[280px] h-[280px]" />
                </div>
              ) : (
                <div className="w-[280px] h-[280px] flex items-center justify-center bg-muted/30 rounded-lg">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={fetchQr}>
                <RefreshCw className="h-4 w-4 mr-2" /> Atualizar QR
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setShowQr(false); setQrBase64(null); }}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
