using Microsoft.AspNetCore.Hosting;

namespace realestate_ia_site.Server.Infrastructure.Storage;

/// <summary>
/// Local file storage implementation for development
/// </summary>
public class LocalFileStorageService : IFileStorageService
{
    private readonly IWebHostEnvironment _environment;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<LocalFileStorageService> _logger;
    private readonly string _uploadsPath;

    public LocalFileStorageService(
        IWebHostEnvironment environment,
        IHttpContextAccessor httpContextAccessor,
        ILogger<LocalFileStorageService> logger)
    {
        _environment = environment;
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;

        // Determine uploads path
        var webRoot = _environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot");
        _uploadsPath = Path.Combine(webRoot, "uploads", "avatars");

        // Ensure directory exists
        if (!Directory.Exists(_uploadsPath))
        {
            try
            {
                Directory.CreateDirectory(_uploadsPath);
                _logger.LogInformation("Created uploads directory: {Path}", _uploadsPath);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create uploads directory: {Path}", _uploadsPath);
                throw;
            }
        }
    }

    public async Task<string> UploadFileAsync(Stream fileStream, string fileName, string contentType, CancellationToken cancellationToken = default)
    {
        try
        {
            // Generate unique filename
            var extension = Path.GetExtension(fileName);
            var uniqueFileName = $"{Guid.NewGuid()}{extension}";
            var filePath = Path.Combine(_uploadsPath, uniqueFileName);

            // Save file
            await using (var fileStreamOutput = new FileStream(filePath, FileMode.Create, FileAccess.Write, FileShare.None))
            {
                await fileStream.CopyToAsync(fileStreamOutput, cancellationToken);
            }

            // Build URL
            var request = _httpContextAccessor.HttpContext?.Request;
            if (request != null)
            {
                var baseUrl = $"{request.Scheme}://{request.Host}";
                var fileUrl = $"{baseUrl}/uploads/avatars/{uniqueFileName}";
                
                _logger.LogInformation("File uploaded successfully: {Url}", fileUrl);
                return fileUrl;
            }

            throw new InvalidOperationException("Unable to build file URL - HttpContext not available");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading file: {FileName}", fileName);
            throw;
        }
    }

    public Task<bool> DeleteFileAsync(string fileUrl, CancellationToken cancellationToken = default)
    {
        try
        {
            // Extract filename from URL
            var fileName = Path.GetFileName(new Uri(fileUrl).LocalPath);
            var filePath = Path.Combine(_uploadsPath, fileName);

            if (File.Exists(filePath))
            {
                File.Delete(filePath);
                _logger.LogInformation("File deleted successfully: {Path}", filePath);
                return Task.FromResult(true);
            }

            _logger.LogWarning("File not found for deletion: {Path}", filePath);
            return Task.FromResult(false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting file: {Url}", fileUrl);
            return Task.FromResult(false);
        }
    }

    public Task<bool> FileExistsAsync(string fileUrl, CancellationToken cancellationToken = default)
    {
        try
        {
            var fileName = Path.GetFileName(new Uri(fileUrl).LocalPath);
            var filePath = Path.Combine(_uploadsPath, fileName);
            return Task.FromResult(File.Exists(filePath));
        }
        catch
        {
            return Task.FromResult(false);
        }
    }
}
