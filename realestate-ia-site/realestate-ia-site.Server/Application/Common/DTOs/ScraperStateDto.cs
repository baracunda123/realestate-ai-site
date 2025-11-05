namespace realestate_ia_site.Server.Application.Common.DTOs;

public class ScraperStateDto
{
    public string Site { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public int CurrentPage { get; set; }
}
