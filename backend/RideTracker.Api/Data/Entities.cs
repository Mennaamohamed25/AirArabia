using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RideTracker.Api.Data;

public enum Role { Driver, Manager, HR }
public enum RideStatus { InProgress, Stopped, Pending, Approved, Rejected, Paid }
public enum DistanceSource { Gps, Odometer }
public enum FeeType { Parking, Toll, Purchase, Other }

public class User
{
    public int Id { get; set; }
    [MaxLength(100)] public required string Email { get; set; }
    [MaxLength(100)] public required string FullName { get; set; }
    public Role Role { get; set; }
    public string PasswordHash { get; set; } = "";
    [MaxLength(2)] public string Language { get; set; } = "en";
    public bool IsActive { get; set; } = true;
    /// Fuel use of the driver's own car; null = company default from settings.
    public double? KmPerLiter { get; set; }
}

public class FuelPrice
{
    public int Id { get; set; }
    [Column(TypeName = "decimal(10,2)")] public decimal PricePerLiter { get; set; }
    public DateOnly EffectiveFrom { get; set; }
}

public class Ride
{
    public int Id { get; set; }
    public int DriverId { get; set; }
    public User Driver { get; set; } = null!;
    public RideStatus Status { get; set; }

    public DateTime StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public double StartLat { get; set; }
    public double StartLng { get; set; }
    public double? EndLat { get; set; }
    public double? EndLng { get; set; }
    public int StartOdometer { get; set; }
    public int? EndOdometer { get; set; }
    public int? StartOdometerPhotoId { get; set; }
    public int? EndOdometerPhotoId { get; set; }

    public DateTime? LastPointAt { get; set; }
    public double? LastLat { get; set; }
    public double? LastLng { get; set; }

    public double GpsKm { get; set; }
    public double OdometerKm { get; set; }
    public double PaidKm { get; set; }
    public DistanceSource DistanceSource { get; set; }
    public bool MismatchFlag { get; set; }
    public bool GapFlag { get; set; }

    public double KmPerLiter { get; set; }
    [Column(TypeName = "decimal(10,2)")] public decimal PricePerLiter { get; set; }
    [Column(TypeName = "decimal(10,2)")] public decimal FuelCost { get; set; }
    [Column(TypeName = "decimal(10,2)")] public decimal FeesTotal { get; set; }
    [Column(TypeName = "decimal(10,2)")] public decimal Total { get; set; }

    [MaxLength(500)] public string? Purpose { get; set; }
    public string? RoutePolyline { get; set; }
    [MaxLength(7)] public string PeriodMonth { get; set; } = "";
    public DateTime? SubmittedAt { get; set; }

    public List<Fee> Fees { get; set; } = [];
    public List<Decision> Decisions { get; set; } = [];
}

public class LocationPoint
{
    public long Id { get; set; }
    public int RideId { get; set; }
    public DateTime RecordedAt { get; set; }
    public double Lat { get; set; }
    public double Lng { get; set; }
    public double Accuracy { get; set; }
}

public class Fee
{
    public int Id { get; set; }
    public int RideId { get; set; }
    public FeeType Type { get; set; }
    [Column(TypeName = "decimal(10,2)")] public decimal Amount { get; set; }
    public int? PhotoId { get; set; }
}

public class Photo
{
    public int Id { get; set; }
    public int? RideId { get; set; }
    [MaxLength(50)] public string ContentType { get; set; } = "image/jpeg";
    public byte[] Data { get; set; } = [];
    public DateTime CreatedAt { get; set; }
}

public class Decision
{
    public int Id { get; set; }
    public int RideId { get; set; }
    public int ManagerId { get; set; }
    public User Manager { get; set; } = null!;
    public bool Approved { get; set; }
    [MaxLength(500)] public string? Comment { get; set; }
    public DistanceSource DistanceSource { get; set; }
    public DateTime DecidedAt { get; set; }
}

public class MonthPeriod
{
    [Key, MaxLength(7)] public required string Month { get; set; }
    public DateTime ClosedAt { get; set; }
    public int ClosedById { get; set; }
    public User ClosedBy { get; set; } = null!;
}

public class Setting
{
    [Key, MaxLength(50)] public required string Key { get; set; }
    [MaxLength(200)] public required string Value { get; set; }
}
