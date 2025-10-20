import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { priceAlerts as logger } from '../utils/logger';
import { authUtils } from '../api/auth.service';
import type { Property } from '../types/property';
import type { PropertyAlert, CreatePriceAlertRequest } from '../types/PersonalArea';
import {
    getUserAlerts,
    createPriceAlert,
    deleteAlert,
    deleteAlertByProperty,
    hasAlertForProperty,
    updateAlert
} from '../api/alerts.service';

interface UsePriceAlertsReturn {
    alerts: PropertyAlert[];
    isLoading: boolean;
    hasAlertForPropertyId: (propertyId: string) => boolean;
    createAlertForProperty: (property: Property, threshold?: number) => Promise<void>;
    removeAlertForProperty: (propertyId: string) => Promise<void>;
    removeAlert: (alertId: string) => Promise<void>;
    updateAlertThreshold: (alertId: string, threshold: number) => Promise<void>;
    checkAlertForProperty: (propertyId: string) => Promise<boolean>;
    refreshAlerts: () => Promise<void>;
}

/**
 * Hook customizado para gestão de alertas de redução de preço
 * ✅ APENAS CARREGA SE USUÁRIO ESTIVER AUTENTICADO
 */
export function usePriceAlerts(): UsePriceAlertsReturn {
    const [alerts, setAlerts] = useState<PropertyAlert[]>([]);
    const [isLoading, setIsLoading] = useState(false); // ✅ Não mostrar loading por padrão

    // Carregar alertas iniciais
    const loadAlerts = useCallback(async () => {
        // ✅ VERIFICAR AUTENTICAÇÃO ANTES DE FAZER CHAMADA
        if (!authUtils.isAuthenticated()) {
            setAlerts([]);
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const response = await getUserAlerts();
            setAlerts(response.alerts || []);
        } catch {
            logger.error('Erro ao carregar alertas');
            setAlerts([]);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Carregar alertas ao montar o componente
    useEffect(() => {
        loadAlerts();
    }, [loadAlerts]);

    // Verificar se existe alerta para uma propriedade (local)
    const hasAlertForPropertyId = useCallback((propertyId: string): boolean => {
        return alerts.some(alert => alert.propertyId === propertyId && alert.isActive);
    }, [alerts]);

    // Criar alerta para uma propriedade
    const createAlertForProperty = useCallback(async (property: Property, threshold: number = 5) => {
        // ✅ VERIFICAR AUTENTICAÇÃO
        if (!authUtils.isAuthenticated()) {
            toast.error('Faça login para criar alertas');
            return;
        }

        try {
            // Verificar se já existe alerta
            if (hasAlertForPropertyId(property.id)) {
                toast.info('Já existe um alerta para esta propriedade');
                return;
            }

            const request: CreatePriceAlertRequest = {
                propertyId: property.id,
                alertThresholdPercentage: threshold
            };

            const newAlert = await createPriceAlert(request);

            setAlerts(prev => [...prev, newAlert]);
        } catch  {
            logger.error('Erro ao criar alerta');
            toast.error('Erro ao criar alerta de preço');
        }
    }, [hasAlertForPropertyId]);

    // Remover alerta por propriedade
    const removeAlertForProperty = useCallback(async (propertyId: string) => {
        // ✅ VERIFICAR AUTENTICAÇÃO
        if (!authUtils.isAuthenticated()) {
            return;
        }

        try {
            await deleteAlertByProperty(propertyId);
            setAlerts(prev => prev.filter(alert => alert.propertyId !== propertyId));
        } catch  {
            logger.error('Erro ao remover alerta');
            toast.error('Erro ao remover alerta');
        }
    }, []);

    // Remover alerta por ID
    const removeAlert = useCallback(async (alertId: string) => {
        // ✅ VERIFICAR AUTENTICAÇÃO
        if (!authUtils.isAuthenticated()) {
            return;
        }

        try {
            await deleteAlert(alertId);
            setAlerts(prev => prev.filter(alert => alert.id !== alertId));
            // Toast removido - será mostrado apenas nos handlers wrapper
        } catch {
            logger.error('Erro ao remover alerta');
            toast.error('Erro ao remover alerta');
        }
    }, []);

    // Atualizar threshold do alerta
    const updateAlertThreshold = useCallback(async (alertId: string, threshold: number) => {
        // ✅ VERIFICAR AUTENTICAÇÃO
        if (!authUtils.isAuthenticated()) {
            return;
        }

        try {
            const updatedAlert = await updateAlert(alertId, { alertThresholdPercentage: threshold });
            setAlerts(prev => prev.map(alert => alert.id === alertId ? updatedAlert : alert));
            // Toast removido - será mostrado apenas nos handlers wrapper
        } catch  {
            logger.error('Erro ao atualizar alerta');
            toast.error('Erro ao atualizar alerta');
        }
    }, []);

    // Verificar no servidor se existe alerta para uma propriedade
    const checkAlertForProperty = useCallback(async (propertyId: string): Promise<boolean> => {
        // ✅ VERIFICAR AUTENTICAÇÃO
        if (!authUtils.isAuthenticated()) {
            return false;
        }

        try {
            return await hasAlertForProperty(propertyId);
        } catch  {
            logger.error('Erro ao verificar alerta');
            return false;
        }
    }, []);

    // Recarregar alertas
    const refreshAlerts = useCallback(async () => {
        await loadAlerts();
    }, [loadAlerts]);

    return {
        alerts,
        isLoading,
        hasAlertForPropertyId,
        createAlertForProperty,
        removeAlertForProperty,
        removeAlert,
        updateAlertThreshold,
        checkAlertForProperty,
        refreshAlerts
    };
}

/**
 * Hook simplificado para verificar alertas sem gestão de estado
 * ✅ APENAS VERIFICA SE USUÁRIO ESTIVER AUTENTICADO
 */
export function usePriceAlertStatus(propertyId: string): {
    hasAlert: boolean;
    isLoading: boolean;
} {
    const [hasAlert, setHasAlert] = useState(false);
    const [isLoading, setIsLoading] = useState(false); // ✅ Não mostrar loading por padrão

    useEffect(() => {
        // ✅ VERIFICAR AUTENTICAÇÃO ANTES DE FAZER CHAMADA
        if (!authUtils.isAuthenticated()) {
            setHasAlert(false);
            setIsLoading(false);
            return;
        }

        let mounted = true;

        const checkAlert = async () => {
            try {
                setIsLoading(true);
                const exists = await hasAlertForProperty(propertyId);
                if (mounted) {
                    setHasAlert(exists);
                }
            } catch  {
                logger.error('Erro ao verificar alerta');
                if (mounted) {
                    setHasAlert(false);
                }
            } finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        };

        checkAlert();

        return () => {
            mounted = false;
        };
    }, [propertyId]);

    return { hasAlert, isLoading };
}