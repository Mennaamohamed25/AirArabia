using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using RideTracker.Api.Data;
using RideTracker.Api.Endpoints;
using RideTracker.Api.Services;

var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration;

var jwtKey = config["Jwt:Key"];
if (string.IsNullOrEmpty(jwtKey) || jwtKey.Length < 32)
    throw new InvalidOperationException("Set Jwt__Key (at least 32 characters) in configuration.");

builder.Services.AddDbContext<AppDbContext>(o =>
{
    var cs = config.GetConnectionString("Default") ?? "Data Source=ridetracker.db";
    if (config["Database:Provider"] == "SqlServer")
    {
        o.UseSqlServer(cs);
        return;
    }
    // SQLite paths are relative to the app folder (on IIS the working directory can differ),
    // e.g. "../Private/ridetracker.db" keeps the database outside the public wwwroot.
    var sqlite = new SqliteConnectionStringBuilder(cs);
    if (!Path.IsPathRooted(sqlite.DataSource))
        sqlite.DataSource = Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, sqlite.DataSource));
    Directory.CreateDirectory(Path.GetDirectoryName(sqlite.DataSource)!);
    o.UseSqlite(sqlite.ToString());
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o =>
{
    o.TokenValidationParameters = new TokenValidationParameters
    {
        ValidIssuer = "RideTracker",
        ValidAudience = "RideTracker",
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        NameClaimType = ClaimTypes.Name,
        RoleClaimType = ClaimTypes.Role,
    };
});
builder.Services.AddAuthorization();

builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins(config.GetSection("Cors:Origins").Get<string[]>() ?? [])
    .AllowAnyHeader().AllowAnyMethod()));

builder.Services.ConfigureHttpJsonOptions(o =>
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));

builder.Services.AddSingleton<CleanupService>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<CleanupService>());

var app = builder.Build();

app.UseExceptionHandler(e => e.Run(async ctx =>
{
    var ex = ctx.Features.Get<IExceptionHandlerFeature>()?.Error;
    if (ex is BadRequestException bad)
    {
        ctx.Response.StatusCode = 400;
        await ctx.Response.WriteAsJsonAsync(new { error = bad.Code, message = bad.Message });
        return;
    }
    ctx.Response.StatusCode = ex is BadHttpRequestException ? 400 : 500;
    await ctx.Response.WriteAsJsonAsync(new
    {
        error = ctx.Response.StatusCode == 400 ? "bad_request" : "server_error",
        message = ctx.Response.StatusCode == 400 ? "The request is not valid." : "Something went wrong. Please try again.",
    });
}));

// The built website (frontend/dist) can be served from wwwroot, so one host serves site + API.
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (config.GetValue("Database:ResetOnStart", false)) db.Database.EnsureDeleted();
    db.Database.EnsureCreated();
    Seed.Run(db, config);
}

app.MapGet("/api/health", () => Results.Ok(new { status = "ok", time = DateTime.UtcNow }));
app.MapAuth();
app.MapRides();
app.MapDashboard();
app.MapMonths();
app.MapAdmin();
app.MapFallbackToFile("{*path:nonfile}", "index.html");

app.Run();
