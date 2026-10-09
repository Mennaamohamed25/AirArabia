using System.Security.Claims;
using RideTracker.Api.Data;

namespace RideTracker.Api.Endpoints;

public static class Http
{
    public static IResult Error(string code, string message, int status = 400) =>
        Results.Json(new { error = code, message }, statusCode: status);

    public static int UserId(this ClaimsPrincipal user) =>
        int.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);

    public static Role UserRole(this ClaimsPrincipal user) =>
        Enum.Parse<Role>(user.FindFirstValue(ClaimTypes.Role)!);

    public const int MaxPhotoBytes = 300 * 1024;

    /// Parses "data:image/jpeg;base64,..." into a Photo. Returns null when missing; throws on invalid input.
    public static Photo? ParsePhoto(string? dataUrl)
    {
        if (string.IsNullOrWhiteSpace(dataUrl)) return null;
        var comma = dataUrl.IndexOf(',');
        if (!dataUrl.StartsWith("data:image/") || comma < 0)
            throw new BadRequestException("invalid_photo", "Photo must be an image.");
        var contentType = dataUrl[5..dataUrl.IndexOf(';')];
        byte[] bytes;
        try { bytes = Convert.FromBase64String(dataUrl[(comma + 1)..]); }
        catch (FormatException) { throw new BadRequestException("invalid_photo", "Photo data is not valid."); }
        if (bytes.Length > MaxPhotoBytes)
            throw new BadRequestException("photo_too_large", "Photo is larger than 300 KB.");
        return new Photo { ContentType = contentType, Data = bytes, CreatedAt = DateTime.UtcNow };
    }
}

public class BadRequestException(string code, string message) : Exception(message)
{
    public string Code { get; } = code;
}
