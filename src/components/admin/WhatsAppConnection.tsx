import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { evolutionApi } from '@/lib/evolutionProxy';
import { Loader2, Wifi, WifiOff, QrCode, RefreshCw } from 'lucide-react';

export default function WhatsAppConnection() {
  const [status, setStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');
  const [phone, setPhone] = useState('');
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const retryRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const checkStatus = useCallback(async () => {
    try {
      const instances = await evolutionApi('instance/fetchInstances');
      if (Array.isArray(instances) && instances.length > 0) {
        const inst = instances.find((i: any) => i.instance?.instanceName === 'crm-whatsapp') || instances[0];
        const connStatus = inst?.instance?.connectionStatus || inst?.instance?.state || '';
        if (connStatus === 'open') {
          const p = inst?.instance?.ownerJid || inst?.instance?.owner || '';
          setPhone(p.replace('@s.whatsapp.net', ''));
          setStatus('connected');
          setShowQr(false);
          setQrBase64(null);
          return true;
        }
      }
      setStatus('disconnected');
      return false;
    } catch {
      setStatus('disconnected');
      return false;
    }
  }, []);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  const fetchQr = useCallback(async () => {
    setFetching(true);
    retryRef.current = 0;

    const attempt = async (): Promise<void> => {
      try {
        const data = await evolutionApi('instance/connect/crm-whatsapp');
        const qr = data?.base64 || data?.qrcode?.base64 || data?.qr || data?.code || null;
        if (qr) {
          setQrBase64(qr);
          setFetching(false);
          return;
        }
        retryRef.current++;
        if (retryRef.current < 10) {
          retryTimerRef.current = setTimeout(attempt, 3000);
        } else {
          setFetching(false);
        }
      } catch {
        setFetching(false);
      }
    };

    await attempt();
  }, []);

  useEffect(() => {
    if (!showQr) return;
    const interval = setInterval(async () => {
      const connected = await checkStatus();
      if (!connected && !fetching && qrBase64) {
        fetchQr();
      }
    }, 20000);
    return () => clearInterval(interval);
  }, [showQr, checkStatus, fetchQr, fetching, qrBase64]);

  useEffect(() => {
    return () => { if (retryTimerRef.current) clearTimeout(retryTimerRef.current); };
  }, []);

  const handleConnect = () => {
    setShowQr(true);
    setQrBase64(null);
    fetchQr();
  };

  const handleDisconnect = async () => {
    await evolutionApi('instance/logout/crm-whatsapp', 'DELETE');
    setStatus('disconnected');
    setPhone('');
  };

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
            {phone && <p className="text-sm text-muted-foreground">Número: +{phone}</p>}
            <Button variant="destructive" size="sm" onClick={handleDisconnect}>
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
            <Button onClick={handleConnect}>
              <QrCode className="h-4 w-4 mr-2" /> Gerar QR Code
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
                <img
                  src={qrBase64.startsWith('data:') ? qrBase64 : `data:image/png;base64,${qrBase64}`}
                  alt="QR Code"
                  width={280}
                  height={280}
                  style={{ background: 'white', padding: '16px', borderRadius: '8px' }}
                />
              ) : (
                <div className="w-[280px] h-[280px] flex flex-col items-center justify-center bg-muted/30 rounded-lg gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {fetching ? `Tentativa ${retryRef.current + 1}/10...` : 'QR não disponível'}
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" size="sm" onClick={fetchQr} disabled={fetching}>
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
