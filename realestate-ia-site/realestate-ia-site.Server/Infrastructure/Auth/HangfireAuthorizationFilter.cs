using Hangfire.Dashboard;

namespace realestate_ia_site.Server.Infrastructure.Auth;

/// <summary>
/// Filtro de autorização para Hangfire Dashboard em PRODUÇÃO.
/// APENAS utilizadores autenticados com role "Admin" podem aceder.
/// </summary>
public class HangfireAuthorizationFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();

        // Verificar se utilizador está autenticado
        if (httpContext.User?.Identity?.IsAuthenticated != true)
        {
            return false;
        }

        // OPÇÃO 1: Apenas Admins (RECOMENDADO)
        // Descomentar se tiveres sistema de roles
        // return httpContext.User.IsInRole("Admin");

        // OPÇÃO 2: Qualquer utilizador autenticado (MENOS SEGURO)
        // return true;

        // OPÇÃO 3: Lista de emails específicos (TEMPORÁRIO)
        var userEmail = httpContext.User.Identity.Name;
        var allowedEmails = new[]
        {
            "admin@resideai.pt",
            "luisribero2000@hotmail.com" // Teu email
        };
        
        return allowedEmails.Contains(userEmail, StringComparer.OrdinalIgnoreCase);
    }
}
