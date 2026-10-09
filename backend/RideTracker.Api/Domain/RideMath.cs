namespace RideTracker.Api.Domain;

public record GeoPoint(DateTime RecordedAt, double Lat, double Lng, double Accuracy);

public static class RideMath
{
    public const double MaxAccuracyMeters = 50;
    public const double MaxSpeedKmh = 160;

    public static double HaversineKm(double lat1, double lng1, double lat2, double lng2)
    {
        const double r = 6371.0088;
        double dLat = ToRad(lat2 - lat1), dLng = ToRad(lng2 - lng1);
        double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                   Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2)) * Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
        return 2 * r * Math.Asin(Math.Min(1, Math.Sqrt(a)));
    }

    static double ToRad(double deg) => deg * Math.PI / 180;

    /// Drops inaccurate fixes and fixes implying an impossible speed from the last kept point.
    public static List<GeoPoint> Filter(IEnumerable<GeoPoint> points)
    {
        var kept = new List<GeoPoint>();
        foreach (var p in points.OrderBy(p => p.RecordedAt))
        {
            if (p.Accuracy > MaxAccuracyMeters) continue;
            if (kept.Count > 0)
            {
                var last = kept[^1];
                var hours = (p.RecordedAt - last.RecordedAt).TotalHours;
                var km = HaversineKm(last.Lat, last.Lng, p.Lat, p.Lng);
                if (hours <= 0 ? km > 0.05 : km / hours > MaxSpeedKmh) continue;
            }
            kept.Add(p);
        }
        return kept;
    }

    public static double DistanceKm(IReadOnlyList<GeoPoint> filtered)
    {
        double total = 0;
        for (int i = 1; i < filtered.Count; i++)
            total += HaversineKm(filtered[i - 1].Lat, filtered[i - 1].Lng, filtered[i].Lat, filtered[i].Lng);
        return Math.Round(total, 2);
    }

    public static decimal FuelCost(double km, double kmPerLiter, decimal pricePerLiter)
    {
        if (kmPerLiter <= 0) throw new ArgumentOutOfRangeException(nameof(kmPerLiter));
        return Math.Round((decimal)km / (decimal)kmPerLiter * pricePerLiter, 2, MidpointRounding.AwayFromZero);
    }

    /// True when GPS and odometer distances differ by more than the given percent of the larger.
    public static bool IsMismatch(double gpsKm, double odometerKm, double percent)
    {
        var max = Math.Max(gpsKm, odometerKm);
        if (max <= 0) return false;
        return Math.Abs(gpsKm - odometerKm) / max * 100 > percent;
    }

    /// True when consecutive fixes are more than the given gap apart.
    public static bool HasGap(IReadOnlyList<GeoPoint> points, DateTime start, DateTime end, TimeSpan gap)
    {
        var times = new List<DateTime> { start };
        times.AddRange(points.Select(p => p.RecordedAt).OrderBy(t => t));
        times.Add(end);
        for (int i = 1; i < times.Count; i++)
            if (times[i] - times[i - 1] > gap) return true;
        return false;
    }
}
