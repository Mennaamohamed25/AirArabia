using Microsoft.EntityFrameworkCore;
using RideTracker.Api.Data;
using RideTracker.Api.Services;

namespace RideTracker.Api.Endpoints;

public static class DashboardEndpoints
{
    public record Row(
        int Id, RideStatus Status, string DriverName,
        DateTime StartedAt, DateTime? EndedAt, DateTime? SubmittedAt, DateTime? LastPointAt,
        double? LastLat, double? LastLng, double StartLat, double StartLng,
        double PaidKm, decimal Total, string? Purpose, bool MismatchFlag, bool GapFlag, bool LongRide);

    public static void MapDashboard(this WebApplication app)
    {
        app.MapGet("/api/dashboard", async (AppDbContext db) =>
        {
            var settings = await AppSettings.LoadAsync(db);
            var now = DateTime.UtcNow;
            var longCutoff = now.AddHours(-settings.LongRideHours);

            // Small summaries only (Constitution IV): no photos, no routes.
            var rows = (await db.Rides
                .Where(r => r.Status == RideStatus.InProgress || r.Status == RideStatus.Stopped
                         || r.Status == RideStatus.Pending || r.Status == RideStatus.Approved)
                .Select(r => new Row(
                    r.Id, r.Status, r.Driver.FullName,
                    r.StartedAt, r.EndedAt, r.SubmittedAt, r.LastPointAt,
                    r.LastLat, r.LastLng, r.StartLat, r.StartLng,
                    r.PaidKm, r.Total, r.Purpose, r.MismatchFlag, r.GapFlag, false))
                .ToListAsync())
                .Select(r => r with
                {
                    StartedAt = DateTime.SpecifyKind(r.StartedAt, DateTimeKind.Utc),
                    EndedAt = RideEndpoints.Utc(r.EndedAt),
                    SubmittedAt = RideEndpoints.Utc(r.SubmittedAt),
                    LastPointAt = RideEndpoints.Utc(r.LastPointAt),
                    LongRide = r.Status == RideStatus.InProgress && r.StartedAt < longCutoff,
                })
                .ToList();

            return Results.Ok(new
            {
                serverTime = now,
                active = rows.Where(r => r.Status == RideStatus.InProgress).OrderBy(r => r.StartedAt),
                awaitingSubmit = rows.Where(r => r.Status == RideStatus.Stopped).OrderByDescending(r => r.EndedAt),
                submissions = rows.Where(r => r.Status == RideStatus.Pending).OrderByDescending(r => r.SubmittedAt),
                approvedUnpaid = rows.Where(r => r.Status == RideStatus.Approved).OrderByDescending(r => r.EndedAt),
                flagged = rows.Where(r => r.LongRide || (r.Status == RideStatus.Pending && (r.MismatchFlag || r.GapFlag))),
            });
        }).RequireAuthorization(a => a.RequireRole(nameof(Role.HR), nameof(Role.Manager)));
    }
}
