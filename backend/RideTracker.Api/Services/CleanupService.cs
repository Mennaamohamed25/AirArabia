using Microsoft.EntityFrameworkCore;
using RideTracker.Api.Data;

namespace RideTracker.Api.Services;

public record CleanupResult(int PhotosDeleted, int RoutesCleared);

/// Removes photos and routes of closed months older than the retention period (Constitution II).
/// Runs daily in the background, after each month close, and on demand from the admin page.
public class CleanupService(IServiceScopeFactory scopes, ILogger<CleanupService> log) : BackgroundService
{
    public async Task<CleanupResult> RunAsync(AppDbContext db)
    {
        var settings = await AppSettings.LoadAsync(db);
        var cutoff = DateTime.ParseExact(EgyptTime.Month(DateTime.UtcNow) + "-01", "yyyy-MM-dd", null)
            .AddMonths(-settings.RetentionMonths).ToString("yyyy-MM");

        // Months are "yyyy-MM" strings, so ordinal comparison is chronological.
        var oldClosed = await db.MonthPeriods.Where(m => string.Compare(m.Month, cutoff) < 0)
            .Select(m => m.Month).ToListAsync();
        if (oldClosed.Count == 0) return new CleanupResult(0, 0);

        var rideIds = db.Rides.Where(r => oldClosed.Contains(r.PeriodMonth)).Select(r => r.Id);
        await db.Fees.Where(f => rideIds.Contains(f.RideId) && f.PhotoId != null)
            .ExecuteUpdateAsync(s => s.SetProperty(f => f.PhotoId, (int?)null));
        var routes = await db.Rides.Where(r => oldClosed.Contains(r.PeriodMonth) &&
                (r.RoutePolyline != null || r.StartOdometerPhotoId != null || r.EndOdometerPhotoId != null))
            .ExecuteUpdateAsync(s => s
                .SetProperty(r => r.RoutePolyline, (string?)null)
                .SetProperty(r => r.StartOdometerPhotoId, (int?)null)
                .SetProperty(r => r.EndOdometerPhotoId, (int?)null));
        var photos = await db.Photos.Where(p => p.RideId != null && rideIds.Contains(p.RideId.Value)).ExecuteDeleteAsync();

        log.LogInformation("Cleanup removed {Photos} photos and cleared {Routes} routes before {Cutoff}", photos, routes, cutoff);
        return new CleanupResult(photos, routes);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopes.CreateScope();
                await RunAsync(scope.ServiceProvider.GetRequiredService<AppDbContext>());
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                log.LogError(ex, "Cleanup failed");
            }
            await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
        }
    }
}
