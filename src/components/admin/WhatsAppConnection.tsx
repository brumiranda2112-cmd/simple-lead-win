import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { evolutionApi, isEvolutionApiFailure } from '@/lib/evolutionProxy';
import { Loader2, Wifi, WifiOff, QrCode, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function WhatsAppConnection() {
  const [status, setStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');
  const [phone, setPhone] = useState('');
  const [qrBase64, setQrBase64] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const retryRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [profileName, setProfileName] = useState('');
  const webhookRegisteredRef = useRef(false);

  const registerWebhook = useCallback(async () => {
    if (webhookRegisteredRef.current) return;
    webhookRegisteredRef.current = true;

    const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-webhook`;
    const result = await evolutionApi('webhook/set/crm-whatsapp', 'POST', {
      webhook: {
        url: webhookUrl,
        enabled: true,
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
        webhookByEvents: false,
        webhookBase64: false,
      }
    }, { throwOnError: false });

    if (isEvolutionApiFailure(result)) {
      console.warn('Webhook registration failed:', result.error);
      webhookRegisteredRef.current = false;
    } else {
      console.log('Webhook registered successfully');
      toast.success('Webhook configurado automaticamente!');
    }
  }, []);

  const checkStatus = useCallback(async () => {
    const instances = await evolutionApi('instance/fetchInstances', 'GET', undefined, { throwOnError: false });

    if (isEvolutionApiFailure(instances)) {
      setStatus('disconnected');
      return false;
    }

    if (Array.isArray(instances) && instances.length > 0) {
      const inst = instances.find((i: any) => i.instance?.instanceName === 'crm-whatsapp') || instances[0];
      const instStatus = inst?.instance?.status || inst?.instance?.connectionStatus || inst?.instance?.state;
      if (instStatus === 'open') {
        const owner = inst?.instance?.owner || inst?.instance?.ownerJid || '';
        setPhone(owner.replace('@s.whatsapp.net', ''));
        setProfileName(inst?.instance?.profileName || '');
        setStatus((prev) => {
          if (prev !== 'connected') registerWebhook();
          return 'connected';
        });
        setShowQr(false);
        setQrBase64(null);
        return true;
      }
    }

    setStatus('disconnected');
    return false;
  }, [registerWebhook]);

  useEffect(() => { checkStatus(); }, [checkStatus]);

  const ensureInstance = useCallback(async () => {
    const instances = await evolutionApi('instance/fetchInstances', 'GET', undefined, { throwOnError: false });
    if (isEvolutionApiFailure(instances)) return false;

    if (Array.isArray(instances) && instances.some((i: any) => i.instance?.instanceName === 'crm-whatsapp')) {
      return true;
    }

    const created = await evolutionApi('instance/create', 'POST', {
      instanceName: 'crm-whatsapp',
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true,
    }, { throwOnError: false });

    return !isEvolutionApiFailure(created);
  }, []);

  const fetchQr = useCallback(async () => {
    setFetching(true);
    retryRef.current = 0;

    const canProceed = await ensureInstance();
    if (!canProceed) {
      setFetching(false);
      return;
    }

    const attempt = async (): Promise<void> => {
      const data = await evolutionApi('instance/connect/crm-whatsapp', 'GET', undefined, { throwOnError: false });

      if (isEvolutionApiFailure(data)) {
        setFetching(false);
        return;
      }

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
    };

    await attempt();
  }, [ensureInstance]);

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
    const result = await evolutionApi('instance/logout/crm-whatsapp', 'DELETE', undefined, { throwOnError: false });
    if (isEvolutionApiFailure(result)) {
      toast.error(result.error || 'Falha ao desconectar');
      return;
    }
    webhookRegisteredRef.current = false;
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
            {profileName && <p className="text-sm font-medium">{profileName}</p>}
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
                  className="bg-white p-4 rounded-lg"
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
