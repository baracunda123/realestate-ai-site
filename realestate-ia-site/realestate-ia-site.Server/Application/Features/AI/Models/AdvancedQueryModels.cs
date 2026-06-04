namespace realestate_ia_site.Server.Application.Features.AI.Models;

public class ComplexQueryInterpretation
{
    public List<string> MandatoryRequirements { get; set; } = new();
    public List<string> Preferences { get; set; } = new();
    public List<string> Dealbreakers { get; set; } = new();
    public List<ContextualCondition> ContextualConditions { get; set; } = new();
    public List<string> PriorityOrder { get; set; } = new();
    public List<TradeOff> AcceptableTradeoffs { get; set; } = new();
    public List<string> Ambiguities { get; set; } = new();
    public List<string> Emotions { get; set; } = new();
    public int InterpretationConfidence { get; set; }
}

public class ContextualCondition
{
    public string Condition { get; set; } = string.Empty;
    public string Then { get; set; } = string.Empty;
}

public class TradeOff
{
    public string Sacrifice { get; set; } = string.Empty;
    public string For { get; set; } = string.Empty;
}

public class IntentChangeDetection
{
    public string ChangeType { get; set; } = "refinamento";
    public List<string> WhatChanged { get; set; } = new();
    public List<string> WhatRemained { get; set; } = new();
    public string LikelyReason { get; set; } = string.Empty;
    public string RecommendedAction { get; set; } = string.Empty;
    public int Confidence { get; set; }
}
