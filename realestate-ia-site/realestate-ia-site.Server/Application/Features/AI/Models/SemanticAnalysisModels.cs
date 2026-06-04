namespace realestate_ia_site.Server.Application.Features.AI.Models;

public class UserIntentAnalysis
{
    public string Motivation { get; set; } = "desconhecida";
    public string TimeUrgency { get; set; } = "explorar";
    public List<string> Priorities { get; set; } = new();
    public string Flexibility { get; set; } = "alguma_flexibilidade";
    public string LifestylePreference { get; set; } = "nao identificado";
    public List<string> Concerns { get; set; } = new();
    public string DecisionPhase { get; set; } = "pesquisa_inicial";
    public List<string> HiddenNeeds { get; set; } = new();
}

public class PropertyComparisonRequest
{
    public string UserNeeds { get; set; } = string.Empty;
    public PropertyComparisonData PropertyA { get; set; } = new();
    public PropertyComparisonData PropertyB { get; set; } = new();
}

public class PropertyComparisonData
{
    public string Type { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public decimal Area { get; set; }
    public int Bedrooms { get; set; }
    public string Description { get; set; } = string.Empty;
}
