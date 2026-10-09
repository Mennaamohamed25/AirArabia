using RideTracker.Api.Domain;
using RideTracker.Api.Services;

namespace RideTracker.Tests;

public class RideMathTests
{
    static readonly DateTime T0 = new(2026, 10, 9, 8, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void Haversine_OneDegreeOfLatitude_Is111Km()
    {
        // Along a meridian, 1 degree = 2πR/360 = 111.195 km for R = 6371.0088
        Assert.Equal(111.195, RideMath.HaversineKm(30, 31, 31, 31), 2);
    }

    [Fact]
    public void Filter_DropsInaccurateAndImpossibleJumps()
    {
        var points = new List<GeoPoint>
        {
            new(T0, 30.0000, 31.0000, 10),
            new(T0.AddSeconds(30), 30.0020, 31.0000, 10),   // ~222 m in 30 s = 27 km/h ok
            new(T0.AddSeconds(60), 30.0040, 31.0000, 120),  // poor accuracy -> dropped
            new(T0.AddSeconds(90), 30.5000, 31.0000, 10),   // 55 km in 60 s -> dropped
            new(T0.AddSeconds(120), 30.0060, 31.0000, 10),
        };
        var kept = RideMath.Filter(points);
        Assert.Equal(3, kept.Count);
        Assert.InRange(RideMath.DistanceKm(kept), 0.66, 0.68);
    }

    [Theory]
    [InlineData(12.0, 12.0, 19.25, 19.25)]
    [InlineData(25.5, 12.0, 19.25, 40.91)]   // 25.5/12*19.25 = 40.906 -> 40.91
    [InlineData(0, 12.0, 19.25, 0)]
    public void FuelCost_UsesFormulaAndRoundsTo2(double km, double kmPerLiter, double price, double expected)
    {
        Assert.Equal((decimal)expected, RideMath.FuelCost(km, kmPerLiter, (decimal)price));
    }

    [Theory]
    [InlineData(10, 11, 15, false)]
    [InlineData(10, 12, 15, true)]
    [InlineData(0, 0, 15, false)]
    [InlineData(0, 5, 15, true)]
    public void Mismatch_ComparedToLargerDistance(double gps, double odo, double pct, bool expected)
    {
        Assert.Equal(expected, RideMath.IsMismatch(gps, odo, pct));
    }

    [Fact]
    public void HasGap_DetectsMissingFixes()
    {
        var pts = new List<GeoPoint> { new(T0.AddSeconds(30), 30, 31, 5), new(T0.AddSeconds(60), 30, 31, 5) };
        Assert.False(RideMath.HasGap(pts, T0, T0.AddSeconds(90), TimeSpan.FromMinutes(2)));
        Assert.True(RideMath.HasGap(pts, T0, T0.AddMinutes(5), TimeSpan.FromMinutes(2)));
    }

    [Fact]
    public void Polyline_RoundTripsAndMatchesGoogleExample()
    {
        var pts = new List<(double, double)> { (38.5, -120.2), (40.7, -120.95), (43.252, -126.453) };
        var encoded = Polyline.Encode(pts);
        Assert.Equal("_p~iF~ps|U_ulLnnqC_mqNvxq`@", encoded);
        Assert.Equal(pts, Polyline.Decode(encoded));
    }

    [Fact]
    public void EgyptTime_NextMonth_WrapsYear()
    {
        Assert.Equal("2027-01", EgyptTime.NextMonth("2026-12"));
        Assert.True(EgyptTime.IsValidMonth("2026-10"));
        Assert.False(EgyptTime.IsValidMonth("2026-13"));
    }
}
