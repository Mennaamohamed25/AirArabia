namespace RideTracker.Api.Services;

public static class EgyptTime
{
    static readonly TimeZoneInfo Zone = Find();

    static TimeZoneInfo Find()
    {
        foreach (var id in new[] { "Africa/Cairo", "Egypt Standard Time" })
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById(id); } catch { }
        }
        return TimeZoneInfo.Utc;
    }

    public static DateTime ToLocal(DateTime utc) =>
        TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utc, DateTimeKind.Utc), Zone);

    public static DateOnly LocalDate(DateTime utc) => DateOnly.FromDateTime(ToLocal(utc));

    public static string Month(DateTime utc) => ToLocal(utc).ToString("yyyy-MM");

    public static string NextMonth(string month) =>
        DateTime.ParseExact(month + "-01", "yyyy-MM-dd", null).AddMonths(1).ToString("yyyy-MM");

    public static bool IsValidMonth(string month) =>
        DateTime.TryParseExact(month + "-01", "yyyy-MM-dd", null,
            System.Globalization.DateTimeStyles.None, out _);
}
