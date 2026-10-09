using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using RideTracker.Api.Data;

namespace RideTracker.Api.Endpoints;

public static class AuthEndpoints
{
    public record LoginRequest(string Email, string Password);
    public record LanguageRequest(string Language);

    public static object ToDto(User u) => new { u.Id, u.Email, u.FullName, u.Role, u.Language, u.IsActive, u.KmPerLiter };

    public static void MapAuth(this WebApplication app)
    {
        var g = app.MapGroup("/api/auth");

        g.MapPost("/login", async (LoginRequest req, AppDbContext db, IConfiguration config) =>
        {
            var user = await db.Users.FirstOrDefaultAsync(u => u.Email == req.Email.Trim().ToLower());
            if (user is null || !user.IsActive ||
                new PasswordHasher<User>().VerifyHashedPassword(user, user.PasswordHash, req.Password) == PasswordVerificationResult.Failed)
                return Http.Error("invalid_login", "Wrong email or password, or the account is disabled.", 401);
            return Results.Ok(new { token = CreateToken(user, config), user = ToDto(user) });
        });

        g.MapGet("/me", async (ClaimsPrincipal p, AppDbContext db) =>
        {
            var user = await db.Users.FindAsync(p.UserId());
            return user is { IsActive: true } ? Results.Ok(ToDto(user)) : Results.Unauthorized();
        }).RequireAuthorization();

        g.MapPut("/me/language", async (LanguageRequest req, ClaimsPrincipal p, AppDbContext db) =>
        {
            if (req.Language is not ("en" or "ar")) return Http.Error("invalid_language", "Language must be en or ar.");
            var user = await db.Users.FindAsync(p.UserId());
            if (user is null) return Results.Unauthorized();
            user.Language = req.Language;
            await db.SaveChangesAsync();
            return Results.NoContent();
        }).RequireAuthorization();
    }

    public static string CreateToken(User user, IConfiguration config)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!));
        return new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Issuer = "RideTracker",
            Audience = "RideTracker",
            Expires = DateTime.UtcNow.AddDays(7),
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256),
            Subject = new ClaimsIdentity(
            [
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Email),
                new Claim(ClaimTypes.Role, user.Role.ToString()),
            ]),
        });
    }
}
