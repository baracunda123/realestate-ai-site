namespace realestate_ia_site.Server.Infrastructure.Configurations
{
    // Renomeado de StripeConfiguration para StripeOptions para evitar conflito com Stripe.StripeConfiguration (classe estática do SDK)
    public class StripeOptions
    {
        private readonly ILogger<StripeOptions> _logger;
        public string PublishableKey { get; }
        public string SecretKey { get; }
        public string WebhookSecret { get; }
        public string SuccessUrl { get; }
        public string CancelUrl { get; }

        public StripeOptions(IConfiguration config, ILogger<StripeOptions> logger)
        {
            _logger = logger;
            SecretKey = config["Stripe:SecretKey"] ?? throw new InvalidOperationException("Stripe Secret Key não configurada");
            PublishableKey = config["Stripe:PublishableKey"] ?? throw new InvalidOperationException("Stripe Publishable Key não configurada");
            WebhookSecret = config["Stripe:WebhookSecret"] ?? throw new InvalidOperationException("Stripe Webhook Secret não configurada");
            SuccessUrl = config["Stripe:SuccessUrl"] ?? throw new InvalidOperationException("Stripe Success URL não configurada");
            CancelUrl = config["Stripe:CancelUrl"] ?? throw new InvalidOperationException("Stripe Cancel URL não configurada");
            Stripe.StripeConfiguration.ApiKey = SecretKey;
            _logger.LogInformation("Stripe configurado com sucesso");
        }
    }
}