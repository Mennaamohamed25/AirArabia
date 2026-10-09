using Microsoft.AspNetCore.Identity;

namespace RideTracker.Api.Data;

public static class Seed
{
    public const string DemoPassword = "Pass@123";
    public const string DefaultHrEmail = "hr@airarabia.com";

    public static void Run(AppDbContext db, IConfiguration config)
    {
        if (db.Users.Any()) return;
        var hasher = new PasswordHasher<User>();
        bool demo = config.GetValue("Seed:Demo", false);

        User Make(string email, string fullName, Role role, string password)
        {
            var u = new User { Email = email.ToLower(), FullName = fullName, Role = role };
            u.PasswordHash = hasher.HashPassword(u, password);
            db.Users.Add(u);
            return u;
        }

        // HR is the main account: it creates every other user.
        Make(config["Seed:HrEmail"] ?? DefaultHrEmail, "Omnia", Role.HR,
            demo ? DemoPassword : config["Seed:HrPassword"] ?? "ChangeMe@123");

        if (demo)
        {
            Make("driver@airarabia.com", "Ahmed Hassan", Role.Driver, DemoPassword);
            Make("driver2@airarabia.com", "Mostafa Ali", Role.Driver, DemoPassword);
            Make("manager@airarabia.com", "Sara Mahmoud", Role.Manager, DemoPassword);
        }

        // Current 92-octane price (22.25 EGP/L, confirmed by HR on 2026-10-09); HR adds a new row when it changes.
        db.FuelPrices.Add(new FuelPrice { PricePerLiter = 22.25m, EffectiveFrom = new DateOnly(2025, 1, 1) });

        db.Settings.AddRange(
            new Setting { Key = SettingKeys.RetentionMonths, Value = "3" },
            new Setting { Key = SettingKeys.MismatchPercent, Value = "15" },
            new Setting { Key = SettingKeys.LongRideHours, Value = "12" },
            new Setting { Key = SettingKeys.DefaultKmPerLiter, Value = "10" });

        db.SaveChanges();
    }
}

public static class SettingKeys
{
    public const string RetentionMonths = "RetentionMonths";
    public const string MismatchPercent = "MismatchPercent";
    public const string LongRideHours = "LongRideHours";
    public const string DefaultKmPerLiter = "DefaultKmPerLiter";
}
