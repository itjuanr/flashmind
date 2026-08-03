import { useEffect, useRef } from 'react';
import api from '../services/api';

const KEEP_ALIVE_INTERVAL = 5 * 60 * 1000; // 5 minutos em milissegundos

export function useKeepAlive() {
  const intervalRef = useRef(null);

  useEffect(() => {
    const sendKeepAlive = async () => {
      try {
        // Faz uma requisição leve para o backend
        await api.get('/health');
        // console.log('Backend keep-alive sent.'); // Descomente para depurar
      } catch (error) {
        // console.error('Failed to send keep-alive to backend:', error); // Descomente para depurar
      }
    };

    // Envia a requisição imediatamente ao montar
    sendKeepAlive();

    // Configura o intervalo para enviar requisições periodicamente
    intervalRef.current = setInterval(sendKeepAlive, KEEP_ALIVE_INTERVAL);

    // Limpa o intervalo ao desmontar o componente
    return () => clearInterval(intervalRef.current);
  }, []); // O array vazio garante que o efeito rode apenas uma vez
}