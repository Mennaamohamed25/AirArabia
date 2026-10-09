using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using RideTracker.Api.Data;
using RideTracker.Api.Domain;
using RideTracker.Api.Services;

namespace RideTracker.Api.Endpoints;

public static class RideEndpoints
{
    public record PointDto(DateTime RecordedAt, double Lat, double Lng, double Accuracy);
    public record StartRequest(double Lat, double Lng, double Accuracy, int Odometer, string? OdometerPhoto);
    public record StopRequest(double Lat, double Lng, double Accuracy, int Odometer, string? OdometerPhoto, List<PointDto>? Points);
    public record FeeRequest(FeeType Type, decimal Amount, string? Photo);
    public record SubmitRequest(string? Purpose, List<FeeRequest>? Fees);
    public record DecideRequest(bool Approve, string? Comment, DistanceSource DistanceSource);

    static readonly TimeSpan GapThreshold = TimeSpan.FromMinutes(2);
    const decimal MaxFee = 5000;

    public static IQueryable<Ride> WithDetails(this IQueryable<Ride> q) =>
        q.Include(r => r.Driver).Include(r => r.Fees)
         .Include(r => r.Decisions).ThenInclude(d => d.Manager);

    public static object ToDto(Ride r) => new
    {
        r.Id, r.Status, r.DriverId, DriverName = r.Driver.FullName,
        StartedAt = Utc(r.StartedAt), EndedAt = Utc(r.EndedAt), r.StartLat, r.StartLng, r.EndLat, r.EndLng,
        r.StartOdometer, r.EndOdometer, r.StartOdometerPhotoId, r.EndOdometerPhotoId,
        LastPointAt = Utc(r.LastPointAt), r.LastLat, r.LastLng,
        r.GpsKm, r.OdometerKm, r.PaidKm, r.DistanceSource, r.MismatchFlag, r.GapFlag,
        r.KmPerLiter, r.PricePerLiter, r.FuelCost, r.FeesTotal, r.Total,
        r.Purpose, r.RoutePolyline, r.PeriodMonth, SubmittedAt = Utc(r.SubmittedAt),
        Fees = r.Fees.Select(f => new { f.Id, f.Type, f.Amount, f.PhotoId }),
        Decision = r.Decisions.OrderByDescending(d => d.DecidedAt).Select(d => new
        {
            d.Approved, d.Comment, d.DistanceSource, DecidedAt = Utc(d.DecidedAt), ManagerName = d.Manager.FullName,
        }).FirstOrDefault(),
    };

    public static DateTime? Utc(DateTime? d) => d is null ? null : DateTime.SpecifyKind(d.Value, DateTimeKind.Utc);

    public static async Task<string> OpenMonthFor(AppDbContext db, string month)
    {
        while (await db.MonthPeriods.AnyAsync(m => m.Month == month)) month = EgyptTime.NextMonth(month);
        return month;
    }

