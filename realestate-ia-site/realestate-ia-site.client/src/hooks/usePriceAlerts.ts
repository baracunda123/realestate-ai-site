import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
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
 */
export function usePriceAlerts(): UsePriceAlertsReturn {
    const [alerts, setAlerts] = useState<PropertyAlert[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Carregar alertas iniciais
    const loadAlerts = useCallback(async () => {
        try {
            setIsLoading(true);
            const response = await getUserAlerts();
            setAlerts(response.alerts || []);
        } catch (error) {
            console.error('Erro ao carregar alertas:', error);
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
        } catch (error) {
            console.error('Erro ao criar alerta:', error);
            toast.error('Erro ao criar alerta de preço');
        }
    }, [hasAlertForPropertyId]);

    // Remover alerta por propriedade
    const removeAlertForProperty = useCallback(async (propertyId: string) => {
        try {
            await deleteAlertByProperty(propertyId);
            setAlerts(prev => prev.filter(alert => alert.propertyId !== propertyId));
        } catch (error) {
            console.error('Erro ao remover alerta:', error);
            toast.error('Erro ao remover alerta');
        }
    }, []);

    // Remover alerta por ID
    const removeAlert = useCallback(async (alertId: string) => {
        try {
            await deleteAlert(alertId);
            setAlerts(prev => prev.filter(alert => alert.id !== alertId));
            // Toast removido - será mostrado apenas nos handlers wrapper
        } catch (error) {
            console.error('Erro ao remover alerta:', error);
            toast.error('Erro ao remover alerta');
        }
    }, []);

    // Atualizar threshold do alerta
    const updateAlertThreshold = useCallback(async (alertId: string, threshold: number) => {
        try {
            const updatedAlert = await updateAlert(alertId, { alertThresholdPercentage: threshold });
            setAlerts(prev => prev.map(alert => alert.id === alertId ? updatedAlert : alert));
            // Toast removido - será mostrado apenas nos handlers wrapper
        } catch (error) {
            console.error('Erro ao atualizar alerta:', error);
            toast.error('Erro ao atualizar alerta');
        }
    }, []);

    // Verificar no servidor se existe alerta para uma propriedade
    const checkAlertForProperty = useCallback(async (propertyId: string): Promise<boolean> => {
        try {
            return await hasAlertForProperty(propertyId);
        } catch (error) {
            console.error('Erro ao verificar alerta:', error);
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
 */
export function usePriceAlertStatus(propertyId: string): {
    hasAlert: boolean;
    isLoading: boolean;
} {
    const [hasAlert, setHasAlert] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const checkAlert = async () => {
            try {
                setIsLoading(true);
                const exists = await hasAlertForProperty(propertyId);
                if (mounted) {
                    setHasAlert(exists);
                }
            } catch (error) {
                console.error('Erro ao verificar alerta:', error);
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