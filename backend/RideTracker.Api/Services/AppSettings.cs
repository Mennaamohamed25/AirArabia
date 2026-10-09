using Microsoft.EntityFrameworkCore;
using RideTracker.Api.Data;

namespace RideTracker.Api.Services;

public record AppSettings(int RetentionMonths, double MismatchPercent, double LongRideHours, double DefaultKmPerLiter)
{
    public static async Task<AppSettings> LoadAsync(AppDbContext db)
    {
        var all = await db.Settings.ToDictionaryAsync(s => s.Key, s => s.Value);
        string Get(string key, string fallback) => all.TryGetValue(key, out var v) ? v : fallback;
        return new AppSettings(
            int.Parse(Get(SettingKeys.RetentionMonths, "3")),
            double.Parse(Get(SettingKeys.MismatchPercent, "15"), System.Globalization.CultureInfo.InvariantCulture),
            double.Parse(Get(SettingKeys.LongRideHours, "12"), System.Globalization.CultureInfo.InvariantCulture),
            double.Parse(Get(SettingKeys.DefaultKmPerLiter, "10"), System.Globalization.CultureInfo.InvariantCulture));
    }
}
