import { LegalPageLayout } from '../components/LegalPageLayout';
import { Shield, Database, Lock, Globe, Trash2, Eye, UserCheck } from 'lucide-react';

export function PrivacyPolicyPage() {
  return (
    <LegalPageLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-burnt-peach" />
            <h1 className="text-4xl font-bold text-title">Política de Privacidade</h1>
          </div>
          <p className="text-muted-foreground">
            Última atualização: 14 de novembro de 2025
          </p>
          <p className="text-foreground leading-relaxed">
            A sua privacidade é importante para nós. Esta política explica como o ResideAI 
            recolhe, utiliza e protege os seus dados pessoais.
          </p>
        </div>

        {/* Responsável */}
        <section className="space-y-4">
          <div className="flex items-center space-x-2">
            <UserCheck className="h-6 w-6 text-burnt-peach" />
            <h2 className="text-2xl font-semibold text-title">1. Responsável pelos Dados</h2>
          </div>
          <div className="bg-pale-clay/30 border border-pale-clay-deep rounded-lg p-6 space-y-2">
            <p className="text-foreground"><strong>Nome:</strong> ResideAI</p>
            <p className="text-foreground"><strong>Email:</strong> support@resideai.pt</p>
            <p className="text-muted-foreground text-sm mt-4">
              Para questões sobre os seus dados pessoais, contacte-nos através do email acima.
            </p>
          </div>
        </section>

        {/* Dados Recolhidos */}
        <section className="space-y-4">
          <div className="flex items-center space-x-2">
            <Database className="h-6 w-6 text-burnt-peach" />
            <h2 className="text-2xl font-semibold text-title">2. Dados que Recolhemos</h2>
          </div>
          <div className="space-y-4">
            <div className="border-l-4 border-burnt-peach pl-4 space-y-2">
              <h3 className="font-semibold text-foreground">2.1 Dados de Conta</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Nome completo</li>
                <li>Email</li>
                <li>Número de telefone (opcional)</li>
                <li>Password (encriptada)</li>
                <li>Foto de perfil (opcional)</li>
              </ul>
            </div>

            <div className="border-l-4 border-burnt-peach pl-4 space-y-2">
              <h3 className="font-semibold text-foreground">2.2 Dados de Utilização</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Histórico de pesquisas de imóveis</li>
                <li>Propriedades visualizadas e favoritadas</li>
                <li>Conversas com o assistente de IA (mensagens e sessões)</li>
                <li>Preferências e filtros de pesquisa</li>
                <li>Sessões de login (IP, user agent, dispositivo, data/hora)</li>
                <li>Histórico de visualizações de propriedades</li>
              </ul>
            </div>

            <div className="border-l-4 border-burnt-peach pl-4 space-y-2">
              <h3 className="font-semibold text-foreground">2.3 Dados de Subscrição</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Tipo de plano (Gratuito ou Premium)</li>
                <li>Estado da subscrição (ativa, cancelada, expirada)</li>
                <li>Histórico de pagamentos (processado por Stripe)</li>
                <li>ID de cliente Stripe</li>
                <li><strong>Nota:</strong> Não armazenamos dados de cartão de crédito</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Como Usamos */}
        <section className="space-y-4">
          <div className="flex items-center space-x-2">
            <Eye className="h-6 w-6 text-burnt-peach" />
            <h2 className="text-2xl font-semibold text-title">3. Como Utilizamos os Seus Dados</h2>
          </div>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 pl-4">
            <li><strong>Fornecer o serviço:</strong> Pesquisa de imóveis, recomendações personalizadas</li>
            <li><strong>Assistente de IA:</strong> Análise de preferências e sugestões inteligentes</li>
            <li><strong>Melhorar a experiência:</strong> Otimizar resultados com base no seu comportamento</li>
            <li><strong>Gestão de favoritos:</strong> Guardar e organizar propriedades de interesse</li>
            <li><strong>Segurança:</strong> Detetar e prevenir fraudes, abusos e acessos não autorizados</li>
            <li><strong>Subscrições:</strong> Gerir planos e processar pagamentos Premium</li>
          </ul>
        </section>

        {/* Partilha com Terceiros */}
        <section className="space-y-4">
          <div className="flex items-center space-x-2">
            <Globe className="h-6 w-6 text-burnt-peach" />
            <h2 className="text-2xl font-semibold text-title">4. Partilha com Terceiros</h2>
          </div>
          <div className="space-y-4">
            <div className="bg-burnt-peach/10 border border-burnt-peach/20 rounded-lg p-4">
              <p className="text-foreground font-medium mb-2">
                Nunca vendemos os seus dados pessoais.
              </p>
              <p className="text-muted-foreground text-sm">
                Partilhamos dados apenas com serviços essenciais para o funcionamento da plataforma:
              </p>
            </div>

            <div className="space-y-3">
              <div className="border-l-4 border-burnt-peach pl-4">
                <h3 className="font-semibold text-foreground">OpenAI (Assistente de IA)</h3>
                <p className="text-muted-foreground text-sm">
                  As suas pesquisas e conversas são enviadas para a OpenAI para análise e geração de respostas. 
                  A OpenAI não utiliza estes dados para treinar modelos.
                </p>
                <a 
                  href="https://openai.com/privacy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-burnt-peach text-sm hover:underline"
                >
                  Ver Política de Privacidade da OpenAI →
                </a>
              </div>

              <div className="border-l-4 border-burnt-peach pl-4">
                <h3 className="font-semibold text-foreground">Stripe (Pagamentos)</h3>
                <p className="text-muted-foreground text-sm">
                  Informações de pagamento são processadas pelo Stripe. Não armazenamos dados de cartão.
                </p>
                <a 
                  href="https://stripe.com/privacy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-burnt-peach text-sm hover:underline"
                >
                  Ver Política de Privacidade do Stripe →
                </a>
              </div>

              <div className="border-l-4 border-burnt-peach pl-4">
                <h3 className="font-semibold text-foreground">Google OAuth (Login)</h3>
                <p className="text-muted-foreground text-sm">
                  Se fizer login com Google, recebemos apenas: nome, email e foto de perfil.
                </p>
                <a 
                  href="https://policies.google.com/privacy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-burnt-peach text-sm hover:underline"
                >
                  Ver Política de Privacidade do Google →
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Cookies */}
        <section className="space-y-4">
          <div className="flex items-center space-x-2">
            <Lock className="h-6 w-6 text-burnt-peach" />
            <h2 className="text-2xl font-semibold text-title">5. Cookies</h2>
          </div>
          <div className="space-y-3">
            <p className="text-muted-foreground">
              Utilizamos cookies para melhorar a sua experiência:
            </p>
            <div className="space-y-2">
              <div className="bg-pale-clay/20 rounded-lg p-3">
                <p className="font-medium text-foreground">Cookies Essenciais</p>
                <p className="text-sm text-muted-foreground">
                  Necessários para autenticação e funcionamento básico do site. Não podem ser desativados.
                </p>
              </div>
              <div className="bg-pale-clay/20 rounded-lg p-3">
                <p className="font-medium text-foreground">Cookies de Preferências</p>
                <p className="text-sm text-muted-foreground">
                  Guardam as suas preferências de pesquisa e configurações.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Direitos */}
        <section className="space-y-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-burnt-peach" />
            <h2 className="text-2xl font-semibold text-title">6. Os Seus Direitos (RGPD)</h2>
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground mb-3">
              Tem direito a:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 pl-4">
              <li><strong>Acesso:</strong> Ver que dados temos sobre si</li>
              <li><strong>Retificação:</strong> Corrigir dados incorretos</li>
              <li><strong>Eliminação:</strong> Apagar a sua conta e todos os dados (disponível nas Configurações)</li>
              <li><strong>Portabilidade:</strong> Exportar os seus dados</li>
              <li><strong>Oposição:</strong> Opor-se ao processamento dos seus dados</li>
              <li><strong>Limitação:</strong> Limitar como utilizamos os seus dados</li>
            </ul>
            <div className="bg-burnt-peach/10 border border-burnt-peach/20 rounded-lg p-4 mt-4">
              <p className="text-foreground text-sm">
                Para exercer qualquer destes direitos, contacta-nos em: <strong>support@resideai.pt</strong>
              </p>
            </div>
          </div>
        </section>

        {/* Retenção */}
        <section className="space-y-4">
          <div className="flex items-center space-x-2">
            <Trash2 className="h-6 w-6 text-burnt-peach" />
            <h2 className="text-2xl font-semibold text-title">7. Retenção de Dados</h2>
          </div>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 pl-4">
            <li><strong>Dados de conta:</strong> Mantidos enquanto a conta estiver ativa</li>
            <li><strong>Histórico de pesquisas:</strong> Mantido para melhorar recomendações</li>
            <li><strong>Dados de pagamento:</strong> Mantidos conforme requisitos legais (7 anos)</li>
            <li><strong>Após eliminação:</strong> Todos os dados são permanentemente removidos em 30 dias</li>
          </ul>
        </section>

        {/* Segurança */}
        <section className="space-y-4">
          <div className="flex items-center space-x-2">
            <Lock className="h-6 w-6 text-burnt-peach" />
            <h2 className="text-2xl font-semibold text-title">8. Segurança</h2>
          </div>
          <p className="text-muted-foreground">
            Implementamos medidas de segurança para proteger os seus dados:
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-2 pl-4">
            <li>Passwords encriptadas com bcrypt</li>
            <li>Comunicação HTTPS encriptada</li>
            <li>Tokens de autenticação seguros (JWT)</li>
            <li>Proteção contra tentativas de login maliciosas</li>
            <li>Auditoria de atividades suspeitas</li>
          </ul>
        </section>

        {/* Alterações */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-title">9. Alterações a Esta Política</h2>
          <p className="text-muted-foreground">
            Podemos atualizar esta política ocasionalmente. Notificaremos de alterações significativas 
            através de um aviso no site.
          </p>
        </section>

        {/* Contacto */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-title">10. Contacto</h2>
          <div className="bg-pale-clay/30 border border-pale-clay-deep rounded-lg p-6">
            <p className="text-foreground mb-2">
              Tem questões sobre esta política ou sobre como tratamos os seus dados?
            </p>
            <p className="text-foreground">
              <strong>Email:</strong> <a href="mailto:support@resideai.pt" className="text-burnt-peach hover:underline">support@resideai.pt</a>
            </p>
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-pale-clay-deep pt-6 text-center text-sm text-muted-foreground">
          <p>ResideAI - Encontra o teu lar ideal com inteligência artificial</p>
        </div>
      </div>
    </LegalPageLayout>
  );
}
