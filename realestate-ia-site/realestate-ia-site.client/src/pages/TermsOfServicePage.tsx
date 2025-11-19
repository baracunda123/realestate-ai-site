import { LegalPageLayout } from '../components/LegalPageLayout';
import { FileText, AlertCircle, CreditCard, Shield, Ban, Scale } from 'lucide-react';

export function TermsOfServicePage() {
  return (
    <LegalPageLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-accent" />
            <h1 className="text-4xl font-bold text-title">Termos e Condições</h1>
          </div>
          <p className="text-foreground-foreground">
            Última atualização: 14 de novembro de 2025
          </p>
          <p className="text-foreground leading-relaxed">
            Ao utilizar o ResideAI, concorda com estes termos. Por favor, leia-os atentamente.
          </p>
        </div>

        {/* Aceitação */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-title">1. Aceitação dos Termos</h2>
          <p className="text-foreground-foreground">
            Ao criar uma conta ou utilizar o ResideAI, concorda em cumprir estes Termos e Condições 
            e a nossa Política de Privacidade. Se não concordar, não utilize o serviço.
          </p>
        </section>

        {/* Descrição do Serviço */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-title">2. Descrição do Serviço</h2>
          <p className="text-foreground-foreground mb-3">
            O ResideAI é uma plataforma de pesquisa de imóveis que utiliza inteligência artificial para:
          </p>
          <ul className="list-disc list-inside text-foreground-foreground space-y-2 pl-4">
            <li>Pesquisa inteligente de propriedades</li>
            <li>Assistente de IA para ajudar na procura do imóvel ideal</li>
            <li>Recomendações personalizadas com base nas suas preferências</li>
            <li>Gestão de favoritos e histórico de pesquisas</li>
            <li>Alertas de baixa de preço</li>
          </ul>
          <div className="bg-cardd/30 border border-border-deep rounded-lg p-6 mt-4">
            <p className="text-foreground">
              <strong>Importante:</strong> O ResideAI é uma plataforma de pesquisa de imóveis. 
              As informações dos imóveis são fornecidas por fontes externas. 
              Recomendamos sempre confirmar os detalhes diretamente com os anunciantes.
            </p>
          </div>
        </section>

        {/* Conta de Utilizador */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-title">3. Conta de Utilizador</h2>
          <div className="space-y-3">
            <div className="border-l-4 border-accent pl-4">
              <h3 className="font-semibold text-foreground mb-2">3.1 Criação de Conta</h3>
              <ul className="list-disc list-inside text-foreground-foreground space-y-1">
                <li>Deve ter pelo menos 18 anos</li>
                <li>Deve fornecer informações verdadeiras e atualizadas</li>
                <li>É responsável por manter a sua password segura</li>
                <li>Não pode partilhar a sua conta com outras pessoas</li>
              </ul>
            </div>

            <div className="border-l-4 border-accent pl-4">
              <h3 className="font-semibold text-foreground mb-2">3.2 Responsabilidade</h3>
              <p className="text-foreground-foreground">
                É responsável por todas as atividades realizadas na sua conta. Se suspeitar de 
                acesso não autorizado, contacte-nos imediatamente em support@resideai.pt
              </p>
            </div>
          </div>
        </section>

        {/* Planos e Pagamentos */}
        <section className="space-y-4">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-6 w-6 text-accent" />
            <h2 className="text-2xl font-semibold text-title">4. Planos e Pagamentos</h2>
          </div>
          <div className="space-y-4">
            <div className="border-l-4 border-accent pl-4">
              <h3 className="font-semibold text-foreground mb-2">4.1 Plano Gratuito</h3>
              <ul className="list-disc list-inside text-foreground-foreground space-y-1">
                <li>50 mensagens de chat IA por mês</li>
                <li>Pesquisa de propriedades</li>
                <li>Favoritos ilimitados</li>
                <li>Alertas de baixa de preço</li>
                <li>Notificações no site</li>
                <li>Histórico de pesquisas</li>
                <li>Recomendações personalizadas</li>
              </ul>
            </div>

            <div className="border-l-4 border-accent pl-4">
              <h3 className="font-semibold text-foreground mb-2">4.2 Plano Premium</h3>
              <ul className="list-disc list-inside text-foreground-foreground space-y-1">
                <li>Subscrição mensal de €8.00/mês</li>
                <li>Chat IA ilimitado</li>
                <li>Respostas mais precisas e detalhadas</li>
                <li>Pesquisa de propriedades</li>
                <li>Favoritos ilimitados</li>
                <li>Alertas de baixa de preço</li>
                <li>Notificações no site</li>
                <li>Histórico de pesquisas</li>
                <li>Recomendações personalizadas</li>
              </ul>
            </div>

            <div className="border-l-4 border-accent pl-4">
              <h3 className="font-semibold text-foreground mb-2">4.3 Pagamentos</h3>
              <ul className="list-disc list-inside text-foreground-foreground space-y-1">
                <li>Pagamentos processados pelo Stripe</li>
                <li>Renovação automática mensal</li>
                <li>Pode cancelar a qualquer momento</li>
                <li>Sem reembolsos para períodos já pagos</li>
              </ul>
            </div>

            <div className="border-l-4 border-accent pl-4">
              <h3 className="font-semibold text-foreground mb-2">4.4 Cancelamento</h3>
              <p className="text-foreground-foreground">
                Pode cancelar a sua subscrição Premium a qualquer momento nas Configurações. 
                O acesso Premium mantém-se até ao final do período pago. Não há reembolsos proporcionais.
              </p>
            </div>
          </div>
        </section>

        {/* Uso Aceitável */}
        <section className="space-y-4">
          <div className="flex items-center space-x-2">
            <Ban className="h-6 w-6 text-accent" />
            <h2 className="text-2xl font-semibold text-title">5. Uso Aceitável</h2>
          </div>
          <p className="text-foreground-foreground mb-3">
            Ao utilizar o ResideAI, concorda em NÃO:
          </p>
          <ul className="list-disc list-inside text-foreground-foreground space-y-2 pl-4">
            <li>Utilizar o serviço para fins ilegais ou não autorizados</li>
            <li>Sobrecarregar os nossos servidores com pedidos excessivos</li>
            <li>Tentar aceder a contas de outros utilizadores</li>
            <li>Publicar ou transmitir vírus ou código malicioso</li>
            <li>Utilizar bots ou scripts automatizados sem autorização</li>
            <li>Revender ou redistribuir o acesso ao serviço</li>
            <li>Fazer engenharia reversa da plataforma</li>
          </ul>
          <div className="bg-error-soft border border-error-gentle rounded-lg p-4 mt-4">
            <p className="text-error-strong text-sm">
              <strong>Violações:</strong> Reservamo-nos o direito de suspender ou eliminar contas 
              que violem estes termos, sem aviso prévio ou reembolso.
            </p>
          </div>
        </section>

        {/* Propriedade Intelectual */}
        <section className="space-y-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-accent" />
            <h2 className="text-2xl font-semibold text-title">6. Propriedade Intelectual</h2>
          </div>
          <div className="space-y-3">
            <p className="text-foreground-foreground">
              O ResideAI, incluindo o seu design, código, marca e conteúdo, é propriedade do operador 
              e está protegido por leis de propriedade intelectual.
            </p>
            <div className="border-l-4 border-accent pl-4">
              <h3 className="font-semibold text-foreground mb-2">Conteúdo de Terceiros</h3>
              <p className="text-foreground-foreground">
                Os anúncios de imóveis e imagens são propriedade dos respetivos anunciantes. 
                Agregamos este conteúdo para facilitar a pesquisa, mas não reivindicamos propriedade sobre ele.
              </p>
            </div>
          </div>
        </section>

        {/* Limitação de Responsabilidade */}
        <section className="space-y-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-6 w-6 text-accent" />
            <h2 className="text-2xl font-semibold text-title">7. Limitação de Responsabilidade</h2>
          </div>
          <div className="space-y-3">
            <p className="text-foreground-foreground">
              O ResideAI é fornecido "como está". Não garantimos:
            </p>
            <ul className="list-disc list-inside text-foreground-foreground space-y-2 pl-4">
              <li>Que o serviço estará sempre disponível ou sem erros</li>
              <li>A exatidão ou atualidade dos anúncios de imóveis</li>
              <li>Que os imóveis apresentados estão realmente disponíveis</li>
              <li>A qualidade ou legalidade dos imóveis anunciados</li>
            </ul>
            <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 mt-4">
              <p className="text-foreground text-sm">
                <strong>Importante:</strong> Não somos responsáveis por:
              </p>
              <ul className="list-disc list-inside text-foreground-foreground text-sm space-y-1 mt-2 pl-4">
                <li>Erros ou omissões nos anúncios de terceiros</li>
                <li>Perdas financeiras resultantes de decisões baseadas no nosso serviço</li>
                <li>Problemas com transações entre utilizadores e anunciantes</li>
                <li>Indisponibilidade temporária do serviço</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Modificações */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-title">8. Modificações do Serviço</h2>
          <p className="text-foreground-foreground">
            Reservamo-nos o direito de:
          </p>
          <ul className="list-disc list-inside text-foreground-foreground space-y-2 pl-4">
            <li>Modificar ou descontinuar funcionalidades a qualquer momento</li>
            <li>Alterar os preços dos planos Premium com aviso prévio de 30 dias</li>
            <li>Atualizar estes Termos e Condições (notificar-te-emos de alterações significativas)</li>
          </ul>
        </section>

        {/* Rescisão */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-title">9. Rescisão</h2>
          <div className="space-y-3">
            <div className="border-l-4 border-accent pl-4">
              <h3 className="font-semibold text-foreground mb-2">9.1 Por Si</h3>
              <p className="text-foreground-foreground">
                Pode eliminar a sua conta a qualquer momento nas Configurações. 
                Todos os seus dados serão permanentemente removidos em 30 dias.
              </p>
            </div>
            <div className="border-l-4 border-accent pl-4">
              <h3 className="font-semibold text-foreground mb-2">9.2 Por Nós</h3>
              <p className="text-foreground-foreground">
                Podemos suspender ou eliminar a sua conta se violar estes termos, 
                sem aviso prévio ou reembolso.
              </p>
            </div>
          </div>
        </section>

        {/* Lei Aplicável */}
        <section className="space-y-4">
          <div className="flex items-center space-x-2">
            <Scale className="h-6 w-6 text-accent" />
            <h2 className="text-2xl font-semibold text-title">10. Lei Aplicável</h2>
          </div>
          <p className="text-foreground-foreground">
            Estes termos são regidos pelas leis de Portugal. Qualquer disputa será resolvida 
            nos tribunais portugueses.
          </p>
        </section>

        {/* Contacto */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-title">11. Contacto</h2>
          <div className="bg-cardd/30 border border-border-deep rounded-lg p-6">
            <p className="text-foreground mb-2">
              Tem questões sobre estes termos?
            </p>
            <p className="text-foreground">
              <strong>Email:</strong> <a href="mailto:support@resideai.pt" className="text-accent hover:underline">support@resideai.pt</a>
            </p>
          </div>
        </section>

        {/* Aceitação */}
        <section className="bg-accent/10 border border-accent/20 rounded-lg p-6">
          <h3 className="font-semibold text-foreground mb-2">Aceitação</h3>
          <p className="text-foreground-foreground text-sm">
            Ao utilizar o ResideAI, confirma que leu, compreendeu e concorda em cumprir 
            estes Termos e Condições e a nossa Política de Privacidade.
          </p>
        </section>

        {/* Footer */}
        <div className="border-t border-border-deep pt-6 text-center text-sm text-foreground-foreground">
          <p>ResideAI - Encontra o teu lar ideal com inteligência artificial</p>
        </div>
      </div>
    </LegalPageLayout>
  );
}