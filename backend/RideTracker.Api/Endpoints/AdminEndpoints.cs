using System.Globalization;
using System.Net.Mail;
using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RideTracker.Api.Data;
using RideTracker.Api.Services;

namespace RideTracker.Api.Endpoints;

public static class AdminEndpoints
{
    public record CreateUser(string Email, string FullName, Role Role, string Password, double? KmPerLiter);
    public record UpdateUser(string Email, string FullName, Role Role, bool IsActive, string? Password, double? KmPerLiter);
    public record FuelPriceRequest(decimal PricePerLiter, DateOnly EffectiveFrom);
    public record SettingsRequest(int RetentionMonths, double MismatchPercent, double LongRideHours, double DefaultKmPerLiter);

    static bool ValidKmPerLiter(double? v) => v is null or (>= 3 and <= 50);

    static string? NormalizeEmail(string? email)
    {
        var e = email?.Trim().ToLower() ?? "";
        return e.Length <= 100 && MailAddress.TryCreate(e, out var parsed) && parsed.Address == e && e.Contains('.') ? e : null;
    }

    public static void MapAdmin(this WebApplication app)
    {
        // HR is the main role: it manages users, fuel prices, settings and storage.
        var admin = app.MapGroup("/api/admin").RequireAuthorization(a => a.RequireRole(nameof(Role.HR)));
        var hasher = new PasswordHasher<User>();

        admin.MapGet("/users", async (AppDbContext db) =>
            Results.Ok((await db.Users.OrderBy(u => u.Role).ThenBy(u => u.FullName).ToListAsync()).Select(AuthEndpoints.ToDto)));

        admin.MapPost("/users", async (CreateUser req, AppDbContext db) =>
        {
            var email = NormalizeEmail(req.Email);
            if (email is null) return Http.Error("invalid_email", "Enter a valid email address.");
            if (string.IsNullOrWhiteSpace(req.FullName)) return Http.Error("invalid_name", "Full name is required.");
            if (req.Password.Length < 6) return Http.Error("weak_password", "Password must be at least 6 characters.");
            if (req.Password != req.Password.Trim()) return Http.Error("password_spaces", "Password cannot start or end with a space.");
            if (await db.Users.AnyAsync(u => u.Email == email)) return Http.Error("email_taken", "This email already has an account.", 409);
            if (!ValidKmPerLiter(req.KmPerLiter)) return Http.Error("invalid_consumption", "Km per liter must be between 3 and 50, or empty.");
            var user = new User { Email = email, FullName = req.FullName.Trim(), Role = req.Role, KmPerLiter = req.Role == Role.Driver ? req.KmPerLiter : null };
            user.PasswordHash = hasher.HashPassword(user, req.Password);
            db.Users.Add(user);
            await db.SaveChangesAsync();
            return Results.Ok(AuthEndpoints.ToDto(user));
        });

        admin.MapPut("/users/{id:int}", async (int id, UpdateUser req, ClaimsPrincipal p, AppDbContext db) =>
        {
            var user = await db.Users.FindAsync(id);
            if (user is null) return Results.NotFound();
            var email = NormalizeEmail(req.Email);
            if (email is null) return Http.Error("invalid_email", "Enter a valid email address.");
            if (string.IsNullOrWhiteSpace(req.FullName)) return Http.Error("invalid_name", "Full name is required.");
            if (await db.Users.AnyAsync(u => u.Email == email && u.Id != id)) return Http.Error("email_taken", "This email already has an account.", 409);
            // Keep at least one active HR account so nobody gets locked out.
            if (user.Role == Role.HR && (req.Role != Role.HR || !req.IsActive) &&
                !await db.Users.AnyAsync(u => u.Role == Role.HR && u.IsActive && u.Id != id))
                return Http.Error("last_hr", "There must be at least one active HR account.", 409);
            if (id == p.UserId() && !req.IsActive) return Http.Error("self_disable", "You cannot disable your own account.", 409);

            if (!ValidKmPerLiter(req.KmPerLiter)) return Http.Error("invalid_consumption", "Km per liter must be between 3 and 50, or empty.");
            user.KmPerLiter = req.Role == Role.Driver ? req.KmPerLiter : null;
            user.Email = email;
            user.FullName = req.FullName.Trim();
            user.Role = req.Role;
            user.IsActive = req.IsActive;
            if (!string.IsNullOrEmpty(req.Password))
            {
                if (req.Password.Length < 6) return Http.Error("weak_password", "Password must be at least 6 characters.");
                if (req.Password != req.Password.Trim()) return Http.Error("password_spaces", "Password cannot start or end with a space.");
                user.PasswordHash = hasher.HashPassword(user, req.Password);
            }
            await db.SaveChangesAsync();
            return Results.Ok(AuthEndpoints.ToDto(user));
        });

        admin.MapDelete("/users/{id:int}", async (int id, ClaimsPrincipal p, AppDbContext db) =>
        {
            var user = await db.Users.FindAsync(id);
            if (user is null) return Results.NotFound();
            if (id == p.UserId()) return Http.Error("self_delete", "You cannot delete your own account.", 409);
            if (user.Role == Role.HR && !await db.Users.AnyAsync(u => u.Role == Role.HR && u.IsActive && u.Id != id))
                return Http.Error("last_hr", "There must be at least one active HR account.", 409);
            // Payment history must stay intact (Constitution V/VII): such users can only be disabled.
            if (await db.Rides.AnyAsync(r => r.DriverId == id) || await db.Decisions.AnyAsync(d => d.ManagerId == id) ||
                await db.MonthPeriods.AnyAsync(m => m.ClosedById == id))
                return Http.Error("has_history", "This user has rides or approvals in the records. Disable the account instead.", 409);

            db.Users.Remove(user);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        var prices = admin.MapGroup("/fuel-prices");

        prices.MapGet("", async (AppDbContext db) =>
            Results.Ok(await db.FuelPrices.OrderByDescending(f => f.EffectiveFrom)
                .Select(f => new { f.Id, f.PricePerLiter, f.EffectiveFrom }).ToListAsync()));

        prices.MapPost("", async (FuelPriceRequest req, AppDbContext db) =>
        {
            if (req.PricePerLiter is <= 0 or > 1000) return Http.Error("invalid_price", "Price must be more than 0.");
            var existing = await db.FuelPrices.FirstOrDefaultAsync(f => f.EffectiveFrom == req.EffectiveFrom);
            if (existing is not null) existing.PricePerLiter = req.PricePerLiter;
            else db.FuelPrices.Add(new FuelPrice { PricePerLiter = req.PricePerLiter, EffectiveFrom = req.EffectiveFrom });
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        admin.MapGet("/settings", async (AppDbContext db) => Results.Ok(await AppSettings.LoadAsync(db)));

        admin.MapPut("/settings", async (SettingsRequest req, AppDbContext db) =>
        {
            if (req.RetentionMonths is < 1 or > 60 || req.MismatchPercent is <= 0 or > 100 || req.LongRideHours is <= 0 or > 72 || req.DefaultKmPerLiter is < 3 or > 50)
                return Http.Error("invalid_settings", "Settings are out of range.");
            var values = new Dictionary<string, string>
            {
                [SettingKeys.RetentionMonths] = req.RetentionMonths.ToString(CultureInfo.InvariantCulture),
                [SettingKeys.MismatchPercent] = req.MismatchPercent.ToString(CultureInfo.InvariantCulture),
                [SettingKeys.LongRideHours] = req.LongRideHours.ToString(CultureInfo.InvariantCulture),
                [SettingKeys.DefaultKmPerLiter] = req.DefaultKmPerLiter.ToString(CultureInfo.InvariantCulture),
            };
            foreach (var (key, value) in values)
            {
                var s = await db.Settings.FindAsync(key);
                if (s is null) db.Settings.Add(new Setting { Key = key, Value = value });
                else s.Value = value;
            }
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        admin.MapGet("/storage", async (AppDbContext db, IConfiguration config) =>
        {
            long databaseBytes = 0;
            if (db.Database.IsSqlServer())
                databaseBytes = await db.Database
                    .SqlQueryRaw<long>("SELECT CAST(SUM(CAST(size AS bigint)) * 8192 AS bigint) AS Value FROM sys.database_files")
                    .SingleAsync();
            else if (db.Database.GetDbConnection().DataSource is { Length: > 0 } file && File.Exists(file))
                databaseBytes = new FileInfo(file).Length;

            return Results.Ok(new
            {
                databaseBytes,
                photoBytes = await db.Photos.SumAsync(p => (long)p.Data.Length),
                photoCount = await db.Photos.CountAsync(),
                pointCount = await db.LocationPoints.CountAsync(),
                rideCount = await db.Rides.CountAsync(),
                limitBytes = config.GetValue("Storage:LimitBytes", 1L << 30),
            });
        });

        admin.MapPost("/cleanup", async (AppDbContext db, CleanupService cleanup) => Results.Ok(await cleanup.RunAsync(db)));
    }
}
