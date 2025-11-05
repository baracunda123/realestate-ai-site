import apiClient from "./client";
import { logger } from "../utils/logger";

export interface ChatSessionDto {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  messageCount: number;
  lastMessage?: ChatMessageDto;
}

export interface ChatMessageDto {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface ChatSessionWithMessagesDto {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  messages: ChatMessageDto[];
}

export interface CreateChatSessionDto {
  title?: string;
}

export interface UpdateChatSessionDto {
  title?: string;
  isActive?: boolean;
}

/**
 * Obter todas as sessões de chat do utilizador
 */
export async function getChatSessions(): Promise<ChatSessionDto[]> {
  try {
    logger.info('Obtendo sessões de chat', 'CHAT_SESSIONS');
    const sessions = await apiClient.get<ChatSessionDto[]>('/api/ChatSessions');
    logger.info(`${sessions.length} sessões encontradas`, 'CHAT_SESSIONS');
    return sessions;
  } catch (error) {
    logger.error('Erro ao obter sessões de chat', 'CHAT_SESSIONS', error as Error);
    throw error;
  }
}

/**
 * Obter sessão específica com todas as mensagens
 */
export async function getChatSession(sessionId: string): Promise<ChatSessionWithMessagesDto> {
  try {
    logger.info(`Obtendo sessão ${sessionId}`, 'CHAT_SESSIONS');
    const session = await apiClient.get<ChatSessionWithMessagesDto>(`/api/ChatSessions/${sessionId}`);
    logger.info(`Sessão ${sessionId} obtida com ${session.messages.length} mensagens`, 'CHAT_SESSIONS');
    return session;
  } catch (error) {
    logger.error(`Erro ao obter sessão ${sessionId}`, 'CHAT_SESSIONS', error as Error);
    throw error;
  }
}

/**
 * Criar nova sessão de chat
 */
export async function createChatSession(title?: string): Promise<ChatSessionDto> {
  try {
    logger.info('Criando nova sessão de chat', 'CHAT_SESSIONS');
    const session = await apiClient.post<ChatSessionDto>('/api/ChatSessions', { title });
    logger.info(`Sessão ${session.id} criada`, 'CHAT_SESSIONS');
    return session;
  } catch (error) {
    logger.error('Erro ao criar sessão de chat', 'CHAT_SESSIONS', error as Error);
    throw error;
  }
}

/**
 * Atualizar sessão (título, estado)
 */
export async function updateChatSession(
  sessionId: string,
  updates: UpdateChatSessionDto
): Promise<ChatSessionDto> {
  try {
    logger.info(`Atualizando sessão ${sessionId}`, 'CHAT_SESSIONS');
    const session = await apiClient.patch<ChatSessionDto>(`/api/ChatSessions/${sessionId}`, updates);
    logger.info(`Sessão ${sessionId} atualizada`, 'CHAT_SESSIONS');
    return session;
  } catch (error) {
    logger.error(`Erro ao atualizar sessão ${sessionId}`, 'CHAT_SESSIONS', error as Error);
    throw error;
  }
}

/**
 * Eliminar sessão
 */
export async function deleteChatSession(sessionId: string): Promise<void> {
  try {
    logger.info(`Eliminando sessão ${sessionId}`, 'CHAT_SESSIONS');
    await apiClient.delete(`/api/ChatSessions/${sessionId}`);
    logger.info(`Sessão ${sessionId} eliminada`, 'CHAT_SESSIONS');
  } catch (error) {
    logger.error(`Erro ao eliminar sessão ${sessionId}`, 'CHAT_SESSIONS', error as Error);
    throw error;
  }
}

/**
 * Obter ou criar sessão ativa
 */
export async function getOrCreateActiveSession(): Promise<ChatSessionDto> {
  try {
    logger.info('Obtendo ou criando sessão ativa', 'CHAT_SESSIONS');
    const session = await apiClient.get<ChatSessionDto>('/api/ChatSessions/active');
    logger.info(`Sessão ativa: ${session.id}`, 'CHAT_SESSIONS');
    return session;
  } catch (error) {
    logger.error('Erro ao obter/criar sessão ativa', 'CHAT_SESSIONS', error as Error);
    throw error;
  }
}

logger.info('Chat Sessions Service carregado', 'CHAT_SESSIONS');
