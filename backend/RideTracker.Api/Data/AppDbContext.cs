using Microsoft.EntityFrameworkCore;

namespace RideTracker.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<FuelPrice> FuelPrices => Set<FuelPrice>();
    public DbSet<Ride> Rides => Set<Ride>();
    public DbSet<LocationPoint> LocationPoints => Set<LocationPoint>();
    public DbSet<Fee> Fees => Set<Fee>();
    public DbSet<Photo> Photos => Set<Photo>();
    public DbSet<Decision> Decisions => Set<Decision>();
    public DbSet<MonthPeriod> MonthPeriods => Set<MonthPeriod>();
    public DbSet<Setting> Settings => Set<Setting>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<User>().HasIndex(u => u.Email).IsUnique();
        b.Entity<FuelPrice>().HasIndex(p => p.EffectiveFrom).IsUnique();
        b.Entity<Ride>().HasIndex(r => new { r.Status, r.PeriodMonth });
        b.Entity<Ride>().HasIndex(r => r.DriverId);
        b.Entity<Ride>().HasOne(r => r.Driver).WithMany().OnDelete(DeleteBehavior.Restrict);
        b.Entity<LocationPoint>().HasIndex(p => p.RideId);
        b.Entity<Decision>().HasOne(d => d.Manager).WithMany().OnDelete(DeleteBehavior.Restrict);
        b.Entity<MonthPeriod>().HasOne(m => m.ClosedBy).WithMany().OnDelete(DeleteBehavior.Restrict);
    }
}
