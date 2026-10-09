using System.Text;

namespace RideTracker.Api.Domain;

/// Google encoded polyline algorithm, precision 5.
public static class Polyline
{
    public static string Encode(IEnumerable<(double Lat, double Lng)> points)
    {
        var sb = new StringBuilder();
        long prevLat = 0, prevLng = 0;
        foreach (var (lat, lng) in points)
        {
            long la = (long)Math.Round(lat * 1e5), ln = (long)Math.Round(lng * 1e5);
            Write(sb, la - prevLat);
            Write(sb, ln - prevLng);
            prevLat = la; prevLng = ln;
        }
        return sb.ToString();
    }

    static void Write(StringBuilder sb, long value)
    {
        long v = value < 0 ? ~(value << 1) : value << 1;
        while (v >= 0x20)
        {
            sb.Append((char)((0x20 | (v & 0x1f)) + 63));
            v >>= 5;
        }
        sb.Append((char)(v + 63));
    }

    public static List<(double Lat, double Lng)> Decode(string encoded)
    {
        var result = new List<(double, double)>();
        int i = 0;
        long lat = 0, lng = 0;
        while (i < encoded.Length)
        {
            lat += Read(encoded, ref i);
            lng += Read(encoded, ref i);
            result.Add((lat / 1e5, lng / 1e5));
        }
        return result;
    }

    static long Read(string s, ref int i)
    {
        long result = 0;
        int shift = 0, b;
        do
        {
            b = s[i++] - 63;
            result |= (long)(b & 0x1f) << shift;
            shift += 5;
        } while (b >= 0x20);
        return (result & 1) != 0 ? ~(result >> 1) : result >> 1;
    }
}
