using System.Text.RegularExpressions;
using realestate_ia_site.Server.DTOs;

namespace realestate_ia_site.Server.Infrastructure.AI
{
    public class PropertyResponseParser
    {
        private readonly ILogger<PropertyResponseParser> _logger;
        private static readonly Regex PropertyIdRegex = new(@"PROP\[(\d+)\]", RegexOptions.Compiled | RegexOptions.IgnoreCase);

        public PropertyResponseParser(ILogger<PropertyResponseParser> logger)
        {
            _logger = logger;
        }

        public PropertyParsingResult ParseResponse(
            string aiResponse,
            List<PropertySearchDto> availableProperties,
            bool stripTagsForUser = false)
        {
            var (mentionedProperties, mentionNumbers, invalidNumbers) = ExtractMentionedPropertiesInternal(aiResponse, availableProperties);

            var clean = stripTagsForUser
                ? CleanResponseForUser(aiResponse)
                : aiResponse; // mantém tags por defeito

            return new PropertyParsingResult
            {
                MentionedProperties = mentionedProperties,
                MentionNumbers = mentionNumbers,
                InvalidMentionNumbers = invalidNumbers,
                CleanResponse = clean,
                OriginalResponse = aiResponse
            };
        }

        public List<PropertySearchDto> ExtractMentionedProperties(
            string aiResponse,
            List<PropertySearchDto> availableProperties)
        {
            var (props, _, _) = ExtractMentionedPropertiesInternal(aiResponse, availableProperties);
            return props;
        }

        private (List<PropertySearchDto> properties, List<int> validMentionNumbers, List<int> invalidMentionNumbers)
            ExtractMentionedPropertiesInternal(string aiResponse, List<PropertySearchDto> availableProperties)
        {
            if (string.IsNullOrWhiteSpace(aiResponse) || availableProperties.Count == 0)
            {
                _logger.LogDebug("Resposta vazia ou sem propriedades disponíveis");
                return (new List<PropertySearchDto>(), new List<int>(), new List<int>());
            }

            // Captura na ORDEM DE PRIMEIRA MENÇÃO
            var mentionedSequentialIds = PropertyIdRegex.Matches(aiResponse)
                .Select(m => int.Parse(m.Groups[1].Value))
                .Distinct() // mantém ordem de primeira aparição com Distinct over enumeration
                .ToList();

            if (mentionedSequentialIds.Count == 0)
            {
                _logger.LogWarning("Nenhuma propriedade encontrada na resposta da IA usando formato PROP[X]");
                return (new List<PropertySearchDto>(), new List<int>(), new List<int>());
            }

            var properties = new List<PropertySearchDto>();
            var invalid = new List<int>();

            foreach (var seq in mentionedSequentialIds)
            {
                var idx = seq - 1;
                if (idx >= 0 && idx < availableProperties.Count)
                {
                    properties.Add(availableProperties[idx]);
                }
                else
                {
                    invalid.Add(seq);
                }
            }

            if (invalid.Count > 0)
            {
                _logger.LogWarning("Menções inválidas: {Invalid} (Total disponíveis: {Total})", string.Join(", ", invalid), availableProperties.Count);
            }

            _logger.LogInformation("Propriedades mencionadas: {ValidMentions} | Inválidas: {InvalidCount}",
                string.Join(", ", mentionedSequentialIds.Except(invalid)),
                invalid.Count);

            return (properties, mentionedSequentialIds.Except(invalid).ToList(), invalid);
        }

        private static string CleanResponseForUser(string aiResponse)
        {
            return Regex.Replace(aiResponse, @"PROP\[\d+\]\s*", "", RegexOptions.IgnoreCase);
        }
    }

    public class PropertyParsingResult
    {
        public List<PropertySearchDto> MentionedProperties { get; set; } = new();
        // Números (PROP[X]) válidos na ordem da primeira menção
        public List<int> MentionNumbers { get; set; } = new();
        // Números referidos que não existiam na lista enviada
        public List<int> InvalidMentionNumbers { get; set; } = new();
        // Resposta original do modelo
        public string OriginalResponse { get; set; } = string.Empty;
        // Versão potencialmente “limpa” (podes optar por não usar)
        public string CleanResponse { get; set; } = string.Empty;
    }
}