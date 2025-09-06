namespace realestate_ia_site.Server.Application.Common.Results;

public class Result
{
    public bool Success { get; init; }
    public string? Error { get; init; }
    public string? Message { get; init; }
    public static Result Ok(string? message = null) => new() { Success = true, Message = message };
    public static Result Fail(string error, string? message = null) => new() { Success = false, Error = error, Message = message };
}

public class Result<T> : Result
{
    public T? Value { get; init; }
    public static Result<T> Ok(T value, string? message = null) => new() { Success = true, Value = value, Message = message };
    public static Result<T> Fail(string error, string? message = null) => new() { Success = false, Error = error, Message = message };
}