    public static void MapRides(this WebApplication app)
    {
        var g = app.MapGroup("/api").RequireAuthorization();
        var driver = new[] { nameof(Role.Driver) };

        g.MapGet("/rides/active", async (ClaimsPrincipal p, AppDbContext db) =>
        {
            var me = p.UserId();
            var ride = await db.Rides.WithDetails()
                .FirstOrDefaultAsync(r => r.DriverId == me && (r.Status == RideStatus.InProgress || r.Status == RideStatus.Stopped));
            return ride is null ? Results.NoContent() : Results.Ok(ToDto(ride));
        }).RequireAuthorization(a => a.RequireRole(driver));

        g.MapPost("/rides/start", async (StartRequest req, ClaimsPrincipal p, AppDbContext db) =>
        {
            var me = p.UserId();
            if (await db.Rides.AnyAsync(r => r.DriverId == me && (r.Status == RideStatus.InProgress || r.Status == RideStatus.Stopped)))
                return Http.Error("active_ride", "You already have an active ride.", 409);
            var today = EgyptTime.LocalDate(DateTime.UtcNow);
            if (!await db.FuelPrices.AnyAsync(f => f.EffectiveFrom <= today))
                return Http.Error("no_price", "No fuel price is set. Contact HR.");
            if (req.Odometer < 0) return Http.Error("invalid_odometer", "Odometer must be a positive number.");

            var now = DateTime.UtcNow;
            var ride = new Ride
            {
                DriverId = me, Status = RideStatus.InProgress, StartedAt = now,
                StartLat = req.Lat, StartLng = req.Lng, StartOdometer = req.Odometer,
                LastPointAt = now, LastLat = req.Lat, LastLng = req.Lng,
                PeriodMonth = EgyptTime.Month(now),
            };
            db.Rides.Add(ride);
            await db.SaveChangesAsync();

            db.LocationPoints.Add(new LocationPoint { RideId = ride.Id, RecordedAt = now, Lat = req.Lat, Lng = req.Lng, Accuracy = req.Accuracy });
            var photo = Http.ParsePhoto(req.OdometerPhoto);
            if (photo is not null)
            {
                photo.RideId = ride.Id;
                db.Photos.Add(photo);
                await db.SaveChangesAsync();
                ride.StartOdometerPhotoId = photo.Id;
            }
            await db.SaveChangesAsync();
            return Results.Ok(ToDto(await db.Rides.WithDetails().FirstAsync(r => r.Id == ride.Id)));
        }).RequireAuthorization(a => a.RequireRole(driver));

        g.MapPost("/rides/{id:int}/points", async (int id, List<PointDto> points, ClaimsPrincipal p, AppDbContext db) =>
        {
            var ride = await db.Rides.FirstOrDefaultAsync(r => r.Id == id && r.DriverId == p.UserId());
            if (ride is null) return Results.NotFound();
            if (ride.Status != RideStatus.InProgress) return Http.Error("not_in_progress", "Ride is not in progress.", 409);
            AddPoints(db, ride, points);
            await db.SaveChangesAsync();
            return Results.NoContent();
        }).RequireAuthorization(a => a.RequireRole(driver));

        g.MapPost("/rides/{id:int}/stop", async (int id, StopRequest req, ClaimsPrincipal p, AppDbContext db) =>
        {
            var ride = await db.Rides.Include(r => r.Driver)
                .FirstOrDefaultAsync(r => r.Id == id && r.DriverId == p.UserId());
            if (ride is null) return Results.NotFound();
            if (ride.Status != RideStatus.InProgress) return Http.Error("not_in_progress", "Ride is not in progress.", 409);
            if (req.Odometer <= ride.StartOdometer)
                return Http.Error("invalid_odometer", $"End odometer must be greater than the start reading ({ride.StartOdometer}).");

            var now = DateTime.UtcNow;
            AddPoints(db, ride, req.Points ?? []);
            AddPoints(db, ride, [new PointDto(now, req.Lat, req.Lng, req.Accuracy)]);
            await db.SaveChangesAsync();

            var raw = await db.LocationPoints.Where(x => x.RideId == ride.Id)
                .Select(x => new GeoPoint(x.RecordedAt, x.Lat, x.Lng, x.Accuracy)).ToListAsync();
            var filtered = RideMath.Filter(raw);
            var settings = await AppSettings.LoadAsync(db);

            ride.EndedAt = now;
            ride.EndLat = req.Lat;
            ride.EndLng = req.Lng;
            ride.EndOdometer = req.Odometer;
            ride.GpsKm = RideMath.DistanceKm(filtered);
            ride.OdometerKm = req.Odometer - ride.StartOdometer;
            ride.MismatchFlag = RideMath.IsMismatch(ride.GpsKm, ride.OdometerKm, settings.MismatchPercent);
            ride.GapFlag = RideMath.HasGap(raw, ride.StartedAt, now, GapThreshold);
            ride.RoutePolyline = Polyline.Encode(filtered.Select(x => (x.Lat, x.Lng)));
            ride.DistanceSource = DistanceSource.Gps;
            ride.PaidKm = ride.GpsKm;

            var rideDate = EgyptTime.LocalDate(ride.StartedAt);
            // Drivers use their own cars: their own km/L if HR set one, otherwise the company default.
            ride.KmPerLiter = ride.Driver.KmPerLiter ?? settings.DefaultKmPerLiter;
            ride.PricePerLiter = (await db.FuelPrices.Where(f => f.EffectiveFrom <= rideDate)
                .OrderByDescending(f => f.EffectiveFrom).FirstAsync()).PricePerLiter;
            ride.FuelCost = RideMath.FuelCost(ride.PaidKm, ride.KmPerLiter, ride.PricePerLiter);
            ride.Total = ride.FuelCost + ride.FeesTotal;
            ride.PeriodMonth = await OpenMonthFor(db, EgyptTime.Month(now));
            ride.Status = RideStatus.Stopped;

            var photo = Http.ParsePhoto(req.OdometerPhoto);
            if (photo is not null)
            {
                photo.RideId = ride.Id;
                db.Photos.Add(photo);
                await db.SaveChangesAsync();
                ride.EndOdometerPhotoId = photo.Id;
            }

            // Constitution II: raw points are temporary; only the encoded route is kept.
            await db.LocationPoints.Where(x => x.RideId == ride.Id).ExecuteDeleteAsync();
            await db.SaveChangesAsync();
            return Results.Ok(ToDto(await db.Rides.WithDetails().FirstAsync(r => r.Id == ride.Id)));
        }).RequireAuthorization(a => a.RequireRole(driver));

        g.MapPost("/rides/{id:int}/submit", async (int id, SubmitRequest req, ClaimsPrincipal p, AppDbContext db) =>
        {
            var ride = await db.Rides.FirstOrDefaultAsync(r => r.Id == id && r.DriverId == p.UserId());
            if (ride is null) return Results.NotFound();
            if (ride.Status != RideStatus.Stopped) return Http.Error("not_stopped", "Only a stopped ride can be submitted.", 409);
            var purpose = req.Purpose?.Trim();
            if (string.IsNullOrEmpty(purpose)) return Http.Error("purpose_required", "Please enter the purpose of the ride.");
            if (purpose.Length > 500) return Http.Error("purpose_too_long", "Purpose must be at most 500 characters.");

            var fees = req.Fees ?? [];
            foreach (var f in fees)
            {
                if (f.Amount <= 0 || f.Amount > MaxFee)
                    return Http.Error("invalid_fee", $"Each fee must be more than 0 and at most {MaxFee} EGP.");
                if (string.IsNullOrWhiteSpace(f.Photo))
                    return Http.Error("receipt_required", "Each fee needs a receipt photo.");
            }

            foreach (var f in fees)
            {
                var photo = Http.ParsePhoto(f.Photo)!;
                photo.RideId = ride.Id;
                db.Photos.Add(photo);
                await db.SaveChangesAsync();
                db.Fees.Add(new Fee { RideId = ride.Id, Type = f.Type, Amount = Math.Round(f.Amount, 2), PhotoId = photo.Id });
            }

            ride.Purpose = purpose;
            ride.FeesTotal = fees.Sum(f => Math.Round(f.Amount, 2));
            ride.Total = ride.FuelCost + ride.FeesTotal;
            ride.Status = RideStatus.Pending;
            ride.SubmittedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            return Results.Ok(ToDto(await db.Rides.WithDetails().FirstAsync(r => r.Id == ride.Id)));
        }).RequireAuthorization(a => a.RequireRole(driver));

        g.MapGet("/rides", async (RideStatus? status, string? month, int? driverId, ClaimsPrincipal p, AppDbContext db) =>
        {
            var q = db.Rides.WithDetails().AsQueryable();
            if (p.UserRole() == Role.Driver) q = q.Where(r => r.DriverId == p.UserId());
            else if (driverId is not null) q = q.Where(r => r.DriverId == driverId);
            if (status is not null) q = q.Where(r => r.Status == status);
            if (!string.IsNullOrEmpty(month)) q = q.Where(r => r.PeriodMonth == month);
            var rides = await q.OrderByDescending(r => r.StartedAt).Take(500).ToListAsync();
            return Results.Ok(rides.Select(ToDto));
        });

        g.MapGet("/rides/{id:int}", async (int id, ClaimsPrincipal p, AppDbContext db) =>
        {
            var ride = await db.Rides.WithDetails().FirstOrDefaultAsync(r => r.Id == id);
            if (ride is null || (p.UserRole() == Role.Driver && ride.DriverId != p.UserId())) return Results.NotFound();
            return Results.Ok(ToDto(ride));
        });

        g.MapGet("/photos/{id:int}", async (int id, ClaimsPrincipal p, AppDbContext db) =>
        {
            var photo = await db.Photos.FirstOrDefaultAsync(x => x.Id == id);
            if (photo is null) return Results.NotFound();
            if (p.UserRole() == Role.Driver &&
                !await db.Rides.AnyAsync(r => r.Id == photo.RideId && r.DriverId == p.UserId()))
                return Results.NotFound();
            return Results.File(photo.Data, photo.ContentType);
        });

        g.MapPost("/rides/{id:int}/decide", async (int id, DecideRequest req, ClaimsPrincipal p, AppDbContext db) =>
        {
            var comment = req.Comment?.Trim();
            if (!req.Approve && string.IsNullOrEmpty(comment))
                return Http.Error("comment_required", "Please write the reason for rejecting.");
            if (comment?.Length > 500) return Http.Error("comment_too_long", "Comment must be at most 500 characters.");

            var ride = await db.Rides.FirstOrDefaultAsync(r => r.Id == id);
            if (ride is null) return Results.NotFound();

            // First decision wins: atomically move Pending -> decided.
            var newStatus = req.Approve ? RideStatus.Approved : RideStatus.Rejected;
            var claimed = await db.Rides.Where(r => r.Id == id && r.Status == RideStatus.Pending)
                .ExecuteUpdateAsync(s => s.SetProperty(r => r.Status, newStatus));
            if (claimed == 0) return Http.Error("already_decided", "This ride was already decided or is not pending.", 409);

            await db.Entry(ride).ReloadAsync();
            if (req.Approve)
            {
                ride.DistanceSource = req.DistanceSource;
                ride.PaidKm = req.DistanceSource == DistanceSource.Odometer ? ride.OdometerKm : ride.GpsKm;
                ride.FuelCost = RideMath.FuelCost(ride.PaidKm, ride.KmPerLiter, ride.PricePerLiter);
                ride.Total = ride.FuelCost + ride.FeesTotal;
            }
            db.Decisions.Add(new Decision
            {
                RideId = id, ManagerId = p.UserId(), Approved = req.Approve, Comment = comment,
                DistanceSource = req.DistanceSource, DecidedAt = DateTime.UtcNow,
            });
            await db.SaveChangesAsync();
            return Results.Ok(ToDto(await db.Rides.WithDetails().FirstAsync(r => r.Id == id)));
        }).RequireAuthorization(a => a.RequireRole(nameof(Role.Manager)));
    }

    static void AddPoints(AppDbContext db, Ride ride, IEnumerable<PointDto> points)
    {
        foreach (var pt in points.Take(1000))
        {
            var at = pt.RecordedAt.ToUniversalTime();
            // Phone clocks drift; tolerate a few minutes, then clamp into the ride window.
            if (at < ride.StartedAt.AddMinutes(-5) || at > DateTime.UtcNow.AddMinutes(5)) continue;
            if (at < ride.StartedAt) at = ride.StartedAt;
            if (at > DateTime.UtcNow) at = DateTime.UtcNow;
            db.LocationPoints.Add(new LocationPoint { RideId = ride.Id, RecordedAt = at, Lat = pt.Lat, Lng = pt.Lng, Accuracy = pt.Accuracy });
            if (ride.LastPointAt is null || at >= ride.LastPointAt)
            {
                ride.LastPointAt = at;
                ride.LastLat = pt.Lat;
                ride.LastLng = pt.Lng;
            }
        }
    }
}
