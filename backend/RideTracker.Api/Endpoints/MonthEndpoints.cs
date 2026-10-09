using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using RideTracker.Api.Data;
using RideTracker.Api.Services;

namespace RideTracker.Api.Endpoints;

public static class MonthEndpoints
{
    static readonly RideStatus[] Payable = [RideStatus.Approved, RideStatus.Paid];

    public static async Task<object> Summary(AppDbContext db, string month, int? onlyDriverId)
    {
        var period = await db.MonthPeriods.Include(m => m.ClosedBy).FirstOrDefaultAsync(m => m.Month == month);
        var q = db.Rides.WithDetails().Where(r => r.PeriodMonth == month);
        if (onlyDriverId is not null) q = q.Where(r => r.DriverId == onlyDriverId);
        var rides = await q.OrderBy(r => r.StartedAt).ToListAsync();
        var payable = rides.Where(r => Payable.Contains(r.Status)).ToList();

        var drivers = payable.GroupBy(r => new { r.DriverId, r.Driver.FullName }).Select(g => new
        {
            g.Key.DriverId, Name = g.Key.FullName, Rides = g.Count(),
            Km = Math.Round(g.Sum(r => r.PaidKm), 2), Fuel = g.Sum(r => r.FuelCost),
            Fees = g.Sum(r => r.FeesTotal), Total = g.Sum(r => r.Total),
        }).OrderBy(d => d.Name).ToList();

        return new
        {
            month,
            closed = period is not null,
            closedAt = RideEndpoints.Utc(period?.ClosedAt),
            closedBy = period?.ClosedBy.FullName,
            drivers,
            rides = rides.Select(RideEndpoints.ToDto),
            unapprovedCount = rides.Count(r => r.Status is RideStatus.InProgress or RideStatus.Stopped or RideStatus.Pending),
            grandTotal = new
            {
                Rides = payable.Count, Km = Math.Round(payable.Sum(r => r.PaidKm), 2),
                Fuel = payable.Sum(r => r.FuelCost), Fees = payable.Sum(r => r.FeesTotal), Total = payable.Sum(r => r.Total),
            },
        };
    }

    public static void MapMonths(this WebApplication app)
    {
        var g = app.MapGroup("/api/months").RequireAuthorization();

        g.MapGet("/{month}", async (string month, ClaimsPrincipal p, AppDbContext db) =>
        {
            if (!EgyptTime.IsValidMonth(month)) return Http.Error("invalid_month", "Month must be yyyy-MM.");
            int? only = p.UserRole() switch
            {
                Role.Driver => p.UserId(),
                Role.Manager => null,
                _ => null,
            };
            return Results.Ok(await Summary(db, month, only));
        });

        g.MapPost("/{month}/close", async (string month, ClaimsPrincipal p, AppDbContext db, CleanupService cleanup) =>
        {
            if (!EgyptTime.IsValidMonth(month)) return Http.Error("invalid_month", "Month must be yyyy-MM.");
            if (await db.MonthPeriods.AnyAsync(m => m.Month == month)) return Http.Error("already_closed", "This month is already closed.", 409);

            await using var tx = await db.Database.BeginTransactionAsync();
            var next = await RideEndpoints.OpenMonthFor(db, EgyptTime.NextMonth(month));
            await db.Rides.Where(r => r.PeriodMonth == month && r.Status == RideStatus.Approved)
                .ExecuteUpdateAsync(s => s.SetProperty(r => r.Status, RideStatus.Paid));
            await db.Rides.Where(r => r.PeriodMonth == month &&
                    (r.Status == RideStatus.InProgress || r.Status == RideStatus.Stopped || r.Status == RideStatus.Pending))
                .ExecuteUpdateAsync(s => s.SetProperty(r => r.PeriodMonth, next));
            db.MonthPeriods.Add(new MonthPeriod { Month = month, ClosedAt = DateTime.UtcNow, ClosedById = p.UserId() });
            await db.SaveChangesAsync();
            await tx.CommitAsync();

            await cleanup.RunAsync(db);
            return Results.Ok(await Summary(db, month, null));
        }).RequireAuthorization(a => a.RequireRole(nameof(Role.HR)));
    }
}
