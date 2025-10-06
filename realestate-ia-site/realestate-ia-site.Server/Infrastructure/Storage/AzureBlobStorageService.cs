using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

namespace realestate_ia_site.Server.Infrastructure.Storage;

/// <summary>
/// Azure Blob Storage implementation for production
/// </summary>
public class AzureBlobStorageService : IFileStorageService
{
    private readonly BlobServiceClient _blobServiceClient;
    private readonly ILogger<AzureBlobStorageService> _logger;
    private readonly string _containerName;

    public AzureBlobStorageService(
        IConfiguration configuration,
        ILogger<AzureBlobStorageService> logger)
    {
        _logger = logger;
        
        var connectionString = Environment.GetEnvironmentVariable("AZURE_STORAGE_CONNECTION_STRING")
                             ?? configuration["Azure:Storage:ConnectionString"]
                             ?? throw new InvalidOperationException("Azure Storage connection string not configured");

        _containerName = Environment.GetEnvironmentVariable("AZURE_STORAGE_CONTAINER")
                        ?? configuration["Azure:Storage:ContainerName"]
                        ?? "avatars";

        _blobServiceClient = new BlobServiceClient(connectionString);
        
        // Ensure container exists
        InitializeContainerAsync().GetAwaiter().GetResult();
    }

    private async Task InitializeContainerAsync()
    {
        try
        {
            var containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
            await containerClient.CreateIfNotExistsAsync(PublicAccessType.Blob);
            _logger.LogInformation("Initialized Azure Blob container: {Container}", _containerName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize Azure Blob container: {Container}", _containerName);
            throw;
        }
    }

    public async Task<string> UploadFileAsync(Stream fileStream, string fileName, string contentType, CancellationToken cancellationToken = default)
    {
        try
        {
            // Generate unique filename
            var extension = Path.GetExtension(fileName);
            var uniqueFileName = $"{Guid.NewGuid()}{extension}";

            var containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
            var blobClient = containerClient.GetBlobClient(uniqueFileName);

            // Upload with content type
            var uploadOptions = new BlobUploadOptions
            {
                HttpHeaders = new BlobHttpHeaders
                {
                    ContentType = contentType,
                    CacheControl = "public, max-age=31536000" // Cache for 1 year
                }
            };

            await blobClient.UploadAsync(fileStream, uploadOptions, cancellationToken);

            var blobUrl = blobClient.Uri.ToString();
            _logger.LogInformation("File uploaded to Azure Blob Storage: {Url}", blobUrl);
            
            return blobUrl;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading file to Azure Blob Storage: {FileName}", fileName);
            throw;
        }
    }

    public async Task<bool> DeleteFileAsync(string fileUrl, CancellationToken cancellationToken = default)
    {
        try
        {
            var blobName = Path.GetFileName(new Uri(fileUrl).LocalPath);
            var containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
            var blobClient = containerClient.GetBlobClient(blobName);

            var result = await blobClient.DeleteIfExistsAsync(cancellationToken: cancellationToken);
            
            if (result.Value)
            {
                _logger.LogInformation("File deleted from Azure Blob Storage: {Url}", fileUrl);
            }
            else
            {
                _logger.LogWarning("File not found in Azure Blob Storage: {Url}", fileUrl);
            }

            return result.Value;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting file from Azure Blob Storage: {Url}", fileUrl);
            return false;
        }
    }

    public async Task<bool> FileExistsAsync(string fileUrl, CancellationToken cancellationToken = default)
    {
        try
        {
            var blobName = Path.GetFileName(new Uri(fileUrl).LocalPath);
            var containerClient = _blobServiceClient.GetBlobContainerClient(_containerName);
            var blobClient = containerClient.GetBlobClient(blobName);

            return await blobClient.ExistsAsync(cancellationToken);
        }
        catch
        {
            return false;
        }
    }
}
