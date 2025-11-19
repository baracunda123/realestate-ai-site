import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import UploadService from '../../api/upload.service';
import { getUserInitials } from '../../utils/PersonalArea';
import type { User } from '../../types/PersonalArea';
import { logger } from '../../utils/logger';

interface AvatarUploadProps {
  user: User;
  onAvatarUpdate?: (avatarUrl: string) => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showEditButton?: boolean;
  className?: string;
}

export function AvatarUpload({ 
  user, 
  onAvatarUpdate, 
  size = 'lg',
  showEditButton = true,
  className = '' 
}: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize currentImageUrl from user prop and update when user changes
  useEffect(() => {
    const imageUrl = user.avatarUrl || user.avatar;
    setCurrentImageUrl(imageUrl || null);
    setImageError(false);
  }, [user.avatarUrl, user.avatar]);

  // Determinar tamanho do avatar
  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'w-12 h-12 text-sm';
      case 'md': return 'w-16 h-16 text-base';
      case 'lg': return 'w-20 h-20 text-lg';
      case 'xl': return 'w-32 h-32 text-2xl';
      default: return 'w-20 h-20 text-lg';
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    try {
      setIsUploading(true);

      // Fazer upload
      const result = await UploadService.uploadProfileImage(file);

      if (result.success && result.url) {
        // Update local state immediately for better UX
        setCurrentImageUrl(result.url);
        setImageError(false);
        
        // Atualizar avatar
        if (onAvatarUpdate) {
          onAvatarUpdate(result.url);
        }
        
        toast.success('Imagem de perfil atualizada!', {
          description: 'A sua nova imagem foi carregada com sucesso.',
        });
      } else {
        throw new Error(result.error || 'Erro no upload');
      }

    } catch (error: unknown) {
      logger.error('Erro no upload de avatar', 'AVATAR_UPLOAD', error as Error);
      
      const errorMessage = error instanceof Error ? error.message : 'Falha ao fazer upload da imagem';
      
      toast.error('Erro no upload', {
        description: errorMessage,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // Limpar input para permitir selecionar o mesmo arquivo novamente
    event.target.value = '';
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  // Use local state for image URL with fallback to user prop
  const displayImageUrl = currentImageUrl || user.avatarUrl || user.avatar;
  const initials = getUserInitials(user);

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div className={`relative group ${className}`}>
      {/* Avatar Principal */}
      <div
        className={`
          relative ${getSizeClasses()} rounded-full overflow-hidden
          border-4 border-border bg-muted
          ${isDragOver ? 'border-accent bg-accent/10' : ''}
          ${showEditButton ? 'cursor-pointer' : ''}
          transition-all duration-300 flex items-center justify-center
          font-bold text-muted-foreground
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={showEditButton ? handleCameraClick : undefined}
      >
        {/* Imagem ou Iniciais */}
        {displayImageUrl && !imageError ? (
          <img 
            src={displayImageUrl}
            alt="Avatar"
            className="w-full h-full object-cover rounded-full"
            onError={handleImageError}
          />
        ) : (
          <span 
            className="select-none font-bold flex items-center justify-center w-full h-full"
          >
            {initials}
          </span>
        )}

        {/* Loading Overlay */}
        {isUploading && (
          <div 
            className="absolute inset-0 flex items-center justify-center rounded-full"
          >
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        )}

        {/* Hover Overlay para upload */}
        {showEditButton && !isUploading && (
          <div 
            className="absolute inset-0 flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100 rounded-full"
          >
            <Camera className="w-8 h-8 text-white" />
          </div>
        )}

        {/* Drag Overlay */}
        {isDragOver && (
          <div 
            className="absolute inset-0 flex items-center justify-center border-2 border-dashed border-blue-400 rounded-full"
          >
            <Upload className="w-8 h-8 text-white" />
          </div>
        )}
      </div>

      {/* Botão de Edição */}
      {showEditButton && size !== 'sm' && (
        <button
          type="button"
          className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg flex items-center justify-center transition-all duration-200 disabled:opacity-50"
          onClick={handleCameraClick}
          disabled={isUploading}
        >
          {isUploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Camera className="w-5 h-5" />
          )}
        </button>
      )}

      {/* Input File (oculto) */} 
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />

      {/* Indicador visual quando arrasta ficheiro */}
      {showEditButton && isDragOver && (
        <div 
          className="absolute -inset-4 border-2 border-dashed border-blue-400 rounded-xl flex items-center justify-center"
          style={{
            backgroundColor: 'rgba(59, 130, 246, 0.1)'
          }}
        >
          <div className="text-blue-600 text-sm font-medium text-center">
            <Upload className="w-6 h-6 mx-auto mb-1" />
            Solte a imagem aqui
          </div>
        </div>
      )}
    </div>
  );
}

export default AvatarUpload;